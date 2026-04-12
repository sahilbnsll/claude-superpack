---
name: dead-code-finder
description: This skill should be used when the user asks "what code is unused?", "find dead code", "clean up unused exports", "find orphan files", or when graph-navigator detects modules with no incoming dependencies. It identifies unused exports, unreachable functions, orphan files, and stale imports using the codebase graph and Grep analysis.
version: 4.0.0
---

# Dead Code Finder

Find unused exports, orphan files, and unreachable code. Keep the codebase lean.

## Why This Exists

Dead code accumulates silently. Every unused export, orphan file, and stale import adds cognitive load, slows builds, and inflates bundle sizes. This skill uses the codebase graph and Grep analysis to find code that can be safely removed.

## When to Activate

- When the user asks to find unused code or clean up the codebase
- After a major refactor that may have left orphaned code
- When graph-navigator detects modules with zero incoming edges
- When context-budget suggests the codebase has excessive surface area
- Periodically as part of codebase health checks

## Detection Methods

### 1. Unused Exports

Find exported symbols that no other file imports:

**Process:**
1. Grep for all exports in source files:
   - `export (function|const|class|type|interface|enum) (\w+)`
   - `export default`
   - `module.exports`
   - `exports.\w+`
2. For each exported symbol, Grep the entire codebase for imports:
   - `import.*\bsymbolName\b`
   - `require.*symbolName`
   - Dynamic imports: `import('...')`
3. If zero import matches: flag as unused

**Exclusions:**
- Entry points (main, index files referenced in package.json)
- CLI scripts referenced in `bin` field
- Files referenced in config (webpack entry, next.config, etc.)
- Symbols used in the same file (internal usage)
- Test helpers only used in test files (check test imports separately)

### 2. Orphan Files

Find files that no other file imports or references:

**Process:**
1. List all source files via `git ls-files`
2. For each file, check if it's imported by any other file
3. Check if it's referenced in config files (routes, webpack, etc.)
4. Check if it's an entry point
5. Files with zero references: flag as orphan candidates

**Common orphans:**
- Old component files after a rename
- Utility files whose consumers were deleted
- Migration files that already ran
- Draft/experimental files that were never integrated

### 3. Unreachable Functions

Find non-exported functions within a file that are never called:

**Process:**
1. Read the file and identify all function definitions
2. For each non-exported function, grep within the same file for calls
3. If never called internally and not exported: flag as unreachable

**Note:** This only works for simple cases. Complex patterns (callbacks, dynamic dispatch) may produce false positives.

### 4. Stale Imports

Find imports that are declared but never used in the file:

**Process:**
1. Extract all import statements
2. For each imported symbol, grep the rest of the file for usage
3. If the symbol never appears after the import: flag as stale

**Note:** Most linters catch this. Only run if linting isn't configured.

### 5. Graph-Based Analysis (if graph exists)

Use graph-navigator for deeper analysis:

1. **Island detection**: find clusters of files that only reference each other, with no connection to the main application
2. **Leaf nodes**: files that import nothing and are imported by nothing
3. **One-way dependencies**: files imported by only one consumer (candidates for inlining)

## Output Format

```
## Dead Code Analysis

Scanned: 142 source files

### Unused Exports (7)

| Export | File | Last Modified | Confidence |
|---|---|---|---|
| `formatCurrency` | src/utils/format.ts:23 | 45 days ago | high |
| `OldUserSchema` | src/types/user.ts:89 | 90 days ago | high |
| `debugLogger` | src/lib/logger.ts:12 | 30 days ago | medium |
| ... | | | |

### Orphan Files (3)

| File | Lines | Last Modified | Confidence |
|---|---|---|---|
| src/components/OldDashboard.tsx | 234 | 120 days ago | high |
| src/utils/legacy-parser.ts | 67 | 90 days ago | high |
| src/hooks/useDeprecatedAuth.ts | 45 | 60 days ago | medium |

### Stale Imports (12)

| File | Import | From |
|---|---|---|
| src/routes/api.ts:3 | `{ unused }` | ../utils/helpers |
| ... | | |

### Summary
- Removable code: ~346 lines across 10 files
- Estimated bundle size reduction: ~4KB (unminified)
- Confidence: high (7), medium (3), low (0)

Proceed with removal? (review each / remove all high-confidence / skip)
```

## Confidence Levels

| Level | Meaning | Action |
|---|---|---|
| High | No references found anywhere, old last-modified date | Safe to remove |
| Medium | No direct references, but could be used dynamically or via config | Review before removing |
| Low | Possibly unused but pattern is ambiguous | Flag only, don't recommend removal |

**Factors that lower confidence:**
- File is relatively new (< 7 days old)
- Symbol name matches common dynamic access patterns
- File is in a `utils/` or `lib/` directory (often used across projects)
- File has a `@public` or `@api` doc tag

## Integration

- **graph-navigator**: provides dependency data for island and leaf-node detection
- **graph-builder**: dead code analysis can trigger graph refresh for accuracy
- **context-budget**: removing dead code reduces context surface area
- **session-recap**: dead code removal is noted in session summaries
- **doc-generator**: remove documentation for deleted dead code

## Rules

1. **Never auto-delete.** Always present findings for user review before removing anything.
2. **Check entry points.** A file that looks orphaned might be a CLI script, config target, or dynamic import.
3. **Respect confidence levels.** Only recommend removal for high-confidence findings.
4. **Check git blame.** Recently added "dead" code might be work-in-progress. Flag but don't recommend removal.
5. **Batch by directory.** Group findings by directory for easier review.
6. **Run tests after removal.** Use test-mapper to run relevant tests after each batch of removals.
