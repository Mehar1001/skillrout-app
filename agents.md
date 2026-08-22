---
agent: devin-local
session: quasar-lasagna
created: 2026-08-18T20:02:48Z
---
# Expo Version Rule

Read the exact versioned docs at https://docs.expo.dev/versions/v53.0.0/ before writing any code.

---

# Skillrout — Agent Instructions

## 1. Role & Context
You are building **Skillrout** in the `Skillrout` Expo/Firebase project.
- Source of truth: `PRD.md`, `architecture.md`, `architecture_essentials.md`, `scaffold.md`, `agents.md`, `float.md`.
- The existing Skillrout code is being extended and re-shaped. Do not preserve the old customer match/coupon flow unless explicitly asked.
- Target: iOS, Android, and web (with web as dev/testing fallback).

## 2. Golden Rules — Never Break
1. `RUN` records a visit; it does not update `machine.lastSettled`.
2. `PRINT` only flips `printStatus`.
3. `SUBMIT` is the only action that advances `machine.lastSettled`.
4. `SUBMIT` requires `totalNet > 0` and `storePercent + vendorPercent === 100`.
5. Receipts must use the `visit` snapshot, not live master data.
6. Photos belong to a visit, not the machine master record.
7. All monetary values are rounded to 2 decimals consistently.
8. Touch targets are at least 44×44 px; colors meet WCAG AA.
9. Do not commit Firebase API keys, service-account JSON, or credentials.

## 3. Code Conventions
- Use **Expo Router** file-based routing; every `.tsx` file in `app/` is a route.
- Use **TypeScript**; define types in `types/index.ts`.
- Keep business logic in `helpers/`, not inline in screens.
- Use the design tokens in `constants/designTokens.ts`; do not hardcode colors or random spacing.
- Prefer `const` + arrow functions.
- Use `expo-router` `useRouter()` and `useLocalSearchParams()`.
- Cloud Functions go in `functions/src/index.ts`.
- `app/_layout.tsx` registers: `index`, `owner`, `(owner)`, `(employee)`.
- Owner tabs in `app/(owner)/_layout.tsx`: `dashboard`, `stores`, `machines`, `employees`, `history`.
- Employee flow screens: `select-store`, `visit`, `results`, `calculation`, `settlement`, `outcome`, `receipt`, `employee-history`.
- Sign-in is a single screen `app/owner.tsx`; it detects the user's role and redirects employees to `/select-store`.
- Employee creation calls the `createEmployee` Cloud Function directly from `app/(owner)/employees.tsx`; do **not** create a `services/employees.ts` unless explicitly asked.
- Use Firestore transactions for `submitVisit` (and `voidVisit` once implemented).

## 4. UI/UX Design System

### Philosophy
Clarity → Usability → Accessibility → Consistency → Visual Beauty.
Every screen must answer in ~10 seconds: where am I, what matters, what action, what happens next.

### Color Palette
The originally specified palette was:
```ts
const colors = {
  primary: '#6B7C59',      // Muted Olive
  accent: '#C46A3D',       // Terracotta
  accentDark: '#8A4A2A',   // Contrast
  background: '#F7F4F0',   // Warm Cream
  surface: '#FFFFFF',
  surfaceSecondary: '#E0DDD6',
  border: '#C8C4BB',
  textPrimary: '#2A2A2A',
  textSecondary: '#5A5A5A',
  textMuted: '#8A8A8A',
  success: '#4CAF50',
  error: '#D32F2F',
  warning: '#F9A825',
  info: '#1E90FF',
};
```

**Current code discrepancy**: the runtime tokens in `constants/designTokens.ts` use `#8C6E5F` (primary), `#5F8C7B` (accent), and `#F4F1EA` (background). Do **not** change the code colors to match this palette unless explicitly asked. Use the tokens in `designTokens.ts` for any new UI.

Apply the 60/30/10 rule: 60% background, 30% surface/neutrals, 10% primary + accent.

### Spacing
Use `4, 8, 13, 21, 34, 55` progression.
```ts
const spacing = { xs: 4, sm: 8, md: 13, lg: 21, xl: 34, xxl: 55 };
```

### Typography
One typeface, limited scale:
```ts
const fontSizes = { caption: 12, body: 14, h3: 16, h2: 21, h1: 34, display: 55 };
```

### Layout
- Mobile-first.
- Bento Grid for dashboards.
- Primary workspace ≈ 62%, supporting area ≈ 38% when appropriate.
- Avoid over-design: no giant hero sections, random gradients, excessive cards, or neon colors.

### Accessibility
- WCAG AA (4.5:1 normal text, 3:1 large text).
- All interactive elements ≥ 44×44 px.
- Use labels, not color alone, for status.
- Respect `prefers-reduced-motion`.

## 5. Component Primitives
Create and reuse these first when they exist:
- `Button` (primary/secondary/destructive/disabled/loading)
- `Input` (with label, error, keyboard type)
- `Card`
- `Modal` (use a Dialog-like abstraction)
- `ReceiptView`
- `MachineReadingCard` (use in place of the planned `MachineRow`)
- `VisitTotals`
- `VisitDatePicker`
- `CurrencyInput`
- `ThemedText` / `ThemedView`

Planned primitives that are **not yet implemented**: `Select.tsx`, `Badge.tsx`, `MachineRow.tsx` (use `MachineReadingCard.tsx` instead), `VisitSummary.tsx`, `OwnerShell.tsx`. Before creating a one-off component, ask: can an existing primitive handle this?

## 6. Cloud Functions
All Cloud Functions live in `functions/src/index.ts` and currently are:
- `createEmployee`
- `runVisit`
- `setVisitSplit`
- `submitVisit`

Do not refer to the old `submitSettlement` / `voidSettlement` naming unless you are updating to match the current file.

## 7. Testing & Verification
- Verify every screen renders on web (`npx expo start --web`) before considering a feature done.
- Confirm the current route is registered in `app/_layout.tsx`.
- Run `npx tsc --noEmit` to catch type errors.
- Test Firestore security rules in the emulator when possible.
- Never commit `google-services.json`, `.env`, or private keys.

## 8. Git
- Use `git diff` and `git status` to review changes before committing.
- One commit per logical step.
- Commit messages focus on "why".
- Do not commit to a remote unless explicitly asked.

## 9. When Requirements Are Unclear
- Ask the user a focused question rather than guessing.
- Document assumptions in code comments and in the plan.
