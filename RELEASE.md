# Skillrout Release Manifest

## Current snapshot

- Branch: `production-hardening`
- Version: 1.0.0
- Target merge: `main`

## Environments

| Alias     | Firebase project    | Hosting channel | Notes |
|-----------|---------------------|-----------------|-------|
| default   | `skillrout`         | live            | Production data lives here |
| production| `skillrout`         | live            | Same as default |
| staging   | `skillrout-staging` | live / preview  | Hosting-only in this delivery; uses production backend unless a separate staging `.env` is created |

## Current deployment status

### Production (`skillrout`)

- Firestore rules and indexes deployed.
- Cloud Functions (v2, Node.js 22) deployed to `us-central1`.
- Cloud Vision API enabled for OCR.
- Hosting live site: `https://skillrout.web.app`.
- `Storage` must be enabled via the Firebase Console before photo upload / receipt OCR works.
- `RUN` uses a Firestore transaction that discovers active machines outside the transaction, reads bounded documents inside, and atomically writes the visit.
- `SUBMIT` advances `machine.lastSettled` only when `totalNet > 0` and the split totals 100%.
- `PRINT` only flips `visit.printStatus`.
- Machine numbers are plain `1…N` per store; old values are kept in `legacyMachineNumbers` for OCR/history.
- Custom password-reset action URL: `https://skillrout.web.app/auth/action`.

### Staging (`skillrout-staging`)

- Firebase alias is configured in `.firebaserc`.
- This release deploys **Hosting only** to staging using the production Firebase web config / backend.
- To create a fully isolated staging environment, create a separate Firebase project, add it with `npx firebase use --add`, and place its web config in `.env.staging` (gitignored).

## Pre-deploy checklist

1. `git status` is clean on `production-hardening`.
2. All local verification commands pass (see below).
3. `npx expo export --platform web` has been run immediately before `firebase deploy --only hosting`; `dist/` must reflect the current code.
4. `.env` / `.env.staging` are populated and gitignored.
5. `google-services.json` / `GoogleService-Info.plist` are gitignored and not committed.
6. A backup of production Firestore/Auth/Storage has been made before live data changes.

## Local verification

```bash
# Client
npx tsc --noEmit
npm run lint
npm run test
npx expo export --platform web

# Cloud Functions
cd functions
npm run build
npm run lint
npm test
cd ..

# Firestore security rules (requires JDK 21+)
npm run test:rules
```

## Deployment commands

### Staging (Hosting-only)

```bash
# Production env is reused for this Hosting preview
firebase use staging
npx expo export --platform web
firebase deploy --only hosting --project staging
```

### Production

```bash
firebase use production
npx expo export --platform web
firebase deploy --project production
```

## Rollback

1. Revert the offending code change and merge the revert into `production-hardening`.
2. Re-run the full verification suite.
3. Redeploy Functions: `firebase deploy --only functions --project production`.
4. Redeploy Hosting to the previous release via `firebase hosting:clone <previous-channel>:live` or the Firebase console.
5. If Firestore data was corrupted, restore from the pre-deploy backup.

## Canary acceptance criteria

- Owner sign-up / request access and email verification flow works.
- Employee login, forced password change, and store selection work.
- Visit `RUN` records a visit without changing machine baselines; retries with the same `visitId` are idempotent.
- `SUBMIT` advances baselines only when `totalNet > 0` and split totals 100%.
- `PRINT` only flips `printStatus`.
- Plain `1…N` machine numbers are shown everywhere; receipts show `1  Machine Name`.
- Existing production visit counts and baselines are unchanged except for deliberate canary submissions.
- Receipt and report Share menus produce valid PDF and JPEG outputs on web and native targets.
- PDF/JPEG sharing does not alter RUN/PRINT/SUBMIT settlement invariants.
