# Graph Report - Skillrout  (2026-09-17)

## Corpus Check
- 136 files · ~80,539 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 14 file(s) not represented in the graph (top: (none) 8, .example 2, .rules 2)

## Summary
- 1045 nodes · 2989 edges · 45 communities (35 shown, 10 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 25 edges (avg confidence: 0.95)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `d1f4218a`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- designTokens.ts
- shift-reports.tsx
- reports.tsx
- types/index.ts
- src/index.ts
- MachineReadingTable.tsx
- receipt.tsx
- functions/package.json
- dependencies
- package.json
- expo
- useAuth
- passwordReset.ts
- compilerOptions
- scripts
- reset-project.js
- compilerOptions
- securityRules.test.ts
- Skillrout Tester Training, Manual QA, and UAT Guide
- devDependencies
- ErrorBoundaryClass
- eslint.config.js
- jspdf
- Part 2 — Employee guide
- README.md
- resolveCaller
- src/receiptOcr.ts
- Skillrout — Collection Shift UAT Sign-Off Checklist
- Skillrout Release Manifest
- 5. Component Primitives
- useColors
- Skillrout — Agent Instructions
- results.tsx
- 4. UI/UX Design System
- OutcomeScreen
- extractReceiptReadings
- SettlementScreen
- architecture.md
- architecture_essentials.md
- CLAUDE.md
- DATA_SCHEMA.md
- PRD.md
- scaffold.md
- TRD.md

## God Nodes (most connected - your core abstractions)
1. `useColors()` - 123 edges
2. `useAuth()` - 62 edges
3. `react-native` - 61 edges
4. `react` - 54 edges
5. `spacing` - 49 edges
6. `fontSizes` - 48 edges
7. `formatCurrency()` - 46 edges
8. `colors` - 44 edges
9. `Button()` - 37 edges
10. `Card()` - 32 edges

## Surprising Connections (you probably didn't know these)
- `Color Palette` --references--> `useColors()`  [INFERRED]
  agents.md → hooks/useColors.ts
- `11.1 Employee — start a shift and make collections` --references--> `CollectionShift`  [INFERRED]
  UAT.md → types/index.ts
- `5. Component Primitives` --references--> `Button()`  [INFERRED]
  agents.md → components/Button.tsx
- `Current generated graph` --references--> `Button()`  [INFERRED]
  speckit-readme.md → components/Button.tsx
- `5. Component Primitives` --references--> `Card()`  [INFERRED]
  agents.md → components/Card.tsx

## Import Cycles
- None detected.

## Communities (45 total, 10 thin omitted)

### Community 0 - "designTokens.ts"
Cohesion: 0.07
Nodes (93): AuthActionScreen(), completePasswordReset, firstParam(), makeStyles(), maskEmail(), statusLabel, statusVariant, ChangePasswordScreen() (+85 more)

### Community 1 - "shift-reports.tsx"
Cohesion: 0.07
Nodes (60): 6. Cloud Functions, EmployeeActivityScreen(), makeStyles(), SelectStoreScreen(), CloseShiftModal(), CollectionsScreen(), getShiftStatus(), getStoreCashStatus() (+52 more)

### Community 2 - "reports.tsx"
Cohesion: 0.05
Nodes (71): EmployeeHistoryScreen(), makeStyles(), actionLabel(), ActivityDetails(), ActivityHistoryScreen(), detailStyles(), formatValue(), makeStyles() (+63 more)

### Community 3 - "types/index.ts"
Cohesion: 0.05
Nodes (73): makeStyles(), runProgressMessages, shiftStatusLabel, VisitScreen(), withTimeout(), MachineReadingTableProps, AppliedReceiptReading, makeStyles() (+65 more)

### Community 4 - "src/index.ts"
Cohesion: 0.09
Nodes (28): ActivityPayload, approveOwner, auth, completeEmployeePasswordChange, completePasswordReset, createEmployee, db, deleteEmployee (+20 more)

### Community 5 - "MachineReadingTable.tsx"
Cohesion: 0.14
Nodes (21): CurrencyInput(), CurrencyInputProps, styles, ActionButton(), CompactCurrencyInput(), MachineReadingTable(), makeStyles(), calculateLiveReadings() (+13 more)

### Community 6 - "receipt.tsx"
Cohesion: 0.12
Nodes (36): Center(), makeStyles(), ReceiptScreen(), makeStyles(), monoFont, ReceiptRow(), ReceiptView, ReceiptViewProps (+28 more)

### Community 7 - "functions/package.json"
Cohesion: 0.04
Nodes (45): db, sendBulkSms, twilioNumber, twilioSid, twilioToken, dependencies, firebase-admin, firebase-functions (+37 more)

### Community 8 - "dependencies"
Cohesion: 0.05
Nodes (40): dependencies, dayjs, expo, expo-asset, expo-blur, expo-constants, expo-dev-client, expo-file-system (+32 more)

### Community 9 - "package.json"
Cohesion: 0.06
Nodes (34): eslint, typescript, main, name, private, version, @babel/core, eslint-config-expo (+26 more)

### Community 10 - "expo"
Cohesion: 0.07
Nodes (29): backgroundColor, foregroundImage, adaptiveIcon, edgeToEdgeEnabled, package, projectId, typedRoutes, expo (+21 more)

### Community 11 - "useAuth"
Cohesion: 0.10
Nodes (32): AddMachineScreen(), makeStyles(), EmployeeLayout(), makeStyles(), employeeOnboardStore, makeStyles(), OnboardStoreScreen(), makeStyles() (+24 more)

### Community 12 - "passwordReset.ts"
Cohesion: 0.14
Nodes (19): EmployeeSignInScreen(), makeStyles(), prepareEmployeeSession, createEmployeeFn, deleteEmployeeFn, EmployeesScreen(), makeStyles(), resetEmployeeTemporaryPasswordFn (+11 more)

### Community 13 - "compilerOptions"
Cohesion: 0.12
Nodes (15): compileOnSave, compilerOptions, esModuleInterop, module, moduleResolution, noImplicitReturns, noUnusedLocals, outDir (+7 more)

### Community 14 - "scripts"
Cohesion: 0.15
Nodes (13): scripts, android, ios, lint, start, test, test:calculations, test:client (+5 more)

### Community 15 - "reset-project.js"
Cohesion: 0.17
Nodes (10): ref_fs, ref_path, ref_readline, exampleDirPath, fs, oldDirs, path, readline (+2 more)

### Community 16 - "compilerOptions"
Cohesion: 0.18
Nodes (10): expo/tsconfig.base, compilerOptions, baseUrl, paths, skipLibCheck, strict, types, exclude (+2 more)

### Community 17 - "securityRules.test.ts"
Cohesion: 0.20
Nodes (7): @firebase/rules-unit-testing, ref_node_fs, employeeA, employeeInactive, machine1, ownerA, store1

### Community 18 - "Skillrout Tester Training, Manual QA, and UAT Guide"
Cohesion: 0.04
Nodes (45): 10. Sign-off, 11.1 Employee — start a shift and make collections, 11.2 Employee — submit a visit and see expected return, 11.3 Employee — finish the route and wait, 11.4 Owner — review and partially reconcile a shift, 11.5 Owner — enter actual cash and discrepancy reason, 11.6 Owner — close the shift, 11.7 Owner — run the Shift Reports and export Excel (+37 more)

### Community 19 - "devDependencies"
Cohesion: 0.25
Nodes (8): devDependencies, @babel/core, eslint, eslint-config-expo, @firebase/rules-unit-testing, tsx, @types/react, typescript

### Community 21 - "eslint.config.js"
Cohesion: 0.40
Nodes (4): { defineConfig }, expoConfig, ref_eslint_config, ref_eslint_config_expo_flat

### Community 24 - "Part 2 — Employee guide"
Cohesion: 0.04
Nodes (45): 1.10 Sign out, 1.1 Request owner access, 1.2 Verify your email and sign in, 1.3 Reset your password, 1.4 Create a store, 1.5 Add a machine to the store, 1.6 Edit or delete a machine, 1.7 Create an employee (+37 more)

### Community 25 - "README.md"
Cohesion: 0.08
Nodes (22): About me, Documentation, Environment variables, Let’s talk, npm scripts, Prerequisites, Run locally, Skillrout (+14 more)

### Community 26 - "resolveCaller"
Cohesion: 0.25
Nodes (18): calculateMachine(), calculateVisit(), MachineLike, round2(), VisitMachineLike, adjustVisit, closeShift, employeeAddMachine (+10 more)

### Community 27 - "src/receiptOcr.ts"
Cohesion: 0.20
Nodes (15): amountFromLabel(), findAmount(), IN_LABELS, normalizeMachineNumber(), ocrDigitChars(), OUT_LABELS, parseAmount(), parseReceiptText() (+7 more)

### Community 28 - "Skillrout — Collection Shift UAT Sign-Off Checklist"
Cohesion: 0.12
Nodes (15): 1. Employee — Start a shift, 2. Employee — Run and Submit a visit, 3. Employee — Finish the route, 4. Owner — Open Collections and review the shift, 5. Owner — Save store cash, 6. Owner — Close the shift, 7. Owner — Run Shift Reports and export Excel, Acceptance notes (+7 more)

### Community 29 - "Skillrout Release Manifest"
Cohesion: 0.14
Nodes (13): Canary acceptance criteria, Current deployment status, Current snapshot, Deployment commands, Environments, Local verification, Pre-deploy checklist, Production (+5 more)

### Community 30 - "5. Component Primitives"
Cohesion: 0.18
Nodes (10): 5. Component Primitives, styles, ThemedText(), ThemedView(), ThemedViewProps, makeStyles(), VisitDatePicker(), makeStyles() (+2 more)

### Community 31 - "useColors"
Cohesion: 0.18
Nodes (13): Kpi(), makeStyles(), Amount(), CalculationScreen(), Center(), makeStyles(), DraftsScreen(), makeStyles() (+5 more)

### Community 32 - "Skillrout — Agent Instructions"
Cohesion: 0.18
Nodes (9): 1. Role & Context, 2. Golden Rules — Never Break, 7. Data Retention & Staging, 8. Git, 8. Testing & Verification, 9. When Requirements Are Unclear, Expo Version Rule, Skillrout — Agent Instructions (+1 more)

### Community 33 - "results.tsx"
Cohesion: 0.36
Nodes (8): ComparisonTable(), ErrorState(), LoadingState(), makeStyles(), ResultsScreen(), useVisit(), getVisit(), getVisitRef()

### Community 34 - "4. UI/UX Design System"
Cohesion: 0.29
Nodes (7): 4. UI/UX Design System, Accessibility, Color Palette, Layout, Philosophy, Spacing, Typography

### Community 35 - "OutcomeScreen"
Cohesion: 0.33
Nodes (6): 3. Code Conventions, Center(), makeStyles(), OutcomeScreen(), Summary(), submitVisit()

### Community 36 - "extractReceiptReadings"
Cohesion: 0.40
Nodes (4): extractReceiptText(), extractReceiptReadings, supportedImage(), @google-cloud/vision

### Community 37 - "SettlementScreen"
Cohesion: 0.50
Nodes (4): Center(), makeStyles(), SettlementScreen(), saveVisitSplit()

## Knowledge Gaps
- **407 isolated node(s):** `name`, `slug`, `version`, `orientation`, `icon` (+402 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 455 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `firebase-functions` connect `designTokens.ts` to `shift-reports.tsx`, `types/index.ts`, `src/index.ts`, `functions/package.json`, `useAuth`?**
  _High betweenness centrality (0.172) - this node is a cross-community bridge._
- **Why does `useColors()` connect `useColors` to `designTokens.ts`, `shift-reports.tsx`, `4. UI/UX Design System`, `reports.tsx`, `OutcomeScreen`, `results.tsx`, `receipt.tsx`, `SettlementScreen`, `types/index.ts`, `MachineReadingTable.tsx`, `useAuth`, `passwordReset.ts`, `README.md`, `5. Component Primitives`?**
  _High betweenness centrality (0.131) - this node is a cross-community bridge._
- **Why does `dependencies` connect `dependencies` to `package.json`?**
  _High betweenness centrality (0.080) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `useColors()` (e.g. with `Color Palette` and `Current generated graph`) actually correct?**
  _`useColors()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `name`, `slug`, `version` to the rest of the system?**
  _407 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `designTokens.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06972330436519829 - nodes in this community are weakly interconnected._
- **Should `shift-reports.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.0676056338028169 - nodes in this community are weakly interconnected._