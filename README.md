# Skillrout

A production bookkeeping and operations platform for businesses that run machines across multiple stores. Built with **Expo 53**, **React Native**, and **Firebase**.

## What it does

- Separate owner and employee sign-in, workspaces, and role-aware routing.
- Owner store, machine, employee, and settlement management.
- Employee store selection, cumulative IN/OUT readings, and visit recording.
- Plain `1, 2, 3` machine numbering in the UI and on receipts — no `#` or `Serial` prefixes.
- `RUN` / `PRINT` / `SUBMIT` workflow with immutable visit snapshots.
- Retry-safe `RUN` with staged progress, timeout, and status check.
- Thermal receipt and machine photo capture, plus receipt OCR parsing and legacy-number matching.
- Owner history, reports, and employee history.

## Live app

- **Production Hosting**: `https://skillrout.web.app`
- **Firebase project**: `skillrout`

## Quick start (local)

1. Clone the repo

   ```bash
   git clone https://github.com/Mehar1001/skillrout-app.git
   cd skillrout-app
   ```

2. Install dependencies

   ```bash
   npm install
   cd functions && npm install && cd ..
   ```

3. Add your Firebase web config to `.env`

   ```bash
   EXPO_PUBLIC_FIREBASE_API_KEY=...
   EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=...
   EXPO_PUBLIC_FIREBASE_PROJECT_ID=...
   EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=...
   EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
   EXPO_PUBLIC_FIREBASE_APP_ID=...
   EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID=...
   ```

4. Verify the build and tests

   ```bash
   npx tsc --noEmit
   npm run lint
   npm run test
   cd functions
   npm run build
   npm run lint
   npm test
   cd ..
   ```

5. Export the web bundle

   ```bash
   npx expo export --platform web
   ```

6. Start the web dev server (optional)

   ```bash
   npx expo start --web
   ```

## Core operating rules

1. `RUN` records the visit permanently and never updates `machine.lastSettled`.
2. `PRINT` only marks the visit as printed.
3. `SUBMIT` is the only action that advances `machine.lastSettled`.
4. `SUBMIT` works only when `totalNet > 0` and `storePercent + vendorPercent === 100`.
5. Receipts always use the visit snapshot, not live machine master data.
6. Photos belong to the visit, not the machine master record.

## Staging and data retention

- Production data is retained indefinitely unless a lifecycle policy is configured.
- OCR cache (`ocrCache/{uid}_{imageHash}`) expires after 365 days.
- The `.firebaserc` `staging` alias points to `skillrout-staging`.
- This branch currently has **Hosting-only staging** with no separate `.env.staging` Firebase config; preview channels use the production backend unless a staging project and config are created.

## Docker

### Development (live reload)

```bash
docker-compose up skillrout-dev
```

Open `http://localhost:8081`.

### Production web build

```bash
docker-compose up skillrout-web
```

Open `http://localhost`.

## Notes

- `.env` and `google-services.json` are not committed to the repo.
- Cloud Functions are deployed to `us-central1`; Firestore is `nam5` multi-region.
