# <Change name>

<!--
Durable task state. This file, not the conversation, is what survives a context reset,
a compaction, a crash, or handing the work to someone else.

Update it as you go — mark steps done, record decisions and what surprised you. A plan
file that was written once and never touched again is documentation, not state.

Delete this comment when you fill it in.
-->

**Status** — not started | in progress (step N) | blocked | done
**Scope / Risk** — S_ / R_
**Updated** — YYYY-MM-DD

## Goal

One sentence, in outcome terms. What is true when this is finished that is not true now.

## Not doing

The adjacent things deliberately excluded, so the next reader does not think they were
forgotten. Include anything raised and declined.

## Blast radius

- **Code** — which modules and which callers.
- **Data** — what is read, written, or migrated.
- **Environments** — local, staging, production.
- **Who notices if it is wrong** — a test, an alert, or a customer. If it is a customer,
  that is a finding.

## Steps

Each step leaves the repository in a working, committable state, and each has a
verification that would fail if the step did not work.

| # | Step | Verified by | Status |
|---|---|---|---|
| 1 | | | |
| 2 | | | |
| 3 | | | |

## Rollback

| Step | How to undo | Still possible after? |
|---|---|---|
| 1 | | yes |
| 2 | | yes |
| 3 | | **no — point of no return** |

Name the step after which rollback stops working, and confirm with the user before
crossing it.

## Decisions

Recorded as they are taken, with the reason — the reason is what changes later.

| Date | Decision | Why | Alternative rejected |
|---|---|---|---|

## Open questions

| Question | Blocks | Who answers | Answer |
|---|---|---|---|

## Log

Append-only. What was done, what was learned, what was surprising. This is what a future
session reads first.

- **YYYY-MM-DD** —
