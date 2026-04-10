---
name: smart-discovery
description: This skill should be used before reading any files for a task. It replaces naive Glob→Read workflows with intelligent, ranked file selection that is gitignore-aware, frequency-weighted, recency-biased, and graph-aware. Activate automatically when context gathering begins.
version: 3.0.0
---

# Smart Discovery

Intelligent file selection that goes beyond Glob→Grep→Read. Find the right files faster, read less, save tokens.

## Why This Exists

The naive approach reads too many files:
- Glob returns hundreds of results
- Many are irrelevant (vendor code, generated files, old tests)
- Without ranking, you read files in alphabetical order instead of relevance order

Smart discovery narrows the haystack before you start reading.

## Discovery Pipeline

### Stage 1: Scope (what to search)

**Start narrow, widen only if needed:**

1. **git ls-files** (preferred): only tracked files, automatically excludes gitignored paths
2. **Glob with exclusions**: exclude `node_modules`, `vendor`, `dist`, `build`, `.git`, `__pycache__`, `.venv`, `coverage`, `.next`, `.turbo`, `*.min.*`, `*.bundle.*`, `*.map`
3. **Respect .gitignore**: parse `.gitignore` and apply patterns

### Stage 2: Filter (what's relevant)

Reduce the file list using multiple signals:

**Keyword matching** (from the task description):
- Extract nouns and verbs from the user's request
- Grep file names AND content for these keywords
- Rank by number of keyword matches

**Graph-aware filtering** (if graph exists):
- If the task mentions a specific file or module, include its blast radius
- If the task mentions a feature, trace from the likely entry point

**Recency bias**:
- `git log --diff-filter=M --since="7 days ago" --name-only` → recently modified files rank higher
- Files modified today rank highest

**Size filtering**:
- Skip files >500 lines unless specifically needed
- Prefer reading with offset/limit over full file reads
- Skip binary files, images, fonts, compiled assets

### Stage 3: Rank (what to read first)

Score each candidate file:

```
relevance_score = (keyword_matches × 3) +
                  (blast_radius_member × 5) +
                  (recently_modified × 2) +
                  (small_file_bonus × 1) +
                  (test_file_for_target × 4)
```

Sort by score descending. Present the top results.

### Stage 4: Read Plan (how to read)

For each file, choose a reading strategy:

| Strategy | When | Token Cost |
|---|---|---|
| `full` | <100 lines, or the primary target | Full |
| `head` | Need to see exports/imports only | ~20% |
| `grep-context` | Looking for specific patterns | ~10% |
| `diff-only` | Reviewing recent changes | ~15% |
| `skip` | Not relevant enough | 0 |

## Output

Present the discovery results before reading:

```
## Smart Discovery: "add error handling to auth"

Found: 47 source files
Filtered: 8 relevant files
Reading plan:
  1. src/lib/auth.ts (full, 245 lines) — primary target, 5 keyword matches
  2. tests/auth.test.ts (full, 89 lines) — test file for target
  3. src/routes/api.ts (grep-context, "authenticate") — dependent
  4. src/middleware/session.ts (head, 50 lines) — imports auth
  5-8: skip (low relevance)

Estimated read: ~400 lines (~2,000 tokens)
vs. naive approach: ~3,200 lines (~16,000 tokens)
Savings: ~87%
```

## Pattern Shortcuts

Common task patterns have optimized discovery paths:

| Task Pattern | Discovery Shortcut |
|---|---|
| "fix the auth" | Grep for `auth\|login\|session` → trace imports |
| "add a new API endpoint" | Find route files → check existing patterns |
| "fix this error: <message>" | Grep for error text → trace to source |
| "update the schema" | Find schema/model files → check migrations |
| "add tests for X" | Find X → find existing test dir → check test patterns |

## Integration

- **auto-router**: smart-discovery runs for all Class B/C/D tasks during context gathering
- **context-budget**: discovery respects the current token budget
- **graph-builder**: if graph exists, discovery uses it for structural filtering
- **task-decomposer**: each decomposed task gets its own discovery scope

## Rules

1. **Always present the plan before reading**. Let the user see what will be read.
2. **Start with 5 files max**. Expand only if the initial read doesn't have enough context.
3. **Never read files you've already read in this session** unless they've changed.
4. **Prefer grep-context over full reads** for secondary files.
5. **Cache discovery results** in working memory — don't re-discover for the same task.
