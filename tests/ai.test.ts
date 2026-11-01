import { test } from 'node:test';
import assert from 'node:assert/strict';
import { translateTask, translateIncident, transcribe, analyzeIncident } from '../server/ai';

test('empty and silent PCM recordings fail before calling the speech provider', async () => {
  await assert.rejects(() => transcribe(Buffer.alloc(0), 'audio/wav', 'en'), { code: 'NO_AUDIO' });
  const wav = Buffer.alloc(32044);
  wav.write('RIFF'); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8);
  wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(16000, 24); wav.writeUInt32LE(32000, 28); wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(32000, 40);
  await assert.rejects(() => transcribe(wav, 'audio/wav', 'en'), { code: 'EMPTY_TRANSCRIPT' });
});

test('invalid analysis cannot silently become a fabricated hazard classification', async () => {
  const originalFetch = globalThis.fetch; const oldKey = process.env.GROQ_API_KEY;
  process.env.GROQ_API_KEY = 'test-only-key';
  try {
    globalThis.fetch = async () => new Response(JSON.stringify({ choices: [{ message: { content: '{}' } }] }));
    await assert.rejects(() => analyzeIncident('Water near electrical board', 'en'), { code: 'INVALID_AI_RESULT' });
  } finally { globalThis.fetch = originalFetch; if (oldKey) process.env.GROQ_API_KEY = oldKey; else delete process.env.GROQ_API_KEY; }
});
test('translation validates model JSON, numeric integrity, failures and same-language passthrough', async () => {
  const originalFetch = globalThis.fetch; const oldKey = process.env.GROQ_API_KEY;
  process.env.GROQ_API_KEY = 'test-only-key';
  const source = { title: 'Move 5 bags', instructions: 'Finish by 8 PM.', safetyNotes: 'Use 2 ropes.' };
  try {
    globalThis.fetch = async () => new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ title: '५ बैग उठाएं', instructions: '८ बजे तक पूरा करें।', safetyNotes: '२ रस्सियां लें।' }) } }] }), { status: 200 });
    assert.equal((await translateTask(source, 'en', 'hi')).title, '५ बैग उठाएं');
    assert.deepEqual(await translateTask(source, 'en', 'en'), source);
    globalThis.fetch = async () => new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ title: '2nd floor railing', instructions: 'Install 4 posts on the 2nd floor.', safetyNotes: '' }) } }] }));
    assert.equal((await translateTask({ title: 'second-floor railing', instructions: 'Install 4 posts on the second floor.', safetyNotes: '' }, 'en', 'hi')).title, '2nd floor railing');
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
