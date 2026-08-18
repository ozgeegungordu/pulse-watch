const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

export class ApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

export function getToken(): string | null {
  return localStorage.getItem('pulsewatch_token');
}

export function setToken(token: string | null): void {
  if (token) localStorage.setItem('pulsewatch_token', token);
  else localStorage.removeItem('pulsewatch_token');
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !headers.has('content-type')) headers.set('content-type', 'application/json');
  const token = getToken();
  if (token) headers.set('authorization', `Bearer ${token}`);

  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (response.status === 204) return undefined as T;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && !path.startsWith('/auth/')) {
      setToken(null);
      if (!window.location.pathname.startsWith('/login')) window.location.assign('/login');
    }
    const message = Array.isArray(data.message) ? data.message.join(', ') : data.message || `HTTP ${response.status}`;
    throw new ApiError(response.status, message);
  }
  return data as T;
}
