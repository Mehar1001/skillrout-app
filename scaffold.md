---
agent: devin-local
session: quasar-lasagna
created: 2026-08-18T20:02:30Z
---
# Skillrout — Scaffold Plan

This document defines the current folder structure and the files to create once implementation begins. It is written as an up-to-date plan based on the current codebase.

## 1. Folder Structure

```
Skillrout/
├── app/
│   ├── _layout.tsx          # Root Stack: index, owner, (owner), (employee)
│   ├── +not-found.tsx
│   ├── index.tsx            # Landing / intro
│   ├── owner.tsx            # Single sign-in screen; detects role
│   ├── (owner)/
│   │   ├── _layout.tsx      # Owner tab bar
│   │   ├── dashboard.tsx
│   │   ├── stores.tsx
│   │   ├── machines.tsx
│   │   ├── employees.tsx
│   │   ├── history.tsx
│   │   ├── reports.tsx      # Planned — not created
│   │   └── settings.tsx     # Planned — not created
│   └── (employee)/
│       ├── _layout.tsx
│       ├── select-store.tsx
│       ├── visit.tsx
│       ├── results.tsx
│       ├── calculation.tsx
│       ├── settlement.tsx
│       ├── outcome.tsx
│       ├── receipt.tsx
│       └── employee-history.tsx
├── components/
│   ├── Button.tsx
│   ├── Input.tsx
│   ├── Card.tsx
│   ├── ReceiptView.tsx
│   ├── MachineReadingCard.tsx
│   ├── VisitTotals.tsx
│   ├── VisitDatePicker.tsx
│   ├── CurrencyInput.tsx
│   ├── ThemedText.tsx
│   ├── ThemedView.tsx
│   ├── Select.tsx           # Planned — not created
│   ├── Badge.tsx            # Planned — not created
│   ├── MachineRow.tsx       # Planned — use MachineReadingCard.tsx instead
│   ├── VisitSummary.tsx     # Planned — not created
│   └── OwnerShell.tsx       # Planned — not created
├── constants/
│   └── designTokens.ts
├── contexts/
│   └── AuthContext.tsx
├── helpers/
│   ├── calculations.ts
│   ├── receiptTemplate.ts
│   ├── validators.ts        # Optional
│   └── formatters.ts        # Optional
├── services/
│   ├── auth.ts
│   ├── visits.ts
│   ├── machines.ts
│   ├── stores.ts
│   └── employees.ts         # Planned — not created; employees.tsx calls createEmployee directly
├── firebase/
│   └── firebaseConfig.ts
├── functions/
│   └── src/
│       └── index.ts         # createEmployee, runVisit, setVisitSplit, submitVisit
└── types/
    └── index.ts
```

## 2. Placeholder Files to Create Immediately

When bootstrapping the project, create the following minimal, working placeholders:

- `constants/designTokens.ts` — export `colors`, `spacing`, `fontSizes`, `lineHeights`, `radii`, `shadows`.
- `types/index.ts` — `Owner`, `Employee`, `Store`, `Machine`, `MachineReadingDraft`, `VisitMachine`, `Visit`.
- `helpers/calculations.ts` — `round2`, `calculateMachine`, `calculateLiveReadings`, `calculateVisit`.
- `contexts/AuthContext.tsx` — `useAuth` context provider.
- `firebase/firebaseConfig.ts` — existing `firebaseConfig.ts` re-export, cleaned for web.
- `app/_layout.tsx` — `<Stack>` with route names: `index`, `owner`, `(owner)`, `(employee)`.
- `app/(owner)/_layout.tsx` — `<Tabs>` with `dashboard`, `stores`, `machines`, `employees`, `history`.
- `app/owner.tsx` — Single sign-in screen that resolves owner vs employee.

## 3. Data Model Snippets

### `types/index.ts`
```ts
export interface Owner {
  id: string;
  email: string;
  name?: string;
  subscriptionStatus: 'active' | 'inactive';
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface Employee {
  id: string; // Auth UID
  email: string;
  name: string;
  active: boolean;
  role: 'employee';
  ownerId: string;
  businessName?: string;
  assignedStoreIds: string[];
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface Store {
  id: string;
  name: string;
  address: string;
  active: boolean;
  defaultStorePercent: number;
  defaultVendorPercent: number;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface Machine {
  id: string;
  machineNumber: string;
  name: string;
  storeId: string;
  lastSettledIn: number;
  lastSettledOut: number;
  lastSubmittedVisitId: string | null;
  lastSubmittedAt: Timestamp | null;
  active: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface MachineReadingDraft {
  presentIn: number | null;
  presentOut: number | null;
  photoUri?: string;
}

export interface VisitMachine {
  machineId: string;
  machineNumber: string;
  name: string;
  lastSettledIn: number;
  lastSettledOut: number;
  presentIn: number;
  presentOut: number;
  newIn: number;
  newOut: number;
  machineNet: number;
  photoUrl?: string;
  photoPath?: string;
}

export interface Visit {
  id: string;
  storeId: string;
  storeName: string;
  employeeId: string;
  employeeName: string;
  businessDate: string; // YYYY-MM-DD
  timestamp: Timestamp;
  machines: VisitMachine[];
  totalNewIn: number;
  totalNewOut: number;
  totalNet: number;
  result: 'positive' | 'zero' | 'negative';
  storePercent: number;
  vendorPercent: number;
  storeAmount: number;
  vendorAmount: number;
  cashDueLocation: number;
  visitStatus: 'completed';
  settlementStatus: 'not_submitted' | 'submitted';
  printStatus: 'not_printed' | 'printed';
  printedAt?: Timestamp;
  printedBy?: string;
  settlement?: {
    submittedAt: Timestamp;
    submittedBy: string;
    storePercent: number;
    vendorPercent: number;
    storeAmount: number;
    vendorAmount: number;
  };
  voided?: {
    voidedAt: Timestamp;
    voidedBy: string;
    reason: string;
  };
}
```

### `helpers/calculations.ts` stub
```ts
export const round2 = (value: number): number => Math.round(value * 100) / 100;

export const calculateMachine = (
  lastSettledIn: number,
  lastSettledOut: number,
  presentIn: number,
  presentOut: number
): { newIn: number; newOut: number; machineNet: number } => {
  const newIn = round2(presentIn - lastSettledIn);
  const newOut = round2(presentOut - lastSettledOut);
  const machineNet = round2(newIn - newOut);
  return { newIn, newOut, machineNet };
};

export const calculateLiveReadings = (
  machines: Machine[],
  readings: Record<string, MachineReadingDraft>
) => {
  // running totals while the visit form is being filled
};

export const calculateVisit = (
  machines: VisitMachine[],
  storePercent: number
) => {
  const totalNewIn = round2(machines.reduce((s, m) => s + (m.newIn || 0), 0));
  const totalNewOut = round2(machines.reduce((s, m) => s + (m.newOut || 0), 0));
  const totalNet = round2(totalNewIn - totalNewOut);
  const result = totalNet > 0 ? 'positive' : totalNet < 0 ? 'negative' : 'zero';
  const storeAmount = round2(totalNet * (storePercent / 100));
  const vendorAmount = round2(totalNet - storeAmount);
  const cashDueLocation = round2(totalNewOut + storeAmount);
  return { totalNewIn, totalNewOut, totalNet, result, storeAmount, vendorAmount, cashDueLocation };
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
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';

initializeApp();
const db = getFirestore();
const auth = getAuth();

const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

export const createEmployee = onCall(async (request: CallableRequest) => {
  // Owner-only; creates auth user + top-level employees doc
});

export const runVisit = onCall(async (request: CallableRequest) => {
  // Transaction: validate and record a visit without changing machine.lastSettled
});

export const setVisitSplit = onCall(async (request: CallableRequest) => {
  // Update storePercent / vendorPercent on an unsubmitted visit
});

export const submitVisit = onCall(async (request: CallableRequest) => {
  // Transaction: validate, submit, and advance lastSettled
});
```

## 5. Implementation Order
1. Create directories + placeholder files.
2. Set up design tokens and shared components.
3. Build single sign-in (`app/owner.tsx`) and `AuthContext`.
4. Build owner dashboard, store CRUD, machine CRUD, and employee creation.
5. Build employee store selection, visit entry, and `runVisit` Cloud Function.
6. Build results, calculation, settlement split (`setVisitSplit`), outcome, and `submitVisit`.
7. Build receipt printing/reprint using `expo-print`.
8. Build owner history and employee history (`employee-history.tsx`).
9. Build remaining backlog features: reports, settings, audit log, void/correct flow, employee edit/disable/reassign, machine store reassignment, history pagination, `AsyncStorage` offline cache, 58 mm receipt, rate limiting.

## 6. Current Drift & Notes
- The original palette (`#6B7C59` / `#C46A3D`) differs from `constants/designTokens.ts` (`#8C6E5F` / `#5F8C7B`); do not change the code colors.
- `app/(owner)/reports.tsx` and `app/(owner)/settings.tsx` are not yet present.
- `Select.tsx`, `Badge.tsx`, `MachineRow.tsx` (use `MachineReadingCard.tsx` instead), `VisitSummary.tsx`, and `OwnerShell.tsx` are not yet present.
- `services/employees.ts` is not yet present; `app/(owner)/employees.tsx` calls `createEmployee` directly.
