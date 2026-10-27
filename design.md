# BhashaBandhu — Mobile-First UI/UX Design Specification

**Version:** 1.0 | **Date:** 2026-10-27 | **Status:** Authoritative frontend handoff for hackathon MVP  
**Product name:** BhashaBandhu (not FairShift)  
**Tagline:** *Your Language. Your Safety. Your Voice.*  
**Primary device:** Android-class smartphone, 360 px CSS viewport baseline  
**Supported UI languages:** English (`en`), Hindi (`hi`), Bengali/Bangla (`bn`)  
**Roles:** `worker`, `contractor`, `hospital_responder_demo` — exactly three  
**Deployment target:** React + TypeScript mobile-first app on Firebase Hosting; Firebase Authentication only; Supabase PostgreSQL application data managed through Supabase MCP; server-side Groq (supersedes original hosting/database requirements).  
**Source documents:** `problem-statement.md`, `prd.md`, `trd.md` (latest BhashaBandhu versions); **visual reference:** `mobile-ui-reference.png` (original FairShift worker mockup).  
**Purpose:** Specify implementation decisions and UI behavior tightly enough that an AI coding agent can implement without inventing routes, features, dataset values, or success claims.

## Implementation change log — 2026-10-27

Final hosting correction: the latest supplied directive selects Firebase Hosting rather than Vercel. Frontend deep links rewrite to `index.html`; `/api/**` rewrites to an explicitly first-generation Firebase Function so Supabase and Groq keys stay server-side without a Cloud Run deployment. Supabase MCP registration and OAuth are verified, but the running conversation must reload tools before live database inspection.

Latest architecture correction: Firebase is authentication only. Supabase PostgreSQL holds UID-linked profiles/roles, sites, tasks/statuses, incidents/events and wages; Supabase Auth is unused. Roles are read securely from the database profile, never email patterns or client claims. Hosting is Vercel with a server-only Express API function. Firebase SQL Connect, Cloud SQL and Cloud Run are abandoned. Email/password users are configured separately; the profile seed script does not create/reset accounts or change custom claims. This correction supersedes the database/hosting descriptions in earlier handoff documents.

The user's subsequent explicit implementation request supersedes role-picker onboarding. `/` now redirects to `/login` for unauthenticated visitors. Login uses Firebase Authentication email/password and backend-verified custom role/site claims; demo selectors fill email only. No pre-login role selection or authentication bypass exists. The responder role is `hospital_responder` and its canonical routes are `/hospital` and `/hospital/:id`, matching the latest request. The worker wage overview and contractor wage-entry pages are included as explicitly requested, backed by the same database adapter. The four worker bottom-navigation destinations remain unchanged; wage access is a dashboard card. All hospital simulation and clinical boundaries remain in effect. Other design details below remain the visual reference.

---

## 0. Authority, reconciliation and build rules

1. Read `problem-statement.md`, `prd.md`, `trd.md` and this document **fully** before writing app code; inspect the existing repository first. `prd.md` controls feature scope; `trd.md` controls real integration and security; this file controls component design, navigation, UI copy, and interaction. The image is **inspiration only**, not a requirements source. Never overwrite an existing working integration solely to match this aesthetic.
2. Replace **all** FairShift wording/logos with **BhashaBandhu**. The old mockup's dates, staff, names, phone numbers, sample counts, locations and clinical-looking assessments are illustrative only and must not be treated as live data.
3. The product is **mobile-first for all three roles**, including the contractor and hospital responder. The worker experience is the primary visual priority. Responsive desktop views enhance the same routes; never create a mobile-only prototype that breaks on desktop.
4. **Only three roles**: construction worker, construction contractor/site supervisor, hospital emergency responder **DEMO**. No hospital supervisor, no hospital task workforce portal, no fourth role.
5. **Construction = operational workforce context; healthcare = simulated emergency receiving context only.** Do not claim two full workforce-management industries are implemented.
6. Feature flags: **P0** must work end to end; **P1** is only shown if implemented and validated against persistent backend records; **OUT** must not appear as clickable navigation. A disabled roadmap card may appear only if plainly marked “Coming later”; default is to hide entirely.
7. No AI-generated fake “success” states, “sent to hospital”, “ambulance en route”, live location or near-hospital claims. Hospital actions always include “Demo/Simulation” wording. No diagnosis or autonomous medical severity classification.
8. Reuse existing stack/components when comparable. Preferred conventions below apply only where repo has no established equivalent. Do not spend the hackathon rebuilding a functioning design system.
9. If a dependency/endpoint/schema/auth method is not actually configured, identify it as **BLOCKED/UNVERIFIED** rather than inventing credentials, a database path, API response, or working status. Typed/manual fallback is permitted only where specified, and must be visibly honest.
10. Do not use real patient data, real worker PII, real hospital names or actual emergency contact numbers other than the public `112` emergency number; any example site/person must be fictional and visibly demo.

### 0.1 Included / excluded feature map

| Feature | Priority | UI treatment |
|---|---|---|
| Select language and demo role | P0 | Functional onboarding; clearly demo mode |
| Contractor creates, translates, previews and assigns tasks | P0 | Real server translation + persistent task |
| Worker task list/details, original text, acknowledge/complete | P0 | Real records and durable mutations |
| Worker text incident report | P0 | Functional even if microphone/AI fails |
| Worker voice-to-text incident report via Groq | P0 target | Real recording + actual STT; honest typed fallback on failure |
| Contractor incident queue | P0 | Shared persistent incidents |
| Hospital responder demo inbox/detail/acknowledgement | P0 | Persistent demo-only event/state |
| Hindi/Bengali/English static interface translations | P0 | Curated dictionaries, not LLM for app chrome |
| Task text-to-speech | P0 target | Browser-native, only with supported compatible voice |
| Emergency `tel:112` action | P0 | Always shown before AI/submission |
| Wage/attendance/deduction records | P1 | Hidden unless implemented, persisted, tested |
| Photo attachment, general messaging/chat, live map, actual alerts, ambulance dispatch, GPS nearest-hospital search | OUT | Do not show or implement |
| Hospital housekeeping task management, clinical triage, real patient records | OUT | Do not show or implement |
| PWA install/offline synchronization, media/audio storage | OUT for 2-hour MVP | Do not represent as working |

---

## 1. Visual reference interpretation

**Reference image:** four mobile screens titled Worker App — mobile-first, low-literacy friendly. Take inspiration from: crisp navy text; generous white backgrounds; clear blue primary buttons; teal completion cues; red report/emergency CTA; lightly bordered round cards; sectioned task content; compact bottom navigation; large role selector cards; Hindi content presented as first-class UI; obvious mic and audio affordances.

**Do not literally reproduce:** FairShift branding, inaccurate or inconsistent timestamps, simulated photo widgets, nonfunctional messages/profile sections, fake progress statistics, illustrative “3 of 5” counts, unverified clinician labels, or iOS-only assumptions. Source code must implement a real responsive website, not insert the reference image as a background/screenshot.

**Visual identity for implementation**
- Wordmark: `BhashaBandhu` in strong navy/blue. Use text-based brand and a simple in-code Lucide `Languages` + `ShieldCheck` or `HardHat` emblem. Do **not** copy/trademark the FairShift logo. Icon is decorative; always show visible wordmark in onboarding/header.
- Product voice: grounded, welcoming, direct, respectful. Avoid childish language; support low-literacy users through simple words rather than patronizing wording.
- Look: professional, practical Indian workforce web app; no glassmorphism, dark-mode-only UI, hero animation, 3D device mockup inside product, stock hero imagery, gradient-heavy dashboard or excessive animation.
- Content density: mobile workers see 1 primary goal per screen; contractors/responders see compact task/incident summaries with clear CTAs.

---

## 2. Design tokens — use consistently

### 2.1 Colors (hex exact; avoid ad hoc variations)

| Token | Hex | Purpose |
|---|---|---|
| `--brand-600` | `#2563EB` | Main CTA, links, selected state |
| `--brand-700` | `#1D4ED8` | Hover/pressed CTA |
| `--brand-050` | `#EFF6FF` | Soft blue info/selected background |
| `--success-600` | `#059669` | Confirmed complete/acknowledged state |
| `--success-050` | `#ECFDF5` | Completion banner background |
| `--warning-600` | `#B45309` | Text/icon on yellow warning surface |
| `--warning-050` | `#FFFBEB` | Warning background |
| `--danger-600` | `#DC2626` | Incident and emergency actions |
| `--danger-050` | `#FEF2F2` | Critical alert background |
| `--ink-900` | `#111827` | Headlines and primary text |
| `--ink-600` | `#4B5563` | Secondary labels |
| `--ink-500` | `#6B7280` | Hints, only if contrast remains adequate |
| `--border` | `#E5E7EB` | Card/input borders |
| `--surface` | `#FFFFFF` | Cards and main background |
| `--canvas` | `#F8FAFC` | Secondary screen background |

Use dark text on pale warning/danger fills. Do not communicate critical state by color alone; include icon and textual status.

### 2.2 Typography

- Primary: `Inter`, `system-ui`, sans-serif. Indic fallback chain: `"Noto Sans Devanagari"`, `"Noto Sans Bengali"`, system sans-serif; use hosted stylesheets only when permitted and necessary, avoid bundling font binaries into a repo under 10 MB.
- Respect natural Hindi/Bengali shaping, line height and wrapping. **Never letter-space Indic script**, uppercase it, clip glyph tops/bottoms, or place important Indic words in fixed one-line boxes.
- Mobile page title: 24 px/32 px, semibold/bold; section heading: 18 px/26 px semibold; card title: 16 px/24 px semibold; body: **16 px/24–27 px**; helper: 14 px/20 px; form/error labels: ≥14 px.
- Desktop page title: 28–32 px/38–42 px; body stays 16 px. Use tabular numbers for counts, dates and amounts.
- Avoid truncating incident or safety instructions. Let text wrap, and prefer expanded detail to ellipses.

### 2.3 Layout, spacing, elevation

- Base unit 4 px; space steps 4/8/12/16/20/24/32.
- Mobile outer horizontal padding: 16 px at 320–430 px width; 20 px above 430 px; safe-area padding bottom on notched devices.
- Standard card: white surface, 1 px `--border`, 14–16 px radius, 16 px padding; subtle shadow **only** where separation helps.
- Inputs: ≥48 px tall; primary CTAs: ≥52 px tall; touch targets minimum **44×44 CSS px**. Form rows stack at mobile widths.
- Button radii 12 px; badges 999 px pill radius, never badges for normal section headings.
- Navbar: fixed/sticky bottom **only on mobile worker screens**, 64–72 px plus safe-area inset. Reserve page bottom space to prevent CTA overlap. For contractor/responder on mobile use a compact top bar + one clearly visible mobile navigation (drawer or simplified tab strip), **not both duplicate side and bottom navigation**.
- Max content width worker: ~720 px on larger screens to preserve reading; contractor and responder: ~1200 px content container on desktop.

### 2.4 Icons, controls and motion

- Use existing icon library; otherwise `lucide-react`. Pair every icon with text except universally recognized inline icons with accessible labels (e.g., back arrow with `aria-label`).
- Task `ClipboardList`, clock `Clock3`, site `MapPin`, audio `Volume2`, translate `Languages`, worker `HardHat`, report `AlertTriangle`, emergency `Phone`, microphone `Mic`, complete `CircleCheck`, hospital `Hospital`, contractor `ClipboardCheck`.
- Duration 120–180 ms for hover/focus transitions only; respect `prefers-reduced-motion`. **No pulsing emergency animations** (distracting, inaccessible).
- Focus: visible 2–3 px focus ring, keyboard traversal, screenreader text for icon buttons; field errors are text + `aria-describedby`.

---

## 3. Exact app information architecture (no new routes)

### 3.1 Route inventory

```text
/                         onboarding: language + 3 demo roles
/worker                   worker home
/worker/tasks             assigned task list
/worker/tasks/:id         task details, speak, acknowledge, complete
/worker/report            incident report (text + voice with review)
/worker/reports           submitted reports and status
/contractor               contractor overview
/contractor/tasks         task tracking list
/contractor/tasks/new     create, preview translation, assign
/contractor/incidents     contractor incident queue
/contractor/incidents/:id incident detail (reuse generic detail component)
/hospital-demo            simulated hospital responder inbox
/hospital-demo/:id        translated incident details + demo acknowledgement
```

**Not in navigation:** `/messages`, `/profile`, `/admin`, `/hospital-manager`, `/hospital/tasks`, `/maps`, `/chat`, `/payroll`. Optional `/worker/wages` and `/contractor/wages` **only if** approved P1 wage feature actually works and is reflected in PRD. Unknown paths show a friendly 404 and route back to valid onboarding/role home. Protect all routes as appropriate for the actual demo identity/session; don't mistake UI route guards for server authorization.

### 3.2 Bottom navigation on Worker (exactly four items)

`Home` -> `/worker`; `Tasks` -> `/worker/tasks`; `Report` -> `/worker/report`; `My Reports` -> `/worker/reports`. **Report** uses a red warning icon but remains an ordinary navigation tab; `Call 112` is a separate emergency action. Do not add Messaging or Profile based solely on the mockup. Active tab is indicated with text + icon color/shape; keep role/language switches in top header/menu.

### 3.3 Contractor navigation

`Overview` -> `/contractor`; `Tasks` -> `/contractor/tasks`; `Assign Task` -> `/contractor/tasks/new`; `Incidents` -> `/contractor/incidents`. On mobile expose 3–4 items through simple tabs or a labelled menu (with key `Assign Task` CTA clearly visible); desktop can use a sidebar. No generic Team, Reports or Settings unless actually implemented and documented.

### 3.4 Hospital responder navigation

`Inbox` -> `/hospital-demo`; detail route `/hospital-demo/:id` via incident card. On desktop a very small sidebar/header is acceptable, but the only functional content route is Inbox. No hospital payroll, staff or patient directory.

---

## 4. Onboarding (`/`) — mobile-first

**Purpose:** Let a demo user choose language and role with zero confusion; remember preferences between route switches, do not imply identity security.

**Screen anatomy in order**
1. White brand header: emblem, `BhashaBandhu`, tagline in small text.
2. Short introduction: “Understand work. Speak up for safety.” (localized).
3. Language picker heading: “Choose your language”; three equally sized high-contrast pills: `English`, `हिन्दी`, `বাংলা`. Selector is visible immediately without scrolling on 360×740 where feasible.
4. Role heading “Continue as”; stacked cards with icon + title + one-line purpose:
   - `Construction Worker` — Tasks, safety reporting
   - `Contractor / Site Supervisor` — Assign work, review incidents
   - `Hospital Emergency Responder (Demo)` — Review simulated incident reports
5. Warning info in calm slate/amber strip: `Demo mode: sample users and incidents only. This is not an emergency service.`
6. Persistent bottom `Continue` blue CTA, disabled until role selected; on click enter role home. Do not make role picker a credential/login system.

**Behavior:** language changes static copy instantly and persists per synthetic identity; role selection picks actual synthetic demo identity associated with role/site; if no seeded identity matches selection, explain “Demo account unavailable” with retry, do not invent a user. Reset navigation state when role changes. Use explicit heading and sufficient whitespace as shown in mockup.

**States:** loading demo identities, ready, no identity available, offline/error, continue in progress.

---

## 5. Worker screens — precise functional spec

### W1: Home (`/worker`)

Order: header `BhashaBandhu` + language selector + compact demo identity menu; greeting `Hello, {displayName}` (localized), site descriptor; progress summary **computed from real assigned tasks**; `Today's tasks` section; 2–4 task preview cards (real records); dominant red-outlined or soft-red **Report Incident** CTA within first viewport; small safety reminder **only if curated static copy**, never fabricated personalized safety alerts; bottom worker navigation.

**Task card:** short title in chosen language (fallback rule below), deadline/time if present, site/area, status pill (`Assigned`, `Acknowledged`, `In progress`, `Completed`), tap target -> detail. If 0 tasks show “No tasks assigned yet” + advice to check later, **not an invented task**.

**Counting:** `completed / total assigned tasks` for current date (or all visible tasks if no daily partition; label honestly), computed using backend records and clearly identified date scope. No hardcoded 3/5 or 60%. `Due Today` counts must derive from actual deadline and local date, not `Date.now()`-implied fake server data.

**Primary interactions:** task tap navigates; language change immediately updates UI and content resolution; Report CTA navigates; retry fetch; demo identity switch opens onboarding; no chats or fictional notification bells.

### W2: Task list (`/worker/tasks`)

Heading `My Tasks`; simple segmented tabs `All`, `To Do`, `Completed` (or status chip filters if existing model differs). `To Do` includes assigned/acknowledged/in-progress. Cards show status, title, deadline, site. Sort nearest outstanding deadlines first; completed last or sorted by updated date. Empty/error/loading states separately.

### W3: Task details (`/worker/tasks/:id`)

Order: top back; status; title in chosen language; body instructions without truncation; audio `Listen to instructions` button with accessible name; original-text expandable `<details>`-style panel labelled `Show original ({sourceLanguage})`; date/deadline; site/zone; safety notes if provided (with warning styling only if specifically safety content); bottom CTA.

**CTA state machine** (persisted backend source of truth):
- `assigned` -> `Acknowledge Task` -> `acknowledged` (timestamp saved);
- `acknowledged` -> `Mark Complete` -> `completed` (if backend supports in-progress, allow explicit `Start Task` to `in_progress`, else keep minimal flow);
- `in_progress` -> `Mark Complete` -> `completed`;
- `completed` -> read-only green `Completed` status, no repeated mutation.
- Acknowledged ≠ understood; button and confirmation say only receipt confirmation.

**Translation:** UI static strings from language dictionary; task strings from actual per-language persisted translations. If target translation missing, show labeled original language (`Translation unavailable — showing original`) and optionally `Retry translation` only if endpoint exists; never claim original text is translated. Proper nouns/numbers/time must match source; do not silently rewrite safety instructions. Text-to-speech uses compatible voice only; if none, show an honest modal/toast and keep readable text.

**When server action fails:** restore previous status, show `Couldn't update task. Try again.` No fake green completion.

### W4: Incident reporting (`/worker/report`)

**This is the highest-risk screen: safety and clarity beat decorative fidelity.**

Order:
1. Header/back, title `Report a Safety Incident`, language picker.
2. **Unmissable red direct call banner:** `Urgent emergency? Call 112 now` with `tel:112`, supporting sentence `Submitting this form does not call an ambulance or alert a real hospital.` Must appear before microphone, AI, or required form content and not depend on backend availability. Desktop shows the number plainly and optionally tel link.
3. `What happened?` incident type tiles: **only** `Injury`, `Hazard`, `Unsafe Condition`, `Near Miss`, `Other` (five, not extra harassment category from image). One selected value; each icon + text + visible selected outline.
4. `Where did it happen?` selected permitted fictional site and area/location description. Worker site default from demo identity, editable area text. Do not silently request GPS or populate live hospital/worker coordinates.
5. `How urgent is it?` worker chooses `Low`, `Medium`, `High`, `Urgent`; label `Your assessment (not medical triage)`; default must be unselected or explicitly explained, never AI-decided.
6. `Describe what happened`: tabs/toggle `Record audio` / `Type instead`. A single **editable text transcript/description** holds the confirmed content. Voice capture is a way to fill this field, not a replacement for the review step. Description required.
7. Audio control states: `Idle` -> `Requesting mic` -> `Recording` (recording indicator + timer + `Stop`) -> `Uploading/Transcribing` -> editable `Review transcript` -> `Ready`. Include `Cancel recording`, `Retry`, and `Use text instead`. Limit audio length/bytes per actual API. If microphone permissions denied or API unsupported, display clear text fallback without blocking submission. **No audio playback of stored incident** in MVP unless explicitly implemented with consent/storage; transient local preview is optional only while audio is in memory.
8. Readable preview: show the confirmed original text and optional **clearly labelled unverified machine translation** if precomputed; user can correct text before submit.
9. CTA `Submit Incident` with `Sending...` disabled busy state; on success show server-confirmed incident ID and `Report recorded in BhashaBandhu (demo)` plus navigation to My Reports. Include explicit `This did not contact an emergency service or hospital.`
10. Optional `photo upload` shown in mockup is **OUT**: remove it; do not render an inert camera tile.

**Two-step submit if possible:** audio -> transcript review -> structured report preview -> submit. If time constrained, a single review step with editable source text is sufficient. Persist backend result as the only success condition. Warn on navigation away with unsaved report if practical. Prevent accidental duplicate submissions (idempotency or double-tap guard). Privacy: synthetic demo reports only.

**Cannot claim:** AI diagnosis, automatic “critical” assignment, hospital notified, ambulance on way, emergency accepted. Actual urgent assistance must use direct call, not queue submission.

### W5: My Reports (`/worker/reports`)

List only reports linked to current authorised demo worker. Card: incident type, site/area, time, worker-selected urgency, truncated preview (safe ~2 lines), **demo workflow status**. Status from backend: `Reported`, `Reviewed`, `Acknowledged (Demo)`, `Follow-up (Demo)`, `Closed (Demo)`. If no endpoint for detail, expand card inline to show original report and event timeline; do not create an unimplemented route.

Show banner `Demo tracking only; no external emergency dispatch`. On acknowledgement use wording `Seen by demo responder` rather than `Help is arriving`.

---

## 6. Contractor screens — mobile-first, desktop-enhanced

### C1: Overview (`/contractor`)

Mobile order: logo/top bar + role `Construction Contractor (Demo)`, site context, blue `Assign Task` primary CTA, compact metrics computed from backend (`Assigned tasks`, `Awaiting acknowledgement`, `Open incident reports`), recent tasks, recent incidents. Summary cards stack or 2-column for 360 px only when content readable. Desktop can display 3 metric cards horizontally and task/incident columns.

**No fake charts, fake worker GPS location, imaginary active worker statistics or near-real-time wording unless live backend supports it.** Use `Last updated` and `Refresh` if polling/manual fetch, not “live” unless streaming/subscription genuinely exists.

### C2: Assign Task (`/contractor/tasks/new`)

One-column mobile form in exact order:
1. Page title `Assign New Task` and short instruction.
2. Worker selector (from site's real seeded/persisted allowed demo workers); show their preferred language in label; for MVP **assign to exactly one worker**. Do not imply batch/multi-assign if data model only supports one user per task.
3. Site (default contractor-owned demo site; appropriate picker if several verified), area/zone optional.
4. Task title (required), detailed instructions (required), safety notes (optional), deadline (required if PRD/backing schema enforces; use correct local picker).
5. Source language `English / हिन्दी / বাংলা` (explicit; no hidden guess).
6. Optional `Dictate task` button, same MediaRecorder/STT states as incident recording; if not working, always show typing path. No fake waveform/recordings.
7. `Preview translation` -> calls **real server-side Groq** and shows labelled source + destination language, original and translated title/instructions/safety notes. Include a short warning `Check names, numbers, deadlines and safety wording before assigning.` If preview fails, show error; never save untranslated copy as though translated.
8. `Assign Task` blue CTA active only when required fields valid and required translation preview successfully created (unless worker same source language and explicitly shown). Submit persisted task and show server-confirmed task ID/recipient; navigate Task Tracking.

Use backend-managed per-worker destination language (`en/hi/bn`); don't let contractor send to an invented language. The translation preview matches what the worker sees. Do not build multi-worker distribution unless backend + PRD are explicitly expanded.

### C3: Task Tracking (`/contractor/tasks`)

Mobile: filter chips `All`, `Awaiting response`, `Completed`; each card shows worker, translated/source title context, site, deadline, status, acknowledgement timestamp. Desktop: same data as responsive table or card grid, not a separate state model. Tap card expands source/details (or opens a small sheet) using existing route/data; if no contractor detail route, keep inline. Filters affect real data. Use retry/error/empty states.

### C4: Incident Queue (`/contractor/incidents`)

Header `Safety Reports` + site filter if applicable. Report cards show incident type, reported time, site, area, selected urgency, status and original language. Tap -> `/contractor/incidents/:id`. Detail displays original text, labelled machine-translated English summary, event timeline and a **non-automated** contact note; contractor cannot perform hospital demo acknowledgement. If supported, contractor can mark `reviewed` via real mutation with audit event. Do not show ability to dispatch rescue or alter medical status.

---

## 7. Hospital emergency responder demo — mobile-first + desktop

### H1: Inbox (`/hospital-demo`)

**Persistent prominent warning directly under header**: `SIMULATION ONLY — Reports are not delivered to a real hospital or emergency service. No ambulance is dispatched.` Not dismissible into invisibility. Show role label `Hospital Emergency Responder (DEMO)`, not `Hospital Manager`.

Incident cards from same backend as contractor: incident type, site, time, worker-selected urgency labelled `Reported urgency`, reporter language, current demo status, `View report` CTA. Filters `All`, `New`, `Acknowledged`, `Closed` only if statuses can be mapped correctly; optional. Do not add hospital name/clinical team or claim nearest hospital. No patient clinical profile.

### H2: Incident detail (`/hospital-demo/:id`)

Top anchored warning and heading. Show in this order:
1. `Reported incident` summary; report ID and time.
2. `Original worker report` with language tag (`English`, `हिन्दी`, `বাংলা`) and source text; preserve as reported.
3. `English translation (AI-generated; verify details)` showing real translated text; **do not** infer confirmed diagnosis.
4. Worker-selected incident category/urgency, construction site/area, site contact route with synthetic demo content. No invented telephone numbers.
5. Status timeline from persistent `incident_events` or existing audit representation.
6. Contextual CTA by state: `Acknowledge (Demo)` for eligible reported/reviewed report; then `Mark follow-up (Demo)` when supported; then `Close report (Demo)` when supported. Only show supported transitions, disable duplicate actions during mutation.
7. Post-success message `Acknowledgement saved in demo system. No external hospital was contacted.`

No source-audio playback unless opted-in stored audio actually exists and privacy controls permit it. Do not display a fake audio bar from mockup.

---

## 8. Language, translation and voice rules

### 8.1 Always available UI language

- Locale IDs only: `en`, `hi`, `bn`. Display labels: `English`, `हिन्दी`, `বাংলা`.
- Set `<html lang>` correctly and appropriate text `lang` attribute on multilingual source/translated spans. LTR for all three; do not invent RTL support.
- Static app chrome localized by curated JSON/TypeScript dictionaries, at minimum: brand helper text, onboarding, role labels, tabs, tasks, progress/status, date labels, input labels/errors, emergency warning, report workflow, translations, voice-state messages, contractor form/buttons, hospital demo disclaimer and statuses.
- Avoid mixing English scaffolding around Hindi/Bengali beyond proper nouns and site names as needed. Keep safe Indic Unicode rendering, no manually added glyph spacing.
- Localize timestamps/numbers where possible using `Intl.DateTimeFormat`, using an explicit India timezone if demo site is in India; preserve exact deadline instant stored in database. Never transform absolute deadlines by reinterpreting timezone.
- If a static locale key is missing in development, log/report it; don't use invented machine-generated UI copy. Fall back to English **with a visible dev warning**, and track as defect prior to delivery.

### 8.2 User-generated text translation

- Groq used only server-side for user-generated task instructions/incident text. Store source text plus translation(s) as specified by existing backend schema.
- Preserve all numbers, locations, measurement units, dates and uncertainty; show original whenever safety-related text appears. No silent rewrite/correction of worker testimony.
- If translation missing or fails: show a distinct **translation unavailable** state, leave source visible, allow task retry or typed incident submission; never label original as translated.
- If source locale and target locale match, render source directly and label it `Original ({lang})` instead of wasting an AI call.

### 8.3 Audio

- Speech input: browser `MediaRecorder` -> secure backend upload -> Groq STT -> editable returned transcript. If service/mic is missing, don't fabricate speech-to-text; show `Type instead`.
- Task read-aloud: browser `speechSynthesis`, choose compatible locale voice `en-IN`/`hi-IN`/`bn-IN` (or suitable base voice); if none available explain text-only mode. Expose Play/Pause/Stop only when supported; don't use a visible `play` control that silently does nothing.
- Recording consent is explicit: initiate only after user taps `Record audio`. Show red recording state, elapsed timer and stop button; never auto-record on page load.
- Do not persist raw audio in database or storage by default; optional short-lived local preview is clearly labelled and discarded.

---

## 9. Real data, back-end boundary, and states

### 9.1 Field names/UI mapping (align with TRD; adapt only to verified schema)

| UI object | Essential fields | Source |
|---|---|---|
| Demo identity | `id`, `display_name`, `role`, `preferred_language`, `site_id` | Verified backend or controlled synthetic seed |
| Task | `id`, `title_original`, `instructions_original`, `source_language`, `translations_json`, `deadline_at`, `status`, `acknowledged_at`, `completed_at`, `assigned_to_user_id`, `site_id`, `safety_notes_original` | Persistent PostgreSQL |
| Incident | `id`, `reporter_user_id`, `site_id`, `incident_type`, `reported_urgency`, `original_text`, `english_translation`, `location_description`, `status`, `created_at` | Persistent PostgreSQL |
| Incident timeline | `incident_id`, `event_type`, `actor_user_id`, `from_status`, `to_status`, `created_at` | Persistent PostgreSQL |

**Never** construct counts, recipients, acknowledgements or report status from hardcoded frontend objects in production/demo mode. Real demo data may be seeded **once into database**, clearly marked fake, and then read via normal flows. Demo role switching must operate on those records, not silently swap to unrelated local mocks. Session/demo identity approach must be constrained and consistent with TRD; no assumption that a role selector is authentication.

### 9.2 Minimum user-visible state matrix (applies to each mutation/query)

| State | Exact behavior |
|---|---|
| Loading | Skeleton/compact spinner + descriptive status; not blank screen |
| Empty | Friendly explanation and relevant next action; no fake records |
| Validation error | Inline field-level copy, focus first invalid field |
| Network/server error | Specific failure banner + `Retry`; preserve unsent user text |
| Groq failure | State `Translation/Transcription unavailable`; typed original still possible where specified |
| Microphone denied/unsupported | Clear permission/compatibility explanation; `Type instead` immediately |
| No matching speech voice | Text retained; no silent broken sound |
| Submitting | Disable repeat submit; show spinner/label `Saving…` |
| Success | Confirm **only after server mutation success**; show durable ID/status |
| Refresh | Re-query persistent storage; do not regress status to seeded data |
| Lost connectivity | Explicit offline notice; no false “sent” badge |
| Missing/unauthorized record | `Not found or not available to this demo account`; safe navigation back |

### 9.3 Status labels (exact semantic mappings)

Task `assigned` -> `Assigned`; `acknowledged` -> `Acknowledged`; `in_progress` -> `In Progress`; `completed` -> `Completed`. Avoid `Received` as a separate backend state unless supported.

Incident `reported` -> `Reported`; `reviewed` -> `Reviewed`; `acknowledged_demo` -> `Acknowledged (Demo)`; `follow_up_demo` -> `Follow-up (Demo)`; `closed_demo` -> `Closed (Demo)`. In all role views, hospital statuses remain explicitly demo. Distinguish reporter-selected urgency from verification.

### 9.4 Interaction integrity

- All buttons/links/filters/tabs work. If feature is OUT, remove it rather than display a dead control.
- After a mutation, revalidate backend source and update all role views on refresh. If realtime subscription not implemented, do not promise instantaneous push; manual refresh/polling is acceptable and labelled accurately.
- One task -> one worker for MVP. One incident -> one persisted report visible to permitted contractor and demo responder. One responder acknowledgement -> durable audit event. Duplicate acknowledgement is idempotent.
- Never expose Groq, Gemini or SQL database secrets in client bundle. Never query raw Postgres from browser with credentials; follow verified connector/server implementation from TRD.

---

## 10. Responsive behavior by breakpoint

**Target viewports:** 320, 360, 390, 430, 768, 1024, 1440 CSS px. Test 360×740 and 390×844, desktop 1366×768; no horizontal page scrolling on primary flows.

| Width | Layout | Navigation | Cards/actions |
|---|---|---|---|
| 320–430 | Single vertical content column, 16 px page padding | Worker fixed 4-item bottom nav; contractor/responder compact top menu | Full-width CTAs, tiles 2-up only if ≥44 px targets and labels fit; incident types may 2-column or vertical |
| 431–767 | Single column max-width container | Same as above | More breathing space, still mobile-first |
| 768–1023 | Content up to ~860 px | Worker nav remains easy; contractor/responder compact header or sidebar if it fits | Two-column metrics where readable; forms still one column or 2 short fields |
| ≥1024 | Centered wider layout | Contractor/responder fixed sidebar + top bar; worker remains focused centered app column with accessible navigation | Overview cards 3-across, task/incident list can become table if legible |

Sticky CTAs must not conceal inputs when software keyboard opens. Form sheets should scroll to focused field. Use `min-width:0` for flex/grid children containing Bengali/Hindi. Respect `env(safe-area-inset-bottom)` and browser address bars. Prefer responsive CSS over device sniffing; support touch and mouse/keyboard.

---

## 11. UI copy and microcopy — controlled examples

The strings below are examples for frontend language dictionaries, **not** backend demo records or claims that any call happened. Translation should be checked by a fluent speaker prior to production; preserve local clarity over word-for-word consistency.

| Key | English | Hindi | Bengali |
|---|---|---|---|
| `chooseLanguage` | Choose your language | अपनी भाषा चुनें | আপনার ভাষা বেছে নিন |
| `continue` | Continue | आगे बढ़ें | এগিয়ে যান |
| `worker` | Construction Worker | निर्माण श्रमिक | নির্মাণ শ্রমিক |
| `contractor` | Contractor / Supervisor | ठेकेदार / पर्यवेक्षक | ঠিকাদার / তত্ত্বাবধায়ক |
| `myTasks` | My Tasks | मेरे काम | আমার কাজ |
| `reportIncident` | Report Incident | घटना की सूचना दें | ঘটনার খবর দিন |
| `listen` | Listen | सुनें | শুনুন |
| `acknowledge` | Acknowledge Task | काम मिलने की पुष्टि करें | কাজ পাওয়ার বিষয়টি নিশ্চিত করুন |
| `markComplete` | Mark Complete | काम पूरा हुआ | কাজ শেষ হয়েছে |
| `typeInstead` | Type instead | लिखकर बताएं | লিখে জানান |
| `submitReport` | Submit Report | रिपोर्ट भेजें | রিপোর্ট জমা দিন |
| `myReports` | My Reports | मेरी रिपोर्ट | আমার রিপোর্ট |
| `demoOnly` | Simulation only — no emergency service is contacted | केवल डेमो — किसी आपातकालीन सेवा से संपर्क नहीं किया जाता | শুধুমাত্র ডেমো — কোনো জরুরি পরিষেবার সঙ্গে যোগাযোগ করা হয় না |
| `call112` | Urgent help? Call 112 now | तुरंत मदद चाहिए? अभी 112 पर कॉल करें | জরুরি সাহায্য দরকার? এখনই ১১২-তে কল করুন |

**Critical:** A success toast must say `Report saved in demo system` / `टेस्ट सिस्टम में रिपोर्ट दर्ज हुई` / `ডেমো সিস্টেমে রিপোর্ট সংরক্ষিত হয়েছে`, **not** `Hospital informed`, `Help is on the way`, or `Ambulance dispatched`. Keep phone link numeric `112` even when localized UI renders digit variants.

### 11.1 Fictional test journeys (test fixture examples, not UI constants)

- Worker A (Hindi) receives `Finish tiling on the second floor by 8 PM. Wear safety shoes.` from demo contractor; app shows independently generated Hindi translation, source toggle, deadline, acknowledge.
- Worker B (Bengali) receives a different construction task to demonstrate third locale; app shows independent Bengali translation and exact source, with optional audio where voice supported.
- Worker A submits a **synthetic** fall incident in Hindi, selects `Injury` and `Urgent` themselves, corrects transcript before saving; contractor queue and hospital **demo** inbox both show the same persistent ID and English translation; demo responder acknowledges; worker sees `Acknowledged (Demo)` after refresh.
- All names/sites are fictitious and must be seeded in backend or provided by existing dataset; **never substitute clinical patients or real hospitals**.

---

## 12. Accessibility & trust requirements

- Semantic headings H1/H2/H3, label/input associations; meaningful keyboard focus and screenreader names on mic/speaker controls.
- WCAG-oriented color contrast: ≥4.5:1 for normal text whenever feasible, color+text status, accessible focus and disabled states. Avoid gray-on-white tiny caption for essential safety details.
- Language selection and emergency call reachable without long scroll or complex menu; red CTA readable and not overshadowed by other calls to action.
- Important instructions preserve full source and target text; no auto-dismiss of emergency warnings. Errors are specific and corrective.
- Do not collect precise location automatically or request camera permission. No raw audio retention in MVP; treat incident descriptions as sensitive even when using synthetic demonstration data.
- Respect user-selected urgency and do not turn AI summary into medical diagnosis. Provide disclaimer that machine translation may be inaccurate.
- No fake contact details, facility availability, clinical notes or anonymous reporting guarantee.

---

## 13. Acceptance tests / visual and functional QA matrix

Use real browser checks, not self-reported implementation status. Mark `PASS/FAIL/BLOCKED` with screenshot or log for each.

| ID | Scenario | Expected result |
|---|---|---|
| D01 | Open 360 px mobile viewport | All content within width; bottom nav visible; no clipped Hindi/Bengali text |
| D02 | Open 320 px viewport | Critical CTA and controls usable; no horizontal overflow |
| D03 | Switch EN -> HI -> BN | Curated UI labels update and correct scripts render; choice persists |
| D04 | Onboarding role switch | Exactly 3 role cards; routes correct; demo warning present |
| D05 | Contractor assigns English task to Hindi worker | Translation preview is real, persistent, visible on worker detail |
| D06 | Worker task original toggle + audio | Original matches source; supported TTS speaks text or honest unavailable message |
| D07 | Worker acknowledges then completes | Two distinct successful backend states; survive reload; contractor sees updated state |
| D08 | Worker report text-only | Required fields validate; report persists with ID and original text |
| D09 | Worker voice transcription | Real recording/transcription when available; editable review; denial switches to typing |
| D10 | Urgent emergency call | `Call 112` visible before processing; no dispatch claim |
| D11 | Contractor incident queue | Same report visible with correct worker-selected urgency/translation |
| D12 | Hospital demo inbox/detail | Simulation warning remains visible; original and English translation shown |
| D13 | Responder acknowledges | Backend event timestamp persists and appears in worker/contractor views |
| D14 | Force API failure | Error + retry, user data preserved, no false success |
| D15 | Narrow + desktop regression | 360/390/768/1366 px views function; no blank/inert navigation |
| D16 | Audit visual UI | BhashaBandhu everywhere; no FairShift, fake map/photo, hospital manager or unsupported buttons |
| D17 | Secure frontend bundle | No `GROQ_API_KEY`, Gemini secret, SQL password or private key in client assets |
| D18 | Cloud Run live URL | Reloading nested routes works; server API + persistent database flow tested |

All P0 workflows must pass before spending time on wages, visual polish, installation prompts or decorative illustrations.

---

## 14. Component inventory (implement these, not a speculative design system)

- `AppShell` (responsive header/navigation/site roles)
- `BrandHeader` (text wordmark + simple generated icon)
- `LanguagePicker` (controlled `en | hi | bn`)
- `RolePicker` (three cards)
- `WorkerBottomNav` (four correct destinations)
- `ContractorNav` / `ResponderNav` (same responsive semantics)
- `TaskCard` / `TaskStatusBadge` / `TaskDetailPanel`
- `TranslationPreview` / `OriginalTextDisclosure`
- `SpeechRecorder` (permission/recording/upload/error states)
- `SpeakButton` (supported-voice fallback)
- `IncidentTypeSelector` (five allowed categories)
- `UrgencySelector` (worker-reported values)
- `EmergencyCallBanner` (accessible anchor `href="tel:112"`)
- `IncidentCard` / `IncidentTimeline` / `DemoSimulationBanner`
- `FormField` / `InlineError` / `EmptyState` / `LoadingState` / `RetryError`
- `ConfirmActionButton` (only after backend success)

Component names may match repository conventions; behavior and responsibility must match. Prefer built-in labels over bespoke UI packages if that saves time.

---

## 15. Coding and handoff requirements for Antigravity

1. First output a **design reconciliation table**: `Requirement | PRD/TRD section | planned screen/component | status | blockers`. Explicitly flag any ambiguous database/SDK setup.
2. Then output a **route map**, **component tree**, **locale key inventory**, **state machine summary**, **mobile breakpoint plan** and **backend endpoints actually found**. Do not invent endpoint names or schemas: use TRD conceptual API as a proposal only until implemented/verified.
3. Implement in phases: (A) shell/localization/role demo onboarding; (B) task create/translate/read/ack; (C) incident typed/voice; (D) hospital demo queue/ack; (E) responsive QA and deploy. Each phase ends with a real browser/API test.
4. Do not rewrite PRD/TRD silently. If scope conflicts, note it in `docs/implementation-gaps.md` (or a concise in-chat report) and take the most restrictive safety-preserving interpretation.
5. Avoid installing oversized dependencies, external images/fonts or fake data frameworks. Do not commit reference mockup image to public repository if doing so risks hackathon size limit; developer can attach image separately.
6. UI must match the *spirit* of the supplied image, not its fictional sample content. Prioritize correct functionality, simple mobile layout and safe disclaimers over pixel-perfect mockup reproduction.
7. Produce a post-build checklist with verified tests (PASS/FAIL/BLOCKED), unimplemented P1 items, actual Cloud Run URL only if deployed, and any unresolved configuration needs. **Never claim passed tests without execution or connected APIs without verification.**

---

## 16. Definition of done

BhashaBandhu is ready to demonstrate when a 360 px phone can (a) choose one of three languages, (b) switch to one of three permitted demo roles, (c) see and acknowledge a translated construction task created by contractor, (d) submit a synthetic incident using editable text or real supported audio transcription, (e) see it in both contractor and hospital **demo** queues, and (f) watch a simulated hospital responder acknowledgement persist across reloads—all with clear warning that **no real emergency service was contacted**. The same app remains usable at desktop width; no screen is a static screenshot or a dead-end demo.
