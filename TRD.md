# Skillrout — Technical Requirements Document

## 1. Firebase Infrastructure

### Cloud Functions

- All Cloud Functions are deployed to and called from `us-central1`.
- Admin SDK is initialized in `functions/src/index.ts`:

```ts
setGlobalOptions({ region: 'us-central1' });
```

- The web client explicitly targets `us-central1` for every callable:

```ts
// firebaseConfig.ts
const functions = getFunctions(app, 'us-central1');
```

### Firestore

- Firestore is configured as the `nam5` multi-region.
- The client SDK uses the default project database.

### Authentication

- Firebase Auth email/password.
- Email verification required for owners.
- Custom password-reset action URL: `https://skillrout.web.app/auth/action`.

### Storage

- Storage bucket must be enabled in the Firebase Console for photo and receipt OCR workflows.
- Security rules restrict paths to authenticated users with valid roles.

## 2. Callable Cloud Functions

### Owner/employee lifecycle

- `registerOwnerProfile` — stores an owner request in `pendingOwners/{uid}`.
- `provisionOwner` — creates `owners/{uid}` after approval.
- `approveOwner` — admin approval.
- `createEmployee` — creates Auth user and `employees/{uid}`.
- `setEmployeeActive` — activates/deactivates.
- `resetEmployeeTemporaryPassword` — sets a new temporary password.
- `updateEmployeeAssignments` — updates `assignedStoreIds`.
- `employeeOnboardStore` — employee-initiated store creation.
- `employeeAddMachine` — employee-initiated machine creation with next number.

### Visit lifecycle

- `runVisit` — records a permanent `visit` without updating `machine.lastSettled`.
- `setVisitSplit` — updates split amounts on an unsubmitted visit.
- `submitVisit` — transaction that advances baselines only for positive, 100% split visits.
- `adjustVisit` — owner correction of an existing visit.

### OCR and utility

- `extractReceiptReadings` — Cloud Vision OCR with 365-day cache.
- `checkOcrUsage` — daily scan quota.
- `renumberStoreMachines` — owner-only renumber to `1…N` per store.
- `completePasswordReset` — reconciles emailed resets.
- `completeEmployeePasswordChange` — clears `mustChangePassword`.
- `prepareEmployeeSession` — marks employee email verified.

## 3. Machine Numbering

- Machine numbers are positive integers, assigned automatically per store.
- `helpers/machineOrdering.ts` provides numeric sorting.
- `renumberStoreMachines` preserves old values in `legacyMachineNumbers`.
- UI and receipts show plain numbers only; no `#`, `Serial`, `Machine #`, or `Machine Number` prefix.
- Historical visits preserve the number at the time of `RUN`.

## 4. RUN/PRINT/SUBMIT Semantics

### RUN

- Client supplies deterministic `visitId` (UUID).
- Cloud Function discovers active machines, then validates inside a Firestore transaction.
- If `visitId` already exists, returns `already-exists` instead of creating a duplicate.
- Does **not** update `machine.lastSettled`.
- Client shows staged progress, 30-second timeout, and `Check Status` fallback.

### PRINT

- Updates `visit.printStatus` to `printed`.
- Does **not** update `machine.lastSettled`.

### SUBMIT

- Validates `totalNet > 0` and `storePercent + vendorPercent === 100`.
- Confirms current `machine.lastSettledIn/Out` match the visit snapshot.
- Transaction updates `machine.lastSettledIn/Out = presentIn/Out` and `visit.settlementStatus = 'submitted'`.

## 5. Security Requirements

- `owners/{ownerId}`: owner full access.
- `employees/{employeeId}`: employee read-only access to own document.
- `owners/{ownerId}/stores/{storeId}`: employee read if in `assignedStoreIds`.
- `owners/{ownerId}/stores/{storeId}/machines/{machineId}`: employee read if store assigned.
- `owners/{ownerId}/stores/{storeId}/visits/{visitId}`: employee create; read own/assigned store; owner full.
- Storage paths restricted to `owners/{ownerId}/stores/{storeId}/visits/{visitId}/...`.

## 6. Staging

- `.firebaserc` defines `staging` alias pointing to `skillrout-staging`.
- This branch does not ship a separate staging Firebase web config.
- Current staging is **Hosting-only** and uses the production backend.
- To fully isolate staging, create a separate Firebase project and `.env.staging`.

## 7. Testing Requirements

- Client TypeScript: `npx tsc --noEmit`.
- Client lint: `npm run lint`.
- Client unit tests: `npm run test`.
- Functions build: `cd functions && npm run build`.
- Functions lint: `cd functions && npm run lint`.
- Functions tests: `cd functions && npm test`.
- Web export: `npx expo export --platform web`.
- Firestore/Storage rules tests: `npm run test:rules` (requires JDK 21+).
