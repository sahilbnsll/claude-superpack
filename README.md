# Claude Superpack

Token-efficient multi-agent orchestration for Claude Code.

Claude Superpack v2 is a native Claude Code plugin that automatically classifies request complexity, decomposes tasks into structured DAGs, detects write-surface conflicts, spawns isolated worker agents, and merges results through a coordinated pipeline -- all while minimizing token usage.

## Demo

Simple task (Class A -- direct response):

```text
$ claude
> Explain how the authentication middleware works.
```

- Auto-router classifies as Class A.
- Claude answers normally.
- No orchestration overhead.

Complex task (Class C -- parallel orchestration):

```text
$ claude
> Fix the auth validation bug, add regression tests, and update the README.
```

- Auto-router classifies as Class C (three distinct deliverables).
- Task-decomposer produces a DAG with workstream IDs, dependencies, and complexity scores.
- Conflict-detector forms parallel groups: [fix + readme] concurrent, [tests] after fix.
- Orchestrator spawns isolated workers (Agent tool in worktrees).
- Merge-coordinator validates scope, checks for conflicts, produces structured summary.

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
- Reading entire files wastes context when only a few lines matter.
- Spawning agents for trivial tasks adds overhead without benefit.
- Long-running commands can hang without a hard execution boundary.

## Solution

Claude Superpack v2 packages an intelligent orchestration workflow as a native Claude Code plugin:

- **auto-router** classifies every request (A: direct, B: single-agent, C: parallel, D: serial complex).
- **task-decomposer** produces structured DAGs with deterministic IDs, complexity scores, and model tier assignments.
- **conflict-detector** maps write surfaces, detects overlaps, and forms parallel execution groups.
- **parallel-orchestrator** spawns isolated workers via the Agent tool or `safe-summon`, with adaptive execution modes.
- **merge-coordinator** validates scope, detects emergent conflicts, and produces compact structured summaries.
- **safe-summon** provides the execution engine with git-worktree or filesystem-copy isolation, timeout enforcement, diff capture, secret scanning, and JSON logging.

## Features

- Automatic request classification (A/B/C/D) with explicit routing.
- Token-efficient context management: Glob -> Grep -> Read(offset, limit).
- DAG-based task decomposition with deterministic workstream IDs.
- Pairwise conflict detection with parallel group formation.
- Dual execution model: Agent-tool subagents for reasoning, safe-summon for shell commands.
- Adaptive execution modes: safe (validate between steps) and fast (maximum parallelism).
- Model tier optimization: haiku for exploration, sonnet for implementation, opus for architecture.
- Structured merge coordination with scope validation and conflict detection.
- Worker count caps (4 agents, 6 shell workers) for stability.
- All v1 safety guarantees preserved: timeout enforcement, workspace isolation, secret scanning, human review.

## Architecture

```text
User request
   |
   v
auto-router (classify A/B/C/D)
   |
   +-- A --> direct answer
   +-- B --> task-decomposer --> sequential execution
   +-- C --> task-decomposer --> conflict-detector --> parallel-orchestrator
   |              |                                          |
   |              |                                   [worker agents]
   |              |                                          |
   |              |                                   merge-coordinator
   +-- D --> task-decomposer --> conflict-detector --> serial execution
                                                            |
                                                      merge-coordinator
```

More detail: [docs/architecture.md](./docs/architecture.md)

## Installation

### Local source install

```bash
mkdir -p ~/.claude/plugins
git clone https://github.com/sahilbnsll/claude-superpack ~/.claude/plugins/claude-superpack
```

### Marketplace install

If this plugin is published through a Claude Code marketplace catalog:

```bash
/plugin marketplace add sahilbnsll/your-marketplace-repo
/plugin install claude-superpack@your-marketplace-repo
```

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

Simple requests remain simple:

```text
$ claude
> Explain the request lifecycle for this service.
```

- Auto-router: Class A. Claude answers directly.

Complex requests trigger intelligent orchestration:

```text
$ claude
> Refactor the API layer, update all consumers, and add integration tests.
```

- Auto-router: Class C. Full pipeline activates.

More examples: [docs/usage.md](./docs/usage.md)

## Token Efficiency

Superpack v2 treats context as the most expensive resource:

- **Discovery**: Glob -> Grep -> Read(offset, limit). Never read full files over 100 lines.
- **Worker prompts**: under 2000 tokens. Only task, paths, and minimal context.
- **Model selection**: lightest model that can handle each workstream.
- **Compaction**: proactive `/compact` after each phase.
- **Output**: structured JSON, diffs, and summaries -- never full file dumps.

Full protocol: [docs/token-efficiency.md](./docs/token-efficiency.md)

## Safety Guarantees

- Worker execution is time-bounded. Missing timeout backend = fail closed.
- `auto` mode falls back to filesystem copy when the repository has local changes.
- Explicit `--mode git` fails on a dirty repository.
- Every run gets a unique patch artifact path.
- Patch output is scanned for common secret patterns.
- Human review remains part of the operating model.
- **New in v2**: Workers are validated against their assigned file ownership.
- **New in v2**: Adaptive safe/fast execution modes based on conflict analysis.
- **New in v2**: Worker count caps prevent runaway agent spawning.

## How It Works

1. Claude receives a request.
2. `auto-router` classifies it (A/B/C/D) and routes accordingly.
3. For complex requests: `task-decomposer` produces a DAG with IDs, complexity scores, and model tiers.
4. `conflict-detector` analyzes write surfaces and forms parallel execution groups.
5. `parallel-orchestrator` spawns workers (Agent tool or safe-summon) with appropriate isolation.
6. `merge-coordinator` collects outputs, validates scope, and produces a structured summary.

## Repository Layout

```text
claude-superpack/
├── .claude-plugin/
│   └── plugin.json
├── LICENSE
├── README.md
├── docs/
│   ├── architecture.md
│   ├── token-efficiency.md
│   └── usage.md
├── examples/
│   ├── simple.md
│   ├── complex.md
│   ├── parallel-agents.md
│   └── serial-complex.md
├── bin/
│   └── safe-summon
└── skills/
    ├── auto-router/
    │   └── SKILL.md
    ├── task-decomposer/
    │   └── SKILL.md
    ├── conflict-detector/
    │   └── SKILL.md
    ├── parallel-orchestrator/
    │   └── SKILL.md
    └── merge-coordinator/
        └── SKILL.md
```

## Limitations

- Orchestration is only appropriate when workstreams are genuinely separable.
- Worktree mode requires a clean git repository with a committed `HEAD`.
- The runner depends on `timeout` or `gtimeout`.
- Token efficiency is a design principle; complex tasks still require context.
- Worker count caps mean very large tasks must be batched into phases.
- The plugin emits artifacts and summaries but does not auto-apply changes.

## Roadmap

- Hook-based automation (UserPromptSubmit for auto-routing, SubagentStop for result persistence).
- Persistent cross-session memory for repo understanding (semantic layer).
- Skill reuse detection (check installed skills before implementing).
- Portable timeout backend for environments without `timeout` or `gtimeout`.
- Richer observability dashboards for multi-agent execution.

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
