# Final BhashaBandhu verification

Date: 2026-10-27. Architecture: Firebase Authentication, React/TypeScript + Express, real Supabase PostgreSQL, Firebase-authenticated Supabase data gateway, server-side Groq. Firebase Hosting configuration is included. No fake persistence or password bypass exists.

## Fixed

- Applied the PostgreSQL migration and seeded the actual three Firebase UIDs, one fictional construction site and a wage record through authenticated Supabase MCP.
- Deployed `bb-data`, which verifies Firebase RS256 tokens itself and independently enforces role/site/owner and permitted record mutations. Its managed Supabase service credential never leaves the Edge runtime. Runtime database password/service-key collection is unnecessary.
- Connected Express to that gateway using request-local Firebase token context. A fresh login now resolves a persisted profile and reaches the correct dashboard.
- Fixed a browser-discovered language-save/logout race: delayed preference responses cannot restore signed-out profile state. Retested rapid Bengali switch followed immediately by logout; login remains stable.
- Added executable live workflow, audio and security checks. Added staging secret/size scan before GitHub publication.

## Actual live checks — PASS

| Scenario | Evidence |
| --- | --- |
| Three Firebase logins | Worker, contractor and hospital authenticate with Firebase and their signed UID tokens resolve real Supabase profiles |
| Invalid password/token | Real Firebase wrong password denied; API and gateway reject absent/forged tokens |
| Role/site isolation | Worker task assignment and hospital task access denied; gateway cross-site query and direct profile role escalation denied |
| Public database access | Project publishable key cannot read user_profiles directly (grants/RLS deny access) |
| Task creation and translation | Contractor preview calls Groq for Hindi/Bengali, creates a persistent task, worker reads source and translations |
| Task transitions | Premature completion denied; acknowledge timestamp survives duplicate request; start/complete reflected in contractor queries |
| Language persistence | English, Bengali and Hindi preferences saved in PostgreSQL |
| Incident workflow | Hindi source and user-selected urgency preserved, actual English translation saved, same incident visible to contractor and hospital |
| Deduplication | Repeated report request ID returns the same incident; duplicate responder acknowledgement adds no new event |
| Demo handover history | Contractor review → hospital acknowledgement → follow-up → close; worker reads final state and five persisted audit events |
| Wages | Real wage entry saved/read; estimate checked; discrepancy flag visible to contractor |
| Refresh/fresh login | Worker reauthentication retains completed task and closed incident from PostgreSQL |
| Speech transcription | Authenticated multipart WAV upload → real Groq STT → returned editable transcript, preserving ladder and Zone B |
| Input failures | Malformed incident/task inputs rejected; automated AI JSON/number/provider-failure cases preserve honest fallback behavior |

Commands executed:

```text
npm test                                  # 16 tests passed
npm run build                             # TypeScript + Vite passed
npm run build:functions                    # first-generation API bundle passed
npm run verify:cloud                       # Firebase web/Auth, live Supabase and Groq all passed
node --import tsx scripts/e2e-live.ts       # 10 live workflow groups passed
node --import tsx scripts/e2e-audio.ts      # actual authenticated Groq STT passed
node --import tsx scripts/security-live.ts # six real authorization/credential scenarios passed
```

Automated tests include actual embedded PostgreSQL migration execution/idempotence, UID/role constraints, anonymous denial, optimistic versions, immutable incident history, API boundary, gateway mutation policy, translations and wage math. The isolated test store is never used in the application runtime.

## Browser checks

- Actual worker, contractor and hospital logins and corresponding dashboards inspected with real saved data.
- Worker session restored after refresh. Logout tested and the language-save/logout regression fixed and retested.
- English, Hindi and Bengali interface rendering inspected. Bengali incident reporting retains the immediate Call 112 link, editable text form and simulation disclosure.
- Worker/task layouts inspected at narrow and desktop widths; contractor and hospital measured at 360 px without horizontal overflow; hospital also measured at 1440 px. Previous login checks covered 320/360/390/430/768/1024/1440 px.
- Screenshots: `docs/worker-report-bn.png`, `docs/contractor-mobile.png`, `docs/hospital-mobile.png`.
- Hardware microphone capture and device-specific TTS voices are not claimed as universally available; explicit fallbacks remain. Actual server STT is verified with synthetic speech.

## Live data and boundaries

Six real tables: `construction_sites`, `user_profiles`, `tasks`, `incidents`, `incident_events`, `wage_entries`. At workflow verification: 3 profiles, 1 site, 1 completed task, 1 closed synthetic incident, 5 audit events and 2 wage entries. All persons/sites/reports are fictional demo data. No real emergency dispatch, clinical diagnosis, hospital notification or stored patient/audio data.

Firebase Hosting/Functions source is buildable but a public frontend deployment is not claimed. The user-requested delivery is the working local app and GitHub project. Exact setup is in README. Private `.env`, credentials, raw recordings, dependencies and build/cache files are excluded from Git.
