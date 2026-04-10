---
name: pre-flight
description: This skill should be used before any Class C or D orchestrated execution, before spawning workers, or when the user asks to "check if everything is ready", "validate environment", or "pre-flight check". It validates that the environment is ready for safe execution.
version: 3.0.0
---

# Pre-Flight

Validate the environment before spawning workers or starting complex execution. Catch problems early.

## Why This Exists

Workers spawned into broken environments waste time, tokens, and create confusing failures. A 10-second pre-flight check prevents 10-minute debugging sessions.

## When to Run

- Before any Class C (parallel) or Class D (serial complex) execution
- Before `parallel-orchestrator` spawns workers
- On explicit user request

## Checklist

### 1. Git Status

```bash
git status --porcelain
```

| State | Verdict |
|---|---|
| Clean working tree | ✅ Pass |
| Untracked files only | ✅ Pass (note it) |
| Staged changes | ⚠️ Warn: "You have staged changes. Workers will branch from HEAD, not from staged state." |
| Uncommitted modifications | ⚠️ Warn: "Dirty tree. safe-summon will use copy mode instead of git-worktree." |
| Merge in progress | 🔴 Fail: "Resolve the merge first." |
| Rebase in progress | 🔴 Fail: "Complete or abort the rebase first." |

### 2. Required Tools

| Tool | Check | Required For |
|---|---|---|
| `git` | `git --version` | All orchestrated execution |
| `bash` | `bash --version` | safe-summon |
| `python3` | `python3 --version` | safe-summon internals |
| `timeout` or `gtimeout` | `command -v timeout \|\| command -v gtimeout` | Worker timeouts |

If any required tool is missing: 🔴 Fail with install instructions.

### 3. Project Dependencies

Detect project type and verify dependencies are installed:

| Indicator | Check |
|---|---|
| `package.json` exists | `node_modules/` exists? If not: "Run `npm install` first." |
| `requirements.txt` or `pyproject.toml` | `.venv/` or active venv? If not: "Set up a virtual environment." |
| `go.mod` | `go mod verify` |
| `Cargo.toml` | `cargo check --message-format=short` (skip if slow) |
| `Gemfile` | `bundle check` |

### 4. Disk Space

```bash
df -h . | tail -1
```

| Free Space | Verdict |
|---|---|
| >1GB | ✅ Pass |
| 500MB-1GB | ⚠️ Warn: "Low disk space. Workers create temporary copies." |
| <500MB | 🔴 Fail: "Insufficient disk space for isolated workers." |

### 5. Port Conflicts (if task involves servers)

If the task involves running dev servers:
```bash
lsof -i :3000 -i :8080 -i :5173 | grep LISTEN
```

If ports are occupied: ⚠️ Warn with PID and process name.

### 6. Memory System

| Check | Verdict |
|---|---|
| `~/.claude/memory/` exists | ✅ or create it |
| `recent.md` is readable | ✅ or create it |
| `projects/` dir exists | ✅ or create it |

### 7. Graph Data (optional)

| Check | Verdict |
|---|---|
| Graph exists for current project | ✅ "Graph available, blast radius enabled" |
| Graph is stale | ⚠️ "Graph is X days old. Consider updating." |
| No graph | ℹ️ "No graph. Building lazily during task." |

## Output Format

```
## Pre-Flight Check

✅ Git: clean working tree (main branch, 3 commits ahead of origin)
✅ Tools: git 2.43, bash 5.2, python3 3.11, gtimeout available
✅ Dependencies: node_modules present, 412 packages
✅ Disk: 45GB free
✅ Memory: system ready
ℹ️ Graph: not built yet (will build lazily)

Result: 6/6 passed, 0 warnings, 0 failures
Ready for orchestrated execution.
```

Or with issues:

```
## Pre-Flight Check

✅ Git: clean working tree
✅ Tools: all present
⚠️ Dependencies: node_modules missing — run `npm install`
✅ Disk: 12GB free
✅ Memory: system ready
⚠️ Graph: 12 days stale — consider `graph-updater`

Result: 4/6 passed, 2 warnings, 0 failures
Recommendation: Install dependencies before proceeding.
Proceed anyway? Workers may fail due to missing modules.
```

## Rules

1. **Fast**: pre-flight should complete in <5 seconds. Don't run slow checks (no `npm audit`, no full test suite).
2. **Non-blocking on warnings**: report warnings but let the user decide.
3. **Blocking on failures**: if git is in a broken state or essential tools are missing, do not proceed.
4. **Cache results**: if pre-flight ran <5 minutes ago and no files changed, skip re-running.
5. **Always run before Class C/D**: even if the user doesn't ask. It's cheap insurance.
