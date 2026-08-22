# Skillrout Release Manifest

## Current snapshot

- Branch: `production-hardening`
- Commit: `c9aff61c06815768e2a50eec937986e5f15a03bc`
- Version: 1.0.0

## Environments

| Alias     | Firebase project    | Hosting channel | Notes                     |
|-----------|---------------------|-----------------|---------------------------|
| default   | `skillrout`         | live            | Production data lives here |
| production| `skillrout`         | live            | Same as default           |
| staging   | `skillrout-staging` | live / preview  | Synthetic/sanitized data only |

## Current deployment status

- `skillrout-staging` Firestore rules deployed and default database created (`nam5`).
- `skillrout-staging` Hosting live site deployed to https://skillrout-staging.web.app.
- `skillrout-staging` Auth is enabled (email/password).
- `skillrout-staging` Firestore rules deployed and default database created (`nam5`).
- `skillrout-staging` Storage default bucket set up and `storage.rules` deployed.
- `skillrout-staging` Auth enabled (email/password).
- `skillrout-staging` Hosting live site deployed to https://skillrout-staging.web.app.
- `skillrout-staging` All Cloud Functions (v2, Node.js 22) deployed to `us-central1`.
- `skillrout-staging` Artifact Registry cleanup policy configured.
- `skillrout-staging` Still to enable: **Cloud Vision API** for OCR (`extractReceiptReadings`).
- Production (`skillrout`) has not been touched.

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
