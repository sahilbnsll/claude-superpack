# Token Efficiency Protocol

These rules apply to every phase of Superpack execution. Context is the most expensive resource -- 80-90% of token waste comes from reading too much, too early.

## File Discovery Protocol (Mandatory)

Always follow this sequence. Never skip steps.

1. **Glob** -- find candidate files by pattern.
2. **Grep** -- narrow to files containing relevant symbols, functions, or patterns.
3. **Read(offset, limit)** -- pull only the relevant section.

Never read a full file unless:
- it is under 100 lines, OR
- the user explicitly asked to see it, OR
- you need the complete file for a diff operation.

## Reading Discipline

- Before reading: check file size. If over 200 lines, you must use offset/limit.
- Prioritize recently changed files: use `git diff --name-only` or `git log --oneline -10` to find what matters.
- For unfamiliar codebases: use an explorer agent (Haiku model) to map structure before reading anything.

## Summarize and Discard

After reading code:
1. Extract what you need: function signatures, types, logic flow.
2. Summarize it in 2-5 lines.
3. Do not carry the raw content forward in conversation.

After running commands:
1. Extract the meaningful output (exit code, error messages, key results).
2. Discard verbose logs.

## Context Compaction

Trigger `/compact` proactively:
- After completing each phase (classification, decomposition, execution, merge).
- When you notice conversation is getting long.
- Before spawning subagents (they inherit context cost).

## Subagent Context Rules

When constructing prompts for subagent workers:
- Include ONLY: task description, file paths, relevant code snippets, constraints.
- Exclude: conversation history, previous worker outputs, full file contents.
- Target: under 2000 tokens per worker prompt.

## Model Tier Selection

Use the lightest model that can handle the task:

| Task Type | Model | Reasoning |
|-----------|-------|-----------|
| File discovery, listing, simple grep | Haiku | Mechanical, no reasoning needed |
| Implementation, test writing, refactoring | Sonnet | Needs code reasoning |
| Architecture, complex algorithms, cross-cutting design | Opus | Needs deep reasoning |

## Output Formatting

- Prefer structured formats (JSON, tables, lists) over prose.
- Use diffs instead of full file dumps.
- Cap summaries at 5 lines per component unless complexity demands more.
- Worker outputs: strict JSON, no narrative.

## Anti-Patterns (Never Do These)

- Reading every file in a directory "to understand the codebase"
- Including full stack traces when the error message is sufficient
- Repeating information already established in the conversation
- Spawning an agent to do something you could do with one Grep call
- Reading a 500-line file to find one function definition
