---
name: graph-reviewer
description: This skill should be used before reviewing code changes, when the user asks to "review this PR", "check these changes", "what's the blast radius", or when merge-coordinator needs to validate worker scope. It uses the codebase graph to identify exactly which files need review based on what changed — dramatically reducing token usage.
version: 4.0.0
---

# Graph Reviewer

Use the codebase graph for blast-radius-aware code review. Read only what matters.

## Why This Exists

Traditional code review reads the changed files plus whatever the reviewer thinks might be affected. This is guesswork. The graph knows exactly what depends on what, so we read only the blast radius — typically 80-90% fewer files than a naive review.

## Preconditions

- A graph exists at `~/.claude/graphs/<project-slug>/graph.json`
- If no graph exists: trigger `graph-builder` in lazy mode for the changed files only
- Changes are available via `git diff`, staged files, or explicit file list

## Review Workflow

### 1. Identify Changed Files

Detect changes:
```bash
git diff --name-only HEAD~1          # Last commit
git diff --name-only --cached        # Staged changes
git diff --name-only main...HEAD     # Branch diff vs main
```

Or: user specifies files explicitly.

### 2. Compute Blast Radius

For each changed file, look up `blast-cache.json`:

```
Changed file: src/lib/auth.ts

Blast Radius:
├── DIRECT (must review):
│   ├── src/routes/api.ts (imports: authenticate)
│   ├── src/middleware/session.ts (imports: AuthMiddleware)
│   └── src/routes/user.ts (imports: authenticate)
├── TESTS (must check coverage):
│   ├── tests/auth.test.ts ✅ (directly tests auth.ts)
│   └── tests/api.test.ts ⚠️ (tests api.ts which uses auth)
└── INDIRECT (monitor):
    └── src/app/layout.tsx (uses middleware → auth)
```

If blast cache is stale or missing: compute on the fly from `graph.json` edges using BFS (max depth 3).

### 3. Risk Assessment

Score each changed file:

| Risk Level | Criteria |
|---|---|
| 🔴 Critical | >5 direct dependents, OR changes exports/interfaces |
| 🟡 High | 3-5 direct dependents, OR changes function signatures |
| 🟢 Medium | 1-2 direct dependents, OR internal changes only |
| ⚪ Low | No dependents (leaf node), OR test file only |

### 4. Smart File Reading

Based on blast radius, build a reading plan:

```
Review Reading Plan:
  Read (full):  src/lib/auth.ts (changed, 245 lines)
  Read (diff):  src/routes/api.ts (dependent, only check import usage)
  Read (sigs):  src/middleware/session.ts (dependent, only check interfaces)
  Skip:         src/app/layout.tsx (indirect, low risk)
  Skip:         42 other files (not in blast radius)

  Total reads: 3 files (~400 lines)
  Saved: ~8,000 lines across 42 skipped files
  Estimated token savings: ~87%
```

**Reading strategies**:
- `full`: read entire file (changed files, or small files <100 lines)
- `diff`: read only the diff hunks plus 10 lines of context
- `sigs`: read only function/class signatures and imports (first 50 lines + export lines)
- `skip`: do not read

### 5. Review Output

Structure the review as:

```markdown
## Code Review: <branch/PR name>

### Changes Summary
- N files changed, M lines added, K lines removed
- Risk level: 🟡 High (auth.ts has 8 dependents)

### Blast Radius
[blast radius visualization from step 2]

### Findings
#### src/lib/auth.ts
- [severity] finding description
- Line X: specific issue

#### Impact on Dependents
- src/routes/api.ts: ✅ no breaking changes to imported symbols
- src/middleware/session.ts: ⚠️ AuthMiddleware signature changed — verify constructor args

### Missing Updates
Files in blast radius that may need updates but weren't changed:
- tests/api.test.ts — tests the auth flow but wasn't updated

### Verdict
[approve | request-changes | needs-discussion]
```

## Integration

- **merge-coordinator**: after workers finish, use graph-reviewer to validate each worker stayed within its assigned blast radius.
- **post-review**: automatically triggered after merge-coordinator for a quick validation pass.
- **conflict-detector**: uses blast radius to identify potential cross-worker conflicts before execution.
- **memory-manager**: log review outcomes for pattern tracking.

## Token Budget

- Target: complete review in <1500 tokens of file reads
- If blast radius exceeds 20 files: summarize instead of reading each one
- Always emit token savings estimate so the user sees the value
