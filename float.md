---
agent: devin-local
session: quasar-lasagna
created: 2026-08-18T20:02:53Z
---
# Skillrout — Floating Context

You are building Skillrout inside the existing Expo/Firebase project at `Skillrout`.

Always check the full instructions in `agents.md` before making changes.

## Must-Remember (3-second check)
1. RUN = record visit. PRINT = output. SUBMIT = finalize settlement.
2. Only SUBMIT advances `machine.lastSettledIn` / `machine.lastSettledOut`.
3. `totalNet > 0` and `storePercent + vendorPercent === 100` are required to submit.
4. Percentages are saved via `setVisitSplit` before `submitVisit`.
5. Receipts use the visit snapshot, not live master data.
6. Photos belong to the visit, not the machine master.

## Current State
- Stack: Expo 53.0.20, React Native 0.79.5, Firebase 12, TypeScript, Expo Router.
- Sign-in is a single screen: `app/owner.tsx`. It detects role and sends employees to `/select-store`.
- Owner tabs: `dashboard`, `stores`, `machines`, `employees`, `history`.
- Employee flow: `select-store`, `visit`, `results`, `calculation`, `settlement`, `outcome`, `receipt`, `employee-history`.
- Cloud Functions: `createEmployee`, `runVisit`, `setVisitSplit`, `submitVisit`.
- Firestore: `owners/{ownerId}`, `owners/{ownerId}/stores/{storeId}`, `owners/{ownerId}/stores/{storeId}/machines/{machineId}`, `owners/{ownerId}/visits/{visitId}`, and top-level `employees/{employeeId}`.
- Helpers: `round2`, `calculateMachine`, `calculateLiveReadings`, `calculateVisit`.
- `services/employees.ts` does not exist; `app/(owner)/employees.tsx` calls `createEmployee`.

## Design Quick Ref
- Original PRD palette: Primary `#6B7C59`, Accent `#C46A3D`, Background `#F7F4F0`.
- Actual `constants/designTokens.ts`: Primary `#8C6E5F`, Accent `#5F8C7B`, Background `#F4F1EA`.
- Do not change code colors; use `designTokens.ts` for new UI.
- Spacing: `4, 8, 13, 21, 34, 55`
- Mobile-first, Bento for dashboards, WCAG AA.

## Missing / Backlog (Don't Rebuild Unless Asked)
- Screens: `app/(owner)/reports.tsx`, `app/(owner)/settings.tsx`
- Components: `Select.tsx`, `Badge.tsx`, `MachineRow.tsx` (use `MachineReadingCard.tsx`), `VisitSummary.tsx`, `OwnerShell.tsx`
- Features: audit log, void/correct flow, employee edit/disable/reassign, machine store reassignment, history pagination, `AsyncStorage` offline cache, 58 mm thermal receipt, rate limiting on Cloud Functions.

## If Stuck
- Ask the user a focused question.
- Never break the five business rules above.
