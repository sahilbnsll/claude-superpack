---
name: task-decomposer
description: This skill should be used when the user asks to "split this into workstreams", "break this task into phases", "plan multiple independent changes", "decompose a complex implementation request", or when a request clearly contains two or more distinct outcomes that may be executed separately.
version: 1.0.0
---

# Task Decomposer

Turn a large implementation request into a small set of explicit workstreams before any worker execution starts.

## Goals

- Separate outcomes that can be shipped independently.
- Surface dependencies early instead of discovering them mid-edit.
- Give downstream collision checks a clear ownership map.
- Keep the main thread focused on orchestration rather than raw expansion.

## Decomposition Workflow

1. Rewrite the request as concrete deliverables.
2. Split deliverables into workstreams that each have one primary goal.
3. Assign a tentative owner for each workstream: implementation, tests, docs, migration, cleanup, or verification.
4. Mark each workstream as one of:
   - `parallel-ready`
   - `blocked-by-dependency`
   - `too-coupled-for-parallelism`
5. Identify the expected write surface for each workstream.
6. Hand the write surface list to `conflict-detector` before recommending concurrent execution.

## Good Workstream Boundaries

Prefer a split when each workstream:

- has a narrow objective,
- can describe its likely write paths up front,
- can be reviewed on its own,
- does not depend on another workstream's in-progress edits.

Avoid a split when the task requires:

- repeated edits to the same file,
- coordinated changes to a single algorithm,
- one refactor that reshapes the same abstraction everywhere,
- migrations that must be authored in one sequence.

## Output Shape

Produce a plan with these fields:

- `workstream`
- `goal`
- `likely_paths`
- `dependencies`
- `risk`
- `parallel_recommendation`

Keep the list short. Three clean workstreams are better than eight noisy ones.

## Guardrails

- Preserve user intent exactly; do not invent extra deliverables.
- Prefer serial execution over speculative parallelism when ownership is fuzzy.
- Call out hidden coupling through shared tests, snapshots, schemas, generated files, or config.
- Treat docs-only work as parallel-safe only when it does not depend on unstable implementation details.

## Handoff

After decomposition, pass the candidate write surfaces to `conflict-detector`. Only after a low-conflict result should `parallel-orchestrator` decide whether to launch isolated workers through `${CLAUDE_PLUGIN_ROOT}/bin/safe-summon`.
