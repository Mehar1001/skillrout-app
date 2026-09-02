# Skillrout Tester Training, Manual QA, and UAT Guide

This document trains a tester to use Skillrout, validates the complete business workflow, explains expected results, and shows the project administrator how to check application health in Firebase and the browser.

## 1. UAT environment

**Production URL:** `https://skillrout.web.app`

**Firebase project:** `skillrout`

**Recommended browser:** Current Chrome, Edge, or Safari on desktop or mobile.

### Before testing

The tester needs:

- A real email address that can receive verification and reset messages.
- A second real email address for the employee account.
- Permission to open the browser print dialog.
- Access to this document for expected calculations.
- Chrome/Safari Developer Tools for recording technical errors.

Do not use real customer, employee, store, or financial information during UAT.

## 2. Skillrout concepts and user training

### Owner

The owner is the business administrator. Owners request an account, create stores, onboard machines, create employee accounts, and review business activity.

### Employee

An employee records machine readings at stores assigned by the owner. Employees cannot manage the owner's stores, machines, or employee accounts.

### Last settled reading

Each machine has cumulative IN and OUT meter readings. The **Last Settled IN/OUT** values are the approved baseline from the most recently submitted positive settlement.

### Present reading

The employee enters the current cumulative IN and OUT readings displayed by the machine.

### RUN

RUN calculates and permanently records a visit. RUN does **not** change the machine's settled baseline. The `RUN` button shows staged progress and a timeout / Check Status option if the browser does not get a response.

### PRINT

PRINT opens the receipt and marks the visit printed. PRINT does **not** change the machine's settled baseline.

### SUBMIT

SUBMIT finalizes a positive settlement and advances the machine's Last Settled IN/OUT values. It is the only action that may advance the baseline.

### Calculation

For each machine:

- New IN = Present IN − Last Settled IN
- New OUT = Present OUT − Last Settled OUT
- Machine Net = New IN − New OUT

For the visit:

- Total Net = Total New IN − Total New OUT
- Store Amount = Total Net × Store Percentage
- Vendor Amount = Total Net − Store Amount
- Cash Due Location = Total New OUT + Store Amount

Money is rounded to two decimal places.

## 3. Standard UAT test data

Use these values so results are easy to verify:

| Field | Value |
|---|---|
| Business name | Skillrout UAT Business |
| Store name | UAT Store 1 |
| Address | 100 Test Street |
| Store percentage | 50 |
| Vendor/Games percentage | 50 |
| Machine number | `1` (auto-assigned) |
| Machine name | Front Machine |
| Initial settled IN | 1000 |
| Initial settled OUT | 500 |
| Positive present IN | 1200 |
| Positive present OUT | 600 |

Expected positive result:

| Result | Expected value |
|---|---:|
| New IN | 200.00 |
| New OUT | 100.00 |
| Total Net | 100.00 |
| Store Amount | 50.00 |
| Vendor Amount | 50.00 |
| Cash Due Location | 150.00 |

## 4. Owner registration and authentication

### Test 4.1 — Request owner access

1. Open `https://skillrout.web.app`.
2. Tap **Get Started** or **Create Owner Account**.
3. Enter `Skillrout UAT Business` as the business name.
4. Enter an unused email address that the tester can open.
5. Enter a strong password (10–128 characters, at least one letter, one number, and one of `@$!%*?&`). Example: `SkillTest9!`.
6. Submit the request.

Expected:

- A message says the request was submitted for approval.
- A `pendingOwners/{uid}` document is created.
- The owner cannot sign in until approved.

### Test 4.2 — Approve owner and verify email

1. In the Firebase Console or an approved admin flow, approve the owner.
2. The owner opens the verification email and follows the link.
3. Return to `https://skillrout.web.app/owner/login`.
4. Enter the owner email and password.
5. Sign in.

Expected:

- An unverified owner is blocked with a clean message.
- A verified, active owner reaches the **Owner Dashboard**.

### Test 4.3 — Session and password reset

1. Refresh the dashboard and confirm the session remains active.
2. Log out; you are returned to `/`.
3. Enter the owner email on `/owner/login`.
4. Tap **Forgot password?**.
5. Confirm the reset email arrives.
6. The reset link routes to `https://skillrout.web.app/auth/action`.
7. Sign in again to continue UAT.

Expected:

- Refresh does not unexpectedly sign the user out.
- The reset email arrives and the custom Skillrout action flow works.

## 5. Owner setup workflow

### Test 5.1 — Create and edit a store

1. Open **Stores** from the dashboard.
2. Create `UAT Store 1` at `100 Test Street`.
3. Enter 50% for the store and 50% for the vendor/games split.
4. Save the store.
5. Refresh the page.
6. Edit the address, save, and refresh again.
7. Try percentages that do not total 100.

Expected:

- The store remains after refresh.
- Changes persist after refresh.
- Percentages that do not total 100 are rejected.
- Firestore contains `owners/{ownerUid}/stores/{storeId}`.

### Test 5.2 — Onboard a machine

1. Open **Machines**.
2. Select `UAT Store 1`.
3. Add a machine; the **Number** is auto-assigned `1`.
4. Enter name `Front Machine`.
5. Enter Last Settled IN `1000` and Last Settled OUT `500`.
6. Save and refresh.

Expected:

- The machine remains linked to the store as `1 Front Machine`.
- No `#`, `Serial`, or `Machine Number` prefix is shown.
- Baselines remain 1000 and 500.
- Firestore contains `owners/{ownerUid}/stores/{storeId}/machines/{machineId}`.

### Test 5.3 — Create and assign an employee

1. Open **Employees**.
2. Enter the employee name, unused email, and a strong temporary password.
3. Select `UAT Store 1` under **Assigned stores**.
4. Tap **Create Employee**.
5. Confirm the employee appears as Active with one assigned store.
6. Attempt to create another employee without selecting a store.

Expected:

- Firebase Authentication contains the employee account.
- Firestore contains `employees/{employeeUid}` with `ownerId` and `assignedStoreIds`.
- The employee is created with `mustChangePassword: true`.
- Creation without a store assignment is rejected.

## 6. Employee visit workflow

### Test 6.1 — Employee login and store selection

1. Open `https://skillrout.web.app/employee/login`.
2. Enter the employee email and temporary/reset password.
3. First-time employees are forced to change the password.
4. The employee reaches `/select-store` and sees only `UAT Store 1`.

### Test 6.2 — Enter readings

1. Select `UAT Store 1` and tap **Start**.
2. The business date is today.
3. Enter Present IN `1200` and Present OUT `600` for machine `1`.

Expected:

- The app shows New IN `200.00`, New OUT `100.00`, and Machine Net `100.00`.
- Values below Last Settled are rejected.
- The **RUN** button enables when all machines have valid readings.

### Test 6.3 — RUN the visit

1. Tap **RUN**.
2. Watch the staged progress messages.
3. Wait for the success or Check Status result.

Expected:

- A permanent visit is saved at `owners/{ownerUid}/stores/{storeId}/visits/{visitId}`.
- `lastSettled` values on the machine do **not** change.
- The visit is `not_submitted` and `not_printed`.

### Test 6.4 — Settlement and SUBMIT

1. After a positive RUN, review the read-only split on `/settlement`.
2. Tap **Save Split and Continue**.
3. On `/outcome`, tap **Submit & Print**.
4. Print or save the receipt.

Expected:

- `settlementStatus` becomes `submitted`.
- `machine.lastSettledIn` becomes `1200` and `lastSettledOut` becomes `600`.
- Receipt shows `1 Front Machine` with the correct movement.

### Test 6.5 — PRINT only

1. Run a second visit with the new baselines.
2. On `/outcome`, tap **Print Receipt** only.

Expected:

- `printStatus` becomes `printed`.
- `settlementStatus` stays `not_submitted`.
- `machine.lastSettled` values do **not** change.

### Test 6.6 — Zero or negative visit

1. Run a visit where Present IN equals Last Settled and Present OUT is higher (negative net).
2. On `/outcome`, confirm **Submit & Print** is hidden and only **Print Receipt** appears.

Expected:

- The visit can be printed but not submitted.
- Baselines do not change.

### Test 6.7 — Employee history

1. From the bottom tabs, tap **History**.
2. Confirm only visits for assigned stores are visible.
3. Tap a visit to view details or reprint.

## 7. Owner review

### Test 7.1 — History

1. From the owner dashboard, open **History**.
2. Confirm every visit appears with result, settlement status, and print status.

### Test 7.2 — Reports

1. Open **Reports**.
2. Select a date range.
3. View/print the report.

Expected:

- Reports use visit snapshots.
- Machine numbers are plain `1`, `2`, `3`, etc.

## 8. Browser and console health checks

1. Open DevTools → Console.
2. Complete the owner and employee flows.
3. Confirm no unhandled errors, permission-denied errors, or repeated token-refresh loops.
4. Check Firebase Console → Functions for `us-central1` deployments and no error spikes.
5. Check Firestore → `owners/{ownerUid}/stores/{storeId}/visits`.
6. Confirm Authentication has the owner and employee accounts.

## 9. Common issues

| Symptom | Cause / Fix |
|---|---|
| "Present IN must be equal to or greater than Last Settled IN" | Typed a number lower than the baseline. |
| "Store % and Games % must add up to 100" | Split does not total 100; it is read-only and comes from the store. |
| Submit & Print is missing | Total Net is zero or negative. |
| Cannot see a store | Employee is not assigned; ask owner to update assignments. |
| RUN appears to hang | Use **Check Status** after the timeout; the Cloud Function may have completed. |
| Loading forever after sign-in | Check internet; clear the tab and sign in again. |

## 10. Sign-off

| Scenario | Result |
|---|---|
| Owner request/approval/verify | |
| Employee login + password change | |
| Store and machine onboarding | |
| RUN (baseline unchanged) | |
| PRINT (baseline unchanged) | |
| SUBMIT (baseline advanced on positive) | |
| Zero/negative visit (no submit) | |
| History and reports | |
| Console / Firebase health | |

### Test 7.3 — Share receipt and report files

1. Open a completed visit's receipt screen.
2. Select **Share** and confirm the menu shows **Share as PDF** and **Share as JPEG**.
3. Select PDF and confirm a readable PDF is shared or downloaded.
4. Repeat with JPEG and confirm an image file is shared or downloaded.
5. Open the owner Reports screen and repeat both formats.
6. Confirm the existing **Print** action still opens the print dialog.

Expected:

- PDF filenames end in `.pdf`; JPEG filenames end in `.jpg`.
- Receipt output shows the plain number before the machine name, for example `1  Front Machine`.
- The receipt remains based on the immutable visit snapshot.
- Sharing a receipt marks `printStatus` as `printed`; it does not alter machine baselines.
