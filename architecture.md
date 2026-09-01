---
agent: devin-local
session: quasar-lasagna
created: 2026-08-18T20:02:14Z
---

# Skillrout — Architecture Document

## 1. Tech Stack

- **Framework**: Expo SDK 53.0.20 + React Native 0.79.5
- **Routing**: Expo Router (file-based)
- **State Management**: React hooks + Firestore as source of truth
- **Backend**: Firebase (Auth, Firestore, Storage, Cloud Functions v2, Cloud Vision)
- **Authentication**: Firebase Auth email/password with role-gated routes
- **Printing**: `expo-print` for thermal receipt HTML; `expo-sharing` for download/share
- **Image Capture**: `expo-image-picker`
- **Date/Time**: `dayjs`
- **UI**: React Native components + design-token system in `constants/designTokens.ts`
- **Cloud Functions region**: `us-central1`
- **Firestore location**: `nam5` (multi-region)

## 2. High-Level App Structure

```
app/
  _layout.tsx                # Root Stack: registers all root routes
  index.tsx                  # Public landing page
  +not-found.tsx
  owner/login.tsx            # Owner sign-in
  owner/register.tsx         # Request owner access
  employee/login.tsx         # Employee sign-in
  auth/
    action.tsx               # Handle password/verify action codes
  (owner)/
    _layout.tsx              # Owner tabs
    dashboard.tsx            # Owner home
    stores.tsx               # Store CRUD
    machines.tsx             # Machine CRUD + renumber
    employees.tsx            # Employee management
    history.tsx              # All visits/settlements
    reports.tsx              # Date-range reports
    settings.tsx             # Owner password/settings
  (employee)/
    _layout.tsx              # Employee tabs
    select-store.tsx         # Employee store selection
    visit.tsx                # Run a visit / enter readings
    results.tsx              # Review run result
    calculation.tsx          # Calculation detail screen
    settlement.tsx           # Read-only split display
    outcome.tsx              # Positive / zero / negative outcome
    receipt.tsx              # Print / save receipt
    employee-history.tsx     # Employee-visible history
    add-machine.tsx          # Employee-initiated machine
    onboard-store.tsx        # Employee-initiated store
    store-detail.tsx         # Store detail
    drafts.tsx               # Offline draft queue
    change-password.tsx      # Forced first-time password change
  components/                # Reusable UI primitives
  constants/
    designTokens.ts          # Colors, spacing, typography, radii, shadows
  contexts/
    AuthContext.tsx          # Current user + role + routing guards
  helpers/                   # Business logic
  services/                  # Firebase interaction
  firebase/
    firebaseConfig.ts        # Firebase app setup
  functions/
    src/index.ts             # All Cloud Functions
  tests/
    securityRules.test.ts    # Firestore/Storage rules
  types/index.ts             # Shared TypeScript types
```

## 3. Firestore Data Model

### Top-level `owners/{ownerId}`

```ts
{
  id: string,
  email: string,
  name?: string,
  businessName: string,
  subscriptionStatus: 'active' | 'inactive',
  status: 'active' | 'inactive',
  schemaVersion: number,
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### Top-level `pendingOwners/{uid}`

```ts
{
  email: string,
  businessName: string,
  status: 'pending',
  schemaVersion: number,
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
  mustChangePassword?: boolean,
  deactivatedAt?: Timestamp,
  reactivatedAt?: Timestamp,
  schemaVersion: number,
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
  phone?: string,
  active: boolean,
  defaultStorePercent: number,
  defaultVendorPercent: number,
  deactivatedAt?: Timestamp,
  reactivatedAt?: Timestamp,
  schemaVersion: number,
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### `owners/{ownerId}/stores/{storeId}/machines/{machineId}`

```ts
{
  id: string,
  machineNumber: string,          // plain '1', '2', '3', etc.
  legacyMachineNumbers?: string[], // previous numbers kept for OCR/history
  name: string,
  storeId: string,
  lastSettledIn: number,
  lastSettledOut: number,
  lastSubmittedVisitId: string | null,
  lastSubmittedAt: Timestamp | null,
  active: boolean,
  baselineVersion?: number,
  machineNumberRenumberedAt?: Timestamp,
  deactivatedAt?: Timestamp,
  reactivatedAt?: Timestamp,
  schemaVersion: number,
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### `owners/{ownerId}/stores/{storeId}/visits/{visitId}`

```ts
{
  id: string,
  ownerId: string,
  storeId: string,
  storeName: string,
  storeAddress?: string,
  employeeId: string,
  employeeName: string,
  businessDate: string,           // YYYY-MM-DD
  timestamp: Timestamp,
  machines: VisitMachine[],
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
  settlement?: { submittedAt, submittedBy, storePercent, vendorPercent, storeAmount, vendorAmount },
  voided?: { voidedAt, voidedBy, reason },
  adjustments?: Adjustment[],
  schemaVersion: number,
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

Each `VisitMachine` snapshot includes:

```ts
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
  photoPath?: string,
  readingSource?: 'manual' | 'ocr_reviewed',
  ocrScanId?: string
}
```

### Auxiliary collections

- `ocrCache/{uid}_{imageHash}` — 365-day cache of OCR results.
- `ocrUsage/{uid}_{today}` — daily scan counters.

## 4. Security Rules (Summary)

- Owner can read/write everything under `owners/{ownerId}`.
- Employee can only read `stores` and `machines` assigned to active stores.
- Employee can create `visits` where `employeeId == auth.uid`.
- Employee can read `visits` they created and visits for stores they are allowed to access.
- Employee cannot update or delete `visits` after submission; only owner can.
- Employee cannot modify `machines` master records.
- `visits` settlement updates are performed by Cloud Functions for server-side validation.

## 5. Cloud Functions

All Cloud Functions live in `functions/src/index.ts` and are deployed to `us-central1`.

1. **`registerOwnerProfile`** — stores the initial owner request in `pendingOwners`.
2. **`provisionOwner`** — creates the `owners/{uid}` document after approval.
3. **`approveOwner`** — admin-only approval of a pending owner.
4. **`createEmployee`** — creates an Auth user and a top-level `employees/{uid}` document.
5. **`setEmployeeActive`** — activates/deactivates an employee.
6. **`resetEmployeeTemporaryPassword`** — sets a new temporary password and forces a change.
7. **`updateEmployeeAssignments`** — updates an employee's assigned stores.
8. **`employeeOnboardStore`** — allows an employee to create a store.
9. **`employeeAddMachine`** — allows an employee to add a machine with the next number.
10. **`runVisit`** — records a permanent `visit` without updating `machine.lastSettled`.
11. **`setVisitSplit`** — updates split on an unsubmitted visit.
12. **`submitVisit`** — validates and advances `machine.lastSettled` in a transaction.
13. **`adjustVisit`** — owner correction of an existing visit.
14. **`extractReceiptReadings`** — Cloud Vision OCR with `ocrCache`.
15. **`checkOcrUsage`** — daily-usage helper.
16. **`completePasswordReset`** — reconciles emailed password resets with employee `mustChangePassword`.
17. **`completeEmployeePasswordChange`** — clears `mustChangePassword` after first login.
18. **`prepareEmployeeSession`** — marks employee email verified at login.
19. **`renumberStoreMachines`** — owner-only renumber to `1…N` per store, preserving legacy numbers.

## 6. Calculation Logic

Client-side helpers in `helpers/calculations.ts`:

```ts
export const round2 = (value: number): number => Math.round(value * 100) / 100;

export const calculateMachine = (lastSettledIn, lastSettledOut, presentIn, presentOut) => {
  const newIn = round2(presentIn - lastSettledIn);
  const newOut = round2(presentOut - lastSettledOut);
  const machineNet = round2(newIn - newOut);
  return { newIn, newOut, machineNet };
};

export const calculateVisit = (machines, storePercent) => {
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

- `submitVisit` runs as a Firestore transaction.
- It checks `machine.lastSettledIn/Out === visit.machines[i].lastSettledIn/Out` before updating.
- If another submission changed the baseline, the transaction aborts and the employee sees: "Machine X changed. Please run again."
- `runVisit` uses a deterministic `visitId` provided by the client; retries with the same ID are idempotent.

## 8. Image & Receipt

- Machine photos: `owners/{ownerId}/stores/{storeId}/visits/{visitId}/machines/{machineId}/{file}`.
- Receipt photos: `owners/{ownerId}/stores/{storeId}/visits/{visitId}/receipt/{file}`.
- Thermal receipt: `expo-print` HTML for 80 mm width.
- Receipt data comes from the `visit` document, including the `lastSettled` snapshot, so historical receipts stay accurate.
- Receipts show the plain machine number on the left before the name: `1  Machine Name`.

## 9. Routing

Public and auth routes:

- `/` — public landing
- `/owner/login` — owner sign-in
- `/owner/register` — request owner access
- `/employee/login` — employee sign-in
- `/auth/action` — password/verify action code handler
- `/select-store`, `/visit`, `/results`, `/calculation`, `/settlement`, `/outcome`, `/receipt`, `/employee-history`, `/drafts` — employee flow
- `/dashboard`, `/stores`, `/machines`, `/employees`, `/history`, `/reports`, `/settings` — owner flow

## 10. Non-Functional Requirements

- Mobile-first, fully runnable on web.
- WCAG AA contrast, 44×44 px touch targets.
- Plain `1…N` machine numbers in all UI and receipts.
- No `#`, `Serial`, or `Machine Number` display prefix.

## 11. Current Drift & Gaps

- Void/correct flow is not yet implemented.
- Audit log is not yet implemented.
- Employee edit/disable/reassign and machine store reassignment are partial.
- 58 mm thermal receipt support is not yet implemented.
- Cloud Functions rate limiting is not yet implemented.
- History pagination is not yet implemented.
