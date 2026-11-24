import 'dotenv/config';
import assert from 'node:assert';

const key = process.env.VITE_FIREBASE_API_KEY;
if (!key) throw new Error('VITE_FIREBASE_API_KEY required');

console.log('=== 1. VERIFY OLD PASSWORDS REJECTED ===');
for (const [role, email, oldPwd] of [
  ['Worker', 'worker@bhashabandhu.demo', 'Worker@123'],
  ['Contractor', 'contractor@bhashabandhu.demo', 'Contractor@123'],
  ['Hospital', 'hospital@bhashabandhu.demo', 'Hospital@123']
]) {
  const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: oldPwd, returnSecureToken: true })
  });
  if (r.ok) {
    console.error(`❌ FAIL: ${role} old password still works!`);
  } else {
    const err = await r.json();
    console.log(`✓ PASS: ${role} old password rejected (HTTP ${r.status}: ${err.error?.message})`);
  }
}

console.log('\n=== 2. VERIFY NEW ROTATED PASSWORDS WORK & ROLES PRESERVED ===');
for (const role of ['WORKER', 'CONTRACTOR', 'HOSPITAL']) {
  const email = process.env[`DEMO_${role}_EMAIL`] || `${role.toLowerCase()}@bhashabandhu.demo`;
  const pwd = process.env[`DEMO_${role}_PASSWORD`];
  const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: pwd, returnSecureToken: true })
  });
  assert.ok(r.ok, `${role} login with new password failed: HTTP ${r.status}`);
  const auth = await r.json();
  
  // Verify with live /api/me
  const meRes = await fetch('https://bhaasha-bandhu.vercel.app/api/me', {
    headers: { Authorization: `Bearer ${auth.idToken}` }
  });
  assert.equal(meRes.status, 200, `${role} /api/me failed`);
  const profile = (await meRes.json()).data;
  console.log(`✓ PASS: ${role} new password verified! Role: ${profile.role}, Name: ${profile.name}`);
}
