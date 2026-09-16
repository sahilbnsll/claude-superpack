# Documentation

READMEs, ADRs, changelogs, API docs, and release notes.

## The rule

Documentation that is wrong is worse than documentation that is missing, because it is trusted. Every doc you write is a promise to keep it true. Write less, and keep it true.

Prefer documentation that cannot drift: types over prose about types, runnable examples over described examples, generated API reference over hand-maintained tables, a test over a paragraph explaining behaviour.

## README

A README answers, in this order, for someone who arrived thirty seconds ago:

1. **What is this and who is it for?** One sentence. Not "a modern, blazing-fast solution for X" — say what it does.
2. **How do I run it?** Exact commands, copy-pasteable, including prerequisites and required environment variables. This is the section that actually gets used.
3. **How do I verify it worked?** What success looks like.
4. **How do I work on it?** Tests, lint, build, and the project layout in a few lines.
5. **Where do I go deeper?** Links, not inlined detail.

Everything else — architecture essays, exhaustive configuration tables, roadmaps — belongs in `docs/` and linked. A README nobody finishes reading fails at its one job.

Verify the commands by running them in a clean checkout. Setup instructions that no longer work are the most common documentation defect, and the most damaging.

## Changelog

Written for the person deciding whether to upgrade.

- Group by impact: **Breaking**, **Added**, **Fixed**, **Changed**, **Deprecated**, **Security**. Breaking goes first, always.
- Each breaking change states what broke and the exact migration step. "Renamed `getUser` to `fetchUser`" is not enough; "`getUser` removed, use `fetchUser` — same signature" is.
- Write from the consumer's perspective, not the commit's. "Refactored internal cache layer" belongs in the git log; "fixed stale data after profile update" belongs in the changelog.
- Group by version with a date. Link to the diff.
- Derive it from the commit range, then rewrite it in user language. Raw `git log` is a starting point, not a changelog.

## ADR

One decision per record, roughly half a page, numbered and never deleted — superseded records stay, marked superseded, because the history is the point.

Context (the forces, with numbers where they exist) · Decision (what we will do, stated actively) · Alternatives (what else was considered and the specific reason it lost) · Consequences (including what this makes harder) · Status.

Write one when a decision is expensive to reverse, when a reasonable person would choose differently, or when a future reader would otherwise ask "why on earth".

## API documentation

- Generate from the source of truth — types, schema, OpenAPI — and hand-write only what generation cannot know: why, when, and what not to do.
- Every endpoint documents its error responses, not only the success case. The error contract is what integrators spend their time on.
- Examples use realistic data and actually run. A curl example with a wrong field name costs an integrator an hour.
- Document auth, rate limits, pagination, and versioning once, prominently. These are the four questions every integrator has.

## Code comments

- Comment *why*: the constraint, the surprising reason, the thing that was tried and failed. `// retry 3x — provider returns 502 on first call after idle` is worth keeping forever.
- Do not comment *what* the code already says. `// increment i` is noise that will eventually become a lie.
- Document invariants and preconditions that the type system cannot express.
- Delete commented-out code. Version control remembers it; the comment just makes the file harder to read.
- A `TODO` needs a name or an issue link, or it is decoration.

## When to update docs

As part of the change, not afterwards. Specifically, a change requires a doc update when it alters: how to install or run, any public interface, configuration or environment variables, a documented behaviour, or an architectural decision already recorded.

Finding stale docs while doing something else is a separate change. Note it; do not fold it into an unrelated diff.

## Failure modes

| Symptom | Usual cause |
|---|---|
| Setup instructions do not work | Never re-run from a clean checkout after dependencies changed |
| Docs contradict the code | Written once, never bound to the change that invalidated them |
| Nobody reads the README | It opens with philosophy instead of the run command |
| Changelog is a commit list | Generated and never rewritten for the reader |
| Every ADR says the same thing | Written to satisfy a process rather than record a real decision |
| API docs miss the error cases | Generated from happy-path types only |

## Evidence

1. **The commands, run.** Copy the setup section into a clean environment and execute it. This is the only real verification a README gets.
2. **Links resolve** — internal anchors and external URLs both.
3. **Examples execute** and produce the output shown.
4. **The diff of the docs alongside the diff of the code**, to confirm nothing documented was changed without the doc following.
