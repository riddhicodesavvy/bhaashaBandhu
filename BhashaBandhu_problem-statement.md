# BhashaBandhu — Problem Statement

**Tagline:** Your Language. Your Safety. Your Voice.  
**Project type:** Mobile-first multilingual workforce safety and emergency handover web application  
**SDG alignment:** SDG 8 — Decent Work and Economic Growth; in particular Target 8.8 (safe and secure working environments, including migrant workers).  
**Industries involved:** (1) Construction — primary workplace and workforce-management use case; (2) Healthcare — hospital emergency-response coordination, **not hospital workforce management**.  
**Prototype status:** Hackathon demonstration; the hospital portal does not contact real hospitals or dispatch ambulances.

## 1. Background

India's construction sites employ interstate migrant workers, including people who travel from Bihar, West Bengal, Uttar Pradesh, Jharkhand, and other regions to southern states for work. Workers, contractors and local service providers may not speak the same language. Instructions and wage arrangements frequently depend on verbal explanations; safety information can be difficult to understand in a stressful, noisy environment. Workers may also have limited literacy or access only to low-cost smartphones.

The language barrier can affect more than convenience: it can make it harder to understand work assignments and safety precautions, check wage or overtime records, report hazards, and request help when someone is injured. An intermediary may sometimes assist with communication or recruitment, but opaque arrangements may also leave workers unable to independently verify what was promised or paid. The platform should not assume that all intermediaries engage in abuse; the goal is verifiable, direct communication.

When an accident occurs at a construction site, the worker reporting it may be unable to explain what happened to a contractor or healthcare responder in a shared language. Poorly structured handovers can omit crucial details such as site location, what was observed and how to contact the responsible site person. **BhashaBandhu does not attempt medical diagnosis, automatically infer clinical severity or replace emergency services.**

## 2. Core problem statement

**How might we help construction workers who speak different languages understand their work, document wage-related information, and safely report hazards or accidents — while allowing contractors to communicate clearly and enabling a hospital responder to review a translated emergency handover — through a simple, voice-friendly mobile-first application?**

BhashaBandhu initially supports **English, Hindi and Bengali (Bangla)** for both interface labels and user-created content. Its MVP integrates a **construction worker**, **construction contractor/site supervisor**, and **hospital emergency responder (simulation only)**.

## 3. Problems to address

### A. Construction workers

| Problem | Example scenario | Intended response |
|---|---|---|
| Unclear assignments | Contractor explains tiling work in English; a Hindi-speaking worker misunderstands the deadline | Written and spoken task in worker's preferred language, showing deadline and source instruction |
| Misunderstood safety instructions | PPE instruction is missed during verbal briefing | Translated safety notes with audio playback and confirmation |
| Work errors and disputes | Different people remember different instructions | Timestamped task record and worker acknowledgement |
| Wage ambiguity | Worker cannot verify daily rate, attendance, overtime or deductions | Readable worker wage summary with clearly labelled sources and disputed amounts |
| Dependence on intermediaries | Worker cannot independently confirm payment terms | Direct access to recorded wage information and contractor contact details |
| Difficult incident reporting | Injured or distressed worker cannot type or communicate in contractor's language | Large incident-report action, audio capture, editable transcription and text alternative |
| Reticence to raise concerns | Worker fears losing work after raising a safety issue | Simple reporting workflow; confidentiality and anonymous reporting are **not promised** in MVP |
| Low literacy or limited devices | Long forms and tiny buttons discourage use | Large targets, icons plus labels, minimal steps, mobile-first design |

### B. Contractors / construction supervisors

| Problem | Example | Intended response |
|---|---|---|
| Repeated translation | Contractor repeats instructions individually across language groups | Enter or dictate once; produce per-worker language versions |
| Missing proof of understanding | Worker receives an instruction but has not confirmed it | Task acknowledgement status; acknowledgement is not proof of comprehension |
| Fragmented reports | Safety incidents are reported through informal verbal chains | Common incident queue with original account and translation |
| Unclear progress | Contractor cannot tell which work was received or completed | Assigned, acknowledged, in-progress and completed statuses |
| Wage disputes | Agreed rates and deductions are poorly recorded | Simple itemised wage ledger and dispute flag (if included in MVP stretch scope) |

### C. Healthcare / emergency response interface

| Problem | Example | Intended response |
|---|---|---|
| Language mismatch | Worker reports in Bengali but responder reads English | Preserve original report plus translated summary |
| Missing handover details | Message lacks site, timestamp, incident category | Structured report containing site, location description, reporter contact route and time |
| No status visibility | Contractor cannot tell whether a demo responder opened the report | Timestamped demo acknowledgement visible to other roles |
| False assumptions about alerts | User assumes an in-app report automatically summons an ambulance | Persistent **SIMULATION ONLY** disclaimer and a prominent direct emergency-call option |

**Boundary:** Healthcare is represented by the **hospital emergency responder** receiving *simulated* construction incident handovers. There is no hospital supervisor, hospital staff task assignment, hospital payroll or hospital workforce-management portal. If hackathon rules require two independent workplace-management industry implementations, this narrower scope **may not satisfy that criterion**; confirm the judging interpretation before submission.

## 4. Proposed solution

BhashaBandhu is a **responsive progressive-web-app-style experience**, built mobile-first but usable on desktop. Three clearly separated roles share a backend:

1. **Construction worker:** chooses English/Hindi/Bengali; views translated assigned tasks; listens to instructions; acknowledges/completes tasks; reports hazards/accidents by text or voice; optionally views wage entries.
2. **Construction contractor / site supervisor:** creates tasks by typing or dictation; assigns to workers; previews translations; tracks task progress and incident reports; optionally records wages.
3. **Hospital emergency responder (DEMO):** sees simulated incident handovers, original and translated report, site and contact instructions; acknowledges and closes demonstration incidents. **No external notification or dispatch occurs.**

When speech is used, a server-side Groq speech-to-text model converts supported recordings into editable text; a server-side text model translates and produces a structured handover. Original text remains visible because automatic translation can be incorrect. Workers can always type instead. If a serious injury is suspected, the interface prominently suggests contacting local emergency services **immediately** rather than waiting for any AI step.

## 5. Example end-to-end journey

1. A contractor creates the English task: “Finish second-floor tiling by 8 PM. Wear safety shoes.”
2. A Hindi-speaking worker sees a translated task, can listen to it and acknowledges receipt.
3. The worker witnesses a fall and reports it in Hindi via a recorded audio clip or text.
4. The app shows an editable transcript and an immediate **Call 112** action for urgent help.
5. On submission, the contractor incident queue and **simulated** hospital inbox display a structured translated report.
6. A demo hospital responder acknowledges the report; the persisted acknowledgement is visible across roles. This **does not mean a real hospital was informed**.

## 6. Impact hypothesis and evaluation

BhashaBandhu aims to improve access to comprehensible instructions, transparency of work records, accessibility of safety reporting and clarity of incident handovers. These are **intended benefits, not established outcomes**. The prototype can demonstrate: three-language content; one construction task acknowledged across roles; one voice or text incident saved and translated; one demo responder acknowledgement persisted; and usability on a ~360 px mobile viewport.

Longer-term evaluation would examine instruction-understanding accuracy, task clarification rates, reporting completion, translation corrections and emergency handover completeness with real users and appropriate permissions.

## 7. Hackathon constraints and honest limitations

- **Delivery window:** approximately two hours of AI-assisted implementation.
- **Deployment:** Google Cloud Run; public GitHub repository and public LinkedIn post are separate hackathon submission deliverables.
- **Data:** synthetic test workers, sites, wages and incidents only. Do not use real patient data or real emergency claims.
- **MVP first:** three working workflows — multilingual tasks; worker voice/text incident reporting; simulated hospital handover and acknowledgement. Wage ledger is valuable but optional if time is tight.
- **Integration:** Groq for speech/translation; existing Firebase project `sdg8-4fca4`; PostgreSQL via Firebase SQL Connect **only after the actual service, connector and generated SDK are verified**. Gemini and Cloudflare are optional, not prerequisites.
- **Safety:** no clinical advice, no automated dispatch, no invented nearby-hospital availability, and no claim that a report was delivered externally.

## 8. One-sentence pitch

**BhashaBandhu gives migrant construction workers a clearer voice at work: translated and spoken assignments, accessible safety reporting, and a structured emergency handover that a hospital responder can review in a safe demo environment.**
