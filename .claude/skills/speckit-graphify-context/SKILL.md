---
name: "speckit-graphify-context"
description: "Generate a token-bounded graphify codebase-grounding file (graphify-context.md) for the current feature: relevant existing modules, per-file blast radius, shared/mutable files, and patterns to follow. Runs as a before_plan / before_tasks / before_implement hook and inline from the graph-aware speckit variants."
argument-hint: "Optional: a feature dir override, or the word 'merged' to force the cross-repo stack graph"
compatibility: "Requires spec-kit .specify/ structure AND a graphify-out/graph.json built for the repo (run /graphify first)."
metadata:
  author: narenkarthikbm
  source: "graphify:commands/speckit.graphify.context.md"
user-invocable: true
disable-model-invocation: false
---

## User Input

```text
$ARGUMENTS
```

Consider the user input (e.g. an explicit feature dir, or the word `merged` to force the cross-repo stack graph).

## Goal

Produce `<FEATURE_DIR>/graphify-context.md` — a compact, token-bounded grounding file that the graph-aware Spec Kit commands (`/speckit-plan`, `/speckit-tasks-graph`, `/speckit-implement-parallel`) read so they don't re-explore the repo from scratch. It captures what already exists around this feature, the dependency blast radius of the files it will touch, and the shared/mutable files that constrain parallel execution.

## Steps

1. **Resolve feature paths.** Run `.specify/scripts/bash/check-prerequisites.sh --paths-only` from the repo root and parse `REPO_ROOT`, `BRANCH`, `FEATURE_DIR`, `FEATURE_SPEC`, `IMPL_PLAN`. If `$ARGUMENTS` names a feature dir, prefer it. All paths absolute.

2. **Locate the graph.** Read `.specify/extensions/graphify/graphify-config.yml` for `graph.repo`, `graph.merged`, and `query.budget`.
   - Default graph root = `REPO_ROOT` (queries `REPO_ROOT/graphify-out/graph.json`, this repo only).
   - Use the **merged** graph root = `dirname(REPO_ROOT)` (the stack root, queries `../graphify-out/graph.json`) when ANY of: `$ARGUMENTS` contains `merged`; the spec/plan references the sibling repo by name; or the feature spans both frontend and backend.
   - If the chosen `graph.json` does not exist, STOP and tell the user to run `/graphify` in that root first. Do **not** fabricate context.

3. **Extract anchors and map them to graph labels.** Read `FEATURE_SPEC` (spec.md) and, if present, `IMPL_PLAN` (plan.md), `data-model.md`, and `contracts/`. Pull the concrete nouns this feature is about: entities, services, endpoints, routes, components, modules, and existing file names. Then map each to a **concrete graph node label** — a file basename (`tournaments.server.ts`) or a symbol (`TournamentHubLayout()`), not a generic phrase. These exact labels are what `explain` resolves cleanly.

4. **Query the graph.** Run `graphify` from the chosen graph root so it reads the right `graph.json` (use a subshell, e.g. `(cd "<GRAPH_ROOT>" && graphify explain "…" --budget <budget>)`). Cap every call with `--budget <budget>`.
   - **Lead with `explain` on the concrete labels from Step 3.** `graphify explain "<file-or-symbol label>"` returns exact directional edges (`-->` depends-on, `<--` depended-on-by, `contains`) and is the authoritative source for each anchor's role and blast radius. This is your primary call.
   - Use broad NL `query` for **discovery only** (surfacing anchors you didn't know to name): `graphify query "<one-sentence feature summary>: which existing modules and files does this touch?"`. Treat its hits as *candidate labels* to re-run through `explain` — keyword matching anchors noisily on token overlap (a constant, a plan doc, the wrong `Layout()`), so never quote a raw NL-query result as a dependency fact.
   - Per pair of anchors that may interact: `graphify path "<A>" "<B>"`.
   - Keep total queries proportional to feature size (typically 3–8). Never cat or dump `graph.json`.

5. **Identify shared / mutable files.** From the results, flag files that many things depend on and that multiple tasks would edit — route manifests (e.g. `app/routes.ts`), barrels / `index` re-exports, DI / registry / settings modules, URL confs, migration directories. These are the collision points that force serialization during parallel implementation.

6. **Write `<FEATURE_DIR>/graphify-context.md`** using the template below. Keep it lean (target < ~1500 tokens). Cite real `source_file` paths from the graph, not guesses. Mark anything absent from the graph as `(not in graph — new code)`.

## Output template

```markdown
# Graphify Context — <feature>

_Generated <ISO-8601> from `<graph path>` (<N> nodes, <M> edges, scope: repo|merged). Stale after large merges — regenerate with `/speckit-graphify-context`._

## Graph scope
- Repo graph: `<REPO_ROOT>/graphify-out/graph.json`
- Merged stack graph: `<stack>/graphify-out/graph.json` (use for cross-repo features)
- This run used: **<repo|merged>**

## Relevant existing modules
- `<source_file>` — <role, from explain/query>
- ...

## Blast radius (per anchor)
- **<anchor>** (`<source_file>`)
  - depends on: `<file>`, `<file>`
  - depended on by: `<file>`, `<file>`
  - follow the pattern in: `<file>`

## Shared / mutable files (collision watch)
> Tasks that touch any of these must be serialized — never put two of them in the same parallel wave.
- `<file>` — <why it is shared>
- (or: none found)

## Patterns to follow
- <convention surfaced by the graph, with the exemplar file>
```

## Done When

- [ ] `<FEATURE_DIR>/graphify-context.md` exists and cites real graph paths
- [ ] Shared/mutable files section is populated (or explicitly "none found")
- [ ] If the graph was missing, the user was told to run `/graphify` (no file fabricated)
