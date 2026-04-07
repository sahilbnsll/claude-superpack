# Usage

Claude Superpack is most useful when a request contains multiple outcomes, shared risk, or a reason to isolate execution.

## Simple Tasks

Example:

```text
$ claude
> Explain how the authentication middleware works.
```

Expected behavior:

- Claude responds normally.
- No decomposition is necessary.
- No isolated worker execution is triggered.

Another example:

```text
$ claude
> Summarize the routing layer in this service.
```

Expected behavior:

- direct explanation,
- no workstream planning,
- no runner usage.

## Complex Tasks

Example:

```text
$ claude
> Fix the auth validation bug, add regression tests, and update the README.
```

Expected behavior:

- `task-decomposer` turns the request into implementation, test, and documentation workstreams,
- `conflict-detector` checks whether those workstreams overlap,
- `parallel-orchestrator` recommends isolated execution only if the write surfaces are low-conflict,
- `safe-summon` runs the selected worker commands in isolated workspaces.

Another example:

```text
$ claude
> Break this refactor into safe workstreams and avoid merge conflicts across shared files.
```

Expected behavior:

- planning first,
- conflict analysis second,
- execution only after the split is considered safe.

## Direct Runner Usage

The runner can be invoked directly from the repository:

```bash
bash ./bin/safe-summon \
  --task "docs-update" \
  --timeout 180 \
  --mode auto \
  -- python3 -c "print('worker ran')"
```

Supported modes:

- `auto`: use git worktree only when the repository is clean; otherwise use filesystem copy
- `git`: require a clean committed git repository
- `copy`: always use filtered filesystem copy

## Expected Artifacts

Each successful run can produce:

- a patch file under `.safe-summon/`
- a structured entry in `claude-execution-log.json`

If secret-like material is detected in the patch output, the run is marked as failed.

## Operational Notes

- Install `timeout` or `gtimeout` before using the runner.
- Prefer `auto` mode unless there is a specific reason to force `git` or `copy`.
- Review patches before integrating results.
