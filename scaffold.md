---
agent: devin-local
session: quasar-lasagna
created: 2026-08-18T20:02:30Z
---
# Skill Tracker — Scaffold Plan

This document defines the folder structure and the files to create once implementation begins.

## 1. Folder Structure

```
Skillrout/
├── app/
│   ├── (auth)/
│   │   ├── owner-login.tsx
│   │   └── employee-login.tsx
│   ├── (owner)/
│   │   ├── _layout.tsx
│   │   ├── dashboard.tsx
│   │   ├── stores.tsx
│   │   ├── machines.tsx
│   │   ├── employees.tsx
│   │   ├── history.tsx
│   │   ├── reports.tsx
│   │   └── settings.tsx
│   ├── (employee)/
│   │   ├── _layout.tsx
│   │   ├── select-store.tsx
│   │   ├── visit.tsx
│   │   ├── results.tsx
│   │   ├── history.tsx
│   │   └── receipt.tsx
│   ├── _layout.tsx
│   └── +not-found.tsx
├── components/
│   ├── Button.tsx
│   ├── Input.tsx
│   ├── Select.tsx
│   ├── Card.tsx
│   ├── Badge.tsx
│   ├── MachineRow.tsx
│   ├── VisitSummary.tsx
│   ├── ReceiptView.tsx
│   └── OwnerShell.tsx
├── constants/
│   └── designTokens.ts
├── contexts/
│   └── AuthContext.tsx
├── helpers/
│   ├── calculations.ts
│   ├── receiptTemplate.ts
│   ├── validators.ts
│   └── formatters.ts
├── services/
│   ├── auth.ts
│   ├── visits.ts
│   ├── machines.ts
│   ├── stores.ts
│   └── employees.ts
├── firebase/
│   └── config.ts
├── functions/
│   └── src/
│       └── index.ts
└── types/
    └── index.ts
```

## 2. Placeholder Files to Create Immediately

Create the above directories and the following minimal, working placeholders:

- `constants/designTokens.ts` — export `colors`, `spacing`, `fontSizes`, `radii`, `shadows`.
- `types/index.ts` — `Store`, `Machine`, `Employee`, `Visit`, `MachineEntry`, `VisitMachine`.
- `helpers/calculations.ts` — `calculateMachine`, `calculateVisit` stubs.
- `contexts/AuthContext.tsx` — `useAuth` context provider stub.
- `firebase/config.ts` — existing `firebaseConfig.ts` re-export, cleaned for web.
- `app/_layout.tsx` — `<Stack>` with all route names.

## 3. Data Model Snippets

### `types/index.ts`
```ts
export interface Store {
  id: string;
  name: string;
  address: string;
  active: boolean;
  defaultStorePercent: number;
  defaultVendorPercent: number;
}

export interface Machine {
  id: string;
  machineNumber: string;
  name: string;
  storeId: string;
  lastSettledIn: number;
  lastSettledOut: number;
  active: boolean;
}

export interface VisitMachine {
  machineId: string;
  machineNumber: string;
  lastSettledIn: number;
  lastSettledOut: number;
  presentIn: number;
  presentOut: number;
  newIn: number;
  newOut: number;
  machineNet: number;
  photoUrl?: string;
}

export interface Visit {
  id: string;
  storeId: string;
  employeeId: string;
  businessDate: string;
  timestamp: any; // Timestamp
  machines: VisitMachine[];
  totalNewIn: number;
  totalNewOut: number;
  totalNet: number;
  storePercent: number;
  vendorPercent: number;
  storeAmount: number;
  vendorAmount: number;
  settlementStatus: 'not_submitted' | 'submitted';
  printStatus: 'not_printed' | 'printed';
}
```

### `helpers/calculations.ts` stub
```ts
export const calculateVisit = (machines: VisitMachine[], storePercent: number) => {
  const totalNewIn = machines.reduce((s, m) => s + m.newIn, 0);
  const totalNewOut = machines.reduce((s, m) => s + m.newOut, 0);
  const totalNet = totalNewIn - totalNewOut;
  const storeAmount = Math.round(totalNet * (storePercent / 100) * 100) / 100;
  const vendorAmount = totalNet - storeAmount;
  return { totalNewIn, totalNewOut, totalNet, storeAmount, vendorAmount };
};
```

### `contexts/AuthContext.tsx` stub
```tsx
import React, { createContext, useContext, useState } from 'react';
interface AuthCtx { user: any; role: 'owner' | 'employee' | null; }
const AuthContext = createContext<AuthCtx>({ user: null, role: null });
export const useAuth = () => useContext(AuthContext);
```

## 4. Firebase Cloud Function Placeholder

### `functions/src/index.ts`
```ts
import * as functions from 'firebase-functions';
import { getFirestore } from 'firebase-admin/firestore';
import * as admin from 'firebase-admin';
admin.initializeApp();
const db = getFirestore();

export const createEmployee = functions.https.onCall(async (data, context) => {
  // Owner-only; creates auth user + employees doc
});

export const submitSettlement = functions.https.onCall(async (data, context) => {
  // Transaction: validate, submit, advance lastSettled
});
```

## 5. Implementation Order
1. Create directories + placeholder files.
2. Set up design tokens and shared components.
3. Build owner auth + store CRUD.
4. Build machine CRUD + initial baseline.
5. Build employee auth + store selection.
6. Build visit flow (RUN) and result review.
7. Build `submitSettlement` Cloud Function.
8. Build receipt printing/reprint.
9. Build history, reports, and owner dashboard.
