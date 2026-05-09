const API_BASE =
  import.meta.env.VITE_API_URL ?? "/api"; // dev uses Vite proxy

interface RequestOptions {
  method?: string;
  body?: unknown;
  signal?: AbortSignal;
}

class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export async function request<T>(
  path: string,
  opts: RequestOptions = {},
): Promise<T> {
  const url = path.startsWith("http")
    ? path
    : `${API_BASE.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;

  const res = await fetch(url, {
    method: opts.method ?? "GET",
    headers: { "Content-Type": "application/json" },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    signal: opts.signal,
  });

  if (!res.ok) {
    let payload: { error?: { code?: string; message?: string } } = {};
    try {
      payload = await res.json();
    } catch {
      // not json
    }
    throw new ApiError(
      res.status,
      payload.error?.code ?? "unknown",
      payload.error?.message ?? res.statusText,
    );
  }

  // Some endpoints might return empty bodies in the future
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export { ApiError };
