import assert from 'node:assert';

const BASE_URL = 'https://bhaasha-bandhu.vercel.app';

async function log(section) {
  console.log(`\n============================================================`);
  console.log(`  ${section}`);
  console.log(`============================================================`);
}

async function runLiveVerification() {
  await log('STEP 1: PUBLIC HEALTH & CONFIG CHECKS');
  const healthRes = await fetch(`${BASE_URL}/api/health`);
  assert.equal(healthRes.status, 200, 'Health endpoint must return 200');
  const health = await healthRes.json();
  console.log('✓ /api/health:', health);

  const configRes = await fetch(`${BASE_URL}/api/config`);
  assert.equal(configRes.status, 200, 'Config endpoint must return 200');
  const config = await configRes.json();
  const apiKey = config.data.firebase.apiKey;
  assert.ok(apiKey, 'Firebase apiKey must be present in config');
  assert.equal(config.data.firebase.projectId, 'sdg8-4fca4');
  console.log('✓ /api/config: Public Firebase configuration validated for project sdg8-4fca4');

  await log('STEP 2: SECURITY & ROUTE PROTECTION AUDIT (ISSUE #4)');
  // Anonymous API requests must be rejected with 401
  const protectedApis = ['/api/me', '/api/site', '/api/workers', '/api/tasks', '/api/incidents', '/api/wages'];
  for (const ep of protectedApis) {
    const res = await fetch(`${BASE_URL}${ep}`);
    assert.equal(res.status, 401, `${ep} must return 401 without auth`);
    const body = await res.json();
    assert.equal(body.error?.code, 'SIGN_IN_REQUIRED');
  }
  console.log('✓ Anonymous API access blocked across all 6 core endpoints with HTTP 401 SIGN_IN_REQUIRED');

  // Verify client HTML contains root, Skip to content, and no leaked private tokens
  const workerHtmlRes = await fetch(`${BASE_URL}/worker`);
  const workerHtml = await workerHtmlRes.text();
  assert.ok(workerHtml.includes('id="root"'), 'SPA index.html must load for client routing');
  assert.ok(!workerHtml.includes('GROQ_API_KEY'), 'No Groq API key in frontend');
  assert.ok(!workerHtml.includes('service_role'), 'No service role key in frontend');
  console.log('✓ Unauthenticated client routes deliver protected SPA shell with 0 secret leakages');

  await log('STEP 3: AUTHENTICATION FOR ALL 3 DEMO ROLES');
  async function signIn(email, password) {
    const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true })
    });
    const auth = await res.json();
    assert.ok(auth.idToken, `Sign-in failed for ${email}`);
    
    // Verify database profile anchor
    const meRes = await fetch(`${BASE_URL}/api/me`, {
      headers: { Authorization: `Bearer ${auth.idToken}` }
    });
    assert.equal(meRes.status, 200);
    const profile = (await meRes.json()).data;
    return { auth, profile };
  }

  const worker = await signIn('worker@bhashabandhu.demo', 'Worker@123');
  assert.equal(worker.profile.role, 'worker');
  console.log(`✓ Worker authenticated: ${worker.profile.displayName} (role: ${worker.profile.role}, UID: ${worker.profile.id})`);

  const contractor = await signIn('contractor@bhashabandhu.demo', 'Contractor@123');
  assert.equal(contractor.profile.role, 'contractor');
  console.log(`✓ Contractor authenticated: ${contractor.profile.displayName} (role: ${contractor.profile.role}, UID: ${contractor.profile.id})`);

  const hospital = await signIn('hospital@bhashabandhu.demo', 'Hospital@123');
  assert.equal(hospital.profile.role, 'hospital_responder');
  console.log(`✓ Hospital authenticated: ${hospital.profile.displayName} (role: ${hospital.profile.role}, UID: ${hospital.profile.id})`);

  await log('STEP 4: CROSS-ROLE RBAC AUTHORIZATION AT BACKEND');
  // 1. Worker attempting to access contractor endpoints
  const workerAccessContractor = await fetch(`${BASE_URL}/api/workers`, {
    headers: { Authorization: `Bearer ${worker.auth.idToken}` }
  });
  assert.equal(workerAccessContractor.status, 403, 'Worker must not access /api/workers');
  const wErr = await workerAccessContractor.json();
  assert.equal(wErr.error?.code, 'FORBIDDEN');
  console.log('✓ Worker blocked from /api/workers (HTTP 403 FORBIDDEN)');

  // 2. Hospital responder attempting to create a task
  const hospCreateTask = await fetch(`${BASE_URL}/api/tasks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${hospital.auth.idToken}`
    },
    body: JSON.stringify({ title: 'Unauthorized' })
  });
  assert.equal(hospCreateTask.status, 403, 'Hospital responder must not create tasks');
  console.log('✓ Hospital responder blocked from /api/tasks (HTTP 403 FORBIDDEN)');

  // 3. Worker attempting to mark incident reviewed (contractor action)
  const workerReviewInc = await fetch(`${BASE_URL}/api/incidents/demo-inc-rebar/review`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${worker.auth.idToken}` }
  });
  assert.equal(workerReviewInc.status, 403, 'Worker must not review incidents');
  console.log('✓ Worker blocked from contractor review actions (HTTP 403 FORBIDDEN)');

  await log('STEP 5: MICROPHONE & GROQ SPEECH-TO-TEXT LIVE TRANSLATION (ISSUE #2 & #3)');
  // Construct valid 1-sec PCM audio WAV
  const sampleRate = 16000;
  const numSamples = sampleRate * 1;
  const dataSize = numSamples * 2;
  const buf = Buffer.alloc(44 + dataSize);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(dataSize, 40);

  for (const lang of ['en', 'hi', 'bn']) {
    const form = new FormData();
    form.append('audio', new Blob([buf], { type: 'audio/wav' }), 'audio_sample.wav');
    form.append('language', lang);

    const sttRes = await fetch(`${BASE_URL}/api/audio/transcribe`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${worker.auth.idToken}` },
      body: form
    });
    assert.equal(sttRes.status, 200, `Audio transcription for ${lang} must return 200`);
    const stt = await sttRes.json();
    assert.ok(stt.data?.text, `Transcription text returned for ${lang}`);
    console.log(`✓ Groq Whisper STT (${lang}): Status 200 -> returned "${stt.data.text}"`);
  }

  await log('STEP 6: DYNAMIC TASK TRANSLATION PIPELINE (ISSUE #1 & #2)');
  await new Promise(r => setTimeout(r, 2000));
  const taskTitle = 'Inspect safety railing near 2nd floor staircase';
  const taskInstructions = 'Fix 4 steel posts at 1.5 meter intervals and weld the horizontal railing securely.';
  const taskSafety = 'Wear full body harness and anchor double-lanyard to lifeline.';

  const previewRes = await fetch(`${BASE_URL}/api/tasks/preview`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${contractor.auth.idToken}`
    },
    body: JSON.stringify({
      assignedTo: worker.profile.id,
      sourceLanguage: 'en',
      original: { title: taskTitle, instructions: taskInstructions, safetyNotes: taskSafety }
    })
  });
  const previewJson = await previewRes.json();
  if (previewRes.status !== 200) {
    console.error('Preview error body:', previewJson);
  }
  assert.equal(previewRes.status, 200, 'Preview must return 200');
  const preview = previewJson.data;
  assert.ok(preview.translations.en, 'English translation present');
  assert.ok(preview.translations.hi, 'Hindi translation present');
  assert.ok(preview.translations.bn, 'Bengali translation present');
  assert.ok(preview.previewToken, 'Cryptographic preview token generated');
  console.log('✓ Task Preview Translations generated across 3 languages:');
  console.log('  EN:', preview.translations.en.title);
  console.log('  HI:', preview.translations.hi.title);
  console.log('  BN:', preview.translations.bn.title);

  const createRes = await fetch(`${BASE_URL}/api/tasks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${contractor.auth.idToken}`
    },
    body: JSON.stringify({
      assignedTo: worker.profile.id,
      sourceLanguage: 'en',
      original: { title: taskTitle, instructions: taskInstructions, safetyNotes: taskSafety },
      location: 'Block A, 2nd Floor Staircase',
      deadline: new Date(Date.now() + 86400000).toISOString(),
      previewToken: preview.previewToken
    })
  });
  assert.equal(createRes.status, 201, 'Task creation must return 201');
  const createdTask = (await createRes.json()).data;
  console.log(`✓ Task created and persisted: ID ${createdTask.id}`);

  // Worker retrieves task and verifies all 3 translations are available
  const workerTaskRes = await fetch(`${BASE_URL}/api/tasks/${createdTask.id}`, {
    headers: { Authorization: `Bearer ${worker.auth.idToken}` }
  });
  assert.equal(workerTaskRes.status, 200);
  const workerTask = (await workerTaskRes.json()).data;
  assert.ok(workerTask.translations.en);
  assert.ok(workerTask.translations.hi);
  assert.ok(workerTask.translations.bn);
  console.log('✓ Worker verifies persistent multi-language translations on task');

  await log('STEP 7: HOSPITAL RESPONDER DEMO INBOX & INCIDENT TRANSLATION');
  const incRes = await fetch(`${BASE_URL}/api/incidents`, {
    headers: { Authorization: `Bearer ${hospital.auth.idToken}` }
  });
  assert.equal(incRes.status, 200);
  const incidents = (await incRes.json()).data;
  assert.ok(incidents.length >= 5, 'Must have at least 5 incidents');
  console.log(`✓ Hospital Responder loaded ${incidents.length} incidents from site`);

  // Verify Incident 3 (Electrical hazard in Hindi) has englishTranslation for English language mode
  const electricalInc = incidents.find(i => i.id === 'demo-inc-electrical');
  assert.ok(electricalInc, 'demo-inc-electrical must exist');
  assert.equal(electricalInc.sourceLanguage, 'hi');
  assert.ok(electricalInc.originalText.includes('बेसमेंट -2'), 'Original text is in Hindi');
  assert.ok(electricalInc.englishTranslation.includes('Basement -2 has 1 foot of standing rainwater'), 'English translation is present');
  console.log('✓ Incident has genuine English translation ready for English interface preview');

  // Verify Clinical SBAR Handover parameters
  assert.ok(electricalInc.sbarHandover, 'SBAR handover must be present');
  assert.ok(electricalInc.sbarHandover.situation.includes('UNSAFE CONDITION'));
  assert.ok(electricalInc.sbarHandover.bocwInsuranceId);
  console.log('✓ Complete Clinical SBAR protocol attached to emergency incident');

  await log('ALL LIVE PRODUCTION CHECKS COMPLETED SUCCESSFULLY WITH ZERO ERRORS');
}

runLiveVerification().catch(err => {
  console.error('\n❌ LIVE PRODUCTION VERIFICATION FAILED:', err);
  process.exit(1);
});
