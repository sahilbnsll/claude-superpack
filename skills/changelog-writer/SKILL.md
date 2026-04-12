---
name: changelog-writer
description: This skill should be used when the user asks to "write a changelog", "update CHANGELOG.md", "what changed since last release?", "prepare release notes", or before publishing a new version. It generates structured changelogs from git history, grouping by type and highlighting breaking changes.
version: 4.0.0
---

# Changelog Writer

Generate structured changelogs from git history. Group by type, highlight breaking changes.

## Why This Exists

Changelogs are tedious to write manually but critical for users. Git log is too noisy — commit messages mix features, fixes, refactors, and typos. This skill parses git history, categorizes changes, and produces a clean, user-facing changelog.

## When to Activate

- When the user asks for a changelog or release notes
- Before publishing a new version (npm publish, git tag, GitHub release)
- When the user asks "what changed since X?"
- After session-recap, if the session involved version-bumping work

## Changelog Generation

### Step 1: Determine Range

Find what to diff:

1. **Tag-based**: `git tag --sort=-v:refname | head -5` → diff from last tag
2. **Date-based**: if user specifies "since last week" → `git log --since="1 week ago"`
3. **Commit-based**: if user specifies "since commit X" → `git log X..HEAD`
4. **Branch-based**: if on a release branch → `git log main..HEAD`

Default: from the last git tag to HEAD.

### Step 2: Parse Commits

```bash
git log <range> --pretty=format:"%H|%s|%an|%ai" --no-merges
```

For each commit, extract:
- **Hash**: for linking
- **Message**: the commit subject line
- **Author**: who made the change
- **Date**: when

### Step 3: Categorize

Parse commit messages using conventional commits patterns:

| Prefix | Category | Changelog Section |
|---|---|---|
| `feat:` / `feature:` | Feature | Added |
| `fix:` / `bugfix:` | Bug fix | Fixed |
| `docs:` | Documentation | Documentation |
| `refactor:` | Refactoring | Changed |
| `perf:` | Performance | Performance |
| `test:` | Testing | (omit from changelog) |
| `chore:` / `build:` / `ci:` | Maintenance | (omit from changelog) |
| `BREAKING CHANGE:` or `!:` | Breaking | Breaking Changes |

**Non-conventional commits:** Infer category from the message:
- Contains "fix", "resolve", "patch" → Fixed
- Contains "add", "implement", "create", "new" → Added
- Contains "update", "change", "modify", "refactor" → Changed
- Contains "remove", "delete", "drop" → Removed
- Contains "deprecate" → Deprecated
- Falls through → Changed

### Step 4: Generate Changelog

Follow [Keep a Changelog](https://keepachangelog.com/) format:

```markdown
## [4.0.0] — YYYY-MM-DD

### Breaking Changes
- Description of breaking change ([commit](link))

### Added
- New feature description ([commit](link))

### Fixed
- Bug fix description ([commit](link))

### Changed
- Change description ([commit](link))

### Removed
- Removed feature description ([commit](link))

### Performance
- Performance improvement description ([commit](link))

### Documentation
- Doc update description ([commit](link))
```

### Step 5: Write or Update

1. If `CHANGELOG.md` exists: prepend new version section after the header
2. If `CHANGELOG.md` doesn't exist: create with header and first version
3. Present for review before writing

## Smart Grouping

When multiple commits relate to the same feature:

1. Group by shared file paths or common keywords
2. Summarize as a single entry with sub-bullets if needed
3. Example: 5 commits all touching `src/auth/` → "Refactored authentication module (5 commits)"

## Breaking Change Detection

Flag as breaking if:
- Commit message contains `BREAKING CHANGE:` or uses `!:` suffix
- A public API function was removed or its signature changed
- A configuration format changed
- A minimum supported version increased (Node, Python, etc.)

## Output

```
## Changelog Preview: v3.0.0 → v4.0.0

### Breaking Changes (1)
- Install now creates symlinks for skill discovery (install.js)

### Added (6)
- test-mapper: map tests to source files
- dep-analyzer: dependency health analysis
- session-recap: end-of-session summaries
- doc-generator: auto-generate documentation
- clarifier: smart clarifying questions
- changelog-writer: structured changelog generation

### Fixed (2)
- Skills now discoverable via / autocomplete
- Removed duplicate skill directories

### Changed (1)
- Updated 5 core skill versions from 2.0.0 to 4.0.0

Write to: CHANGELOG.md? (y/n)
```

## Integration

- **session-recap**: changelog data feeds into session summaries
- **memory-manager**: version releases are recorded in project memory
- **pattern-tracker**: release frequency and size tracked as project patterns

## Rules

1. **User-facing only.** Omit test, chore, and CI commits unless the user asks for them.
2. **Summarize, don't list commits.** Group related changes into human-readable entries.
3. **Always flag breaking changes.** These go at the top, in bold if needed.
4. **Link to commits.** Include short hashes for traceability.
5. **Present before writing.** The user reviews and approves the changelog before it's saved.
6. **Match existing format.** If the project already has a CHANGELOG.md, match its conventions.
