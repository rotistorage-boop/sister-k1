import { Context } from "hono";

/**
 * Base marker interface for all Remote Objects in RMI
 */
export interface IRemote {}

/**
 * RMI Request Payload format
 */
export interface RmiRequest {
  rmi: "1.0";
  service: string;
  method: string;
  args?: any[];
  id?: string | number | null;
}

/**
 * RMI Success Response Payload format
 */
export interface RmiSuccessResponse<T = any> {
  rmi: "1.0";
  result: T;
  id: string | number;
}

/**
 * RMI Error Object format
 */
export interface RmiErrorObject {
  code: number;
  message: string;
  data?: any;
}

/**
 * RMI Error Response Payload format
 */
export interface RmiErrorResponse {
  rmi: "1.0";
  error: RmiErrorObject;
  id: string | number | null;
}

export const RMI_ERRORS = {
  PARSE_ERROR: { code: -31700, message: "RMI Parse error" },
  INVALID_REQUEST: { code: -31600, message: "Invalid RMI Request" },
  SERVICE_NOT_FOUND: { code: -31601, message: "Remote Service / Servant not found in Registry" },
  METHOD_NOT_FOUND: { code: -31602, message: "Remote Method not found on Servant object" },
  INVALID_ARGUMENTS: { code: -31603, message: "Invalid remote method arguments" },
  INVOCATION_ERROR: { code: -31604, message: "Remote Invocation Execution Error" },
  INTERNAL_ERROR: { code: -31605, message: "Internal RMI Server Error" },
  BAD_REQUEST: { code: -31000, message: "Bad Request" },
  NOT_FOUND: { code: -31004, message: "Resource Not Found" },
  SERVICE_UNAVAILABLE: { code: -31003, message: "Remote Service Unavailable" },
};

export class RmiError extends Error {
  code: number;
  data?: any;

  constructor(code: number, message: string, data?: any) {
    super(message);
    this.name = "RmiError";
    this.code = code;
    this.data = data;
  }
}

export function createRmiSuccess<T>(
  id: string | number,
  result: T,
): RmiSuccessResponse<T> {
  return {
    rmi: "1.0",
    result,
    id,
  };
}

export function createRmiError(
  id: string | number | null,
  code: number,
  message: string,
  data?: any,
): RmiErrorResponse {
  return {
    rmi: "1.0",
    error: {
      code,
      message,
      ...(data !== undefined ? { data } : {}),
    },
    id,
  };
}

/**
 * RMI Registry (Naming Service / Object Broker)
 * Tempat mendaftarkan (bind) dan mencari (lookup) objek remote berdasarkan nama layanan.
 */
export class RmiRegistry {
  private servants: Map<string, IRemote> = new Map();

  bind(serviceName: string, servant: IRemote): void {
    if (this.servants.has(serviceName)) {
      throw new Error(`Remote object "${serviceName}" is already bound. Use rebind() instead.`);
    }
    this.servants.set(serviceName, servant);
  }

  rebind(serviceName: string, servant: IRemote): void {
    this.servants.set(serviceName, servant);
  }

  unbind(serviceName: string): boolean {
    return this.servants.delete(serviceName);
  }

  lookup(serviceName: string): IRemote | undefined {
    return this.servants.get(serviceName);
  }

  list(): string[] {
    return Array.from(this.servants.keys());
  }
}

/**
 * RMI Skeleton / Server Dispatcher Router
 * Menerima request HTTP RMI, melakukan unmarshalling parameter,
 * memanggil method pada objek servant asli, dan melakukan marshalling return value.
 */
export function createRmiRouter(registry: RmiRegistry) {
  return async (c: Context) => {
    let body: any;
    try {
      body = await c.req.json();
    } catch {
      return c.json(
        createRmiError(
          null,
          RMI_ERRORS.PARSE_ERROR.code,
          RMI_ERRORS.PARSE_ERROR.message,
        ),
        400,
      );
    }

    if (!body || body.rmi !== "1.0" || typeof body.service !== "string" || typeof body.method !== "string") {
      return c.json(
        createRmiError(
          body?.id ?? null,
          RMI_ERRORS.INVALID_REQUEST.code,
          "Invalid RMI Request: payload must include rmi: '1.0', service name, and method name",
        ),
        400,
      );
    }

    const { service, method, args = [], id } = body;
    const isNotification = id === undefined || id === null;

    // 1. Lookup remote servant dari Registry
    const servant = registry.lookup(service) as any;
    if (!servant) {
      if (isNotification) return c.body(null, 204);
      return c.json(
        createRmiError(
          id,
          RMI_ERRORS.SERVICE_NOT_FOUND.code,
          `Remote service '${service}' is not registered in RMI Registry. Available services: ${registry.list().join(", ") || "none"}`,
        ),
        404,
      );
    }

    // 2. Lookup method pada servant instance
    const targetMethod = servant[method];
    if (typeof targetMethod !== "function") {
      if (isNotification) return c.body(null, 204);
      return c.json(
        createRmiError(
          id,
          RMI_ERRORS.METHOD_NOT_FOUND.code,
          `Method '${method}' does not exist on remote service '${service}'`,
        ),
        404,
      );
    }

    // 3. Unmarshalling arguments & Remote Method Invocation
    try {
      const sanitizedArgs = Array.isArray(args) ? args : [args];
      // Invoke method on servant instance (preserving 'this' binding)
      const result = await targetMethod.apply(servant, sanitizedArgs);

      if (isNotification) return c.body(null, 204);
      return c.json(createRmiSuccess(id, result));
    } catch (err: any) {
      if (isNotification) return c.body(null, 204);
      const code = err?.code || RMI_ERRORS.INVOCATION_ERROR.code;
      const message = err?.message || RMI_ERRORS.INVOCATION_ERROR.message;
      const statusCode =
        code === RMI_ERRORS.NOT_FOUND.code
          ? 404
          : code === RMI_ERRORS.BAD_REQUEST.code
            ? 400
            : 500;
      return c.json(
        createRmiError(id, code, message, err?.data),
        statusCode as any,
      );
    }
  };
}

/**
 * Helper pemanggilan RMI langsung (Raw Invocation)
 */
export async function callRmiMethod<T = any>(
  url: string,
  service: string,
  method: string,
  args: any[] = [],
  options: { timeoutMs?: number } = {},
): Promise<T> {
  const id = Date.now() + Math.floor(Math.random() * 1000);
  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    options.timeoutMs || 5000,
  );

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rmi: "1.0",
        service,
        method,
        args,
        id,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      let errBody: any;
      try {
        errBody = await res.json();
      } catch {}
      const errMsg =
        errBody?.error?.message || `HTTP ${res.status}: ${res.statusText}`;
      const err = new RmiError(
        errBody?.error?.code || res.status,
        errMsg,
        errBody?.error?.data,
      );
      throw err;
    }

    const data = (await res.json()) as
      | RmiSuccessResponse<T>
      | RmiErrorResponse;

    if ("error" in data) {
      throw new RmiError(
        data.error.code,
        data.error.message,
        data.error.data,
      );
    }

    return data.result;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Dynamic Client Stub / Proxy Generator (RMI Stub)
 * Membuat objek proxy di sisi client yang memiliki method-method sesuai interface remote.
 * Saat client memanggil `proxy.methodName(arg1, arg2)`, proxy secara otomatis
 * melakukan marshalling parameter dan memanggil remote server.
 */
export function createRmiProxy<T extends object>(
  url: string,
  serviceName: string,
  options: { timeoutMs?: number } = {},
): T {
  return new Proxy({} as T, {
    get(_target, prop: string | symbol) {
      if (typeof prop !== "string") return undefined;
      // Jangan intercept method internal built-in seperti 'then' jika bukan fungsi async biasa
      if (prop === "then" || prop === "catch" || prop === "finally") return undefined;

      return (...args: any[]) => {
        return callRmiMethod(url, serviceName, prop, args, options);
      };
    },
  });
}
