import type { ApiSuccessResponse, ApiErrorResponse } from "./types";

export class ApiError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly fields?: Record<string, string>;

  constructor(status: number, code: string, message: string, fields?: Record<string, string>) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

let storedCsrfToken: string | null = null;

export function setClientCsrfToken(token: string | null): void {
  storedCsrfToken = token;
}

export function getClientCsrfToken(): string | null {
  if (storedCsrfToken) return storedCsrfToken;

  // Try reading from document.cookie if running in browser
  if (typeof document !== "undefined") {
    const match = document.cookie.match(/(?:^|;\s*)(?:__Host-)?store_csrf=([^;]+)/);
    if (match) {
      return decodeURIComponent(match[1]);
    }
  }
  return null;
}

export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiSuccessResponse<T>> {
  const headers = new Headers(options.headers || {});
  headers.set("Accept", "application/json");

  const method = (options.method || "GET").toUpperCase();

  if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
      headers.set("Content-Type", "application/json");
    }

    const csrf = getClientCsrfToken();
    if (csrf && !headers.has("X-CSRF-Token")) {
      headers.set("X-CSRF-Token", csrf);
    }
  }

  // Use reverse proxy path /api/v1 when in browser, or server URL when in Node
  const baseUrl = typeof window !== "undefined" ? "/api/v1" : (process.env.API_BASE_URL || "http://localhost:4000/api/v1");
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const url = `${baseUrl}${cleanEndpoint}`;

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: "include", // Send session cookies
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const errData = data as ApiErrorResponse | null;
    throw new ApiError(
      response.status,
      errData?.error?.code || "HTTP_ERROR",
      errData?.error?.message || `Request failed with status ${response.status}`,
      errData?.error?.fields
    );
  }

  const successData = data as ApiSuccessResponse<T>;
  if (successData?.meta?.csrfToken) {
    setClientCsrfToken(successData.meta.csrfToken);
  }

  return successData;
}
