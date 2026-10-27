import { test } from 'node:test';
import assert from 'node:assert/strict';
import { translateTask, translateIncident } from '../server/ai';
test('translation validates model JSON, numeric integrity, failures and same-language passthrough', async () => {
  const originalFetch = globalThis.fetch; const oldKey = process.env.GROQ_API_KEY;
  process.env.GROQ_API_KEY = 'test-only-key';
  const source = { title: 'Move 5 bags', instructions: 'Finish by 8 PM.', safetyNotes: 'Use 2 ropes.' };
  try {
    globalThis.fetch = async () => new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ title: '५ बैग उठाएं', instructions: '८ बजे तक पूरा करें।', safetyNotes: '२ रस्सियां लें।' }) } }] }), { status: 200 });
    assert.equal((await translateTask(source, 'en', 'hi')).title, '५ बैग उठाएं');
    assert.deepEqual(await translateTask(source, 'en', 'en'), source);
    globalThis.fetch = async () => new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ title: 'Move 6 bags', instructions: 'Finish by 8 PM.', safetyNotes: 'Use 2 ropes.' }) } }] }), { status: 200 });
    await assert.rejects(() => translateTask(source, 'en', 'bn'), { code: 'TRANSLATION_NUMBERS_CHANGED' });
    globalThis.fetch = async () => new Response(JSON.stringify({ choices: [{ message: { content: 'not JSON' } }] }), { status: 200 });
    await assert.rejects(() => translateTask(source, 'en', 'hi'), { code: 'INVALID_AI_RESULT' });
    globalThis.fetch = async () => new Response('provider failure', { status: 429 });
    await assert.rejects(() => translateIncident('Test synthetic incident', 'bn'), { code: 'GROQ_UNAVAILABLE' });
    delete process.env.GROQ_API_KEY;
    await assert.rejects(() => translateTask(source, 'en', 'hi'), { code: 'GROQ_NOT_CONFIGURED' });
  } finally { globalThis.fetch = originalFetch; if (oldKey) process.env.GROQ_API_KEY = oldKey; else delete process.env.GROQ_API_KEY; }
});
