<!--
Sync Impact Report
- Version change: template -> 1.0.0
- Established principles: Spec-First and Graph-Grounded Delivery; Shared Contracts; Test-First; Security by Default; Code Quality and Consistency; YAGNI
- Added sections: Technology Constraints; Development Workflow and Quality Gates; Governance
- Removed sections: none (template placeholders resolved)
- Deferred placeholders: none
-->
# Skillrout Constitution

## Core Principles

### I. Spec-First and Graph-Grounded Delivery
Every material feature or behavior change MUST begin with an approved specification that states actors,
outcomes, rules, failure behavior, and acceptance criteria. Plans and tasks MUST be grounded in the
current repository and `graphify-out/graph.json`; `graphify query`, `explain`, `path`, or `affected`
MUST be used when dependencies or blast radius are uncertain. Implementation and permanent docs MUST
be synchronized before completion. The repository remains authoritative when generated context drifts.

### II. Shared Contracts Are the Single Source of Truth
Cross-layer concepts MUST have one canonical contract. TypeScript domain contracts live in
`types/index.ts`; callable behavior is defined by `functions/src/index.ts` and matching service wrappers;
data access is constrained by `firestore.rules`, `storage.rules`, and `firestore.indexes.json`. A change
to a shared field, status, path, or invariant MUST update every producer, consumer, rule, test, spec, and
permanent document in the same feature. RUN, PRINT, SUBMIT, shift, and reconciliation semantics MUST
never diverge between client and server.

### III. Test-First Is Non-Negotiable
For bugs, a reproducing failing test MUST precede the fix whenever an automated boundary exists. New
pure logic requires unit tests; callable or financial transitions require server tests; rule changes
require emulator tests; route/UI work requires typecheck, lint, web export, and acceptance validation.
Settlement or Collection Shift features MUST test positive flow, validation failure, authorization,
transaction/conflict behavior, and invariant preservation. Tests MUST fail for the intended reason
before implementation and pass afterward; inability to automate a case MUST be recorded with manual UAT.

### IV. Security by Default
Every read and mutation MUST enforce authentication, tenant ownership, role, active state, and store
assignment at the authoritative boundary. Evidence includes `contexts/AuthContext.tsx`, authorization
helpers in `functions/src/index.ts`, `firestore.rules`, `storage.rules`, and `helpers/validators.ts`.
Secrets MUST never enter source, logs, specs, graph artifacts, or commits. Firebase Auth owns password
hashing; no custom hashing module exists. No custom CSRF module exists, so callable SDK token controls
are the current boundary. No rate-limit module exists; abuse-sensitive additions MUST specify and test
limits rather than claim protection that is absent. Financial writes MUST be server-validated and
transactional where consistency matters.

### V. Code Quality and Consistency
Changes MUST follow Expo Router, TypeScript, service/helper separation, shared UI primitives, and design
tokens already used by the repository. Monetary values MUST be rounded to two decimals. Errors MUST be
clear and observable without exposing sensitive data. New abstractions MUST match verified neighboring
patterns, and dependency additions MUST be justified, pinned through the package manager, and reviewed
for platform compatibility. Existing comments and production invariants MUST be preserved.

### VI. YAGNI and Controlled Complexity
Implement only behavior required by an approved specification. Prefer the smallest change that preserves
existing architecture and contracts; do not rewrite working systems, add speculative frameworks, or
introduce parallel sources of truth. New infrastructure, dependencies, collections, statuses, or generic
abstractions require explicit need and decision evidence. Complexity that cannot be removed MUST be
recorded in the plan and decision log.

## Technology Constraints

Skillrout uses Expo 53.0.20, React Native 0.79.5, React 19, TypeScript 5.8, Expo Router, Firebase Auth,
Firestore, Storage, callable Cloud Functions v2 in `us-central1`, Google Cloud Vision, and static Firebase
Hosting. Firestore is the durable operational source of truth; AsyncStorage is limited to local draft
state. Privileged mutations MUST use callable Functions; direct client access MUST remain within deployed
rules. Receipts and reports MUST use visit snapshots. RUN MUST NOT advance baselines, PRINT MUST only
change print metadata, and SUBMIT MUST be the normal operation that advances baselines after positive-net
and 100-percent split validation.

## Development Workflow and Quality Gates

1. Reconcile the request with `docs/`, code, configuration, and the graph.
2. Run `/speckit-specify`; clarify material ambiguity before planning.
3. Run graph-grounded planning and dependency-verified task generation.
4. Apply red-green-refactor and implement in dependency order.
5. Review authorization, tenancy, data migration, failure UX, and invariant impact.
6. Run relevant tests plus `npm run verify`; run Function and rules checks when affected.
7. Run `npx expo export --platform web` for client changes.
8. Run `graphify update .`, update permanent docs, and verify generated artifacts before completion.

Definition of Done requires approved acceptance criteria, passing applicable checks, no unresolved secret
or security findings, synchronized contracts/docs, reviewed diff, updated graph, and explicit reporting
of any manual-only verification or open question. Deployment and push require separate authorization.

## Governance

This constitution supersedes informal implementation habits. Amendments require an explicit rationale,
review of affected templates/docs/workflows, a Sync Impact Report, and approval before implementation.
Constitution versions follow semantic versioning: MAJOR for incompatible principle/governance changes,
MINOR for new or materially expanded requirements, and PATCH for non-semantic clarification. Every spec,
plan, task set, and code review MUST check constitutional compliance; deviations require written
justification and a remediation decision. Compliance is reviewed at feature specification, planning,
pre-commit verification, and release readiness. `AGENTS.md` and `docs/` provide operational guidance but
cannot silently override this constitution.

**Version**: 1.0.0 | **Ratified**: 2026-09-17 | **Last Amended**: 2026-09-17
