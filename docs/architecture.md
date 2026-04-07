# Architecture

Claude Superpack is organized around a planner-worker model implemented through three native Claude Code skills and one execution runner.

## Planner -> Worker Model

Planner layer:

- `task-decomposer` splits a broad request into explicit workstreams.
- `conflict-detector` decides whether those workstreams have overlapping write surfaces.
- `parallel-orchestrator` only recommends isolated worker execution when the split is safe.

Worker layer:

- `safe-summon` creates an isolated workspace.
- A worker command runs inside that workspace with a hard timeout.
- The runner emits a patch artifact and appends a JSON log entry.

This keeps planning separate from execution. Claude reasons about scope first, then uses the runner only when there is a clear boundary for the work.

## Dual-Mode Execution

The execution engine supports two isolation modes.

### Git worktree mode

Used when:

- the source is inside a git repository,
- a checked-in `HEAD` exists,
- the repository is clean.

Behavior:

- creates a detached worktree,
- runs the worker inside that isolated tree,
- captures a git binary diff against `HEAD`,
- removes the worktree after completion unless asked to keep it.

### Filesystem copy mode

Used when:

- the repository is dirty,
- there is no usable git `HEAD`,
- the source is not in git,
- or the caller explicitly selects copy mode.

Behavior:

- copies the source into a temporary workspace,
- excludes common heavy directories and runner artifacts,
- runs the worker in the copied tree,
- captures a diff between source and isolated workspace.

## Safety Layers

Claude Superpack aims to reduce operational risk rather than maximize raw automation.

- Timeout enforcement: worker commands must run through `timeout` or `gtimeout`; otherwise the runner fails closed.
- Dirty-repo protection: `auto` mode falls back to filesystem copy instead of running against stale `HEAD`.
- Explicit git-mode protection: `--mode git` fails on local changes instead of silently ignoring them.
- Workspace isolation: workers do not run in the shared source tree.
- Unique patch artifacts: concurrent runs do not overwrite each other's patch files.
- Secret scanning: generated patch output is checked for common credential patterns.
- Locked log writes: JSON log appends use file locking to avoid corruption under concurrency.
- Human review: patches and logs are generated for review; the runner does not auto-merge.

## Execution Flow

```text
User request
   |
   v
task-decomposer
   |
   v
conflict-detector
   |
   v
parallel-orchestrator
   |
   v
safe-summon
   |-- clean repo ----------> detached git worktree
   \-- dirty or non-git ----> filtered filesystem copy
                                |
                                v
                        worker command executes
                                |
                                +--> patch artifact
                                +--> JSON log entry
                                \--> human review / integration
```

## Notes on Scope

- The plugin provides planning skills plus a safe execution runner.
- It does not ship a queue, remote worker fleet, or automatic merge system.
- The quality of the outcome still depends on sensible workstream boundaries and human review.
