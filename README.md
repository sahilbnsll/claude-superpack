# Claude Superpack

**33-skill agentic system for Claude Code.** Orchestration + persistent memory + codebase knowledge graph + security + testing + documentation + token optimization + workflow automation + self-improving learning — all zero-dependency.

## What It Does

Claude Superpack transforms Claude Code from a single-shot assistant into a **persistent, self-improving agent** that remembers across sessions, maps your codebase structurally, scans for security issues, generates tests and docs, learns from its mistakes, and orchestrates complex tasks across parallel workers.

### Quick Examples

**Simple task** — answered directly, no overhead:
```text
> Explain how the authentication middleware works.

Classification: A | Route: direct
```

**Complex task** — full orchestration pipeline:
```text
> Fix the auth validation bug, add regression tests, and update the README.

Classification: C | Route: parallel-orchestrate
Pre-flight: ✅ 7/7 checks passed
Workers: 3 spawned (auth-fix, tests, docs)
Post-review: ✅ lint, typecheck, tests passed
```

**Memory query** — recalls past sessions:
```text
> Remember what we decided about the database schema?

Memory Search: 2 results
  [decision] 2026-04-04: Switched to array-based schema for flexibility
  [decision] 2026-04-06: Added multi-provider AI failover
```

**Security scan** — catches issues before commit:
```text
> Commit these changes

Security Scan: 1 critical (hardcoded API key in src/lib/api.ts:23)
Fix: Move to environment variable
```

**Blast radius** — reads only what matters:
```text
> Review the changes to src/auth.ts

Blast Radius: 5 files (vs 47 total)
Token savings: ~87%
```

---

## Skills (33)

### 🎯 Orchestration (6 skills)

Intelligent task routing, clarification, and parallel execution.

| Skill | Purpose |
|---|---|
| **auto-router** | Classifies requests A/B/C/D, routes to simplest sufficient workflow |
| **clarifier** | Asks targeted clarifying questions before starting ambiguous work |
| **task-decomposer** | Breaks complex requests into DAGs with IDs, dependencies, model tiers |
| **conflict-detector** | Maps write surfaces, detects overlaps, forms parallel groups |
| **parallel-orchestrator** | Spawns isolated workers via Agent tool or safe-summon |
| **merge-coordinator** | Validates scope, detects conflicts, produces structured summaries |

### 🧠 Memory (4 skills)

Persistent context across sessions. No external databases — pure markdown.

| Skill | Purpose |
|---|---|
| **memory-manager** | Session lifecycle: load memory at start, record during work, prune on exit |
| **project-memory** | Per-project state: tech stack, architecture, known issues, decisions |
| **memory-search** | Query past context: keyword, tag, temporal, and optional semantic search |
| **memory-consolidator** | Nightly distillation: extract patterns from recent, promote to long-term |

**Storage**: `~/.claude/memory/` (recent.md, long-term.md, projects/)

### 🗺️ Knowledge Graph (5 skills)

Structural codebase mapping with zero external dependencies. No Tree-sitter, no SQLite, no pip install — works on first prompt.

| Skill | Purpose |
|---|---|
| **graph-builder** | Build structural map using only Glob/Grep/Read. 12 languages, lazy build |
| **graph-reviewer** | Blast-radius-aware code review. Reads 80-90% fewer files |
| **graph-navigator** | Answer architecture questions: deps, coupling, dead code, coverage |
| **graph-updater** | Incremental hash-based updates. No full rebuilds needed |
| **codebase-onboarder** | Generate architecture summaries for new contributors from graph data |

**Storage**: `~/.claude/graphs/<project-slug>/` (graph.json, blast-cache.json, architecture.md)

### 🔒 Security (1 skill)

Catch vulnerabilities before they reach production.

| Skill | Purpose |
|---|---|
| **security-scanner** | Scan for hardcoded secrets, injection risks, OWASP top 10 patterns — zero dependencies |

### 🔍 Token Efficiency (3 skills)

Make every token count.

| Skill | Purpose |
|---|---|
| **context-budget** | Running token usage estimate with threshold warnings and compaction protocol |
| **smart-discovery** | Intelligent file selection: gitignore-aware, recency-biased, graph-aware |
| **skill-reuse-detector** | Check installed skills before implementing — stop reinventing wheels |

### 🧪 Quality & Testing (3 skills)

Targeted testing and dependency health.

| Skill | Purpose |
|---|---|
| **test-mapper** | Map source files to test files, run only relevant tests per workstream |
| **test-generator** | Auto-generate test stubs from function signatures, matching project patterns |
| **dep-analyzer** | Track outdated/vulnerable dependencies, flag breaking upgrade risks |

### 🔄 Workflow (3 skills)

Safety nets for orchestrated execution.

| Skill | Purpose |
|---|---|
| **pre-flight** | Validate environment before workers: git, tools, deps, disk, memory, graph |
| **post-review** | Auto-review after merge: scoped lint, typecheck, test subset |
| **rollback** | Undo by workstream: selective, git-aware, always confirms before acting |

### 📝 Documentation (2 skills)

Keep docs in sync with code.

| Skill | Purpose |
|---|---|
| **doc-generator** | Generate/update READMEs, API docs, JSDoc/docstrings from code changes |
| **changelog-writer** | Generate structured changelogs from git history with breaking change detection |

### 🔀 Migration & Maintenance (2 skills)

Plan upgrades and keep the codebase clean.

| Skill | Purpose |
|---|---|
| **migration-planner** | Plan framework/library upgrades with breaking change analysis and phased rollout |
| **dead-code-finder** | Identify unused exports, orphan files, and stale imports via graph + grep analysis |

### 💬 Communication (1 skill)

Structured session management.

| Skill | Purpose |
|---|---|
| **session-recap** | End-of-session summary: accomplishments, decisions, pending work, handoff context |

### 🎓 Learning (3 skills)

Self-improving agent that gets better over time.

| Skill | Purpose |
|---|---|
| **pattern-tracker** | Track classification decisions + outcomes. Feed stats back to auto-router |
| **user-profiler** | Learn preferences from behavior: code style, tools, communication. Apply silently |
| **error-catalog** | Persistent error+fix database. Pattern matching before debugging from scratch |

---

## Architecture

```text
User request
   │
   ▼
auto-router (classify A/B/C/D)
   │
   ├── clarifier ────────────── resolve ambiguity (if needed)
   ├── skill-reuse-detector ─── check existing skills
   ├── memory-manager ───────── load session context
   ├── context-budget ───────── track token usage
   │
   ├── A ──▶ direct answer
   ├── B ──▶ smart-discovery ──▶ single-agent execution
   ├── C ──▶ pre-flight ──▶ task-decomposer ──▶ conflict-detector
   │                │                                    │
   │                │                          parallel-orchestrator
   │                │                                    │
   │                │                            [worker agents]
   │                │                                    │
   │                │                          merge-coordinator
   │                │                                    │
   │                │                       security-scanner + post-review
   │                │                                    │
   │                ▼                            pattern-tracker
   └── D ──▶ serial complex (same pipeline, sequential workers)

Background (always active):
  memory-manager ──▶ record decisions ──▶ memory-consolidator
  graph-updater ──▶ keep graph current
  user-profiler ──▶ learn preferences
  error-catalog ──▶ catalog errors + fixes
  context-budget ──▶ track token usage
```

## Installation

### npm install (via GitHub Packages)

Recommended. Requires Node.js 18+.

1. Configure npm to find the package:

```bash
echo "@sahilbnsll:registry=https://npm.pkg.github.com" >> ~/.npmrc
```

2. Install globally:

```bash
npm install -g @sahilbnsll/claude-superpack
```

The postinstall script:
- Copies all 33 skills to `~/.claude/skills/claude-superpack`
- Symlinks each skill into `~/.claude/skills/<name>` so Claude Code discovers them
- Creates `~/.claude/memory/` directory structure
- Initializes memory files (recent.md, long-term.md, index.json)

Skills are discoverable via `/` autocomplete in your next Claude Code session.

### Git clone (alternative)

```bash
git clone https://github.com/sahilbnsll/claude-superpack ~/.claude/skills/claude-superpack
cd ~/.claude/skills/claude-superpack && node scripts/install.js
```

### Uninstall

```bash
# npm
npm uninstall -g @sahilbnsll/claude-superpack

# git clone
node ~/.claude/skills/claude-superpack/scripts/uninstall.js
# or manually:
rm -rf ~/.claude/skills/claude-superpack
```

## CLI

```bash
claude-superpack status               # Overall status
claude-superpack skills               # List all 33 skills by category
claude-superpack memory               # Memory system stats
claude-superpack memory consolidate   # Run memory consolidation
claude-superpack graph                # Knowledge graph stats
claude-superpack install              # Reinstall skills
claude-superpack uninstall            # Remove skills
claude-superpack version              # Show version
```

### Scheduled Consolidation (optional)

Run memory consolidation nightly via cron:

```bash
# Add to crontab
(crontab -l 2>/dev/null; echo "0 2 * * * node ~/.claude/skills/claude-superpack/scripts/consolidate-memory.js --quiet") | crontab -
```

## Runtime Requirements

- `bash`, `python3`, `timeout`/`gtimeout`, `git`
- **No external databases.** Memory uses markdown files. Graph uses JSON files.
- **Optional**: ChromaDB + Gemini API key for semantic memory search (graceful degradation to grep without them)

## Token Efficiency

Superpack v4 treats context as the most expensive resource:

- **Smart discovery**: gitignore-aware, recency-biased, graph-aware file selection
- **Blast radius**: read only affected files during review (~87% fewer tokens)
- **Context budget**: running estimates with proactive compaction suggestions
- **Worker prompts**: under 2,000 tokens each
- **Model tiering**: lightest model per workstream (haiku → sonnet → opus)
- **Compaction protocol**: structured summaries replace raw data after each phase

## Safety Guarantees

- Worker execution is time-bounded with timeout enforcement
- Pre-flight validation before every orchestrated execution
- Security scanning for secrets and injection vulnerabilities before commit
- Post-review validation after every merge
- Rollback with pre-rollback snapshots and always-confirm protocol
- Patch output scanned for secret patterns
- Worker scope validation against assigned file ownership
- Memory and graph data stays local — never transmitted anywhere

## Repository Layout

```text
claude-superpack/
├── .claude-plugin/
│   └── plugin.json
├── .github/workflows/publish.yml
├── package.json
├── scripts/
│   ├── cli.js
│   ├── install.js
│   ├── uninstall.js
│   └── consolidate-memory.js
├── bin/
│   └── safe-summon
├── docs/
├── examples/
└── skills/
    ├── auto-router/          # Orchestration
    ├── clarifier/
    ├── task-decomposer/
    ├── conflict-detector/
    ├── parallel-orchestrator/
    ├── merge-coordinator/
    ├── memory-manager/       # Memory
    ├── project-memory/
    ├── memory-search/
    ├── memory-consolidator/
    ├── graph-builder/        # Knowledge Graph
    ├── graph-reviewer/
    ├── graph-navigator/
    ├── graph-updater/
    ├── codebase-onboarder/
    ├── security-scanner/     # Security
    ├── context-budget/       # Token Efficiency
    ├── smart-discovery/
    ├── skill-reuse-detector/
    ├── test-mapper/          # Quality & Testing
    ├── test-generator/
    ├── dep-analyzer/
    ├── pre-flight/           # Workflow
    ├── post-review/
    ├── rollback/
    ├── doc-generator/        # Documentation
    ├── changelog-writer/
    ├── migration-planner/    # Migration & Maintenance
    ├── dead-code-finder/
    ├── session-recap/        # Communication
    ├── pattern-tracker/      # Learning
    ├── user-profiler/
    └── error-catalog/
```

## Data Directories

Created automatically on install:

```text
~/.claude/memory/              # Persistent memory
├── recent.md                  # Rolling 48-hour context
├── long-term.md               # Distilled patterns & preferences
├── index.json                 # Metadata
└── projects/                  # Per-project state
    └── <project-slug>.md

~/.claude/graphs/              # Codebase graphs (created on first use)
└── <project-slug>/
    ├── graph.json             # Structural map
    ├── graph-meta.json        # File hashes, timestamps
    ├── blast-cache.json       # Cached blast radius
    └── architecture.md        # Auto-generated overview
```

## Contributing

Issues and pull requests are welcome.

```bash
# Validate skills
for f in skills/*/SKILL.md; do head -3 "$f" | grep -q "^---" && echo "✅ $f" || echo "❌ $f"; done

# Validate JSON
python3 -m json.tool .claude-plugin/plugin.json

# Validate bash
bash -n bin/safe-summon

# Validate scripts
node -c scripts/install.js && node -c scripts/cli.js && node -c scripts/consolidate-memory.js
```

## License

MIT
