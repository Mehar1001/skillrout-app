# Skillrout Project Overview

Skillrout is a multi-tenant bookkeeping and field-operations application for businesses that operate machines across stores. Owners manage tenants, stores, machines, employees, collections, reconciliation, history, and reports. Employees work assigned stores, record cumulative machine readings, create visit snapshots, submit positive settlements, print receipts, and manage collection shifts.

## System map

- **Client:** Expo SDK 53 / React Native application for iOS, Android, and static web; routes are in `app/`.
- **State:** React context/hooks, Firestore as the durable source of truth, and AsyncStorage for offline visit drafts.
- **Backend:** Firebase callable Cloud Functions v2 in `functions/src/index.ts`.
- **Data:** Firestore tenant data under `owners/{ownerId}`, top-level employee identities, and Firebase Storage visit images.
- **Integrations:** Firebase Auth, Firestore, Storage, Functions, Google Cloud Vision, Expo print/share, and XLSX export.
- **Production web:** `https://skillrout.web.app` via Firebase Hosting.

## Major modules

Authentication and account approval; employee lifecycle; stores and machines; visit readings; RUN/PRINT/SUBMIT; receipt OCR and evidence; offline drafts; collection shifts; store reconciliation; shift closure; visit adjustments; activity history; reports and exports.

## Documentation map

- [Product](01-product.md)
- [Application behavior](02-application-spec.md)
- [Architecture](03-architecture.md)
- [Technical specification](04-technical-specification.md)
- [Data model](05-data-model.md)
- [Callable API contracts](06-api-contracts.md)
- [Authentication and security](07-auth-and-security.md)
- [Integrations](08-integrations.md)
- [Infrastructure and deployment](09-infrastructure-and-deployment.md)
- [Observability](10-observability.md)
- [Testing](11-testing-strategy.md)
- [Business rules](12-business-rules.md)
- [Decisions](13-decisions.md)
- [Open questions](14-open-questions.md)

Business instructions remain in `USER_GUIDE.md`; manual acceptance procedures remain in `UAT.md` and `COLLECTION_SHIFT_UAT_SIGNOFF.md`.
