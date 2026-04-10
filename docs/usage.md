# Usage

Claude Superpack v2 automatically classifies every request and routes it to the appropriate workflow. You do not need to invoke skills manually -- the auto-router handles this.

## Class A -- Direct Response

```text
$ claude
> Explain how the authentication middleware works.
```

- Auto-router classifies as **Class A**.
- Claude answers directly.
- No decomposition, no workers, no overhead.

```text
$ claude
> What does the useAuth hook return?
```

- Same: direct answer.
- Superpack stays completely out of the way.

## Class B -- Single-Agent Execution

```text
$ claude
> Fix the null check in the login handler.
```

- Auto-router classifies as **Class B**.
- Task-decomposer creates a simple plan (1 workstream).
- Execution is sequential -- no parallel workers.
- Changes are scoped and reviewed.

```text
$ claude
> Add a loading spinner to the dashboard page.
```

- Single concern, single module.
- Handled directly with efficient context gathering (Glob -> Grep -> Read).

## Class C -- Multi-Agent Orchestration

```text
$ claude
> Fix the auth validation bug, add regression tests, and update the README.
```

- Auto-router classifies as **Class C** (three distinct deliverables).
- Task-decomposer produces a 3-workstream DAG:
  - `fix-auth-validation` (implementation, sonnet)
  - `add-regression-tests` (tests, haiku, depends on fix)
  - `update-readme` (docs, haiku, parallel-ready)
- Conflict-detector finds: readme is independent, tests depend on fix.
- Execution plan: group 1 = [fix, readme] in parallel; group 2 = [tests] after fix.
- Workers spawn in isolated worktrees.
- Merge-coordinator collects, validates, and summarizes.

```text
$ claude
> Refactor the API layer to use the new service pattern, update all consumers, and add integration tests.
```

- Class C: multiple concerns with separable write surfaces.
- Full pipeline: decompose -> detect conflicts -> orchestrate -> merge.

## Class D -- Serial Complex Execution

```text
$ claude
> Migrate the authentication system from session-based to JWT across all services.
```

- Auto-router classifies as **Class D** (cross-cutting, high coupling).
- Task-decomposer creates ordered workstreams (each depends on the previous).
- Conflict-detector recommends full serialization.
- Execution: one workstream at a time, validation between each.
- Merge-coordinator provides running summary.

## Direct Runner Usage

The `safe-summon` runner can be invoked directly for shell commands:

```bash
bash ./bin/safe-summon \
  --task "run-tests" \
  --timeout 180 \
  --mode auto \
  -- npm test
```

Supported modes:
- `auto`: git worktree when clean, filesystem copy otherwise
- `git`: require a clean committed git repository
- `copy`: always use filtered filesystem copy

## Expected Artifacts

### From Agent-tool workers:
- Structured JSON output (task_id, status, summary, files_modified)
- Changes in isolated worktree branches

### From safe-summon workers:
- Patch file under `.safe-summon/`
- Entry in `claude-execution-log.json`

### From merge-coordinator:
- Compact merge summary with files changed, decisions made, and validation results

## Token Efficiency in Practice

Superpack v2 aggressively minimizes token usage:

- **Before reading**: Glob -> Grep -> Read(offset, limit). Never read full files over 100 lines.
- **Worker prompts**: under 2000 tokens. Only task, paths, and minimal context.
- **Model selection**: haiku for mechanical work, sonnet for implementation, opus only for architecture.
- **Compaction**: `/compact` after each phase to keep context lean.
- **Output**: structured JSON and diffs, never full file dumps.

## Operational Notes

- Install `timeout` or `gtimeout` before using `safe-summon`.
- Prefer `auto` mode unless there is a specific reason to force `git` or `copy`.
- Review the merge-coordinator summary before integrating results.
- Worker count is capped at 4 agents / 6 shell workers for stability.
- The auto-router defaults to the simplest workflow that can handle the request.
