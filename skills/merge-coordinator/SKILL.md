---
name: merge-coordinator
description: This skill should be used after parallel or serial worker execution completes, when the user asks to "merge worker results", "combine agent outputs", "validate parallel execution", "integrate workstream changes", or when multiple workers have produced outputs that need to be combined into the source tree.
version: 2.0.0
---

# Merge Coordinator

Collect, validate, and integrate worker outputs after orchestrated execution completes.

## Why This Exists

Workers produce isolated changes. Someone must verify each worker stayed within its assigned scope, detect any emergent conflicts, and apply changes in the correct order. This skill closes the loop between execution and delivery.

## Preconditions

- All workers have returned their output (status, summary, files_modified).
- The task DAG from `task-decomposer` is available for reference.
- The conflict analysis from `conflict-detector` is available (may be absent for single-workstream DAGs that skipped conflict detection).

## Merge Workflow

### 1. Collect

Gather all worker outputs. Two sources:

**Agent-tool workers** return structured JSON:
```json
{
  "task_id": "a1b2c3d4",
  "status": "success|partial|failed",
  "summary": "what was done in 1-2 sentences",
  "files_modified": ["path/to/file.ts"],
  "key_decisions": ["chose X over Y because Z"],
  "open_questions": []
}
```

**safe-summon workers** produce:
- patch files under `.safe-summon/`
- entries in `claude-execution-log.json`

**Serial/direct execution** (Class B or Class D without orchestrator):
- Workers may not produce structured JSON. Fall back to: inspect git diff, changed files, and any summary the agent provided in conversation.
- Construct the task_id from the DAG if available, or use a slug of the task description.

For each worker, extract: task_id, status, files touched, exit code.

### 2. Validate Scope

For each worker, verify:

- **Ownership compliance**: did the worker only modify files assigned to it in the DAG? Flag any file not in the worker's `likely_paths`.
- **No cross-contamination**: did two workers modify the same file? If yes, this is a merge conflict that must be resolved manually.
- **Completeness**: did the worker address its assigned goal? Check the summary against the DAG task description.
- **Safety**: check exit status, timeout state, and secret-scan result (for safe-summon workers).

If any validation fails, flag the specific worker and issue. Do not silently proceed.

### 3. Detect Emergent Conflicts

Even with pre-execution conflict analysis, workers can create new conflicts:

- Worker A adds a function; Worker B imports from the same module but expects the old interface.
- Worker A modifies a type; Worker B's tests use that type.
- Two workers both update a lockfile or generated artifact.

Scan for:
- overlapping file modifications across workers
- import/export mismatches in modified files
- test files that reference modules changed by a different worker

### 4. Determine Integration Order

Use the dependency graph from the DAG:

1. Apply changes from workers with no dependencies first.
2. Apply dependent workers in topological order.
3. If circular dependencies exist (should not happen if decomposition was correct), flag and halt.

For each integration step:
- Apply the worker's changes.
- Run a quick validation if possible (type check, lint, or test subset).
- Only proceed to the next worker if validation passes.

### 5. Generate Summary

Produce a compact, structured report:

```
## Merge Summary

### Completed Tasks
- [task_id]: [summary] ([N files changed])
- ...

### Files Changed
- path/to/file.ts (by task_id)
- ...

### Key Decisions
- [decision from worker]
- ...

### Validation Results
- Build: [pass|fail|skipped]
- Lint: [pass|fail|skipped]
- Tests: [pass|fail|skipped]

### Risks
- [any flagged issues]

### Open Questions
- [anything workers flagged for human review]
```

## Output Rules

- Never dump full file contents. Use diffs or summaries.
- Keep the merge summary under 50 lines unless the task was genuinely large.
- If all workers succeeded and no conflicts emerged, say so in 3 lines.
- If any worker failed, provide the specific failure with enough context to debug.

## Fallback Behavior

- If a worker failed: exclude its changes, note the failure, suggest manual completion.
- If merge conflicts exist: present both sides, recommend resolution, do not auto-resolve.
- If validation fails after integration: roll back the last applied worker, report which change broke things.

## Guardrails

- Never auto-apply changes without showing the summary first.
- Always check that the total set of modified files matches what was planned.
- If more than 20% of files were unplanned modifications, halt and ask for human review.
- Preserve all patch artifacts and logs for audit.
