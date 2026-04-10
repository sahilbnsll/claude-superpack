# Simple Example (Class A)

This example shows the intended behavior for requests that need no orchestration.

## Prompt

```text
$ claude
> Explain how the authentication middleware works.
```

## What Happens

1. **Auto-router** classifies as **Class A** (explanation, no code changes).
2. Claude answers directly.
3. No skills activate. No files are read unnecessarily. No workers spawn.

## Why This Matters

Superpack's auto-router ensures zero overhead for simple requests. The classification step itself costs minimal tokens (3 lines of output), and prevents the system from spinning up decomposition, conflict detection, or worker orchestration for questions that just need a direct answer.

## Another Example

```text
$ claude
> What does the useAuth hook return?
```

Classification: A
Reasoning: Single question about existing code, no changes needed.
Route: direct

Claude answers using targeted Grep + Read(offset, limit) to find the hook definition, then responds.
