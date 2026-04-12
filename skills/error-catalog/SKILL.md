---
name: error-catalog
description: This skill should be used when an error is encountered during development, when the user asks about a recurring error, or when debugging an issue that might have been seen before. It maintains a catalog of errors and their fixes, providing instant lookups for known problems.
version: 4.0.0
---

# Error Catalog

Catalog recurring errors with their fixes. When an error appears, check the catalog before debugging from scratch.

## Why This Exists

Developers encounter the same errors repeatedly — across projects, across sessions. The error catalog builds institutional knowledge: every error fixed is an error you never debug from scratch again.

## When to Activate

### Write (add to catalog)
- After successfully fixing an error that took >2 minutes to debug
- When an error involved a non-obvious root cause
- When memory-manager flags an `[error]` entry for promotion

### Read (lookup)
- When any error is encountered: check catalog BEFORE debugging
- When memory-search finds an `[error]` match
- When the user asks: "have I seen this before?", "known issues?"

## Catalog Storage

Location: `~/.claude/memory/errors.json`

```json
{
  "version": "1.0",
  "entries": [
    {
      "id": "err_001",
      "signature": "TypeError: Cannot read properties of undefined (reading 'map')",
      "signature_pattern": "Cannot read properties of undefined \\(reading '\\w+'\\)",
      "category": "null-reference",
      "language": "typescript",
      "root_cause": "API response missing expected array field. Destructured without default.",
      "fix": "Add optional chaining and default to empty array: data?.items ?? []",
      "fix_type": "code-change",
      "prevention": "Always provide defaults when destructuring API responses",
      "projects": ["lumacv", "portfolio"],
      "occurrences": 5,
      "first_seen": "2026-03-15",
      "last_seen": "2026-04-10",
      "confidence": "high",
      "related_errors": ["err_003"]
    },
    {
      "id": "err_002",
      "signature": "Zod validation error: invalid_enum_value",
      "signature_pattern": "invalid_enum_value",
      "category": "validation",
      "language": "typescript",
      "root_cause": "Enum schema doesn't include all possible values from the data source",
      "fix": "Update the Zod enum to include the new value. Check all data sources for complete value lists.",
      "fix_type": "schema-update",
      "prevention": "Use z.string() instead of z.enum() for user-facing categories that may grow",
      "projects": ["portfolio"],
      "occurrences": 2,
      "first_seen": "2026-04-02",
      "last_seen": "2026-04-02",
      "confidence": "high",
      "related_errors": []
    }
  ],
  "categories": {
    "null-reference": { "count": 8, "most_common_fix": "optional chaining" },
    "validation": { "count": 3, "most_common_fix": "schema update" },
    "auth": { "count": 4, "most_common_fix": "redirect URL config" },
    "build": { "count": 5, "most_common_fix": "dependency install" },
    "type-error": { "count": 6, "most_common_fix": "type assertion or interface update" }
  }
}
```

## Lookup Process

### 1. Extract Error Signature

From the error output, extract:
- **Primary**: the error message (first line of stack trace)
- **Secondary**: the error type/class (TypeError, ZodError, etc.)
- **Context**: the file and line where it occurred

### 2. Search Catalog

Match strategy (in order):

1. **Exact match**: error message appears in `signature` field
2. **Pattern match**: error message matches `signature_pattern` regex
3. **Category match**: error type maps to a known category
4. **Fuzzy match**: >60% string similarity with existing signatures

### 3. Return Result

**Match found:**
```
## 💡 Known Error Found

Signature: TypeError: Cannot read properties of undefined (reading 'map')
Seen before: 5 times across 2 projects (last: 2026-04-10)

Root cause: API response missing expected array field.
Fix: Add optional chaining and default: data?.items ?? []
Prevention: Always provide defaults when destructuring API responses.

Confidence: high (5 occurrences, consistent fix)
```

**No match:**
```
## Error Catalog: No match found

This error hasn't been cataloged before.
Proceeding with fresh debugging.
After the fix: this error will be added to the catalog.
```

## Adding an Error

After fixing a new or uncataloged error:

### Required Fields
- `signature`: exact error message
- `root_cause`: why it happened (1 sentence)
- `fix`: what was done to fix it (1-2 sentences)
- `language`: programming language

### Derived Fields
- `id`: auto-generated (err_NNN)
- `signature_pattern`: generalize the signature into a regex (replace specific variable names with `\w+`)
- `category`: infer from error type
- `fix_type`: one of `code-change`, `config-update`, `schema-update`, `dependency-install`, `environment-fix`
- `prevention`: how to avoid this error in the future

### Deduplication

Before adding:
1. Check for pattern match with existing entries
2. If match: increment `occurrences`, update `last_seen`, add project if new
3. If no match: create new entry

## Error Categories

Pre-defined categories for faster lookup:

| Category | Typical Errors |
|---|---|
| `null-reference` | undefined/null access, optional chaining needed |
| `type-error` | type mismatches, missing interfaces |
| `validation` | schema validation failures, enum mismatches |
| `auth` | redirect issues, token expiry, CORS |
| `build` | missing deps, syntax errors, config issues |
| `network` | API timeouts, rate limiting, DNS failures |
| `database` | connection failures, migration errors, constraint violations |
| `import` | module not found, circular imports |
| `permission` | file access denied, API key missing |
| `environment` | version mismatch, missing env vars |

## Integration

- **memory-manager**: errors tagged `[error]` in recent.md are candidates for the catalog
- **memory-consolidator**: promotes recurring errors from recent memory to the catalog
- **post-review**: when post-review detects failures, check catalog before debugging
- **pattern-tracker**: error frequency feeds into pattern statistics
- **project-memory**: project-specific errors also stored in project memory's `## Known Issues`

## Rules

1. **Check the catalog FIRST** when any error is encountered. Even 5 seconds of lookup saves 5 minutes of debugging.
2. **Catalog only non-trivial errors**. Don't catalog typos, missing semicolons, or other instant fixes.
3. **Keep fixes actionable**. "Fixed it" is not a useful fix description. Include the specific change.
4. **Update, don't duplicate**. If the error exists, increment occurrences. Don't create a second entry.
5. **Generalize signatures**. Replace specific variable/file names with patterns so the catalog matches variations of the same error.
