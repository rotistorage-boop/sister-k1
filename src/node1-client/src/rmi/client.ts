export interface RmiRequest {
  rmi: "1.0";
  service: string;
  method: string;
  args?: unknown[];
  id: string | number;
}

export interface RmiSuccessResponse<T = unknown> {
  rmi: "1.0";
  result: T;
  id: string | number;
}

export interface RmiErrorObject {
  code: number;
  message: string;
  data?: unknown;
}

export interface RmiErrorResponse {
  rmi: "1.0";
  error: RmiErrorObject;
  id: string | number | null;
}

export class RmiClientError extends Error {
  code: number;
  data?: unknown;

  constructor(code: number, message: string, data?: unknown) {
    super(message);
    this.name = "RmiClientError";
    this.code = code;
    this.data = data;
  }
}

/**
 * Raw RMI Method Invocation
 */
export async function callRmi<T>(
  url: string,
  service: string,
  method: string,
  args: unknown[] = [],
  timeoutMs: number = 8000,
): Promise<T> {
  const id = Date.now() + Math.floor(Math.random() * 1000);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const payload: RmiRequest = {
    rmi: "1.0",
    service,
    method,
    args,
    id,
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!response.ok) {
      let errJson: RmiErrorResponse | null = null;
      try {
        errJson = await response.json();
      } catch {}

      if (errJson?.error) {
        throw new RmiClientError(
          errJson.error.code,
          errJson.error.message,
          errJson.error.data,
        );
      }

      throw new RmiClientError(
        response.status,
        `HTTP ${response.status}: ${response.statusText}`,
      );
    }

    const data = (await response.json()) as
      | RmiSuccessResponse<T>
      | RmiErrorResponse;

    if ("error" in data && data.error) {
      throw new RmiClientError(
        data.error.code,
        data.error.message,
        data.error.data,
      );
    }

    if ("result" in data) {
      return data.result;
    }

    throw new RmiClientError(-31605, "Format respons RMI tidak valid");
  } catch (error: unknown) {
    if (error instanceof RmiClientError) {
      throw error;
    }

    if (error instanceof DOMException && error.name === "AbortError") {
      throw new RmiClientError(
        -31008,
        `RMI Request timeout (${timeoutMs / 1000} detik)`,
      );
    }

    const message =
      error instanceof Error
        ? error.message
        : "Gagal terhubung ke RMI server (Network Error)";
    throw new RmiClientError(-31003, `Koneksi RMI gagal: ${message}`);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Dynamic RMI Client Stub Proxy
 * Memungkinkan pemanggilan method objek remote secara OOP:
 * const scheduleProxy = createRmiProxy<IScheduleRemoteService>(url, "ScheduleService");
 * const data = await scheduleProxy.getAllSchedules();
 */
export function createRmiProxy<T extends object>(
  url: string,
  serviceName: string,
  timeoutMs: number = 8000,
): T {
  return new Proxy({} as T, {
    get(_target, prop: string | symbol) {
      if (typeof prop !== "string") return undefined;
      if (prop === "then" || prop === "catch" || prop === "finally") return undefined;

      return (...args: unknown[]) => {
        return callRmi(url, serviceName, prop, args, timeoutMs);
      };
    },
  });
}
