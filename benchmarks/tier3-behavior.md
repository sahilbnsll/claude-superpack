# Tier 3 — behavioural evaluation

Tiers 1 and 2 are static: they prove the pack is well-formed and that its routing
vocabulary covers the language real requests arrive in. Neither proves the pack changes
what Claude does. Only a paired live run does that, and it costs real money and real time.

This document is the protocol. `tier3-run.mjs` is the harness.

## Design

**Paired, same task, two arms.** For each task, run it twice: once with the pack
installed (treatment) and once without (baseline). Same model, same effort, same repo
state, same prompt. Anything else and you are measuring noise.

**Repetition.** Agent runs are high-variance. One pair per task tells you almost nothing.
Three repeats per arm per task is the practical floor for a signal; published skill
benchmarks that reached statistical significance used tens of tasks at k=3.

**Escalate.** Do not start with the full matrix.

| Stage | Scope | Purpose |
|---|---|---|
| 0 | Transcript audit, 3 tasks, 1 run each | Did the pack even reach the model? |
| 1 | 5 tasks, k=1 | Obvious breakage, harness bugs |
| 2 | Same 5 tasks, k=3 | Is there a visible effect at all? |
| 3 | All 18 tasks, k=3 | The number you report |

**Verify the treatment arrived.** This is the step most evaluations skip and the one that
invalidates results most often. Grep each treatment transcript for evidence the skill was
actually invoked. A treatment arm where the skill never loaded is a baseline run wearing
a treatment label. Expect 100% in treatment and 0% in baseline; anything else voids the
comparison.

## Metrics

Collected per run, compared per task pair.

| Metric | From | Why |
|---|---|---|
| **Rubric score** | Human or model grader against the task's *What good looks like* | The outcome that matters |
| **Failure modes hit** | The task's *Failure modes to catch* list | Direct measure of what the pack claims to prevent |
| **Verification evidence** | Did the run produce command output supporting its claims? | The pack's central claim |
| **Unverified completion claims** | "done/fixed/works" with nothing run since the last edit | The specific failure the pack targets |
| **Tool calls** | Transcript count | Over-processing and wasted exploration |
| **Files read** | Transcript count | Context discipline |
| **Input / output tokens** | API usage | Cost, split — they move differently |
| **Wall clock** | Harness | Developer velocity |
| **Diff size** | `git diff --numstat` | Over-building; the lever with the best published evidence |
| **Scope violations** | Files changed outside the task | Minimal-diff discipline |

Report **paired per-task differences**, not arm averages — task difficulty varies far more
than the treatment effect, so averaging across tasks buries the signal. Use a Wilcoxon
signed-rank test for continuous metrics and a sign test for pass/fail. Report the median
difference and a confidence interval, not just the mean.

## Grading

Each task file carries a *What good looks like* section and a *Failure modes to catch*
section. Grade against those, not against a general impression.

- **Binary per rubric bullet.** "Found the existing component rather than creating a new
  one" is yes or no. Sum to a score out of the bullet count.
- **Blind the grader to the arm.** Strip any mention of the pack from the transcript
  before grading, or the label decides the score.
- **If a model grades, validate the grader** against human labels on a sample first. An
  unvalidated model judge measures the judge.

## Honest expectations

Published paired evaluations of token-saving skill packs found effects far smaller than
their authors advertised — narration-compression around 8% against a claimed 65%, and one
output-rewriting proxy that came out *more* expensive than no tool at all. The one
intervention with a solid signal was the one that reduced how much code got written, at
around 10% cost reduction, with quality unchanged.

So: expect the token effect of any skill pack to be small, expect variance to be large,
and expect the real differences to show up in decision quality — whether a destructive
action got confirmed, whether a claim came with evidence, whether the existing component
was reused — rather than in the token counters. Design the rubric to measure those.

## Running it

```bash
node benchmarks/tier3-run.mjs --stage 0            # did the skill load at all
node benchmarks/tier3-run.mjs --tasks 5 --repeat 1
node benchmarks/tier3-run.mjs --tasks 5 --repeat 3
node benchmarks/tier3-run.mjs --repeat 3 --out benchmarks/results/tier3.json
```

The harness needs the `claude` CLI on PATH and a scratch git repository per run so the
arms cannot contaminate each other. It writes one JSON record per run and a paired summary.

**Not run in this repository's published results.** Doing it properly costs hundreds of
billed trials; the harness is provided so the numbers can be produced rather than asserted.
