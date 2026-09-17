# Infrastructure and Deployment

## Firebase

`firebase.json` configures Firestore rules/indexes, Storage rules, a default Functions codebase, Hosting, and local emulators. `.firebaserc` maps `default` and `production` to `skillrout` and `staging` to `skillrout-staging`. Functions predeploy runs lint and build; runtime is Node.js 22 and application code selects `us-central1`.

## Web

`npx expo export --platform web` creates static `dist/`. Firebase Hosting serves it with an SPA rewrite to `index.html`, no-store general caching, immutable fingerprinted assets, and basic security headers. The repository identifies `https://skillrout.web.app` as production.

## Native

`app.json` defines the Expo application, static web output, Android package `com.skillrout`, image/print/share plugins, and EAS project ID. `eas.json` defines development, internal preview, production, and submit profiles. No iOS bundle identifier is tracked.

## Local/emulators

Firebase emulator ports: Auth 9099, Functions 5001, Firestore 8080, Storage 9199, Hosting 5000, UI 4000. Docker Compose offers Expo web development and nginx static output. Docker is optional; Firebase Hosting is the verified production web target.

## Configuration and secrets

Client config reads seven `EXPO_PUBLIC_FIREBASE_*` variables. Values are intentionally not documented. `.env`, staging env, native Firebase files, keys, and one-time credential-bearing scripts are ignored. Cloud Functions use provider-managed Admin credentials.

## Release commands

```bash
npm run verify
(cd functions && npm run lint && npm run build && npm test)
npm run test:rules
npx expo export --platform web
firebase deploy --project production
```

Deploy only the required Firebase resources when appropriate. There is no repository CI/CD workflow; releases are manual CLI operations.

## Unconfirmed infrastructure

The alias does not prove staging is provisioned or isolated. Firestore location (`nam5` in historical docs), deployed resource versions, backup schedules, Cloud Vision enablement, and production Storage availability cannot be proven solely from tracked configuration.
