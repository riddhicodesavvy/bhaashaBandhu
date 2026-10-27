# BhashaBandhu

**Your Language. Your Safety. Your Voice.**

BhashaBandhu is a mobile-first multilingual construction-worker safety and communication platform aligned with SDG 8. Migrant workers may struggle to understand assignments, report hazards, or check wage records when they do not share a language with supervisors. BhashaBandhu makes instructions and safety reports accessible in **English, Hindi and Bengali**, while preserving the original text.

## Key features

- Translated tasks, original-text disclosure and browser-supported audio playback.
- Task assignment, acknowledgement, progress and completion tracking.
- Voice/text incident reporting, editable Groq transcripts and translated reports.
- Shared incident queues, persistent demo acknowledgements and audit history.
- Wage overview: rates, worked days, overtime, deductions, estimates and discrepancy flags.
- Firebase login, persistent sessions and backend-enforced role/site access.
- Responsive multilingual interfaces and a prominent direct Call 112 action.

## Three roles

| Role | Purpose |
| --- | --- |
| Worker | View/listen to tasks, acknowledge/complete work, report incidents and review wages. |
| Contractor | Assign translated tasks, track task statuses, review incidents and record wages. |
| Hospital Responder Demo | Review simulated handovers and acknowledge, follow up or close demo reports. |

## Tech stack

- React + TypeScript, Vite and responsive CSS.
- Firebase Authentication and Firebase Hosting configuration.
- Supabase PostgreSQL and a Firebase-authenticated Supabase Edge Function data gateway.
- Groq for server-side translation and speech-to-text.
- Node.js + Express API; first-generation Firebase Functions deployment wrapper included.

Firebase UID-linked database profiles determine roles. Supabase Auth and email-based authorization are not used.

## Setup and run

Requires Node.js 22 and npm.

```bash
npm ci
cp .env.example .env
# Populate your environment configuration.
npm run dev
```

On PowerShell, use `Copy-Item .env.example .env` if preferred. Preserve an existing populated `.env` rather than replacing it.

Open **http://localhost:8080/login**.

Configure public `VITE_FIREBASE_*` web app values and server-side `GROQ_API_KEY`, `SUPABASE_URL`, `SUPABASE_GATEWAY_URL` and `SUPABASE_PUBLISHABLE_KEY`. The gateway verifies Firebase tokens and keeps the privileged Supabase key inside the Edge runtime. A service-role key is optional for authorized administrative tooling; never place it in `VITE_*` variables.

For a separate database setup, review/apply `supabase/migrations/202610270001_bhashabandhu.sql`, deploy `supabase/functions/bb-data`, and seed profiles linked to the actual Firebase UIDs. The configured demo project already has these records.

```bash
npm test
npm run build
npm run build:functions
```

Firebase Hosting SPA/API rewrites are in `firebase.json`; `.firebaserc` selects the existing project. Publishing requires an authorized Firebase deployment identity and configured Function secrets. A public Hosting deployment is not claimed here.

## Demo credentials

These shared accounts are for fictional demonstration data only, not production use.

| Role | Email | Password | Dashboard |
| --- | --- | --- | --- |
| Worker | worker@bhashabandhu.demo | Worker@123 | `/worker` |
| Contractor | contractor@bhashabandhu.demo | Contractor@123 | `/contractor` |
| Hospital Responder Demo | hospital@bhashabandhu.demo | Hospital@123 | `/hospital` |

Firebase Authentication validates passwords; the frontend never compares hardcoded passwords. Use separately managed accounts and credentials for a real deployment.

## Simulation and privacy

**DEMO ONLY — The hospital portal does not notify real hospitals or dispatch real emergency services.** Saving or acknowledging an incident does not request an ambulance. For urgent help, use the direct emergency-call action; do not wait for AI or demo acknowledgement.

Use synthetic people, sites and incidents only. The app does not diagnose injuries or perform medical triage. Audio is processed temporarily and is not retained. Microphone and text-to-speech availability depend on the browser/device; readable text and clear fallbacks remain available.

Private `.env` files, database passwords, Groq API keys, Supabase service-role keys and private credentials are excluded from version control. Only placeholder `.env.example` files are included.

See [the verification report](docs/ui-implementation-report.md) for executed checks and deployment limitations.
