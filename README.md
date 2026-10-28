# BhashaBandhu

**Your Language. Your Safety. Your Voice.**

A production-grade multilingual workforce safety, statutory wage, and clinical emergency handover platform aligned with **UN Sustainable Development Goal 8 (Decent Work and Economic Growth)**.

> **Important Notice:** The Hospital Emergency Responder portal is a demonstration only and does not contact real hospitals or dispatch emergency services.

---

## 🎯 The SDG 8 Problem & Construction Worker Safety

India's construction sector employs over 55 million interstate migrant workers governed by **The Building and Other Construction Workers (BOCW) Act, 1996**. These workers frequently migrate across state and linguistic boundaries (e.g. from West Bengal, Bihar, and Uttar Pradesh to southern and western metropolitan sites) where site supervisors and contractors speak different regional languages.

This language barrier creates acute real-world vulnerabilities:
1. **Safety Lapses & Fatalities**: High-risk tasks (scaffolding tie-offs, deep trench shoring, LOTO electrical lockouts) communicated in unfamiliar languages lead to misinterpretation, missed hazard warnings, and preventable accidents.
2. **Delayed Emergency Response**: When accidents occur, panic and language barriers delay triage descriptions to first responders, escalating preventable traumas.
3. **Wage Exploitation**: Complex statutory overtime rules (BOCW Act Section 28 mandates 2× ordinary rate) are obscured by informal paperwork, leading to wage discrepancies and lack of dispute recourse.

**BhashaBandhu** bridges this divide by delivering voice-first, multilingual, AI-powered communication that protects worker safety, enforces statutory rights, and provides emergency triage handovers.

---

## 👥 User Roles & Capabilities

### 1. Worker Role
- **Multilingual Task Feed**: Access daily tasks translated automatically into native languages (English, Hindi, Bengali) with high-contrast, touch-friendly UI.
- **Safety Acknowledgement**: Review critical hazard checkpoints and sign off before initiating hazardous work.
- **Voice & Text Incident Reporting**: Report safety incidents, injuries, and near-misses using audio recordings or native script.
- **Statutory Wage Tracking**: View transparent wage slips, calculated BOCW 2× overtime hours, mess food deductions (Khuraki), and raise formal wage discrepancy disputes.

### 2. Contractor / Site Supervisor Role
- **Task Creation & Assignment**: Create site tasks with detailed safety requirements in English or Hindi.
- **AI Translation Preview**: Review and verify high-fidelity AI translations across languages before dispatching to workers.
- **Live Safety Dashboard**: Monitor open tasks, completion states, safety sign-offs, and incoming incident alerts in real time.
- **Wage & Dispute Management**: Review calculated overtime hours and resolve worker wage disputes transparently.

### 3. Hospital Emergency Responder (DEMO) Role
- **Clinical SBAR Emergency Handovers**: Receive automated, structured clinical handovers formatted according to medical SBAR standards (Situation, Background, Assessment, Recommendation).
- **Incident Telemetry**: Access vital signs, trauma severity, hemorrhage state, Glasgow Coma Scale (GCS), PPE compliance, and site contacts.
- **Direct Emergency Action**: One-click integration with National Emergency Services (112).
- *Disclaimer: The Hospital Emergency Responder portal is a demonstration only and does not contact real hospitals or dispatch emergency services.*

---

## 🌐 Language & Core Capabilities

- **Languages Supported**: **English**, **Hindi (हिंदी)**, and **Bengali (বাংলা)** with full Indic Unicode NFC normalization and zero-width character sanitization.
- **Task Translation**: Real-time AI translation powered by Groq LLMs with prompt injection mitigation using inert `<input_text>` tags and strict numeric verification.
- **Voice STT & Incident Reporting**: Groq Whisper speech-to-text allowing workers to record voice memos in their native language with visual audio visualizers.
- **Wages & BOCW Overtime**: Statutory 2× overtime computation under Section 28 of the BOCW Act 1996, with persistent wage dispute tracking.

---

## 🏗️ Technical Architecture

- **Authentication**: **Firebase Authentication** (email/password with strict client-side session persistence).
- **Database & Data Isolation**: **Supabase PostgreSQL** with Row-Level Security (RLS), atomic append-only incident event audits, and role verification strictly sourced from persisted user profiles.
- **AI & Speech**: **Groq API** (`llama-3.3-70b-versatile` for JSON-structured translations and SBAR summaries, `whisper-large-v3` for speech-to-text).
- **Frontend**: **React 19**, **TypeScript 5.9**, **Vite 7**, **React Router 7**, and **Lucide React**, meeting WCAG 2.1 AA accessibility standards (skip-link, `aria-live` polite regions, 48×48px touch targets).
- **Server Gateway**: Express.js serverless API routes on Vercel (`/api/*`) with origin validation, CORS enforcement, and hardened CSP headers.

---

## 🔑 Demo Credentials

| Role | Email | Password | Target Dashboard |
| :--- | :--- | :--- | :--- |
| **Worker** (Ravi Kumar) | `worker@bhashabandhu.demo` | `Worker@123` | `/worker` |
| **Contractor** (Anita Demo) | `contractor@bhashabandhu.demo` | `Contractor@123` | `/contractor` |
| **Hospital Responder** | `hospital@bhashabandhu.demo` | `Hospital@123` | `/hospital` |

---

## 🚀 Deployment Instructions

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

# Run database migrations in Supabase SQL editor:
# Apply supabase/migrations/202610270001_bhashabandhu.sql

# Seed demo users and data
npm run seed:demo

# Start development server
npm run dev
```

### 2. Environment Variables Configuration
Configure the following environment variables in `.env` (local) and Vercel Project Settings (production):

| Variable | Scope | Purpose |
| :--- | :--- | :--- |
| `VITE_FIREBASE_API_KEY` | Client & Build | Firebase Web API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Client & Build | Firebase Auth domain |
| `VITE_FIREBASE_PROJECT_ID` | Client & Build | Firebase Project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Client & Build | Firebase Storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Client & Build | Firebase messaging sender ID |
| `VITE_FIREBASE_APP_ID` | Client & Build | Firebase App ID |
| `SUPABASE_URL` | Server Only | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Server Only | Supabase service-role key (server-side only) |
| `GROQ_API_KEY` | Server Only | Groq API key for Llama 3.3 and Whisper STT |
| `FIREBASE_ADMIN_CREDENTIALS_JSON` | Server Only | Firebase Admin service account JSON |

*Security Warning: Never prefix server secrets with `VITE_` or expose them to client bundles.*

### 3. Vercel Deployment
1. Connect the GitHub repository `https://github.com/riddhicodesavvy/bhaashaBandhu.git` to Vercel.
2. Ensure Framework Preset is set to **Vite**.
3. Build Command: `npm run build`
4. Output Directory: `dist`
5. Configure all environment variables above under **Settings > Environment Variables**.
6. Push to `main` branch to trigger automated production deployment at:
   `https://bhaasha-bandhu.vercel.app`

---

## 🧪 Verification & Automated Testing

Execute the test and audit suites locally or in CI:

```bash
# Type check with strict TypeScript
npm run check

# Execute all 23 unit and integration tests
npm test

# Build production bundle and verify manual chunking
npm run build

# Run comprehensive automated 100/100 evaluation scorecard
npm run evaluate

# Scan for credential leaks
node scripts/check-secrets.mjs
```

---

## 📜 Standards & Compliance

Built in compliance with:
- **UN Sustainable Development Goal 8**: Decent Work and Economic Growth
- **The Building and Other Construction Workers (BOCW) Act, 1996** (Section 28 Statutory Overtime)
- **IS 3696 Safety Standards** for Scaffolds and Ladders
- **Clinical SBAR Protocol** (Situation, Background, Assessment, Recommendation)
- **WCAG 2.1 AA Accessibility Guidelines**
