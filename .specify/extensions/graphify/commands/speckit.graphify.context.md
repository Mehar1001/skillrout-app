---
description: "Write a token-bounded graphify-context.md into the active feature directory"
---

# Generate Graphify Context

Ground the current Spec Kit feature in the project's graphify knowledge graph. Produces `<FEATURE_DIR>/graphify-context.md`: the existing modules the feature touches, each anchor file's dependency blast radius, the shared/mutable files that constrain parallel work, and the patterns to follow.

## Behavior

- Resolves the feature dir via `.specify/scripts/bash/check-prerequisites.sh --paths-only`.
- Reads `.specify/extensions/graphify/graphify-config.yml` for the repo and merged graph paths and the per-query token budget.
- Queries `graphify query` / `graphify explain` / `graphify path` against the repo graph (or the merged stack graph for cross-repo features), capped by the configured budget.
- Writes a lean, citation-backed `graphify-context.md`. If no `graph.json` exists, it reports that `/graphify` must be run first and writes nothing.

## Execution

Run the `/speckit-graphify-context` skill (this command file is its provenance source). There is no standalone script — the work is LLM-driven graph querying.
