# Architecture

Claude Superpack v4 is a token-efficient multi-agent orchestration system built as a native Claude Code plugin. It classifies requests, resolves ambiguity, decomposes complex tasks into DAGs, detects conflicts, spawns isolated workers, scans for security issues, and merges results.

## System Overview

```text
User request
   |
   v
auto-router (classify A/B/C/D)
   |
   +-- clarifier (resolve ambiguity if detected)
   |
   +-- A (Direct) ---------> answer immediately, no skills
   |
   +-- B (Single-agent) ---> task-decomposer --> sequential execution
   |
   +-- C (Parallel) -------> task-decomposer --> conflict-detector
   |                              |
   |                              v
   |                         parallel-orchestrator
   |                              |
   |                    +---------+---------+
   |                    |         |         |
   |                 worker    worker    worker
   |                 (Agent)   (Agent)  (safe-summon)
   |                    |         |         |
   |                    +---------+---------+
   |                              |
   |                              v
   |                        merge-coordinator
   |                              |
   |                              v
   |                   security-scanner + post-review
   |
   +-- D (Serial complex) -> task-decomposer --> conflict-detector
                                  |
                                  v
                             parallel-orchestrator (safe mode, serial execution)
                                  |
                                  v
                             merge-coordinator
                                  |
                                  v
                        security-scanner + post-review
```

## Skill Pipeline

The core orchestration pipeline consists of 6 skills:

| Skill | Role | When Used |
|-------|------|-----------|
| `auto-router` | Classify request complexity | Every actionable request |
| `clarifier` | Resolve ambiguity before starting | When request has multiple valid interpretations |
| `task-decomposer` | Break request into DAG of workstreams | Class B, C, D |
| `conflict-detector` | Analyze write-surface overlaps, form parallel groups | Class C, D |
| `parallel-orchestrator` | Spawn and manage workers | Class C, D |
| `merge-coordinator` | Validate and integrate worker outputs | After workers complete |
| `safe-summon` (runner) | Isolated shell execution with timeout | Deterministic commands |

## Supporting Skills (27)

Beyond the core pipeline, skills are organized into functional categories:

### Memory (4 skills)
Persistent context across sessions using markdown files:
- `memory-manager`: session lifecycle (load, record, prune)
- `project-memory`: per-project state and architecture
- `memory-search`: query past context by keyword, tag, or time
- `memory-consolidator`: distill patterns from recent to long-term

### Knowledge Graph (5 skills)
Zero-dependency structural mapping:
- `graph-builder`: build structural map using Glob/Grep/Read
- `graph-reviewer`: blast-radius-aware code review
- `graph-navigator`: answer architecture and dependency questions
- `graph-updater`: incremental hash-based updates
- `codebase-onboarder`: generate architecture summaries for new contributors

### Security (1 skill)
- `security-scanner`: scan for secrets, injection risks, OWASP top 10 patterns

### Token Efficiency (3 skills)
- `context-budget`: running token usage estimates with compaction protocol
- `smart-discovery`: intelligent, ranked file selection
- `skill-reuse-detector`: check installed skills before reimplementing

### Quality & Testing (3 skills)
- `test-mapper`: map source files to their tests, run only what's relevant
- `test-generator`: auto-generate test stubs from function signatures
- `dep-analyzer`: track outdated/vulnerable dependencies

### Workflow (3 skills)
- `pre-flight`: validate environment before workers
- `post-review`: auto-review after merge
- `rollback`: selective undo by workstream

### Documentation (2 skills)
- `doc-generator`: generate/update docs from code changes
- `changelog-writer`: structured changelogs from git history

### Migration & Maintenance (2 skills)
- `migration-planner`: plan framework/library upgrades with breaking change analysis
- `dead-code-finder`: identify unused exports, orphan files, stale imports

### Communication (1 skill)
- `session-recap`: structured end-of-session summary for handoff

### Learning (3 skills)
- `pattern-tracker`: track classification decisions and outcomes
- `user-profiler`: learn and apply user preferences
- `error-catalog`: persistent error+fix database

## Classification System

The `auto-router` classifies every request into one of four classes:

- **Class A (Direct)**: questions, explanations -- answer immediately
- **Class B (Single-agent)**: scoped changes to one concern -- plan and execute sequentially
- **Class C (Parallel)**: multiple independent concerns -- full orchestration pipeline
- **Class D (Serial complex)**: cross-cutting changes that cannot be parallelized -- plan, execute serially, validate between steps

The default is always the lowest class that can handle the request. Over-orchestration wastes more tokens than under-orchestration.

## Dual Execution Model

### Agent Tool Workers

Used for tasks requiring Claude's reasoning:
- Implementation, test writing, refactoring, migration
- Each worker runs in an isolated git worktree
- Returns structured JSON (task_id, status, summary, files_modified, key_decisions)
- Model tier assigned by task-decomposer (haiku/sonnet/opus)

### safe-summon Shell Workers

Used for deterministic commands:
- Running tests, builds, lints, formatters
- Creates isolated workspace (git worktree or filesystem copy)
- Enforces hard timeout
- Produces patch artifact and JSON log entry

## Token Efficiency Layer

Applied across all execution phases:

1. **File discovery**: Glob -> Grep -> Read(offset, limit). Never read full files unless under 100 lines.
2. **Summarize and discard**: extract what you need, compress, drop raw data.
3. **Minimal worker prompts**: under 2000 tokens per subagent. Include only task, paths, context snippets.
4. **Model tiering**: haiku for exploration, sonnet for implementation, opus for architecture.
5. **Proactive compaction**: trigger `/compact` after each phase.

See [docs/token-efficiency.md](./token-efficiency.md) for the complete protocol.

## DAG-Based Decomposition

The task-decomposer produces a structured DAG:

```json
{
  "workstreams": [
    {
      "id": "a1b2c3d4",
      "description": "...",
      "goal": "...",
      "likely_paths": ["..."],
      "dependencies": [],
      "complexity": 2,
      "model": "sonnet",
      "parallel_status": "parallel-ready"
    }
  ],
  "execution_order": [["a1b2c3d4", "c9d0e1f2"], ["e5f6a7b8"]],
  "total_complexity": 7,
  "estimated_workers": 3
}
```

Each workstream gets a deterministic ID (first 8 chars of SHA-256 hash). Dependencies form edges in the DAG. Execution order groups workstreams into parallel batches.

## Conflict Detection and Parallel Groups

The conflict-detector:
1. Maps explicit and implicit write surfaces for each workstream
2. Performs pairwise conflict analysis (none/low/medium/hard-blocker)
3. Forms parallel groups: workstreams with no conflicts run concurrently
4. Outputs an execution plan with groups, dependency order, and verdicts

Verdicts: `fully-parallel`, `partial-parallel`, `fully-serial`, `needs-redesign`.

## Merge Coordination

After workers complete, the merge-coordinator:
1. Collects all worker outputs (JSON from agents, patches from safe-summon)
2. Validates each worker stayed within its assigned scope
3. Detects emergent conflicts (import mismatches, type changes)
4. Applies changes in dependency order with validation between steps
5. Produces a compact summary for human review

## Safety Layers

All prior safety guarantees are preserved and extended:

- Timeout enforcement (fail-closed)
- Dirty-repo protection (auto-fallback to copy mode)
- Workspace isolation (worktrees for agents, temp dirs for safe-summon)
- Unique patch artifacts (timestamp + slug + UUID)
- Secret scanning on patch output
- Locked JSON log writes
- Human review before merge
- Scope validation (workers must stay within assigned files)
- Security scanning before commit (secrets, injection, OWASP patterns)
- Adaptive execution modes (safe vs fast)
- Worker count caps (4 agents, 6 shell workers max)

## Adaptive Execution

The orchestrator dynamically selects:

- **Safe mode**: sequential groups with validation between each. Default for Class D or any conflicts.
- **Fast mode**: maximum parallelism with post-hoc validation. For Class C with zero conflicts.

Model tier, worker count, and timeout values are all adjusted based on workstream complexity scores.

## Observability

Minimal structured progress reporting:

```
Classification: C (parallel-orchestrate)
[group 1] Spawning 2 workers: a1b2c3d4 (sonnet), c9d0e1f2 (haiku)
[group 1] Complete: 2/2 success
[group 2] Spawning 1 worker: e5f6a7b8 (sonnet)
[group 2] Complete: 1/1 success
Security: 0 critical, 0 high
Merge: 5 files changed, 0 conflicts. Summary ready for review.
```

## Notes on Scope

- The plugin provides classification, planning, orchestration, security scanning, and merge coordination.
- It does not ship a queue, remote worker fleet, or automatic integration system.
- The quality of the outcome depends on sensible workstream boundaries and human review.
- Token efficiency is a design principle, not a guarantee -- complex tasks still require context.
