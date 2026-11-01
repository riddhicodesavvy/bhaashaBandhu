import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import request from 'supertest';
import { createApp } from '../server/app';

test('shared PostgreSQL counters are atomic, isolated, resettable and inaccessible to browser roles', async () => {
  const db = new PGlite();
  try {
    await db.exec('create role anon; create role authenticated; create role service_role;');
    await db.exec(await readFile(new URL('../supabase/migrations/202611010001_shared_rate_limits.sql', import.meta.url), 'utf8'));
    const consume = async (uid = 'a', op = 'transcribe') => (await db.query<{allowed:boolean}>('select consume_api_limit($1,$2,3) as allowed', [uid,op])).rows[0].allowed;
    const results = await Promise.all(Array.from({length:10}, () => consume()));
    assert.equal(results.filter(Boolean).length, 3);
    assert.equal(await consume('b'), true);
    assert.equal(await consume('a', 'analyze'), true);
    await db.exec("update api_rate_limits set window_start=now()-interval '2 minutes'");
    assert.equal(await consume(), true);
    await db.exec('set role anon');
    await assert.rejects(() => consume());
    await assert.rejects(() => db.exec('select * from api_rate_limits'));
  } finally { await db.close(); }
});

test('both STT aliases use the verified UID and same budget; denial is 429 and outage fails closed', async () => {
  const calls: string[][] = [];
  const app = createApp({
    verify: async () => ({uid:'trusted-uid', role:'worker', siteId:'demo'}),
    consumeLimit: async (uid, operation) => { calls.push([uid, operation]); return false; }
  });
  for (const path of ['/api/transcribe','/api/audio/transcribe']) {
    const result = await request(app).post(path).set('Authorization','Bearer test').send({uid:'forged'}).expect(429);
    assert.equal(result.headers['retry-after'],'60');
  }
  assert.deepEqual(calls,[['trusted-uid','transcribe'],['trusted-uid','transcribe']]);
  await request(app).post('/api/transcribe').expect(401);
  assert.equal(calls.length,2);
  const unavailable = createApp({verify: async () => ({uid:'u',role:'worker',siteId:'demo'}),consumeLimit:async () => { throw new Error('private provider details'); }});
  const result = await request(unavailable).post('/api/incidents').set('Authorization','Bearer test').send({}).expect(503);
  assert.ok(!JSON.stringify(result.body).includes('private provider details'));
});
