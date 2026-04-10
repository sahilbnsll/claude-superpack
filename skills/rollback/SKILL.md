---
name: rollback
description: This skill should be used when orchestrated changes need to be undone, when the user says "undo that", "rollback", "revert the last change", "undo worker X", or when post-review detects critical failures that require reverting specific workstream outputs.
version: 3.0.0
---

# Rollback

Undo orchestrated changes by workstream. Git-aware, safe, and always asks before acting.

## Why This Exists

Orchestrated changes touch multiple files across multiple workers. When something goes wrong, you need to undo specific workers' changes — not everything. This skill uses patch files, git history, and worker logs to enable selective rollback.

## When to Activate

- User says: "undo", "rollback", "revert", "undo worker X"
- post-review detects critical failures and suggests rollback
- merge-coordinator flags a worker that broke the build

## Rollback Scopes

### Level 1: Rollback Specific Worker

Undo changes from a single worker identified by `task_id`.

**Source of truth**:
1. **Patch files**: `.safe-summon/<timestamp>-<task>-<run_id>.patch` — reverse-apply the patch
2. **Git commits**: if changes were committed, `git revert <commit-hash>`
3. **Execution log**: `claude-execution-log.json` contains the file list per worker

**Process**:
1. Look up the worker in `claude-execution-log.json` by task name or ID
2. Find the corresponding patch file in `.safe-summon/`
3. Show the user what will be undone (files and line counts)
4. After confirmation: reverse-apply the patch or git revert
5. Log the rollback to `claude-execution-log.json`

### Level 2: Rollback Last N Workers

Undo the most recent N worker outputs.

**Process**:
1. Read `claude-execution-log.json`, sort by timestamp descending
2. Take the last N entries
3. Reverse-apply in reverse chronological order (latest first)
4. After confirmation: apply all rollbacks

### Level 3: Rollback Entire Orchestration

Undo all changes from the most recent Class C or D execution.

**Process**:
1. Read `claude-execution-log.json`, find all entries from the most recent orchestration run
2. Show summary of all changes across all workers
3. After confirmation:
   - If git: `git reset --hard <pre-orchestration-commit>` or `git stash`
   - If patches: reverse-apply all patches in reverse order

### Level 4: Selective File Rollback

Undo changes to specific files, regardless of which worker made them.

**Process**:
1. For each specified file: `git checkout HEAD -- <file>` or `git diff HEAD -- <file> | git apply -R`
2. Report which workers' changes were partially undone
3. Warn: "This leaves worker X in a partial state. Their other files are still modified."

## Safety Protocols

### Always Confirm

Before executing any rollback, show:

```
## Rollback Plan

Scope: Worker "add-auth-middleware" (task_id: a1b2c3)
Files to revert (3):
  - src/middleware/auth.ts (245 lines removed)
  - src/routes/api.ts (12 lines changed)
  - tests/auth.test.ts (89 lines removed)

Patch source: .safe-summon/20260410T130000Z-add-auth-middleware-a1b2c3.patch

⚠️ This cannot be automatically re-applied. Make sure you want to undo this.

Proceed? (describe any concerns)
```

**Never auto-rollback. Always show the plan and wait for confirmation.**

### Pre-Rollback Snapshot

Before applying the rollback:
1. Create a safety snapshot: `git stash` or copy affected files to `.safe-summon/pre-rollback/`
2. Log the snapshot location so changes can be recovered if the rollback was a mistake

### Post-Rollback Validation

After rollback:
1. Check git status — is the tree clean?
2. Run scoped lint/type-check on affected files
3. Report the result

## Rollback Report

```
## Rollback Complete

Reverted: worker "add-auth-middleware" (task_id: a1b2c3)
Files reverted: 3
Pre-rollback snapshot: .safe-summon/pre-rollback/20260410T150000Z/

Post-rollback status:
  Git: ✅ clean working tree
  Lint: ✅ no errors in reverted files
  Type check: ✅ passed

Recovery: if this rollback was a mistake, restore from:
  .safe-summon/pre-rollback/20260410T150000Z/
```

## Integration

- **merge-coordinator**: when flagging a failed worker, suggest rollback with the specific task_id
- **post-review**: when critical failures are found, suggest rollback of the responsible worker
- **memory-manager**: log rollback events to recent memory (helps pattern-tracker learn)
- **execution log**: every rollback is logged to `claude-execution-log.json` with type "rollback"

## Edge Cases

- **No patch file found**: fall back to git diff-based rollback if commits exist
- **Patch doesn't apply cleanly**: report the conflict, suggest manual resolution
- **Worker modified files that were subsequently edited**: warn that rollback may cause conflicts
- **No execution log**: can't identify workers. Fall back to git-based rollback only.
