# Serial Complex Example (Class D)

This example demonstrates Class D execution for cross-cutting changes that must be serialized.

## Prompt

```text
$ claude
> Migrate the authentication system from session-based to JWT across all services.
```

## Classification

```
Classification: D
Reasoning: Cross-cutting migration affecting shared auth abstraction, session management, all route handlers, and tests. High coupling between all changes.
Route: serial-orchestrate
```

## DAG

```json
{
  "workstreams": [
    {
      "id": "m1n2o3p4",
      "description": "Create JWT utility module",
      "goal": "Implement JWT sign, verify, and refresh token functions",
      "likely_paths": ["src/auth/jwt.ts", "src/auth/types.ts"],
      "dependencies": [],
      "complexity": 3,
      "model": "sonnet"
    },
    {
      "id": "q5r6s7t8",
      "description": "Replace session middleware with JWT middleware",
      "goal": "Swap session-based auth middleware for JWT verification",
      "likely_paths": ["src/middleware/auth.ts", "src/config/auth.ts"],
      "dependencies": ["m1n2o3p4"],
      "complexity": 4,
      "model": "opus"
    },
    {
      "id": "u9v0w1x2",
      "description": "Update all route handlers to use JWT auth",
      "goal": "Replace req.session references with JWT token extraction",
      "likely_paths": ["src/routes/*.ts"],
      "dependencies": ["q5r6s7t8"],
      "complexity": 3,
      "model": "sonnet"
    },
    {
      "id": "y3z4a5b6",
      "description": "Update tests for JWT-based auth",
      "goal": "Replace session mocks with JWT token fixtures",
      "likely_paths": ["tests/**/*.test.ts"],
      "dependencies": ["u9v0w1x2"],
      "complexity": 3,
      "model": "sonnet"
    }
  ],
  "execution_order": [["m1n2o3p4"], ["q5r6s7t8"], ["u9v0w1x2"], ["y3z4a5b6"]],
  "total_complexity": 13,
  "estimated_workers": 4
}
```

## Conflict Analysis

Verdict: `fully-serial` -- each step depends on the previous. No safe parallelization.

## Execution (Safe Mode)

```
[step 1] Worker m1n2o3p4 (sonnet, worktree): Create JWT utility
         Result: success (2 files, 45s)
         Validation: type check passed

[step 2] Worker q5r6s7t8 (opus, worktree): Replace auth middleware
         Result: success (2 files, 80s)
         Validation: type check passed, existing tests... 3 failures (expected -- tests still use sessions)

[step 3] Worker u9v0w1x2 (sonnet, worktree): Update route handlers
         Result: success (12 files, 120s)
         Validation: lint passed, type check passed

[step 4] Worker y3z4a5b6 (sonnet, worktree): Update tests
         Result: success (8 files, 90s)
         Validation: all 47 tests passing
```

## Merge Summary

```
## Merge Summary

### Completed Tasks
- m1n2o3p4: Created JWT utility with sign/verify/refresh (2 files)
- q5r6s7t8: Replaced session middleware with JWT verification (2 files)
- u9v0w1x2: Updated 12 route handlers to JWT auth (12 files)
- y3z4a5b6: Migrated 47 tests to JWT fixtures (8 files)

### Files Changed
24 files total across 4 workstreams

### Key Decisions
- Used RS256 algorithm for JWT signing (more secure than HS256 for multi-service)
- Kept session cleanup as a separate follow-up task
- Added refresh token rotation for security

### Validation Results
- Build: pass
- Lint: pass
- Tests: 47/47 passing

### Risks
- Session cleanup not yet performed (old session middleware still in dependencies)
- Refresh token storage uses in-memory store (should be Redis in production)
```

## Why Class D, Not Class C

This migration cannot be parallelized because:
- Route handlers cannot be updated before the middleware is in place
- Tests cannot be updated before the routes work with JWT
- The JWT utility must exist before anything can use it
- Each step validates that the previous step works correctly

The safe-mode execution with validation gates catches issues early (step 2 showed expected test failures) and prevents cascading errors.
