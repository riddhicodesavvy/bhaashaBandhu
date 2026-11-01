import 'dotenv/config';
import fs from 'node:fs';
import assert from 'node:assert/strict';

const BASE_URL = process.env.TEST_ORIGIN || 'https://bhaasha-bandhu.vercel.app';
const API_KEY = process.env.GROQ_API_KEY;

console.log('============================================================');
console.log('  LOW-LATENCY WHISPER TURBO STT & INCIDENT PIPELINE AUDIT');
console.log(`  Target: ${BASE_URL}`);
console.log('============================================================\n');

// 1. Direct Whisper Large V3 Turbo Model Verification
assert.ok(API_KEY, 'Server GROQ_API_KEY must be configured');

console.log('--- 1. GROQ WHISPER LARGE V3 TURBO LATENCY & TRANSCRIPTION ---');

const latencies = { en: 0, hi: 0, bn: 0 };
const testAudios = {
  en: 'test-results/en-test.wav',
  hi: 'test-results/hi-test.mp3',
  bn: 'test-results/bn-test.mp3'
};

const prompts = {
  en: 'Construction site safety: scaffolding, railing, electrical panel, hazard, worker incident.',
  hi: 'निर्माण स्थल सुरक्षा: सीढ़ियों, मचान, रेलिंग, मजदूर, चोट, खतरा, दुर्घटना।',
  bn: 'নির্মাণ সাইট নিরাপত্তা: সিঁড়ি, মাচা, রেলিং, শ্রমিক, পড়ে গেছে, আঘাত, বিপদ।'
};

for (const lang of ['en', 'hi', 'bn']) {
  const fileBytes = fs.readFileSync(testAudios[lang]);
  const form = new FormData();
  form.append('file', new Blob([fileBytes]), `sample.${lang === 'en' ? 'wav' : 'mp3'}`);
  form.append('model', 'whisper-large-v3-turbo');
  form.append('language', lang);
  form.append('prompt', prompts[lang]);
  form.append('response_format', 'json');

  const start = performance.now();
  const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${API_KEY}` },
    body: form
  });
  const duration = performance.now() - start;
  latencies[lang] = duration;

  assert.equal(res.status, 200, `Whisper Turbo for ${lang} must return 200`);
  const data = await res.json();
  assert.ok(data.text && data.text.length > 0, `Transcription returned for ${lang}`);
  console.log(`[✓ PASS] ${lang.toUpperCase()} STT | Latency: ${duration.toFixed(0)} ms | Transcript: "${data.text.trim()}"`);
}

const avgLatency = (latencies.en + latencies.hi + latencies.bn) / 3;
console.log(`\nAverage STT Latency: ${avgLatency.toFixed(0)} ms`);

// 2. Second-Stage Groq LLM Text Analysis Test
console.log('\n--- 2. GROQ LLM TEXT ANALYSIS STAGE ---');
const analysisStart = performance.now();
const systemPrompt = `You are a construction site safety intake assistant. Analyze the worker incident text.
Allowed categories: "injury", "hazard", "unsafe_condition", "near_miss", "other".
Allowed urgencies: "low", "medium", "high", "urgent".
CRITICAL: DO NOT invent injuries, casualties, locations, or medical facts not present in the text.
Preserve exact numbers, measurements, and floors.
If location is not mentioned, return empty string for location.
Return ONLY valid JSON with keys: category, urgency, location, summary.`;

const analysisRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: process.env.GROQ_TEXT_MODEL || 'openai/gpt-oss-120b',
    temperature: 0.1,
    max_completion_tokens: 1024,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: `${systemPrompt}\nCRITICAL: Return ONLY a valid JSON object.` },
      { role: 'user', content: `<input_text>\n${JSON.stringify({ text: 'दूसरी मंजिल पर सीढ़ियों के पास एक मजदूर गिर गया है।' })}\n</input_text>` }
    ]
  })
});
const analysisDuration = performance.now() - analysisStart;
assert.equal(analysisRes.status, 200, 'Groq LLM text analysis must return 200');
const analysisData = await analysisRes.json();
const parsedAnalysis = JSON.parse(analysisData.choices[0].message.content);
assert.ok(parsedAnalysis.category, 'Analysis must include category');
assert.ok(parsedAnalysis.urgency, 'Analysis must include urgency');
console.log(`[✓ PASS] LLM Text Analysis | Latency: ${analysisDuration.toFixed(0)} ms | Classified: ${parsedAnalysis.category} (${parsedAnalysis.urgency}) | Location: "${parsedAnalysis.location}"`);

// 3. Security: Check that /api/transcribe rejects unauthenticated requests
console.log('\n--- 3. ENDPOINT SECURITY ---');
const unauthRes = await fetch(`${BASE_URL}/api/transcribe`, { method: 'POST' });
assert.equal(unauthRes.status, 401, 'Unauthenticated /api/transcribe must return 401 SIGN_IN_REQUIRED');
console.log('[✓ PASS] Protected /api/transcribe correctly rejects unauthenticated requests with HTTP 401');

console.log('\n============================================================');
console.log('  ALL STT & LATENCY AUDIT CHECKS PASSED');
console.log('============================================================');
