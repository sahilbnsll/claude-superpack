---
name: task-decomposer
description: This skill should be used when the user asks to "split this into workstreams", "break this task into phases", "plan multiple independent changes", "decompose a complex implementation request", or when a request clearly contains two or more distinct outcomes that may be executed separately. Also invoked by the auto-router for Class B, C, and D requests.
version: 4.0.0
---

# Task Decomposer

Turn a large implementation request into a structured DAG of workstreams before any worker execution starts.

## Goals

- Separate outcomes that can be shipped independently.
- Surface dependencies early instead of discovering them mid-edit.
- Give downstream collision checks a clear ownership map.
- Keep the main thread focused on orchestration rather than raw expansion.
- Assign complexity and model tier to guide adaptive execution.

## Context Gathering (Before Decomposing)

Do not decompose blindly. First, gather minimal context:

1. `git diff --name-only` -- what has changed recently?
2. Glob for key files related to the request (configs, entry points, test dirs).
3. Grep for symbols mentioned in the request.
4. Read only the specific sections you need (offset/limit).

Spend under 30 seconds on discovery. If you cannot find relevant files quickly, note the gap and proceed with what you have.

## Decomposition Workflow

1. Rewrite the request as concrete deliverables.
2. Split deliverables into workstreams that each have one primary goal.
3. Assign a tentative owner for each workstream: implementation, tests, docs, migration, cleanup, or verification.
4. Score complexity for each workstream (see below).
5. Assign a model tier for each workstream (see below).
6. Identify the expected write surface for each workstream.
7. Map dependencies between workstreams to form a DAG.
8. Hand the DAG to `conflict-detector` before recommending concurrent execution.

## Complexity Scoring

Score each workstream 1-5:

| Score | Criteria |
|-------|----------|
| 1 | Single file, mechanical change (rename, format, typo fix) |
| 2 | 1-3 files, straightforward logic (add function, write test) |
| 3 | 3-7 files, moderate reasoning (feature implementation, refactor within module) |
| 4 | 7+ files or cross-module (API change with consumers, migration with tests) |
| 5 | Architectural (new abstraction, system-wide pattern change) |

## Model Tier Assignment

Based on complexity:

- Score 1-2: `haiku` -- mechanical work, no deep reasoning needed
- Score 3: `sonnet` -- standard implementation work
- Score 4-5: `opus` -- needs architectural reasoning or cross-cutting awareness

Override: if the workstream involves security, authentication, or data integrity, bump up one tier regardless of score.

## DAG Output Format

Produce a structured plan. Each workstream gets a deterministic ID: first 8 characters of `sha256(goal + sorted_file_paths)`.

```json
{
  "workstreams": [
    {
      "id": "a1b2c3d4",
      "description": "Fix auth validation bypass in login handler",
      "goal": "Patch the validation logic to reject malformed tokens",
      "likely_paths": ["src/auth/validator.ts", "src/auth/handler.ts"],
      "dependencies": [],
      "complexity": 2,
      "model": "sonnet",
      "owner": "implementation",
      "parallel_status": "parallel-ready"
    },
    {
      "id": "e5f6a7b8",
      "description": "Add regression tests for auth validation",
      "goal": "Cover the fixed edge cases with unit and integration tests",
      "likely_paths": ["tests/auth/validator.test.ts"],
      "dependencies": ["a1b2c3d4"],
      "complexity": 2,
      "model": "haiku",
      "owner": "tests",
      "parallel_status": "blocked-by-dependency"
    }
  ],
  "execution_order": [["a1b2c3d4"], ["e5f6a7b8"]],
  "total_complexity": 4,
  "estimated_workers": 2
}
```

The `execution_order` field groups workstreams into parallel batches. Batches execute sequentially; workstreams within a batch execute concurrently.

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

## Guardrails

- Preserve user intent exactly; do not invent extra deliverables.
- Prefer serial execution over speculative parallelism when ownership is fuzzy.
- Call out hidden coupling through shared tests, snapshots, schemas, generated files, or config.
- Treat docs-only work as parallel-safe only when it does not depend on unstable implementation details.
- Keep the list short. Three clean workstreams are better than eight noisy ones.
- Cap at 5 workstreams. If you need more, the task should be broken into phases first.

## Handoff

If the DAG contains a single workstream with no dependencies, skip `conflict-detector` and proceed directly to execution -- there is nothing to conflict-check.

For DAGs with two or more workstreams, pass the DAG (with IDs, paths, dependencies, and complexity scores) to `conflict-detector`. Only after a conflict analysis should `parallel-orchestrator` decide whether to launch isolated workers.
