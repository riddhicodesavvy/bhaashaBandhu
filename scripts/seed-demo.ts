import 'dotenv/config';
import { getAuth } from 'firebase-admin/auth';
import { adminApp, projectId } from '../server/firebase';
import { SupabaseStore } from '../server/store';
import type { Envelope, Profile, Role, Site, Wage } from '../shared/types';

const accounts: { email: string; role: Role; name: string; language: 'hi' | 'en'; uidVariable: string }[] = [
  { email: 'worker@bhashabandhu.demo', role: 'worker', name: 'Ravi Demo', language: 'hi', uidVariable: 'DEMO_WORKER_UID' },
  { email: 'contractor@bhashabandhu.demo', role: 'contractor', name: 'Anita Demo', language: 'en', uidVariable: 'DEMO_CONTRACTOR_UID' },
  { email: 'hospital@bhashabandhu.demo', role: 'hospital_responder', name: 'Responder Demo', language: 'en', uidVariable: 'DEMO_HOSPITAL_UID' }
];
async function main() {
  if (projectId !== 'sdg8-4fca4') throw new Error('Refusing to seed a different Firebase project.');
  if (process.env.DEMO_MODE !== 'true') throw new Error('Set DEMO_MODE=true for synthetic demo seeding.');
  const store = new SupabaseStore();
  await store.list<Site>('site');
  // Users/passwords are managed separately in Firebase. This script only links data
  // profiles. Explicit UIDs avoid needing privileged account-list access locally.
  const identities = [];
  for (const account of accounts) {
    const uid = process.env[account.uidVariable] || (await getAuth(adminApp()).getUserByEmail(account.email)).uid;
    identities.push({ ...account, uid });
  }
  const siteId = 'demo-site-01';
  async function createOnly<T>(record: Envelope<T>) { if (!(await store.get(record.id))) await store.insert(record); }
  const site: Site = { id: siteId, name: 'Bandhu Construction Site · Demo', location: 'Fictional training site, India', contact: 'Contact Anita Demo through the contractor account. No real telephone number.' };
  await createOnly({ id: `site:${siteId}`, kind: 'site', siteId, ownerId: '', payload: site, version: 1 });
  let workerId = '';
  for (const account of identities) {
    const profile: Profile = { id: account.uid, email: account.email, displayName: account.name, role: account.role, preferredLanguage: account.language, siteId, isDemo: true };
    await createOnly({ id: `profile:${account.uid}`, kind: 'profile', siteId, ownerId: account.uid, payload: profile, version: 1 });
    if (account.role === 'worker') workerId = account.uid;
    console.info(`Ready: ${account.role} Supabase profile linked to Firebase UID.`);
  }
  const wage: Wage = { id: 'demo-wage-01', siteId, workerId, workDate: '2026-10-27', dailyRate: 800, daysWorked: 1, overtimeHours: 2, overtimeRate: 100, deductions: 0, deductionReason: '', paidAmount: 0, source: 'agreed', disputed: false, updatedAt: new Date().toISOString() };
  await createOnly({ id: `wage:${wage.id}`, kind: 'wage', siteId, ownerId: workerId, payload: wage, version: 1 });
  console.info('Synthetic Supabase site, profiles and wage entry persisted. Firebase accounts, passwords and custom claims were not modified.');
}
main().catch(error => { console.error('Seed blocked:', (error as {code?: string}).code || (error as Error).message); process.exitCode = 1; });
