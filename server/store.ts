import { AppError } from './errors';
import type { Envelope, Kind, Store } from '../shared/types';
import { requestIdentity } from './request-context';

export const tables: Record<Kind, string> = {
  profile: 'user_profiles',
  site: 'construction_sites',
  task: 'tasks',
  incident: 'incidents',
  wage: 'wage_entries'
};

interface Row<T> {
  id: string;
  site_id: string;
  owner_id: string;
  payload: T;
  version: number;
}

const decode = <T>(kind: Kind, row: Row<T>): Envelope<T> => ({
  id: row.id,
  kind,
  siteId: row.site_id,
  ownerId: row.owner_id,
  payload: row.payload,
  version: row.version
});

/**
 * Server-only PostgreSQL Data API with Firebase-authenticated Supabase gateway fallback.
 * Supabase Auth is not used; authorization is cryptographically tied to verified Firebase session UIDs.
 */
export class SupabaseStore implements Store {
  private async gateway<T>(body: unknown): Promise<T> {
    const origin = process.env.SUPABASE_URL;
    const token = requestIdentity.getStore();
    if (!origin || !process.env.SUPABASE_GATEWAY_URL) {
      throw new AppError(503, 'SUPABASE_NOT_CONFIGURED', 'Application data connection is not configured.');
    }
    if (!token) {
      throw new AppError(401, 'DATABASE_IDENTITY_REQUIRED', 'A verified Firebase session is required for database access.');
    }

    let response: Response;
    try {
      response = await fetch(process.env.SUPABASE_GATEWAY_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          ...(process.env.SUPABASE_PUBLISHABLE_KEY ? { apikey: process.env.SUPABASE_PUBLISHABLE_KEY } : {})
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(30000)
      });
    } catch {
      throw new AppError(503, 'SUPABASE_UNAVAILABLE', 'Application database could not be reached. Please retry.');
    }

    const result = await response.json();
    if (!response.ok || result.error) {
      throw new AppError(
        response.status || 503,
        result.error?.code || 'DATABASE_GATEWAY_ERROR',
        result.error?.message || 'Application database request failed.'
      );
    }
    return result.data;
  }

  private async request<T>(table: string, params: URLSearchParams, options: RequestInit = {}): Promise<T> {
    const origin = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!origin || !key) {
      throw new AppError(
        503,
        'SUPABASE_NOT_CONFIGURED',
        'Application data is unavailable: SUPABASE_URL and server-only SUPABASE_SERVICE_ROLE_KEY are required.'
      );
    }

    let base: URL;
    try {
      base = new URL(origin);
    } catch {
      throw new AppError(503, 'SUPABASE_CONFIG_INVALID', 'SUPABASE_URL must be a valid HTTPS project URL.');
    }

    if (base.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(base.hostname)) {
      throw new AppError(503, 'SUPABASE_CONFIG_INVALID', 'Supabase connections must use HTTPS.');
    }

    const url = new URL(`/rest/v1/${table}`, base);
    url.search = params.toString();

    let response: Response;
    try {
      response = await fetch(url, {
        ...options,
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
          ...options.headers
        },
        signal: AbortSignal.timeout(15000)
      });
    } catch {
      throw new AppError(503, 'SUPABASE_UNAVAILABLE', 'Application database could not be reached. Please retry.');
    }

    if (!response.ok) {
      if (response.status === 409) {
        throw new AppError(409, 'DATABASE_CONFLICT', 'This record already exists or conflicts with a database constraint.');
      }
      if ([401, 403].includes(response.status)) {
        throw new AppError(503, 'SUPABASE_ACCESS_DENIED', 'Supabase rejected the server credential or database permissions.');
      }
      if (response.status === 404) {
        throw new AppError(503, 'SUPABASE_SCHEMA_MISSING', 'Supabase application tables are unavailable. Apply the reviewed application migration.');
      }
      throw new AppError(503, 'SUPABASE_QUERY_FAILED', 'Application database rejected the operation. Check migration and configuration.');
    }

    return response.json() as Promise<T>;
  }

  async list<T>(kind: Kind, scope: { siteId?: string; ownerId?: string } = {}): Promise<Envelope<T>[]> {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.SUPABASE_GATEWAY_URL) {
      return this.gateway<Envelope<T>[]>({ operation: 'list', kind, scope });
    }
    const rows: Envelope<T>[] = [];
    for (let offset = 0; ; offset += 500) {
      const params = new URLSearchParams({
        select: 'id,site_id,owner_id,payload,version',
        order: 'id.asc',
        limit: '500',
        offset: String(offset)
      });
      if (scope.siteId !== undefined) params.set('site_id', `eq.${scope.siteId}`);
      if (scope.ownerId !== undefined) params.set('owner_id', `eq.${scope.ownerId}`);
      const page = await this.request<Row<T>[]>(tables[kind], params);
      rows.push(...page.map(row => decode(kind, row)));
      if (page.length < 500) return rows;
      if (rows.length >= 10000) {
        throw new AppError(413, 'RESULT_LIMIT', 'Too many records. Narrow the query before retrying.');
      }
    }
  }

  async get<T>(id: string): Promise<Envelope<T> | null> {
    const kind = id.split(':', 1)[0] as Kind;
    if (!Object.hasOwn(tables, kind)) return null;
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.SUPABASE_GATEWAY_URL) {
      return this.gateway<Envelope<T> | null>({ operation: 'get', kind, id });
    }
    const rows = await this.request<Row<T>[]>(
      tables[kind],
      new URLSearchParams({
        id: `eq.${id}`,
        select: 'id,site_id,owner_id,payload,version',
        limit: '1'
      })
    );
    return rows[0] ? decode(kind, rows[0]) : null;
  }

  async insert<T>(row: Envelope<T>): Promise<void> {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.SUPABASE_GATEWAY_URL) {
      await this.gateway({ operation: 'insert', kind: row.kind, row });
      return;
    }
    await this.request(tables[row.kind], new URLSearchParams(), {
      method: 'POST',
      body: JSON.stringify({
        id: row.id,
        site_id: row.siteId,
        owner_id: row.ownerId,
        payload: row.payload,
        version: row.version
      })
    });
  }

  async compareAndSet<T>(row: Envelope<T>, expectedVersion: number): Promise<boolean> {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.SUPABASE_GATEWAY_URL) {
      return this.gateway<boolean>({
        operation: 'update',
        kind: row.kind,
        row,
        expectedVersion
      });
    }
    const rows = await this.request<Row<T>[]>(
      tables[row.kind],
      new URLSearchParams({
        id: `eq.${row.id}`,
        version: `eq.${expectedVersion}`,
        select: 'id'
      }),
      {
        method: 'PATCH',
        body: JSON.stringify({
          payload: row.payload,
          version: expectedVersion + 1
        })
      }
    );
    return rows.length === 1;
  }
}
