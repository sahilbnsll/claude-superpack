---
name: memory-manager
description: This skill should be used at the start of every session to load persistent memory, during work to record key decisions and facts, and at session end to prune stale entries. It manages the lifecycle of recent-memory, long-term-memory, and project-memory files. Activate automatically on every session.
version: 4.0.0
---

# Memory Manager

Manage persistent memory across Claude Code sessions. Load context at startup, record during work, prune on exit.

## Why This Exists

Claude Code has no memory between sessions. Every new conversation starts cold. This skill creates a persistent memory layer using markdown files so that decisions, preferences, patterns, and project context survive between sessions.

## Memory Architecture

```text
~/.claude/memory/
├── recent.md            ← rolling 48-hour context (loaded inline at startup)
├── long-term.md         ← distilled facts and patterns (referenced by path)
├── projects/
│   └── <slug>.md        ← per-project state (loaded when working on that project)
└── index.json           ← metadata: timestamps, entry counts, sizes
```

## Session Lifecycle

### 1. Startup — Load Memory

At the start of every session:

1. Read `~/.claude/memory/recent.md` inline. This is your short-term context.
2. Note the path `~/.claude/memory/long-term.md` — do NOT read it inline. Reference it when you need a deep lookup.
3. Detect the current project from `$PWD` or git remote. If a matching file exists in `~/.claude/memory/projects/`, load its `## Active Work` section inline.

If `~/.claude/memory/` does not exist, create it:
```
mkdir -p ~/.claude/memory/projects
```

If `recent.md` does not exist, create it with a header:
```markdown
# Recent Memory
Rolling 48-hour context. Auto-pruned entries older than 48 hours.
```

### 2. During Work — Record

After any significant event, append an entry to `~/.claude/memory/recent.md`:

```markdown
### YYYY-MM-DD HH:MM [tag]
One-line summary of what happened.
Context: project=<slug>, files=<relevant files>
```

**Tags** (always use exactly one):
- `[decision]` — a design or implementation choice was made
- `[preference]` — user expressed a preference (style, tool, approach)
- `[fact]` — a discovery about the codebase, API, or environment
- `[error]` — an error was encountered and resolved
- `[pattern]` — a recurring pattern was identified
- `[context]` — important background context for future sessions

**What to record** (be selective — not every action):
- Architecture decisions and their rationale
- User-expressed preferences ("I prefer X over Y")
- Non-obvious discoveries ("this API requires header X")
- Errors that took >2 minutes to debug
- Patterns that recur across tasks
- Active work state when session ends

**What NOT to record**:
- Routine file edits
- Obvious facts (language syntax, standard library usage)
- Anything already in the project's README or docs

### 3. Exit — Prune

Before session ends or when memory feels heavy:

1. Scan `recent.md` for entries with timestamps older than 48 hours.
2. Remove expired entries.
3. If an expired entry seems important (tagged `[pattern]` or `[preference]`), note it for promotion to long-term memory.
4. Update `index.json`:
   ```json
   {
     "recent": { "entries": 12, "last_updated": "2026-04-10T13:00:00Z" },
     "long_term": { "entries": 45, "last_updated": "2026-04-09T02:00:00Z" },
     "projects": { "lumacv": "2026-04-10T12:30:00Z" }
   }
   ```

## Format Rules

- Keep `recent.md` under 200 lines. If it exceeds this, prune aggressively.
- Each entry is exactly 2-3 lines: header, summary, context.
- Never dump full file contents into memory. References only.
- Timestamps use local time in 24-hour format.

## Integration with Other Skills

- **auto-router**: After classification, check memory for similar past tasks and their outcomes.
- **project-memory**: When starting work on a project, load its memory file.
- **memory-search**: When the user references past context, delegate to memory-search.
- **pattern-tracker**: Feed decision outcomes back into memory for pattern detection.
- **user-profiler**: Preferences discovered during work are recorded here first, then promoted.

## Failure Modes

- If `~/.claude/memory/` is not writable: warn the user, proceed without memory. Do not fail.
- If `recent.md` is corrupted: back up the file, create a fresh one, warn the user.
- If memory is very large (>500 lines): suggest running consolidation.
