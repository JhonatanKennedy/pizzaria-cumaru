const DEFAULT_API_URL = 'http://localhost:3000';
const API_URL = import.meta.env.VITE_API_URL ?? DEFAULT_API_URL;

// The routes that carry the refresh cookie. Everything else is bearer-only.
const SESSION_PATH_PREFIX = '/auth';

interface ErrorBody {
  message: string;
}

interface ApiClientConfig {
  getAccessToken: () => string | null;
  refreshAccessToken: () => Promise<string | null>;
  onSessionEnded: () => void;
}

let apiClientConfig: ApiClientConfig | null = null;

export class ApiError extends Error {
  readonly statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
  }
}

export function configureApiClient(config: ApiClientConfig): void {
  apiClientConfig = config;
}

function isSessionCall(path: string): boolean {
  return path.startsWith(SESSION_PATH_PREFIX);
}

function isErrorBody(value: unknown): value is ErrorBody {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Record<string, unknown>).message === 'string'
  );
}

async function send(
  path: string,
  options: RequestInit,
  token: string | null,
): Promise<Response> {
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    // Only the session calls ask for credentials. `Path=/auth` keeps the cookie
    // off every other route anyway, so requesting it there would widen what a
    // cross-origin request may send for nothing.
    ...(isSessionCall(path)
      ? { credentials: 'include' as RequestCredentials }
      : {}),
  });
}

function toApiError(response: Response, body: unknown): ApiError {
  return new ApiError(
    response.status,
    isErrorBody(body) ? body.message : 'Erro inesperado',
  );
}

export async function apiRequest(
  path: string,
  options: RequestInit = {},
): Promise<unknown> {
  const config = apiClientConfig;
  let response = await send(path, options, config?.getAccessToken() ?? null);

  // A session call is left alone: `/auth/refresh` answering 401 is the refresh
  // failing, and reacting to it by refreshing again would not terminate.
  if (response.status === 401 && !isSessionCall(path)) {
    const refreshed = (await config?.refreshAccessToken()) ?? null;
    if (refreshed) {
      // Retried once with the new token. A second 401 means that token was
      // refused too, and trying again would be a loop.
      response = await send(path, options, refreshed);
    }
    if (!refreshed || response.status === 401) {
      config?.onSessionEnded();
    }
  }

  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null);
    throw toApiError(response, body);
  }

  const text = await response.text();
  if (!text) {
    return null;
  }
  return JSON.parse(text);
}
