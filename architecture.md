---
agent: devin-local
session: quasar-lasagna
created: 2026-08-18T20:02:14Z
---
# Skillrout — Architecture Document

## 1. Tech Stack
- **Framework**: Expo SDK 53.0.20 + React Native 0.79.5
- **Routing**: Expo Router (file-based)
- **State Management**: React hooks + AsyncStorage for minimal local cache; Firestore as source of truth
- **Backend**: Firebase (Auth, Firestore, Storage, Cloud Functions)
- **Authentication**: Firebase Auth email/password for owner and employees
- **Printing**: `expo-print` for thermal receipt HTML; `expo-sharing` for download/share
- **Image Capture**: `expo-image-picker`
- **Date/Time**: `dayjs`
- **UI**: React Native components + design-token system (see `PRD.md`)

## 2. High-Level App Structure
```
app/
  (auth)/
    owner-login.tsx          # Owner sign in / sign up
    employee-login.tsx       # Employee sign in
  (owner)/
    dashboard.tsx            # Owner home
    stores.tsx               # Store CRUD
    machines.tsx             # Machine CRUD (per store)
    employees.tsx            # Employee management
    history.tsx              # All visits/settlements
    reports.tsx              # P&L / settlement reports
    settings.tsx             # Owner settings
  (employee)/
    select-store.tsx         # Employee store selection
    visit.tsx                # Run a visit / enter readings
    results.tsx              # Review run result, %, submit/print
    history.tsx              # Employee-visible history
    receipt.tsx              # Print / save receipt
  components/                # Reusable UI primitives
  constants/
    designTokens.ts          # Colors, spacing, typography, radii, shadows
  contexts/
    AuthContext.tsx          # Current user + role
  helpers/
    calculations.ts          # New IN, New OUT, Net, share calculations
    receiptTemplate.ts       # Thermal receipt HTML generation
  firebase/
    config.ts                # Firebase app setup
    rules.md                 # Security rules description
```

## 3. Firestore Data Model

### Top-level `owners/{ownerId}`
```ts
{
  email: string,
  name?: string,
  createdAt: Timestamp,
  updatedAt: Timestamp,
  subscriptionStatus: 'active' | 'inactive'
}
```

### `owners/{ownerId}/employees/{employeeId}`
```ts
{
  employeeId: string,      // Firebase Auth UID
  email: string,
  name: string,
  active: boolean,
  role: 'employee',
  createdBy: string,       // ownerId
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### `owners/{ownerId}/stores/{storeId}`
```ts
{
  storeId: string,
  name: string,
  address: string,
  active: boolean,
  defaultStorePercent: number,  // e.g. 40
  defaultVendorPercent: number, // e.g. 60
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### `owners/{ownerId}/stores/{storeId}/machines/{machineId}`
```ts
{
  machineId: string,
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

### `owners/{ownerId}/visits/{visitId}` (denormalized for querying)
```ts
{
  visitId: string,
  storeId: string,
  storeName: string,
  employeeId: string,
  employeeName: string,
  businessDate: string,            // YYYY-MM-DD
  timestamp: Timestamp,            // exact time
  runNumber?: number,              // optional store-specific run counter
  machines: [
    {
      machineId: string,
      machineNumber: string,
      lastSettledIn: number,
      lastSettledOut: number,
      presentIn: number,
      presentOut: number,
      newIn: number,
      newOut: number,
      machineNet: number,
      photoUrl?: string
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

### `owners/{ownerId}/machineHistory/{machineId}/{visitId}` (optional)
Subcollection for fast per-machine history; or query `visits` where `machines` array contains `machineId`. For simplicity in v1, use an index on `visits.machines.machineId`.

### `owners/{ownerId}/auditLog/{logId}`
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
- `visits` settlement updates must be done server-side or with transaction to enforce concurrency.

## 5. Cloud Functions
1. **`createEmployee`**: Owner calls with `{email, name}`. Cloud Function creates Firebase Auth user with temporary password and writes `employees` doc.
2. **`submitSettlement`**: Client passes `visitId`, `storePercent`, `vendorPercent`. Cloud Function:
   - Reads visit and machine docs in a Firestore transaction.
   - Verifies `totalNet > 0`.
   - Verifies `storePercent + vendorPercent === 100`.
   - Verifies each machine's current `lastSettledIn/Out` still matches the visit's `lastSettledIn/Out` (concurrency guard).
   - Marks `visit.settlementStatus = 'submitted'`.
   - Updates each `machine.lastSettledIn/Out = visit.presentIn/Out`.
   - Updates `machine.lastSubmittedVisitId = visitId`.
   - Returns success with updated visit.
3. **`voidSettlement`**: Owner only. Creates correction record, reverses machine baseline if needed, logs audit.
4. **`generateReceipt`**: (Optional) returns HTML receipt or uses client-side `receiptTemplate.ts` with `expo-print`.

## 6. Calculation Logic
All client-side helpers in `helpers/calculations.ts`:
```ts
const newIn = presentIn - lastSettledIn;
const newOut = presentOut - lastSettledOut;
const machineNet = newIn - newOut;

const totalNewIn = machines.reduce((s, m) => s + m.newIn, 0);
const totalNewOut = machines.reduce((s, m) => s + m.newOut, 0);
const totalNet = totalNewIn - totalNewOut;

const storeAmount = roundTo2(totalNet * (storePercent / 100));
const vendorAmount = roundTo2(totalNet - storeAmount);
const cashDueLocation = roundTo2(totalNewOut + storeAmount);
```
Rounding: banker's rounding or simple `Math.round(value * 100) / 100`; use the same function for every monetary value.

## 7. Concurrency Strategy
- The `submitSettlement` function runs as a Firestore transaction.
- It checks `machine.lastSettledIn === visit.machines[i].lastSettledIn` before updating.
- If another submission changed the baseline in the meantime, the transaction aborts and the employee sees: "Another settlement has already used this baseline. Please refresh and RUN again."

## 8. Image & Receipt
- Machine photos: stored in `owners/{ownerId}/visits/{visitId}/machines/{machineId}_{ts}.jpg`.
- Thermal receipt: `expo-print` HTML with inline CSS for 80 mm width, no absolute px width, plain text fallback, printable directly or saved as PDF.
- Receipt data comes from the `visit` doc, including the `lastSettled` snapshot stored in the visit, so historical receipts stay accurate even if master machine data changes.

## 9. Routing
File-based routes mirror the screens in §2. Protected routes check `AuthContext` role; unauthenticated users are redirected to `owner-login` or `employee-login`.

## 10. Non-Functional Requirements
- Offline support: not required for v1, but `AsyncStorage` can cache an in-progress visit form.
- Must remain runnable on web for development/testing.
- iOS and Android are the primary targets.
- WCAG AA contrast, 44×44 px touch targets.
