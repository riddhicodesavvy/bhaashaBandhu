import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { transcribe } from '../server/ai';
// Use a synthetic test recording, never a real worker/patient recording.
const file = process.argv[2];
if (!file) throw new Error('Usage: npm run verify:audio -- <synthetic-test.wav>');
const text = await transcribe(await readFile(file), 'audio/wav', 'en');
assert.match(text, /ladder/i);
assert.match(text, /zone\s*b/i);
console.info('PASS live Groq speech transcription: synthetic WAV returned a reviewable transcript preserving ladder and Zone B.');
