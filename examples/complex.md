# Complex Example

This example shows the intended flow for a multi-outcome implementation request.

## Prompt

```text
$ claude
> Fix the auth validation bug, add regression tests, and update the README.
```

## Before

- One large request lands in a shared workspace.
- Planning, editing, and verification can blur together.
- The risk of overlapping edits and stale context goes up.

## After Enabling Claude Superpack

- `task-decomposer` should split the request into concrete workstreams.
- `conflict-detector` should identify whether those workstreams overlap.
- `parallel-orchestrator` should only recommend isolated execution when the workstreams are low-conflict.
- `safe-summon` should run any worker commands inside isolated workspaces and emit patch/log artifacts for review.

## Direct Runner Example

```bash
bash ./bin/safe-summon \
  --task "auth-fix" \
  --timeout 180 \
  --mode auto \
  -- python3 -c "print('worker ran')"
```

## Expected Outcome

- the shared source tree is not edited directly by the worker,
- the run is bounded by a timeout,
- patch output is written under `.safe-summon/`,
- execution metadata is appended to `claude-execution-log.json`,
- human review still happens before integration.
