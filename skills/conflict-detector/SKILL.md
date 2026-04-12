---
name: conflict-detector
description: This skill should be used when the user asks to "avoid merge conflicts across agents", "check whether these workstreams can run in parallel", "split changes across agents safely", or whenever multiple planned workstreams may touch the same files, generated outputs, schemas, or tests. Also invoked automatically after task-decomposer produces a DAG.
version: 4.0.0
---

# Conflict Detector

Analyze the workstream DAG for overlapping write surfaces. Output parallel execution groups and a concrete execution plan.

## Goal

Prevent parallel workers from corrupting each other's output by finding collisions early and forcing a safer execution order when needed. Transform the raw DAG into an actionable execution plan.

## Input

Expects the DAG output from `task-decomposer`:
- workstream IDs, paths, dependencies, complexity scores
- proposed execution order

## Detection Workflow

### 1. Map Write Surfaces

For each workstream, list:
- **Explicit**: files and directories from `likely_paths`
- **Implicit**: expand to include related surfaces:
  - test snapshots affected by the change
  - generated code (codegen, barrel exports, index files)
  - lockfiles (`package-lock.json`, `yarn.lock`, `poetry.lock`)
  - shared fixtures and seed data
  - migration files in the same chain
  - changelogs and docs derived from the same feature
  - type definition files imported by modified modules

### 2. Pairwise Conflict Analysis

For each pair of workstreams, classify overlap:

| Severity | Definition |
|----------|-----------|
| `none` | No shared files or directories |
| `low` | Shared directory but different files; or shared read-only dependency |
| `medium` | Shared type definitions, barrel exports, or docs for same surface |
| `hard-blocker` | Same file in both write surfaces, or one changes an API the other consumes |

### 3. Agent-Specific Conflict Surfaces

When workers are Claude subagents (not shell commands), also check:
- Both workers running `npm install` or `pip install` (lockfile race)
- Both workers running `git commit` (branch conflict)
- Both workers modifying the same config file
- Workers that both need to run the full test suite (resource contention)

### 4. Form Parallel Groups

Based on conflict analysis, partition workstreams into groups:

- **Parallel group**: workstreams with `none` or `low` conflict between all pairs in the group.
- **Serial chain**: workstreams with `medium` or `hard-blocker` conflicts that must run sequentially.
- **Merged workstream**: if two workstreams have `hard-blocker` on the same critical file, recommend merging them.

## Hard Blockers

Treat these as non-parallel unless the write scope is redefined:

- the same file appears in multiple workstreams,
- two workstreams edit the same database migration chain,
- two workstreams regenerate the same artifact,
- multiple workstreams rewrite the same test snapshot,
- one workstream changes an API contract while another consumes it.

## Medium-Risk Cases

Require caution when workstreams share:

- a directory with barrel exports,
- shared type definitions,
- route registration,
- public documentation for a changing surface,
- end-to-end tests that depend on both changes landing together.

## Output Format

### Per-Pair Analysis

```json
{
  "pair": ["a1b2c3d4", "e5f6a7b8"],
  "shared_surface": ["src/types/auth.ts"],
  "severity": "medium",
  "why": "Both workstreams import from shared auth types",
  "recommended_action": "serialize"
}
```

### Execution Plan

```json
{
  "verdict": "partial-parallel",
  "parallel_groups": [
    {
      "group": 1,
      "workstreams": ["a1b2c3d4", "c9d0e1f2"],
      "can_run_concurrently": true
    },
    {
      "group": 2,
      "workstreams": ["e5f6a7b8"],
      "depends_on_group": 1,
      "can_run_concurrently": false
    }
  ],
  "conflicts_found": 1,
  "serialized_pairs": [["a1b2c3d4", "e5f6a7b8"]],
  "merged_workstreams": []
}
```

### Verdict Options

- `fully-parallel` -- all workstreams can run concurrently
- `partial-parallel` -- some groups can run concurrently, others must be serialized
- `fully-serial` -- all workstreams must run sequentially
- `needs-redesign` -- too many hard-blockers; recommend re-decomposition

## Decision Rule

When in doubt, downgrade concurrency. False negatives (missed conflicts) are worse than false positives (unnecessary serialization). A serial run that succeeds is better than a parallel run that produces corrupted output.

## Handoff

Pass the execution plan (parallel groups, dependency order, conflict report) to `parallel-orchestrator`. The orchestrator uses this to decide worker count, isolation mode, and execution strategy.
