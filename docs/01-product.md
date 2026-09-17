# Product

## Problem

Machine operators need one system for store assignments, cumulative meter readings, collection calculations, evidence, receipts, reconciliation, and audit history. Manual spreadsheets and disconnected photos make baselines and cash accountability unreliable.

## Users

- **Owner:** manages one business tenant and its operational data.
- **Employee:** services assigned stores for one owner.

The repository does not define a separate platform-administrator role, although owner approval endpoints exist.

## Current goals and capabilities

- Preserve a permanent visit snapshot for every RUN.
- Keep physical visit capture separate from settlement finalization.
- Advance machine baselines only through valid SUBMIT operations.
- Group employee work into collection shifts spanning stores.
- Reconcile expected and actual cash by store before shift closure.
- Provide owner and employee history, audit activity, printable reports, and Excel shift exports.
- Support receipt OCR, visit photos, and locally queued offline drafts.

## Primary workflows

1. Owner requests access, is approved, verifies email, and signs in.
2. Owner configures stores, machines, employees, and assignments.
3. Employee starts a collection shift and selects an assigned store.
4. Employee records readings/photos and runs a visit.
5. Positive visits may be submitted; zero/negative visits may only be printed.
6. Employee finishes the route.
7. Owner reconciles each store and closes the shift.
8. Owner reviews activity/reports and exports results.

## Scope currently implemented

Owner/employee auth, password lifecycle, store/machine/employee management, visits, settlement, printing/sharing, OCR, offline drafts, shifts, reconciliation, reporting, Excel output, and owner visit adjustment.

## Repository-visible gaps

- No visit-void callable exists, although a `voided` type remains.
- No dedicated platform-admin authorization boundary exists for owner approval.
- Offline draft replay does not pass a collection `shiftId`.
- No CI workflow, automated UI/E2E suite, or production client error-monitoring integration exists.

Future functionality beyond these evidenced gaps is not defined here.
