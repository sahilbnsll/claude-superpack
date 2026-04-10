---
name: graph-navigator
description: This skill should be used when the user asks architecture questions ("what depends on X?", "show me the import chain", "which files have no tests?", "what's the most coupled module?"), when exploring unfamiliar codebases, or when planning refactors that need structural understanding.
version: 3.0.0
---

# Graph Navigator

Answer architecture questions using the codebase graph. Explore dependencies, identify hotspots, detect patterns.

## Why This Exists

Codebase understanding shouldn't require reading every file. The graph captures structural relationships, so questions about dependencies, coupling, coverage, and architecture can be answered by querying the graph instead of grepping through source code.

## Preconditions

- Graph exists at `~/.claude/graphs/<project-slug>/graph.json`
- If no graph: trigger `graph-builder` first (full or lazy depending on question scope)

## Query Types

### Dependency Queries

**"What depends on X?"**
1. Look up file X in `graph.json` edges where `to == X`
2. Return all direct and indirect dependents
3. Format as a dependency tree

**"What does X depend on?"**
1. Look up file X's `imports` in nodes
2. Resolve all edges where `from == X`
3. Format as import tree

**"Show the import chain from A to B"**
1. BFS from A to B through import edges
2. Return the shortest path
3. If no path exists, say so

**"What are the circular dependencies?"**
1. Detect cycles in the import graph (using DFS with back-edge detection)
2. Report each cycle with the files involved
3. Suggest which edge to break

### Architecture Queries

**"Give me an architecture overview"**
1. Read `~/.claude/graphs/<slug>/architecture.md` if it exists
2. If stale or missing, regenerate from `graph.json`:
   - Group files by top-level directory
   - Count files, functions, classes per group
   - Identify entry points (files with no importers)
   - Identify hotspots (files with most dependents)
   - Detect layers (e.g., routes → services → db)

**"What's the most coupled module?"**
1. For each file, count: inbound edges (dependents) + outbound edges (dependencies)
2. Coupling score = inbound × outbound
3. Return top 5 most coupled files

**"Which files are dead code?"**
1. Find files with zero inbound edges (no one imports them)
2. Exclude: entry points (main, index, app, layout), test files, config files
3. Report as potential dead code candidates (not guaranteed — could be CLI commands or cron jobs)

### Coverage Queries

**"Which files have no tests?"**
1. Scan edges for `type: "tests"`
2. Find source files that have no test edge pointing to them
3. Report sorted by risk score (high-risk files without tests first)

**"What tests cover X?"**
1. Look up edges where `to == X` and `type == "tests"`
2. Also check indirect: tests that import files which import X
3. Return test files with coverage depth

### Refactoring Queries

**"If I rename X, what breaks?"**
1. Find all files that import symbols from X
2. List each import site with the specific symbol imported
3. Estimate: number of files to update, risk of breakage

**"If I move X to Y, what breaks?"**
1. Same as rename, plus: check if any relative import paths would change
2. Report all import statements that need updating

**"If I delete X, what breaks?"**
1. Find all dependents of X
2. For each, check if X is the only provider of the imported symbol
3. If a symbol is available from another module, note it as "safe to delegate"

## Cross-Project Queries

If the user has multiple projects with graphs:

**"Have I solved this pattern before?"**
1. Scan all graphs in `~/.claude/graphs/`
2. Look for similar file structures, module patterns, or tech stacks
3. Report relevant patterns from other projects

**"Compare architectures"**
1. Load multiple `architecture.md` files
2. Compare: languages, module counts, coupling scores, test coverage
3. Highlight differences

## Output Format

Always structure responses as:

```markdown
## [Query Type]: [specific query]

### Result
[Direct answer to the question]

### Details
[Supporting data — dependency trees, file lists, scores]

### Recommendation
[Actionable suggestion based on the findings]
```

## Performance

- **Small queries** (single file lookup): answer from `graph.json` directly, ~50 tokens
- **Architecture overview**: read `architecture.md` if available, ~200 tokens
- **Cross-project**: scan `index.json` files first to identify relevant projects before loading full graphs
- **Never read source files** for navigation queries. The graph has all the structural info.
