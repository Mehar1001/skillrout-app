# Skillrout

A mobile and web app for tracking store visits, machine readings, and settlements.
Built with **Expo**, **React Native**, and **Firebase**.

- Owner onboarding and store management
- Machine onboarding with last-settled IN/OUT baselines
- Employee store selection, visit entry, and RUN/SUBMIT/PRINT flow
- Earthy, minimal design system

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

4. Start the web dev server

   ```bash
   npx expo start --web
   ```

   Then open `http://localhost:8081`.

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
