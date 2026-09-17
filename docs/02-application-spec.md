# Application Specification

## Account access

**Actors:** owner applicant, active owner, employee. **Trigger:** registration/sign-in. Owner registration creates a pending request after validating business name/password and Auth identity. Approval creates the owner profile; verified, active owners may enter owner routes. Employees are created by an owner, may be forced to change a temporary password, and must remain active. Failures retain the user on an auth screen with a role-specific error.

## Stores, machines, and assignments

Owners create/update/activate stores and machines and manage employee assignments. Store percentages must be non-negative and total 100. Machine readings/baselines must be non-negative; displayed machine identifiers follow positive-integer numbering conventions. Employees see active assigned stores. Employee onboarding of stores/machines occurs through callable Functions rather than direct writes.

## Collection Shift

An employee starts a shift when no unresolved shift exists. The backend creates `owners/{ownerId}/shifts/{shiftId}` in `in_progress`. Activity displays status, clock-in, totals, and linked visits. Finishing changes an operational shift to `pending_reconciliation`; another shift cannot start until close. Pending/partially reconciled shifts block new visits.

## Visit and RUN

**Preconditions:** authenticated active employee, assigned active store, active shift, valid recent business date, active machines, and readings at or above captured baselines. Optional images are uploaded before the callable request. RUN uses a client-generated ID, snapshots machines/store/employee/calculations, writes the visit, links it to the shift, and updates shift rollups without changing machine settlement baselines. Duplicate IDs and stale/invalid data produce callable errors. Local drafts may queue work, but current replay omits `shiftId` (known gap).

## Settlement, SUBMIT, and PRINT

A positive visit may be submitted if net is positive and split totals 100. SUBMIT transactionally verifies captured baselines, updates machine baselines, stores immutable settlement values, marks submitted, updates shift totals, and records activity. Conflicts abort. Zero/negative visits cannot submit. PRINT/share uses snapshot data and only updates print metadata.

## Reconciliation and close

Owners review shift visits by store, enter actual cash, and provide a reason for non-zero differences. `reconcileStore` derives expected values from submitted shift visits and writes a store reconciliation. The shift becomes partially reconciled until all stores are resolved. Close is rejected while any store is missing/pending; success freezes `closedSummary`, marks `closed`, records activity, and clears the employee to start again.

## Reporting and correction

Owner history/reports read visits; shift reports combine shifts, reconciliations, and visits for date ranges and generate Summary, Store Detail, and Machine Detail XLSX sheets. Owners can adjust submitted visits with a reason/tag and optional guarded baseline rewrite; original totals and adjustment history are retained.

## OCR and offline behavior

Receipt images may be parsed through Cloud Vision and local matching/review helpers. OCR results are cached. AsyncStorage drafts retry when online, retain upload progress, and enter conflict status if machines or baselines changed.
