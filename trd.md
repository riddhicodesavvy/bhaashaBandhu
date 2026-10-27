# BhashaBandhu — Technical Requirements Document (TRD)

**Version:** 2.0  
**Status:** Implementation specification for a 120-minute AI-assisted hackathon MVP  
**Target Firebase project:** `sdg8-4fca4` (user-provided)  
**Backend data store preference:** existing Firebase SQL Connect (formerly Data Connect) **backed by PostgreSQL**, **conditional on verification**  
**AI:** Groq for speech-to-text and translation; Gemini already integrated by user, **optional**  
**Hosting:** Google Cloud Run  
**Client:** Mobile-first responsive React web application

## 1. Scope and verification gate

Implement three roles **only**:

1. `worker` — construction workforce.
2. `contractor` — construction site supervisor.
3. `hospital_responder_demo` — simulated receiving hospital desk.

No hospital supervisor, hospital staffing, real external alerts, or medical triage.

**Critical first step:** The Firebase project being visible does **not** prove PostgreSQL / SQL Connect has been provisioned. Antigravity must inspect the actual Firebase console and repository and confirm: (a) SQL Connect service and Cloud SQL PostgreSQL instance exist; (b) service/connector IDs; (c) deployed schema and operations; (d) generated web SDK path and authentication settings; (e) correct Google Cloud project permissions. **Do not silently replace PostgreSQL with Firestore.** If using plain Cloud SQL without SQL Connect, server-based parameterized SQL access is a different architecture and must be explicitly chosen.

## 2. Recommended deployment architecture

```text
Mobile-first React + TypeScript (Worker / Contractor / Hospital Demo)
                     |
                     | HTTPS same-origin /api/*
                     v
         Node.js/Express backend on Cloud Run
                     |
              +------+-----------------------+
              |                              |
              v                              v
          Groq APIs               Firebase SQL Connect / PostgreSQL
       - Whisper/STT                 - users + sites
       - translation                 - tasks + acknowledgements
       - incident summarization      - incidents + status events
              |
      optional Gemini server adapter

Browser: MediaRecorder (recording), speechSynthesis (playback), tel:112 link
```

For a hackathon, **one Cloud Run deployable** (Express serving React/Vite build plus API) minimizes CORS and service management. SQL Connect may also support generated client SDK access; favor a **server-mediated integration** for sensitive incident/task operations and demo role policy enforcement. If the generated connector is designed for frontend access, any actual production authorization must come from Firebase Authentication and SQL Connect `@auth` restrictions, not from hiding UI buttons or trusting role selectors.

### Technology stack

| Layer | Choice | Notes |
|---|---|---|
| UI | React + Vite + TypeScript | Mobile-first 360 px baseline, responsive desktop |
| Styling | Tailwind CSS or existing CSS system | Single design system; avoid adding both new frameworks |
| Routing | React Router | Three role-specific route groups |
| API | Node.js + Express | Backend-only secrets, input checks, Groq proxies |
| Database | Existing Firebase SQL Connect / PostgreSQL | Verify installed service and generated SDK before changing anything |
| Speech-to-text | Groq speech endpoint | Use a currently supported Whisper-compatible model verified in Groq console |
| Translation / parsing | Groq text model | Structured JSON output validated server-side |
| Optional AI | Gemini | Optional fallback only if securely configured; no double-paying for every request |
| Audio playback | `speechSynthesis` | Locale capability varies by device; always show text |
| Cloud | Google Cloud Run + Secret Manager | Required competition deployment |

## 3. External setup and credentials

**Required:**
- Google Cloud project and Firebase project `sdg8-4fca4`.
- Confirm active Firebase SQL Connect service and PostgreSQL database; exact connector and SDK details are currently **unknown**.
- Groq API key; choose live/current text + STT model IDs from Groq dashboard.
- Google Cloud Run enabled, billing and deployment privileges configured.

**Optional:** Gemini server-side key/provider binding, Cloudflare R2 for retained audio (MVP deliberately does not retain audio), map/geocoding service, external notification provider (not MVP).

Server environment variables (illustrative names; actual SDK configuration may differ):

```dotenv
NODE_ENV=production
PORT=8080
GOOGLE_CLOUD_PROJECT=sdg8-4fca4
GROQ_API_KEY=***SERVER_SECRET***
GROQ_TEXT_MODEL=<verified-current-model-id>
GROQ_STT_MODEL=<verified-current-model-id>
DEMO_MODE=true
# Configure Firebase SQL Connect using its generated SDK/service settings.
# DO NOT invent a PostgreSQL URL if SQL Connect is the chosen pathway.
# GEMINI_API_KEY=***OPTIONAL_SERVER_SECRET***
```

Never place `GROQ_API_KEY`, Gemini credentials, Cloud SQL database credentials or service account private keys in `VITE_*` or in frontend source. Google Cloud Run should load secrets from Secret Manager with minimum IAM privileges. Exclude `.env*`, exported audio and credentials JSON from the Git repository.

## 4. Data model — conceptual PostgreSQL schema

Implement these entities in the **verified** SQL Connect schema using its actual migration and connector conventions; the SQL below is conceptual and not a substitute for compatible Firebase SQL Connect GraphQL definitions.

### `users`

| Field | Type | Meaning |
|---|---|---|
| `id` | UUID/string PK | Synthetic demo identity |
| `display_name` | text | Fake/demo name |
| `role` | enum/text | `worker`, `contractor`, `hospital_responder_demo` |
| `preferred_language` | enum/text | `en`, `hi`, `bn` |
| `site_id` | nullable FK | Assigned construction site |
| `is_demo` | boolean | Must be true in MVP |

### `construction_sites`

`id`, `name`, `location_description`, `site_contact_display`, `created_at`.

### `tasks`

`id`, `site_id`, `assigned_to_user_id`, `created_by_user_id`, `title_original`, `instructions_original`, `source_language`, `translations_json` (including title/instructions per locale), `safety_notes_original`, `deadline_at`, `status` (`assigned`, `acknowledged`, `in_progress`, `completed`), `acknowledged_at`, `completed_at`, `created_at`, `updated_at`.

Use a separate `task_assignments` table if one task can be sent to multiple workers; **do not use a single shared status** for multiple assignees.

### `incidents`

`id`, `site_id`, `reporter_user_id`, `source_language`, `original_text`, `english_translation`, `structured_summary_json`, `incident_type` (`injury`, `hazard`, `unsafe_condition`, `near_miss`, `other`), `reported_urgency` (`low`, `medium`, `high`, `urgent`), `location_description`, `status` (`reported`, `reviewed`, `acknowledged_demo`, `follow_up_demo`, `closed_demo`), `is_simulation`, `created_at`, `updated_at`.

**Rule:** `reported_urgency` is the worker's selection; a model-generated description is *not* an independently verified medical assessment.

### `incident_events`

`id`, `incident_id`, `actor_user_id`, `from_status`, `to_status`, `event_type`, `note`, `created_at`. Append-only audit history for demo acknowledgement and status transitions.

### `wage_entries` (P1 only)

`id`, `worker_id`, `site_id`, `work_date`, `daily_rate`, `overtime_hours`, `overtime_rate`, `deduction_amount`, `deduction_reason`, `entry_source`, `disputed`, `created_at`, `updated_at`. Use an explicitly documented computation rule and treat all amounts as synthetic demonstration data.

### Suggested indexes and constraints

- Task query index on `(assigned_to_user_id, deadline_at)`.
- Incident queue index on `(site_id, created_at DESC)` and `(status, created_at DESC)`.
- FK constraints for assigned users, reporter, contractor and site.
- Strict allowlist/check constraints for roles, languages, states, categories.
- Server timestamps in UTC; convert to local display time in UI.

## 5. Database integration procedure for Antigravity

1. Inspect repo for `dataconnect/`, `firebase.json`, `dataconnect.yaml`, generated SDK packages, `.firebaserc` and existing React/API structure.
2. Verify console status and identifiers of deployed SQL Connect service, connector, Cloud SQL PostgreSQL instance and operations.
3. Use Firebase CLI to select existing project: `firebase use --add` (ensure correct account/project). Do not run `firebase init` blindly if it would overwrite an existing service.
4. If connector definitions exist, generate the typed SDK according to installed Firebase tooling documentation. Reuse existing generated methods rather than inventing a raw SQL URL.
5. Create/update operation definitions for: assigned tasks by worker; create task; acknowledge task; complete task; report incident; site incident queue; demo responder queue; acknowledge demo incident; read incident timeline. Apply per-role/site authorization.
6. For demo-only role selector, explicitly constrain app to synthetic data. In a public deployment, a role selector by itself offers **no secure identity or role isolation**; prefer Firebase Auth demo accounts and server-side authorization when feasible.
7. Test create/read/update persistence across refresh and independent browser sessions.

If backend-only SQL access is selected instead, use a connection pool compatible with Cloud SQL connectivity, parameterized queries, migrations, secret-based credentials, connection limits and verified IAM/database configuration. **Do not mix two database paths arbitrarily.**

## 6. API contract (Node backend)

Use standard JSON responses `{ "data": ..., "error": null }` on success and `{ "data": null, "error": { "code": "...", "message": "..." } }` on failure, with appropriate HTTP statuses. API calls require authenticated or tightly controlled synthetic demo identity; do not rely solely on request body `role`.

| Verb | Route | Role | Purpose |
|---|---|---|---|
| GET | `/api/me` | all | Return role, preference, current site |
| PATCH | `/api/me/language` | all | Save language preference |
| GET | `/api/tasks` | worker/contractor | Scope to assigned worker or permitted site |
| POST | `/api/tasks` | contractor | Create task, translate title/body, assign worker |
| POST | `/api/tasks/:id/acknowledge` | assigned worker | Record first acknowledgement timestamp |
| POST | `/api/tasks/:id/complete` | assigned worker | Mark completion independently of acknowledgement |
| POST | `/api/audio/transcribe` | worker/contractor | Upload short supported audio to Groq |
| POST | `/api/translate` | contractor/server workflows | Translate user text; validate locale and size |
| POST | `/api/incidents` | worker | Create reviewed text/transcript incident |
| GET | `/api/incidents` | appropriate site/role | Scoped contractor/worker/demo responder view |
| GET | `/api/incidents/:id` | authorised role | Original, translation, details and status timeline |
| POST | `/api/incidents/:id/acknowledge-demo` | hospital demo responder | Transition to acknowledged-demo; record event |
| POST | `/api/incidents/:id/follow-up-demo` | hospital demo responder | Record follow-up |
| POST | `/api/incidents/:id/close-demo` | hospital demo responder | Close demo incident |
| GET | `/api/health` | monitoring | Readiness response (avoid leaking credentials) |

### API behaviour

- All writes validated with Zod/Joi or equivalent; max lengths, required fields and allowlisted statuses.
- `POST /api/incidents` **never sends notifications to real hospitals**.
- `POST /api/audio/transcribe` accepts limited audio MIME types/formats supported by current Groq API, sensible clip/byte maximum and authenticated rate limits.
- On Groq failure, show retry and editable text form. Do not synthesize an answer and claim transcription succeeded.
- On task translation failure, either block assignment with useful error or explicitly mark translation pending; never present untranslated content as translated.
- For conflicting acknowledgement requests, make updates idempotent. First valid acknowledgement timestamp remains unchanged.

## 7. Groq AI processing

### Audio reporting pipeline

```text
Microphone permission -> MediaRecorder -> upload -> Groq STT
-> editable original transcript -> user confirms/corrects
-> Groq translate + extract structured report -> validation
-> incident record stored in PostgreSQL -> role queues display record
```

- Verify current model names on Groq platform; do not assume any particular model remains available.
- Supported locales for MVP: `en`, `hi`, `bn`.
- Groq translation prompt must preserve numbers, deadlines, location names and uncertainty; return JSON with `translatedText`, `sourceLanguage`, `notes` if needed.
- Incident extraction JSON: `{originalText, translatedEnglish, incidentType, siteLocationText, workerReportedUrgency, uncertaintyNotes}`. **Do not infer injury diagnosis or upgrade user-selected urgency as a clinical fact.**
- Validate model JSON against schema; if invalid, preserve text and permit manual incident submission.
- Keep API calls server-side; use timeout and controlled retries (e.g. one retry for temporary errors), with rate limits and no infinite loops.
- Do not persist microphone audio by default. If adding audio replay later, get explicit consent and implement protected storage/retention/deletion.

### Text-to-speech

Use `speechSynthesis` to read displayed task text; select compatible voice with requested language if present. Browser voice availability varies, especially for Bengali; if no suitable voice exists, explain text remains available. Never substitute an unrelated language voice without informing user.

### Gemini integration

Gemini is **optional** because Groq handles MVP STT/translation. If a Gemini integration already exists, isolate it behind a server adapter, ensure secrets are protected and only use it if specifically useful (e.g. configured translation fallback); do not add it as a required dependency or expose SDK secrets client-side.

## 8. Frontend routes and UX behaviours

Suggested route map:

```text
/                      language + role onboarding (demo)
/worker                worker home
/worker/tasks          worker task list
/worker/tasks/:id      task detail + speak + acknowledge
/worker/report         incident form with Call 112 prominent
/worker/reports        own report statuses
/contractor            construction overview
/contractor/tasks/new  assign + translate + preview
/contractor/tasks      tasks and acknowledgement states
/contractor/incidents  site incident queue
/hospital-demo         simulation banner + demo incident inbox
/hospital-demo/:id     detail + demo acknowledgement/timeline
```

Worker: fixed bottom navigation with icon **and** text labels. Contractor and responder: desktop sidebar that collapses to mobile drawer/bottom navigation. Use primary blue for standard actions, red only for urgent incident/call actions, green for completion and amber for caution. Default readable text (16 px), adequate Indic-script fonts and tested at 320/360/390/430 px widths. Main cards and actions must not require horizontal scrolling.

Implement user-visible states: pending translation, transcription progress, mic permission denied, task saved/failed, incident saved/failed, demo acknowledgement recorded/failed, no tasks, no incidents, offline/network lost. Use optimistic UI only when safe and reversible; confirm actual database writes.

## 9. Safety, privacy and security

1. **Emergency disclaimer:** The hospital portal is a demo; submission and acknowledgement do not contact real hospitals or emergency services. Show on incident form, inbox and detail.
2. **Urgent help:** `tel:112` is immediately accessible; provide text fallback and no implication of response dispatch. Verify emergency number for actual deployment geography.
3. **Privacy:** Only synthetic test persons/sites/incidents in hackathon MVP. Audio deleted after transient processing; logs must not dump incident text or secrets.
4. **Identity:** Demo role picker is not authentication. Limit public exposure to synthetic data and prefer actual Firebase Auth plus secure role claims before production. Server must not accept arbitrary `userId` as authority to read another worker's records.
5. **Authorization:** Enforce per-role and per-site access in API/database connector rules; never use unrestricted public read/write operations.
6. **Reliability:** Input/rate limits, idempotent acknowledgements, database transactions where applicable, sanitized display of user/model text.
7. **Clinical boundaries:** No diagnosis, treatment recommendation, severity classification presented as fact or dispatch confirmation.
8. **Accessibility:** Inputs have labels, error messages, visible focus indicators and touch-friendly controls; translation never hides original source message.

## 10. Tests and acceptance gates

### Automated tests where practical

- Translation service validates supported locale codes and malformed JSON handling.
- Contractor task creation validates worker/site and saves source and translated text.
- Worker task query cannot retrieve another worker's assigned tasks when auth is enabled.
- First acknowledgement time persists and subsequent duplicate requests do not reset it.
- Incident creation preserves original transcript and translated report.
- Demo responder acknowledgement writes status event and updates record.
- AI/API failure has deterministic error response and a usable manual fallback.

### Manual end-to-end check (mandatory)

1. Run application with test synthetic identities.
2. Contractor creates English tiling task for Hindi worker.
3. Worker sees Hindi task and original; speaks it if browser supports Hindi voice; acknowledges.
4. Refresh contractor and worker sessions; status remains accurate.
5. Worker records Hindi audio or enters report as text, reviews and submits.
6. Incident appears in contractor and hospital-demo queues; `SIMULATION` label visible.
7. Responder acknowledges; refresh every role and verify state.
8. Switch to Bengali and check labels and translation.
9. Test ~360 px viewport and desktop; inspect overflow and button interactions.
10. Test denied mic permission, AI service error, invalid form, expired backend connection and repeated acknowledgement.

**Do not mark tests passed without executing them.**

## 11. Google Cloud Run deployment

Build React assets and serve through Express. Use multi-stage Docker build, production dependency install, `PORT` binding on `0.0.0.0`, health endpoint and small image. Configure Cloud Run's identity for database/SQL Connect access according to verified Firebase/Google Cloud setup. Set Groq key through Secret Manager; never put it into Docker build arguments or checked-in `.env`.

Checklist:
- [ ] Correct Firebase/GCP project and region.
- [ ] SQL Connect integration actually verified (not merely assumed).
- [ ] Cloud Run container boots with correct `PORT`.
- [ ] `/api/health` and UI route refreshes work.
- [ ] Groq called on backend; client bundle contains no secret.
- [ ] Task + incident DB writes work in deployed runtime.
- [ ] Simulation labelling and `Call 112` guidance visible on live URL.
- [ ] Public GitHub repository uses one branch and meets hackathon size limit (initially under 10 MB per supplied rules).
- [ ] Public LinkedIn post and Cloud Run URL prepared as submission links.

## 12. Two-hour implementation priorities

**P0 / must ship:** role routing, English/Hindi/Bengali interface, task create/translation/list/ack, worker incident text + voice STT attempt with fallback, simulated responder queue + acknowledgement, real database persistence, mobile responsiveness, Cloud Run.

**P1 / after deployment works:** synthetic wage entries, optional audio playback improvements, better task status filters, optional location permission, installable PWA features.

**Out of scope:** real hospital alert delivery, geospatial hospital discovery, real ambulance dispatch, confidential whistleblower guarantee, hospital manager UI, hospital staffing workflows, payroll integrations, live production identity verification, stored patient records, offline data sync, unreviewed AI medical triage.

### Timing

| Time | Engineering milestone |
|---|---|
| 0–15m | Verify SQL Connect and existing repository; secure environment |
| 15–45m | Data operations, contractor create + worker task screens |
| 45–70m | Groq translation, typed incident + audio transcription |
| 70–85m | Demo responder inbox and status history |
| 85–100m | Accessibility, mobile fixes, error handling, E2E |
| 100–115m | Cloud Run and live smoke test |
| 115–120m | Submission links and final verification |

## 13. Decisions and known uncertainties

- **Agreed:** Name BhashaBandhu; mobile-first; English/Hindi/Bengali; exactly three roles (worker, construction contractor, simulated hospital responder); Groq; Firebase project; Cloud Run; no hospital supervisor.
- **Not yet verified:** SQL Connect service and generated SDK; production Firebase Auth architecture; exact Groq models; whether the existing Gemini integration is backend-secure.
- **Judge risk:** Healthcare functions here as **emergency-response partner only**. If challenge's “two industries” criterion means independently deploying workplace operations in each industry, this design is not equivalent to a hospital workforce solution. Document this clearly in presentation rather than misrepresenting compliance.
