---
name: "speckit-tasks-graph"
description: "Graph-aware sibling of speckit-tasks. Generates tasks.md exactly like speckit-tasks, then uses graphify dependency edges to verify [P] parallel markers and append a machine-readable ## Execution Waves DAG that /speckit-implement-parallel consumes."
argument-hint: "Optional task generation constraints"
compatibility: "Requires spec-kit .specify/ structure and graphify-out/graph.json. Falls back to heuristic parallelism if the graph is absent."
metadata:
  author: narenkarthikbm
  source: "sibling of speckit-tasks (templates/commands/tasks.md) + graphify"
user-invocable: true
disable-model-invocation: false
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## What this is

A drop-in alternative to `/speckit-tasks`. It produces the same `tasks.md` (same checklist format, same phase/story organization, so `/speckit-analyze` still works) and then adds two things the stock command can't:

1. **Graphify-verified `[P]` markers** — `[P]` becomes a derived property of real import/call edges, not an LLM guess.
2. **An `## Execution Waves` DAG** — a topologically-ordered, machine-readable wave plan that `/speckit-implement-parallel` executes directly.

## Steps

### A. Ground in the graph (inline graphify-context)

1. If `<FEATURE_DIR>/graphify-context.md` exists and is fresh, read it.
2. Otherwise run `/speckit-graphify-context` first (or perform its queries inline) so you have the dependency edges and shared/mutable file list before generating tasks.

### B. Generate tasks.md exactly as speckit-tasks does

Follow the **speckit-tasks** skill end to end — do not restate its rules here, follow them verbatim:

- Run `.specify/scripts/bash/setup-tasks.sh --json`; parse `FEATURE_DIR`, `TASKS_TEMPLATE`, `AVAILABLE_DOCS`.
- Honor `before_tasks` extension hooks from `.specify/extensions.yml`.
- Load plan.md + spec.md (+ data-model.md, contracts/, research.md, constitution.md if present).
- Generate phase- and story-organized tasks using the template at `TASKS_TEMPLATE` (fallback `.specify/templates/tasks-template.md`) and the **Task Generation Rules** and **Checklist Format** from the speckit-tasks skill.

### C. Annotate every task with files + deps

For each generated task, determine:

- `files=` — the exact file path(s) the task creates or edits (from its description).
- `mutates=` — files in `files=` that already exist in the graph (editing shared state); brand-new files are `(new)`.
- `deps=` — task IDs it depends on, from: explicit "(depends on …)" notes; TDD ordering (impl depends on its tests); the model → service → endpoint chain within a story; and any graphify edge where this task's file imports/uses a file produced by an earlier task.

### D. Verify [P] against the graph (not vibes)

A task may keep or earn `[P]` **iff**, for every other task it would share a wave with:

- their `files=` sets are disjoint, AND
- neither task's file appears in the other's graphify blast radius at the symbol level, AND
- they share no file from the **shared/mutable** list in `graphify-context.md`.

Strip `[P]` from any task that fails this. When the graph is absent, fall back to the stock heuristic (different files + no stated dependency) and note the degradation in the report.

### E. Append the Execution Waves section

Append (do not replace existing content) this section to `tasks.md`:

```markdown
## Execution Waves

> Machine-readable DAG for /speckit-implement-parallel. Derived from phase boundaries,
> [P] markers, TDD ordering, and graphify dependency edges. Tasks within one parallel
> wave have all dependencies satisfied by earlier waves and disjoint mutable-file sets.
> Setup and Foundational phases are serial barriers; parallelism is cross-story.

- Wave 1 [serial]   : T001, T002              # Phase 1 Setup (shared scaffolding)
- Wave 2 [serial]   : T004, T007              # Phase 2 Foundational (blocks all stories)
- Wave 3 [parallel] : T012 [US1], T020 [US2]  # independent story models
- Wave 4 [parallel] : T014 [US1], T021 [US2]
- Wave 5 [serial]   : T0NN                     # shared-file integration / polish

### Task annotations
- T012  files=src/models/entity1.ts        deps=-           mutates=(new)
- T014  files=src/services/svc.ts           deps=T012,T013   mutates=src/services/svc.ts
- ...

### Shared-file serialization
- `app/routes.ts` touched by T015, T022 → both pinned to a serial wave; never co-scheduled.
- (or: none found)
```

Wave rules:

- Phase 1 (Setup) and Phase 2 (Foundational) are always `[serial]` barriers — emit them as single-task or small serial waves; no story work appears until Phase 2 is fully done.
- Within a story, respect tests → models → services → endpoints ordering.
- Parallelism is primarily **across independent user stories**, not within one. Do not invent intra-story parallelism the dependency chain forbids.
- Any task touching a shared/mutable file is pulled out of parallel waves into a serial wave.

## Completion Report

- Path to `tasks.md`, total task count, count per story.
- Wave count and the width (max tasks) of the widest parallel wave.
- `[P]` markers added/removed vs. naive generation, with reasons.
- Shared/mutable files that forced serialization.
- Honor `after_tasks` extension hooks.

## Done When

- [ ] `tasks.md` generated in stock format AND augmented with `## Execution Waves`
- [ ] Every task has `files=` / `deps=` / `mutates=` annotations
- [ ] `[P]` markers reconciled against the graph (or degradation noted)
- [ ] `before_tasks` / `after_tasks` extension hooks honored
