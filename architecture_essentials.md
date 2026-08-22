---
agent: devin-local
session: quasar-lasagna
created: 2026-08-18T20:02:20Z
---
# Skillrout — Architecture Essentials

Quick-reference for the most important technical decisions.

## 1. Stack
- Expo 53.0.20 + React Native 0.79.5 + Expo Router
- Firebase 12 (Auth, Firestore, Storage, Cloud Functions)
- `expo-print` + `expo-sharing`
- `expo-image-picker` for photos
- TypeScript; types in `types/index.ts`

## 2. Must-Remember Rules
1. `RUN` creates a permanent visit via `runVisit`; it never updates `machine.lastSettled`.
2. `PRINT` only flips `visit.printStatus`.
3. `SUBMIT` is the only operation that advances `machine.lastSettled` (via `submitVisit`).
4. `SUBMIT` requires `totalNet > 0` and `storePercent + vendorPercent === 100`.
5. `submitVisit` runs in a Firestore transaction and verifies `lastSettled` hasn't changed.
6. Percentage splits are saved separately through `setVisitSplit` before `submitVisit`.
7. Every receipt uses the `visit` snapshot, not live machine data.
8. Photos belong to the visit, not the machine master record.

## 3. Key Collections
- `owners/{ownerId}`
- `owners/{ownerId}/stores/{storeId}`
- `owners/{ownerId}/stores/{storeId}/machines/{machineId}`
- `owners/{ownerId}/visits/{visitId}`
- `employees/{employeeId}` (top-level)
- `owners/{ownerId}/auditLog/{logId}` (planned, not implemented)

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
```ts
await runTransaction(db, async (transaction) => {
  const visit = await transaction.get(visitRef);
  // Verify totalNet > 0, split totals 100, and matches saved split
  const machineDocs = await transaction.getAll(...machineRefs);
  machineDocs.forEach((machineDoc, i) => {
    const current = machineDoc.data();
    if (
      current.lastSettledIn !== visit.machines[i].lastSettledIn ||
      current.lastSettledOut !== visit.machines[i].lastSettledOut
    ) throw new HttpsError('aborted', 'Machine changed. Please run again.');
  });
  transaction.update(machineRef, {
    lastSettledIn: machine.presentIn,
    lastSettledOut: machine.presentOut,
    lastSubmittedVisitId: visitId,
    lastSubmittedAt: FieldValue.serverTimestamp(),
  });
  transaction.update(visitRef, { settlementStatus: 'submitted', /* ... */ });
});
```

## 6. Cloud Functions
- `createEmployee`
- `runVisit`
- `setVisitSplit`
- `submitVisit`

## 7. Color Tokens
**Original PRD palette (do not change `constants/designTokens.ts` unless asked):**
- Primary: `#6B7C59` (Muted Olive)
- Accent: `#C46A3D` (Terracotta)
- Background: `#F7F4F0`
- Surface: `#FFFFFF`

**Actual `constants/designTokens.ts` values:**
- Primary: `#8C6E5F`
- Accent: `#5F8C7B`
- Background: `#F4F1EA`
- Surface: `#FFFDFB`
- Success: `#5F8C7B`
- Error: `#C45A4A`
- Warning: `#C9A05C`
- Info: `#6E8CA3`

The discrepancy is documented; the code tokens remain the source of truth at runtime.

## 8. Missing / Planned Items
- Screens: `app/(owner)/reports.tsx`, `app/(owner)/settings.tsx`
- Components: `Select.tsx`, `Badge.tsx`, `MachineRow.tsx` (use `MachineReadingCard.tsx`), `VisitSummary.tsx`, `OwnerShell.tsx`
- Service: `services/employees.ts` (currently `employees.tsx` calls `createEmployee`)
- Features: audit log, void/correct, history pagination, `AsyncStorage` offline cache, 58 mm receipt, rate limiting, employee edit/disable/reassign, machine store reassignment
