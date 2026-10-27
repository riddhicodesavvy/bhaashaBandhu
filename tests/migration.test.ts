import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';

test('PostgreSQL migration enforces UID roles, RLS, versioning and atomic append-only incident history', async () => {
  // Actual embedded PostgreSQL, isolated test database only. Never a production fallback.
  const db = new PGlite();
  try {
    await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
    const migration = await readFile(new URL('../supabase/migrations/202610270001_bhashabandhu.sql', import.meta.url), 'utf8');
    await db.exec(migration); await db.exec(migration);
    await db.query('insert into construction_sites(id,site_id,owner_id,payload) values ($1,$2,$3,$4)', ['site:demo', 'demo', '', {id:'demo'}]);
    const profile = { id: 'uid-worker', email:'worker@bhashabandhu.demo', displayName:'Worker Demo', role:'worker', preferredLanguage:'hi', siteId:'demo', isDemo:true };
    await db.query('insert into user_profiles(id,site_id,owner_id,payload) values ($1,$2,$3,$4)', ['profile:uid-worker','demo','uid-worker',profile]);
    const rows = await db.query<{firebase_uid:string;role:string;email:string}>('select firebase_uid,role,email from user_profiles');
    assert.equal(rows.rows[0].firebase_uid, 'uid-worker'); assert.equal(rows.rows[0].role, 'worker');
    await assert.rejects(() => db.query('update user_profiles set payload=$1,version=version+1', [{...profile, role:'admin'}]));
    await assert.rejects(() => db.exec('update user_profiles set version=version+2'));
    const event = {id:randomUUID(),actorId:'uid-worker',actorRole:'worker',from:null,to:'reported',at:new Date().toISOString()};
    const incident = {id:'i-1',siteId:'demo',reporterId:'uid-worker',status:'reported',isSimulation:true,events:[event]};
    await db.query('insert into incidents(id,site_id,owner_id,payload) values ($1,$2,$3,$4)', ['incident:i-1','demo','uid-worker',incident]);
    assert.equal((await db.query('select * from incident_events')).rows.length, 1);
    await assert.rejects(() => db.exec('delete from incident_events'));
    await assert.rejects(() => db.query('update incidents set payload=$1,version=2 where id=$2', [{...incident,events:[{...event,to:'closed_demo'}]},'incident:i-1']));
    assert.equal((await db.query('select * from incident_events')).rows.length, 1);
    await db.exec('set role anon');
    await assert.rejects(() => db.exec('select * from user_profiles'));
    await db.exec('reset role');
    assert.equal((await db.query('select * from user_profiles')).rows.length, 1);
  } finally { await db.close(); }
});
