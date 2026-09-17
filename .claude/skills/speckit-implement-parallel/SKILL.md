---
name: "speckit-implement-parallel"
description: "Graph-aware, parallel sibling of speckit-implement. Executes tasks.md as dependency-ordered waves, dispatching one subagent per task within a wave (dev-orchestrator model), each pre-loaded with a graphify blast-radius. Reviews each wave before the next, marks tasks [X], and logs waves."
argument-hint: "Optional implementation guidance or task/story filter"
compatibility: "Requires spec-kit .specify/ structure with tasks.md. Best with an ## Execution Waves section from /speckit-tasks-graph and a graphify-out/graph.json."
metadata:
  author: narenkarthikbm
  source: "sibling of speckit-implement (templates/commands/implement.md) + dev-orchestrator + graphify"
user-invocable: true
disable-model-invocation: false
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## What this is

A drop-in alternative to `/speckit-implement`. The stock command executes tasks serially in one agent. This one runs the **dev-orchestrator wave model**: it reconstructs the task DAG, then for each wave dispatches **one subagent per task in the same turn** (true parallelism), reviews the wave, integrates, and only then unlocks the next wave. Each subagent gets a self-contained prompt that already includes the graphify blast-radius for its files, so it never re-explores the repo.

You are the **orchestrator**. You do not implement tasks yourself except trivial glue/integration.

## Pre-Execution

1. Honor `before_implement` extension hooks from `.specify/extensions.yml` (same rules as speckit-implement).
2. Run `.specify/scripts/bash/check-prerequisites.sh --json --require-tasks --include-tasks`; parse `FEATURE_DIR` + `AVAILABLE_DOCS` (absolute paths).
3. **Checklist gate** (if `FEATURE_DIR/checklists/` exists): same as speckit-implement — tabulate completion, and if any checklist is incomplete, STOP and ask whether to proceed before continuing.
4. Load context once, as orchestrator: `tasks.md` (+ its `## Execution Waves`), `plan.md`, and IF EXISTS `data-model.md`, `contracts/`, `research.md`, `quickstart.md`, `.specify/memory/constitution.md`.
5. Ensure grounding: read `FEATURE_DIR/graphify-context.md`; if missing, run `/speckit-graphify-context` first.
6. Project setup verification (ignore files etc.): same as speckit-implement step 4 — do this once, up front, in the orchestrator.

## Build the execution graph

- If `tasks.md` has an `## Execution Waves` section (from `/speckit-tasks-graph`), use it verbatim as the DAG.
- Otherwise derive it: phase order (Setup → Foundational → Stories → Polish) as hard barriers; `[P]` + distinct file paths → same wave; stated deps / TDD / model → service → endpoint → sequence; shared/mutable files (from `graphify-context.md`) → serialized into their own wave. Write the derived waves back into `tasks.md` so the run is reproducible.
- Apply any `$ARGUMENTS` filter (e.g. a single story) by pruning the DAG to those tasks + their prerequisites.

## Execute waves (the loop)

For each wave in order:

1. **Dispatch.** For every task in the wave, spawn a subagent **in the same turn** (parallel) using the Agent tool, with the prompt template below. Serial waves dispatch their single task (or run trivial ones inline).
2. **Hold the barrier.** Do not start the next wave until every subagent in this one returns.
3. **Review each result** (dev-orchestrator gate): output exists; matches the task + plan + constitution; imports resolve. Success → mark the task `[X]` in `tasks.md`. Partial → patch inline or re-dispatch with a corrected prompt. Failure → diagnose; for a serial/blocking task STOP; for one parallel task continue the others and report it.
4. **Integrate** any shared-file edits the wave implies (e.g. register new routes/models/serializers in the shared manifest) — this is legitimate orchestrator glue and must happen in the orchestrator, never in two parallel subagents.
5. **Log** one line to `FEATURE_DIR/implement.log.md`:
   `<ISO> | wave <N> | tasks: <ids> | agents: <n> | outcome: success|partial|failed`
   Create the file if absent; never edit prior lines.

### Subagent task prompt template

```
## Task: <TaskID> — <description>

### Context (you have no other project context)
- Stack & conventions: <from plan.md: language, framework, libraries, style>
- Constitution constraints: <relevant rules from constitution.md, if any>

### Your job
<single, crisp deliverable for this one task>

### Graphify blast radius (authoritative — do NOT re-explore the repo)
- Files to edit/create: <files= from the wave annotation>
- This code depends on: <from graphify-context.md>
- Depended on by (do not break these): <from graphify-context.md>
- Follow the existing pattern in: <exemplar file>

### Inputs
<exact files to read: relevant plan/data-model/contract slices, prior-wave outputs by path>

### Outputs
<exact file path(s) to write>

### Constraints
- Edit ONLY your files= set. Do NOT touch shared/mutable files (<list>) — the orchestrator owns those.
- <TDD: if this is an impl task, its tests already exist at <path> and must pass.>

### Done when
<objective criterion: file exists / function implemented / tests green>
```

## Guardrails (kept from spec-kit)

- Phase barriers are hard: never dispatch story tasks before Foundational is fully `[X]`.
- TDD: a test task always lands in an earlier wave than the code it covers.
- Mark every completed task `[X]` in `tasks.md` in real time, per wave.
- Same-/shared-file tasks are never co-scheduled; "when uncertain, sequence."
- If the feature is < 3 tasks with no real parallelism, skip orchestration and just implement inline.
- For very wide cross-story waves where collisions are likely, consider giving each story its own git worktree (`Agent` `isolation: "worktree"`) and merging — overkill for small features.

## Post-Execution

- Honor `after_implement` extension hooks.
- Completion validation: all required tasks `[X]`; implementation matches spec/plan; tests pass.

## Completion Report (dev-orchestrator format)

```
## Implementation Complete — <feature>
### Waves run: <N>  (widest parallel wave: <k> agents)
### Completed: <task ids → one-line outcome>
### Partial/Degraded: <task → what's left>
### Failed: <task → reason → next step>
### Integration status: <imports resolve? tests? shared-file merges clean?>
### Next steps: <...>
```

## Done When

- [ ] All in-scope tasks executed via waves and marked `[X]`
- [ ] Each wave reviewed before the next; shared files integrated by the orchestrator
- [ ] `implement.log.md` has one line per wave
- [ ] `before_implement` / `after_implement` hooks honored
- [ ] Completion reported in the format above
