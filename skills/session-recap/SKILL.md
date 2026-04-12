---
name: session-recap
description: This skill should be used at the end of a session, when the user says "wrap up", "summarize what we did", "I'm done for now", "what changed?", or when memory-manager detects the session is ending. It generates a structured summary of everything accomplished, decisions made, and pending work for handoff.
version: 4.0.0
---

# Session Recap

Generate a structured end-of-session summary. What happened, what changed, what's next.

## Why This Exists

Memory records individual facts during a session. But at the end, there's no structured "here's what happened" for:
- Picking up where you left off tomorrow
- Handing off to a teammate
- Reviewing what was actually accomplished vs. planned
- Async standups or status updates

Session-recap fills this gap with a compact, actionable summary.

## When to Activate

- When the user says they're done: "wrap up", "that's it", "I'm done", "end of session"
- When the user asks for a summary: "what did we do?", "summarize this session"
- When memory-manager detects a long idle period (>15 minutes with no input)
- Manually via `/session-recap`

## Recap Generation

### Step 1: Gather Session Data

Collect from the current session:

1. **Git changes**: `git diff --stat HEAD~N` (where N = commits made this session)
2. **Files modified**: `git diff --name-only` (staged + unstaged)
3. **Commits made**: `git log --oneline --since="<session_start>"`
4. **Decisions recorded**: scan recent.md for entries tagged `[decision]` from today
5. **Errors encountered**: scan recent.md for entries tagged `[error]` from today
6. **Tasks completed**: review the todo list state

### Step 2: Generate Summary

Structure:

```markdown
## Session Recap — YYYY-MM-DD

### Accomplished
- [bullet list of what was done, with file references]

### Key Decisions
- [decisions made and their rationale]

### Files Changed
- [compact list: filename (added/modified/deleted)]

### Commits
- [list of commit messages from this session]

### Issues Encountered
- [errors hit and how they were resolved]

### Pending / Next Steps
- [what's left to do, open questions, blockers]

### Session Stats
- Duration: ~Xh Ym
- Files changed: N
- Commits: N
- Lines added/removed: +X / -Y
```

### Step 3: Store and Present

1. **Present** the recap to the user in chat
2. **Store** in recent memory with tag `[recap]`
3. **Update** project-memory if architectural decisions were made
4. **Optionally** write to `docs/session-logs/YYYY-MM-DD.md` if the user wants persistent logs

## Handoff Mode

When the user says "hand off" or "someone else will pick this up":

Add to the recap:
- **Context needed**: what does the next person need to know?
- **Environment state**: any uncommitted changes, feature branches, running processes?
- **Critical warnings**: anything fragile, half-done, or time-sensitive?

## Integration

- **memory-manager**: recap feeds into session-end memory writes
- **pattern-tracker**: recap data contributes to classification accuracy stats
- **project-memory**: architectural decisions from recap are promoted to project memory
- **memory-consolidator**: recaps are a primary input for consolidation

## Rules

1. **Keep it under 30 lines.** A recap nobody reads is useless.
2. **Lead with accomplishments.** What was done matters more than what was attempted.
3. **Include file references.** "Fixed auth bug" is less useful than "Fixed null check in src/lib/auth.ts:42".
4. **Be honest about pending work.** Don't hide incomplete tasks.
5. **Don't generate a recap if nothing happened.** If the session was just Q&A with no changes, say so in one line.
