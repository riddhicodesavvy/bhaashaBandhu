# BhashaBandhu

Multilingual construction tasks, safety reporting, wage transparency and **simulated** hospital handover.

Current architecture: **Firebase Authentication only → Express API → Supabase PostgreSQL application data**, with server-side Groq and a React/TypeScript frontend. Deploy on **Firebase Hosting**, with the API routed to a first-generation Firebase Function. Supabase Auth, Firebase SQL Connect, Cloud SQL, Vercel, Cloud Run and Analytics are not used.

## Run

```powershell
npm ci
# The ignored local .env already contains the supplied Firebase web settings.
# For another checkout: Copy-Item .env.example .env, then populate settings.
npm run dev
```

Open `http://localhost:8080/login`.

```powershell
npm test
npm run build
npm run verify:cloud
```

## Firebase Authentication

`src/firebase.ts` initializes `initializeApp(firebaseConfig)` and exports `auth = getAuth(app)`. It uses `browserLocalPersistence`, `onIdTokenChanged`, `signInWithEmailAndPassword` and `signOut`. No Analytics initialization or hardcoded password checks exist.

The supplied web app configuration is stored in the ignored local `.env` using:

```dotenv
VITE_FIREBASE_API_KEY=<supplied-public-web-key>
VITE_FIREBASE_AUTH_DOMAIN=sdg8-4fca4.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=sdg8-4fca4
VITE_FIREBASE_STORAGE_BUCKET=sdg8-4fca4.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=716301157311
VITE_FIREBASE_APP_ID=1:716301157311:web:0257c71d0cfc6bbba0170a
VITE_DEMO_MODE=true
```

Enable Firebase Email/Password and manage the three Firebase users/passwords separately. The login demo buttons fill email only:

| Email | Supabase profile role | Destination |
| --- | --- | --- |
| worker@bhashabandhu.demo | worker | /worker |
| contractor@bhashabandhu.demo | contractor | /contractor |
| hospital@bhashabandhu.demo | hospital_responder | /hospital |

Every API request sends a Firebase ID token. Firebase Admin verifies its signature, issuer, audience and expiry against project `sdg8-4fca4`. **The verified UID's server-read Supabase profile supplies role and construction site on each request.** Emails, client body fields and custom role claims do not authorize access. No automatic profile provisioning or role selection occurs after login. Missing profiles fail closed.

Standard signed-token verification uses public certificates and does not require a private service-account key. Optional `FIREBASE_CHECK_REVOKED=true` additionally checks revocation/disabled-user status and requires authorized Admin credentials. Privileged account lookup for the seed script also requires credentials unless explicit UIDs are supplied. Firebase Functions uses its runtime identity; locally an existing `GOOGLE_APPLICATION_CREDENTIALS` file/ADC may be used. Never expose Admin credentials through `VITE_*`.

## Supabase application data

The configured demo uses the deployed **Firebase-authenticated data gateway**. Set these server environment variables (the publishable key is not privileged):

```dotenv
SUPABASE_URL=<existing-Supabase-project-URL>
SUPABASE_GATEWAY_URL=https://sdgdmplwvtplvtcndusy.supabase.co/functions/v1/bb-data
SUPABASE_PUBLISHABLE_KEY=<project-publishable-key>
```

Review/apply `supabase/migrations/202610270001_bhashabandhu.sql` to the existing Supabase project's PostgreSQL database. The migration creates application tables: `user_profiles` (unique Firebase UID, email, display name, role, language and timestamps), `construction_sites`, `tasks`, `incidents`, `incident_events`, `wage_entries`. It enables RLS and revokes `anon`/`authenticated` access; the Express backend uses the service role and enforces per-role/per-site/per-worker authorization.

The migration is applied to the existing project, and all three verified Firebase UIDs are linked to seeded profiles. Domain payloads are JSONB alongside indexed relational identities/scopes, version and generated status/role columns. CAS updates prevent lost acknowledgements; a PostgreSQL trigger atomically mirrors append-only incident events into `incident_events`. The deployed `bb-data` Edge Function verifies Firebase RS256 signature/issuer/audience and enforces role/site/owner and mutation rules independently. Its Supabase-managed service key never leaves the Edge runtime. Supabase Auth is unused. Direct server access with an explicitly configured `SUPABASE_SERVICE_ROLE_KEY` remains optional for authorized administrative seeding.

Link the existing Firebase users to data profiles by supplying their actual UIDs from Firebase Console:

```dotenv
DEMO_WORKER_UID=<worker-Firebase-UID>
DEMO_CONTRACTOR_UID=<contractor-Firebase-UID>
DEMO_HOSPITAL_UID=<hospital-Firebase-UID>
DEMO_MODE=true
```

```powershell
# For a separate setup with an explicitly authorized server service key:
npm run seed:demo
```

Alternatively omit those UID variables and provide authorized Firebase Admin credentials; the script looks up the **existing** Firebase accounts by exact email. It does not create/reset users, passwords or custom claims. Seeding only creates missing fictional site/profile/wage data in Supabase and preserves existing records.

## Groq

Keep `GROQ_API_KEY`, `GROQ_TEXT_MODEL` and `GROQ_STT_MODEL` server-only. Real translation and transcription proxies are integrated; task previews validate JSON/numeric integrity, and failed incident translations preserve source with an unavailable state. Audio upload limit is 3 MB / 60 seconds. Raw audio is not retained.

```powershell
npm run verify:ai
# With a synthetic WAV fixture only:
npm run verify:audio -- C:\path\synthetic-report.wav
```

## Firebase Hosting

`firebase.json` publishes `dist`, rewrites `/api/**` to the first-generation `bhashabandhuApi` HTTPS Function and all frontend deep links to `index.html`. `.firebaserc` selects the existing `sdg8-4fca4` project. `VITE_*` values are public and embedded at build time. Database/Groq keys stay in runtime secrets. No second-generation function or Cloud Run service is configured.

Firebase Hosting cannot execute Express or protect server secrets on its own. The included first-generation Functions wrapper supplies that server runtime. Function deployment requires authorized Firebase CLI access and a project eligible for Functions billing; neither is silently enabled by this repository. Configure non-secret runtime values from `functions/.env.example`, install Function dependencies, and bind existing runtime secrets before deployment:

```powershell
npm --prefix functions install
npm run build:functions
npx firebase-tools deploy --project sdg8-4fca4 --only functions:bhashabandhuApi,hosting
```

The Functions wrapper binds only `GROQ_API_KEY`; it uses the same authenticated database gateway. The Supabase MCP OAuth credential is for development/database management, not an application credential. No database password is used. Firebase Hosting publication still requires an authorized Firebase CLI deployment identity and runtime secret binding; no hosted frontend URL is claimed.

## Verified live workflows

```powershell
npm run test:live
node --import tsx scripts/e2e-audio.ts <synthetic-test.wav>
node --import tsx scripts/security-live.ts
```

The live test uses private demo password environment variables, real Firebase logins, real Groq translations, and actual Supabase reads/writes. It covers all three roles, task preview/assignment/acknowledgement/start/completion, incident queues and audit statuses, wage calculations/disputes, malformed input, duplicate requests, role denial and data retained after a fresh login. Synthetic test records remain visibly demo-only. Audio was verified using a locally generated synthetic speech recording; browser microphone and TTS voice availability depend on the device.

## Safety and verification

Call 112 is a direct phone link; saving a report does not contact emergency services. Hospital screens and actions remain explicitly demo-only. No clinical diagnosis, real dispatch, maps, chat, raw-audio storage or patient records.

See `docs/ui-implementation-report.md` for current executed tests and `docs/implementation-gaps.md` for exact remaining configuration. Original PRD/TRD hosting/database recommendations are superseded by the user's latest architecture instruction.
