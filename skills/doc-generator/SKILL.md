---
name: doc-generator
description: This skill should be used when the user asks to "document this", "generate docs", "update the README", "add JSDoc", "write API docs", or after significant code changes that affect public interfaces. It generates and updates documentation from code — READMEs, API docs, inline comments, and usage guides.
version: 4.0.0
---

# Doc Generator

Generate and update documentation from code. Keep docs in sync with what actually exists.

## Why This Exists

Documentation drifts from code almost immediately. Manual doc updates are forgotten, READMEs go stale, API docs describe functions that no longer exist. This skill generates docs directly from the current code state — accurate by construction.

## When to Activate

- When the user asks to document code, a module, or an API
- After significant code changes that affect public interfaces
- When post-review detects that changed files have outdated or missing docs
- When the user asks to update the README

## Documentation Types

### 1. Inline Documentation

**JSDoc / TSDoc / Docstrings:**

1. Read the target file
2. Identify exported/public functions, classes, types
3. For each:
   - Analyze parameters, return types, and usage patterns
   - Generate concise doc comment with: description, @param, @returns, @throws, @example
4. Write only for functions that lack documentation or have stale docs

**Rules:**
- Don't document obvious getters/setters
- Don't add `@param name - the name` (says nothing)
- Include an `@example` only when usage isn't obvious
- Match the project's existing doc style (JSDoc vs TSDoc vs plain comments)

### 2. README Generation

**For a module/package:**

1. Detect what the module does from exports and entry points
2. Check for existing README — update rather than replace
3. Generate sections:
   - **What it does** (1-2 sentences)
   - **Installation** (if it's a package)
   - **Usage** (code examples from actual exports)
   - **API** (public functions with signatures)
   - **Configuration** (if config files exist)

**For a project root:**

1. Read package.json, entry points, existing README
2. Identify sections that are outdated (compare code vs docs)
3. Update only stale sections, preserve user-written content

### 3. API Documentation

For REST APIs, GraphQL, or RPC:

1. Find route definitions (express routes, Next.js API routes, FastAPI endpoints)
2. Extract: method, path, parameters, request/response types
3. Generate endpoint documentation:

```markdown
### POST /api/auth/login

Authenticate a user and return a session token.

**Request Body:**
| Field | Type | Required | Description |
|---|---|---|---|
| email | string | yes | User email address |
| password | string | yes | User password |

**Response (200):**
| Field | Type | Description |
|---|---|---|
| token | string | JWT session token |
| expiresAt | string | ISO 8601 expiration timestamp |

**Errors:**
- 401: Invalid credentials
- 429: Rate limited
```

### 4. Architecture Documentation

For when the user asks "document the architecture":

1. Use graph-navigator (if graph exists) to get module dependencies
2. Map the high-level data flow
3. Generate a structured overview:
   - System components and their roles
   - Data flow between components
   - Key design decisions and trade-offs
   - Technology stack

## Freshness Check

Before generating, check what already exists:

1. Read existing docs for the target
2. Compare documented API signatures vs actual code
3. Flag: new undocumented exports, removed functions still in docs, changed signatures
4. Update only what's stale — don't regenerate docs that are current

## Output

Present generated docs for review before writing:

```
## Doc Generator: src/lib/auth.ts

Changes:
  - Added JSDoc for 3 new exported functions
  - Updated return type docs for `validateToken` (was Promise<boolean>, now Promise<TokenResult>)
  - Removed docs for deleted function `legacyAuth`

Preview: [show the generated docs]

Write to: src/lib/auth.ts (inline) + docs/api/auth.md
```

## Integration

- **post-review**: after merge, check if changed files have stale docs
- **graph-navigator**: use graph for architecture documentation
- **session-recap**: note doc updates in session summary
- **smart-discovery**: doc files are included in discovery for relevant tasks

## Rules

1. **Update, don't replace.** Preserve user-written content. Only update generated sections.
2. **Match existing style.** If the project uses JSDoc, don't switch to TSDoc.
3. **Code examples must compile.** Never write a usage example that wouldn't actually work.
4. **Present before writing.** Always show the generated docs for approval.
5. **Don't document internals.** Only document public/exported interfaces unless explicitly asked.
6. **Keep it concise.** A 20-line function doesn't need a 40-line doc comment.
