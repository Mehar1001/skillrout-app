---
agent: devin-local
session: quasar-lasagna
created: 2026-08-18T20:02:48Z
---
# Expo Version Rule

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

---

# Skillrout — Agent Instructions

## 1. Role & Context
You are building **Skillrout** in the `Skillrout` Expo/Firebase project.
- Source of truth: `PRD.md`, `architecture.md`, `architecture_essentials.md`, `scaffold.md`.
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
- Use Firestore transactions for `submitSettlement` and `voidSettlement`.

## 4. UI/UX Design System

### Philosophy
Clarity → Usability → Accessibility → Consistency → Visual Beauty.
Every screen must answer in ~10 seconds: where am I, what matters, what action, what happens next.

### Color Palette
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
Create and reuse these first:
- `Button` (primary/secondary/destructive/disabled/loading)
- `Input` (with label, error, keyboard type)
- `Select`
- `Card`
- `Badge` (status)
- `Modal`
- `MachineRow`
- `VisitSummary`
- `ReceiptView`

Before creating a one-off component, ask: can an existing primitive handle this?

## 6. Testing & Verification
- Verify every screen renders on web (`npx expo start --web`) before considering a feature done.
- Confirm the current route is registered in `app/_layout.tsx`.
- Run `npx tsc --noEmit` to catch type errors.
- Test Firestore security rules in the emulator when possible.
- Never commit `google-services.json`, `.env`, or private keys.

## 7. Git
- Use `git diff` and `git status` to review changes before committing.
- One commit per logical step.
- Commit messages focus on "why".
- Do not commit to a remote unless explicitly asked.

## 8. When Requirements Are Unclear
- Ask the user a focused question rather than guessing.
- Document assumptions in code comments and in the plan.
