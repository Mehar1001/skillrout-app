---
agent: devin-local
session: quasar-lasagna
created: 2026-08-18T20:02:14Z
---
# Skillrout — Architecture Document

## 1. Tech Stack
- **Framework**: Expo SDK 53.0.20 + React Native 0.79.5
- **Routing**: Expo Router (file-based)
- **State Management**: React hooks + Firestore as source of truth; `AsyncStorage` offline cache is planned but not implemented
- **Backend**: Firebase (Auth, Firestore, Storage, Cloud Functions)
- **Authentication**: Firebase Auth email/password for owner and employees; a single `app/owner.tsx` screen detects role and routes employees to `/select-store`
- **Printing**: `expo-print` for thermal receipt HTML; `expo-sharing` for download/share
- **Image Capture**: `expo-image-picker`
- **Date/Time**: `dayjs`
- **UI**: React Native components + design-token system in `constants/designTokens.ts`

## 2. High-Level App Structure
```
app/
  _layout.tsx                # Root Stack: registers index, owner, (owner), (employee)
  index.tsx                  # Landing / intro screen
  owner.tsx                  # Single sign-in screen; detects role and redirects
  (owner)/
    _layout.tsx              # Owner tab bar: dashboard, stores, machines, employees, history
    dashboard.tsx            # Owner home
    stores.tsx               # Store CRUD
    machines.tsx             # Machine CRUD (per store)
    employees.tsx            # Employee management (calls createEmployee directly)
    history.tsx              # All visits/settlements
    reports.tsx              # Planned — not yet created
    settings.tsx             # Planned — not yet created
  (employee)/
    _layout.tsx              # Employee tab / stack layout
    select-store.tsx         # Employee store selection
    visit.tsx                # Run a visit / enter readings
    results.tsx              # Review run result, %, submit/print
    calculation.tsx          # Calculation detail screen
    settlement.tsx           # Settlement / split adjustment
    outcome.tsx              # Outcome summary
    receipt.tsx              # Print / save receipt
    employee-history.tsx     # Employee-visible history (not history.tsx)
  components/                # Reusable UI primitives
  constants/
    designTokens.ts          # Colors, spacing, typography, radii, shadows
  contexts/
    AuthContext.tsx          # Current user + role
  helpers/
    calculations.ts          # round2, calculateMachine, calculateLiveReadings, calculateVisit
    receiptTemplate.ts       # Thermal receipt HTML generation
  services/
    auth.ts                  # Auth helpers
    stores.ts                # Store service
    machines.ts              # Machine service
    visits.ts                # Visit service
    visitPhotos.ts           # Photo upload service
    employees.ts             # Planned — not created; employees.tsx calls createEmployee directly
  firebase/
    firebaseConfig.ts        # Firebase app setup
  functions/src/
    index.ts                 # createEmployee, runVisit, setVisitSplit, submitVisit
```

## 3. Firestore Data Model

### Top-level `owners/{ownerId}`
```ts
{
  id: string,
  email: string,
  name?: string,
  subscriptionStatus: 'active' | 'inactive',
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### Top-level `employees/{employeeId}`
```ts
{
  id: string,             // Firebase Auth UID
  email: string,
  name: string,
  active: boolean,
  role: 'employee',
  ownerId: string,
  businessName?: string,
  assignedStoreIds: string[],
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### `owners/{ownerId}/stores/{storeId}`
```ts
{
  id: string,
  name: string,
  address: string,
  active: boolean,
  defaultStorePercent: number,
  defaultVendorPercent: number,
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### `owners/{ownerId}/stores/{storeId}/machines/{machineId}`
```ts
{
  id: string,
  machineNumber: string,
  name: string,
  storeId: string,
  lastSettledIn: number,
  lastSettledOut: number,
  lastSubmittedVisitId: string | null,
  lastSubmittedAt: Timestamp | null,
  active: boolean,
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### `owners/{ownerId}/visits/{visitId}`
```ts
{
  id: string,
  storeId: string,
  storeName: string,
  employeeId: string,
  employeeName: string,
  businessDate: string,            // YYYY-MM-DD
  timestamp: Timestamp,            // exact time
  machines: [
    {
      machineId: string,
      machineNumber: string,
      name: string,
      lastSettledIn: number,
      lastSettledOut: number,
      presentIn: number,
      presentOut: number,
      newIn: number,
      newOut: number,
      machineNet: number,
      photoUrl?: string,
      photoPath?: string
    }
  ],
  totalNewIn: number,
  totalNewOut: number,
  totalNet: number,
  result: 'positive' | 'zero' | 'negative',
  storePercent: number,
  vendorPercent: number,
  storeAmount: number,
  vendorAmount: number,
  cashDueLocation: number,
  visitStatus: 'completed',
  settlementStatus: 'not_submitted' | 'submitted',
  printStatus: 'not_printed' | 'printed',
  printedAt?: Timestamp,
  printedBy?: string,
  settlement?: {
    submittedAt: Timestamp,
    submittedBy: string,
    storePercent: number,
    vendorPercent: number,
    storeAmount: number,
    vendorAmount: number
  },
  voided?: {
    voidedAt: Timestamp,
    voidedBy: string,
    reason: string
  }
}
```

### `owners/{ownerId}/auditLog/{logId}`
Planned but not yet implemented:
```ts
{
  type: 'run'|'print'|'submit'|'void'|'correct',
  actor: string,
  actorRole: string,
  targetVisitId: string,
  timestamp: Timestamp,
  details: object
}
```

## 4. Security Rules (Summary)
- Owner can read/write everything under `owners/{ownerId}`.
- Employee can only read `stores` and `machines` assigned to active stores.
- Employee can create `visits` where `employeeId == auth.uid`.
- Employee can read `visits` they created and `visits` for stores they are allowed to access.
- Employee cannot update or delete `visits` after submission; only owner can.
- Employee cannot modify `machines` master records.
- `visits` settlement updates are performed by Cloud Functions to enforce server-side validation and concurrency.

## 5. Cloud Functions
All Cloud Functions live in `functions/src/index.ts`.

1. **`createEmployee`**: Owner calls with `{email, name, password, assignedStoreIds}`. Creates a Firebase Auth user and writes a top-level `employees/{uid}` document.
2. **`runVisit`**: Employee/owner calls with `{visitId, storeId, businessDate, readings}`. Records a permanent visit in `owners/{ownerId}/visits/{visitId}` and never updates `machine.lastSettled`.
3. **`setVisitSplit`**: Updates `storePercent`, `vendorPercent`, `storeAmount`, `vendorAmount`, and `cashDueLocation` on an unsubmitted visit. Enforces `storePercent + vendorPercent === 100`.
4. **`submitVisit`**: Client passes `{ownerId, visitId, storePercent, vendorPercent}`. Runs a Firestore transaction that:
   - Verifies `totalNet > 0`.
   - Verifies `storePercent + vendorPercent === 100` and that the split matches the saved visit.
   - Verifies each machine's current `lastSettledIn/Out` still matches the visit's `lastSettledIn/Out` (concurrency guard).
   - Marks `visit.settlementStatus = 'submitted'`.
   - Updates each `machine.lastSettledIn/Out = visit.presentIn/Out`.
   - Updates `machine.lastSubmittedVisitId = visitId`.
   - Returns success.

> Note: `submitSettlement` and `voidSettlement` were earlier working names. The implemented function is `submitVisit`; `voidSettlement` is not yet implemented.

## 6. Calculation Logic
Client-side helpers in `helpers/calculations.ts`:
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
) => { /* running totals for the visit form */ };

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

## 7. Concurrency Strategy
- The `submitVisit` function runs as a Firestore transaction.
- It checks `machine.lastSettledIn/Out === visit.machines[i].lastSettledIn/Out` before updating.
- If another submission changed the baseline in the meantime, the transaction aborts and the employee sees: "Machine X changed. Please run again."

## 8. Image & Receipt
- Machine photos: stored in `owners/{ownerId}/stores/{storeId}/visits/{visitId}/machines/{machineId}/`.
- Thermal receipt: `expo-print` HTML with inline CSS for 80 mm width, plain text fallback, printable directly or saved as PDF.
- Receipt data comes from the `visit` doc, including the `lastSettled` snapshot, so historical receipts stay accurate.

## 9. Routing
File-based routes mirror the screens in §2. Protected routes check `AuthContext` role. `app/_layout.tsx` registers the root routes as `index`, `owner`, `(owner)`, and `(employee)`.

## 10. Non-Functional Requirements
- Offline support: not required for v1, but `AsyncStorage` can cache an in-progress visit form.
- Must remain runnable on web for development/testing.
- iOS and Android are the primary targets.
- WCAG AA contrast, 44×44 px touch targets.

## 11. Current Drift & Gaps
- `app/(owner)/reports.tsx` and `app/(owner)/settings.tsx` are planned but not created.
- Planned components `Select.tsx`, `Badge.tsx`, `MachineRow.tsx`, `VisitSummary.tsx`, and `OwnerShell.tsx` do not exist; use `MachineReadingCard.tsx` instead of `MachineRow`.
- `services/employees.ts` does not exist; employee creation calls `createEmployee` directly from `app/(owner)/employees.tsx`.
- Color palette in `constants/designTokens.ts` (`#8C6E5F` / `#5F8C7B`) differs from the original PRD palette (`#6B7C59` / `#C46A3D`); do not change code colors.
- Not yet implemented: audit log, void/correct flow, employee edit/disable/reassign, machine store reassignment, history pagination, `AsyncStorage` offline cache, 58 mm thermal receipt, Cloud Functions rate limiting.
