---
name: parallel-orchestrator
description: This skill should be used when the user asks to "run this safely in parallel", "orchestrate multiple workers", "use isolated worktrees", "coordinate low-conflict subagents", or when a decomposed task contains two or more low-conflict workstreams that can be executed in isolation.
version: 1.0.0
---

# Parallel Orchestrator

Coordinate isolated worker execution only after decomposition and conflict checks say the plan is safe.

## Preconditions

Proceed only when all of these are true:

- `task-decomposer` has produced explicit workstreams,
- `conflict-detector` has classified the overlaps,
- every worker has a narrow ownership boundary,
- a serial fallback path is still available if one worker fails.

## Orchestration Workflow

1. Assign one owner and one goal per workstream.
2. Prefer the smallest number of workers that still shortens the critical path.
3. Launch isolated runs through `${CLAUDE_PLUGIN_ROOT}/bin/safe-summon`.
4. Prefer `--mode auto` so git worktrees are used when available and filtered copies are used otherwise.
5. Pass a clear `--task` label and a bounded `--timeout` value.
6. Review the patch artifact and execution log before integrating results.
7. Merge successful workstreams in dependency order.

## Recommended Runner Pattern

```bash
bash ${CLAUDE_PLUGIN_ROOT}/bin/safe-summon \
  --task "targeted-workstream-name" \
  --timeout 180 \
  --mode auto \
  -- your-worker-command
```

## Guardrails

- Do not parallelize unresolved conflicts.
- Do not hand two workers the same file ownership.
- Stop parallel execution when repeated failures suggest the split was wrong.
- Keep human review in the loop before merging risky diffs.
- Preserve cleanup even on interruption by relying on the runner's trap logic.

## Review Checklist

Before integrating worker output, inspect:

- exit status,
- timeout state,
- changed-file scope,
- secret-scan result,
- whether the worker stayed inside its assigned ownership.

If any of these checks fail, fall back to a serial repair path instead of retrying indefinitely.
