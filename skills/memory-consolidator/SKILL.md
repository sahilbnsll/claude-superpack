---
name: memory-consolidator
description: This skill should be used when the user asks to "consolidate memory", "clean up memory", "promote recent to long-term", or when recent memory exceeds 200 lines. It distills patterns from recent memory and promotes important entries to long-term memory.
version: 4.0.0
---

# Memory Consolidator

Distill patterns from recent memory and promote important entries to long-term storage. Prune expired entries.

## Why This Exists

Recent memory grows with every session. Without consolidation, it becomes noisy and slow to load. This skill extracts the signal — repeated patterns, confirmed preferences, stable facts — and promotes them to long-term memory where they persist indefinitely.

## When to Run

- **Manual**: user says "consolidate memory", "clean up memory"
- **Automatic**: when `recent.md` exceeds 200 lines (memory-manager should suggest this)
- **Scheduled**: via cron using `scripts/consolidate-memory.js` (optional)

## Consolidation Workflow

### 1. Read

Read `~/.claude/memory/recent.md` in full. Parse all entries into structured data:

```
{
  timestamp: "2026-04-10 13:00",
  tag: "decision",
  summary: "Chose Prisma over Drizzle...",
  context: { project: "lumacv", files: "schema.ts" }
}
```

### 2. Analyze

Group entries by tag and look for promotion candidates:

**Promote to long-term if**:
- `[preference]` entries: always promote (user preferences are stable)
- `[pattern]` entries: always promote
- `[decision]` entries: promote if the same decision appears 2+ times across different sessions
- `[fact]` entries: promote if referenced in 2+ sessions or flagged as important
- `[error]` entries: promote if the same error occurred 2+ times (also add to error-catalog)

**Do NOT promote**:
- `[context]` entries (session-specific, ephemeral)
- One-off decisions that never recurred
- Facts about code that may have changed since

### 3. Write to Long-Term

Append promoted entries to `~/.claude/memory/long-term.md` under the correct section:

```markdown
# Long-Term Memory
Distilled facts, preferences, and patterns. Manually curated and auto-promoted.

## Preferences
- Code style: functional over OOP (observed 7 times, first: 2026-03-15)
- Naming: camelCase for JS/TS, snake_case for Python (observed 12 times)

## Patterns
- Auth issues on Vercel deploys usually involve redirect URL misconfiguration
- Rate limiting on free-tier APIs resolved by multi-provider failover

## Facts
- Supabase requires PKCE code exchange for email auth callbacks
- Gemini API free tier: 15 RPM, 1M tokens/day

## Recurring Errors
- TypeError "Cannot read properties of undefined (reading 'map')" → add optional chaining
- Zod validation errors on API routes → check enum values match schema
```

**Deduplication**: before appending, check if a semantically equivalent entry already exists. If so, increment its observation count, do not duplicate.

### 4. Prune Recent

Remove from `recent.md`:
- All entries older than 48 hours
- All entries that were promoted to long-term
- Keep entries from the last 48 hours that were NOT promoted

### 5. Update Index

Update `~/.claude/memory/index.json` with:
- Entry counts for recent and long-term
- Last consolidation timestamp
- Number of entries promoted and pruned

### 6. Report

Output a summary:

```
## Memory Consolidation Report

Scanned: 47 recent entries
Promoted to long-term: 8
  - 3 preferences
  - 2 patterns
  - 2 facts
  - 1 recurring error
Pruned (expired): 31
Remaining in recent: 8
Long-term total: 53 entries
```

## Long-Term Memory Format

The `long-term.md` file uses H2 sections for categories. Within each section, entries are bullet points with optional metadata in parentheses.

```markdown
## Preferences
- <preference text> (confidence: high|medium, observed: N times, first: YYYY-MM-DD)

## Patterns
- <pattern text> (observed: N times, projects: <list>)

## Facts
- <fact text> (discovered: YYYY-MM-DD, project: <slug>)

## Recurring Errors
- <error signature> → <fix> (occurrences: N, last: YYYY-MM-DD)
```

## Safety

- Never delete `long-term.md`. Only append to it.
- Always verify `recent.md` entries parse correctly before pruning.
- If parsing fails, back up the file and warn the user.
- Consolidation is idempotent — running it twice should not create duplicates.
