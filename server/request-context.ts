import { AsyncLocalStorage } from 'node:async_hooks';
// Each database request carries the original verified Firebase token to the
// Supabase gateway. Tokens never enter database records or logs.
export const requestIdentity = new AsyncLocalStorage<string>();
