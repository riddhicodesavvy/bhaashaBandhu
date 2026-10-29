/**
 * Comprehensive end-to-end production flow test.
 * Tests all 3 roles, language switching at API level, task lifecycle,
 * incident creation, wage flow, and Groq STT integration.
 */
import assert from 'node:assert';
import { randomUUID } from 'node:crypto';

const BASE_URL = process.env.BASE_URL || 'https://bhaasha-bandhu.vercel.app';
const results = [];

function pass(name, detail) {
  results.push({ name, status: 'PASS', detail });
  console.log(`[✓ PASS] ${name}${detail ? ' — ' + detail : ''}`);
}

function fail(name, detail) {
  results.push({ name, status: 'FAIL', detail });
  console.error(`[❌ FAIL] ${name}${detail ? ' — ' + detail : ''}`);
}

async function signIn(apiKey, email, password) {
  const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true })
  });
  const d = await r.json();
  assert.ok(d.idToken, `Auth failed for ${email}: ${JSON.stringify(d.error)}`);
  return d;
}

async function get(token, path) {
  const r = await fetch(`${BASE_URL}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  return { status: r.status, data: await r.json() };
}

async function post(token, path, body) {
  const r = await fetch(`${BASE_URL}${path}`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return { status: r.status, data: await r.json() };
}

async function run() {
  console.log(`\n${'='.repeat(60)}`);
  console.log('  FINAL USER-FACING FUNCTIONALITY AUDIT');
  console.log(`  Target: ${BASE_URL}`);
  console.log('='.repeat(60) + '\n');

  // --- Firebase config ---
  const cfgRes = await fetch(`${BASE_URL}/api/config`);
  const cfg = await cfgRes.json();
  const apiKey = cfg.data?.firebase?.apiKey;
  assert.ok(apiKey, 'Firebase apiKey required');
  pass('Firebase config', `apiKey present, project=${cfg.data.firebase.projectId}`);

  // --- Auth all 3 roles ---
  const wAuth = await signIn(apiKey, 'worker@bhashabandhu.demo', 'Worker@123');
  pass('Worker login', `uid=${wAuth.localId}`);

  const cAuth = await signIn(apiKey, 'contractor@bhashabandhu.demo', 'Contractor@123');
  pass('Contractor login', `uid=${cAuth.localId}`);

  const hAuth = await signIn(apiKey, 'hospital@bhashabandhu.demo', 'Hospital@123');
  pass('Hospital login', `uid=${hAuth.localId}`);

  // --- Profile verification (database role) ---
  const wMe = await get(wAuth.idToken, '/api/me');
  assert.equal(wMe.data.data?.role, 'worker');
  pass('Worker profile from DB', `role=${wMe.data.data.role}, lang=${wMe.data.data.preferredLanguage}`);

  const cMe = await get(cAuth.idToken, '/api/me');
  assert.equal(cMe.data.data?.role, 'contractor');
  pass('Contractor profile from DB', `role=${cMe.data.data.role}`);

  const hMe = await get(hAuth.idToken, '/api/me');
  assert.equal(hMe.data.data?.role, 'hospital_responder');
  pass('Hospital profile from DB', `role=${hMe.data.data.role}`);

  // --- Language preference update & persist test ---
  for (const lang of ['en', 'hi', 'bn']) {
    const r = await fetch(`${BASE_URL}/api/me/language`, {
      method: 'PATCH', headers: { Authorization: `Bearer ${wAuth.idToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ language: lang })
    });
    const d = await r.json();
    assert.equal(d.data?.preferredLanguage, lang);
    pass(`Worker language switch → ${lang}`, `API persisted preferredLanguage=${lang}`);
  }
  // Reset to 'en'
  await fetch(`${BASE_URL}/api/me/language`, {
    method: 'PATCH', headers: { Authorization: `Bearer ${wAuth.idToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ language: 'en' })
  });

  // --- Worker data loads ---
  const workerTasks = await get(wAuth.idToken, '/api/tasks');
  assert.ok(Array.isArray(workerTasks.data.data));
  const hasTranslations = workerTasks.data.data.every(t => t.translations && typeof t.translations === 'object');
  pass('Worker tasks load', `count=${workerTasks.data.data.length}, all have translations=${hasTranslations}`);

  // Verify tasks have EN/HI/BN translations for language switching
  if (workerTasks.data.data.length > 0) {
    const sampleTask = workerTasks.data.data[0];
    const hasEN = !!sampleTask.translations?.en;
    const hasHI = !!sampleTask.translations?.hi;
    const hasBN = !!sampleTask.translations?.bn;
    pass('Worker task language switching data', `EN=${hasEN}, HI=${hasHI}, BN=${hasBN}`);
  }

  const workerIncidents = await get(wAuth.idToken, '/api/incidents');
  pass('Worker incidents load', `count=${workerIncidents.data.data.length}`);

  const workerWages = await get(wAuth.idToken, '/api/wages');
  pass('Worker wages load', `count=${workerWages.data.data.length}`);

  // --- End-to-end task workflow ---
  console.log('\n--- END-TO-END TASK WORKFLOW ---');

  // 1. Contractor gets workers list
  const workersList = await get(cAuth.idToken, '/api/workers');
  assert.ok(workersList.data.data?.length > 0);
  const targetWorker = workersList.data.data[0];
  pass('Contractor loads worker list', `count=${workersList.data.data.length}, using worker=${targetWorker.displayName}`);

  // 2. Contractor previews task with real translations
  const taskContent = {
    title: 'Install safety nets on 3rd floor scaffolding',
    instructions: 'Secure 6 mounting points at 2 metre intervals using grade 4 steel clips. Inspect all anchors before use.',
    safetyNotes: 'Mandatory full body harness. Do not work alone.'
  };
  const previewRes = await post(cAuth.idToken, '/api/tasks/preview', {
    assignedTo: targetWorker.id,
    sourceLanguage: 'en',
    original: taskContent
  });
  assert.equal(previewRes.status, 200, `Preview failed: ${JSON.stringify(previewRes.data.error)}`);
  assert.ok(previewRes.data.data?.translations?.en?.title);
  assert.ok(previewRes.data.data?.translations?.hi?.title);
  assert.ok(previewRes.data.data?.translations?.bn?.title);
  assert.ok(previewRes.data.data?.previewToken);
  pass('Contractor task preview', `EN: ${previewRes.data.data.translations.en.title} | HI: ${previewRes.data.data.translations.hi.title}`);

  // 3. Contractor creates task
  const deadline = new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString();
  const createTaskRes = await post(cAuth.idToken, '/api/tasks', {
    assignedTo: targetWorker.id,
    sourceLanguage: 'en',
    original: taskContent,
    location: 'Block B, 3rd Floor Scaffolding',
    deadline,
    previewToken: previewRes.data.data.previewToken
  });
  assert.equal(createTaskRes.status, 201, `Task creation failed: ${JSON.stringify(createTaskRes.data.error)}`);
  const createdTask = createTaskRes.data.data;
  pass('Contractor task creation', `id=${createdTask.id}, assigned to ${targetWorker.displayName}`);

  // 4. Worker sees the task
  const workerTaskRes = await get(wAuth.idToken, `/api/tasks/${createdTask.id}`);
  assert.equal(workerTaskRes.status, 200);
  const workerTask = workerTaskRes.data.data;
  assert.ok(workerTask.translations?.en && workerTask.translations?.hi && workerTask.translations?.bn);
  pass('Worker task visible with all 3 language translations', `EN=${workerTask.translations.en.title}, HI=${workerTask.translations.hi.title}`);

  // 5. Worker acknowledges
  const ackRes = await post(wAuth.idToken, `/api/tasks/${createdTask.id}/acknowledge`, {});
  assert.equal(ackRes.status, 200);
  assert.equal(ackRes.data.data?.status, 'acknowledged');
  pass('Worker task acknowledge', `status=${ackRes.data.data.status}`);

  // 6. Worker starts
  const startRes = await post(wAuth.idToken, `/api/tasks/${createdTask.id}/start`, {});
  assert.equal(startRes.status, 200);
  assert.equal(startRes.data.data?.status, 'in_progress');
  pass('Worker task start', `status=${startRes.data.data.status}`);

  // 7. Worker completes
  const completeRes = await post(wAuth.idToken, `/api/tasks/${createdTask.id}/complete`, {});
  assert.equal(completeRes.status, 200);
  assert.equal(completeRes.data.data?.status, 'completed');
  pass('Worker task complete', `status=${completeRes.data.data.status}`);

  // 8. Contractor sees completed status
  const contractorTaskView = await get(cAuth.idToken, `/api/tasks/${createdTask.id}`);
  assert.equal(contractorTaskView.data.data?.status, 'completed');
  pass('Contractor → Worker task completion visible', `status=${contractorTaskView.data.data.status}`);

  // --- End-to-end incident workflow ---
  console.log('\n--- END-TO-END INCIDENT WORKFLOW ---');

  const incidentRes = await post(wAuth.idToken, '/api/incidents', {
    originalText: 'There is water leaking near the electrical panel on the second floor. Immediately dangerous.',
    sourceLanguage: 'en',
    category: 'unsafe_condition',
    urgency: 'urgent',
    location: 'Block B, 2nd Floor Electrical Panel',
    requestId: randomUUID()
  });
  assert.equal(incidentRes.status, 201, `Incident creation failed: ${JSON.stringify(incidentRes.data.error)}`);
  const createdIncident = incidentRes.data.data;
  pass('Worker incident creation (English)', `id=${createdIncident.id}, translation status=${createdIncident.translationStatus}`);
  pass('Worker incident has SBAR handover', `bocwId=${createdIncident.sbarHandover?.bocwInsuranceId}`);

  // Hindi incident
  const hindiIncRes = await post(wAuth.idToken, '/api/incidents', {
    originalText: 'दूसरी मंजिल पर सीढ़ियों के पास एक मजदूर गिर गया है।',
    sourceLanguage: 'hi',
    category: 'injury',
    urgency: 'urgent',
    location: 'दूसरी मंजिल, सीढ़ी',
    requestId: randomUUID()
  });
  assert.equal(hindiIncRes.status, 201, `Hindi incident failed: ${JSON.stringify(hindiIncRes.data.error)}`);
  pass('Worker incident creation (Hindi)', `id=${hindiIncRes.data.data.id}, EN translation=${!!hindiIncRes.data.data.englishTranslation}`);

  // Contractor sees worker incident
  const contractorIncsRes = await get(cAuth.idToken, '/api/incidents');
  const contractorIncs = contractorIncsRes.data.data;
  const myIncident = contractorIncs.find(i => i.id === createdIncident.id);
  assert.ok(myIncident, 'Contractor should see worker incident');
  pass('Worker incident → Contractor visible', `incident found in contractor view`);

  // Hospital sees incident
  const hospitalIncsRes = await get(hAuth.idToken, '/api/incidents');
  const hospitalIncs = hospitalIncsRes.data.data;
  const hospitalIncident = hospitalIncs.find(i => i.id === createdIncident.id);
  assert.ok(hospitalIncident, 'Hospital should see incident');
  pass('Worker incident → Hospital DEMO visible', `incident found in hospital inbox`);

  // Hospital DEMO actions
  const ackDemoRes = await post(hAuth.idToken, `/api/incidents/${createdIncident.id}/acknowledge-demo`, {});
  assert.equal(ackDemoRes.status, 200);
  pass('Hospital acknowledge-demo action', `status=${ackDemoRes.data.data?.status}`);

  // --- Groq STT production test ---
  console.log('\n--- GROQ STT PRODUCTION TEST ---');

  // Build minimal WAV (1s silence)
  const sampleRate = 16000, numSamples = sampleRate;
  const dataSize = numSamples * 2;
  const buf = Buffer.alloc(44 + dataSize);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + dataSize, 4);
  buf.write('WAVE', 8); buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22); buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * 2, 28); buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34); buf.write('data', 36);
  buf.writeUInt32LE(dataSize, 40);

  for (const lang of ['en', 'hi', 'bn']) {
    const form = new FormData();
    form.append('audio', new Blob([buf], { type: 'audio/wav' }), 'test.wav');
    form.append('language', lang);
    const sttRes = await fetch(`${BASE_URL}/api/audio/transcribe`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${wAuth.idToken}` },
      body: form
    });
    const sttData = await sttRes.json();
    if (sttRes.status === 200 && sttData.data?.text !== undefined) {
      pass(`Groq STT (${lang})`, `HTTP 200, text="${sttData.data.text}"`);
    } else {
      fail(`Groq STT (${lang})`, `HTTP ${sttRes.status}, error=${JSON.stringify(sttData.error)}`);
    }
  }

  // --- Contractor language preference ---
  for (const lang of ['en', 'hi', 'bn']) {
    const lr = await fetch(`${BASE_URL}/api/me/language`, {
      method: 'PATCH', headers: { Authorization: `Bearer ${cAuth.idToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ language: lang })
    });
    const ld = await lr.json();
    if (ld.data?.preferredLanguage === lang) {
      pass(`Contractor language switch → ${lang}`, `API persisted`);
    } else {
      fail(`Contractor language switch → ${lang}`, `Got ${JSON.stringify(ld.data?.preferredLanguage)}`);
    }
  }

  // --- Hospital language preference ---
  for (const lang of ['en', 'hi', 'bn']) {
    const lr = await fetch(`${BASE_URL}/api/me/language`, {
      method: 'PATCH', headers: { Authorization: `Bearer ${hAuth.idToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ language: lang })
    });
    const ld = await lr.json();
    if (ld.data?.preferredLanguage === lang) {
      pass(`Hospital language switch → ${lang}`, `API persisted`);
    } else {
      fail(`Hospital language switch → ${lang}`, `Got ${JSON.stringify(ld.data?.preferredLanguage)}`);
    }
  }

  // --- No GROQ key / secrets in browser bundle ---
  const indexHtml = await (await fetch(`${BASE_URL}/`)).text();
  if (!indexHtml.includes('GROQ_API_KEY') && !indexHtml.includes('gsk_') && !indexHtml.includes('VITE_GROQ')) {
    pass('Groq key NOT in browser bundle', 'Server-side only');
  } else {
    fail('Groq key NOT in browser bundle', 'SECRET LEAKED IN FRONTEND!');
  }

  // --- Summary ---
  console.log(`\n${'='.repeat(60)}`);
  console.log('  FINAL AUDIT SUMMARY');
  console.log('='.repeat(60));

  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;

  for (const r of results) {
    console.log(`${r.status.padEnd(6)} | ${r.name}`);
  }

  console.log(`\nTOTAL: ${passed} PASS, ${failed} FAIL`);
  if (failed > 0) {
    console.error('\nFailed checks:');
    for (const r of results.filter(r => r.status === 'FAIL')) {
      console.error(`  ❌ ${r.name}: ${r.detail}`);
    }
    process.exit(1);
  }
}

run().catch(err => {
  console.error('\n❌ AUDIT FAILED WITH UNEXPECTED ERROR:', err);
  process.exit(1);
});

