const DEFAULT_API_URL = 'http://localhost:3000';
const API_URL = import.meta.env.VITE_API_URL ?? DEFAULT_API_URL;

interface ErrorBody {
  message: string;
}

interface ApiClientConfig {
  getToken: () => string | null;
  onUnauthorized: () => void;
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

function isErrorBody(value: unknown): value is ErrorBody {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Record<string, unknown>).message === 'string'
  );
}

export async function apiRequest(
  path: string,
  options: RequestInit = {},
): Promise<unknown> {
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  const token = apiClientConfig?.getToken() ?? null;
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (!response.ok) {
    if (response.status === 401) {
      apiClientConfig?.onUnauthorized();
    }
    const body: unknown = await response.json().catch(() => null);
    const message = isErrorBody(body) ? body.message : 'Unexpected error';
    throw new ApiError(response.status, message);
  }

  const text = await response.text();
  if (!text) {
    return null;
  }
  return JSON.parse(text);
}
