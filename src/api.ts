import type { Auth } from 'firebase/auth';

let auth: Auth | undefined;

/**
 * Injects the initialized Firebase Auth instance into the API client.
 */
export const setAuth = (value: Auth): void => {
  auth = value;
};

/**
 * Standardized client-side API error envelope.
 */
export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Type-safe API client that attaches Firebase ID tokens and handles API errors.
 */
export async function api<T>(url: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);

  if (auth?.currentUser) {
    const token = await auth.currentUser.getIdToken();
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  let response: Response;
  try {
    response = await fetch(`/api${url}`, { ...options, headers });
  } catch {
    throw new ApiError(
      'NETWORK',
      'Network connection unavailable. Your input has been preserved.',
      0
    );
  }

  const result = await response.json().catch(() => ({
    error: {
      code: 'SERVER',
      message: 'Server response is unavailable. Please retry.'
    }
  }));

  if (!response.ok || result.error) {
    throw new ApiError(
      result.error?.code || 'SERVER',
      result.error?.message || 'Request failed.',
      response.status
    );
  }

  return result.data;
}

/**
 * Helper for POST requests sending JSON bodies.
 */
export const post = <T>(url: string, data: unknown = {}): Promise<T> =>
  api<T>(url, {
    method: 'POST',
    body: JSON.stringify(data)
  });
