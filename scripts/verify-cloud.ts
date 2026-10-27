import 'dotenv/config';
import { publicConfig, projectId } from '../server/firebase';
import { SupabaseStore } from '../server/store';
import { requestIdentity } from '../server/request-context';
async function check(label: string, test: () => Promise<unknown>) {
  try { await test(); console.info(`PASS ${label}`); }
  catch (error) { console.info(`BLOCKED ${label}: ${(error as {code?: string}).code || (error as Error).message}`); process.exitCode = 1; }
}
console.info(`Checking existing project ${projectId}; no services will be created.`);
await check('Firebase web config', async () => publicConfig());
await check('Firebase public Auth configuration endpoint', async () => {
  const config = publicConfig();
  const response = await fetch(`https://www.googleapis.com/identitytoolkit/v3/relyingparty/getProjectConfig?key=${encodeURIComponent(config.firebase.apiKey)}`, { signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`Firebase Auth configuration HTTP ${response.status}`);
});
await check('Supabase PostgreSQL application schema/read', async () => {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) { await new SupabaseStore().list('site'); return; }
  if (!process.env.DEMO_WORKER_PASSWORD) throw new Error('Gateway verification requires the private demo test password environment variable.');
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${publicConfig().firebase.apiKey}`, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'worker@bhashabandhu.demo',password:process.env.DEMO_WORKER_PASSWORD,returnSecureToken:true})});
  const identity = await response.json(); if(!response.ok) throw new Error('Demo Firebase verification login failed.');
  await requestIdentity.run(identity.idToken, () => new SupabaseStore().list('site'));
});
await check('Groq credentials and configured model availability', async () => {
  if (!process.env.GROQ_API_KEY) throw new Error('GROQ_API_KEY missing');
  const response = await fetch('https://api.groq.com/openai/v1/models', { headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` }, signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`Groq model listing HTTP ${response.status}`);
  const result = await response.json();
  const ids = new Set(result.data.map((model: {id: string}) => model.id));
  for (const id of [process.env.GROQ_TEXT_MODEL || 'openai/gpt-oss-120b', process.env.GROQ_STT_MODEL || 'whisper-large-v3']) if (!ids.has(id)) throw new Error(`Configured model unavailable: ${id}`);
});
