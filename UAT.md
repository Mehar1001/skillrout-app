# Skillrout Tester Training, Manual QA, and UAT Guide

This document trains a tester to use Skillrout, validates the complete business workflow, explains expected results, and shows the project administrator how to check application health in Firebase and the browser.

## 1. UAT environment

**Current UAT URL:**

https://08c0-2603-6081-f900-28-c33-f51d-d1b6-a7e6.ngrok-free.app/owner

**Firebase project:** `skillrout`

**Recommended browser:** Current Chrome or Edge on desktop. Safari may also be used for browser-compatibility testing.

The ngrok URL is temporary. The Skillrout development computer must remain powered on with Expo and ngrok running. If the URL stops responding, contact the development team for a new URL.

### Before testing

The tester needs:

- An unused email address that can receive verification messages.
- A second unused email address for the employee account.
- Permission to open the browser print dialog.
- Access to this document for expected calculations.
- Chrome Developer Tools for recording technical errors.

Do not use real customer, employee, store, or financial information during UAT.

## 2. Skillrout concepts and user training

### Owner

The owner is the business administrator. Owners create stores, onboard machines, create employee accounts, and review business activity.

### Employee

An employee records machine readings at stores assigned by the owner. Employees cannot manage the owner's stores, machines, or employee accounts.

### Last settled reading

Each machine has cumulative IN and OUT meter readings. The **Last Settled IN/OUT** values are the approved baseline from the most recently submitted positive settlement.

### Present reading

The employee enters the current cumulative IN and OUT readings displayed by the machine.

### RUN

RUN calculates and permanently records a visit. RUN does **not** change the machine's settled baseline.

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
| Vendor percentage | 50 |
| Machine number | UAT-001 |
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

### Test 4.1 — Register an owner

1. Open the UAT URL.
2. If ngrok displays a browser warning, select **Visit Site**.
3. Select **Create Account**.
4. Enter `Skillrout UAT Business` as the business name.
5. Enter an unused email address that the tester can open.
6. Enter a password with at least six characters, one letter, one number, and one of `@$!%*?&`. Example: `Test123!`.
7. Select **Create Account**.

Expected:

- The fields accept typing.
- A message says that a verification email was sent.
- A user appears in Firebase Authentication.
- An owner document appears at `owners/{ownerUid}`.

### Test 4.2 — Verify email and sign in

1. Open the verification email. Check spam if necessary.
2. Follow the verification link.
3. Return to the UAT URL.
4. Select **Sign In**.
5. Enter the owner email and password.
6. Select **Sign In**.

Expected:

- An unverified owner is blocked with a clear message.
- A verified owner reaches the Skillrout dashboard.
- The dashboard shows the signed-in email.

### Test 4.3 — Session and password reset

1. Refresh the dashboard and confirm the session remains active.
2. Log out.
3. Enter the owner email on the sign-in screen.
4. Select **Forgot password?**.
5. Confirm the reset email arrives.
6. Sign in again to continue UAT.

Expected:

- Refresh does not unexpectedly sign the user out.
- The reset email arrives and its link opens Firebase's password-reset flow.

## 5. Owner setup workflow

### Test 5.1 — Create and edit a store

1. Open **Stores** from the dashboard.
2. Create `UAT Store 1` at `100 Test Street`.
3. Enter 50% for the store and 50% for the vendor.
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
3. Add machine number `UAT-001` and name `Front Machine`.
4. Enter Last Settled IN `1000` and Last Settled OUT `500`.
5. Save and refresh.

Expected:

- The machine remains linked to the store.
- Baselines remain 1000 and 500.
- Firestore contains `owners/{ownerUid}/stores/{storeId}/machines/{machineId}`.

### Test 5.3 — Create and assign an employee

1. Open **Employees**.
2. Enter the employee name, unused email, and a temporary password.
3. Select `UAT Store 1` under **Assigned stores**.
4. Select **Create Employee**.
5. Confirm the employee appears as Active with one assigned store.
6. Attempt to create another employee without selecting a store.

Expected:

- Firebase Authentication contains the employee account.
- Firestore contains `employees/{employeeUid}` with the owner's UID and assigned store ID.
- Creation without a store assignment is rejected.

## 6. Employee training and visit workflow

### Test 6.1 — Employee login and authorization

1. Log out from the owner account.
2. Sign in using the employee email and temporary password.
3. Confirm the employee lands on store selection.
4. Confirm only assigned stores are visible.
5. Manually try these paths in the address bar: `/stores`, `/machines`, and `/employees`.

Expected:

- The employee does not enter the owner dashboard.
- Only assigned stores are shown.
- Owner-only routes redirect or remain inaccessible.

### Test 6.2 — Positive RUN

1. Select `UAT Store 1`.
2. Confirm machine `UAT-001` displays Last Settled IN 1000 and OUT 500.
3. Enter Present IN `1200` and Present OUT `600`.
4. Select **RUN**.
5. Compare every result with the expected table in section 3.
6. In Firestore, open the new visit before printing or submitting.

Expected:

- A permanent visit exists at `owners/{ownerUid}/visits/{visitId}`.
- `settlementStatus` is `not_submitted`.
- `printStatus` is `not_printed`.
- Machine baselines are still 1000 and 500.

### Test 6.3 — PRINT without settlement

1. Select **PRINT**.
2. Confirm the print dialog or receipt preview opens.
3. Canceling the physical print is acceptable for UAT.
4. Recheck the visit and machine in Firestore.

Expected:

- The visit has `printStatus: printed`.
- The receipt uses the store, machine, readings, percentages, and totals saved in the visit.
- Machine baselines remain 1000 and 500.

### Test 6.4 — SUBMIT settlement

1. Confirm Total Net is positive and percentages total 100.
2. Select **SUBMIT**.
3. Confirm a receipt opens and the app returns to store selection.
4. Recheck Firestore.

Expected:

- The visit has `settlementStatus: submitted`.
- Settlement records who submitted and the submitted amounts.
- Machine Last Settled IN becomes 1200.
- Machine Last Settled OUT becomes 600.
- Submitting the same visit again is blocked.

### Test 6.5 — Zero run

1. Start a new visit with the 1200/600 settled baseline.
2. Enter Present IN `1300` and Present OUT `700`.
3. Select RUN.
4. Confirm Total Net is `0`.
5. Attempt SUBMIT.

Expected:

- The zero visit remains recorded.
- SUBMIT is blocked.
- Machine baselines remain 1200 and 600.

### Test 6.6 — Negative run

1. Start another visit.
2. Enter Present IN `1300` and Present OUT `800`.
3. Select RUN.
4. Confirm Total Net is `-100`.
5. Attempt SUBMIT.

Expected:

- The negative visit remains recorded.
- SUBMIT is blocked.
- Machine baselines remain 1200 and 600.

## 7. Error and boundary tests

The tester should also confirm:

- Blank required fields show understandable messages.
- Invalid emails are rejected.
- Duplicate owner emails are rejected.
- Weak passwords are rejected.
- Present readings below the last-settled readings are rejected.
- A store split not totaling 100 is rejected.
- Repeated clicks while a button says Loading do not create duplicates.
- Browser refresh does not lose already saved stores, machines, or visits.
- Mobile-width layout remains usable with no clipped buttons or fields.

## 8. Firebase application health checks

Use Firebase Console for project `skillrout`.

### Authentication health

Open **Firebase Console → Authentication → Users**.

Check:

- Owner and employee email addresses appear once.
- Owner email shows as verified after the verification link is used.
- No unexpected test accounts were created.
- Disabled users cannot sign in.

A user in Authentication but no corresponding Firestore owner/employee document indicates a partial account-creation failure.

### Firestore health

Open **Firebase Console → Firestore Database → Data**.

Expected structure:

```text
owners/{ownerUid}
owners/{ownerUid}/stores/{storeId}
owners/{ownerUid}/stores/{storeId}/machines/{machineId}
owners/{ownerUid}/visits/{visitId}
employees/{employeeUid}
```

Check:

- Owner documents have `businessName` and `subscriptionStatus: active`.
- Employee documents have `ownerId`, `active: true`, and `assignedStoreIds`.
- Stores have percentages totaling 100.
- Machines have sensible `lastSettledIn` and `lastSettledOut` values.
- RUN creates a visit without changing machine baselines.
- PRINT changes only print-related fields.
- SUBMIT changes settlement fields and machine baselines together.
- No visit is submitted when `totalNet <= 0`.

Do not manually edit financial or historical data during UAT. Take a screenshot and report the discrepancy first.

### Cloud Functions health

Open **Firebase Console → Functions**.

Expected live functions:

- `createEmployee`
- `submitVisit`

For each function, inspect invocations, errors, execution time, and logs.

Healthy condition:

- Employee creation produces a successful `createEmployee` invocation.
- Settlement submission produces a successful `submitVisit` invocation.
- Error count remains zero during valid tests.
- Intentional invalid tests may produce permission or precondition errors, but not crashes.

Open **Google Cloud Logs Explorer** from a function to inspect individual failures. Filter by function name and severity `ERROR`.

### Usage and billing health

Open **Firebase Console → Usage and billing**.

Check:

- Function invocation volume matches UAT activity.
- Firestore reads/writes are reasonable for the number of test steps.
- No unexpected traffic spike appears.
- Billing alerts are configured for the Blaze project.

Cloud Functions container images older than seven days are configured for automatic cleanup.

## 9. Browser and debug-console health checks

### Chrome Console

1. Open the Skillrout URL.
2. Press **Option + Command + J** on macOS or **Ctrl + Shift + J** on Windows.
3. Select **Console**.
4. Clear old messages.
5. Repeat the failing step.

Healthy condition:

- No red uncaught exceptions.
- No `permission-denied`, `unauthorized`, `failed-precondition`, CORS, or network errors during a valid workflow.

Warnings about deprecated shadow style properties are known development warnings and do not block UAT, but should be recorded as Low severity.

### Chrome Network panel

1. Open Developer Tools → **Network**.
2. Enable **Preserve log**.
3. Repeat the action.
4. Filter using `firestore`, `identitytoolkit`, `createEmployee`, or `submitVisit`.
5. Select failed red requests and record status, response, and request name.

Healthy condition:

- Authentication requests succeed.
- Firestore requests do not return 403 during authorized actions.
- Callable functions return success for valid employee creation and positive settlement submission.

Never send screenshots containing passwords, authentication tokens, Firebase CI tokens, or ngrok tokens.

## 10. Local/ngrok service health for the administrator

The UAT URL requires two local processes:

```bash
npx expo start --web
npx ngrok http 8081
```

Local check:

```bash
curl -I http://127.0.0.1:8081/owner
```

Expected: `HTTP/1.1 200 OK`.

Public check:

```bash
curl -I https://YOUR-NGROK-DOMAIN/owner
```

Expected: HTTP 200. If ngrok shows a warning page in a browser, select **Visit Site**.

If local works but public fails, restart ngrok and share the new URL. If both fail, restart Expo from the Skillrout project folder.

## 11. Defect reporting template

For every issue, record:

```text
Title:
UAT section and step:
Date/time:
Tester:
Browser/device:
Account role: Owner or Employee
Expected result:
Actual result:
Repeatable: Always / Sometimes / Once
Severity: Blocker / High / Medium / Low
Screenshot or recording:
Browser Console error:
Network request/status:
```

Severity definitions:

- **Blocker:** Cannot continue UAT; authentication or core workflow is unavailable.
- **High:** Incorrect data, unauthorized access, or broken RUN/PRINT/SUBMIT invariant.
- **Medium:** Workflow works only with a workaround or displays misleading information.
- **Low:** Cosmetic, wording, spacing, or non-blocking warning.

## 12. UAT sign-off

UAT can be accepted when:

- Owner registration, verification, login, reset, and session tests pass.
- Store, machine, and employee setup tests pass.
- Assigned-store security passes.
- Positive RUN, PRINT, and SUBMIT tests pass with expected calculations.
- Zero and negative submissions are blocked.
- No Blocker or High defects remain.
- Firebase shows correct visit snapshots and settlement baselines.

Sign-off:

```text
Business/SME name:
Tester name:
Date:
Decision: Accepted / Accepted with conditions / Rejected
Open defects accepted for later release:
Comments:
```
