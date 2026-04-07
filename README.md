# Claude Superpack

Safer planner-worker execution for Claude Code.

Claude Superpack is a native Claude Code plugin that helps Claude break down complex implementation requests, detect write-surface conflicts, and run isolated worker commands with bounded execution and structured artifacts.

## Demo

Simple task:

```text
$ claude
> Explain how the authentication middleware works.
```

Expected behavior:

- Claude answers normally.
- No orchestration is needed.
- The plugin stays out of the way.

Complex task:

```text
$ claude
> Fix the auth validation bug, add regression tests, and update the README.
```

Expected behavior:

- `task-decomposer` splits the request into workstreams.
- `conflict-detector` checks whether those workstreams are safe to separate.
- `parallel-orchestrator` recommends isolated worker execution only when the write surfaces are low-conflict.
- `safe-summon` runs worker commands in isolated workspaces and records patch and log artifacts.

Direct runner example:

```bash
bash ./bin/safe-summon \
  --task "auth-fix" \
  --timeout 180 \
  --mode auto \
  -- python3 -c "print('worker ran')"
```

## Problem

Large code-change requests are hard to handle reliably in a shared workspace.

- One broad request can turn into several unrelated edits.
- Shared files and generated artifacts create merge and review risk.
- Dirty repositories make it easy to run workers against stale code.
- Long-running commands can hang without a hard execution boundary.

## Solution

Claude Superpack packages a planner-worker workflow as a native Claude Code plugin:

- `task-decomposer` turns one large request into scoped workstreams.
- `conflict-detector` checks whether those workstreams can be executed safely.
- `parallel-orchestrator` coordinates isolated worker runs only when the split is low-risk.
- `safe-summon` provides the execution engine with git-worktree or filesystem-copy isolation, timeout enforcement, diff capture, secret scanning, and JSON logging.

## Features

- Native Claude Code plugin layout with manifest-driven packaging.
- Planner-worker skill chain for complex implementation requests.
- Conflict analysis before isolated worker execution.
- Clean-repo `git worktree` isolation when a checked-in `HEAD` is available.
- Dirty-repo and non-git fallback to filtered filesystem copy mode.
- Fail-closed timeout enforcement for worker commands.
- Unique patch artifacts for concurrent runs.
- Structured JSON execution logs protected by file locking.
- Secret-pattern scan over generated patch output.

## Architecture

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
   |-- clean git repo --> detached worktree
   \-- dirty/non-git --> filtered filesystem copy
   |
   v
worker command
   |
   +--> patch artifact
   +--> execution log
   \--> human review before merge
```

More detail: [docs/architecture.md](./docs/architecture.md)

## Installation

### Local source install

```bash
mkdir -p ~/.claude/plugins
git clone https://github.com/sahilbnsll/claude-superpack ~/.claude/plugins/claude-superpack
```

### Marketplace install

If this plugin is published through a Claude Code marketplace catalog, installation may look like:

```bash
/plugin marketplace add sahilbnsll/your-marketplace-repo
/plugin install claude-superpack@your-marketplace-repo
```

Replace `your-marketplace-repo` with the catalog repository that indexes this plugin. This repository is the plugin payload, not the marketplace index itself.

### Runtime requirements

- `bash`
- `python3`
- `timeout` or `gtimeout`
- `git` for worktree mode

Native manifest location:

```text
.claude-plugin/plugin.json
```

## Usage

Simple requests should remain simple:

```text
$ claude
> Explain the request lifecycle for this service.
```

Expected result:

- Claude answers directly.
- No isolated worker execution is necessary.

Complex requests should trigger planning first:

```text
$ claude
> Break this refactor into low-conflict workstreams and use isolated workspaces for the risky changes.
```

Expected result:

- Claude decomposes the task.
- Claude checks overlap between workstreams.
- Claude only recommends isolated worker execution when the split is safe.

More examples: [docs/usage.md](./docs/usage.md)

## Safety Guarantees

- Worker execution is time-bounded. If no timeout backend exists, the runner fails closed instead of running indefinitely.
- `auto` mode never uses a stale clean worktree when the repository has local changes. It falls back to filesystem copy mode instead.
- Explicit `--mode git` fails on a dirty repository rather than silently running against `HEAD`.
- Every run gets a unique patch artifact path to avoid collisions under concurrency.
- Generated patch output is scanned for common secret patterns before a success result is finalized.
- Human review remains part of the operating model. The plugin does not auto-merge or auto-apply diffs.

## How It Works

1. Claude receives a complex request.
2. `task-decomposer` produces a small set of concrete workstreams.
3. `conflict-detector` checks those workstreams for shared files, generated outputs, schemas, tests, or other collision points.
4. `parallel-orchestrator` decides whether isolated worker execution is justified.
5. `safe-summon` creates an isolated workspace, runs the worker command with a timeout, captures a patch, scans it, and appends a JSON log entry.

This plugin does not ship a full scheduler or queue. It provides skills plus a safe runner that Claude can use to coordinate implementation work more carefully.

## Repository Layout

```text
claude-superpack/
├── .claude-plugin/
│   └── plugin.json
├── LICENSE
├── README.md
├── docs/
│   ├── architecture.md
│   └── usage.md
├── examples/
│   ├── complex.md
│   └── simple.md
├── bin/
│   └── safe-summon
└── skills/
    ├── conflict-detector/
    │   └── SKILL.md
    ├── parallel-orchestrator/
    │   └── SKILL.md
    └── task-decomposer/
        └── SKILL.md
```

## Limitations

- This plugin coordinates safe execution patterns; it is not a full orchestration service.
- Parallel execution is only appropriate when workstreams are genuinely low-conflict.
- Worktree mode requires a clean git repository with a committed `HEAD`.
- The runner depends on `timeout` or `gtimeout` instead of shipping an internal portable timeout backend.
- The plugin emits patch artifacts and logs, but it does not apply patches automatically.

## Roadmap

- Optional portable timeout backend for environments without `timeout` or `gtimeout`.
- Richer run summaries for patch and log artifacts.
- Smarter write-surface heuristics for decomposition and conflict checks.
- Additional examples and publishing guidance for marketplace catalog setup.

## Contributing

Issues and pull requests are welcome.

When contributing:

- keep the native Claude plugin layout intact,
- keep claims aligned with the actual implementation,
- update docs and examples when behavior changes,
- validate the manifest and runner before submitting changes.

Useful checks:

```bash
python3 -m json.tool .claude-plugin/plugin.json
bash -n bin/safe-summon
```
