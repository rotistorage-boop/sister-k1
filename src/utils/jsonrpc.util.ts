import { Context } from "hono";

export interface JsonRpcRequest<T = any> {
  jsonrpc: "2.0";
  method: string;
  params?: T;
  id?: string | number | null;
}

export interface JsonRpcSuccessResponse<T = any> {
  jsonrpc: "2.0";
  result: T;
  id: string | number;
}

export interface JsonRpcErrorObject {
  code: number;
  message: string;
  data?: any;
}

export interface JsonRpcErrorResponse {
  jsonrpc: "2.0";
  error: JsonRpcErrorObject;
  id: string | number | null;
}

export const JSON_RPC_ERRORS = {
  PARSE_ERROR: { code: -32700, message: "Parse error" },
  INVALID_REQUEST: { code: -32600, message: "Invalid Request" },
  METHOD_NOT_FOUND: { code: -32601, message: "Method not found" },
  INVALID_PARAMS: { code: -32602, message: "Invalid params" },
  INTERNAL_ERROR: { code: -32603, message: "Internal error" },
  // Application specific errors
  BAD_REQUEST: { code: -32000, message: "Bad Request" },
  NOT_FOUND: { code: -32004, message: "Resource Not Found" },
  SERVICE_UNAVAILABLE: { code: -32003, message: "Service Unavailable" },
};

export class JsonRpcError extends Error {
  code: number;
  data?: any;

  constructor(code: number, message: string, data?: any) {
    super(message);
    this.name = "JsonRpcError";
    this.code = code;
    this.data = data;
  }
}

export function createJsonRpcSuccess<T>(
  id: string | number,
  result: T,
): JsonRpcSuccessResponse<T> {
  return {
    jsonrpc: "2.0",
    result,
    id,
  };
}

export function createJsonRpcError(
  id: string | number | null,
  code: number,
  message: string,
  data?: any,
): JsonRpcErrorResponse {
  return {
    jsonrpc: "2.0",
    error: {
      code,
      message,
      ...(data !== undefined ? { data } : {}),
    },
    id,
  };
}

export type JsonRpcHandler = (
  params: any,
  id: string | number | null,
  c: Context,
) => Promise<any>;

export function createJsonRpcRouter(methods: Record<string, JsonRpcHandler>) {
  return async (c: Context) => {
    let body: any;
    try {
      body = await c.req.json();
    } catch {
      return c.json(
        createJsonRpcError(
          null,
          JSON_RPC_ERRORS.PARSE_ERROR.code,
          JSON_RPC_ERRORS.PARSE_ERROR.message,
        ),
        400,
      );
    }

    if (!body || body.jsonrpc !== "2.0" || typeof body.method !== "string") {
      return c.json(
        createJsonRpcError(
          body?.id ?? null,
          JSON_RPC_ERRORS.INVALID_REQUEST.code,
          "Invalid JSON-RPC 2.0 Request: jsonrpc must be '2.0' and method must be specified",
        ),
        400,
      );
    }

    const { method, params, id } = body;
    const isNotification = id === undefined || id === null;

    const handler = methods[method];
    if (!handler) {
      if (isNotification) {
        return c.body(null, 204);
      }
      return c.json(
        createJsonRpcError(
          id,
          JSON_RPC_ERRORS.METHOD_NOT_FOUND.code,
          `Method '${method}' not found`,
        ),
        404,
      );
    }

    try {
      const result = await handler(params || {}, id ?? null, c);
      if (isNotification) {
        return c.body(null, 204);
      }
      return c.json(createJsonRpcSuccess(id, result));
    } catch (err: any) {
      if (isNotification) {
        return c.body(null, 204);
      }
      const code = err?.code || JSON_RPC_ERRORS.INTERNAL_ERROR.code;
      const message = err?.message || JSON_RPC_ERRORS.INTERNAL_ERROR.message;
      const statusCode =
        code === JSON_RPC_ERRORS.NOT_FOUND.code
          ? 404
          : code === JSON_RPC_ERRORS.BAD_REQUEST.code
            ? 400
            : 500;
      return c.json(
        createJsonRpcError(id, code, message, err?.data),
        statusCode as any,
      );
    }
  };
}

// Client RPC helper (Synchronous - Request/Response with ID)
export async function callJsonRpc<T = any>(
  url: string,
  method: string,
  params: any = {},
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
        jsonrpc: "2.0",
        method,
        params,
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
      const err = new JsonRpcError(
        errBody?.error?.code || res.status,
        errMsg,
        errBody?.error?.data,
      );
      throw err;
    }

    const data = (await res.json()) as
      | JsonRpcSuccessResponse<T>
      | JsonRpcErrorResponse;
    if ("error" in data) {
      throw new JsonRpcError(
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
