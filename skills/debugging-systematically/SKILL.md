---
name: debugging-systematically
description: Use when something fails, crashes, restarts, hangs, returns the wrong result, behaves inconsistently or intermittently, or works in one environment and not another — and especially after one attempted fix has already failed. Not for implementing known changes.
version: 5.0.0
license: MIT
metadata:
  layer: execution
  pack: claude-superpack
  activation: content
---

# Debugging systematically

Find the cause, then fix the cause. Guess-and-check is the expensive path: each wrong guess adds a change you now have to reason about.

## The loop

### 1. Reproduce

Get a deterministic reproduction before changing anything. Exact input, exact steps, exact environment, exact observed output versus expected.

Without a reproduction you cannot know you fixed it — only that the symptom did not appear this time. If it is intermittent, the first task is finding what makes it reliable: load, ordering, a specific record, a timezone, a cold cache, a particular user.

### 2. Read the actual error

The whole thing, including the parts that look like boilerplate. The first line is often the least informative and the innermost frame the most. Note the exact message, the file and line, and what the stack says about who called what.

Search the codebase for the message string. If it comes from your code, you have just found the branch that produced it.

### 3. Bisect

The cause is somewhere between "known good" and "known bad". Halve the interval.

- **In time** — `git bisect`, or just check out the last release. "It worked last week" plus a commit range is often the whole investigation.
- **In space** — what is the smallest input that still fails? The shortest path that still fails? Does it fail with the dependency stubbed out?
- **In layers** — is the data wrong when it enters the function, or does the function make it wrong? Check the boundary, not the middle.

### 4. Form one hypothesis

State it so it can be wrong: *"The session is null because the middleware runs after the route handler on this path."*

Then name the observation that would disprove it, and go and make that observation — a log line, a breakpoint, a direct query, a printed value. Confirm the mechanism before touching the code.

**One hypothesis at a time. One change at a time.** Changing three things and seeing the symptom disappear teaches you nothing and leaves two unexplained edits in the diff.

### 5. Fix the cause

If you cannot explain *why* the fix works in terms of the mechanism you confirmed, you have not found the cause. A change that makes the symptom go away for reasons you cannot articulate will come back.

Fix at the right level. A null check at the call site when the real problem is a constructor that can return an unfinished object moves the bug rather than removing it.

### 6. Prove it, and keep it proved

- Re-run the original reproduction. It must now pass.
- Write a test that fails without the fix. **Verify it fails**: revert the fix, watch it go red, restore, watch it go green. A regression test that has never failed is an assumption.
- Run the wider suite — your fix may have depended on the broken behaviour.

### 7. Ask where else

The same mistake is rarely made once. Grep for the pattern. If the cause was a missing await, a missing tenant filter, or an unhandled null from one API, check every other place that does the same thing. This step finds more bugs per minute than any other.

## When you are stuck

After two failed hypotheses, stop generating a third. Instead:

- **Re-read the assumption you have not checked.** Usually it is that the code running is the code you edited — wrong build, wrong branch, cached bundle, wrong container, wrong environment, stale process.
- **Narrow to the minimum reproduction.** Delete everything not needed to make it fail. The cause is usually visible in what remains.
- **Check what changed** — deploys, dependency updates, config, data, an upstream provider's behaviour.
- **State the contradiction out loud.** "The log says the value is set, and the next line says it is undefined" names the impossible thing, and the impossible thing is where the wrong assumption is.

## Rationalizations

| Thought | Reality |
|---|---|
| "Let me just try changing this" | That is a third guess. Form a hypothesis. |
| "It's probably a caching issue" | Then verify it is, before acting on it. |
| "The symptom's gone, ship it" | If you cannot explain why, it is not fixed. |
| "Adding a null check will do" | It hides the bug unless null was genuinely valid there. |
| "It's flaky, re-run it" | Intermittent means a real race or a real dependency. |
| "It works on my machine" | Then the difference between the machines *is* the bug. |
| "No time to write the regression test" | It will cost more the second time it is reported. |

## Red flags

- Third attempt, third different guess, no hypothesis stated.
- You changed more than one thing between observations.
- You are reading code hoping to spot it, instead of getting data.
- You are about to say "fixed" without re-running the original reproduction.
- The fix is a retry, a timeout increase, or a `try/catch` around the symptom.
