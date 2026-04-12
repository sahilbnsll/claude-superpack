---
name: graph-updater
description: This skill should be used after any file modification in the current project, when the user runs "update the graph", or when graph-meta.json indicates stale data. It incrementally updates the codebase graph without requiring a full rebuild.
version: 4.0.0
---

# Graph Updater

Keep the codebase graph current without full rebuilds. Incremental, hash-based change detection.

## Why This Exists

Full graph builds are expensive. After editing a file, only that file's structure and edges need re-scanning. This skill detects what changed and updates only the affected nodes and edges.

## When to Run

### Automatic (implicit)

After graph-dependent skills detect stale data:
- `graph-reviewer` finds a file has changed since the graph was built (hash mismatch)
- `graph-navigator` can't find a file that exists on disk
- `graph-builder` detects >5% file hash mismatches during a lazy build

### Manual (explicit)

- User says: "update the graph", "refresh the graph"
- After a large refactor or merge

### Suggested

- If `graph-meta.json` shows >20% of files have changed: suggest a full rebuild instead
- If the graph is >7 days old: suggest an update

## Update Process

### 1. Detect Changes

Compare current file hashes against `graph-meta.json`:

```
Method 1 (fast): git diff --name-only <last-scan-commit>
Method 2 (reliable): compute SHA-256 of each source file, compare against stored hashes
```

Categorize:
- **Modified**: file exists in graph and on disk, but hash differs
- **Added**: file exists on disk but not in graph
- **Deleted**: file exists in graph but not on disk

### 2. Update Nodes

For each **modified** file:
1. Re-extract structure (same extraction logic as graph-builder, step 2)
2. Replace the node in `graph.json`
3. Update the hash in `graph-meta.json`

For each **added** file:
1. Extract structure
2. Add node to `graph.json`
3. Add hash to `graph-meta.json`

For each **deleted** file:
1. Remove node from `graph.json`
2. Remove hash from `graph-meta.json`

### 3. Update Edges

For each changed file:
1. Remove all edges where `from == file` (outbound imports)
2. Re-extract import statements
3. Add new edges based on current imports
4. Remove edges where `to == file` if the file was deleted

For edges pointing TO a changed file:
1. Check if exported symbols still exist
2. If an export was removed: flag as a potential breaking change

### 4. Invalidate Blast Cache

For each changed file:
1. Remove its entry from `blast-cache.json`
2. Remove entries for all its direct dependents (their blast radius changed too)
3. The cache will be rebuilt on-demand by graph-reviewer

### 5. Update Statistics

Recalculate and update `graph-meta.json`:

```json
{
  "last_full_scan": "2026-04-10T13:00:00Z",
  "last_incremental_update": "2026-04-10T15:30:00Z",
  "last_scan_commit": "abc123f",
  "total_files": 47,
  "total_nodes": 312,
  "total_edges": 198,
  "stale_percentage": 0,
  "file_hashes": {
    "src/auth.ts": "sha256:a1b2c3...",
    "src/db.ts": "sha256:d4e5f6..."
  }
}
```

### 6. Regenerate Architecture (if significant changes)

If >10% of nodes were modified, added, or deleted:
- Regenerate `architecture.md`
- Update project-memory's `## Architecture` section

If <10%: skip architecture regeneration (not worth the cost).

### 7. Report

```
## Graph Update Summary

Changes detected: 3 modified, 1 added, 0 deleted
Nodes updated: 4
Edges updated: 12 removed, 15 added
Blast cache: 8 entries invalidated
Architecture: regenerated (15% of nodes changed)

Graph status: ✅ current (48 files, 315 nodes, 201 edges)
```

## Efficiency Rules

1. **Never re-scan unchanged files**. Hash comparison is the gate.
2. **Batch updates**: if multiple files changed, process all of them before re-computing edges (avoids redundant work).
3. **Lazy blast cache**: don't rebuild blast cache entries. Let them be computed on-demand.
4. **Git shortcut**: if git is available and clean, use `git diff --name-only` for change detection. Much faster than hashing every file.

## Edge Cases

- **Renamed files**: detected as delete + add. Old edges removed, new edges created. Import statements in other files may become broken — flag this.
- **Moved files**: same as rename. Flag broken imports.
- **New language**: if a new file extension appears that isn't in the supported list, skip it and log a note.
- **Conflicting updates**: if two skills try to update the graph simultaneously, use the most recent `graph-meta.json` timestamp as a lock indicator. The second updater should re-read and merge.
