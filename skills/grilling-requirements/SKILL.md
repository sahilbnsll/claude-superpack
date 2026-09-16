---
name: grilling-requirements
description: Use when a request admits several implementations that would produce materially different systems, when the cost of building the wrong thing is high, or when the user explicitly asks to be interviewed, grilled, or questioned about a plan before work starts.
version: 5.0.0
license: MIT
metadata:
  layer: discovery
  pack: claude-superpack
  activation: content
---

# Grilling requirements

Resolve the forks in the road before building, without turning a small task into an interrogation.

## The filter

Ask only questions whose different answers produce **materially different work**. For everything else, decide and say what you decided.

Before asking anything, apply these in order:

1. **Can the codebase answer it?** Then go and look. "Which auth library do you use" is a grep, not a question.
2. **Is there an obvious default?** Then take it and state it as an assumption. "Assuming soft delete, matching how `orders` works."
3. **Does the answer change architecture, data model, UX, security posture, cost, or what 'done' means?** If yes, ask. If no, decide.

A request with no real forks gets no questions. Manufactured clarification is friction that teaches the user to skip your questions when they matter.

## How to ask

- **In rounds, numbered, batched.** Three to six questions at once, not a drip. The user answers a batch in one sitting; a drip costs them ten context switches.
- **Every question carries your recommendation** and one line of reasoning. The user should be able to reply "1, 3, yes to the rest" and be done.
- **Walk the dependency order.** Ask what constrains other answers first — the data model before the UI, the trust boundary before the API shape. Later questions often disappear once an earlier one is settled.
- **Concrete options over open prompts.** "Per-user or per-organisation limit?" beats "how should rate limiting work?"
- **Stop when the remaining unknowns are cheap to change.** Perfect specification is not the goal; the goal is that no remaining ambiguity would cause a rewrite.

Format:

```
Three things change the shape of this. My recommendation on each:

1. Scope of the limit — per user, or per API key?
   → Per API key. Matches how billing is keyed, and it is what an abusive
     caller actually controls.

2. Behaviour at the limit — 429 with Retry-After, or queue the request?
   → 429. Queuing turns a client problem into a memory problem for us.

3. Does this apply to internal service calls?
   → No. Exempt by service token, or the batch jobs start failing at 2am.

Say "go" to take all three, or correct any.
```

Usually two rounds is enough: the first settles the structure, the second settles what the first opened up.

## Closing

End with a restatement in the user's terms — what will be built, what will not, and the assumptions taken. That restatement is the specification, and it is what `reviewing-before-done` checks against later.

## Red flags

- Asking something you could have answered with one grep.
- Asking about something you would implement identically either way.
- A third round of questions with no new information arriving — you are stalling; state your assumptions and build.
- Questions without recommendations, which pushes the design work back onto the user.
- Grilling a two-line change.
