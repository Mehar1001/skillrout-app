---
agent: devin-local
session: quasar-lasagna
created: 2026-08-18T20:01:50Z
---
# Skillrout — Product Requirements Document

## 1. Overview
Skillrout is a mobile and web-compatible store-and-machine settlement application. It is built with **Expo 53.0.20**, **React Native 0.79.5**, **Firebase 12**, **TypeScript**, and **Expo Router**. The app lets employees visit stores, record cumulative machine IN/OUT readings, calculate cash/payout/net, capture meter photos, and generate thermal receipts. Owners manage stores, machines, employees, and settlement history.

## 2. Problem Statement
Businesses with machines across multiple stores currently track readings manually, use spreadsheets/calculators, store photos separately, and have no clear separation between a physical visit and a financial settlement. This causes errors, lost history, and over-advanced baselines.

## 3. Proposed Solution
A centralized Expo + Firebase app with role-based access that records every store visit, separates `RUN`, `PRINT`, and `SUBMIT`, and only advances `Last Settled` readings on a submitted, positive settlement.

## 4. User Roles

### Owner / Admin
- Create employee accounts (via the `createEmployee` Cloud Function).
- Create/edit stores and assign machines.
- Enter initial `Last Settled` readings.
- View all visits, settlements, and photos.
- Reprint receipts.

### Employee
- Log in with own account.
- Select an active store from assigned stores.
- View assigned machines and `Last Settled` readings.
- Enter `Present IN/OUT` and take optional photo.
- Press `RUN` to save the visit permanently.
- Review calculated results, edit `Store %` and `Vendor %`.
- `PRINT` any run; `SUBMIT & PRINT` only when `Net > 0`.

## 5. Core Definitions
- **Last Settled Reading**: most recent reading from a successfully submitted settlement.
- **Present Reading**: current cumulative reading entered by the employee during the visit.
- **New IN / Cash** = `Present IN − Last Settled IN`
- **New OUT / Payout** = `Present OUT − Last Settled OUT`
- **Machine Net** = `New IN − New OUT`
- **Store Total Net** = `Σ New IN − Σ New OUT`
- **Store Amount** = `Store % × Total Net` (rounded to 2 decimals)
- **Vendor Amount** = `Total Net − Store Amount`
- **Cash Due Location** = `Payouts + Store Amount`
- **Operator Take Home** = `Vendor Amount`

## 6. Data Entities

### Owner
`owners/{ownerId}`
- `id`, `email`, `name`, `subscriptionStatus`, `createdAt`, `updatedAt`

### Employee
`employees/{employeeId}` (top-level collection)
- `id` (Auth UID), `email`, `name`, `active`, `role: 'employee'`, `ownerId`, `businessName`, `assignedStoreIds`, `createdAt`, `updatedAt`

### Store
`owners/{ownerId}/stores/{storeId}`
- `id`, `name`, `address`, `active`, `defaultStorePercent`, `defaultVendorPercent`, `createdAt`, `updatedAt`

### Machine
`owners/{ownerId}/stores/{storeId}/machines/{machineId}`
- `id`, `machineNumber`, `name`, `storeId`, `lastSettledIn`, `lastSettledOut`, `lastSubmittedVisitId`, `lastSubmittedAt`, `active`, `createdAt`, `updatedAt`

### Visit
`owners/{ownerId}/visits/{visitId}`
- `id`, `storeId`, `storeName`, `employeeId`, `employeeName`, `businessDate` (YYYY-MM-DD), `timestamp`
- per machine: `machineId`, `machineNumber`, `name`, `lastSettledIn`, `lastSettledOut`, `presentIn`, `presentOut`, `newIn`, `newOut`, `machineNet`, `photoUrl`, `photoPath`
- `totalNewIn`, `totalNewOut`, `totalNet`, `result: 'positive'|'zero'|'negative'`, `storePercent`, `vendorPercent`, `storeAmount`, `vendorAmount`, `cashDueLocation`
- `visitStatus: 'completed'`, `settlementStatus: 'not_submitted'|'submitted'`, `printStatus: 'not_printed'|'printed'`, `printedAt`, `printedBy`
- `settlement` and `voided` sub-documents (voided is not yet implemented)

## 7. User Flows

### 7.1 Owner/Admin — Onboarding
1. Owner signs in with email/password on `app/owner.tsx`.
2. Create employees (called directly from `app/(owner)/employees.tsx` via the `createEmployee` Cloud Function).
3. Create store with name, address, default percentages.
4. Add machines to a store and enter initial `Last Settled IN/OUT`.

### 7.2 Employee — Visit & Settlement
1. Sign in on `app/owner.tsx`. The app detects the role and redirects employees to `/select-store`.
2. Select an active, assigned store.
3. See assigned machines with `Last Settled IN/OUT`.
4. Enter `Present IN/OUT` and capture photo for each machine.
5. Press `RUN`.
6. App records a permanent visit in `owners/{ownerId}/visits`.
7. Review results: machine and store totals, store/vendor %, store/vendor amount.
8. If `Net > 0`: enable `SUBMIT & PRINT` and `PRINT`.
9. If `Net ≤ 0`: disable `SUBMIT & PRINT`; only `PRINT`.
10. `PRINT` updates `printStatus` only; `SUBMIT & PRINT` finalizes settlement and advances `Last Settled` readings.

### 7.3 Store Onboarding
- Owner creates a store record.
- Owner configures default store/vendor split (sum 100%).

### 7.4 Machine Onboarding
- Owner creates a machine record linked to a store.
- Owner enters initial `Last Settled IN/OUT` to set the baseline.

### 7.5 History & Reporting
- Owner history is `app/(owner)/history.tsx`.
- Employee history is `app/(employee)/employee-history.tsx`.
- `app/(owner)/reports.tsx` and `app/(owner)/settings.tsx` are planned but not yet implemented.

## 8. Business Rules
1. `RUN` records the visit and never changes `Last Settled`.
2. `PRINT` never changes `Last Settled`.
3. `SUBMIT` is the only action that advances `Last Settled`.
4. `Net > 0` required for `SUBMIT`.
5. `Store % + Vendor % = 100%` before `SUBMIT`.
6. Every `RUN` is a permanent, separate history event.
7. Calculations use `Last Settled Reading`, not the latest `RUN`.
8. Thermal receipt supports 80 mm, with 58 mm compatibility later.
9. Submitted settlements are locked from normal employee editing.
10. Photos belong to `RUN`, not the machine master record.

## 9. UI/UX Direction
- Design system: Golden Ratio based spacing (`4, 8, 13, 21, 34, 55`) and layout (`61.8% / 38.2%`).
- Specified palette in PRD/agent docs:
  - Primary: `#6B7C59` (Muted Olive)
  - Accent: `#C46A3D` (Terracotta)
  - Contrast (darker accent): `#8A4A2A`
  - Background: `#F7F4F0` (Warm Cream)
  - Surface: `#FFFFFF`
  - Neutral family derived by desaturating primary by ~60%: `#E0DDD6`, `#C8C4BB`, `#A8A59E`.
  - 60/30/10 rule: 60% warm cream, 30% white/soft neutrals, 10% olive + terracotta accents.
- **Actual code discrepancy**: `constants/designTokens.ts` currently uses a different earthy palette (`#8C6E5F` primary, `#5F8C7B` accent, `#F4F1EA` background). The discrepancy is documented here and in `agents.md`; do **not** change the code colors unless explicitly asked.
- Typography: one typeface, limited scale, `12, 14, 16, 21, 34, 55`.
- Component tokens: colors, spacing, radius, shadow.
- Bento Grid for dashboards; modals for details; clear status badges.
- Accessibility: WCAG AA, 44×44 px touch targets, labels, POUR.
- Mobile-first, but testable on web.

## 10. Success Criteria
- Employee can complete a store visit using only: read → enter → photo → RUN → review → submit/print.
- Owner can answer all audit questions (who, when, what, settled, receipt) without external tools.
- `Last Settled` only advances on submitted, positive runs.
- The app runs on iOS, Android, and web (with thermal print via `expo-print` / web share).

## 11. Known Gaps (Not Yet Implemented)
The following planned capabilities are not yet present in the codebase and should be treated as the backlog:
- Audit log
- Void / correct flow
- Owner reports (`app/(owner)/reports.tsx`)
- Owner settings (`app/(owner)/settings.tsx`)
- Employee edit, disable, and reassign
- Machine store reassignment
- History pagination
- `AsyncStorage` offline cache
- 58 mm thermal receipt support
- Rate limiting on Cloud Functions
