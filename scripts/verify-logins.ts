import 'dotenv/config';
import { appendFile } from 'node:fs/promises';
import { publicConfig, verifyIdentity } from '../server/firebase';
const accounts = [
  {role:'worker',email:'worker@bhashabandhu.demo',password:'DEMO_WORKER_PASSWORD',uid:'DEMO_WORKER_UID'},
  {role:'contractor',email:'contractor@bhashabandhu.demo',password:'DEMO_CONTRACTOR_PASSWORD',uid:'DEMO_CONTRACTOR_UID'},
  {role:'hospital_responder',email:'hospital@bhashabandhu.demo',password:'DEMO_HOSPITAL_PASSWORD',uid:'DEMO_HOSPITAL_UID'}
];
const config = publicConfig();
for (const account of accounts) {
  if (!process.env[account.password]) { console.info(`BLOCKED ${account.role}: seed/test password environment variable missing`); process.exitCode=1; continue; }
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(config.firebase.apiKey)}`, { method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:account.email,password:process.env[account.password],returnSecureToken:true}),signal:AbortSignal.timeout(15000) });
  const result = await response.json();
  if (!response.ok) { console.info(`FAIL ${account.role}: Firebase ${result.error?.message || response.status}`); process.exitCode=1; continue; }
  const verified = await verifyIdentity(result.idToken);
  if (verified.uid !== result.localId) throw new Error('Verified Firebase UID mismatch');
  // Persist only UID mappings in ignored local configuration, never access tokens.
  await appendFile('.env', `\n${account.uid}=${verified.uid}\n`);
  console.info(`PASS ${account.role}: real Firebase email/password login and backend signature/UID verification`);
}
