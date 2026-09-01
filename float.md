---
agent: devin-local
session: quasar-lasagna
created: 2026-08-18T20:02:53Z
---

# Skillrout — Floating Context

You are building Skillrout inside the existing Expo/Firebase project at `Skillrout`.

Always check the full instructions in `AGENTS.md` and `agents.md` before making changes.

## Must-Remember (3-second check)

1. RUN = record visit. PRINT = output. SUBMIT = finalize settlement.
2. Only SUBMIT advances `machine.lastSettledIn` / `machine.lastSettledOut`.
3. `totalNet > 0` and `storePercent + vendorPercent === 100` are required to submit.
4. The split is read-only in the employee flow; it comes from store defaults.
5. Receipts use the visit snapshot, not live master data.
6. Photos belong to the visit, not the machine master record.
7. Machine numbers are plain `1`, `2`, `3`, etc. No `#` or `Serial` prefix.
8. Cloud Functions target `us-central1`; Firestore is `nam5`.

## Current State

- Stack: Expo 53.0.20, React Native 0.79.5, Firebase 12, TypeScript, Expo Router.
- Public landing: `app/index.tsx`.
- Auth routes: `/owner/login`, `/owner/register`, `/employee/login`, `/auth/action`.
- Owner tabs: dashboard, stores, machines, employees, history, reports, settings.
- Employee flow: select-store, store-detail, visit, results, calculation, settlement, outcome, receipt, employee-history, drafts, change-password.
- Cloud Functions: see `architecture_essentials.md`.
- Firestore: `pendingOwners/{uid}`, `owners/{ownerId}`, `employees/{employeeId}`, `owners/{ownerId}/stores/{storeId}`, `owners/{ownerId}/stores/{storeId}/machines/{machineId}`, `owners/{ownerId}/stores/{storeId}/visits/{visitId}`.
- Helpers: `round2`, `calculateMachine`, `calculateLiveReadings`, `calculateVisit`, `machineOrdering`, `receiptMachineMatching`, `receiptTemplate`.

## Design Quick Ref

- Source of truth: `constants/designTokens.ts`.
- Spacing: `4, 8, 13, 21, 34, 55`.
- Mobile-first, Bento for dashboards, WCAG AA.

## Missing / Backlog

- Void/correct flow and audit log.
- Employee edit/disable/reassign and machine store reassignment.
- History pagination.
- 58 mm thermal receipt.
- Cloud Functions rate limiting.
