---
name: dep-analyzer
description: This skill should be used when the user asks "are my dependencies up to date?", "check for vulnerabilities", "what's outdated?", "is it safe to upgrade X?", or when pre-flight needs to validate dependency health before orchestrated execution. It analyzes package dependencies for outdated versions, known vulnerabilities, and breaking upgrade risks.
version: 4.0.0
---

# Dependency Analyzer

Track outdated and vulnerable dependencies. Flag breaking upgrades before they break you.

## Why This Exists

`graph-builder` maps internal imports but ignores external packages. Outdated or vulnerable dependencies are a common source of bugs, security issues, and build failures — especially when upgrading after long periods. This skill bridges that gap.

## When to Activate

- When the user asks about dependency health, outdated packages, or vulnerabilities
- During pre-flight checks for Class C/D orchestrated execution
- When a build or test fails due to dependency issues
- When the user is planning an upgrade or migration

## Analysis Pipeline

### Stage 1: Detect Package Manager

| Signal | Manager | Lockfile |
|---|---|---|
| `package-lock.json` | npm | `package-lock.json` |
| `yarn.lock` | Yarn | `yarn.lock` |
| `pnpm-lock.yaml` | pnpm | `pnpm-lock.yaml` |
| `Pipfile.lock` | Pipenv | `Pipfile.lock` |
| `poetry.lock` | Poetry | `poetry.lock` |
| `requirements.txt` | pip | — |
| `go.sum` | Go modules | `go.sum` |
| `Cargo.lock` | Cargo | `Cargo.lock` |
| `Gemfile.lock` | Bundler | `Gemfile.lock` |

### Stage 2: Outdated Check

Run the appropriate outdated command:

```bash
# npm
npm outdated --json 2>/dev/null

# yarn
yarn outdated --json 2>/dev/null

# pnpm
pnpm outdated --format json 2>/dev/null

# pip
pip list --outdated --format json 2>/dev/null

# go
go list -m -u all 2>/dev/null

# cargo
cargo outdated --format json 2>/dev/null
```

Parse and categorize:
- **Patch updates** (1.2.3 → 1.2.4): safe, usually bug fixes
- **Minor updates** (1.2.3 → 1.3.0): likely safe, new features
- **Major updates** (1.2.3 → 2.0.0): potentially breaking

### Stage 3: Vulnerability Check

```bash
# npm
npm audit --json 2>/dev/null

# yarn
yarn audit --json 2>/dev/null

# pip
pip-audit --format json 2>/dev/null || safety check --json 2>/dev/null

# cargo
cargo audit --json 2>/dev/null
```

Categorize by severity: critical, high, moderate, low.

### Stage 4: Breaking Change Risk

For major version bumps, check:
1. Read the package's CHANGELOG or release notes (if available locally in node_modules)
2. Check if the package has a migration guide
3. Grep the codebase for deprecated APIs mentioned in the changelog
4. Assess impact: how many files import this package?

## Output Format

```
## Dependency Analysis

Package manager: npm (package-lock.json)
Total dependencies: 142 (38 direct, 104 transitive)

### Outdated (12)

| Package | Current | Latest | Type | Risk |
|---|---|---|---|---|
| react | 18.2.0 | 19.1.0 | major | high — breaking API changes |
| next | 14.1.0 | 14.2.3 | minor | low |
| zod | 3.22.0 | 3.23.1 | patch | safe |
| ... | | | | |

### Vulnerabilities (2)

| Package | Severity | Advisory | Fix |
|---|---|---|---|
| lodash | high | Prototype pollution (CVE-2024-XXXX) | Upgrade to 4.17.22+ |
| tar | moderate | Path traversal | Upgrade to 6.2.1+ |

### Recommendations

1. **Immediate**: Fix 2 vulnerabilities (lodash, tar)
2. **Safe batch**: Apply 8 patch updates
3. **Review needed**: react 18→19 (23 files import react)
4. **Defer**: No urgency on remaining minor updates
```

## Integration

- **pre-flight**: dependency health check before orchestrated execution
- **error-catalog**: dependency-related errors (version mismatch, missing peer deps) are cataloged
- **project-memory**: known dependency constraints and decisions stored per-project
- **post-review**: after dependency changes, validate no new vulnerabilities introduced

## Rules

1. **Never auto-upgrade major versions.** Always present the risk assessment first.
2. **Batch safe updates together.** Patch and minor updates can usually be applied in one pass.
3. **Check lockfile freshness.** If lockfile is stale (older than package.json), flag it.
4. **Respect pinned versions.** If a version is pinned (exact, not range), there's probably a reason. Don't recommend upgrading without noting the pin.
5. **Fail gracefully.** If audit/outdated commands aren't available, report what you can and skip what you can't.
