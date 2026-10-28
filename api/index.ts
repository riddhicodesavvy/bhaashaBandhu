import type { IncomingMessage, ServerResponse } from 'node:http';
import type express from 'express';
import { createApp } from '../server/app';

let appInstance: ReturnType<typeof createApp> | undefined;
let initError: { message: string; stack?: string } | null = null;

try {
  appInstance = createApp();
} catch (error: unknown) {
  const err = error as Error;
  initError = {
    message: err?.message || String(error),
    stack: err?.stack
  };
}

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  // If Vercel rewrote the path (e.g., from /api/me to /api/index), restore original request URL
  const matchedPath = req.headers['x-matched-path'];
  if (typeof matchedPath === 'string' && matchedPath.startsWith('/api')) {
    req.url = matchedPath;
  }

  // Diagnostic endpoint for production health check
  if (req.url === '/api/health/debug') {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify(
        {
          status: 'ok',
          initError,
          url: req.url,
          matchedPath: matchedPath || null,
          env: {
            hasSupabaseUrl: Boolean(process.env.SUPABASE_URL),
            hasSupabaseGateway: Boolean(process.env.SUPABASE_GATEWAY_URL),
            hasSupabaseServiceKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
            hasGroqKey: Boolean(process.env.GROQ_API_KEY),
            hasFirebaseApiKey: Boolean(
              process.env.VITE_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY
            ),
            nodeVersion: process.version
          }
        },
        null,
        2
      )
    );
    return;
  }

  if (initError) {
    res.statusCode = 503;
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        data: null,
        error: {
          code: 'BACKEND_INIT_FAILED',
          message: initError.message
        }
      })
    );
    return;
  }

  return new Promise((resolve, reject) => {
    appInstance!(
      req as unknown as express.Request,
      res as unknown as express.Response,
      (err: unknown) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      }
    );
  });
}
