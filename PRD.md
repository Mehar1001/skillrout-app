---
agent: devin-local
session: quasar-lasagna
created: 2026-08-18T20:01:50Z
---

# Skillrout — Product Requirements Document

## 1. Overview

Skillrout is a mobile and web-compatible store-and-machine settlement application. It is built with **Expo 53.0.20**, **React Native 0.79.5**, **Firebase 12**, **TypeScript**, and **Expo Router**. The app lets employees visit stores, record cumulative machine IN/OUT readings, calculate cash/payout/net, capture meter and receipt photos, and generate thermal receipts. Owners manage stores, machines, employees, and settlement history.

## 2. Problem Statement

Businesses with machines across multiple stores currently track readings manually, use spreadsheets/calculators, store photos separately, and have no clear separation between a physical visit and a financial settlement. This causes errors, lost history, and over-advanced baselines.

## 3. Proposed Solution

A centralized Expo + Firebase app with role-based access that records every store visit, separates `RUN`, `PRINT`, and `SUBMIT`, and only advances `Last Settled` readings on a submitted, positive settlement.

## 4. User Roles

### Owner / Admin

- Request an account; admin approval is required before signing in.
- Create and manage employees, stores, and machines.
- Enter initial `Last Settled` readings.
- View all visits, settlements, and photos.
- Reprint receipts and run reports.

### Employee

- Log in with the owner-provided email and temporary/reset password.
- Select an active, assigned store.
- View assigned machines and `Last Settled` readings.
- Enter `Present IN/OUT` and take optional machine photo.
- Press `RUN` to save the visit permanently.
- For positive net: `Submit & Print` finalizes settlement and advances baselines.
- For zero/negative net: only `Print Receipt` is available.

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

- `id`, `email`, `name`, `businessName`, `subscriptionStatus`, `status`, `createdAt`, `updatedAt`

### Pending owner (before approval)

`pendingOwners/{uid}`

- `email`, `businessName`, `status: 'pending'`, `createdAt`, `updatedAt`

### Employee

`employees/{employeeId}` (top-level collection)

- `id` (Auth UID), `email`, `name`, `active`, `role: 'employee'`, `ownerId`, `businessName`, `assignedStoreIds`, `mustChangePassword`, `createdAt`, `updatedAt`

### Store

`owners/{ownerId}/stores/{storeId}`

- `id`, `name`, `address`, `phone`, `active`, `defaultStorePercent`, `defaultVendorPercent`, `createdAt`, `updatedAt`

### Machine

`owners/{ownerId}/stores/{storeId}/machines/{machineId}`

- `id`, `machineNumber` (user-editable positive integer, unique within store), `legacyMachineNumbers`, `name`, `storeId`, `lastSettledIn`, `lastSettledOut`, `lastSubmittedVisitId`, `lastSubmittedAt`, `active`, `createdAt`, `updatedAt`

### Visit

`owners/{ownerId}/stores/{storeId}/visits/{visitId}`

- `id`, `ownerId`, `storeId`, `storeName`, `storeAddress`, `employeeId`, `employeeName`, `businessDate` (YYYY-MM-DD), `timestamp`
- per machine: `machineId`, `machineNumber`, `name`, `lastSettledIn`, `lastSettledOut`, `presentIn`, `presentOut`, `newIn`, `newOut`, `machineNet`, `photoUrl`, `photoPath`
- `totalNewIn`, `totalNewOut`, `totalNet`, `result: 'positive'|'zero'|'negative'`, `storePercent`, `vendorPercent`, `storeAmount`, `vendorAmount`, `cashDueLocation`
- `visitStatus: 'completed'`, `settlementStatus: 'not_submitted'|'submitted'`, `printStatus: 'not_printed'|'printed'`, `printedAt`, `printedBy`
- `settlement` and `voided` sub-documents (voided is not yet implemented)

## 7. User Flows

### 7.1 Owner/Admin — Onboarding and sign-in

1. Open the public home page (`/`).
2. Choose **Get Started** / **Create Owner Account** to go to `/owner/register`.
3. Enter business name, email, and a strong password (10–128 characters with a letter, number, and special character).
4. Submit the request; an admin must approve the owner before the account can sign in.
5. After approval, sign in at `/owner/login` and verify the email.
6. Create employees, stores, and machines from the owner workspace.

### 7.2 Employee — Visit & Settlement

1. Sign in at `/employee/login` with the owner-provided credentials.
2. For first login with a temporary password, change the password when prompted.
3. Select an active, assigned store from `/select-store`.
4. View the machines and their `Last Settled IN/OUT` values.
5. Enter `Present IN/OUT` for each machine; optional photo capture.
6. Press `RUN`. The app records a permanent visit and shows staged progress. If the browser times out, use **Check Status** to verify the result.
7. After a positive net: go to `/settlement`, review the read-only store/games split, then `/outcome`.
8. In `/outcome`:
   - Positive: `Submit & Print` finalizes settlement and advances baselines; `Print Receipt` only marks the visit printed.
   - Zero/negative: `Print Receipt` only.
9. `PRINT` marks `printStatus: 'printed'`. `SUBMIT` advances `machine.lastSettledIn/Out` to the visit's present readings.

### 7.3 Store Onboarding

- Owner or employee creates a store record with name, address, phone, and a default split that totals 100%.

### 7.4 Machine Onboarding

- Owner or employee adds a machine to a store.
- The machine number is assigned automatically as the next positive integer (`1`, `2`, `3`, …) in the store.
- The owner/employee enters initial `Last Settled IN/OUT` to set the baseline.
- Machine numbers are displayed as plain integers only. Old values are preserved in `legacyMachineNumbers` for OCR/history matching.

### 7.5 History & Reporting

- Owner history is `app/(owner)/history.tsx`.
- Employee history is `app/(employee)/employee-history.tsx`.
- `app/(owner)/reports.tsx` provides date-range reports and printable output.
- `app/(owner)/settings.tsx` lets owners update their password.

## 8. Business Rules

1. `RUN` records the visit and never changes `Last Settled`.
2. `PRINT` never changes `Last Settled`.
3. `SUBMIT` is the only action that advances `Last Settled`.
4. `Net > 0` required for `SUBMIT`.
5. `Store % + Vendor % = 100%` before `SUBMIT`.
6. Every `RUN` is a permanent, separate history event.
7. Calculations use `Last Settled Reading`, not the latest `RUN`.
8. Thermal receipt supports 80 mm.
9. Submitted settlements are locked from normal employee editing.
10. Photos belong to `RUN`, not the machine master record.
11. Machine numbers are user-editable positive integers (e.g., `1`, `2`, `3`) and must be unique within a store. No `#`, `Serial`, or free-text prefix is displayed.
12. Historical visits preserve the `machineNumber` value that was current at the time of the visit.
13. Machine deletion does not affect historical visit data (visits have snapshots).

## 9. UI/UX Direction

- Design system: calm, premium, Apple-meets-Notion aesthetic with a cream background and earthy green/terracotta accents.
- `constants/designTokens.ts` is the source of truth for all colors and spacing.
- Touch targets are at least 44×44 px.
- Machine numbers are small, supporting labels; machine names are visually primary.
- Receipts show the plain number on the left before the machine name, e.g. `1  Lightning winds`.

## 10. Success Criteria

- Employee can complete a store visit using only: read → enter → photo → RUN → review → submit/print.
- Owner can answer all audit questions (who, when, what, settled, receipt) without external tools.
- `Last Settled` only advances on submitted, positive runs.
- The app runs on iOS, Android, and web.

## 11. Known Gaps (Not Yet Implemented)

- Audit log
- Void / correct flow
- Employee edit, disable, and reassign
- Machine store reassignment
- History pagination
- 58 mm thermal receipt support
- Cloud Functions rate limiting

## 12. Receipt and report output formats

- The receipt and owner report screens retain a dedicated **Print** action for the normal browser or native print dialog.
- A **Share** action opens a format menu with **Share as PDF** and **Share as JPEG**.
- Native devices create a PDF or JPEG file and open the operating system share sheet.
- Web browsers use the Web Share API when file sharing is supported and otherwise download the selected file.
- Sharing a receipt marks it as printed, consistent with the existing print-status rule.
