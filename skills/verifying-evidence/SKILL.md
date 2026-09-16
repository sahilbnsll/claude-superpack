---
name: verifying-evidence
description: Use before stating that anything works, passes, is fixed, is done, or is ready — and before committing, opening a PR, handing off to a user, or moving to the next task. Also use when a subagent or tool reports success and that report is about to be repeated as fact.
version: 5.0.0
license: MIT
metadata:
  layer: verification
  pack: claude-superpack
  activation: phase
---

# Verifying evidence

The gate between "I changed the code" and "it works".

## The rule

**No completion claim without fresh evidence produced after the change.**

Fresh means: run since your last edit, in this session, with output you read. A passing run from before the change proves the old code worked.

## The gate

Before any statement that work is complete, correct, or passing:

1. **Name the claim.** "The login redirect is fixed."
2. **Name the command that would prove it false.** If no command can falsify it, you are about to state an opinion — say so instead.
3. **Run it.** The whole thing, not a subset you believe is representative.
4. **Read the output.** Exit code, failure count, and the last lines. A test runner that exits 0 having collected zero tests has not told you what you think.
5. **State the claim with the evidence attached**, or state the actual status.

`node "${CLAUDE_SKILL_DIR}/../superpack/scripts/gates.mjs"` runs the project's own lint, typecheck, test, and build commands and returns a compact digest instead of thousands of raw lines.

## What proves what

| Claim | Requires | Does not prove it |
|---|---|---|
| Tests pass | Test run since the change, 0 failures, non-zero test count | A previous run; "the change was small" |
| Type-safe | Typechecker exit 0 | The linter passing |
| Builds | Build command exit 0 | Types passing — a build does more |
| Bug fixed | The original reproduction, re-run, now behaving correctly | The code looks right now |
| Regression test works | It failed before the fix and passes after — both observed | It passes |
| Endpoint works | The actual request, with its status and body | The handler compiles |
| UI works | The rendered result, driven or screenshotted | The component builds |
| Migration safe | Applied forward on realistic data, app exercised, reverse applied or a forward-fix stated | The SQL parses |
| Infra change safe | Plan or dry-run output, read line by line | Terraform validate |
| Permission enforced | The unauthorised caller being refused | The authorised caller succeeding |
| Performance improved | Before and after, same conditions, stated | It feels faster |
| Nothing else broke | The full suite, plus a check of every consumer of a changed interface | The changed file's own tests |
| Subagent finished it | The diff | The agent's report |

## When there is nothing to run

Some work has no automated gate — a config value, a doc, a repo with no tests. That is a real situation, and the honest response is the strongest available evidence plus an explicit statement of the gap:

> Changed the retry limit to 5 in `worker.ts:44`. No test covers this path, so this is unverified beyond a typecheck — the behaviour would show up as fewer dead-letter entries under load.

Never convert an absent gate into an implied pass.

## Rationalizations

| Excuse | Reality |
|---|---|
| "It should work now" | Then run it and find out. |
| "It's a one-line change" | One-line changes are where the unverified bugs live. |
| "I ran it before the last edit" | The last edit is the one that might be wrong. |
| "The linter passed" | Linters do not execute code. |
| "It compiles" | Compilation checks grammar, not meaning. |
| "The tests are slow" | Run the affected subset and say that is what you ran. |
| "The agent said it was done" | Read the diff. |
| "I'm confident" | Confidence is not a measurement. |
| "The user is waiting" | A wrong "done" costs them more than ninety seconds. |
| "I'll verify after committing" | Then the claim in the commit message is already false. |

## Red flags

Stop if you are about to write "should", "looks right", "seems to", "I've fixed", "all set", "working now", or any celebration — and nothing has been run since your last edit. Stop if you are reporting a number you did not read from output. Stop if you are about to describe what a test *would* show.
