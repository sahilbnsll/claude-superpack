# Benchmarks

Three tiers, measuring different things, with different costs and different strengths of
claim. Two run free and are in CI; the third costs money and ships as a harness rather than
as a number.

```bash
npm run bench                          # tiers 1 and 2 plus footprint
node benchmarks/run.mjs --compare=superpack-v4    # against any git ref
```

Current result:

```
Tier 1 structure : 148/148 checks
Tier 2 routing   : references 100% (17/17), content skills 100% (7/7)
                   1.28 references selected per task, 2 false positives
Footprint        : 9 skills, 757 tokens/turn always-on
                   vs v4: 2811 → 757 tokens (-73.1%)
Tier 3 behaviour : not run (billed)
```

---

## Tier 1 — structure

`tier1-structure.mjs` · deterministic · no model

Asserts the pack is well-formed and inside its context budget. Runs in about a second.

- **Frontmatter** — name matches directory, lowercase-hyphenated, version and licence
  declared, description present.
- **Description discipline** — under 500 characters, third person, starts with a trigger
  phrase, and **does not summarise its own workflow**. That last one is a real failure
  mode: a description that describes the process gives the model a shortcut it takes
  instead of reading the skill. 26 of v4's 33 descriptions did this.
- **Budgets** — 3,500 characters total always-on across the pack, 500 lines per skill body,
  260 lines per reference.
- **Link integrity** — every relative link resolves, and no `@`-prefixed links, which
  force-load their target and burn context before it is needed.
- **Scripts** — each supports `--help` and imports nothing outside Node's standard library.
- **Activation model** — every skill declares `content` or `phase`, and every phase skill
  is actually named in the core skill's gate table. A phase skill the core never mentions
  is unreachable in practice, and good writing does not fix that.
- **Cross-references** — every skill name mentioned in prose resolves to a real skill or a
  known external tool.

**What it proves:** the pack is internally consistent and cheap. **What it does not:**
anything about whether the content is good.

---

## Tier 2 — routing vocabulary

`tier2-routing.mjs` · deterministic · no model · 18 tasks

Given only the words a user actually types, would the routing table and the skill
descriptions point at the right domain knowledge?

Scoring is TF-IDF over the signal sets parsed live from `references/routing.md` and the
skill `description` fields — not from a duplicated copy, so the test cannot drift from the
thing it tests. Inverse document frequency matters here: a term appearing in many domains
(`service`, `user`, `lib`) carries almost no routing information and must not outvote one
appearing in a single domain (`hallucinating`, `terraform`, `flaky`).

Selection takes the top scorer plus anything within 40% of it, capped at three — mirroring
the real rule of one primary domain and at most two secondaries.

Two activation models are scored differently, because they are reached differently:

- **Content-activated** skills must be reachable from prompt vocabulary. Scored.
- **Phase-activated** skills are reached from the core gate table once scope and risk are
  known. No prompt wording can or should trigger them, so scoring them here would measure
  nothing. Tier 1 checks their reachability instead.

Three numbers are reported, not one, because over-selection is as much a failure as
under-selection: routing accuracy, average references selected per task, and false
positives.

**What it proves:** the routing signals contain the language real requests arrive in. A
miss here guarantees a routing failure in practice. **What it does not:** that Claude will
route correctly — a hit is a necessary, not sufficient, condition.

**Caveat worth stating plainly:** the signals were tuned against this corpus. When the
benchmark first ran it scored 50% and exposed six genuine vocabulary gaps — the performance
signals had `p95` and `LCP` but not `slow` or `faster`; the frontend signals had
`accessible` but not `accessibility` or `keyboard`; `parallel.md` had no row at all. Those
were real defects worth fixing. But fixing them against the test set means 100% is a
coverage number, not a generalisation number.

---

## Tier 3 — behaviour

`tier3-run.mjs` + [`tier3-behavior.md`](tier3-behavior.md) · **billed** · not run here

Paired live evaluation: each task run twice, once with the pack and once without, same
model, same effort, same repo state. Metrics from the transcript — tool calls, files read,
tokens, wall clock, diff size, scope violations, and specifically the rate of **unverified
completion claims**, which is the failure the pack most directly targets.

The harness includes a **reach check**: grep each treatment transcript for evidence the
skill actually loaded. Expect 100% in treatment and 0% in baseline. A treatment arm where
the skill never loaded is a baseline run wearing a treatment label, and it is the step most
evaluations skip.

**Not run in this repository's published results.** Doing it properly means hundreds of
billed paired runs at k=3 across all 18 tasks. The harness is provided so the numbers can
be produced rather than asserted.

```bash
node benchmarks/tier3-run.mjs --dry-run           # plan and cost
node benchmarks/tier3-run.mjs --stage 0           # reach check only
node benchmarks/tier3-run.mjs --repeat 3 --out benchmarks/results/tier3.json
```

---

## The task corpus

18 tasks in `tasks/`, each with a realistic prompt, a *What good looks like* rubric, and a
*Failure modes to catch* list. They are written as a user would actually phrase them —
"Make it not do that", "Make it faster", "Clean up the repo and commit everything" — not as
a specification.

| | Task | Scope/Risk | Tests |
|---|---|---|---|
| 01 | Blank dashboard list | S1/R0 | state coverage, reuse over creation |
| 02 | Customers charged twice | S2/R2 | idempotency vs the button fix |
| 03 | Split a column, 400k rows | S2/R3 | expand/contract, confirmation gate |
| 04 | Open RDS to a subnet | S1/R2 | security-group reference vs `0.0.0.0/0` |
| 05 | Suite fails one run in five | S1/R1 | reproduction before fix, no retry bandaid |
| 06 | "Commit everything" | S0/R3 | secret scan, rotation not done unprompted |
| 07 | Gallery slow on mobile | S2/R0 | baseline before change |
| 08 | Add pagination | S2/R1 | cursor over offset, breaking-change flag |
| 09 | Assistant hallucinates | S2/R1 | retrieval first, not prompt-only |
| 10 | Pods restarting | S1/R2 | OOM vs leak vs probe |
| 11 | Duplicate revenue rows | S2/R2 | repair *and* pipeline, reconciliation |
| 12 | Footer typo | S0/R0 | **over-processing** — no ceremony allowed |
| 13 | Keyboard inaccessible editor | S2/R0 | real keyboard walk, native elements |
| 14 | Split an 800-line module | S2/R1 | consumers grepped, no behaviour change |
| 15 | 30% error rate, deployed 20m ago | S1/R2 | stabilise before diagnose |
| 16 | Set up CI | S2/R2 | detect real commands, pin actions, scope secrets |
| 17 | Stale README | S1/R0 | run the commands it documents |
| 18 | Team workspaces, in parallel | S3/R1 | refuse unsafe partition, honour safe one |

Task 12 exists specifically to measure over-processing, which is the most common failure of
heavyweight skill packs and is invisible to a benchmark made only of hard tasks.

---

## Adding a task

Create `tasks/NN-slug.md`:

```markdown
---
id: slug
domain: backend
expect_references: [backend, security]
expect_skills: [superpack, verifying-evidence]
scope: S2
risk: R2
---

# Prompt
How a user would actually say it.

# What good looks like
- Binary, checkable bullets.

# Failure modes to catch
- What a competent-looking but wrong run does.
```

Then `npm run bench`. Tier 2 picks it up automatically; tier 3 can run it live.
