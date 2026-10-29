import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import { Readable } from 'node:stream';
import { ZodError } from 'zod';
import { AppError, ensure } from './errors';
import { publicConfig } from './firebase';
import { createSessionVerifier } from './auth';
import { SupabaseStore } from './store';
import { Service } from './service';
import { transcribe } from './ai';
import { localeSchema } from './validation';
import type { Session, ApiResponse } from '../shared/types';
import { requestIdentity } from './request-context';

declare global {
  namespace Express {
    interface Request {
      session: Session;
    }
  }
}

/** Allowed origins for CORS validation in production and local testing */
const ALLOWED_ORIGIN_PATTERNS = [
  /^https?:\/\/localhost(:\d+)?$/,
  /^https?:\/\/127\.0\.0\.1(:\d+)?$/,
  /^https:\/\/[a-z0-9-]+\.firebaseapp\.com$/,
  /^https:\/\/[a-z0-9-]+\.web\.app$/,
  /^https:\/\/[a-z0-9-]+\.vercel\.app$/
];

function isAllowedOrigin(origin: string, hostHeader?: string): boolean {
  if (!origin) return true;
  if (hostHeader && (origin === `http://${hostHeader}` || origin === `https://${hostHeader}`)) {
    return true;
  }
  return ALLOWED_ORIGIN_PATTERNS.some(pattern => pattern.test(origin));
}

export function createApp(options: {
  service?: Service;
  verify?: (token: string) => Promise<Session>;
} = {}) {
  const app = express();
  const service = options.service || new Service(new SupabaseStore());
  const verify = options.verify || createSessionVerifier(service.store);

  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  // 1. Content Security Policy & Security Headers
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc:
            process.env.NODE_ENV === 'production'
              ? ["'self'"]
              : ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          connectSrc: [
            "'self'",
            'https://*.googleapis.com',
            'https://*.firebaseapp.com',
            'https://*.firebaseio.com',
            'https://securetoken.googleapis.com',
            'https://*.supabase.co'
          ],
          imgSrc: ["'self'", 'data:', 'blob:'],
          mediaSrc: ["'self'", 'blob:', 'data:'],
          frameSrc: ['https://*.firebaseapp.com'],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          ...(process.env.NODE_ENV === 'production' ? { upgradeInsecureRequests: [] } : {})
        }
      }
    })
  );

  // Additional security headers & Permissions-Policy
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader(
      'Permissions-Policy',
      'camera=(), microphone=(self), geolocation=(), payment=()'
    );
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  // 2. Origin & CORS Validation Middleware
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin) {
      if (!isAllowedOrigin(origin, req.headers.host)) {
        res.status(403).json({
          data: null,
          error: { code: 'FORBIDDEN_ORIGIN', message: 'Request origin not allowed by CORS policy.' }
        });
        return;
      }
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
      res.setHeader('Access-Control-Max-Age', '86400');
    }
    if (req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }
    next();
  });

  // 3. Cache-Control for API responses: prevent client/proxy caching of dynamic worker data
  app.use('/api', (_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    next();
  });

  app.use(express.json({ limit: '256kb' }));

  // Global rate limiter on API endpoints
  app.use(
    '/api',
    rateLimit({
      windowMs: 60000,
      limit: 180,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      handler: (_req, res) =>
        res.status(429).json({
          data: null,
          error: { code: 'RATE_LIMIT', message: 'Too many requests. Try again in a minute.' }
        })
    })
  );

  // Public unauthenticated endpoints
  app.get('/api/health', (_req, res) => {
    res.json({ data: { status: 'ok' }, error: null });
  });

  app.get('/api/config', (_req, res) => {
    res.json({ data: publicConfig(), error: null });
  });

  // Authentication barrier
  app.use('/api', async (req, _res, next) => {
    const token = req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
    ensure(token, 401, 'SIGN_IN_REQUIRED', 'Sign in to continue.');
    await requestIdentity.run(token, async () => {
      req.session = await verify(token);
      next();
    });
  });

  const ok = <T>(res: express.Response, data: T, status = 200) => {
    const payload: ApiResponse<T> = { data, error: null };
    res.status(status).json(payload);
  };

  // Profile and Session endpoints
  app.get('/api/me', async (req, res) => {
    ok(res, await service.profile(req.session));
  });

  app.patch('/api/me/language', async (req, res) => {
    const lang = localeSchema.parse(req.body.language);
    ok(res, await service.language(req.session, lang));
  });

  app.get('/api/site', async (req, res) => {
    ok(res, await service.site(req.session));
  });

  app.get('/api/workers', async (req, res) => {
    ok(res, await service.workers(req.session));
  });

  // Task endpoints
  app.get('/api/tasks', async (req, res) => {
    ok(res, await service.tasks(req.session));
  });

  app.post(
    '/api/tasks/preview',
    rateLimit({ windowMs: 60000, limit: 12, keyGenerator: req => req.session.uid }),
    async (req, res) => {
      ok(res, await service.preview(req.session, req.body));
    }
  );

  app.post('/api/tasks', async (req, res) => {
    ok(res, await service.createTask(req.session, req.body), 201);
  });

  app.get('/api/tasks/:id', async (req, res) => {
    ok(res, await service.task(req.session, String(req.params.id)));
  });

  for (const action of ['acknowledge', 'start', 'complete'] as const) {
    app.post(`/api/tasks/:id/${action}`, async (req, res) => {
      ok(res, await service.taskAction(req.session, String(req.params.id), action));
    });
  }

  // Incident endpoints
  app.get('/api/incidents', async (req, res) => {
    ok(res, await service.incidents(req.session));
  });

  app.post(
    '/api/incidents',
    rateLimit({ windowMs: 60000, limit: 12, keyGenerator: req => req.session.uid }),
    async (req, res) => {
      ok(res, await service.createIncident(req.session, req.body), 201);
    }
  );

  app.get('/api/incidents/:id', async (req, res) => {
    ok(res, await service.incident(req.session, String(req.params.id)));
  });

  const actions = {
    review: 'reviewed',
    'acknowledge-demo': 'acknowledged_demo',
    'follow-up-demo': 'follow_up_demo',
    'close-demo': 'closed_demo'
  } as const;

  for (const [action, status] of Object.entries(actions)) {
    app.post(`/api/incidents/:id/${action}`, async (req, res) => {
      ok(res, await service.incidentAction(req.session, String(req.params.id), status));
    });
  }

  app.post(
    '/api/incidents/:id/retry-translation',
    rateLimit({ windowMs: 60000, limit: 6, keyGenerator: req => req.session.uid }),
    async (req, res) => {
      ok(res, await service.retryIncidentTranslation(req.session, String(req.params.id)));
    }
  );

  // Wage endpoints
  app.get('/api/wages', async (req, res) => {
    ok(res, await service.wages(req.session));
  });

  app.post('/api/wages', async (req, res) => {
    ok(res, await service.createWage(req.session, req.body), 201);
  });

  app.post('/api/wages/:id/dispute', async (req, res) => {
    ok(res, await service.dispute(req.session, String(req.params.id)));
  });

  // Audio Upload & Transcription
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 3 * 1024 * 1024, files: 1, fields: 5 },
    fileFilter: (_req, file, cb) => {
      const mime = file.mimetype.split(';')[0];
      if (!['audio/webm', 'audio/mp4', 'audio/ogg', 'audio/wav', 'audio/mpeg'].includes(mime)) {
        return cb(
          new AppError(415, 'AUDIO_FORMAT', 'Unsupported audio format. Please type instead.')
        );
      }
      cb(null, true);
    }
  });

  const parseAudio: express.RequestHandler = (req, res, next) => {
    const rawBody = (req as express.Request & { rawBody?: Buffer }).rawBody;
    if (!rawBody || !req.is('multipart/form-data')) {
      return upload.single('audio')(req, res, next);
    }
    const replay = Readable.from([rawBody]) as unknown as express.Request;
    replay.headers = req.headers;
    replay.method = req.method;
    upload.single('audio')(replay, res, error => {
      req.body = replay.body;
      req.file = replay.file;
      next(error);
    });
  };

  app.post(
    '/api/audio/transcribe',
    rateLimit({ windowMs: 60000, limit: 12, keyGenerator: req => req.session.uid }),
    (req, _res, next) => {
      service.allow(req.session, 'worker', 'contractor');
      next();
    },
    parseAudio,
    async (req, res) => {
      ensure(req.file, 400, 'NO_AUDIO', 'Record a short audio clip first.');
      const lang = localeSchema.parse(req.body.language);
      ok(res, {
        text: await transcribe(req.file.buffer, req.file.mimetype.split(';')[0], lang)
      });
    }
  );

  // 404 handler for API routes
  app.use('/api', (_req, res) => {
    res.status(404).json({
      data: null,
      error: { code: 'NOT_FOUND', message: 'API route not found.' }
    });
  });

  // Centralized Error Envelope Handler
  app.use(
    (
      error: unknown,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction
    ) => {
      if ((error as { type?: string })?.type === 'entity.parse.failed') {
        return res.status(400).json({
          data: null,
          error: { code: 'INVALID_JSON', message: 'Request body must contain valid JSON.' }
        });
      }
      if ((error as { type?: string })?.type === 'entity.too.large') {
        return res.status(413).json({
          data: null,
          error: { code: 'INPUT_LIMIT', message: 'Request is too large.' }
        });
      }
      if (error instanceof ZodError) {
        return res.status(400).json({
          data: null,
          error: {
            code: 'VALIDATION',
            message: error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ')
          }
        });
      }
      if (error instanceof multer.MulterError) {
        return res.status(413).json({
          data: null,
          error: {
            code: 'UPLOAD_LIMIT',
            message: 'Audio clip is too large. Record under 60 seconds / 3 MB, or type instead.'
          }
        });
      }

      const known = error instanceof AppError;
      if (!known) {
        console.error('Request failed', {
          code: (error as { code?: string })?.code || 'INTERNAL'
        });
      }

      return res.status(known ? error.status : 503).json({
        data: null,
        error: {
          code: known ? error.code : 'BACKEND_UNAVAILABLE',
          message: known
            ? error.message
            : 'Backend could not complete this request. Check cloud configuration and permissions, then retry.'
        }
      });
    }
  );

  return app;
}
