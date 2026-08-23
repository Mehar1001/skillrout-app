# Skillrout Release Manifest

## Current snapshot

- Branch: `production-hardening`
- Commit: `5520137fe42ab7a5b4a360216dcb28a77df18b4b`
- Version: 1.0.0

## Environments

| Alias     | Firebase project    | Hosting channel | Notes                     |
|-----------|---------------------|-----------------|---------------------------|
| default   | `skillrout`         | live            | Production data lives here |
| production| `skillrout`         | live            | Same as default           |
| staging   | `skillrout-staging` | live / preview  | Synthetic/sanitized data only |

## Current deployment status

### Staging (`skillrout-staging`)

- Firestore rules deployed and default database created (`nam5`).
- Storage default bucket set up and `storage.rules` deployed.
- Auth enabled (email/password).
- Hosting live site: https://skillrout-staging.web.app.
- All Cloud Functions (v2, Node.js 22) deployed to `us-central1`.
- Artifact Registry cleanup policy configured.
- Cloud Vision API enabled for OCR (`extractReceiptReadings`).
- Visits moved to `owners/{ownerId}/stores/{storeId}/visits/{visitId}` with `ownerId` denormalized for cross-store collection-group queries.
- New collection-group index on `visits` (`ownerId` ASC, `timestamp` DESC) deployed for owner reports/history.
- **Note: Auth is NOT actually enabled on staging** (Identity Toolkit `CONFIGURATION_NOT_FOUND`). Seeded stores live under owner UID `hDyaBWtutsP8HH5v2UmwSbncAOI2` (production owner UID) without an auth user. Enable Email/Password in the console before staging login testing.
- Tesla theme (white/black/red), BOOK KEEPING receipt format (SKILLROUT header, TOTAL VOUCHERS PRINTED = Money Out), Vendor → Games labels, and the compact machine readings table are deployed to staging.
- 14 real stores + 51 machines seeded into staging (dry-run → apply, `--skip-auth`).

### Production (`skillrout`)

- Firestore rules deployed to `cloud.firestore`.
- Cloud Functions (v2, Node.js 22) deployed and all callable endpoints active.
- Cloud Vision API enabled for OCR.
- Hosting live site: https://skillrout.web.app.
- Firestore backup created at `gs://skillrout-backups/firestore-20260822-164737` before backend changes.
- **Storage is not set up yet** — must be enabled via console before photo upload/receipt OCR works.
- Replaced hidden native `Alert` dialogs with web-visible inline messages and `window.confirm` fallbacks on owner sign-in, dashboard, employees, stores, and machines screens.
- Visits moved to `owners/{ownerId}/stores/{storeId}/visits/{visitId}` with `ownerId` denormalized for cross-store collection-group queries.
- New collection-group index on `visits` (`ownerId` ASC, `timestamp` DESC) deployed for owner reports/history.
- Tesla theme (white/black/red), BOOK KEEPING receipt format, Vendor → Games rename, compact readings table, and `storeAddress` visit snapshots deployed.

## Pre-deploy checklist

1. `git status` is clean on `production-hardening`.
2. All local verification commands pass (see below).
3. Staging project services are enabled (Firestore, Storage, Functions, Auth, Hosting).
4. `.env.staging` exists with the staging Firebase web config and is gitignored.
5. A backup of production Firestore/Auth/Storage has been made before live changes.

## Local verification

```bash
# Client
npx tsc --noEmit
npm run lint
npm run test:calculations
npm run test:validators
npx expo export --platform web

# Security rules
export JAVA_HOME=/opt/homebrew/Cellar/openjdk@21/21.0.10/libexec/openjdk.jdk/Contents/Home
firebase emulators:exec --only firestore,storage --project demo-skillrout 'npm run test:rules'

# Cloud Functions
cd functions
npm run build
npm run lint
npm test
cd ..
```

## Deployment commands

### Staging

```bash
# Use the staging Firebase project and build artifact
cp .env.staging .env
firebase use staging
npx expo export --platform web
firebase deploy --only hosting,firestore:rules,storage:rules --project staging
firebase deploy --only functions --project staging
```

### Production preview (canary)

```bash
# Build once with production env
firebase use production
npx expo export --platform web
firebase hosting:channel:deploy canary --expires 3d
```

Promote the exact preview artifact without rebuilding:

```bash
firebase hosting:clone canary:live
```

## Rollback

1. Revert the offending code change and merge the revert to `production-hardening`.
2. Re-run the full verification suite.
3. Redeploy Functions: `firebase deploy --only functions --project production`.
4. Redeploy Hosting to the previous release via Firebase console or `firebase hosting:clone <previous-channel>:live`.
5. If Firestore data was corrupted, restore from the pre-deploy backup.

## Canary acceptance criteria

- Owner sign-up and email verification flow works.
- Employee login, forced password change, and store selection work.
- Visit `RUN` records a visit without changing machine baselines.
- `SUBMIT` advances baselines only when `totalNet > 0` and split totals 100%.
- `PRINT` only flips `printStatus`.
- Offline draft save and reconnect sync submit successfully.
- OCR receipt scan returns candidates that can be reviewed and applied.
- Existing production visit counts and baselines are unchanged except for deliberate canary submissions.
