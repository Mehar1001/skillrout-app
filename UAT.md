# Skillrout Manual QA and UAT Guide

## Purpose

Validate the complete Skillrout owner, employee, machine-reading, printing, and settlement workflow against the live `skillrout` Firebase project.

## Test environment

- App URL: use the ngrok HTTPS URL supplied by the development team and add `/owner`
- Browser: current Chrome, Edge, or Safari
- Firebase project: `skillrout`
- Use unique email addresses that are not already registered

## Test data

Use these values so the calculations are easy to verify:

- Business: `Skillrout UAT Business`
- Store: `UAT Store 1`
- Address: `100 Test Street`
- Store share: `50`
- Vendor share: `50`
- Machine number: `UAT-001`
- Machine name: `Front Machine`
- Initial settled IN: `1000`
- Initial settled OUT: `500`
- Positive run present IN: `1200`
- Positive run present OUT: `600`

Expected positive calculation:

- New IN: `200`
- New OUT: `100`
- Total net: `100`
- Store amount: `50`
- Vendor amount: `50`
- Cash due location: `150`

## A. Owner registration and authentication

1. Open `<ngrok-url>/owner`.
2. Select the option to create an owner account.
3. Enter the business name, a unique owner email, and a password containing at least one letter, number, and special character.
4. Submit registration.
5. Confirm that the app says a verification email was sent.
6. Open the email and follow the verification link.
7. Return to `<ngrok-url>/owner` and sign in.
8. Confirm that the owner dashboard appears.
9. Refresh the browser and confirm that the session remains active.
10. Log out, enter the owner email, select **Forgot password**, and confirm that a reset email arrives.
11. Sign in again to continue.

Pass criteria:

- Unverified owners cannot enter the dashboard.
- Verified owners reach the dashboard.
- Password-reset email is received.
- Refreshing does not unexpectedly end the session.

## B. Store onboarding

1. From the dashboard, open **Stores**.
2. Create `UAT Store 1` at `100 Test Street`.
3. Set the split to 50% store and 50% vendor.
4. Save and confirm the store appears.
5. Refresh and confirm the store remains.
6. Edit the address, save, and confirm the update persists.

Pass criteria:

- Store creates and updates successfully.
- Percentages that do not total 100 are rejected.

## C. Machine onboarding

1. Open **Machines**.
2. Select `UAT Store 1`.
3. Add machine `UAT-001`, named `Front Machine`.
4. Enter last settled IN `1000` and last settled OUT `500`.
5. Save and refresh.

Pass criteria:

- Machine remains linked to the selected store.
- Both baseline readings remain `1000` and `500` before a settlement is submitted.

## D. Employee creation and store assignment

1. Open **Employees**.
2. Enter a unique employee email, name, and temporary password.
3. Select `UAT Store 1` under assigned stores.
4. Create the employee.
5. Confirm the employee appears as Active with one assigned store.
6. In Firebase Console, optionally verify `employees/{uid}` contains the correct `ownerId` and `assignedStoreIds`.

Pass criteria:

- Employee Authentication user and Firestore employee document are created together.
- Creating an employee without an assigned store is rejected.

## E. Employee login and access

1. Log out from the owner account.
2. Sign in at `/owner` using the employee email and temporary password.
3. Confirm that the app opens store selection, not the owner dashboard.
4. Confirm that only assigned stores appear.
5. Try opening `/stores`, `/machines`, and `/employees` directly.

Pass criteria:

- Employee reaches store selection.
- Unassigned stores do not appear.
- Owner-only screens redirect away or remain inaccessible.

## F. Positive RUN, PRINT, and SUBMIT

1. Select `UAT Store 1`.
2. Confirm machine `UAT-001` shows last settled IN `1000` and OUT `500`.
3. Enter present IN `1200` and present OUT `600`.
4. Select **RUN**.
5. Confirm the results show New IN `200`, New OUT `100`, total net `100`, store amount `50`, vendor amount `50`, and cash due location `150`.
6. Select **PRINT** and verify the browser print dialog or receipt preview opens.
7. Before submitting, verify the machine baseline still reads `1000` / `500` in Firestore.
8. Select **SUBMIT**.
9. Verify the receipt opens and the app returns to store selection.
10. Verify the machine baseline is now `1200` / `600` and the visit is `submitted` in Firestore.

Pass criteria:

- RUN permanently creates a visit but does not update machine baselines.
- PRINT marks the visit printed but does not update baselines.
- SUBMIT is the only action that updates baselines.
- Receipt values match the visit snapshot.

## G. Zero and negative runs

Zero run:

1. With settled baseline `1200` / `600`, enter present IN `1300` and OUT `700`.
2. Select RUN and confirm total net is `0`.
3. Attempt SUBMIT.
4. Confirm submission is blocked.

Negative run:

1. Start another visit using present IN `1300` and OUT `800`.
2. Select RUN and confirm total net is `-100`.
3. Attempt SUBMIT.
4. Confirm submission is blocked.

Pass criteria:

- Zero and negative visits remain permanently recorded.
- Neither visit advances machine baselines.

## H. Firestore verification

In Firebase Console → Firestore Database → Data, inspect:

- `owners/{ownerUid}`
- `owners/{ownerUid}/stores/{storeId}`
- `owners/{ownerUid}/stores/{storeId}/machines/{machineId}`
- `owners/{ownerUid}/visits/{visitId}`
- `employees/{employeeUid}`

Confirm that visits preserve store and machine snapshots and that only a submitted positive visit changes `lastSettledIn` and `lastSettledOut`.

## I. UAT sign-off

Record each issue with:

- Test section and step
- Expected result
- Actual result
- Screenshot or screen recording
- Browser/device
- Severity: Blocker, High, Medium, or Low

Sign-off decision:

- **Accepted:** all critical workflows pass with no Blocker or High defects.
- **Accepted with conditions:** only documented Medium/Low defects remain.
- **Rejected:** any authentication, data isolation, RUN/PRINT/SUBMIT, or calculation invariant fails.
