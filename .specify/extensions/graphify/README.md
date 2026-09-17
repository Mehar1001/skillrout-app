# Graphify Grounding Extension

Grounds Spec Kit in the repo's graphify knowledge graph so planning, task generation, and
implementation reflect what the code *actually* is — not what the model guesses.

## Provides

- `speckit.graphify.context` → `/speckit-graphify-context`: writes `graphify-context.md`
  into the active feature dir (relevant modules, per-file blast radius, shared/mutable
  files, patterns).

## Hooks (registered in `.specify/extensions.yml`)

- `before_plan` — ground the plan in existing structure
- `before_tasks` — verify `[P]` markers against real dependency edges
- `before_implement` — pre-resolve per-task blast radius

All hooks are `optional: true` — they surface as a suggested command rather than auto-running.

## Companion skills (siblings, not hooks)

- `/speckit-tasks-graph` — `speckit-tasks` + graphify-verified `[P]` + an `## Execution Waves` DAG
- `/speckit-implement-parallel` — executes those waves as parallel subagents (dev-orchestrator model)

These are sibling skills, not edits to the stock `speckit-tasks` / `speckit-implement`, so a
Spec Kit re-init does not clobber them.

## Requirements

- A built graph: run `/graphify` in the repo (and at the stack root for cross-repo features)
  so `graphify-out/graph.json` exists. Regenerate with `/graphify --update` after big merges.

## Config

See `graphify-config.yml` for graph paths and the per-query token budget.
