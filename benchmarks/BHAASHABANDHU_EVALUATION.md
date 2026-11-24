# BhaashaBandhu Quantitative AI & Security Evaluation Report

**Repository:** `riddhicodesavvy/bhaashaBandhu`  
**Script:** `benchmarks/bhaashabandhu_benchmark.ts` (wrapper: `benchmarks/bhaashabandhu_benchmark`)  
**Artifact Outputs:** `benchmarks/results/bhaashabandhu_results.json`, `benchmarks/results/bhaashabandhu_results.csv`  
**Environment:** Windows 11, Node.js `v22.16.0`, isolated local `TestStore` + Express 5 (`createApp`) + Supertest (`0` live network/API calls).

---

## 1. Evaluation Scope & Paid-API / Transcript Governance

In strict compliance with research reproducibility and cost-governance rules:
- **Zero unapproved paid API charges were incurred** (`api.groq.com` was not invoked).
- **Zero unverified transcripts or synthetic ASR/MT scores were fabricated.**
- Experiments C (deterministic/boundary defense layer) and D (authorization & workflow integrity) were executed **100% locally** against the real Express app, real Zod schemas, real `Service` state machine, and real `normalizeIndicText` / `numberTokens` guards.

---

## 2. Experiment D — Authorization & Workflow Integrity (38/38 Passed)

Evaluated across an isolated multi-tenant environment (`Site A` and `Site B`) with 6 authenticated identities (`Worker A`, `Worker A2`, `Contractor A`, `Hospital A`, `Contractor B`, `Hospital B`) and unauthenticated/forged clients.

| Verification Domain | Cases | Passed | Key Findings |
| :--- | :---: | :---: | :--- |
| **Unauthenticated Rejection** (`AUTH-01..10`) | 10 | 10 (100%) | All 10 protected endpoints return HTTP `401 SIGN_IN_REQUIRED`. |
| **Invalid/Forged Token Rejection** (`AUTH-11`) | 1 | 1 (100%) | Forged bearer token rejected with HTTP `401 INVALID_TOKEN`. |
| **Worker Role & Ownership Boundaries** (`WRK-01..08`) | 8 | 8 (100%) | Blocked (`403`) from contractor/wage/preview endpoints; isolated (`404`) from Worker A2's tasks; out-of-order completion blocked (`409`); duplicate `requestId` incident submission confirmed idempotent. |
| **Contractor Role & Site Isolation** (`CON-01..06`) | 6 | 6 (100%) | Blocked (`403`) from worker task actions & hospital actions; isolated (`404`) across `Site B`; tampered preview text rejected (`400 PREVIEW_EXPIRED`). |
| **Hospital Responder Boundaries** (`HSP-01..06`) | 6 | 6 (100%) | Blocked (`403`) from tasks/wages; out-of-order `closed_demo` rejected (`409`); cross-site incidents `0`; `isSimulation: true` & 5-event append-only trail persisted across reload. |
| **Input Validation & BOCW Persistence** (`VAL-01..07`) | 7 | 7 (100%) | Short text, partial GPS, out-of-bounds lat (`95`), invalid enums, negative wages, and missing deduction reasons all rejected (`400`). BOCW $2\times$ overtime (`4600` INR) & dispute flag persisted across `Service` reload. |
| **Total (Experiment D)** | **38** | **38 (100%)** | Mean latency: **46.921 ms** · P95 latency: **228.819 ms** |

---

## 3. Experiment C — Prompt Injection & Boundary Defense (54/55 Defended, Local Layer)

Dataset: `benchmarks/datasets/adversarial_injections.json` (**55 predefined non-destructive adversarial inputs** across 6 attack classes).

> **Methodological Disclosure:** Live LLM resistance against `api.groq.com` (`openai/gpt-oss-120b`) was **not executed** without paid-API approval. Results below quantify BhaashaBandhu's **deterministic input/output defense pipeline** (`normalizeIndicText`, `JSON.stringify` `<input_text>` framing, `numberTokens` multiset validation, and Zod strict schema/enum rejection under simulated compromised LLM outputs).

| Attack Category | Total Cases | Defended | Defense Rate | Defense Mechanism Tested |
| :--- | :---: | :---: | :---: | :--- |
| `xml_tag_escape` (`ADV-001..010`) | 10 | 10 | 100.0% | `JSON.stringify` encapsulation inside `<input_text>` + Zod schema rejection |
| `instruction_override` (`ADV-011..020`) | 10 | 10 | 100.0% | `<input_text>` inert framing + Zod `INVALID_AI_RESULT` rejection |
| `numeric_tampering` (`ADV-021..030`) | 10 | 10 | 100.0% | `numberTokens` deterministic digit multiset check (`TRANSLATION_NUMBERS_CHANGED`) |
| `exfiltration_and_markup` (`ADV-041..050`) | 10 | 10 | 100.0% | `<input_text>` JSON escaping + Zod strict enum/key filtering |
| `schema_boundary` (`ADV-051..055`) | 5 | 5 | 100.0% | Zod `sanitizedText(minLen, maxLen)` enforcement |
| `unicode_zero_width_obfuscation` (`ADV-031..040`) | 10 | **9** | **90.0%** | `normalizeIndicText` (NFC + zero-width strip) |
| **Total (Deterministic / Boundary Layer)** | **55** | **54** | **98.18%** | **Attack Success Rate (Boundary Gap): 1/55 (1.82%)** |

### Real Empirical Finding Recorded (`ADV-038`)
- Case `ADV-038` injected ASCII C0 control characters (`\u0000`, `\u0007`, `\u001F`) alongside zero-width characters (`\u200B`, `\u200C`).
- `normalizeIndicText` (`shared/types.ts:250-253`) strips Unicode zero-width formatting characters (`\u200B-\u200D\uFEFF`) and normalizes to NFC, **but does not strip ASCII C0 control characters (`\x00-\x1F`)**. This boundary gap is documented as an actionable hardening target rather than masked.

---

## 4. Experiment A — Multilingual Translation Benchmark (Dataset Built; Live Run Blocked)

- **Benchmark Constructed:** `benchmarks/datasets/translation_benchmark.json` (**90 fixed construction-safety translation pairs** across 4 directions: 30 `en->hi`, 30 `en->bn`, 15 `hi->en`, 15 `bn->en`), covering task instructions, safety warnings, equipment terms, measurements, wage statements, code-switched Hinglish/Benglish, and ambiguous phrases.
- **Status:** `BLOCKED_REQUIRES_PAID_API_APPROVAL_AND_HUMAN_VALIDATION`
- **Blockers:**
  1. Executing 90 live inference calls against `api.groq.com` (`openai/gpt-oss-120b`) requires explicit paid-API approval.
  2. Current reference translations are author-drafted benchmark targets (`author_drafted_pending_native_speaker_validation`) and require independent bilingual speaker validation before reporting human-validated chrF/BLEU scores.

---

## 5. Experiment B — Speech Recognition Benchmark (Inventory Complete; Execution Blocked)

- **Audio Inventory:** `benchmarks/datasets/stt_audio_inventory.json` inventoried **7 existing audio files** in `test-results/` (`en-test.wav`, `hi-test.mp3`, `bn-test.mp3`, `audit-final.wav`, `audit-random.wav`, `audit-rods.wav`, `synthetic-report.wav`).
- **Status:** `BLOCKED_MISSING_VERIFIED_TRANSCRIPTS_AND_API_APPROVAL`
- **Blockers:**
  1. **0 verified human reference transcripts** exist in the repository for those 7 audio files; Word Error Rate (WER) and Character Error Rate (CER) cannot be scientifically computed without ground-truth transcripts.
  2. Live STT evaluation via `whisper-large-v3-turbo` requires invoking `api.groq.com` (paid-API approval required).

