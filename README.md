# BhashaBandhu

**Multilingual Workforce Communication & Safety Prototype (UN SDG 8)**

*An applied research prototype exploring voice-first Indic language accessibility, statutory wage transparency models, and structured emergency handovers.*

> **Important Notice:** BhashaBandhu is an academic research prototype and proof-of-concept. It is **not** clinically validated, does **not** connect to real emergency dispatch systems (112), and does **not** provide certified legal or payroll guarantees.

---

## 🎯 The SDG 8 Context & Problem Scope

India's construction sector employs millions of interstate migrant workers governed by **The Building and Other Construction Workers (BOCW) Act, 1996**. These workers frequently migrate across linguistic boundaries where site supervisors and contractors speak different regional languages.

This language barrier creates documented vulnerabilities:
1. **Safety Communication Gaps**: High-risk tasks (scaffolding tie-offs, deep trench shoring, electrical lockouts) communicated in unfamiliar languages risk misinterpretation, missed hazard warnings, and preventable accidents.
2. **Delayed Emergency Triage**: When workplace injuries occur, panic and linguistic barriers impede rapid, structured handovers to medical responders.
3. **Wage Tracking Transparency**: Complex overtime calculations (modeled after BOCW Act Section 28 double-rate provisions) are often obscured by informal paperwork.

**BhashaBandhu** investigates how voice-first interfaces, open-source LLM translation pipelines, and structured medical handover protocols can mitigate these challenges.

---

## 👥 Prototype Capabilities & User Roles

### 1. Worker Portal (`/worker`)
- **Multilingual Task Feed**: Access daily tasks translated across English, Hindi, and Bengali with high-contrast, touch-friendly UI.
- **Safety Acknowledgement**: Review critical hazard checkpoints and sign off before initiating hazardous work.
- **Voice & Text Incident Reporting**: Record native-language audio incident descriptions transcribed via Whisper speech-to-text with optional GPS tagging.
- **Wage Discrepancy Logging**: View calculated overtime hours and submit formal wage dispute records.

### 2. Contractor / Site Supervisor Portal (`/contractor`)
- **Task Authoring & Dispatch**: Create site tasks with detailed safety checkpoints in English or Hindi.
- **Translation Verification**: Review and verify AI translations across languages before dispatching to workers.
- **Safety Dashboard**: Monitor open tasks, completion states, safety sign-offs, and incoming incident alerts in real time.
- **Wage & Dispute Review**: Review calculated overtime hours and transparently track worker wage dispute statuses.

### 3. Emergency Responder Portal (`/hospital`) *(Demo Simulation Only)*
- **Clinical SBAR Emergency Handovers**: Receive automated, structured clinical handovers formatted according to medical SBAR standards (Situation, Background, Assessment, Recommendation).
- **Incident Telemetry**: Inspect recorded vital signs, trauma severity, hemorrhage state, Glasgow Coma Scale (GCS), PPE compliance, and site contacts.
- *Disclaimer: The Emergency Responder portal is a simulated demonstration only and does not contact real hospitals or dispatch emergency services.*

---

## 🌐 Language & NLP Architecture

- **Languages Supported**: **English**, **Hindi (हिंदी)**, and **Bengali (বাংলা)** with Indic Unicode NFC normalization and zero-width character sanitization.
- **Translation Pipeline**: Groq API (`llama-3.3-70b-versatile`) with prompt injection mitigation using inert `<input_text>` tags and strict numeric verification to prevent numeric hallucination.
- **Voice Transcription**: Groq Whisper STT (`whisper-large-v3-turbo`) allowing workers to record voice memos in their native language with visual audio visualizers.
- **Wage Modeling**: Algorithmic overtime calculation modeled after Section 28 of the BOCW Act 1996, with persistent wage dispute tracking.

---

## 🏗️ Technical Architecture

- **Authentication**: **Firebase Authentication** (email/password with strict client-side session persistence).
- **Database & Data Isolation**: **Supabase PostgreSQL** with Row-Level Security (RLS), atomic append-only incident event audits, and role verification strictly sourced from persisted user profiles.
- **AI & Speech**: **Groq API** (`llama-3.3-70b-versatile` for JSON-structured translations and SBAR summaries, `whisper-large-v3-turbo` for speech-to-text).
- **Frontend**: **React 19**, **TypeScript 5.9**, **Vite 7**, **React Router 7**, and **Lucide React**, meeting WCAG 2.1 AA accessibility standards (skip-link, `aria-live` polite regions, 48×48px touch targets).
- **Server Gateway**: Express.js serverless API routes on Vercel (`/api/*`) with origin validation, CORS enforcement, and hardened CSP headers.

---

## 🔐 Demo Access & Reviewer Instructions

The live demonstration deployment is hosted at: **[https://bhaasha-bandhu.vercel.app](https://bhaasha-bandhu.vercel.app)**.

To protect demonstration data from unauthorized modification and automated spam, public demonstration credentials are not published in open documentation.

### Reviewer & Supervisor Access
- **Academic & Research Reviewers**: Research supervisors and evaluators can request dedicated demonstration credentials by contacting `riddhidipjana7@gmail.com` with the subject `[BhaashaBandhu Demo Access]`.
- **Local Isolated Exploration**: Evaluators can clone the repository, run `npm run seed:demo`, and explore all three roles in an isolated local environment with mock credentials defined in their private `.env`.

### Roles Available for Exploration
| Role | Primary Interface | Key Demonstration Features |
| :--- | :--- | :--- |
| **Worker** | `/worker` | Indic voice incident recording (Whisper STT), bilingual safety acknowledgements, overtime wage tracking and dispute logging. |
| **Contractor** | `/contractor` | Multilingual task creation with LLM translation preview (Llama 3.3), incident review triage, real-time safety compliance monitoring. |
| **Emergency Responder** | `/hospital` | Simulated clinical SBAR handover generation, vital signs telemetry, GCS scoring, and trauma severity tracking. |

### Prototype Boundaries & Limitations
- **Simulated Emergency Dispatch**: Hospital emergency handovers and emergency contact buttons are simulated for workflow evaluation; live emergency services are never dispatched.
- **Empirical NLP Scope**: The translation pipeline focuses on 3 languages (English, Hindi, Bengali) for construction domain terminology; low-resource dialectal variants remain a subject for future research.

---

## 🚀 Local Installation & Execution

### Prerequisites
- Node.js 20+
- Firebase project with Email/Password authentication enabled
- Supabase PostgreSQL project with migration `supabase/migrations/202610270001_bhashabandhu.sql` applied
- Groq API key

### 1. Local Setup
```bash
# Clone the repository
git clone https://github.com/riddhicodesavvy/bhaashaBandhu.git
cd bhaashaBandhu

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your private Firebase, Supabase, and Groq keys

# Run database migrations in Supabase SQL editor:
# Apply supabase/migrations/202610270001_bhashabandhu.sql

# Seed local demo accounts
npm run seed:demo

# Start development server
npm run dev
```

---

## 🧪 Automated Testing & Verification

The repository includes a comprehensive 32-test unit and integration test suite:

```bash
# Type check with strict TypeScript
npm run check

# Execute all 32 unit and integration tests
npm test

# Build production bundle
npm run build

# Scan for credential leaks in staged files
node scripts/check-secrets.mjs
```

---

## 📜 Standards & Compliance Grounding

- **UN Sustainable Development Goal 8**: Decent Work and Economic Growth (Target 8.8: Safe and secure working environments for all workers).
- **The Building and Other Construction Workers (BOCW) Act, 1996**: Overtime math modeled after Section 28 statutory double rate.
- **IS 3696**: Safety standards for Scaffolds and Ladders referenced in safety checklists.
- **Clinical SBAR Protocol**: Structured Situation, Background, Assessment, Recommendation handover formatting.
- **WCAG 2.1 AA**: Web Content Accessibility Guidelines compliance (contrast, skip-links, polite live regions).
