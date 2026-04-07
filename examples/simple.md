# Simple Example

This example shows the intended behavior for a request that does not need orchestration.

## Prompt

```text
$ claude
> Explain how the authentication middleware works.
```

## Before

- A standard Claude Code session would answer directly.

## After Enabling Claude Superpack

- Claude should still answer directly.
- No decomposition is needed.
- No isolated worker execution should occur.

## Why This Matters

Claude Superpack is designed to help with complex implementation work, not to add overhead to ordinary explanations or straightforward analysis.
