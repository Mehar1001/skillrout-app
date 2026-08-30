# Skillrout

A production machine-reading and settlement platform for businesses that operate machines across multiple stores. Built with **Expo 53**, **React Native**, and **Firebase**.

## What it does

- Owner signup and sign-in with email verification.
- Store and machine onboarding with cumulative IN/OUT baselines.
- Employee onboarding, store assignment, and role-aware routing.
- Employee store selection, machine readings, and the `RUN` / `PRINT` / `SUBMIT` flow.
- Receipt and machine-photo capture, OCR, and review.
- Fuzzy receipt machine-number matching and automatic visit-machine matching.
- Historical visit corrections with optional baseline rewrite.
- One-year OCR result caching and permanent visit history.
- Clean, tokenized, Apple-like UI with bundled Ionicons on web and native.

## Live app

- **Web**: `https://skillrout.web.app`
- **Firebase Console**: `https://console.firebase.google.com/project/skillrout/overview`

## Quick start (local)

1. Clone the repo

   ```bash
   git clone https://github.com/Mehar1001/skillrout-app.git
   cd skillrout-app
   ```

2. Install dependencies

   ```bash
   npm install
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
   npm run verify
   npx tsc --noEmit
   cd functions && npm run build
   ```

5. Start the web dev server

   ```bash
   npx expo start --web
   ```

   Then open `http://localhost:8081`.

## Staging and data retention

- All Firestore collections retain data indefinitely unless a lifecycle policy is configured.
- OCR cache documents (`ocrCache`) expire after 365 days.
- For staging, create a separate Firebase project, add it with `npx firebase use --add`, and use `npx firebase hosting:channel:deploy staging` for preview channels.

## Manual QA and UAT

Use the [Skillrout Tester Training, Manual QA, and UAT Guide](UAT.md) for tester onboarding, expected calculations, acceptance criteria, Firebase health checks, and browser debugging.

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
- Keep your local `google-services.json` safe and place it back after cloning.
- For Android/iOS native builds, run `npx expo prebuild` to generate the `android/` and `ios/` folders.
