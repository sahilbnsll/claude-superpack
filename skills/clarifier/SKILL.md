---
name: clarifier
description: This skill should be used when the user's request is ambiguous, underspecified, or has multiple valid interpretations. It asks targeted clarifying questions before starting work — preventing wasted effort from wrong assumptions. Activated automatically by auto-router when request ambiguity is detected.
version: 4.0.0
---

# Clarifier

Ask the right questions before doing the wrong work.

## Why This Exists

The most expensive bug is building the wrong thing. When a request has multiple valid interpretations, making assumptions wastes tokens and time. One good clarifying question saves an entire wasted implementation cycle.

## When to Activate

- When auto-router detects ambiguity in a request (multiple valid interpretations)
- When a request lacks critical details (which file? what behavior? what framework?)
- When the user's intent could be satisfied by very different approaches
- When scope is unclear ("improve the auth" — the whole system? one function? security? UX?)

## Ambiguity Detection

### Signals That Trigger Clarification

| Signal | Example | What's Missing |
|---|---|---|
| Vague target | "fix the auth" | Which auth file? What's broken? |
| Multiple interpretations | "make it faster" | Load time? API response? Build speed? |
| Implicit scope | "add error handling" | Which functions? What kind of errors? |
| Undefined behavior | "handle edge cases" | Which edge cases specifically? |
| Technology ambiguity | "add a database" | SQL? NoSQL? Which provider? |
| Missing acceptance criteria | "improve the UI" | What does "improved" look like? |

### Signals That DON'T Need Clarification

- Request specifies a file and an action: "fix the null check in src/auth.ts"
- Error message is provided: "fix this error: TypeError at line 42"
- Request is a well-defined pattern: "add tests for the User model"
- Request is a question: "how does the auth middleware work?"

## Question Strategy

### Prioritize by Impact

Ask the question whose answer most changes what you'd build:

1. **Scope questions** (what to change) — highest impact
2. **Behavior questions** (what should happen) — high impact
3. **Approach questions** (how to implement) — medium impact
4. **Style questions** (naming, formatting) — lowest impact, usually skip

### Question Format

**Good questions:**
- Offer 2-3 concrete options when possible
- Include your best guess so the user can just confirm
- Are specific enough to have a clear answer

```
The auth module has three entry points:
  a) src/lib/auth.ts — core authentication logic
  b) src/middleware/auth.ts — Express middleware
  c) src/routes/auth.ts — API routes

Which one needs the fix? (or all three?)
```

**Bad questions:**
- "What do you want?" (too open-ended)
- "Can you clarify?" (clarify what?)
- Asking 5 questions at once (overwhelming)

### One Question at a Time

Ask a single question, wait for the answer, then either proceed or ask one more. Maximum 3 rounds of clarification before starting work.

## Process

### Step 1: Analyze the Request

Parse the user's message for:
- **Action**: what they want done (fix, add, update, refactor, etc.)
- **Target**: what they want changed (file, module, feature, etc.)
- **Criteria**: how they'll know it's done (expected behavior, error resolved, etc.)

### Step 2: Check for Gaps

For each element (action, target, criteria):
- Is it specified? → proceed
- Is it ambiguous? → clarify
- Is it missing? → infer if confident, clarify if not

### Step 3: Quick Codebase Check

Before asking, do a fast lookup:
- Grep for the mentioned term — does it match one file or many?
- If one match: don't ask, just proceed
- If multiple matches: present the options

### Step 4: Ask or Proceed

**If confident (>80%):** state your interpretation and proceed
```
I'll fix the null check in src/lib/auth.ts:42 — the validateToken function 
is accessing user.role without checking if user exists. Starting now.
```

**If uncertain:** ask with options
```
"Fix the auth" could mean several things here:
  a) Fix the validateToken null check (there's a bug on line 42)
  b) Fix the session expiry logic (tests are failing)
  c) Something else?

Which one?
```

## Integration

- **auto-router**: triggers clarifier when request ambiguity exceeds threshold
- **smart-discovery**: clarifier uses quick file lookups to narrow options
- **memory-search**: check if the user has discussed this topic before (context from past sessions)
- **user-profiler**: known preferences reduce ambiguity (e.g., user always means "the React component" not "the API route")

## Rules

1. **Maximum 3 rounds.** If you still don't understand after 3 questions, state your best interpretation and start. The user can redirect.
2. **Don't ask what you can look up.** If a Grep or Glob can answer the question, do that instead of asking.
3. **Offer your best guess.** "I think you mean X — should I proceed?" is better than "What do you mean?"
4. **Never clarify obvious requests.** "Add a loading spinner to the dashboard" is clear enough. Don't ask "which dashboard?"  when there's only one.
5. **Skip style questions.** Don't ask about naming conventions or formatting — match what exists.
6. **Confidence threshold: 80%.** Below 80% certainty, ask. Above, proceed with stated assumptions.
