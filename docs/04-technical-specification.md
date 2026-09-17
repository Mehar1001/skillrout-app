# Technical Specification

## Runtime and libraries

- TypeScript 5.8, React 19, React Native 0.79.5, Expo 53.0.20, Expo Router 5.1.
- Firebase JS 12 client; Admin 12.7 and Functions 6.3 backend.
- Node.js 22 Functions runtime.
- AsyncStorage and Expo Network for local drafts/connectivity.
- Expo Image Picker/Manipulator, Print, Sharing, File System; Google Cloud Vision OCR.
- XLSX, jsPDF, and html-to-image for output.

## Conventions

- Routes: `app/**/*.tsx`.
- Shared UI: `components/`; design tokens: `constants/designTokens.ts`.
- Context state: `contexts/`; Firebase access: `services/`; pure/domain helpers: `helpers/`.
- Shared contracts: `types/index.ts`.
- Backend handlers: `functions/src/index.ts`; backend calculation/OCR modules are adjacent.

## State and data access

React local state and contexts drive UI state. Firestore is durable state. Services use direct Firestore reads for permitted data and callable Functions for privileged writes. AsyncStorage keeps per-employee drafts under `@skillrout/drafts/{employeeId}`.

## Validation and errors

Validation exists in client helpers, forms, Firestore/Storage rules, and callable Functions. Callable errors use Firebase `HttpsError`. Some services/screens translate errors to friendly messages; this is not yet uniform. Monetary calculations use two-decimal rounding in client and server modules.

## Build and verification

- `npm run typecheck`, `npm run lint`, `npm test`, `npm run verify`
- `npm run test:rules` with Firebase emulators
- `cd functions && npm run build && npm run lint && npm test`
- `npx expo export --platform web`

No monorepo workspace, CI workflow, component test framework, or API schema generator is present.
