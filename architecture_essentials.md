---
agent: devin-local
session: quasar-lasagna
created: 2026-08-18T20:02:20Z
---
# Skillrout — Architecture Essentials

Quick-reference for the most important technical decisions.

## 1. Stack
- Expo 53 + React Native 0.79 + Expo Router
- Firebase Auth, Firestore, Storage, Cloud Functions
- `expo-print` + `expo-sharing`
- `expo-image-picker` for photos

## 2. Must-Remember Rules
1. `RUN` creates a permanent visit; it never updates `machine.lastSettled`.
2. `PRINT` only flips `visit.printStatus`.
3. `SUBMIT` is the only operation that advances `machine.lastSettled`.
4. `SUBMIT` requires `totalNet > 0` and `storePercent + vendorPercent === 100`.
5. `submitSettlement` must run in a Firestore transaction and verify `lastSettled` hasn't changed.
6. Every receipt uses the `visit` snapshot, not live machine data.
7. Photos belong to the visit, not the machine master record.

## 3. Key Collections
- `owners/{ownerId}`
- `owners/{ownerId}/employees`
- `owners/{ownerId}/stores`
- `owners/{ownerId}/stores/{storeId}/machines`
- `owners/{ownerId}/visits`
- `owners/{ownerId}/auditLog`

## 4. Core Formulas
```ts
newIn  = presentIn  - lastSettledIn
newOut = presentOut - lastSettledOut
machineNet = newIn - newOut
totalNet = Σ newIn - Σ newOut
storeAmount = round(totalNet * storePercent / 100)
vendorAmount = totalNet - storeAmount
cashDueLocation = totalNewOut + storeAmount
```

## 5. Concurrency Guard (Server)
```ts
await runTransaction(db, async (tx) => {
  const machine = await tx.get(machineRef);
  if (machine.lastSettledIn !== visit.lastSettledIn) throw 'baseline changed';
  tx.update(visitRef, { settlementStatus: 'submitted', ... });
  tx.update(machineRef, { lastSettledIn: visit.presentIn, ... });
});
```

## 6. Color Tokens (Chosen)
- Primary: `#6B7C59` (Muted Olive)
- Accent: `#C46A3D` (Terracotta)
- Background: `#F7F4F0`
- Surface: `#FFFFFF`
- Text: `#2A2A2A`
- Success: `#4CAF50`
- Error: `#D32F2F`
- Warning: `#F9A825`
