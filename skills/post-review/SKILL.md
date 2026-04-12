---
name: post-review
description: This skill should be used after merge-coordinator finishes integrating worker outputs, when the user asks to "verify the changes", "run a post-merge check", or after any significant code changes. It runs lightweight automated validation to catch issues before the user discovers them.
version: 4.0.0
---

# Post-Review

Automated validation after merge-coordinator or significant code changes. Catch issues before the user does.

## Why This Exists

merge-coordinator validates scope and structure, but doesn't run the code. Post-review closes the gap: lint, type-check, and test the changes to catch real bugs.

## When to Run

- Automatically after merge-coordinator produces its summary
- After any Class C or D task completes
- On explicit user request: "check if everything works", "validate changes"

## Review Pipeline

### 1. Detect Available Tools

Check what validation tools are available in the project:

| Category | Tools to Check |
|---|---|
| Lint | `eslint`, `biome`, `ruff`, `rubocop`, `golangci-lint`, `clippy` |
| Type Check | `tsc --noEmit`, `mypy`, `pyright` |
| Test | `jest`, `vitest`, `pytest`, `go test`, `cargo test`, `rspec` |
| Build | `npm run build`, `cargo build`, `go build` |

Detection: check `package.json` scripts, `Makefile` targets, `pyproject.toml` sections, `Cargo.toml`.

Run only what exists. Skip silently if a tool isn't available.

### 2. Scope the Checks

**Don't run everything. Run only what's relevant to the changes.**

Use graph-reviewer's blast radius (if available) to identify:
- Changed files → run lint only on these files
- Test files in blast radius → run only these tests
- If no graph: fall back to git diff file list

```bash
# Scoped lint
npx eslint src/auth.ts src/routes/api.ts

# Scoped tests
npx vitest run tests/auth.test.ts tests/api.test.ts

# Type check (usually full-project, but fast)
npx tsc --noEmit
```

### 3. Run Checks

Execute in order (stop early on critical failures):

1. **Lint** (fastest, catches style and obvious bugs)
2. **Type Check** (catches type errors from interface changes)
3. **Test Subset** (catches behavioral regressions)
4. **Build** (only if lint + type check pass, and only if changes affect build)

### 4. Analyze Results

For each check, determine:
- Pass or fail
- If fail: which files and which specific errors
- If fail: which worker's changes caused the issue (cross-reference with merge summary)

### 5. Report

**All passing:**
```
## Post-Review: ✅ All Checks Passed

Lint: ✅ 3 files checked, 0 issues
Type Check: ✅ passed in 2.1s
Tests: ✅ 4/4 passed in 1.8s
Build: ⏭️ skipped (no build-affecting changes)

Verdict: Changes are clean. Ready to commit.
```

**With failures:**
```
## Post-Review: ⚠️ Issues Found

Lint: ❌ 1 error in src/auth.ts
  Line 42: 'validateToken' is defined but never used (no-unused-vars)
  Likely cause: worker-a1b2 added the function but worker-c3d4 didn't use it

Type Check: ✅ passed
Tests: ❌ 1 failure
  tests/api.test.ts > POST /login > should return 401 for invalid credentials
  Error: Expected status 401, received 500
  Likely cause: worker-a1b2 changed authenticate() signature

Build: ⏭️ skipped (blocked by test failure)

Verdict: 2 issues need fixing before commit.
Suggested fixes:
  1. Remove unused validateToken or add usage
  2. Update api.test.ts to match new authenticate() parameters
```

## Auto-Fix

For trivial issues that have clear fixes:

| Issue Type | Auto-Fix? |
|---|---|
| Unused imports | ✅ Yes — remove them |
| Missing semicolons | ✅ Yes — add them |
| Trailing whitespace | ✅ Yes — trim |
| Unused variables | ⚠️ Suggest, don't auto-fix (may be intentional) |
| Test failures | ❌ No — requires understanding |
| Type errors | ❌ No — requires understanding |

If auto-fix is applied: report what was fixed and re-run the failing check.

## Integration

- **merge-coordinator**: post-review runs immediately after merge summary is produced
- **graph-reviewer**: uses blast radius to scope checks
- **memory-manager**: log any recurring failures to memory for error-catalog
- **context-budget**: post-review is cheap (~500 tokens). Budget is not a concern.
- **rollback**: if post-review finds critical failures, suggest rollback of the responsible worker

## Rules

1. **Always scope to changed files**. Never run full-project lint or all tests (unless the project is small).
2. **Time limit**: 30 seconds per check. If a check takes longer, kill it and report "timed out".
3. **Don't block on warnings**. Only errors are failures. Warnings are informational.
4. **Report tersely for clean results**. 3 lines if everything passes.
5. **Attribute failures to workers** when possible. This helps merge-coordinator decide which changes to rollback.
