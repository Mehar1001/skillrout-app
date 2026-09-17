# Architecture Decision Log

| Decision | Reason evidenced by code | Status | Evidence |
|---|---|---|---|
| One Expo app for native and web | Shared routes/components and static web export | Active | `package.json`, `app.json`, `app/` |
| Expo Router file-based navigation | Route files and owner/employee layouts | Active | `app/_layout.tsx`, route groups |
| Firebase managed backend | Auth, Firestore, Storage, Functions, Hosting configuration | Active | `firebaseConfig.ts`, `firebase.json` |
| Callable Functions for privileged mutations | Server validates tenant and financial transitions | Active | `functions/src/index.ts`, services |
| Owner-nested tenant model | Tenant resources are scoped by owner path | Active | rules/services |
| Top-level employee identities | Auth UID profile links to owner and store assignments | Active | `employees/{uid}`, `AuthContext` |
| Immutable visit snapshots | Receipts/history survive master-data changes | Active | visit schema and templates |
| RUN/PRINT/SUBMIT separation | Prevent accidental baseline advancement | Active | visit handlers and print service |
| Transactional settlement baselines | Detect concurrent/stale baseline changes | Active | `submitVisit` |
| Client-generated visit IDs | Retried RUN does not duplicate visits | Active | `createVisitId`, `runVisit` |
| Collection Shift as reconciliation boundary | Groups employee collections across stores and gates next shift | Active | shift Functions/services/screens |
| Device-local offline drafts | Permit capture while offline and replay later | Active with gap | AsyncStorage draft queue; replay lacks `shiftId` |
| Cloud Vision behind Functions | Keeps OCR provider access server-side and enables cache | Active | OCR Function/module |
| Client-side report files | Native/browser helpers create PDF/JPEG/XLSX | Active | report/export/share helpers |
| Firebase Hosting for production web | Static dist and SPA rewrite | Active | `firebase.json`, README |

This log records decisions inferable from implementation; it does not claim original rationale beyond the evidence shown.
