# Parallel and multi-agent execution

When splitting work across agents pays, how to split it safely, and how to bring it back together.

**Division of labour:** if `superpowers` is installed, its `dispatching-parallel-agents` and `using-git-worktrees` skills own the mechanics. This file is the decision — whether to parallelise at all, and how to partition without creating a merge problem that costs more than the parallelism saved.

## Parallelism is usually the wrong answer

Coordination has a fixed cost: spawning, briefing each agent with enough context to be useful, reviewing output you did not watch being produced, and merging. That cost is paid whether or not the work was actually independent.

**Parallelise when all four hold:**

1. The workstreams touch **disjoint file sets** — verified, not assumed.
2. Each has a **self-contained brief**: enough context to work without asking questions.
3. Each is **independently verifiable** — its own tests or checks that pass on their own.
4. The serial version would genuinely take long enough to matter.

**Do not parallelise when** the work shares a type or interface that all streams need to change, when one stream's design decisions constrain another's, when the streams edit the same configuration or lockfile, or when the whole job is under an hour serially.

Sequential execution with clear phases beats parallel execution with a merge conflict almost every time.

## Partitioning

Split along the axis with the fewest shared files. In rough order of how cleanly they usually separate:

- **By layer** — frontend, API, schema. Clean only if the contract between them is agreed *first* and frozen.
- **By feature area** — separate directories, separate routes. Usually the cleanest split.
- **By concern** — implementation, tests, documentation. Tempting and often wrong: the test author needs the implementation to exist.
- **By file** — for mechanical changes across many files with one pattern. The safest split, and the one where parallelism pays least.

Before dispatching, list every file each stream will touch and check for intersections. Shared files that always cause trouble: lockfiles, barrel/index exports, shared type definitions, route registries, CI configuration, migration directories with sequential numbering, and generated output.

If two streams need the same file: either serialise them, or have one stream own that file and the other declare its requirement as part of the brief.

## Briefing an agent

A subagent starts with none of your context. The brief is the whole interface, and most parallel failures are brief failures.

Include: the goal in one sentence · the exact files it may change and those it must not · the conventions it must follow (or the recon output) · how to verify its own work · what to report. Exclude: your reasoning about other streams, and anything it cannot act on.

Assume the agent will interpret ambiguity differently from you. Where the shape of the output matters, specify it.

## Integration

- Isolate the work — git worktrees or branches — so a failed stream is discarded rather than untangled.
- Merge in dependency order: schema before the code that uses it, types before consumers.
- **After merging, verify the whole, not the parts.** Each stream passing its own checks says nothing about their interaction — that is exactly where integration bugs live. Run the full gate set on the merged result.
- **Check the diff, not the report.** An agent reporting success is a claim. `git diff` is evidence. Confirm each stream changed what it was asked to change, and nothing else.
- If two streams solved the same problem differently, do not keep both. Pick one and make it consistent.

## Failure modes

| Symptom | Usual cause |
|---|---|
| Merge conflicts in every stream | Partitioned by concern rather than by file ownership |
| Agent produced something unrelated | Brief lacked scope boundaries and verification criteria |
| All streams pass, integration fails | Nobody verified the merged whole; contract between streams was assumed |
| Parallel run took longer than serial | Coordination overhead on work that was too small to split |
| Two different implementations of one helper | No shared-code ownership assigned |
| Agent reported success, nothing changed | The report was trusted without checking the diff |

## Evidence

1. **The file-intersection check** before dispatch, showing the sets are disjoint.
2. **The merged diff**, read in full — not the individual stream reports.
3. **Full gate run on the integrated result**, not on each branch separately.
4. **Per-stream scope verification**: each changed only what it owned.
