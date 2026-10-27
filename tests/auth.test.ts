import { test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import express from 'express';
import { createSessionVerifier } from '../server/auth';
import { AppError } from '../server/errors';
import { SupabaseStore } from '../server/store';
import { Service } from '../server/service';
import { createApp } from '../server/app';
import { verifyIdentity } from '../server/firebase';
import type { Envelope, Profile, Store } from '../shared/types';

test('authorization follows UID database profile, ignores email/claims, refreshes changed role', async () => {
  let row: Envelope<Profile> | null = { id: 'profile:firebase-uid', kind: 'profile', siteId: 'site-a', ownerId: 'firebase-uid', version: 1, payload: { id: 'firebase-uid', displayName: 'Demo', role: 'contractor', siteId: 'site-a', preferredLanguage: 'en', isDemo: true } };
  const store = { get: async (id: string) => id === 'profile:firebase-uid' ? structuredClone(row) : null } as unknown as Store;
  const identity = async () => ({ uid: 'firebase-uid', email: 'worker@bhashabandhu.demo', role: 'hospital_responder' });
  const verify = createSessionVerifier(store, identity);
  assert.deepEqual(await verify('verified-id-token'), { uid: 'firebase-uid', role: 'contractor', siteId: 'site-a' });
  row.payload.role = 'worker'; assert.equal((await verify('verified-id-token')).role, 'worker');
  row.ownerId = 'different-uid'; await assert.rejects(() => verify('verified-id-token'), { code: 'PROFILE_NOT_CONFIGURED' });
  row = null; await assert.rejects(() => verify('verified-id-token'), { status: 403 });
});
test('missing or malformed database role fails closed, never grants a guessed role', async () => {
  const store = { get: async () => ({ kind: 'profile', ownerId: 'uid', siteId: 'site-a', payload: { id: 'uid', role: 'admin', siteId: 'site-a' } }) } as unknown as Store;
  await assert.rejects(() => createSessionVerifier(store, async () => ({ uid: 'uid' }))('token'), { code: 'PROFILE_NOT_CONFIGURED' });
});
test('invalid Firebase token is rejected before Supabase lookup', async () => {
  await assert.rejects(() => verifyIdentity('not-a-firebase-token'), { code: 'INVALID_TOKEN', status: 401 });
  let queried = false;
  const store = { get: async () => { queried = true; return null; } } as unknown as Store;
  const verify = createSessionVerifier(store, async () => { throw new AppError(401, 'INVALID_TOKEN', 'Invalid'); });
  const app = createApp({ service: new Service(store), verify });
  await request(app).get('/api/me').set('Authorization', 'Bearer invalid').expect(401);
  assert.equal(queried, false);
});
test('Supabase missing config, scoped data requests and concurrent update conflicts are explicit', async () => {
  const previousFetch = globalThis.fetch; const previousUrl = process.env.SUPABASE_URL; const previousKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  try {
    delete process.env.SUPABASE_URL; delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    const store = new SupabaseStore();
    await assert.rejects(() => store.list('profile'), { code: 'SUPABASE_NOT_CONFIGURED' });
    process.env.SUPABASE_URL = 'https://synthetic-project.supabase.co'; process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-server-key';
    const calls: {url: URL; options?: RequestInit}[] = [];
    globalThis.fetch = async (input, options) => { calls.push({ url: new URL(String(input)), options }); return new Response('[]', { status: 200 }); };
    await store.list('task', { ownerId: 'firebase-uid', siteId: 'site-a' });
    assert.equal(calls[0].url.pathname, '/rest/v1/tasks'); assert.equal(calls[0].url.searchParams.get('owner_id'), 'eq.firebase-uid'); assert.equal(calls[0].url.searchParams.get('site_id'), 'eq.site-a');
    const record = { id: 'task:a', kind: 'task' as const, siteId: 'site-a', ownerId: 'firebase-uid', payload: {}, version: 2 };
    assert.equal(await store.compareAndSet(record, 2), false);
    assert.equal(calls[1].options?.method, 'PATCH'); assert.equal(calls[1].url.searchParams.get('version'), 'eq.2');
    globalThis.fetch = async () => new Response('sensitive-provider-error', { status: 403 });
    await assert.rejects(() => store.get('profile:firebase-uid'), { code: 'SUPABASE_ACCESS_DENIED' });
  } finally { globalThis.fetch = previousFetch; if (previousUrl) process.env.SUPABASE_URL = previousUrl; else delete process.env.SUPABASE_URL; if (previousKey) process.env.SUPABASE_SERVICE_ROLE_KEY = previousKey; else delete process.env.SUPABASE_SERVICE_ROLE_KEY; }
});
test('Firebase Functions raw multipart body is replayed for audio transcription', async () => {
  const oldFetch = globalThis.fetch; const oldKey = process.env.GROQ_API_KEY;
  try {
    process.env.GROQ_API_KEY = 'test-only-key';
    globalThis.fetch = async () => new Response(JSON.stringify({text:'Synthetic audio transcript'}), {status:200});
    const api = createApp({verify:async () => ({uid:'worker',role:'worker',siteId:'demo'})});
    const wrapper = express();
    wrapper.use(express.raw({type:'multipart/form-data',limit:'4mb'}));
    wrapper.use((req,_res,next) => { (req as express.Request & {rawBody?:Buffer}).rawBody = req.body; next(); });
    wrapper.use(api);
    const result = await request(wrapper).post('/api/audio/transcribe').set('Authorization','Bearer test').field('language','en').attach('audio',Buffer.from('test fixture'),{filename:'synthetic.wav',contentType:'audio/wav'}).expect(200);
    assert.equal(result.body.data.text,'Synthetic audio transcript');
  } finally { globalThis.fetch = oldFetch; if (oldKey) process.env.GROQ_API_KEY=oldKey; else delete process.env.GROQ_API_KEY; }
});
