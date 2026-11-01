import 'dotenv/config';
import fs from 'node:fs';
import { randomBytes } from 'node:crypto';

// Explicit maintenance operation. Never logs credentials, tokens, or provider bodies.
const key = process.env.VITE_FIREBASE_API_KEY;
if (!key) throw new Error('Firebase public API key is required.');
for (const role of ['WORKER', 'CONTRACTOR', 'HOSPITAL']) {
  const variable = `DEMO_${role}_PASSWORD`;
  const email = process.env[`DEMO_${role}_EMAIL`] || `${role.toLowerCase()}@bhashabandhu.demo`;
  const password = process.env[variable];
  if (!password) throw new Error(`Missing ${variable}`);
  async function call(operation, body) {
    const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:${operation}?key=${key}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body), signal: AbortSignal.timeout(15000)
    });
    if (!r.ok) throw new Error(`${role} ${operation} failed (HTTP ${r.status}).`);
    return r.json();
  }
  const old = await call('signInWithPassword', { email, password, returnSecureToken: true });
  const replacement = randomBytes(30).toString('base64url');
  // Save pending recovery value privately before changing the account remotely.
  fs.appendFileSync('.env', `\n${variable}_PENDING=${replacement}\n`);
  await call('update', { idToken: old.idToken, password: replacement, returnSecureToken: true });
  let contents = fs.readFileSync('.env', 'utf8');
  contents = contents.replace(new RegExp(`^${variable}=.*$`, 'gm'), `${variable}=${replacement}`)
    .replace(new RegExp(`^${variable}_PENDING=.*\\r?\\n?`, 'gm'), '');
  fs.writeFileSync('.env', contents);
  await call('signInWithPassword', { email, password: replacement, returnSecureToken: true });
  console.info(`${role}: password rotated and new login verified; value stored only in ignored .env.`);
}
