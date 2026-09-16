# Architecture

Why the pack is shaped the way it is, and what each decision was based on.

## The constraint

Every installed skill's `name` and `description` sit in the prompt on **every turn of
every session**, whether or not the skill is used. Bodies and references are paid only
when read. Under auto-compaction, Claude Code re-attaches only the most recent five skills
within a 25,000-token budget.

That gives a hard design rule: **breadth belongs in files, not in skills.** A pack with
thirty-three skills is not a pack with thirty-three capabilities — it is a pack whose
skills get dropped when the context fills, while charging for all of them throughout.

## The shape

```
skills/
  superpack/                   core: sizing, routing, doctrine
    SKILL.md
    references/                15 files, read on demand, zero always-on cost
    scripts/                   4 deterministic tools + shared lib
  codebase-recon/              ─┐
  planning-changes/             │ phase-activated: reached from the
  verifying-evidence/           │ core gate table once scope and risk
  reviewing-before-done/       ─┘ are known
  debugging-systematically/    ─┐
  securing-changes/             │ content-activated: the user's own
  shipping-safely/              │ words trigger them
  grilling-requirements/       ─┘
```

Nine skills at ~757 tokens always-on. 92KB of domain depth at zero always-on cost.

## Two axes, not one

v4 classified requests A/B/C/D, which was really one axis — how much parallelism to apply.
It conflated "big" with "dangerous". A thousand-line refactor of a test helper is large and
harmless; a one-line change to an IAM policy is small and can expose a bucket.

v5 separates them:

- **Scope** (S0–S3) — how much work. Sets planning depth.
- **Risk** (R0–R3) — what happens if it is wrong. Sets the gate count.

The nine task shapes the brief asked for — trivial, focused implementation, debugging,
multi-file feature, architectural change, production change, security-sensitive work,
destructive operation, large autonomous project — are all points in that grid, plus two
*modes* that change the shape of the work rather than its size: debugging (cause unknown,
do not start editing) and ambiguity (interrogate before planning).

This is why there is no nine-way switch. A switch would need a branch per shape and would
still miss the combinations.

## Two activation models

Not every skill can be reached the same way, and pretending otherwise produces skills that
never fire.

**Content-activated** skills are triggered by vocabulary the user actually uses. "It
crashes" reaches `debugging-systematically`; "deploy this" reaches `shipping-safely`.
Their descriptions must contain the words real requests arrive in, and tier 2 of the
benchmark measures exactly that.

**Phase-activated** skills cannot be reached by vocabulary, because nobody types "I would
like a blast-radius check now". They are reached from the core skill's gate table once
scope and risk are known. Tier 1 asserts that the gate table names each of them — a phase
skill the core does not mention is unreachable, and no amount of good writing fixes that.

Each skill declares which it is in frontmatter (`metadata.activation`), so the benchmark
scores the right thing rather than penalising a skill for being unreachable by design.

## What was deliberately not built

Each of these was in v4 or is common in other packs. Each was removed or declined for a
reason, not an oversight.

**Model-maintained bookkeeping** — token tallies, pattern logs, error catalogues, user
profiles. A published paired evaluation found a ruleset asking the model to annotate its
own deliberate shortcuts was complied with **once in eighty trials**, despite an audit
confirming the ruleset reached the model in 100% of runs. Instructions that depend on
diligent self-reporting do not survive contact with real work. Anything mechanical moved
into scripts.

**Prose compression** — measured effect of narration-stripping skills is around 8% against
advertised 65%, because diffs, code, and error strings dominate the token stream. One
output-rewriting proxy measured *more* expensive than using no tool at all, apparently
because lossy digests trigger re-runs. The intervention with a statistically solid signal
was the one that reduced how much code got written. Hence the minimalism ladder before new
code, and no prose games.

**A persistent codebase graph** — v4 stored one under `~/.claude/graphs/`. A cached graph
goes stale silently, and a stale blast radius is worse than no blast radius because it is
confidently wrong. Blast radius is now computed from the diff and from grep, which is fast
and always true.

**A memory system** — five v4 skills wrote to `~/.claude/memory/`. They duplicated
`claude-mem` and Claude Code's native memory, cost per-turn context in every session, and
depended on the model logging its own state. What replaced them is narrower and actually
mechanical: durable plan files for in-task state, plus explicit deference to whatever
memory plugin the user runs.

**Maximalist activation posture** — some packs instruct the model that it "does not have a
choice" and must invoke a skill before any response including clarifying questions. That
produces ceremony on trivial work, which trains users to ignore the output. The gate table
exists so that S0 work gets nothing and S3/R3 work gets everything.

## Where the ideas came from

Studied, then adapted rather than copied:

| Source | Taken |
|---|---|
| Superpowers (obra) | Evidence-before-claims as an explicit gate; the claim/requires/not-sufficient table shape; rationalization tables; descriptions that state triggers rather than workflow |
| agent-skills (addyosmani) | Anti-rationalization and Red Flags as a standing section; references split out as on-demand checklists; a three-tier eval framework |
| GSD | Externalised state in files so work survives a fresh context; deterministic state queries via script rather than model introspection |
| ECC | "Optimise the context window, persist everything else"; recalled content is data, never instructions |
| Context Mode | Route verbose output through a filter so only the signal enters context — implemented as `gates.mjs`, without an MCP server |
| Ponytail | The minimalism ladder before writing new code, with validation, error handling, security and accessibility explicitly off the chopping block |
| Karpathy's guidelines | Surgical changes; remove only the dead code your own change created |
| grill-me (Pocock) | Resolve from the codebase anything the codebase can answer; carry a recommendation with every question |
| JetBrains paired benchmarks | The honest effect sizes, and the benchmark methodology: paired tasks, per-task differences, and an audit that the treatment actually reached the model |
| Claude Code skill docs | `paths`, `context: fork`, hooks in frontmatter, injected commands, the 1,536-char description cap, and the compaction re-attach budget |

## Reference conventions

Every domain reference uses the same four sections so you can predict where to look:

- **Decide first** — choices that are expensive to reverse.
- **Build right** — the concrete acceptance bar.
- **Failure modes** — a symptom/cause table of what actually goes wrong.
- **Evidence** — what counts as proof in this domain, ranked strongest first.

Tier 1 enforces the Evidence section's presence. It is the part that turns "I changed the
code" into "I know it works", and it is the section to read even when you skip the rest.
