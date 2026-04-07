---
name: conflict-detector
description: This skill should be used when the user asks to "avoid merge conflicts across agents", "check whether these workstreams can run in parallel", "split changes across agents safely", or whenever multiple planned workstreams may touch the same files, generated outputs, schemas, or tests.
version: 1.0.0
---

# Conflict Detector

Check planned workstreams for overlapping write surfaces before any parallel worker execution begins.

## Goal

Prevent parallel workers from corrupting each other's output by finding collisions early and forcing a safer execution order when needed.

## Detection Workflow

1. List the explicit files and directories each workstream expects to edit.
2. Expand implicit write surfaces:
   - snapshots,
   - generated code,
   - lockfiles,
   - shared fixtures,
   - migrations,
   - changelogs and docs derived from the same feature.
3. Classify overlap severity:
   - `none`
   - `low`
   - `medium`
   - `hard-blocker`
4. Recommend one action:
   - `parallelize`
   - `parallelize-with-tight-ownership`
   - `serialize`
   - `merge-into-one-workstream`

## Hard Blockers

Treat these as non-parallel unless the write scope is redefined:

- the same file appears in multiple workstreams,
- two workstreams edit the same database migration chain,
- two workstreams regenerate the same artifact,
- multiple workstreams rewrite the same test snapshot,
- one workstream changes an API contract while another consumes it.

## Medium-Risk Cases

Require caution when workstreams share:

- a directory with barrel exports,
- shared type definitions,
- route registration,
- public documentation for a changing surface,
- end-to-end tests that depend on both changes landing together.

## Output Shape

For each workstream pair, report:

- `pair`
- `shared_surface`
- `severity`
- `why`
- `recommended_action`

Conclude with a single overall verdict for the orchestrator.

## Decision Rule

When in doubt, downgrade concurrency. False negatives are worse than false positives here.
