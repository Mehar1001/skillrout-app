# Skillrout Spec Kit + Graphify Cheat Sheet

## What updates automatically?

| Artifact/behavior | Automatic? | What I must run |
|---|---:|---|
| Knowledge graph after code changes | No | `graphify update .` or keep `graphify watch .` running |
| Feature specification | No | `/speckit-specify ...` |
| Clarifications | No | `/speckit-clarify` |
| Technical plan | No | `/speckit-plan` |
| Tasks | No | `/speckit-tasks` or `/speckit-tasks-graph` |
| Implementation | No | `/speckit-implement` or `/speckit-implement-parallel` |
| Extension hooks | Prompt assistance only | Accept/run optional hook when useful |
| Task completion marks | During implementation | Implement skills mark completed tasks `[X]` |
| Permanent documentation | No | Update `docs/` in the feature Definition of Done |

`extensions.yml` enables optional graph context prompts; it does not silently create specifications or
rebuild the graph. Graph artifacts are snapshots, not live indexes.

## Feature lifecycle

1. `/speckit-constitution` — establish or amend `.specify/memory/constitution.md`.
2. `/speckit-specify <business request>` — create `specs/<feature>/spec.md` from outcomes and acceptance criteria.
3. `/speckit-clarify` — ask focused questions and write answers into the specification.
4. `/speckit-plan` — create `plan.md` and associated design artifacts, optionally grounded by Graphify context.
5. `/speckit-checklist` — create a requirement-quality checklist when risk warrants it.
6. `/speckit-tasks` — create dependency-ordered `tasks.md` for serial/ordinary execution.
7. `/speckit-tasks-graph` — preferred when shared modules or parallel work matter; verifies `[P]` markers and appends an Execution Waves DAG.
8. `/speckit-analyze` — non-destructively check spec/plan/tasks consistency.
9. `/speckit-implement` — execute ordinary tasks in dependency order.
10. `/speckit-implement-parallel` — execute graph-verified waves through parallel agents; use only when tasks are genuinely independent.
11. `/speckit-converge` — compare implementation to artifacts and append remaining work.
12. `/speckit-taskstoissues` — optionally create GitHub issues from an existing task set.

### Worked example

```text
/speckit-specify Add platform-admin authorization for owner approvals without changing tenant-owner access
/speckit-clarify
/speckit-plan
/speckit-tasks-graph
/speckit-analyze
/speckit-implement-parallel
/speckit-converge
graphify update .
```

Expected outputs live under `specs/<feature>/`; implementation still requires tests, updated permanent
docs, graph refresh, and constitutional quality gates.

## Graphify CLI

```bash
# Initial/headless build
graphify extract . --code-only
graphify cluster-only . --no-label

# Refresh
graphify update .
graphify watch .

# Explore
graphify query "Where is shift authorization enforced?"
graphify explain "requireActiveOwner"
graphify path "startShift" "runVisit"
graphify affected "CollectionShift" --depth 3
graphify god-nodes --top 10
```

Open `graphify-out/graph.html` directly in a browser for the interactive map. `graph.json` is NetworkX
node-link JSON; `GRAPH_REPORT.md` summarizes god nodes and Leiden communities. `--no-label` leaves
community names as placeholders until an LLM-backed `graphify label .` is run.

## Spec Kit CLI and scripts

```bash
specify --version
specify check
specify init --here --force --non-interactive --integration claude --ignore-agent-tools
.specify/scripts/bash/resolve-template.sh constitution-template --json
```

`.specify/scripts/bash/` contains feature creation, prerequisite checking, plan setup, agent-context
updates, and template resolution. Skills must be followed as installed; do not edit generated core
templates merely to alter one feature.

## File map

```text
.specify/memory/constitution.md       Project governance
.specify/templates/                  Core artifact templates
.specify/scripts/bash/               Workflow implementation scripts
.specify/extensions.yml              Installed extension hooks
.specify/extensions/graphify/        Graphify bridge
.claude/skills/speckit-*/            User-invocable workflows
specs/                               Feature specs/plans/tasks
.graphifyignore                      Extraction exclusions
graphify-out/graph.json              Dependency graph
graphify-out/GRAPH_REPORT.md          Graph summary
graphify-out/graph.html               Interactive graph
docs/                                Permanent application context
```

## Governance and maintenance

- Begin features from approved outcomes, not implementation guesses.
- Treat code/configuration as truth and generated artifacts as refreshable context.
- Amend the constitution with semver and a Sync Impact Report.
- Update specs when requirements change; update plans/tasks before implementation diverges.
- Run `graphify update .` after code changes and merges.
- Keep `graphify-out/cache/` untracked; keep the graph/report/HTML reviewable.
- Never include environment values, service-account files, or credentials in specs or graph inputs.
- Review and commit documentation/tooling separately from feature code when practical.

## Troubleshooting encountered during setup

| Symptom | Cause | Resolution |
|---|---|---|
| `uv` not found | Tool was not installed | Installed uv 0.12.15, then used `$HOME/.local/bin` explicitly |
| System Python is 3.9 | Below requested tooling runtime | `uv tool install ... --python 3.12` downloaded managed CPython 3.12.14 |
| Graphify community labels are generic | No LLM labeling key was required/provided | Used `cluster-only --no-label`; run `graphify label .` later with an approved provider |
| Some files are skipped by extraction | `.graphifyignore`, unsupported configuration extensions, and `--code-only` | Expected; permanent docs/tooling are deliberately excluded from the app graph |
| `npm run test:rules` stops before tests | Installed JDK is 17; Firebase CLI 15 requires JDK 21+ | Install/select JDK 21 or newer, then rerun the rules suite |

## Current generated graph

Latest headless build: **1,045 nodes**, **2,989 edges**, **45 communities**. Top hubs include
`useColors`, `useAuth`, React Native, React, spacing/font tokens, `formatCurrency`, `colors`, `Button`,
and `Card`. Regenerate these figures after meaningful code changes.
