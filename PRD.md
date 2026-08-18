---
agent: devin-local
session: quasar-lasagna
created: 2026-08-18T20:01:50Z
---
# Skillrout — Product Requirements Document

## 1. Overview
Skillrout is a mobile and web-compatible store-and-machine settlement application. It lets employees visit stores, record cumulative machine IN/OUT readings, calculate cash/payout/net, capture meter photos, and generate thermal receipts. Owners/Admins manage stores, machines, employees, and settlement history.

## 2. Problem Statement
Businesses with machines across multiple stores currently track readings manually, use spreadsheets/calculators, store photos separately, and have no clear separation between a physical visit and a financial settlement. This causes errors, lost history, and over-advanced baselines.

## 3. Proposed Solution
A centralized Expo + Firebase app with role-based access that records every store visit, separates `RUN`, `PRINT`, and `SUBMIT`, and only advances `Last Settled` readings on a profitable, submitted settlement.

## 4. User Roles

### Owner / Admin
- Create/edit/disable employee accounts.
- Create/edit stores and assign machines.
- Enter initial `Last Settled` readings.
- View all visits, settlements, photos, and reports.
- Reprint receipts and void/correct records.

### Employee
- Log in with own account.
- Select a store, view assigned machines and `Last Settled` readings.
- Enter `Present IN/OUT`, take optional photo.
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

### Store
- `storeId`, `name`, `address`, `active`, `defaultStorePercent`, `defaultVendorPercent`, `createdAt`, `updatedAt`

### Machine
- `machineId`, `machineNumber`, `name`, `storeId`, `lastSettledIn`, `lastSettledOut`, `lastSubmittedVisitId`, `lastSubmittedAt`, `active`, `createdAt`, `updatedAt`

### Employee
- `employeeId` (Auth UID), `email`, `name`, `active`, `role: 'employee'`, `createdBy` (owner), `createdAt`

### Run / Visit
- `runId`, `storeId`, `storeName`, `employeeId`, `employeeName`, `date`, `time`, `businessDate`, `timestamp`
- per machine: `machineId`, `lastSettledIn`, `lastSettledOut`, `presentIn`, `presentOut`, `newIn`, `newOut`, `machineNet`, `photoUrl`
- `totalNewIn`, `totalNewOut`, `totalNet`, `result: 'positive'|'zero'|'negative'`, `storePercent`, `vendorPercent`, `storeAmount`, `vendorAmount`, `cashDueLocation`
- `visitStatus: 'completed'`, `settlementStatus: 'not_submitted'|'submitted'`, `printStatus: 'not_printed'|'printed'`, `submittedAt`, `submittedBy`

### Settlement / Settlement Record
(embedded inside the Run)
- `submitted`, `submittedAt`, `submittedBy`, `storePercent`, `vendorPercent`, `storeAmount`, `vendorAmount`

## 7. User Flows

### 7.1 Owner/Admin — Onboarding
1. Owner logs in with email/password.
2. Create employees (cloud function / secure owner UI).
3. Create store with name, address, default percentages.
4. Add machines to store and enter initial `Last Settled IN/OUT`.

### 7.2 Employee — Visit & Settlement
1. Log in.
2. Select active store.
3. See assigned machines with `Last Settled IN/OUT`.
4. Enter `Present IN/OUT` and capture photo for each machine.
5. Press `RUN`.
6. App records visit permanently in `visits` collection.
7. Review results: machine and store totals, store/vendor %, store/vendor amount.
8. If `Net > 0`: enable `SUBMIT & PRINT` and `PRINT`.
9. If `Net ≤ 0`: disable `SUBMIT & PRINT`; only `PRINT`.
10. `PRINT` updates `printStatus` only; `SUBMIT & PRINT` finalizes settlement and advances `Last Settled` readings.

### 7.3 Store Onboarding
- Owner creates store record.
- Owner configures default store/vendor split (sum 100%).

### 7.4 Machine Onboarding
- Owner creates machine record linked to a store.
- Owner enters initial `Last Settled IN/OUT` to set the baseline.

### 7.5 History & Reporting
- List all runs for selected store or all stores.
- Filter by submitted/not-submitted/printed.
- View run details, photos, and reprint receipt.
- Owner can void/correct with reason, preserving audit trail.

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
10. Photos belong to `RUN + Machine`, not the machine master record.

## 9. UI/UX Direction
- Design system: Golden Ratio based spacing (`4, 8, 13, 21, 34, 55`) and layout (`61.8% / 38.2%`).
- Chosen earthy palette:
  - Primary: `#6B7C59` (Muted Olive)
  - Accent: `#C46A3D` (Terracotta)
  - Contrast (darker accent): `#8A4A2A`
  - Background: `#F7F4F0` (Warm Cream)
  - Surface: `#FFFFFF`
  - Neutral family derived by desaturating primary by ~60%: `#E0DDD6`, `#C8C4BB`, `#A8A59E`.
  - 60/30/10 rule: 60% warm cream, 30% white/soft neutrals, 10% olive + terracotta accents.
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
