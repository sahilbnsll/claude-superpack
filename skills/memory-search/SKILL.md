---
name: memory-search
description: This skill should be used when the user references past context ("remember when...", "we discussed...", "last time...", "what did we decide about..."), when context from past sessions would help the current task, or when looking up a previously encountered error or decision. It searches across all memory files.
version: 4.0.0
---

# Memory Search

Query persistent memory when past context is relevant. Search across recent memory, long-term memory, and project memory.

## Why This Exists

Memory is only useful if you can find things in it. This skill provides structured search across all memory files, with graceful degradation: vector search if embeddings are available, keyword search always.

## When to Activate

- User says: "remember when...", "we discussed...", "last time...", "what did we decide about..."
- User references a past error, decision, or preference
- Current task resembles something done before (detect via auto-router)
- Looking up known issues before debugging

## Search Strategy

### Tier 1: Keyword Search (always available)

Search order (stop when results found):
1. `~/.claude/memory/recent.md` — most likely to have recent context
2. `~/.claude/memory/projects/<current-project>.md` — project-specific
3. `~/.claude/memory/long-term.md` — distilled facts and patterns
4. `~/.claude/memory/projects/*.md` — all other projects (for cross-project patterns)

**Method**: Grep for keywords from the user's query. Match against:
- Entry summaries (the one-line text after the timestamp)
- Tags (`[decision]`, `[error]`, `[preference]`, etc.)
- Context lines (`project=`, `files=`)

### Tier 2: Tag-Filtered Search

If the query implies a specific type:
- "what did we decide" → filter for `[decision]` tags
- "that error" → filter for `[error]` tags
- "my preference" → filter for `[preference]` tags
- "known issue" → search `## Known Issues` in project memory

### Tier 3: Temporal Search

If the query includes time references:
- "yesterday" → filter entries from last 24 hours
- "last week" → filter entries from last 7 days
- "when we started this project" → check project memory `Created:` date

### Tier 4: Semantic Search (optional, requires setup)

If ChromaDB is available (`pip install chromadb`) AND a Gemini API key is set (`GEMINI_API_KEY` env var):

1. Embed the query with Gemini Embedding 2
2. Search the vector store at `~/.claude/memory/vectors/`
3. Return top-5 results by cosine similarity
4. Cross-reference with keyword results for best ranking

**Degradation**: If ChromaDB or Gemini is not available, skip Tier 4 silently. Never error. Never ask the user to install anything.

## Search Output

Return results in this format:

```
## Memory Search Results

Query: "auth redirect issue"
Source: project-memory (lumacv)
Found: 2 results

### 1. [error] 2026-04-06 17:30
Auth redirect fails on Vercel preview deploys (workaround: use NEXT_PUBLIC_URL)
Source: ~/.claude/memory/projects/sahilbnsll-lumacv.md § Known Issues

### 2. [decision] 2026-04-06 17:45
Fixed by configuring Supabase redirect URL to include /auth/callback with PKCE code exchange
Source: ~/.claude/memory/recent.md
```

## Search Rules

1. **Limit results to 5**. More is noise.
2. **Show source file and section** for each result.
3. **Most recent first** when relevance is equal.
4. **Cross-project results are lower priority** unless the user explicitly asks.
5. If no results found: say so honestly. Do not hallucinate past conversations.

## Integration

- **memory-manager**: search is read-only; memory-manager handles writes.
- **auto-router**: before routing Class B/C/D tasks, check if a similar task was done before.
- **error-catalog**: for error lookups, delegate to error-catalog if it has a match; use memory-search as fallback.
