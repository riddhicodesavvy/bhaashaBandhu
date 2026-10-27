import type { Auth } from 'firebase/auth';
let auth: Auth | undefined;
export const setAuth = (value: Auth) => { auth = value; };
export class ApiError extends Error { constructor(public code: string, message: string, public status: number) { super(message); } }
export async function api<T>(url: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (auth?.currentUser) headers.set('Authorization', `Bearer ${await auth.currentUser.getIdToken()}`);
  if (options.body && !(options.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  let response: Response;
  try { response = await fetch(`/api${url}`, { ...options, headers }); }
  catch { throw new ApiError('NETWORK', 'Network connection unavailable. Your input has been preserved.', 0); }
  const result = await response.json().catch(() => ({ error: { code: 'SERVER', message: 'Server response is unavailable. Please retry.' } }));
  if (!response.ok || result.error) throw new ApiError(result.error?.code || 'SERVER', result.error?.message || 'Request failed.', response.status);
  return result.data;
}
export const post = <T>(url: string, data: unknown = {}) => api<T>(url, { method: 'POST', body: JSON.stringify(data) });
