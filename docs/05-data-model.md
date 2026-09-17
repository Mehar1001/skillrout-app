# Data Model

Firestore has no migration files; `types/index.ts`, Functions writes, services, rules, and indexes collectively define the schema. Timestamps are Firestore timestamps unless noted.

## Top-level documents

- `pendingOwners/{uid}`: `email`, `businessName`, `status`, `schemaVersion`, `createdAt`, `updatedAt`.
- `owners/{ownerId}`: business/email identity, `subscriptionStatus`, `status`, schema/timestamps. Document ID is the Auth UID.
- `employees/{employeeId}`: Auth UID, email/name, `ownerId`, business name, role, active state, `assignedStoreIds`, password-change flag, lifecycle timestamps.
- `ocrCache/{uid}_{imageHash}`: cached OCR response and cache metadata written by the OCR Function.
- `ocrUsage/{uid}_{date}`: OCR usage records referenced by backend behavior.

## Owner tenant

- `owners/{ownerId}/activities/{activityId}`: actor/action plus optional store, machine, visit, before/after, reason/note, and `createdAt`.
- `owners/{ownerId}/stores/{storeId}`: name/address/phone, active state, default store/vendor percentages, schema/lifecycle timestamps.
- `.../machines/{machineId}`: `machineNumber`, legacy numbers where present, name/store, active state, settlement baselines, last submitted visit/time, baseline/schema/lifecycle metadata.
- `.../visits/{visitId}`: owner/store/employee snapshot, business date/time, optional `shiftId`, machine snapshots, totals/result/split, settlement and print states, receipt image, immutable settlement snapshot, adjustment/original data.

Each visit machine snapshots ID/number/name, previous baselines, present readings, calculated new IN/OUT/net, image references, and optional OCR source/scan ID.

## Collection Shift

`owners/{ownerId}/shifts/{shiftId}` contains employee identity, lifecycle status/timestamps, configured and visited store IDs, machine count, gross/payout/net/store-share totals, expected/actual/difference, discrepancy reasons, optional close metadata and immutable `closedSummary`.

Statuses: `in_progress`, `returning`, `pending_reconciliation`, `partially_reconciled`, `closed`.

`owners/{ownerId}/shifts/{shiftId}/reconciliations/{storeId}` contains store/employee identity, status, receipt verification/evidence, note/reason, expected/actual/difference, machine count, audit timestamps, and machine/visit line items. Line-item statuses are pending, reconciled, or discrepancy.

## Relationships and sources of truth

- Owner ID is the tenant boundary.
- Employee `ownerId` links identity to one tenant; assigned IDs constrain store access.
- Machines belong to one store; visits snapshot machines and retain history independently.
- `visit.shiftId` links a visit to one shift.
- Submitted visit settlement snapshots drive expected shift/store cash.
- Machine baselines are advanced only by valid SUBMIT or explicitly guarded owner adjustment.
- Closed shift reporting uses `closedSummary` plus linked detail.

## Indexes and constraints

Composite indexes support owner visit history, shift-linked visit queries, submitted shift visits, employee/status shift ordering, and activity filters. Rules enforce field shape for direct store/machine writes and deny direct financial shift/visit mutation. Uniqueness of machine numbering and transactional invariants are Function/application responsibilities rather than Firestore constraints.
