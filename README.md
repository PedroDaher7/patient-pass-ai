# PatientPass AI

**Patient-controlled healthcare intake pass — fill it out once, share it with any provider in seconds.**

Live demo → **https://patient-pass.replit.app** (no login, no install required)
Source → **https://github.com/PedroDaher7/patient-pass-ai**

---

## The problem

The CDC reports 1.25 billion outpatient visits per year in the United States. CAQH data puts the annual cost of duplicate health data entry at $8.3 billion. The AMA found that 61% of patients seeing three or more providers re-enter the same medical history at every visit. The World Health Organization identifies medication errors as the #1 preventable patient safety threat globally — and most of those errors enter the record at intake, on the clipboard, before the clinician sees the patient.

PatientPass replaces the clipboard with a single patient-controlled intake pass.

---

## Live demo (60 seconds)

1. Open **https://patient-pass.replit.app/patient** — patient dashboard (Maria Lopez, demo patient)
2. Tap **Share Pass** → copy the 6-digit code **300593**
3. Open **https://patient-pass.replit.app/provider** → enter **300593**
4. See the full AI-reviewed intake, allergy alert, change banner, and GPT-4o clinician summary — instantly, with no paperwork

No login. No account. No software to install.

---

## What it does

### Patient dashboard (`/patient`)
- Complete standardized intake: demographics, insurance, care team, pharmacy, medications, allergies, conditions, surgeries, hospitalizations, immunizations, family history, social history, vitals, and digitally signed consents
- AI completeness scoring and field-level suggestions powered by GPT-4o mini
- Lay-language normalization: "water pill" → Hydrochlorothiazide, "the heart thing" → Atrial Fibrillation
- Share Pass: generates a QR code + time-limited 6-digit access code
- Access history log showing every provider view

### Provider dashboard (`/provider`)
- Practice scheduling view with patient queue
- Enter access code or scan QR — no install, no account
- Red allergy alert surfaced before all other content
- "Updated since last visit" banner showing exactly what changed
- AI Clinician Summary generated live by GPT-4o from the full intake record
- Clinical snapshot: conditions, medications, allergies, consents
- Copy to EHR, export, or print

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, TypeScript, Tailwind CSS |
| API client | Orval codegen from OpenAPI spec (typed React Query v5 hooks + Zod schemas) |
| Backend | Express 5, Node.js 24, TypeScript |
| Database | PostgreSQL + Drizzle ORM |
| AI — normalization | GPT-4o mini (patient-entered lay terms → clinical terminology) |
| AI — clinician summary | GPT-4o (live narrative generation on every provider view) |
| Data model | FHIR R4-aware (Patient, MedicationStatement, AllergyIntolerance, Condition) |
| Infrastructure | Oracle Cloud Infrastructure |

**Performance:** API responses under 200ms · GPT-4o summary under 3 seconds · zero provider installs required

---

## Architecture

```
Patient (browser)
    │  fills intake once, taps Share Pass
    ▼
PatientPass AI  ─── GPT-4o mini normalizes terms at save time
    │  issues time-limited 6-digit code / QR
    ▼
Provider (browser)  enters code, no install
    │
    ├── Full standardized intake record
    ├── Allergy alert
    ├── Change banner (what's new since last visit)
    └── GPT-4o clinician summary (auto-generated on view)
    
    [Future] FHIR R4 write → Oracle Health / Epic / any HL7-compliant EHR
```

---

## What's production-ready vs. hackathon-grade

**Production-ready now:**
- Complete patient intake and profile management
- Share code and QR generation (time-limited, revocable)
- AI terminology normalization pipeline
- GPT-4o clinician summary with graceful fallback
- Provider code-entry and record access flow
- Allergy alerting system
- Cross-visit change detection banner
- Consent management with digital signature
- FHIR R4-aware data model

**Scoped for next phase:**
- User authentication and real patient accounts (currently: shared synthetic demo patient)
- FHIR write endpoints to live EHR systems (data model ready; integration partnership not yet)
- Provider account verification via NPI lookup (stubbed, not wired)
- Formal HIPAA audit logging

---

## Defensibility

The longer a patient maintains their pass, the richer and more accurate it becomes — a data flywheel a new entrant cannot replicate. FHIR write access to Oracle Health and Epic requires clinical integration partnerships built over years, not just an API key. As more providers recognize the PatientPass format, patient switching costs rise with every visit. And unlike EHR-owned portals, the record belongs to the patient — a structural trust advantage over any health-system-controlled alternative.

---

## Near-term roadmap

- FHIR write integration into Oracle Health (Cerner), Epic, and any HL7-compliant EHR
- Real provider accounts with NPI verification and audit logs
- Pharmacist-reviewed drug interaction checks
- Multi-language support (Spanish, Mandarin)

**Primary pilot hypothesis:** a 30-day pilot with a 5-provider group will prove patient intake time drops below 60 seconds and missing-field rates fall below 5% — measurable from day one.

---

## Running locally

```bash
# Install dependencies
pnpm install

# Push database schema
pnpm --filter @workspace/db run push

# Start API server (port 5000)
pnpm --filter @workspace/api-server run dev

# Start frontend (separate terminal)
pnpm --filter @workspace/careform run dev
```

Required environment variable: `DATABASE_URL` (PostgreSQL connection string), `OPENAI_API_KEY`

---

## Demo credentials

No login required. The demo runs on a synthetic patient — Maria Lopez, 54, Type 2 diabetes, hypertension, hyperlipidemia.

Provider access code: **300593**

All data is synthetic. No real patient information is used anywhere.

---

Built for the Oracle Hackathon 2026 · PatientPass AI
