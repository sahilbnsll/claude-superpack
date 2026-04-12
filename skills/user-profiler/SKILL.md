---
name: user-profiler
description: This skill should be used to learn and apply user preferences for code style, framework choices, naming conventions, review depth, and communication style. It observes patterns in user behavior and applies learned preferences automatically. Always active in the background.
version: 4.0.0
---

# User Profiler

Learn user preferences and apply them automatically. Observe, don't ask. Apply with confidence, not assumption.

## Why This Exists

Every new session, Claude asks the user the same questions: "Which testing framework do you prefer?", "Should I use TypeScript?", "Want detailed or brief explanations?". User profiler eliminates this by learning from behavior and applying preferences automatically.

## How It Works

### Observation Sources

Preferences are inferred from user behavior, not asked:

| Source | What to Observe |
|---|---|
| Explicit statements | "I prefer functional style", "Use vitest not jest" |
| Code patterns | User always writes arrow functions, never function declarations |
| Corrections | User renames camelCase to snake_case → naming preference |
| Project config | `tsconfig.json` → TypeScript preferred; `biome.json` → biome over eslint |
| Repeated choices | User chooses Prisma in 3 projects → ORM preference |
| Rejections | User rejects a suggestion → anti-preference |

### Preference Categories

#### Code Style
- Function style: arrow vs declaration vs class methods
- Variable naming: camelCase, snake_case, PascalCase
- Import style: named vs default, relative vs absolute
- Formatting: semicolons, trailing commas, quote style
- Paradigm: functional vs OOP vs mixed

#### Tool Preferences
- Package manager: npm, yarn, pnpm, bun
- Testing: jest, vitest, pytest, go test
- Linting: eslint, biome, ruff, clippy
- ORM: Prisma, Drizzle, TypeORM, SQLAlchemy
- Frameworks: Next.js, Vite, FastAPI, Express

#### Communication Style
- Response length: detailed explanations vs concise answers
- Code comments: heavy commenting vs self-documenting
- Review depth: line-by-line vs high-level
- Explanation style: technical vs accessible

#### Architecture Patterns
- State management: Zustand, Redux, Context
- File structure: feature-based, layer-based, domain-driven
- API style: REST, GraphQL, tRPC
- Error handling: try-catch, Result types, error boundaries

### Confidence Levels

Each preference has a confidence level based on observations:

| Confidence | Observations | Action |
|---|---|---|
| Low | 1 observation | Note it, don't apply |
| Medium | 2-3 observations | Apply silently, be ready to change |
| High | 4+ observations | Apply confidently |
| Explicit | User stated directly | Apply always |

### Storage

Preferences stored in `~/.claude/memory/long-term.md` under `## Preferences`:

```markdown
## Preferences
- Code style: functional over OOP (confidence: high, observed: 7 times, first: 2026-03-15)
- Naming: camelCase for JS/TS, snake_case for Python (confidence: high, observed: 12 times)
- Testing: prefers vitest over jest (confidence: medium, observed: 3 times)
- Package manager: pnpm (confidence: explicit, stated: 2026-04-01)
- Response style: detailed explanations with code examples (confidence: high, observed: 5 times)
- Error handling: prefers early returns over nested try-catch (confidence: medium, observed: 3 times)
- Imports: prefers absolute paths with @/ alias (confidence: high, observed: 8 times)
```

## Applying Preferences

### When to Apply

- Before writing any code: check preferences for the relevant language/framework
- Before choosing a tool: check tool preferences
- Before formatting a response: check communication preferences
- Before suggesting architecture: check architecture preferences

### How to Apply

**Silently**: apply high-confidence and explicit preferences without mentioning them.

**With note**: for medium-confidence preferences, apply but mention:
```
Using vitest (based on your past preference) — let me know if you'd prefer jest.
```

**Don't apply**: low-confidence preferences. Wait for more data.

### Handling Conflicts

If a preference conflicts with the current project's configuration:
- Project config wins. If the project uses jest, use jest even if the user prefers vitest.
- Note the conflict: "This project uses jest. Sticking with it for consistency."

If a preference conflicts with best practices:
- Apply the preference anyway. User preferences override generic best practices.
- Exception: security-critical decisions (never compromise on security for preferences).

## Learning Protocol

### Recording a New Observation

When a preference signal is detected:

1. Check if this preference already exists in long-term memory
2. If yes: increment observation count, update timestamp
3. If no: add with confidence: low
4. If the observation changes a preference (user switched from jest to vitest): note the change, reset count

### Forgetting

- If a user explicitly contradicts a preference: reset it immediately
- If a preference hasn't been observed in 30+ days and was only medium confidence: demote to low
- Never auto-delete explicit preferences

## Integration

- **memory-manager**: preference observations are recorded as `[preference]` entries in recent.md
- **memory-consolidator**: promotes confirmed preferences to long-term.md
- **auto-router**: communication style preferences affect response formatting
- **task-decomposer**: architecture preferences affect how tasks are structured

## Rules

1. **Observe, don't interrogate**. Never ask "what's your preference for X?" — learn from behavior.
2. **Apply, don't announce**. High-confidence preferences are applied silently. Don't say "I'm using your preferred style."
3. **Project config overrides user preference**. Consistency within a project trumps personal preference.
4. **Be ready to be wrong**. If the user corrects a preference application, update immediately.
5. **Start neutral**. Until you have 2+ observations, don't apply any preference. Use project defaults or standard conventions.
