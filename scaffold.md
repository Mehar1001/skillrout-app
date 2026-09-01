---
agent: devin-local
session: quasar-lasagna
created: 2026-08-18T20:02:30Z
---

# Skillrout — Scaffold Plan

This document is a current reference for the project structure and the most important files.

## 1. Folder Structure

```
Skillrout/
├── app/
│   ├── _layout.tsx          # Root Stack with all public/auth routes
│   ├── +not-found.tsx
│   ├── index.tsx            # Public landing / product page
│   ├── owner/
│   │   ├── login.tsx        # /owner/login
│   │   └── register.tsx     # /owner/register
│   ├── employee/
│   │   └── login.tsx        # /employee/login
│   ├── auth/
│   │   └── action.tsx       # /auth/action
│   ├── (owner)/
│   │   ├── _layout.tsx      # Owner tabs
│   │   ├── dashboard.tsx
│   │   ├── stores.tsx
│   │   ├── machines.tsx     # includes renumber
│   │   ├── employees.tsx
│   │   ├── history.tsx
│   │   ├── reports.tsx
│   │   └── settings.tsx
│   └── (employee)/
│       ├── _layout.tsx      # Employee tabs
│       ├── select-store.tsx
│       ├── store-detail.tsx
│       ├── onboard-store.tsx
│       ├── add-machine.tsx
│       ├── visit.tsx
│       ├── results.tsx
│       ├── calculation.tsx
│       ├── settlement.tsx
│       ├── outcome.tsx
│       ├── receipt.tsx
│       ├── employee-history.tsx
│       ├── drafts.tsx
│       └── change-password.tsx
├── components/              # Reusable UI primitives
├── constants/
│   └── designTokens.ts
├── contexts/
│   └── AuthContext.tsx
├── helpers/                 # Business logic and parsers
├── services/                # Firebase interaction
├── firebase/
│   └── firebaseConfig.ts
├── functions/
│   └── src/
│       └── index.ts         # All Cloud Functions
├── tests/
│   └── securityRules.test.ts
├── types/
│   └── index.ts
└── .firebaserc
```

## 2. Data Model Snippets

See `architecture.md` and `DATA_SCHEMA.md` for full schemas.

## 3. Cloud Functions

See `architecture_essentials.md` and `functions/src/index.ts`.

## 4. Key Implementation Notes

- Machine numbers are auto-assigned positive integers per store.
- `helpers/machineOrdering.ts` centralizes numeric sorting.
- `helpers/receiptMachineMatching.ts` matches OCR numbers using current and `legacyMachineNumbers`.
- `helpers/receiptTemplate.ts` and `helpers/reportTemplate.ts` generate HTML output with plain machine numbers.
- `services/visits.ts` handles `RUN`, `PRINT`, and `SUBMIT` calls.
- `contexts/DraftQueueContext.tsx` and `services/drafts.ts` manage offline drafts.

## 5. Implementation Order (for future work)

1. Security, auth, and role routing.
2. Owner store/machine/employee management.
3. Employee store selection and visit entry.
4. `runVisit` and `submitVisit` Cloud Functions.
5. Receipt, history, and reports.
6. OCR and photo workflows.
7. Void/correct, audit log, history pagination, 58 mm receipt, rate limiting.
