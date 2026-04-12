---
name: migration-planner
description: This skill should be used when the user asks to "upgrade React", "migrate to Next.js 15", "update TypeScript", "plan a migration", "upgrade a framework", or when dep-analyzer flags a major version update that requires a migration. It creates step-by-step migration plans with breaking change analysis, affected file mapping, and rollback strategies.
version: 4.0.0
---

# Migration Planner

Plan framework and library upgrades safely. Know what breaks before you break it.

## Why This Exists

Major version upgrades are the most dangerous routine maintenance task. They touch every file that imports the upgraded package, often require API changes, and can cascade into hours of debugging. This skill turns "upgrade X" into a structured, testable plan.

## When to Activate

- When the user asks to upgrade a framework or library to a new major version
- When dep-analyzer flags a major version update with breaking changes
- When the user is planning a technology migration (e.g., CRA → Vite, Express → Fastify)
- When a library deprecation notice requires switching to an alternative

## Migration Planning Process

### Step 1: Assess Current State

1. **Identify current version**: read package.json, Cargo.toml, go.mod, etc.
2. **Identify target version**: user-specified or latest stable
3. **Map usage scope**: Grep for all imports of the package across the codebase
4. **Count affected files**: how many files import this package directly?
5. **Check transitive dependencies**: what other packages depend on the one being upgraded?

```
## Migration Assessment: react 18.2.0 → 19.1.0

Current version: 18.2.0
Target version: 19.1.0
Direct imports: 47 files
Transitive dependents: 12 packages (react-dom, react-router, ...)
Test files affected: 23
```

### Step 2: Analyze Breaking Changes

1. **Check local changelog**: `node_modules/<package>/CHANGELOG.md` if available
2. **Search for migration guide**: Grep for common migration doc patterns
3. **Map deprecated APIs**: list APIs marked deprecated in current version
4. **Map removed APIs**: list APIs removed in target version
5. **Map changed APIs**: list APIs with signature changes

```
### Breaking Changes: react 18 → 19

Removed APIs:
  - ReactDOM.render() → use createRoot()
  - ReactDOM.hydrate() → use hydrateRoot()
  
Changed APIs:
  - useRef() now requires explicit initial value
  - forwardRef() no longer needed (ref is a regular prop)

Deprecated (still works, remove later):
  - propTypes (use TypeScript instead)
```

### Step 3: Map Affected Code

For each breaking change, find affected code:

```
### Affected Code Map

ReactDOM.render() — 3 files:
  - src/index.tsx:8 — app entry point
  - src/test-utils.tsx:12 — test renderer
  - tests/setup.ts:5 — test setup

forwardRef() — 7 files:
  - src/components/Button.tsx:15
  - src/components/Input.tsx:22
  - src/components/Modal.tsx:8
  - ... (4 more)
```

### Step 4: Generate Migration Plan

Produce an ordered, phased plan:

```markdown
## Migration Plan: react 18 → 19

### Phase 1: Preparation (non-breaking)
1. Update TypeScript types: @types/react@19
2. Fix all existing deprecation warnings
3. Add React 19 compatibility checks to CI
4. Ensure all tests pass on current version

### Phase 2: Core Migration
5. Update react and react-dom to 19.1.0
6. Replace ReactDOM.render() with createRoot() (3 files)
7. Replace ReactDOM.hydrate() with hydrateRoot() (if applicable)
8. Update useRef() calls to include initial values (scan all components)

### Phase 3: Cleanup
9. Remove forwardRef() wrappers (7 files)
10. Remove propTypes declarations (if using TypeScript)
11. Update test utilities for React 19 testing patterns

### Phase 4: Validation
12. Run full test suite
13. Manual smoke test of critical flows
14. Run dep-analyzer to check for peer dep conflicts
15. Update documentation

### Rollback Strategy
- Git branch: `migration/react-19`
- Revert: `git checkout main -- package.json package-lock.json`
- All changes are incremental — each phase can be reverted independently

### Risk Assessment
- Estimated effort: Medium (47 files, 3 API changes)
- Risk: Low-Medium (well-documented migration, no custom React internals)
- Recommended approach: Phase 1-2 in one PR, Phase 3 in follow-up
```

### Step 5: Generate Workstreams

If the migration is large enough for orchestration (Class C/D):

1. Group changes by phase into workstreams
2. Identify which phases can run in parallel
3. Output a task-decomposer-compatible DAG
4. Include test-mapper scoping for each workstream

## Supported Ecosystems

| Ecosystem | Version Source | Common Migrations |
|---|---|---|
| JavaScript/TypeScript | package.json | React, Next.js, Vue, Angular, Express |
| Python | pyproject.toml, requirements.txt | Django, Flask, FastAPI, SQLAlchemy |
| Rust | Cargo.toml | Major crate updates, edition changes |
| Go | go.mod | Major module updates |
| Ruby | Gemfile | Rails, Sidekiq |
| Java/Kotlin | build.gradle, pom.xml | Spring Boot, Gradle versions |

## Integration

- **dep-analyzer**: triggers migration-planner for flagged major updates
- **graph-navigator**: maps full dependency chain of the package being upgraded
- **task-decomposer**: migration phases become workstreams for orchestration
- **test-mapper**: scoped tests per migration phase
- **rollback**: migration branches support selective rollback
- **project-memory**: migration decisions and constraints stored per-project

## Rules

1. **Never upgrade blindly.** Always analyze breaking changes before running `npm install`.
2. **Phase the migration.** One giant PR is harder to review and debug than phased changes.
3. **Keep it revertible.** Every phase should be independently revertible.
4. **Test between phases.** Run relevant tests after each phase, not just at the end.
5. **Check peer dependencies.** A React upgrade may require updating react-router, react-dom, etc.
6. **Don't migrate and refactor simultaneously.** Migration PRs should only contain migration changes.
