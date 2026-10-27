import assert from 'node:assert/strict';
const origin = process.argv[2] || 'http://127.0.0.1:8081';
for (const path of ['/login', '/worker/tasks/test', '/hospital/test']) {
  const response = await fetch(`${origin}${path}`, { signal: AbortSignal.timeout(10000) });
  assert.equal(response.status, 200); assert.match(await response.text(), /<div id="root"><\/div>/);
  console.info(`PASS production SPA route ${path}`);
}
const health = await fetch(`${origin}/api/health`); assert.equal(health.status, 200);
console.info('PASS production liveness endpoint');
const denied = await fetch(`${origin}/api/tasks`); assert.equal(denied.status, 401);
console.info('PASS production unauthenticated data request rejected');
const config = await fetch(`${origin}/api/config`);
if (config.status === 503) {
  const body = await config.json(); assert.equal(body.error.code, 'FIREBASE_CONFIG_MISSING');
  console.info('PASS missing Firebase configuration produces explicit HTTP 503 (integration remains BLOCKED)');
} else { assert.equal(config.status, 200); console.info('PASS public web configuration endpoint'); }
