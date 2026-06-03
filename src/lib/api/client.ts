/**
 * Thin browser-side fetch wrapper. Throws `ApiError` (with the server's message
 * and any Zod field details) on non-2xx responses so callers can surface a
 * useful message.
 */

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly details?: Record<string, string[] | undefined>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    let details: Record<string, string[] | undefined> | undefined;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
      if (body?.details) details = body.details;
    } catch {
      // non-JSON error body — keep the default message
    }
    throw new ApiError(message, res.status, details);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(url: string) => request<T>(url),
  post: <T>(url: string, body?: unknown) =>
    request<T>(url, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  put: <T>(url: string, body?: unknown) =>
    request<T>(url, { method: "PUT", body: body ? JSON.stringify(body) : undefined }),
};
