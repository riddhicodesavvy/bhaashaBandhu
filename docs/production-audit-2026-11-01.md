# BhaashaBandhu production audit — 1 November 2026

Target: https://bhaasha-bandhu.vercel.app. Audit executed approximately 18:13–18:37 IST. Production fixes were deployed after explicit user release approval. Latest deployment: `dpl_ECbP2crzRV9x5dZUFZpDiFAGMGDi` ([deployment](https://bhaasha-bandhu-o7ltr1mxs-ridcyber.vercel.app)). No UI redesign or authentication relaxation.

**Verdict: shared persisted application demonstrated, but full production acceptance is NOT achieved. Bengali speech accuracy failed; simultaneous independent browser/device sessions and physical microphone capture were not executed.** PASS below is limited to the explicitly described observations. UNVERIFIED means no production proof, not success or a demonstrated application failure.

## Whisper STT

Successful production runtime logs identify `whisper-large-v3-turbo`, upstream HTTP 200 and Groq provider request IDs. Before the correction, runtime logs proved production actually selected `whisper-large-v3` through its environment override. The model name in source alone was insufficient.

Audio bytes were uploaded to authenticated `/api/audio/transcribe` on production. These are file-upload tests, not a physical microphone test. Existing EN/HI/BN fixtures were used; additional English phrases were synthesized into real WAV audio using Windows speech synthesis. No expected transcript was substituted for a provider response. Fixture hashes are recorded in the JSON evidence.

| Language | Actual returned transcript | Endpoint latency | Result |
|---|---|---:|---|
| English | There is water leaking near the electrical panel on the second floor. | 2,036 ms | PASS |
| Hindi | दूसरी मंजिल पर सीढ़ियों के पास एक मजदूर गिर गया है। | 1,151 ms | PASS |
| Bengali | দিতিয় তলায় সিরির কাছে আকজন শ্রোমিক পরে গাছে। | 1,409 ms | FAIL accuracy |

Average for those three single requests: **1,532 ms**. These are end-to-end HTTP durations including authentication/network, not isolated model inference times or a statistical benchmark.

Additional real audio outputs:

- Steel rods, 2,185 ms: `Three steel rods are blocking the emergency exit.`
- Random phrase, 2,564 ms: `Purple Banana Telescope, Seven Dancing Umbrellas, Zigzag Marmalade.`
- Different incident, 2,512 ms: `This is a synthetic test report. There is a broken ladder at demo site zone B nobody is injured.`
- Final recording, 2,196 ms: `Audit test, loose cable beside generator room.`

Fake/cached STT detected: **NO in the executed phrase-change tests**. A separate silence hallucination was detected and fixed; this is not evidence of hardcoded STT.

Failure tests after deployment: empty upload → HTTP 400 `NO_AUDIO`; invalid WAV bytes → HTTP 502 `STT_FAILED`; one-second silent PCM WAV → HTTP 422 `EMPTY_TRANSCRIPT`. Errors offer retry/type guidance. Initially the silent WAV returned `Thank you for watching.` with HTTP 200. Compressed inaudible audio and very short audible speech were not separately tested.

## Groq

| Check | Result and observation |
|---|---|
| Groq API actually called | PASS — production logs show `chat/completions`, `openai/gpt-oss-120b`, HTTP 200 and provider request IDs |
| Structured output | PASS — actual JSON category, urgency, location and summary returned |
| Quantity preservation sample | PASS — four damaged posts stayed four; output spelled the quantity `Four` |
| Water/electrical-board sample | PASS — summary `Water near the electrical board.`, category hazard, high urgency; no invented casualty, ambulance, fire or hospital dispatch |
| Translation | PASS for observed final incident EN/HI/BN translations and task previews; fluent-language quality is not comprehensively certified |
| Classification | PASS for the explicit English hazard samples; no claim of universal accuracy |
| Bengali speech → analysis facts | FAIL — corrupted recognition was analyzed as `A worker fell from a tree on the second floor.` The recording's expected scenario was a fall near stairs. |

The Bengali failure cannot be attributed conclusively to a model defect versus fixture pronunciation/quality from these tests. The recognition error is observed; subsequent semantic interpretation amplified it. No fabricated correction was inserted. A clean native-speaker recording and a review of the editable transcript are required to resolve this acceptance failure.

## Final audio → Groq → persisted incident

Actual raw Whisper output: `Audit test, loose cable beside generator room.`

Actual final Groq result:

```json
{"category":"hazard","urgency":"medium","location":"generator room","summary":"Loose cable observed beside generator room."}
```

Incident ID: `ZSZ7F6JZbzP4pOVZCPCqFozqCWQ2_e5000ea5-c87b-4199-851c-00af5719bafc`.

Created: `2026-11-01T12:56:08.101Z` (18:26:08.101 IST). Site: `demo-site-01`. Worker: `ZSZ7F6JZbzP4pOVZCPCqFozqCWQ2`. Worker/Contractor/Hospital independently authenticated API list results all included this same ID, original description, creation timestamp, site and reporter. Repeated submission with the same request ID returned the same record; each role's list contained exactly one copy of that ID.

`rawTranscript` and the worker-confirmed `originalText` are now stored separately when audio is used. This final test did not edit the transcript. In the UI the transcript is editable before analysis; that editing interaction and microphone recording were not executed in the final demonstration.

Direct HTTPS access to the authenticated **Supabase Edge database gateway**, bypassing Vercel and the frontend, retrieved `incident:<same ID>` with matching payload and version 1. This is independent backend persistence evidence, but **not a raw SQL query or Supabase dashboard inspection**. No privileged SQL/service-role credential was available locally.

Contractor review persisted `reviewed`. New Firebase sign-ins for all three roles retrieved that same updated record. The incident remained readable by all three roles after another production deployment.

## Supabase and synchronization

| Check | Result |
|---|---|
| Incident persistence | PASS — Supabase gateway record plus separate production retrievals |
| Task persistence | PASS — direct gateway versions 2, 3, 4 after each task action |
| Direct DB verification | PASS via authenticated Supabase gateway; raw SQL/dashboard UNVERIFIED |
| Worker → Contractor | PASS — separate role API token and browser queue |
| Worker → Hospital | PASS — independent authenticated API and Hospital browser inbox/detail show the same incident ID |
| Contractor status → Worker | PASS — reviewed status retrieved using fresh worker sign-in and visible in worker reports |
| Task Worker ↔ Contractor | PASS — all three state changes observed independently by contractor and Supabase gateway |
| Language changes preserve IDs | PASS for incidents — EN/HI/BN preference updates left incident ID sets identical |
| Incident duplicate retry | PASS — same request ID produced one record, not two |
| Concurrent double-click/network-loss retry | UNVERIFIED in production; sequential retry only |

Task ID: `fbfddc71-56aa-417e-84a1-2289b3e9a98a`. Title: `Install safety railing near the second-floor staircase.` Three independent previews passed after numeric-equivalence correction. One task was created. Worker actions and independent Contractor/Supabase reads confirmed:

| Action | Persisted status | Supabase version |
|---|---|---:|
| Acknowledge | acknowledged | 2 |
| Start | in_progress | 3 |
| Complete | completed | 4 |

A fresh worker login retrieved the completed task. Language identity for tasks was not separately exercised after creation.

## Live synchronization and browser persistence

Mechanism deployed: **10-second polling** of authenticated APIs while the document is visible, plus focus refresh. Polls do not overlap for the same hook. This is not Supabase Realtime; no Realtime INSERT/UPDATE claim is made.

An already-open Worker Reports page had one earlier matching audio-derived incident at 12:55:39 UTC. A new incident was created at 12:56:08.101 UTC; the untouched page displayed both by 12:56:37.412 UTC. Observed propagation bound: **≤29.311 seconds**. The observation interval prevents reporting an exact latency or a guaranteed 10-second SLA. Reviewed status also appeared.

Worker browser refresh retained the initial audit incident. Actual worker sign-out/sign-in retained the reports. Contractor browser refresh retained the final incident, as did five full navigations away/back and actual sign-out/sign-in. Screenshots are in `test-results/worker-production.png` and `test-results/contractor-production.png`.

Hospital browser inbox/detail showed the exact final incident ID, timestamp, site and description. Hospital's actual **Acknowledge (Demo)** action persisted `acknowledged_demo`; independent fresh API sign-ins for all three roles read this status, and direct Supabase gateway read confirmed version 3. Hospital refresh retained both incident and acknowledgement. See `test-results/hospital-production.png` and `test-results/production-final-check.json`. The latest deployment's served JS assets were rescanned with no secret matches.

Actual Hospital sign-out/sign-in also retained the same incident and acknowledgement in Demo Inbox (`test-results/hospital-after-login.png`). Browser refresh and logout/login were therefore observed sequentially for all three roles, not simultaneously in isolated browser profiles. Worker browser logout/login used an earlier audit record; the final incident was verified through fresh Worker API sign-in and live polling, not a second final-incident Worker browser logout cycle.

Independent physical devices, Chrome/incognito profiles and three simultaneous browser roles: **UNVERIFIED**. Only one automation-accessible browser profile was available. Three independent API authentications do not prove three isolated browsers. Server/new-deployment persistence: **PASS** for the final incident, retrieved by all three roles after the subsequent deployment.

Production database outage simulation and failed-load-versus-empty UI behavior: **UNVERIFIED**; no production outage was induced. Five-to-ten-navigation persistence was executed for Contractor only. No overall PASS is claimed for the full final microphone/three-browser demonstration.

## Security regression

- Anonymous production incident/task/transcription APIs: PASS, HTTP 401 `SIGN_IN_REQUIRED`.
- Worker requesting contractor worker-list API: PASS, HTTP 403.
- Worker reviewing an incident: PASS, HTTP 403.
- Hospital creating a task: PASS, HTTP 403.
- Anonymous browser `/worker`, `/contractor` and `/hospital`: PASS — login page observed on each direct route.
- Groq key protected in served frontend: PASS within scan scope — six production JS assets scanned for the actual local Groq credential, Groq token patterns and exposed key variable names; no matches.
- Supabase privileged key protected in served frontend: no service-role variable or `sb_secret_` matches in those assets. Full privileged-key rotation/access review: UNVERIFIED; no privileged credential was printed or moved to the client.
- Cross-site/cross-worker isolation with additional real production accounts: UNVERIFIED. Existing local policy tests are not substituted for production evidence.

## Failures, causes, fixes and retests

| Failure | Cause | Fix made | Retest |
|---|---|---|---|
| Wrong speech model | Production `GROQ_STT_MODEL` overrode the Turbo source default | Pin required Turbo model | PASS: successful provider-call logs show Turbo and provider request IDs |
| Silence produced speech | Speech-model hallucination on silent input; no local PCM silence rejection | Empty/near-silent PCM rejection and provider no-speech metadata handling | PASS for empty/silent PCM and invalid bytes on production; other codecs not comprehensively tested |
| Invented clinical/identity claims | Server handover template supplied consciousness, bleeding, first aid, trade, injury type, insurance ID and contact without evidence | Omit unknown fields, retain only submitted/report metadata | PASS: newly persisted final record has no manufactured clinical fields. Historical records were not silently rewritten and can still contain old template claims. |
| Open views did not automatically fetch changes | Shared loading hook fetched only on mount/manual refresh | Lightweight visibility/focus polling | PASS on observed worker page; simultaneous contractor/hospital live propagation unverified |
| Invalid AI shape could become a default hazard | Defaults and fallback hid invalid analysis | Require complete structured result and return explicit validation error | PASS local regression; not induced against real Groq production output |
| Raw speech lost after correction | Only final `originalText` persisted | Optional persisted `rawTranscript` | PASS final record; edited-transcript UI scenario unverified |
| Source edits could miss served API | Vercel used generated `api/index.js`; normal build did not regenerate it | Build API from current TypeScript during every build | PASS: deployment behavior/logs demonstrated new silence handling and Turbo selection |
| Valid floor equivalents rejected | Reproduced source `second-floor` vs translation `2nd floor` counted differently; a production preview returned `TRANSLATION_NUMBERS_CHANGED` (provider output unavailable for that failed call) | Normalize equivalent floor ordinals and request consistent numeric floors; retain quantity guard | PASS: three real previews and new persisted task lifecycle after deployment |
| Bengali transcription and downstream facts inaccurate | Recognition errors in supplied fixture; model interpretation added incorrect tree detail; precise source cause unresolved | No fake correction; raw transcript retained for review | FAIL remains — requires clearer native-speaker audio and further evaluation |

No emergency dispatch was triggered; all accounts and incident records are demo/simulation scoped. Audit records were retained for review because no deletion endpoint exists in the application; no broad database cleanup or historical rewrite was performed. The three similarly worded incidents in screenshots are separate intentionally executed audit runs, not duplicates of the same request ID.

## Evidence and local validation

- `test-results/production-audit.json`: original production behavior.
- `test-results/production-audit-retest.json`: first fix deployment, including runtime-model mismatch investigation.
- `test-results/production-audit-final.json`: Turbo audio outputs, errors, final pipeline, role persistence, language identity, served bundle scan.
- `test-results/production-task-retest.json`: final task previews, lifecycle, direct gateway reads and deployment-survival/RBAC checks.
- `test-results/production-runtime-logs.jsonl`: actual pre-correction model calls.
- `test-results/production-runtime-final.jsonl`: successful Turbo/text calls with upstream request IDs.

Local build/type check passed. **Full final test suite: 25 tests passed, 0 failed**, with localhost socket access enabled. An obsolete test requiring a fabricated emergency contact was updated to require that it remain unknown. Earlier sandbox runs encountered localhost `EACCES`; those are not counted as product failures or successful validation. Existing user changes in `scripts/verify-stt-pipeline.mjs` and `scripts/inspect-vercel-projects.mjs` were preserved. No Git commit or push was made.
