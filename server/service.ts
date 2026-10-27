import { randomUUID, createHmac, timingSafeEqual } from 'node:crypto';
import { AppError, ensure } from './errors';
import { translateIncident, translateTask } from './ai';
import type { Store, Session, Kind, Envelope, Profile, Site, Task, Incident, Wage, IncidentStatus, Locale, Translation } from '../shared/types';
import { taskInput, previewInput, incidentInput, wageInput } from './validation';

const transientSigningKey = randomUUID();
const sign = (data: string) => createHmac('sha256', process.env.PREVIEW_SIGNING_SECRET || process.env.GROQ_API_KEY || transientSigningKey).update(data).digest('base64url');
export const taskKey = (id: string) => `task:${id}`;
export class Service {
  constructor(public store: Store, public ai = { translateTask, translateIncident }) {}
  allow(session: Session, ...allowed: Session['role'][]) { ensure(allowed.includes(session.role), 403, 'FORBIDDEN', 'Your role cannot perform this action.'); }
  async profile(s: Session) {
    const row = await this.store.get<Profile>(`profile:${s.uid}`);
    ensure(row?.kind === 'profile' && row.payload.role === s.role && row.siteId === s.siteId, 403, 'PROFILE_NOT_CONFIGURED', 'Your authorized profile has not been seeded in the database.');
    return row.payload;
  }
  async scoped<T>(s: Session, id: string, kind: Kind, ownerOnly = false): Promise<Envelope<T>> {
    const row = await this.store.get<T>(id);
    ensure(row && row.kind === kind && row.siteId === s.siteId && (!ownerOnly || row.ownerId === s.uid), 404, 'NOT_FOUND', 'Record not found or not available to your account.');
    return row;
  }
  async update<T>(s: Session, id: string, kind: Kind, ownerOnly: boolean, change: (value: T) => T) {
    for (let attempt = 0; attempt < 4; attempt++) {
      const row = await this.scoped<T>(s, id, kind, ownerOnly);
      const payload = change(structuredClone(row.payload));
      if (JSON.stringify(payload) === JSON.stringify(row.payload)) return payload;
      if (await this.store.compareAndSet({ ...row, payload }, row.version)) return payload;
    }
    throw new AppError(409, 'CONFLICT', 'This record changed. Refresh and retry.');
  }
  async language(s: Session, locale: Locale) {
    return this.update<Profile>(s, `profile:${s.uid}`, 'profile', true, p => ({ ...p, preferredLanguage: locale }));
  }
  async site(s: Session) { return (await this.scoped<Site>(s, `site:${s.siteId}`, 'site')).payload; }
  async workers(s: Session) {
    this.allow(s, 'contractor');
    return (await this.store.list<Profile>('profile', { siteId: s.siteId })).map(r => r.payload).filter(p => p.role === 'worker');
  }
  async worker(s: Session, id: string) {
    const row = await this.scoped<Profile>(s, `profile:${id}`, 'profile');
    ensure(row.payload.role === 'worker', 400, 'INVALID_WORKER', 'Choose a worker assigned to your site.');
    return row.payload;
  }
  async tasks(s: Session) {
    this.allow(s, 'worker', 'contractor');
    return (await this.store.list<Task>('task', { siteId: s.siteId, ...(s.role === 'worker' ? { ownerId: s.uid } : {}) })).map(r => r.payload).sort((a, b) => a.deadline.localeCompare(b.deadline));
  }
  async preview(s: Session, body: unknown) {
    this.allow(s, 'contractor');
    const input = previewInput.parse(body);
    const worker = await this.worker(s, input.assignedTo);
    const translations: Partial<Record<Locale, Translation>> = { [input.sourceLanguage]: input.original };
    // Persist all supported locales so changing language after assignment remains useful.
    for (const locale of ['en', 'hi', 'bn'] as const) translations[locale] = await this.ai.translateTask(input.original, input.sourceLanguage, locale);
    const data = Buffer.from(JSON.stringify({ ...input, translations, uid: s.uid, siteId: s.siteId, expires: Date.now() + 20 * 60000 })).toString('base64url');
    return { translations, targetLanguage: worker.preferredLanguage, previewToken: `${data}.${sign(data)}` };
  }
  async createTask(s: Session, body: unknown) {
    this.allow(s, 'contractor');
    const input = taskInput.parse(body);
    await this.worker(s, input.assignedTo);
    const [data, signature] = (input.previewToken || '').split('.');
    const expected = data ? sign(data) : '';
    ensure(signature && /^[A-Za-z0-9_-]{43}$/.test(signature) && signature.length === expected.length && timingSafeEqual(Buffer.from(signature), Buffer.from(expected)), 400, 'PREVIEW_REQUIRED', 'Preview translations before assigning.');
    let preview;
    try { preview = JSON.parse(Buffer.from(data, 'base64url').toString()); } catch { throw new AppError(400, 'INVALID_PREVIEW', 'Preview is invalid. Generate it again.'); }
    ensure(preview.uid === s.uid && preview.siteId === s.siteId && preview.expires > Date.now() && preview.assignedTo === input.assignedTo && preview.sourceLanguage === input.sourceLanguage && JSON.stringify(preview.original) === JSON.stringify(input.original), 400, 'PREVIEW_EXPIRED', 'Task text changed or preview expired. Preview again.');
    const now = new Date().toISOString();
    const task: Task = { id: randomUUID(), siteId: s.siteId, assignedTo: input.assignedTo, createdBy: s.uid, original: input.original, sourceLanguage: input.sourceLanguage, translations: preview.translations, deadline: input.deadline, location: input.location, status: 'assigned', createdAt: now, updatedAt: now };
    await this.store.insert({ id: taskKey(task.id), kind: 'task', siteId: s.siteId, ownerId: task.assignedTo, payload: task, version: 1 });
    return task;
  }
  async task(s: Session, id: string) {
    this.allow(s, 'worker', 'contractor');
    return (await this.scoped<Task>(s, taskKey(id), 'task', s.role === 'worker')).payload;
  }
  async taskAction(s: Session, id: string, action: 'acknowledge' | 'start' | 'complete') {
    this.allow(s, 'worker');
    return this.update<Task>(s, taskKey(id), 'task', true, t => {
      const now = new Date().toISOString();
      if (action === 'acknowledge') { if (t.acknowledgedAt) return t; ensure(t.status === 'assigned', 409, 'INVALID_TRANSITION', 'This task cannot be acknowledged.'); return { ...t, status: 'acknowledged', acknowledgedAt: now, updatedAt: now }; }
      ensure(t.acknowledgedAt, 409, 'ACKNOWLEDGE_FIRST', 'Acknowledge receipt before starting or completing.');
      if (t.status === 'completed') return t;
      return { ...t, status: action === 'start' ? 'in_progress' : 'completed', ...(action === 'complete' ? { completedAt: now } : {}), updatedAt: now };
    });
  }
  async incidents(s: Session) {
    return (await this.store.list<Incident>('incident', { siteId: s.siteId, ...(s.role === 'worker' ? { ownerId: s.uid } : {}) })).map(r => r.payload).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  async incident(s: Session, id: string) { return (await this.scoped<Incident>(s, `incident:${id}`, 'incident', s.role === 'worker')).payload; }
  async createIncident(s: Session, body: unknown) {
    this.allow(s, 'worker');
    const input = incidentInput.parse(body);
    // Stable, owner-namespaced ID prevents double-submit and cross-worker key collisions.
    const id = `${s.uid}_${input.requestId}`;
    const previous = await this.store.get<Incident>(`incident:${id}`);
    if (previous) return (await this.scoped<Incident>(s, `incident:${id}`, 'incident', true)).payload;
    let englishTranslation: string | null = null;
    try { englishTranslation = await this.ai.translateIncident(input.originalText, input.sourceLanguage); } catch { /* Explicit unavailable state; never fabricate translated content. */ }
    const now = new Date().toISOString();
    const incident: Incident = { id, siteId: s.siteId, reporterId: s.uid, originalText: input.originalText, sourceLanguage: input.sourceLanguage, category: input.category, urgency: input.urgency, location: input.location, englishTranslation, translationStatus: englishTranslation ? 'ready' : 'unavailable', status: 'reported', isSimulation: true, createdAt: now, updatedAt: now, events: [{ id: randomUUID(), actorId: s.uid, actorRole: s.role, from: null, to: 'reported', at: now }] };
    try { await this.store.insert({ id: `incident:${id}`, kind: 'incident', siteId: s.siteId, ownerId: s.uid, payload: incident, version: 1 }); }
    catch (error) { const saved = await this.store.get<Incident>(`incident:${id}`); if (saved?.ownerId === s.uid) return saved.payload; throw error; }
    return incident;
  }
  async incidentAction(s: Session, id: string, to: IncidentStatus) {
    if (to === 'reviewed') this.allow(s, 'contractor'); else this.allow(s, 'hospital_responder');
    const allowed: Partial<Record<IncidentStatus, IncidentStatus[]>> = { reviewed: ['reported'], acknowledged_demo: ['reported', 'reviewed'], follow_up_demo: ['acknowledged_demo'], closed_demo: ['acknowledged_demo', 'follow_up_demo'] };
    return this.update<Incident>(s, `incident:${id}`, 'incident', false, incident => {
      if (incident.events.some(e => e.to === to)) return incident;
      ensure(allowed[to]?.includes(incident.status), 409, 'INVALID_TRANSITION', 'Refresh to see the current report status.');
      const now = new Date().toISOString();
      return { ...incident, status: to, updatedAt: now, events: [...incident.events, { id: randomUUID(), actorId: s.uid, actorRole: s.role, from: incident.status, to, at: now }] };
    });
  }
  async retryIncidentTranslation(s: Session, id: string) {
    this.allow(s, 'contractor', 'hospital_responder');
    const report = await this.incident(s, id);
    const translation = await this.ai.translateIncident(report.originalText, report.sourceLanguage);
    return this.update<Incident>(s, `incident:${id}`, 'incident', false, i => ({ ...i, englishTranslation: translation, translationStatus: 'ready', updatedAt: new Date().toISOString() }));
  }
  async wages(s: Session) {
    this.allow(s, 'worker', 'contractor');
    return (await this.store.list<Wage>('wage', { siteId: s.siteId, ...(s.role === 'worker' ? { ownerId: s.uid } : {}) })).map(r => r.payload).sort((a, b) => b.workDate.localeCompare(a.workDate));
  }
  async createWage(s: Session, body: unknown) {
    this.allow(s, 'contractor'); const input = wageInput.parse(body); await this.worker(s, input.workerId);
    const wage: Wage = { ...input, id: randomUUID(), siteId: s.siteId, disputed: false, updatedAt: new Date().toISOString() };
    await this.store.insert({ id: `wage:${wage.id}`, kind: 'wage', siteId: s.siteId, ownerId: wage.workerId, payload: wage, version: 1 }); return wage;
  }
  async dispute(s: Session, id: string) {
    this.allow(s, 'worker'); return this.update<Wage>(s, `wage:${id}`, 'wage', true, w => ({ ...w, disputed: true, updatedAt: new Date().toISOString() }));
  }
}
