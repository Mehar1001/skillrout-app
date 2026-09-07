# Skillrout — Data Schema

## 1. Firestore Collections

### `pendingOwners/{uid}`

| Field | Type | Notes |
|---|---|---|
| `email` | string | Requesting email |
| `businessName` | string | Proposed business name |
| `status` | string | `'pending'` until approved |
| `schemaVersion` | number | `1` |
| `createdAt` | timestamp | |
| `updatedAt` | timestamp | |

### `owners/{ownerId}`

| Field | Type | Notes |
|---|---|---|
| `id` | string | Firebase Auth UID |
| `email` | string | |
| `name` | string? | Display name |
| `businessName` | string | |
| `subscriptionStatus` | string | `'active'` \| `'inactive'` |
| `status` | string | `'active'` \| `'inactive'` |
| `schemaVersion` | number | `1` |
| `createdAt` | timestamp | |
| `updatedAt` | timestamp | |

### `employees/{employeeId}`

`employeeId` is the Firebase Auth UID.

| Field | Type | Notes |
|---|---|---|
| `id` | string | Auth UID |
| `email` | string | |
| `name` | string | |
| `active` | boolean | |
| `role` | string | `'employee'` |
| `ownerId` | string | Reference to `owners/{ownerId}` |
| `businessName` | string? | |
| `assignedStoreIds` | string[] | Store IDs |
| `mustChangePassword` | boolean? | True for new temp-password employees |
| `deactivatedAt` | timestamp? | |
| `reactivatedAt` | timestamp? | |
| `schemaVersion` | number | `1` |
| `createdAt` | timestamp | |
| `updatedAt` | timestamp | |

### `owners/{ownerId}/stores/{storeId}`

| Field | Type | Notes |
|---|---|---|
| `id` | string | |
| `name` | string | |
| `address` | string | |
| `phone` | string? | |
| `active` | boolean | |
| `defaultStorePercent` | number | 0–100 |
| `defaultVendorPercent` | number | 0–100 |
| `deactivatedAt` | timestamp? | |
| `reactivatedAt` | timestamp? | |
| `schemaVersion` | number | `1` |
| `createdAt` | timestamp | |
| `updatedAt` | timestamp | |

### `owners/{ownerId}/stores/{storeId}/machines/{machineId}`

| Field | Type | Notes |
|---|---|---|
| `id` | string | |
| `machineNumber` | string | User-editable positive integer (e.g., `1`, `2`, `3`). Must be unique within the store. |
| `legacyMachineNumbers` | string[]? | Previous numbers for OCR/history |
| `name` | string | |
| `storeId` | string | Denormalized |
| `active` | boolean | |
| `lastSettledIn` | number | |
| `lastSettledOut` | number | |
| `lastSubmittedVisitId` | string\|null | |
| `lastSubmittedAt` | timestamp\|null | |
| `baselineVersion` | number? | |
| `machineNumberRenumberedAt` | timestamp? | |
| `deactivatedAt` | timestamp? | |
| `reactivatedAt` | timestamp? | |
| `schemaVersion` | number | `1` |
| `createdAt` | timestamp | |
| `updatedAt` | timestamp | |

### `owners/{ownerId}/stores/{storeId}/visits/{visitId}`

| Field | Type | Notes |
|---|---|---|
| `id` | string | |
| `ownerId` | string | Denormalized for collection-group queries |
| `storeId` | string | |
| `storeName` | string | |
| `storeAddress` | string? | |
| `employeeId` | string | |
| `employeeName` | string | |
| `businessDate` | string | `YYYY-MM-DD` |
| `timestamp` | timestamp | |
| `machines` | VisitMachine[] | Snapshot at RUN |
| `totalNewIn` | number | |
| `totalNewOut` | number | |
| `totalNet` | number | |
| `result` | string | `'positive'` \| `'zero'` \| `'negative'` |
| `storePercent` | number | |
| `vendorPercent` | number | |
| `storeAmount` | number | |
| `vendorAmount` | number | |
| `cashDueLocation` | number | |
| `visitStatus` | string | `'completed'` |
| `settlementStatus` | string | `'not_submitted'` \| `'submitted'` |
| `printStatus` | string | `'not_printed'` \| `'printed'` |
| `receiptPhotoUrl` | string? | |
| `receiptPhotoPath` | string? | |
| `printedAt` | timestamp? | |
| `printedBy` | string? | |
| `settlement` | object? | submittedAt, submittedBy, storePercent, vendorPercent, storeAmount, vendorAmount |
| `voided` | object? | voidedAt, voidedBy, reason |
| `adjustments` | Adjustment[]? | Owner corrections |
| `schemaVersion` | number | `1` |
| `createdAt` | timestamp | |
| `updatedAt` | timestamp | |

### `VisitMachine`

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

### `Adjustment`

```ts
{
  adjustedAt: Timestamp,
  adjustedBy: string,
  reason: string,
  originalMachine: object,
  updatedMachine: object
}
```

### Auxiliary collections

- `ocrCache/{uid}_{imageHash}` — 365-day cache of OCR results.
- `ocrUsage/{uid}_{today}` — daily scan counters.

## 2. Storage Paths

- Machine photo: `owners/{ownerId}/stores/{storeId}/visits/{visitId}/machines/{machineId}/{file}`
- Receipt photo: `owners/{ownerId}/stores/{storeId}/visits/{visitId}/receipt/{file}`

## 3. Important Schema Rules

- Machine numbers are user-editable positive integers (e.g., `1`, `2`, `3`). They must be unique within a store.
- `legacyMachineNumbers` is an unordered list of previous string numbers for OCR/history matching.
- Historical visits keep the `machineNumber` that existed at `runVisit`.
- `visit.machines` is the source of truth for receipts and reports.
- Machine deletion does not affect historical visit data (visits have snapshots).
