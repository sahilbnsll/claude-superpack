---
name: graph-builder
description: This skill should be used when first interacting with a new project, when the user asks to "map this codebase", "build a graph", "analyze project structure", or when any graph-dependent skill (graph-reviewer, graph-navigator) needs data that doesn't exist yet. It builds a structural map of the codebase using only Claude's built-in tools — no external dependencies required.
version: 3.0.0
---

# Graph Builder

Build a persistent structural map of any codebase using only built-in tools. Zero external dependencies. Works on first prompt.

## Why This Exists

Reading an entire codebase for every task wastes thousands of tokens. A structural graph lets you read only the files that matter. Unlike `code-review-graph` which requires Python, Tree-sitter, SQLite, and an MCP server, this skill works immediately with Claude's built-in Glob/Grep/Read tools.

## How We Beat code-review-graph

| Feature | code-review-graph | graph-builder |
|---|---|---|
| Setup required | `pip install`, Tree-sitter, SQLite, MCP config | None. Zero. |
| First-use delay | Must run `build` command first | Builds lazily on first task |
| Dependencies | Python 3.10+, Tree-sitter C libs | None (uses Glob/Grep/Read) |
| Languages | 19 (via Tree-sitter grammars) | 12 (via regex patterns) |
| Token efficiency | ~100 tokens per graph call | ~50 tokens per lookup (JSON file) |
| Memory integration | None | Feeds architecture into project-memory |
| Cross-project | Multi-repo registry (manual setup) | Automatic via `~/.claude/graphs/` |

## Graph Storage

```text
~/.claude/graphs/<project-slug>/
├── graph.json          ← nodes, edges, metadata
├── graph-meta.json     ← file hashes, scan timestamps, stats
├── blast-cache.json    ← cached blast radius for changed files
└── architecture.md     ← auto-generated architecture summary
```

**Project slug**: derived from git remote URL or directory name (same logic as project-memory).

## When to Build

### Full Build

Trigger on:
- First interaction with a project that has no graph
- User explicitly asks: "map this codebase", "build the graph"
- When >20% of files have changed since last full scan (graph-updater suggests this)

### Lazy Build

When a graph-dependent skill needs data but no full graph exists:
- Build a **partial graph** covering only the files relevant to the current task
- Mark the graph as `partial` in `graph-meta.json`
- Extend it incrementally as more files are accessed

## Build Process

### Step 1: Discover Files

```
Glob: **/*.{ts,tsx,js,jsx,py,go,rs,java,rb,c,cpp,h,hpp,swift,kt,php}
```

Exclude: `node_modules`, `vendor`, `dist`, `build`, `.git`, `__pycache__`, `.venv`, `venv`, `coverage`, `.next`, `.turbo`

Record total file count and estimated project size.

### Step 2: Extract Structure

For each file, use Grep to extract:

**JavaScript/TypeScript** (`*.ts`, `*.tsx`, `*.js`, `*.jsx`):
```
Grep: ^(export |import |class |function |const |interface |type |enum )
```

Parse:
- `export (default )?(function|class|const|interface|type|enum) NAME` → export node
- `import { ... } from './path'` or `import NAME from './path'` → import edge
- `function NAME` / `class NAME` → function/class node
- `require('./path')` → import edge

**Python** (`*.py`):
```
Grep: ^(from |import |class |def |async def )
```

Parse:
- `from .module import name` → import edge
- `import module` → import edge
- `class Name` / `def name` / `async def name` → class/function node

**Go** (`*.go`):
```
Grep: ^(package |import |func |type \w+ struct|type \w+ interface)
```

**Rust** (`*.rs`):
```
Grep: ^(use |mod |pub fn |fn |pub struct |struct |pub enum |enum |impl |trait )
```

**Java/Kotlin** (`*.java`, `*.kt`):
```
Grep: ^(package |import |public class |class |interface |fun |public .* void |private .* void )
```

**Ruby** (`*.rb`):
```
Grep: ^(require|require_relative|class |module |def )
```

**C/C++** (`*.c`, `*.cpp`, `*.h`, `*.hpp`):
```
Grep: ^(#include |void |int |class |struct |namespace |template)
```

**Swift** (`*.swift`):
```
Grep: ^(import |class |struct |enum |protocol |func |extension )
```

**PHP** (`*.php`):
```
Grep: ^(use |namespace |class |interface |function |trait )
```

### Step 3: Build Graph JSON

```json
{
  "version": "1.0",
  "root": "/absolute/path/to/project",
  "scanned_at": "2026-04-10T13:00:00Z",
  "partial": false,
  "stats": {
    "files": 47,
    "nodes": 312,
    "edges": 198,
    "languages": ["typescript", "python"],
    "scan_duration_ms": 1200
  },
  "nodes": {
    "src/auth.ts": {
      "type": "module",
      "language": "typescript",
      "exports": ["authenticate", "AuthMiddleware", "TokenPayload"],
      "imports": ["src/db.ts", "src/config.ts"],
      "functions": ["authenticate", "validateToken", "refreshSession"],
      "classes": ["AuthMiddleware"],
      "interfaces": ["TokenPayload"],
      "lines": 245,
      "hash": "sha256:a1b2c3d4..."
    }
  },
  "edges": [
    {
      "from": "src/auth.ts",
      "to": "src/db.ts",
      "type": "imports",
      "symbols": ["query", "pool"]
    },
    {
      "from": "src/routes/api.ts",
      "to": "src/auth.ts",
      "type": "imports",
      "symbols": ["authenticate"]
    },
    {
      "from": "tests/auth.test.ts",
      "to": "src/auth.ts",
      "type": "tests"
    }
  ]
}
```

### Step 4: Generate Blast Cache

For each file, pre-compute its blast radius (BFS, max depth 3):
- Direct dependents: files that import this file
- Indirect dependents: files that import direct dependents
- Test files: files in `test/`, `tests/`, `__tests__/`, `*test*`, `*spec*` that import this file

Store in `blast-cache.json`:
```json
{
  "src/auth.ts": {
    "direct": ["src/routes/api.ts", "src/middleware/cors.ts"],
    "indirect": ["src/routes/user.ts"],
    "tests": ["tests/auth.test.ts", "tests/api.test.ts"],
    "risk_score": 0.72
  }
}
```

**Risk score**: `(direct_deps × 0.5 + indirect_deps × 0.3 + test_count × 0.2) / max_possible`

### Step 5: Generate Architecture Summary

Write `architecture.md`:
```markdown
# Architecture: <project-name>
Generated: YYYY-MM-DD

## Overview
- Files: 47 source files across 2 languages
- Modules: 5 top-level directories
- Entry points: src/app/layout.tsx, src/pages/api/

## Module Map
- src/app/ (12 files) — Next.js App Router pages
- src/lib/ (8 files) — shared utilities, auth, db
- src/components/ (15 files) — React components
- src/styles/ (3 files) — CSS modules
- tests/ (9 files) — test suites

## Hotspots (most depended-on files)
1. src/lib/db.ts — 12 dependents (risk: high)
2. src/lib/auth.ts — 8 dependents (risk: high)
3. src/components/Button.tsx — 6 dependents (risk: medium)

## Orphans (no dependents, not entry points)
- src/lib/legacy-parser.ts
- src/utils/deprecated.ts

## Coupling Clusters
- Auth cluster: auth.ts ↔ session.ts ↔ middleware.ts (tightly coupled)
- UI cluster: Button.tsx, Input.tsx, Modal.tsx (shared by 80% of pages)
```

### Step 6: Update Project Memory

After building the graph, update `~/.claude/memory/projects/<slug>.md`:
- Set `## Architecture` section from the generated architecture summary
- Set `## Tech Stack` from detected languages and frameworks

## Performance

- Target: full graph build in <30 seconds for projects with <500 files
- Files >1000 lines: extract only the first 200 lines for structure (imports/exports are at the top)
- Binary files: skip entirely
- Minified files: skip (detect by avg line length >200)

## Failure Modes

- If a file can't be parsed: skip it, log a warning, continue
- If the project is too large (>2000 files): build partial graph of top-level modules only, warn the user
- If Glob/Grep fails: fall back to reading file lists from `git ls-files`
