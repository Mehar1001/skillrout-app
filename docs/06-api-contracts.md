# Callable API Contracts

All APIs are Firebase v2 callable Functions in `us-central1`; there are no REST routes. Requests carry a Firebase Auth context. Errors use `HttpsError` codes such as `unauthenticated`, `permission-denied`, `invalid-argument`, `failed-precondition`, `not-found`, `already-exists`, and `aborted`.

| Callable | Actor | Request / result | Key validation and failures |
|---|---|---|---|
| `registerOwnerProfile` | signed-in applicant | business name → success/pending | Auth email; name length; idempotent pending/existing profile |
| `provisionOwner` | verified owner identity | empty → success | Existing owner profile required; updates active status, does not create profile |
| `approveOwner` | currently any active owner | pending owner ID → new owner ID | Pending must exist; existing owner rejected. Platform-admin boundary is absent |
| `getPendingOwners` | currently any active owner | empty → pending list | Same authorization gap |
| `prepareEmployeeSession` | employee | empty → success | Active employee with owner; may mark Auth email verified |
| `createEmployee` | active verified owner | identity/password/assignments → employee ID | Password complexity, tenant stores, duplicate Auth failures |
| `updateEmployeeAssignments` | owner | employee ID/store IDs → success | Tenant ownership and valid stores |
| `setEmployeeActive` | owner | employee ID/active → success | Tenant ownership |
| `resetEmployeeTemporaryPassword` | owner | employee ID/password → success | Password rules and tenant ownership |
| `deleteEmployee` | owner | employee ID → success | Tenant ownership; removes Auth/profile according to handler |
| `completeEmployeePasswordChange` | employee | empty → success | Own active profile |
| `completePasswordReset` | authenticated account | reset context → success | Reconciles employee password-change state |
| `extractReceiptReadings` | authenticated caller | encoded image/hash context → OCR result | Image validation/quota/cache; Vision failures logged |
| `runVisit` | active employee | visit/store/shift/date/readings/images → visit result | Assignment, active shift/status, date, machines/readings/baselines, deterministic duplicate ID |
| `setVisitSplit` | permitted caller | owner/store/visit and percentages → success | Unsubmitted visit; non-negative split totals 100 |
| `submitVisit` | permitted caller | owner/store/visit/shift and split → success | Positive net, 100 split, unchanged baselines; transaction may abort |
| `employeeOnboardStore` | employee | store details/split → store ID | Active employee and valid store fields/split |
| `employeeAddMachine` | employee | store/machine/baselines → machine ID | Assignment, active store, valid non-negative baseline |
| `adjustVisit` | owner | visit, reason/tag, readings, rewrite flag → adjustment result | Submitted visit, valid readings, tenant ownership; guarded baseline rewrite |
| `startShift` | employee | owner ID and optional store IDs → shift identity/status | Active employee/tenant; one unresolved shift; allowed stores |
| `getActiveShift` | owner or employee | optional employee target → shift/null | Employee may access self; owner may query tenant employee |
| `finishShift` | employee | shift ID → success | Ownership and operational status |
| `reconcileStore` | owner | shift/store, actual cash, reason/note/evidence/line items → success | Open shift, linked submitted visits, non-negative amount, discrepancy reason |
| `closeShift` | owner | shift ID → success | Every shift store reconciled; derives/fixes closed summary transactionally |

Exact field-level shapes should remain synchronized with `functions/src/index.ts`, `services/*.ts`, and `types/index.ts`. Several lifecycle callables use inline unexported request types; generating a shared runtime schema remains an open design decision.
