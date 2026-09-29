export interface JsonRpcRequest<T = unknown> {
  jsonrpc: "2.0";
  method: string;
  params?: T;
  id: string | number;
}

export interface JsonRpcSuccessResponse<T = unknown> {
  jsonrpc: "2.0";
  result: T;
  id: string | number;
}

export interface JsonRpcErrorObject {
  code: number;
  message: string;
  data?: unknown;
}

export interface JsonRpcErrorResponse {
  jsonrpc: "2.0";
  error: JsonRpcErrorObject;
  id: string | number | null;
}

export class RpcClientError extends Error {
  code: number;
  data?: unknown;

  constructor(code: number, message: string, data?: unknown) {
    super(message);
    this.name = "RpcClientError";
    this.code = code;
    this.data = data;
  }
}

export async function callRpc<T>(
  url: string,
  method: string,
  params: Record<string, unknown> = {},
  timeoutMs: number = 8000,
): Promise<T> {
  const id = Date.now() + Math.floor(Math.random() * 1000);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const payload: JsonRpcRequest = {
    jsonrpc: "2.0",
    method,
    params,
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
      let errJson: JsonRpcErrorResponse | null = null;
      try {
        errJson = await response.json();
      } catch {
        // Fallback for non-JSON errors
      }

      if (errJson?.error) {
        throw new RpcClientError(
          errJson.error.code,
          errJson.error.message,
          errJson.error.data,
        );
      }

      throw new RpcClientError(
        response.status,
        `HTTP ${response.status}: ${response.statusText}`,
      );
    }

    const data = (await response.json()) as
      | JsonRpcSuccessResponse<T>
      | JsonRpcErrorResponse;

    if ("error" in data && data.error) {
      throw new RpcClientError(
        data.error.code,
        data.error.message,
        data.error.data,
      );
    }

    if ("result" in data) {
      return data.result;
    }

    throw new RpcClientError(-32603, "Format respons JSON-RPC tidak valid");
  } catch (error: unknown) {
    if (error instanceof RpcClientError) {
      throw error;
    }

    if (error instanceof DOMException && error.name === "AbortError") {
      throw new RpcClientError(
        -32008,
        `Request timeout (${timeoutMs / 1000} detik)`,
      );
    }

    const message =
      error instanceof Error
        ? error.message
        : "Gagal terhubung ke service (Network Error)";
    throw new RpcClientError(-32003, `Koneksi gagal: ${message}`);
  } finally {
    clearTimeout(timer);
  }
}
