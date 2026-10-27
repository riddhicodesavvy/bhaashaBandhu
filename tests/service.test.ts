import { test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { Service } from '../server/service';
import { createApp } from '../server/app';
import { expectedWage, type Store, type Kind, type Envelope, type Profile, type Session, type Incident, type Task } from '../shared/types';
import { dictionaries } from '../src/i18n';
// TEST DOUBLE ONLY. Never exported or loaded by the production server.
class TestStore implements Store {
  rows = new Map<string, Envelope<unknown>>();
  async get<T>(id: string) { return structuredClone(this.rows.get(id) || null) as Envelope<T> | null; }
  async list<T>(kind: Kind, scope: {siteId?: string; ownerId?: string} = {}) { return structuredClone([...this.rows.values()].filter(r => r.kind === kind && (!scope.siteId || r.siteId === scope.siteId) && (!scope.ownerId || r.ownerId === scope.ownerId))) as Envelope<T>[]; }
  async insert<T>(row: Envelope<T>) { if (this.rows.has(row.id)) throw new Error('DUPLICATE'); this.rows.set(row.id, structuredClone(row)); }
  async compareAndSet<T>(row: Envelope<T>, version: number) { if (this.rows.get(row.id)?.version !== version) return false; this.rows.set(row.id, structuredClone({ ...row, version: version + 1 })); return true; }
}
const worker: Session = { uid: 'worker-a', role: 'worker', siteId: 'site-a' };
const contractor: Session = { uid: 'contractor-a', role: 'contractor', siteId: 'site-a' };
const hospital: Session = { uid: 'hospital-a', role: 'hospital_responder', siteId: 'site-a' };
async function fixture() {
  const store = new TestStore();
  const profile: Profile = { id: worker.uid, displayName: 'Test worker', role: 'worker', preferredLanguage: 'hi', siteId: worker.siteId, isDemo: true };
  await store.insert({ id: `profile:${worker.uid}`, kind: 'profile', siteId: worker.siteId, ownerId: worker.uid, payload: profile, version: 1 });
  const service = new Service(store, { translateTask: async (original, _source, locale) => ({ ...original, title: `${locale} test fixture` }), translateIncident: async text => `Test translation: ${text}` });
  return { service, store };
}
const original = { title: 'Test instruction', instructions: 'Move 5 bags to Zone B.', safetyNotes: 'Wear safety shoes.' };
async function assign(service: Service) {
  const preview = await service.preview(contractor, { assignedTo: worker.uid, sourceLanguage: 'en', original });
  return service.createTask(contractor, { assignedTo: worker.uid, sourceLanguage: 'en', original, previewToken: preview.previewToken, location: 'Test Zone B', deadline: '2026-10-28T12:00:00.000Z' });
}
test('task is scoped, preview-backed and preserves source across acknowledgement and completion', async () => {
  const { service, store } = await fixture(); const task = await assign(service);
  assert.equal((await service.tasks(worker))[0].id, task.id);
  assert.deepEqual((await service.task(worker, task.id)).original, original);
  await assert.rejects(() => service.task({ ...worker, uid: 'other' }, task.id), { status: 404 });
  await assert.rejects(() => service.task({ ...contractor, siteId: 'other-site' }, task.id), { status: 404 });
  await assert.rejects(() => service.task(hospital, task.id), { status: 403 });
  await assert.rejects(() => service.taskAction(worker, task.id, 'complete'), { code: 'ACKNOWLEDGE_FIRST' });
  const ack = await service.taskAction(worker, task.id, 'acknowledge');
  const duplicate = await service.taskAction(worker, task.id, 'acknowledge');
  assert.equal(ack.acknowledgedAt, duplicate.acknowledgedAt);
  await service.taskAction(worker, task.id, 'start'); await service.taskAction(worker, task.id, 'complete');
  const reloaded = new Service(store); assert.equal((await reloaded.tasks(contractor))[0].status, 'completed');
});
test('assignment rejects edited preview, arbitrary worker and unauthorized role', async () => {
  const { service } = await fixture();
  const p = await service.preview(contractor, { assignedTo: worker.uid, sourceLanguage: 'en', original });
  await assert.rejects(() => service.createTask(contractor, { assignedTo: worker.uid, sourceLanguage: 'en', original: { ...original, title: 'Changed' }, previewToken: p.previewToken, location: 'Zone B', deadline: '2026-10-28T12:00:00.000Z' }), { code: 'PREVIEW_EXPIRED' });
  await assert.rejects(() => service.preview(worker, {}), { status: 403 });
  await assert.rejects(() => service.preview(contractor, { assignedTo: 'outsider', sourceLanguage: 'en', original }), { status: 404 });
});
test('concurrent task acknowledgements preserve first committed timestamp', async () => {
  const { service } = await fixture(); const task = await assign(service);
  const results = await Promise.all(Array.from({ length: 8 }, () => service.taskAction(worker, task.id, 'acknowledge')));
  assert.equal(new Set(results.map(t => t.acknowledgedAt)).size, 1);
});
test('incident idempotency, cross-role visibility, audit history and role/site isolation', async () => {
  const { service, store } = await fixture(); const body = { originalText: 'Synthetic report for testing', sourceLanguage: 'hi', category: 'hazard', urgency: 'high', location: 'Test site', requestId: randomUUID() };
  const [incident, duplicate] = await Promise.all([service.createIncident(worker, body), service.createIncident(worker, body)]);
  assert.equal(incident.id, duplicate.id); assert.equal((await service.incidents(contractor)).length, 1); assert.equal((await service.incidents(hospital))[0].id, incident.id);
  assert.equal(incident.urgency, 'high'); assert.equal(incident.originalText, body.originalText);
  await assert.rejects(() => service.incident({ ...worker, uid: 'outsider' }, incident.id), { status: 404 });
  assert.equal((await service.incidents({ ...hospital, siteId: 'elsewhere' })).length, 0);
  await assert.rejects(() => service.incidentAction(contractor, incident.id, 'acknowledged_demo'), { status: 403 });
  await assert.rejects(() => service.incidentAction(hospital, incident.id, 'closed_demo'), { status: 409 });
  await service.incidentAction(contractor, incident.id, 'reviewed');
  const ack = await service.incidentAction(hospital, incident.id, 'acknowledged_demo');
  const again = await service.incidentAction(hospital, incident.id, 'acknowledged_demo');
  assert.deepEqual(again.events, ack.events);
  await service.incidentAction(hospital, incident.id, 'follow_up_demo'); await service.incidentAction(hospital, incident.id, 'closed_demo');
  const saved = await new Service(store).incident(worker, incident.id);
  assert.equal(saved.status, 'closed_demo'); assert.equal(saved.events.length, 5); assert.equal(saved.isSimulation, true);
});
test('AI failure preserves incident source with unavailable state, never fake translation', async () => {
  const { service } = await fixture(); service.ai.translateIncident = async () => { throw new Error('provider offline'); };
  const i = await service.createIncident(worker, { originalText: 'Original report text', sourceLanguage: 'bn', category: 'other', urgency: 'low', location: 'Zone A', requestId: randomUUID() });
  assert.equal(i.englishTranslation, null); assert.equal(i.translationStatus, 'unavailable'); assert.equal(i.originalText, 'Original report text');
  service.ai.translateTask = async () => { throw new Error('offline'); };
  await assert.rejects(() => service.preview(contractor, { assignedTo: worker.uid, sourceLanguage: 'en', original }));
  assert.equal((await service.tasks(worker)).length, 0);
});
test('wages compute transparently and isolate owner/site; discrepancy is persisted', async () => {
  const { service, store } = await fixture(); const body = { workerId: worker.uid, workDate: '2026-10-27', dailyRate: 800, daysWorked: 2, overtimeHours: 3, overtimeRate: 100, deductions: 50, deductionReason: 'Test deduction', paidAmount: 500, source: 'recorded' };
  const wage = await service.createWage(contractor, body); assert.equal(expectedWage(wage), 1850);
  assert.equal((await service.wages({ ...worker, uid: 'elsewhere' })).length, 0);
  await service.dispute(worker, wage.id); assert.equal((await new Service(store).wages(contractor))[0].disputed, true);
  await assert.rejects(() => service.wages(hospital), { status: 403 });
  await assert.rejects(() => service.createWage(contractor, { ...body, dailyRate: -1 }));
});
test('HTTP boundary rejects unauthenticated/spoofed-role requests and malformed input', async () => {
  const { service } = await fixture();
  const app = createApp({ service, verify: async token => { if (token === 'worker-test-token') return worker; throw new Error('invalid test token'); } });
  await request(app).get('/api/tasks').expect(401);
  const denied = await request(app).post('/api/tasks').set('Authorization', 'Bearer worker-test-token').send({ role: 'contractor', userId: 'contractor-a' }).expect(403);
  assert.equal(denied.body.error.code, 'FORBIDDEN');
  await request(app).post('/api/incidents').set('Authorization', 'Bearer worker-test-token').send({}).expect(400);
  const health = await request(app).get('/api/health').expect(200); assert.equal(health.body.data.status, 'ok');
});
test('all UI keys have nonempty English, Hindi and Bengali translations', () => {
  for (const [key, values] of Object.entries(dictionaries)) { assert.equal(values.length, 3, key); for (const value of values) assert.ok(value.trim(), key); }
});
