---
name: reviewing-before-done
description: Use after the work is implemented and verified but before reporting it as complete, on any change touching more than one file or carrying shared-code, production, data, or security risk. Not for hunting correctness bugs in a diff — that is what a code review pass does.
version: 5.0.0
license: MIT
metadata:
  layer: review
  pack: claude-superpack
  activation: phase
---

# Reviewing before done

The last pass, on the dimensions a bug-hunting review does not cover: did this actually deliver what was asked, and what did it make worse?

**Division of labour:** if `/code-review` is available, run it for correctness defects — it is better at that than a self-review. If `/simplify` is available, use it for quality cleanups. This skill covers what neither does: requirement coverage, scope discipline, and consequence.

## Read the diff

Not your memory of the diff. Actually read it, in full.

```
git diff          # and git diff --cached
node "${CLAUDE_SKILL_DIR}/../superpack/scripts/diffstat.mjs"
```

Most self-review findings come from simply looking: a debug line left in, a file you did not mean to touch, a half-finished edit, a stale comment, an unused import you added.

## The dimensions

Run only the ones the change actually touches. Each is a question with a yes/no answer, not a topic to muse on.

**Always:**

- **Requirements** — restate the request as bullets and mark each done, partial, or out of scope. Missing requirements are the most common defect and the least often caught.
- **Scope** — is everything in this diff traceable to the request? Unrelated refactoring, opportunistic renames, and formatting churn all belong in a separate change.
- **Leftovers** — debug output, commented-out code, `TODO` without an owner, temporary files, test `.only`, suppressions added without a reason.
- **Consumers** — every caller of a changed signature or shape, checked. One grep.

**When touched:**

- **Security** — the change reaches auth, input handling, secrets, dependencies, or infrastructure → `securing-changes`.
- **UX** — a user-facing surface changed → are the empty, loading, error, partial, and success states all present; is it keyboard reachable; does it hold at 320px? `references/frontend.md`.
- **Performance** — a hot path, a loop over user data, a new query, a new dependency in the bundle → is there a plausible regression? `references/performance.md`.
- **Reliability** — a new failure point: what happens when it times out, returns an error, or returns nothing? Is the failure visible in logs or metrics?
- **Data** — migrations, backfills, retention, deletion → reversible, and is the old code still compatible?
- **Docs** — did this change how to install, run, configure, or call anything? `references/docs.md`.
- **Tests** — is the new behaviour covered, and did any existing test get weakened or deleted to make things pass?
- **Deployment** — does this need a config change, a secret, a migration, or an ordering constraint at deploy time? Say so; it is the most frequently forgotten handoff.

## Report

Tell the user what they need to decide on, not everything you looked at.

```
Done: rate limiting on /api/login, per API key, 429 + Retry-After.
Verified: 4 new tests pass; unauthorised-caller case covered; lint + typecheck clean.
Not done: internal service exemption — needs the service-token list, which I could not find.
Risk: config-only rollback (RATE_LIMIT_ENABLED=false).
Worth knowing: the limiter is in-process, so limits are per-instance until it moves to Redis.
```

State what is unverified plainly. A report with no "not done" and no "worth knowing" section is usually a report that did not look.

## Red flags

- You are summarising the change from memory without having read the diff.
- Every dimension "looks fine" and the review took ten seconds.
- The diff contains something you cannot trace to the request.
- You are about to report completion while a requirement is partial and unmentioned.
- The change adds a failure mode with no log, metric, or error path.
