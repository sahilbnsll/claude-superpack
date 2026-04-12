---
name: test-generator
description: This skill should be used when the user asks to "add tests", "generate tests", "write tests for this function", "increase test coverage", or when test-mapper finds source files with no corresponding test files. It generates unit and integration test stubs from function signatures, following the project's existing test patterns and framework.
version: 4.0.0
---

# Test Generator

Generate test stubs from function signatures. Follow existing patterns, not generic templates.

## Why This Exists

Writing tests from scratch is repetitive. Most test files follow the same structure: import the module, set up mocks, test the happy path, test edge cases, test error handling. This skill generates that boilerplate — matching the project's existing test style — so you can focus on the assertions that matter.

## When to Activate

- When the user asks to add tests for a file, function, or module
- When test-mapper finds source files with no corresponding tests
- After implementing a new feature that needs test coverage
- When the user asks to increase test coverage

## Generation Process

### Step 1: Analyze Existing Test Patterns

Before generating anything, read 2-3 existing test files to learn:

1. **Framework**: Jest, Vitest, Mocha, Pytest, Go test, RSpec?
2. **Style**: describe/it blocks? test() calls? class-based?
3. **Naming**: `should do X`, `it does X`, `test_x_returns_y`?
4. **Setup/teardown**: beforeEach? fixtures? factories?
5. **Mocking**: jest.mock? vi.mock? manual mocks? dependency injection?
6. **Assertion library**: expect()? assert? chai?
7. **File location**: co-located? mirror directory? `__tests__/`?

```
## Test Pattern Analysis

Framework: Vitest (vitest.config.ts)
Style: describe/it blocks with arrow functions
Naming: "should [verb] [expected result]"
Setup: beforeEach with factory functions
Mocking: vi.mock for external deps, dependency injection for internal
Assertions: expect().toBe/toEqual/toThrow
Location: co-located (src/auth.ts → src/auth.test.ts)
```

### Step 2: Analyze Target Source

Read the source file and extract:

1. **Exported functions**: name, parameters, return type
2. **Dependencies**: what it imports (determines what to mock)
3. **Side effects**: database calls, API calls, file I/O
4. **Error paths**: throw statements, error returns, try/catch blocks
5. **Edge cases**: null checks, empty arrays, boundary conditions

### Step 3: Generate Test Stubs

For each exported function, generate:

**Happy path test:**
- Call the function with valid, typical inputs
- Assert the expected return value

**Edge case tests:**
- Empty inputs (null, undefined, empty string, empty array)
- Boundary values (0, -1, MAX_INT, empty object)
- Special characters in string inputs

**Error handling tests:**
- Invalid inputs that should throw
- Missing required parameters
- Downstream dependency failures (mock errors)

**Integration test (if applicable):**
- Test the function with real dependencies
- Verify side effects (database writes, API calls)

### Step 4: Match Project Style

Adapt the generated tests to match the project's conventions:

```typescript
// If project uses describe/it:
describe('validateToken', () => {
  it('should return user data for valid token', () => {
    // Arrange
    const token = createTestToken({ userId: '123' });
    
    // Act
    const result = validateToken(token);
    
    // Assert
    expect(result).toEqual({ userId: '123', valid: true });
  });

  it('should throw for expired token', () => {
    const token = createTestToken({ expiresAt: new Date('2020-01-01') });
    
    expect(() => validateToken(token)).toThrow('Token expired');
  });

  it('should return null for malformed token', () => {
    expect(validateToken('not-a-token')).toBeNull();
  });
});
```

```python
# If project uses pytest:
def test_validate_token_valid():
    token = create_test_token(user_id="123")
    result = validate_token(token)
    assert result == {"user_id": "123", "valid": True}

def test_validate_token_expired():
    token = create_test_token(expires_at=datetime(2020, 1, 1))
    with pytest.raises(TokenExpiredError):
        validate_token(token)

def test_validate_token_malformed():
    assert validate_token("not-a-token") is None
```

## Test Categories

| Category | What to Test | Priority |
|---|---|---|
| Unit | Individual functions in isolation | Always generate |
| Integration | Function with real dependencies | Generate if test patterns exist |
| Error handling | Failure modes and edge cases | Always generate |
| Type validation | Invalid input types | Generate for public APIs |
| Snapshot | Component render output | Only for UI components if project uses snapshots |

## Output

Present generated tests for review:

```
## Test Generator: src/lib/auth.ts

Source analysis:
  - 4 exported functions
  - 2 external dependencies (jsonwebtoken, database)
  - 3 error paths

Generated: src/lib/auth.test.ts
  - 12 test cases across 4 describe blocks
  - Mocks: jsonwebtoken, database module
  - Pattern: matches existing test style (describe/it, vi.mock)

Preview: [show the generated test file]

Write to: src/lib/auth.test.ts? (y/n)
```

## Integration

- **test-mapper**: identifies files needing tests, test-generator creates them
- **post-review**: after merge, generate tests for any untested new exports
- **smart-discovery**: discover existing test patterns before generating
- **error-catalog**: include regression tests for cataloged errors
- **parallel-orchestrator**: test generation can be a dedicated workstream

## Rules

1. **Read existing tests first.** Never generate tests in a style that doesn't match the project.
2. **Stubs, not implementations.** Generate the test structure and obvious cases. Leave complex assertion logic for the user to fill in.
3. **Don't over-mock.** If a dependency is simple and fast, use the real thing.
4. **Present before writing.** Always show the generated tests for approval.
5. **One test file per source file.** Don't combine tests for multiple source files.
6. **Include the Arrange/Act/Assert pattern.** Even if the project doesn't comment it, structure tests this way.
7. **Don't test internals.** Only test exported/public functions unless the user specifically asks for internal testing.
