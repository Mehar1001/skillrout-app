---
agent: devin-local
session: quasar-lasagna
created: 2026-08-18T20:02:20Z
---

# Skillrout — Architecture Essentials

Quick-reference for the most important technical decisions.

## 1. Stack

- Expo 53.0.20 + React Native 0.79.5 + Expo Router
- Firebase 12 (Auth, Firestore, Storage, Cloud Functions v2)
- `expo-print` + `expo-sharing`
- `expo-image-picker` for photos
- TypeScript; types in `types/index.ts`
- Cloud Functions region: `us-central1`
- Firestore: `nam5` multi-region

## 2. Must-Remember Rules

1. `RUN` creates a permanent visit via `runVisit`; it never updates `machine.lastSettled`.
2. `PRINT` only flips `visit.printStatus`.
3. `SUBMIT` is the only operation that advances `machine.lastSettled` via `submitVisit`.
4. `SUBMIT` requires `totalNet > 0` and `storePercent + vendorPercent === 100`.
5. `submitVisit` runs in a Firestore transaction and verifies `lastSettled` hasn't changed.
6. The split is read-only in the employee flow; it comes from the store defaults.
7. Every receipt uses the `visit` snapshot, not live machine data.
8. Photos belong to the visit, not the machine master record.
9. Machine numbers are plain `1…N` per store; no `#` or `Serial` prefix.
10. Old machine numbers are preserved in `legacyMachineNumbers` for OCR and history.

## 3. Key Collections

- `pendingOwners/{uid}`
- `owners/{ownerId}`
- `employees/{employeeId}`
- `owners/{ownerId}/stores/{storeId}`
- `owners/{ownerId}/stores/{storeId}/machines/{machineId}`
- `owners/{ownerId}/stores/{storeId}/visits/{visitId}`
- `ocrCache/{uid}_{imageHash}`
- `ocrUsage/{uid}_{today}`

## 4. Core Formulas

```ts
newIn  = presentIn  - lastSettledIn
newOut = presentOut - lastSettledOut
machineNet = newIn - newOut
totalNet = Σ newIn - Σ newOut
storeAmount = round2(totalNet * storePercent / 100)
vendorAmount = round2(totalNet - storeAmount)
cashDueLocation = round2(totalNewOut + storeAmount)
```

## 5. Concurrency Guard (Server)

`submitVisit` reads the visit and all machines in a transaction, confirms the split and net, then updates each machine and the visit atomically. If a machine baseline changed, it throws `aborted`.

## 6. Retry-Safe RUN

`runVisit` receives a client-generated `visitId`. If the visit already exists, it returns `already-exists` and does not create a duplicate. The client may timeout and use **Check Status** to confirm the backend result.

## 7. Cloud Functions

- `registerOwnerProfile` / `provisionOwner` / `approveOwner`
- `createEmployee` / `setEmployeeActive` / `resetEmployeeTemporaryPassword` / `updateEmployeeAssignments`
- `employeeOnboardStore` / `employeeAddMachine`
- `runVisit` / `setVisitSplit` / `submitVisit` / `adjustVisit`
- `extractReceiptReadings` / `checkOcrUsage`
- `completePasswordReset` / `completeEmployeePasswordChange` / `prepareEmployeeSession`
- `renumberStoreMachines`

## 8. Color Tokens

Source of truth: `constants/designTokens.ts`. Do not hardcode colors in screens; use `useColors()`.

## 9. Staging

- `.firebaserc` has a `staging` alias (`skillrout-staging`).
- This branch currently ships **Hosting-only** staging using the production backend.
- For a fully isolated staging environment, create a separate Firebase project and `.env.staging`.
