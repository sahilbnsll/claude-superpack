---
name: parallel-orchestrator
description: This skill should be used when the user asks to "run this safely in parallel", "orchestrate multiple workers", "use isolated worktrees", "coordinate low-conflict subagents", or when a decomposed task with a conflict-checked execution plan is ready for worker execution.
version: 4.0.0
---

# Parallel Orchestrator

Coordinate isolated worker execution using the execution plan from `conflict-detector`. Spawn workers via Claude's native Agent tool or the `safe-summon` runner. Merge results through `merge-coordinator`.

## Preconditions

Proceed only when all of these are true:

- `task-decomposer` has produced a DAG with workstream IDs, paths, and dependencies.
- `conflict-detector` has produced an execution plan with parallel groups and conflict analysis.
- Every worker has a narrow ownership boundary.
- A serial fallback path is still available if a worker fails.

## Execution Strategy Selection

### When to Use Agent Tool (Subagents)

Use Claude subagents when the worker needs:
- code reasoning (implement a feature, write tests, refactor logic)
- multi-step file operations (read, analyze, edit, validate)
- judgment calls (choosing between approaches)

### When to Use safe-summon (Shell Runner)

Use `safe-summon` when the worker needs:
- a deterministic shell command (run tests, build, lint, format)
- isolation without Claude reasoning
- strict timeout enforcement for untrusted commands

### Decision Matrix

| Workstream Type | Execution Method | Isolation |
|----------------|-----------------|-----------|
| Implementation (write code) | Agent tool | worktree |
| Test writing | Agent tool | worktree |
| Run existing tests | safe-summon | auto |
| Docs update | Agent tool | worktree or none |
| Build/lint/format | safe-summon | auto |
| Migration | Agent tool | worktree |

## Subagent Execution via Agent Tool

For each worker that needs Claude reasoning:

1. **Construct a minimal prompt** containing only:
   - The workstream goal (from DAG)
   - The assigned file paths
   - Relevant code context (snippets, not full files)
   - Constraints (stay within assigned files, return structured output)
   - Reference to `docs/token-efficiency.md` rules

2. **Set isolation**: use `isolation: "worktree"` for any worker that modifies files. This gives each worker its own copy of the repo.

3. **Set model tier**: use the model assigned by `task-decomposer` (haiku/sonnet/opus).

4. **Run in background**: set `run_in_background: true` for workers in the same parallel group. This enables true concurrent execution.

5. **Required worker output format**:

```json
{
  "task_id": "a1b2c3d4",
  "status": "success",
  "summary": "Fixed auth validation to reject malformed tokens",
  "files_modified": ["src/auth/validator.ts"],
  "key_decisions": ["Used strict JWT parsing instead of regex"],
  "open_questions": []
}
```

### Worker Prompt Template

```
You are executing workstream [task_id]: [description]

Goal: [goal from DAG]

Files you own (ONLY modify these):
- [path1]
- [path2]

Context:
[minimal code snippets, function signatures, or grep results -- NOT full files]

Rules:
- Stay within your assigned files. Do not modify anything else.
- Use Glob -> Grep -> Read(offset,limit) for any file discovery.
- Return your result as structured JSON with: task_id, status, summary, files_modified, key_decisions, open_questions.
- Keep your summary under 3 sentences.
```

### Worker Count Limits

- Maximum 4 concurrent Agent-tool workers. Each consumes significant context.
- Maximum 6 concurrent safe-summon workers (shell commands are lightweight).
- If more workstreams exist than the cap, batch them: run one batch, collect results, run the next.

## safe-summon Execution

For deterministic shell commands, use the runner:

```bash
bash ${CLAUDE_PLUGIN_ROOT}/bin/safe-summon \
  --task "workstream-slug" \
  --timeout 180 \
  --mode auto \
  -- your-worker-command
```

- Prefer `--mode auto` so git worktrees are used when available.
- Set `--timeout` based on complexity: score 1-2 = 120s, score 3 = 180s, score 4-5 = 300s.
- Use `--keep-workspace` only for debugging failed workers.

## Adaptive Execution

### Execution Modes

**Safe mode** (default for Class D, or when conflicts > 0):
- Execute one parallel group at a time.
- Validate after each group (lint, type check, or test subset).
- If validation fails, halt and report before proceeding.

**Fast mode** (for Class C with zero conflicts):
- Execute all parallel groups that have no inter-group dependencies concurrently.
- Validate only after all workers complete.
- Use when all workstreams are truly independent and complexity scores are low.

### Dynamic Adjustments

Before spawning workers, estimate:
- **Token cost**: number of files * average file size. If total > 5000 lines, consider splitting into phases.
- **Risk**: high-complexity workstreams (score 4-5) always run in safe mode regardless of overall setting.
- **Worker count**: prefer fewer workers with broader scope over many narrow workers. Two workers with clear boundaries beat four workers with fuzzy ones.

## Orchestration Workflow

1. Read the execution plan from `conflict-detector`.
2. Choose execution mode (safe or fast) based on conflict count and complexity scores.
3. For each parallel group (in dependency order):
   a. Spawn workers for all workstreams in the group.
   b. Use Agent tool for reasoning tasks, safe-summon for shell commands.
   c. Wait for all workers in the group to complete.
   d. Collect outputs (structured JSON from agents, patches/logs from safe-summon).
   e. In safe mode: validate before proceeding to next group.
4. Hand all worker outputs to `merge-coordinator`.

## Observability

Track and report minimally:

```
[group 1] Spawning 2 workers: a1b2c3d4 (sonnet, worktree), c9d0e1f2 (haiku, worktree)
[group 1] a1b2c3d4: success (3 files, 45s)
[group 1] c9d0e1f2: success (1 file, 12s)
[group 2] Spawning 1 worker: e5f6a7b8 (sonnet, worktree)
[group 2] e5f6a7b8: success (2 files, 30s)
All workers complete. Handing off to merge-coordinator.
```

Keep status updates to one line per event. No verbose logs.

## Guardrails

- Do not parallelize unresolved conflicts.
- Do not hand two workers the same file ownership.
- Stop parallel execution when repeated failures suggest the split was wrong (2 failures = halt).
- Keep human review in the loop before merging risky diffs.
- Preserve cleanup even on interruption by relying on the runner's trap logic.
- If a worker times out, do not retry automatically. Report the failure and suggest manual completion.

## Review Checklist

Before handing off to `merge-coordinator`, verify for each worker:

- exit status is success,
- no timeout occurred,
- changed files match the assigned ownership,
- secret-scan passed (for safe-summon workers),
- worker output includes all required JSON fields.

If any check fails, flag the specific worker in the handoff to `merge-coordinator`.

## Self-Reflection (Post-Execution)

After all workers complete, spend 2 lines reflecting:
- Did any worker read more files than necessary?
- Could any serial group have been parallelized (or vice versa)?

Use this to improve future decomposition, but do not act on it for the current run.
