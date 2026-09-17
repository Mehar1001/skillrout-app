# Testing Strategy

## Existing layers

| Layer | Tool | Command |
|---|---|---|
| Types | TypeScript | `npm run typecheck` |
| Client lint | Expo ESLint | `npm run lint` |
| Client helper unit tests | Node test runner + `tsx` | `npm test` |
| Function compilation | TypeScript | `cd functions && npm run build` |
| Function lint | ESLint | `cd functions && npm run lint` |
| Function calculation/OCR tests | Node test runner | `cd functions && npm test` |
| Firestore/Storage rules | Firebase Emulator + rules unit testing | `npm run test:rules` |
| Static web build | Expo export | `npx expo export --platform web` |
| Business acceptance | Manual checklists | `UAT.md`, `COLLECTION_SHIFT_UAT_SIGNOFF.md` |

`npm run verify` runs client typecheck, lint, and helper tests. Functions predeploy runs Function lint/build.

## Current coverage

Unit tests cover calculations, formatting, validators, password-reset helpers, machine ordering, OCR parsing/matching, and receipt templates. Rules tests cover representative owner/employee/store/machine/visit/storage access. No repository coverage percentage is available.

## Gaps

- No component, route, browser E2E, or native automation.
- No callable Function integration suite.
- No Collection Shift/reconciliation security-rule tests.
- Rules fixtures use obsolete `M001`-style machine numbers.
- No CI workflow enforces verification.
- No performance/load, accessibility automation, or production smoke-test runner.

## Per-change expectations

Pure logic changes require unit tests. Security/rule changes require emulator tests. Settlement/shift changes require transaction/invariant tests plus UAT. Route/UI changes require typecheck, lint, web export, and relevant manual flow validation. Deployment-sensitive work must verify Function build/tests and only then deploy explicitly requested resources.
