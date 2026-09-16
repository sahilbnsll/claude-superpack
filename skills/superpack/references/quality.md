# Code quality

Review dimensions, maintainability, and deciding what technical debt is worth paying down.

**Division of labour:** `/code-review` hunts correctness bugs in a diff and `/simplify` applies quality cleanups. This file is for judging whether code should exist in its current shape at all, and for the dimensions a bug-hunting review does not cover.

## The bar

Code is read far more often than it is written, and mostly by someone under time pressure trying to answer one question. Optimise for that reader.

- **Obvious beats clever.** If it needs a comment to explain what it does, it usually wants to be rewritten rather than annotated. Comments should say *why*, not *what*.
- **Names carry the design.** A function named for what it does, with arguments named for what they mean, removes the need for most documentation. `handleData` and `processItem` tell the reader nothing.
- **Shallow beats deep.** Early returns over nested conditionals. Three levels of indentation is a smell; five is a defect.
- **Locality.** Things that change together live together. A change that requires edits in six unrelated files points at a boundary in the wrong place.
- **One level of abstraction per function.** Mixing HTTP parsing, business logic, and SQL in one function makes all three untestable.
- **Errors are part of the interface.** Decide whether each error is handled, propagated, or fatal. A `catch` that logs and continues has silently chosen "ignore" — usually wrongly, and usually invisibly.

## Abstraction, honestly

The two failure directions cost differently:

- **Premature abstraction** is expensive: an interface designed for imagined future needs that constrains the real ones, generic where concrete would do, configuration for cases that never arrived.
- **Duplication** is cheap to fix later, and duplication carries information — three similar functions that diverge were never the same thing.

Rule of thumb: duplicate twice, abstract on the third occurrence, when you can see what actually varies. Abstracting from one example is guessing.

## Reading a change

Ask these in order. Stop when you find something that matters.

1. **Does it do what was asked?** Compare the diff to the request, line by line. Missing requirements are more common than wrong code.
2. **Is anything in the diff unrelated to the request?** Opportunistic refactoring inside a feature change makes both harder to review and to revert.
3. **What did it not handle?** Empty, null, concurrent, very large, permission-denied, network-failed.
4. **What breaks elsewhere?** Every caller of a changed signature, every consumer of a changed shape, every test asserting the old behaviour.
5. **Is it consistent with the repo?** Same error style, same naming, same layering. A correct change in a foreign idiom is still a maintenance cost.
6. **What did it make worse?** A new dependency, a new pattern, a new config knob, a silenced warning.

## Technical debt

Debt is a metaphor about interest: the question is not whether the code is ugly, but what it costs per change.

Worth paying down: code that is changed often and misunderstood every time; a missing test around behaviour that keeps regressing; a workaround whose original cause is gone; a suppressed check hiding a real problem.

Not worth paying down: ugly code nobody touches; a pattern you dislike that works; anything you would rewrite rather than fix; a stylistic preference not shared by the team.

Record debt where it is, not in a separate list that goes stale. Include why it is the way it is and what would have to be true to fix it.

## Suppressions

`@ts-ignore`, `eslint-disable`, `# type: ignore`, and `catch {}` each silence a tool that was doing its job. Each needs a comment saying why, and each is a legitimate finding in review if it does not have one. The check being wrong is a valid reason; being in a hurry is not, but is at least honest if written down.

## Failure modes

| Symptom | Usual cause |
|---|---|
| Nobody understands this module | It grew by accretion, never had a second pass, names never updated as meaning drifted |
| Every change here causes a regression | No tests around the behaviour, or the abstraction leaks |
| The diff is twice the size of the change | Formatter differences, or refactoring mixed with feature work |
| Review comments all about style | No formatter or linter — humans doing a machine's job |
| Same bug keeps returning | Fixed at the symptom; no regression test |
| The abstraction has one caller | Built for an imagined second case |
| Function needs eight parameters | It is doing more than one thing, or wants a typed object |

## Evidence

1. **The diff, read in full.** Not the summary of it. Reviewing your own change means looking at what is actually there, including what you forgot to delete.
2. **Requirements checklist** — the request restated as bullet points, each marked done or explicitly out of scope.
3. **The gates** — lint, typecheck, tests — because style and type consistency are not worth human attention when a machine can decide.
4. **Consumer check** for a changed interface: grep every call site and confirm each still holds.
5. **`/code-review` or `/simplify`** where available. Use the tool that exists rather than approximating it.
