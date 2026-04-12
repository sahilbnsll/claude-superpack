---
name: project-memory
description: This skill should be used when starting work on a project for the first time, when the user asks about project architecture, tech stack, known issues, or active work, or when switching between projects. It maintains per-project state files that persist across sessions.
version: 4.0.0
---

# Project Memory

Track per-project state that persists across sessions. Architecture decisions, tech stack, known issues, active work, and technical debt.

## Why This Exists

Every time you open a project in a new session, you re-discover the same things: what framework it uses, what the architecture looks like, what issues are known. Project memory eliminates this cold-start problem.

## Storage

```text
~/.claude/memory/projects/<project-slug>.md
```

The project slug is derived from:
1. Git remote URL (preferred): `github.com/sahilbnsll/lumacv` → `sahilbnsll-lumacv`
2. Directory name (fallback): `/Users/sahil/Desktop/Projects/lumacv` → `lumacv`

## When to Create Project Memory

Create a new project memory file on **first interaction** with a project. Do not ask — just do it.

Detection: if `~/.claude/memory/projects/<slug>.md` does not exist and you are working in a project directory, create it.

## File Structure

Every project memory file follows this exact structure:

```markdown
# <Project Name>
Path: /absolute/path/to/project
Remote: git@github.com:user/repo.git
Created: YYYY-MM-DD
Last updated: YYYY-MM-DD

## Tech Stack
- Runtime: Node.js 20 / Python 3.11 / etc.
- Framework: Next.js 14 / FastAPI / etc.
- Database: PostgreSQL / Supabase / etc.
- Key deps: Prisma, Tailwind, etc.

## Architecture
Brief description of the project structure. Key modules, layers, entry points.
- src/app/ — Next.js App Router pages
- src/lib/ — shared utilities
- src/components/ — React components

## Active Work
What is currently being worked on. Updated each session.
- [branch-name]: description of what's being done

## Known Issues
Bugs, quirks, and gotchas discovered during work.
- Auth redirect fails on Vercel preview deploys (workaround: use NEXT_PUBLIC_URL)
- Rate limiting on Gemini API causes 429s under load

## Technical Debt
Things that should be fixed but aren't urgent.
- schema.ts has duplicate type definitions
- No error boundary on the resume preview page

## Key Decisions
Architectural and design decisions with rationale.
- 2026-04-04: Switched from single-entry to array-based resume schema for flexibility
- 2026-04-06: Added multi-provider AI failover (Gemini → OpenRouter → fallback)
```

## Update Rules

1. **Update incrementally** — append to sections, do not rewrite the whole file.
2. **Update `Last updated` timestamp** on every modification.
3. **Active Work section** — update at session start (what you're working on) and session end (what was accomplished).
4. **Known Issues** — add issues as they're discovered, mark resolved ones with ~~strikethrough~~.
5. **Key Decisions** — record with date and rationale. These are the most valuable entries.

## Loading Project Memory

When starting work on a recognized project:

1. Read the `## Tech Stack` and `## Active Work` sections inline (small, high-value).
2. Note the paths to `## Architecture`, `## Known Issues`, `## Key Decisions` — read on demand.
3. If `## Known Issues` has entries relevant to current work, surface them proactively.

## Cross-Referencing

- When recording a decision to `recent.md` via memory-manager, also add it to the project's `## Key Decisions`.
- When encountering an error, check `## Known Issues` first — the fix may already be documented.
- When the user asks "what were we working on?", read `## Active Work` from the project memory.

## Multi-Project Support

Users may switch between projects in a session. When the working directory changes:

1. Detect new project slug.
2. If different from current: save any pending updates to the old project memory.
3. Load the new project memory.
4. Note the switch in `recent.md`: `### YYYY-MM-DD HH:MM [context] Switched to project <slug>`.
