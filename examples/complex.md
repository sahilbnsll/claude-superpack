# Complex Example (Class C)

This example shows the full parallel orchestration pipeline.

## Prompt

```text
$ claude
> Fix the auth validation bug, add regression tests, and update the README.
```

## What Happens

### 1. Auto-Router

```
Classification: C
Reasoning: Three distinct deliverables (fix, tests, docs) with separable write surfaces.
Route: parallel-orchestrate
```

### 2. Task Decomposer

Produces a DAG:

```json
{
  "workstreams": [
    {
      "id": "a1b2c3d4",
      "description": "Fix auth validation bypass",
      "goal": "Patch validation logic to reject malformed tokens",
      "likely_paths": ["src/auth/validator.ts", "src/auth/handler.ts"],
      "dependencies": [],
      "complexity": 2,
      "model": "sonnet",
      "parallel_status": "parallel-ready"
    },
    {
      "id": "e5f6a7b8",
      "description": "Add regression tests",
      "goal": "Cover fixed edge cases with unit tests",
      "likely_paths": ["tests/auth/validator.test.ts"],
      "dependencies": ["a1b2c3d4"],
      "complexity": 2,
      "model": "haiku",
      "parallel_status": "blocked-by-dependency"
    },
    {
      "id": "c9d0e1f2",
      "description": "Update README",
      "goal": "Document the auth validation fix",
      "likely_paths": ["README.md"],
      "dependencies": [],
      "complexity": 1,
      "model": "haiku",
      "parallel_status": "parallel-ready"
    }
  ],
  "execution_order": [["a1b2c3d4", "c9d0e1f2"], ["e5f6a7b8"]],
  "total_complexity": 5,
  "estimated_workers": 3
}
```

### 3. Conflict Detector

```json
{
  "verdict": "partial-parallel",
  "parallel_groups": [
    { "group": 1, "workstreams": ["a1b2c3d4", "c9d0e1f2"], "can_run_concurrently": true },
    { "group": 2, "workstreams": ["e5f6a7b8"], "depends_on_group": 1 }
  ],
  "conflicts_found": 0,
  "serialized_pairs": [["a1b2c3d4", "e5f6a7b8"]]
}
```

### 4. Parallel Orchestrator

```
[group 1] Spawning 2 workers: a1b2c3d4 (sonnet, worktree), c9d0e1f2 (haiku, worktree)
[group 1] a1b2c3d4: success (2 files, 35s)
[group 1] c9d0e1f2: success (1 file, 8s)
[group 2] Spawning 1 worker: e5f6a7b8 (haiku, worktree)
[group 2] e5f6a7b8: success (1 file, 15s)
All workers complete. Handing off to merge-coordinator.
```

### 5. Merge Coordinator

```
## Merge Summary

### Completed Tasks
- a1b2c3d4: Fixed auth validation to reject malformed tokens (2 files)
- c9d0e1f2: Updated README with auth fix documentation (1 file)
- e5f6a7b8: Added 4 regression tests for auth edge cases (1 file)

### Files Changed
- src/auth/validator.ts (a1b2c3d4)
- src/auth/handler.ts (a1b2c3d4)
- README.md (c9d0e1f2)
- tests/auth/validator.test.ts (e5f6a7b8)

### Validation Results
- Scope: all workers stayed within assigned files
- Conflicts: none detected
- Tests: 4 new tests passing

### Risks
- None identified
```

## Direct Runner Example

For shell-command workers:

```bash
bash ./bin/safe-summon \
  --task "auth-fix" \
  --timeout 180 \
  --mode auto \
  -- python3 -c "print('worker ran')"
```

## Token Efficiency

In this example:
- Auto-router: ~50 tokens (3-line classification)
- Task-decomposer: ~200 tokens (used Grep to find auth files, not full reads)
- Workers: ~1500 tokens each (scoped prompts with only relevant code)
- Merge summary: ~100 tokens
- Total overhead vs. unorchestrated: ~20% fewer tokens due to targeted reads and scoped workers
