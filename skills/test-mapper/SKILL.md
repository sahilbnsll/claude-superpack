---
name: test-mapper
description: This skill should be used before running tests for a specific change, when the user asks "what tests cover this file?", "run relevant tests", "which tests should I run?", or when parallel-orchestrator needs to assign test subsets to workers. It maps source files to their test files and runs only what's needed.
version: 4.0.0
---

# Test Mapper

Map source files to their tests. Run only what's relevant — not the entire suite.

## Why This Exists

Running the full test suite after every change wastes time and tokens. Most changes affect a small subset of tests. Test-mapper builds and maintains a source-to-test mapping so workers and developers run only what matters.

## When to Activate

- Before running tests after a code change
- When parallel-orchestrator assigns workstreams and needs scoped test commands
- When the user asks "what tests cover X?" or "run relevant tests"
- After merge-coordinator integrates changes and needs targeted validation

## Mapping Strategy

### Stage 1: Convention-Based Discovery

Most projects follow predictable patterns:

| Convention | Source | Test |
|---|---|---|
| Co-located | `src/auth.ts` | `src/auth.test.ts` or `src/auth.spec.ts` |
| Mirror directory | `src/auth.ts` | `tests/auth.test.ts` or `test/auth.test.ts` |
| `__tests__` folder | `src/auth.ts` | `src/__tests__/auth.test.ts` |
| Python | `src/auth.py` | `tests/test_auth.py` |
| Go | `pkg/auth.go` | `pkg/auth_test.go` |
| Java | `src/main/.../Auth.java` | `src/test/.../AuthTest.java` |

**Discovery process:**
1. Glob for test file patterns: `**/*.test.*`, `**/*.spec.*`, `**/test_*.*`, `**/*_test.*`, `**/*Test.*`
2. For each test file, infer the source file using naming conventions
3. Validate the source file exists

### Stage 2: Import-Based Discovery

For tests that don't follow naming conventions:

1. Read test file imports/requires
2. Resolve relative paths to source files
3. Build reverse mapping: source → [test files that import it]

### Stage 3: Graph-Aware Expansion

If the codebase graph exists:

1. For each changed source file, get its dependents from the graph
2. Find tests that cover those dependents (transitive test coverage)
3. Include tests up to 2 levels of dependency depth

## Output Format

```
## Test Mapper: src/lib/auth.ts

Direct tests:
  - tests/auth.test.ts (convention match)
  - tests/auth.integration.test.ts (import match)

Dependent tests (1 hop):
  - tests/middleware.test.ts (imports auth)
  - tests/api-routes.test.ts (imports auth via middleware)

Run command:
  npx jest tests/auth.test.ts tests/auth.integration.test.ts tests/middleware.test.ts tests/api-routes.test.ts

Coverage: 4 test files (vs 47 total)
```

## Framework Detection

Detect the test framework from project config:

| Signal | Framework | Run Command |
|---|---|---|
| `jest.config.*` or `"jest"` in package.json | Jest | `npx jest <files>` |
| `vitest.config.*` | Vitest | `npx vitest run <files>` |
| `pytest.ini` or `pyproject.toml [tool.pytest]` | Pytest | `python -m pytest <files>` |
| `*_test.go` | Go test | `go test <packages>` |
| `mocha` in package.json | Mocha | `npx mocha <files>` |
| `.rspec` | RSpec | `bundle exec rspec <files>` |

## Integration

- **parallel-orchestrator**: each worker gets only the tests relevant to its workstream
- **post-review**: runs mapped tests after merge instead of full suite
- **merge-coordinator**: validates each workstream with its scoped tests
- **smart-discovery**: test files are included in discovery when source files are targets

## Caching

Store the mapping in working memory during the session. Invalidate when:
- A new test file is created
- A source file's imports change
- The user runs `test-mapper --rebuild`

## Rules

1. **Always detect the framework first.** Don't assume Jest.
2. **Convention match is sufficient** for most cases. Don't over-engineer import tracing.
3. **Cap transitive depth at 2.** Beyond that, just run the full suite.
4. **Present the plan before running.** Let the user see what will be tested.
5. **Fall back to full suite** if mapping confidence is low (<50% of changed files mapped).
