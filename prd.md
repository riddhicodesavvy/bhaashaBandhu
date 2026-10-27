# BhashaBandhu — Product Requirements Document (PRD)

**Version:** 2.0 — final agreed hackathon scope  
**Product:** BhashaBandhu — *Your Language. Your Safety. Your Voice.*  
**Delivery:** mobile-first responsive web app / installable PWA as stretch; deploy on Google Cloud Run  
**Languages:** English (`en`), Hindi (`hi`), Bengali/Bangla (`bn`)  
**Primary workplace:** construction  
**Healthcare component:** hospital emergency responder **DEMO only**, not hospital staff management

## 1. Product goal and guardrails

Help a migrant construction worker understand assigned work, communicate safety incidents in their preferred language, and let a contractor and simulated hospital responder receive accurate, reviewable, status-tracked reports. Optimize for phone screens, low reading burden, understandable icons, large controls and working end-to-end flows rather than impressive but fake interface widgets.

**Non-negotiable:** no real hospital notification, ambulance dispatch, location-based availability claim or autonomous medical triage. All emergency workflow screens must visibly identify the responder portal as a demonstration and offer direct emergency-call guidance without AI dependency.

## 2. Exactly three roles

| Role | Audience | Main capabilities | Explicit exclusions |
|---|---|---|---|
| Worker | Construction labourer, mason, tiler, helper | Preferred language; assigned task list/detail; listen to task; acknowledge and mark complete; report hazard/accident via voice or text; view own reports; optional wage summary | Cannot assign others' work or access other workers' reports |
| Contractor / Site Supervisor | Construction contractor, foreperson, safety officer in demo | Create/translate/assign tasks; view task statuses; view site incident queue; maintain synthetic wage entries as stretch | No hospital support-staff management |
| Hospital Emergency Responder (DEMO) | Simulated receiving hospital desk | View construction-site incident handover in translated English; inspect original language/transcript; acknowledge/follow up/close demo report | **Cannot dispatch an ambulance, contact a real hospital or represent clinical confirmation** |

No fourth role. No hospital manager. No hospital worker task list.

## 3. Navigation and screen inventory

### Shared onboarding
- Choose interface language: **English / हिन्दी / বাংলা**; preference remembered for that demo identity.
- Choose one of the three roles with distinct, labelled cards.
- Display demo-mode notice. Role selection is for demonstration only, **not authentication**; restrict to synthetic data and deploy with appropriate demo access controls.

### Worker — mobile-first
1. **Home:** greeting, today’s assigned tasks, status counts, urgent `Report Incident` action, clear bottom navigation.
2. **My Tasks:** assigned / acknowledged / completed segments, deadline, site, safety notes.
3. **Task Details:** translated title/instructions, original-text toggle, speaker button, deadline, `Acknowledge` and `Mark Complete` controls.
4. **Report Incident:** `Call 112` link at top, category selection (`injury`, `hazard`, `unsafe_condition`, `near_miss`, `other`), optional audio record, required description (transcript or typed), editable review, site/location, user-selected urgency, submit.
5. **My Reports:** report statuses and demo acknowledgement timestamps. **Avoid `help on the way` language.**
6. **My Wages (stretch):** daily rate, attendance, overtime, deductions, estimated amount and dispute flag, clearly indicating demo/unverified values.

### Contractor — responsive mobile/desktop
1. **Overview:** assigned tasks, pending acknowledgements, recent incidents.
2. **Assign Task:** text or microphone dictation; title, instructions, worker, site, deadline, source language, safety note; translation preview; submit.
3. **Task Tracking:** worker task status and acknowledgement timestamp; filters.
4. **Incident Queue:** site filter and view report detail, original language, translated summary and audit status.
5. **Wages (stretch):** simple synthetic attendance/pay entries and dispute tracking.

### Hospital responder — responsive desktop/mobile
1. **Simulated Inbox:** clearly visible `SIMULATION — no hospital/ambulance dispatched` banner; incident cards with reporter language, incident type, site, timestamp and worker-selected urgency.
2. **Incident Detail:** original transcript, English translation, site/location text, contact route, timestamp, status timeline; optional source-audio playback **only if explicitly supported and stored with consent**; MVP stores transcript only.
3. **Acknowledge Demo:** status transitions and a durable timestamp; allow `Follow Up` / `Close Demo` labels but never `Dispatched`.

## 4. Core capability F1 — multilingual assignments (P0)

**Story:** Contractor creates a task in one supported language; a worker sees a translated copy in their chosen language and can listen to it.

**Requirements**
- Contractor input may be English, Hindi or Bengali; source locale explicit or accurately detected with override.
- Worker receives task in preferred locale. Show original text on demand.
- Translation via server-side Groq text API; protect meaning of numbers, deadlines, names, locations and safety instructions. Preview translations before publishing where possible.
- App UI labels use vetted static translation dictionaries; AI is used for user-generated content only.
- Browser speech synthesis (`en-IN`, `hi-IN`, `bn-IN` where supported) plays worker-facing text, with an unavailable-voice message and text fallback.
- Worker acknowledgement and completion are separate states and persist after refresh. An acknowledgement confirms receipt, **not comprehension**.
- Only assigned worker and appropriate site supervisor can access task.

**Acceptance test:** Contractor assigns English task to Hindi worker; Hindi task appears after refresh; worker acknowledges; supervisor sees change. Repeat with Bengali worker to verify the third language.

## 5. Core capability F2 — accessible safety/accident reporting (P0)

**Story:** Worker reports a construction site incident using their own voice or typed message.

**Requirements**
- Large red `Report Incident` action available on worker dashboard.
- Prominent `Call 112` link available **before recording or submitting**; use `tel:112` on mobile and plain guidance when calling unsupported.
- Worker selects category, site/location description and urgency; urgency is *worker-selected*, not diagnosis.
- Browser microphone recording with `MediaRecorder` where supported; send short audio to server-side Groq STT; handle denial, unsupported browser, upload limit and failed transcription.
- Display editable transcript and a translated/structured draft for review; do not replace original text. Type-to-report remains available throughout.
- Save incident with source language, original text, translation, category, site, user-selected urgency, creation time and reporter demo identifier.
- Show clear submission result; never claim that simply saving an incident contacted a hospital.

**Acceptance test:** Worker dictates a short Hindi report; edits transcript; submits; incident appears with translated English in contractor and demo responder queues. Text-only fallback passes the same workflow.

## 6. Core capability F3 — simulated emergency handover (P0)

**Story:** Demo hospital responder can review and acknowledge a construction accident report.

**Requirements**
- Worker incident appears in contractor queue and simulated hospital responder inbox from the same persistent record.
- English structured summary clearly distinguishes worker statements from verified facts (e.g. `Reported: worker fell`; never `Confirmed fracture`).
- Support original-language text, source language, time, site, location text and site contact route (demo data only).
- Demo responder can acknowledge, mark follow-up and close a demo incident; each state mutation persists, records actor/timestamp and is reflected in worker/contractor views.
- Visible disclosure `SIMULATION ONLY — NOT DELIVERED TO A REAL HOSPITAL OR EMERGENCY SERVICE` on inbox, detail and confirmation.
- Do not imply nearby hospitals were discovered; real hospital directory/integrations are out of scope.

**Acceptance test:** Submitted synthetic incident becomes visible in responder inbox; responder acknowledges; worker and supervisor see `Acknowledged (Demo)` after refresh. No external message is sent.

## 7. Wage transparency — explicitly P1 / stretch

Wage misunderstanding was part of the original problem. Add **only if P0 workflows and Cloud Run deployment are complete**:
- Worker-readable synthetic daily rate, days worked, overtime hours, payment entries and deductions.
- Show formula and an estimated total; clearly distinguish recorded vs agreed values.
- Contractor may enter or update entries, with edit history if feasible.
- Worker can flag a discrepancy. Do not promise financial verification, payroll execution or legal compliance.

If not built, describe it as a **roadmap item**, not a demo feature.

## 8. Visual design system and responsiveness

**Reference:** previously generated FairShift concept screens are *visual inspiration only*. Rebrand fully as **BhashaBandhu**; do not copy inconsistent sample data, dates or false statuses.

- Visual language: calm blue `#2563EB`, teal `#10B981`, warning amber `#F59E0B`, critical red `#EF4444`, navy text `#111827`, light surface `#F3F4F6`.
- Typography: Inter or similar, good Indic-script font fallback (system Devanagari/Bengali fonts); minimum readable body size about 16 px on mobile.
- Minimum 44×44 CSS px interactive tap target where practical; labelled icons, focus outlines, accessible contrast.
- Worker app uses bottom navigation and one-column cards on 320–430 px screens; contractor/responder use a collapsible sidebar or tabs on small screens and structured desktop panels on large screens.
- Persistent language selector accessible from every main role view.
- Show loading, retry, error, empty and confirmation states. No inert buttons or fabricated success messages.
- Keep translation editable and offer original-language toggle; do not silently rewrite safety content.
- Favor plain-language Hindi/Bengali labels and short sentences, not machine-translated technical jargon.

## 9. Realistic demo identities and data

Seed **synthetic** construction workers with `en`, `hi`, `bn` preferences, one synthetic contractor, one demo hospital responder, 1–2 fictitious construction sites, sample tasks and sample incidents. Avoid actual hospital names, phone numbers, location coordinates and clinical data. Seed/demo records should be explicitly identified as synthetic.

## 10. Non-functional requirements / controls

- Data is persistent; role views reflect committed backend state rather than local hardcoded arrays.
- Groq/Gemini keys never sent to client. Audio is processed transiently and not stored by default.
- Validate inputs and attachment sizes; restrict site/role operations on server.
- Since a selectable demo role is not genuine authentication, use **synthetic-only data**, ideally restrict deployed demo access and document that it is not production ready.
- Prevent HTML/script injection, arbitrary database operations and unbounded translation API calls.
- Handle microphone-denied, AI-timeout, unavailable Indic TTS voice, network loss and submission retries without false success.
- Accessibility testing on narrow screens and desktop keyboard use.

## 11. Acceptance checklist

- [ ] Language selector works for English, Hindi and Bengali on mobile.
- [ ] Worker, contractor and hospital responder demo are the **only** three roles.
- [ ] Contractor assigns task; worker sees real translated text and source; acknowledgement persists.
- [ ] Browser audio dictation actually transcribes via Groq OR text fallback remains functional with honest error state.
- [ ] Incident stored and correctly appears in both downstream queues.
- [ ] Demo responder acknowledgement persists and is visible to worker and contractor.
- [ ] `Call 112` is visible without waiting for AI or submitting.
- [ ] Simulation disclaimer appears wherever hospital workflow is shown.
- [ ] No fake claims of dispatch, nearby hospitals or medical diagnosis.
- [ ] App is usable at ~360 px and on desktop.
- [ ] Cloud Run live URL tested; GitHub and LinkedIn submission artifacts ready.

## 12. Build sequence (120-minute plan)

| Minutes | Output |
|---|---|
| 0–15 | Verify existing Firebase PostgreSQL / SQL Connect setup; scaffold; secure env |
| 15–45 | Database models + task create/list/acknowledge + worker and contractor screens |
| 45–70 | Groq translation, report form and voice/text fallback |
| 70–85 | Demo responder inbox + durable status updates |
| 85–100 | Multilingual UI, mobile usability, error/safety disclosures, E2E tests |
| 100–115 | Cloud Run deploy + smoke test |
| 115–120 | Repo <10 MB where required by hackathon, one branch, LinkedIn post and three links |

**Fallback:** If SQL Connect is not ready, avoid secretly switching to a second database. First use a compatible already-provisioned database; otherwise explicitly document the blocker and agree on a revised approach. If time slips, omit wage dashboard, audio persistence, photo attachments, PWA install banner and nonessential charting before sacrificing the core workflows.

## 13. Judge demo script

1. Choose Contractor and assign a tiling task in English to Hindi-speaking construction worker.
2. Switch to Worker, hear translated instructions, show original, acknowledge.
3. Report synthetic injury in Hindi by audio or text, review transcript and point out visible `Call 112` link.
4. Switch to `Hospital Emergency Responder (DEMO)`, show original/English handover, acknowledge.
5. Return to contractor/worker to prove durable cross-role status; switch language to Bengali to demonstrate localization.

**Industry-scope caveat:** Healthcare is an emergency-response partner in this version, not a second workforce management implementation. If the official hackathon assessment insists on two complete workplace industry use cases, this MVP requires expansion before it can claim full compliance.
