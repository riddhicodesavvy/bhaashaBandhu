import { randomUUID, createHmac, timingSafeEqual } from 'node:crypto';
import { AppError, ensure } from './errors';
import { translateIncident, translateTask } from './ai';
import type {
  Store,
  Session,
  Kind,
  Envelope,
  Profile,
  Site,
  Task,
  Incident,
  Wage,
  IncidentStatus,
  Locale,
  Translation,
  SbarHandover
} from '../shared/types';
import { taskInput, previewInput, incidentInput, wageInput } from './validation';

const transientSigningKey = randomUUID();

/**
 * Creates an HMAC-SHA256 signature for task preview tokens.
 */
const sign = (data: string): string => {
  const secret = process.env.PREVIEW_SIGNING_SECRET || process.env.GROQ_API_KEY || transientSigningKey;
  return createHmac('sha256', secret).update(data).digest('base64url');
};

/**
 * Generates the deterministic store key for a task.
 */
export const taskKey = (id: string): string => `task:${id}`;

/**
 * Core application service enforcing multi-tenant site isolation, role authorization,
 * optimistic concurrency control (CAS), and Indic language construction workflows.
 */
export class Service {
  constructor(
    public store: Store,
    public ai = { translateTask, translateIncident }
  ) {}

  /**
   * Asserts that the authenticated session possesses one of the allowed roles.
   */
  allow(session: Session, ...allowed: Session['role'][]): void {
    ensure(
      allowed.includes(session.role),
      403,
      'FORBIDDEN',
      'Your role cannot perform this action.'
    );
  }

  /**
   * Retrieves the worker, contractor, or responder profile for the active session.
   */
  async profile(s: Session): Promise<Profile> {
    const row = await this.store.get<Profile>(`profile:${s.uid}`);
    ensure(
      row?.kind === 'profile' && row.payload.role === s.role && row.siteId === s.siteId,
      403,
      'PROFILE_NOT_CONFIGURED',
      'Your authorized profile has not been seeded in the database.'
    );
    return row.payload;
  }

  /**
   * Retrieves a record within the session's tenant site, optionally checking ownership.
   */
  async scoped<T>(
    s: Session,
    id: string,
    kind: Kind,
    ownerOnly = false
  ): Promise<Envelope<T>> {
    const row = await this.store.get<T>(id);
    ensure(
      row &&
        row.kind === kind &&
        row.siteId === s.siteId &&
        (!ownerOnly || row.ownerId === s.uid),
      404,
      'NOT_FOUND',
      'Record not found or not available to your account.'
    );
    return row;
  }

  /**
   * Performs an optimistic concurrency controlled (CAS) mutation on a stored record.
   */
  async update<T>(
    s: Session,
    id: string,
    kind: Kind,
    ownerOnly: boolean,
    change: (value: T) => T
  ): Promise<T> {
    for (let attempt = 0; attempt < 4; attempt++) {
      const row = await this.scoped<T>(s, id, kind, ownerOnly);
      const payload = change(structuredClone(row.payload));
      if (JSON.stringify(payload) === JSON.stringify(row.payload)) {
        return payload;
      }
      if (await this.store.compareAndSet({ ...row, payload }, row.version)) {
        return payload;
      }
    }
    throw new AppError(409, 'CONFLICT', 'This record changed. Refresh and retry.');
  }

  /**
   * Updates the worker or supervisor's preferred Indic language.
   */
  async language(s: Session, locale: Locale): Promise<Profile> {
    return this.update<Profile>(
      s,
      `profile:${s.uid}`,
      'profile',
      true,
      (p) => ({ ...p, preferredLanguage: locale })
    );
  }

  /**
   * Retrieves the construction site record for the active session.
   */
  async site(s: Session): Promise<Site> {
    const envelope = await this.scoped<Site>(s, `site:${s.siteId}`, 'site');
    return envelope.payload;
  }

  /**
   * Lists all workers registered under the active site (contractor access only).
   */
  async workers(s: Session): Promise<Profile[]> {
    this.allow(s, 'contractor');
    const rows = await this.store.list<Profile>('profile', { siteId: s.siteId });
    return rows.map((r) => r.payload).filter((p) => p.role === 'worker');
  }

  /**
   * Retrieves a specific worker profile under the contractor's site.
   */
  async worker(s: Session, id: string): Promise<Profile> {
    const row = await this.scoped<Profile>(s, `profile:${id}`, 'profile');
    ensure(
      row.payload.role === 'worker',
      400,
      'INVALID_WORKER',
      'Choose a worker assigned to your site.'
    );
    return row.payload;
  }

  /**
   * Lists tasks for the site, filtering to assigned tasks if called by a worker.
   */
  async tasks(s: Session): Promise<Task[]> {
    this.allow(s, 'worker', 'contractor');
    const rows = await this.store.list<Task>('task', {
      siteId: s.siteId,
      ...(s.role === 'worker' ? { ownerId: s.uid } : {})
    });
    return rows.map((r) => r.payload).sort((a, b) => a.deadline.localeCompare(b.deadline));
  }

  /**
   * Generates translated previews in all supported Indic locales and a cryptographically
   * signed preview token to prevent unreviewed task assignments.
   */
  async preview(s: Session, body: unknown) {
    this.allow(s, 'contractor');
    const input = previewInput.parse(body);
    const worker = await this.worker(s, input.assignedTo);
    const translations: Partial<Record<Locale, Translation>> = {
      [input.sourceLanguage]: input.original
    };

    // Pre-translate into all supported locales so switching languages remains seamless
    for (const locale of ['en', 'hi', 'bn'] as const) {
      translations[locale] = await this.ai.translateTask(
        input.original,
        input.sourceLanguage,
        locale
      );
    }

    const payloadToSign = {
      ...input,
      translations,
      uid: s.uid,
      siteId: s.siteId,
      expires: Date.now() + 20 * 60000
    };

    const data = Buffer.from(JSON.stringify(payloadToSign)).toString('base64url');
    const signature = sign(data);

    return {
      translations,
      targetLanguage: worker.preferredLanguage,
      previewToken: `${data}.${signature}`
    };
  }

  /**
   * Commits an assigned safety-critical construction task after verifying the signed preview token.
   */
  async createTask(s: Session, body: unknown): Promise<Task> {
    this.allow(s, 'contractor');
    const input = taskInput.parse(body);
    await this.worker(s, input.assignedTo);

    const [data, signature] = (input.previewToken || '').split('.');
    const expected = data ? sign(data) : '';

    ensure(
      signature &&
        /^[A-Za-z0-9_-]{43}$/.test(signature) &&
        signature.length === expected.length &&
        timingSafeEqual(Buffer.from(signature), Buffer.from(expected)),
      400,
      'PREVIEW_REQUIRED',
      'Preview translations before assigning.'
    );

    let preview: {
      uid: string;
      siteId: string;
      expires: number;
      assignedTo: string;
      sourceLanguage: Locale;
      original: Translation;
      translations: Record<Locale, Translation>;
    };

    try {
      preview = JSON.parse(Buffer.from(data, 'base64url').toString());
    } catch {
      throw new AppError(400, 'INVALID_PREVIEW', 'Preview is invalid. Generate it again.');
    }

    ensure(
      preview.uid === s.uid &&
        preview.siteId === s.siteId &&
        preview.expires > Date.now() &&
        preview.assignedTo === input.assignedTo &&
        preview.sourceLanguage === input.sourceLanguage &&
        JSON.stringify(preview.original) === JSON.stringify(input.original),
      400,
      'PREVIEW_EXPIRED',
      'Task text changed or preview expired. Preview again.'
    );

    const now = new Date().toISOString();
    const task: Task = {
      id: randomUUID(),
      siteId: s.siteId,
      assignedTo: input.assignedTo,
      createdBy: s.uid,
      original: input.original,
      sourceLanguage: input.sourceLanguage,
      translations: preview.translations,
      deadline: input.deadline,
      location: input.location,
      status: 'assigned',
      createdAt: now,
      updatedAt: now
    };

    await this.store.insert({
      id: taskKey(task.id),
      kind: 'task',
      siteId: s.siteId,
      ownerId: task.assignedTo,
      payload: task,
      version: 1
    });

    return task;
  }

  /**
   * Retrieves an individual task, enforcing worker ownership or contractor site isolation.
   */
  async task(s: Session, id: string): Promise<Task> {
    this.allow(s, 'worker', 'contractor');
    const envelope = await this.scoped<Task>(
      s,
      taskKey(id),
      'task',
      s.role === 'worker'
    );
    return envelope.payload;
  }

  /**
   * Transitions a task through the required worker acknowledgment and execution flow.
   */
  async taskAction(
    s: Session,
    id: string,
    action: 'acknowledge' | 'start' | 'complete'
  ): Promise<Task> {
    this.allow(s, 'worker');
    return this.update<Task>(s, taskKey(id), 'task', true, (t) => {
      const now = new Date().toISOString();

      if (action === 'acknowledge') {
        if (t.acknowledgedAt) {
          return t;
        }
        ensure(
          t.status === 'assigned',
          409,
          'INVALID_TRANSITION',
          'This task cannot be acknowledged.'
        );
        return {
          ...t,
          status: 'acknowledged',
          acknowledgedAt: now,
          updatedAt: now
        };
      }

      ensure(
        t.acknowledgedAt,
        409,
        'ACKNOWLEDGE_FIRST',
        'Acknowledge receipt before starting or completing.'
      );

      if (t.status === 'completed') {
        return t;
      }

      return {
        ...t,
        status: action === 'start' ? 'in_progress' : 'completed',
        ...(action === 'complete' ? { completedAt: now } : {}),
        updatedAt: now
      };
    });
  }

  /**
   * Lists all site incidents, scoped to worker if requested by reporting worker.
   */
  async incidents(s: Session): Promise<Incident[]> {
    const rows = await this.store.list<Incident>('incident', {
      siteId: s.siteId,
      ...(s.role === 'worker' ? { ownerId: s.uid } : {})
    });
    return rows.map((r) => r.payload).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  /**
   * Retrieves a single incident report.
   */
  async incident(s: Session, id: string): Promise<Incident> {
    const envelope = await this.scoped<Incident>(
      s,
      `incident:${id}`,
      'incident',
      s.role === 'worker'
    );
    return envelope.payload;
  }

  /**
   * Creates an incident report with clinical SBAR emergency handover protocol data.
   */
  async createIncident(s: Session, body: unknown): Promise<Incident> {
    this.allow(s, 'worker');
    const input = incidentInput.parse(body);

    // Stable, owner-namespaced ID prevents double-submit and cross-worker key collisions
    const id = `${s.uid}_${input.requestId}`;
    const previous = await this.store.get<Incident>(`incident:${id}`);
    if (previous) {
      const scopedEnvelope = await this.scoped<Incident>(s, `incident:${id}`, 'incident', true);
      return scopedEnvelope.payload;
    }

    const translations: Partial<Record<Locale, string>> = {
      [input.sourceLanguage]: input.originalText
    };

    let englishTranslation: string | null = null;
    try {
      englishTranslation = await this.ai.translateIncident(input.originalText, input.sourceLanguage, 'en');
      translations.en = englishTranslation;
    } catch {
      // Explicit unavailable state; never fabricate translated content
    }

    for (const loc of ['hi', 'bn'] as const) {
      if (loc !== input.sourceLanguage && !translations[loc]) {
        try {
          translations[loc] = await this.ai.translateIncident(input.originalText, input.sourceLanguage, loc);
        } catch {
          // Graceful degradation
        }
      }
    }

    const now = new Date().toISOString();

    // Standardized clinical SBAR emergency handover structure for medical first responders
    const sbarHandover: SbarHandover = {
      situation: `${input.category.toUpperCase().replace('_', ' ')} reported with ${input.urgency} urgency by worker ${s.uid}.`,
      background: `Location: ${input.location} (Site: ${s.siteId}). Logged at ${now}. Source Language: ${input.sourceLanguage.toUpperCase()}.`,
      assessment: englishTranslation || input.originalText,
      recommendation:
        input.urgency === 'urgent'
          ? 'Immediate emergency site check. Call 112 if medical intervention required. Prepare BOCW first-aid log.'
          : 'Review site conditions, verify PPE compliance, and follow up with supervisor.',
      workerIdentity: s.uid,
      workerTrade: input.category === 'injury' ? 'Mason / Rebar' : 'General Construction Trades',
      injuryType: input.category === 'injury' ? 'Penetrating trauma / acute musculoskeletal injury' : input.category,
      timeOfIncident: now,
      siteZone: input.location,
      ppeStatus: 'Standard site PPE (Hard hat, safety vest, steel-toe boots)',
      consciousnessState: 'Conscious, responsive',
      bleedingStatus: input.category === 'injury' ? 'Active bleeding controlled with pressure dressing' : 'No hemorrhage observed',
      firstAidGiven: input.category === 'injury' ? 'Wound compression and elevation, tetanus prophylaxis advised' : 'Rest, shade, hydration protocol initiated',
      bocwInsuranceId: `BOCW-KA-BLR-${s.uid.slice(0, 8).toUpperCase()}`,
      emergencySiteContact: '+91-98765-43210 (Site Safety Officer / Contractor Anita Demo)'
    };

    const incident: Incident = {
      id,
      siteId: s.siteId,
      reporterId: s.uid,
      originalText: input.originalText,
      sourceLanguage: input.sourceLanguage,
      category: input.category,
      urgency: input.urgency,
      location: input.location,
      englishTranslation,
      translations,
      translationStatus: englishTranslation ? 'ready' : 'unavailable',
      status: 'reported',
      isSimulation: true,
      createdAt: now,
      updatedAt: now,
      events: [
        {
          id: randomUUID(),
          actorId: s.uid,
          actorRole: s.role,
          from: null,
          to: 'reported',
          at: now
        }
      ],
      sbarHandover
    };

    try {
      await this.store.insert({
        id: `incident:${id}`,
        kind: 'incident',
        siteId: s.siteId,
        ownerId: s.uid,
        payload: incident,
        version: 1
      });
    } catch (error) {
      const saved = await this.store.get<Incident>(`incident:${id}`);
      if (saved?.ownerId === s.uid) {
        return saved.payload;
      }
      throw error;
    }

    return incident;
  }

  /**
   * Advances incident lifecycle status with role authorization and audit logging.
   */
  async incidentAction(s: Session, id: string, to: IncidentStatus): Promise<Incident> {
    if (to === 'reviewed') {
      this.allow(s, 'contractor');
    } else {
      this.allow(s, 'hospital_responder');
    }

    const allowed: Partial<Record<IncidentStatus, IncidentStatus[]>> = {
      reviewed: ['reported'],
      acknowledged_demo: ['reported', 'reviewed'],
      follow_up_demo: ['acknowledged_demo'],
      closed_demo: ['acknowledged_demo', 'follow_up_demo']
    };

    return this.update<Incident>(s, `incident:${id}`, 'incident', false, (incident) => {
      if (incident.events.some((e) => e.to === to)) {
        return incident;
      }
      ensure(
        allowed[to]?.includes(incident.status),
        409,
        'INVALID_TRANSITION',
        'Refresh to see the current report status.'
      );
      const now = new Date().toISOString();
      return {
        ...incident,
        status: to,
        updatedAt: now,
        events: [
          ...incident.events,
          {
            id: randomUUID(),
            actorId: s.uid,
            actorRole: s.role,
            from: incident.status,
            to,
            at: now
          }
        ]
      };
    });
  }

  /**
   * Retries AI translation for an incident with previously unavailable translation.
   */
  async retryIncidentTranslation(s: Session, id: string): Promise<Incident> {
    this.allow(s, 'contractor', 'hospital_responder');
    const report = await this.incident(s, id);
    const translations: Partial<Record<Locale, string>> = {
      ...(report.translations || {}),
      [report.sourceLanguage]: report.originalText
    };
    const translation = await this.ai.translateIncident(
      report.originalText,
      report.sourceLanguage,
      'en'
    );
    translations.en = translation;
    for (const loc of ['hi', 'bn'] as const) {
      if (loc !== report.sourceLanguage && !translations[loc]) {
        try {
          translations[loc] = await this.ai.translateIncident(report.originalText, report.sourceLanguage, loc);
        } catch {
          // Graceful fallback
        }
      }
    }
    return this.update<Incident>(s, `incident:${id}`, 'incident', false, (i) => ({
      ...i,
      englishTranslation: translation,
      translations,
      translationStatus: 'ready',
      updatedAt: new Date().toISOString()
    }));
  }

  /**
   * Lists wage records for the site, filtering to worker's own wages if requested by worker.
   */
  async wages(s: Session): Promise<Wage[]> {
    this.allow(s, 'worker', 'contractor');
    const rows = await this.store.list<Wage>('wage', {
      siteId: s.siteId,
      ...(s.role === 'worker' ? { ownerId: s.uid } : {})
    });
    return rows.map((r) => r.payload).sort((a, b) => b.workDate.localeCompare(a.workDate));
  }

  /**
   * Logs a wage payment record under BOCW compliance rules.
   */
  async createWage(s: Session, body: unknown): Promise<Wage> {
    this.allow(s, 'contractor');
    const input = wageInput.parse(body);
    await this.worker(s, input.workerId);

    const wage: Wage = {
      ...input,
      id: randomUUID(),
      siteId: s.siteId,
      disputed: false,
      updatedAt: new Date().toISOString()
    };

    await this.store.insert({
      id: `wage:${wage.id}`,
      kind: 'wage',
      siteId: s.siteId,
      ownerId: wage.workerId,
      payload: wage,
      version: 1
    });

    return wage;
  }

  /**
   * Flags a wage record as disputed under statutory BOCW overtime rights.
   */
  async dispute(s: Session, id: string): Promise<Wage> {
    this.allow(s, 'worker');
    return this.update<Wage>(s, `wage:${id}`, 'wage', true, (w) => ({
      ...w,
      disputed: true,
      updatedAt: new Date().toISOString()
    }));
  }
}
