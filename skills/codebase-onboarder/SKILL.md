---
name: codebase-onboarder
description: This skill should be used when the user is new to a project, asks "how does this codebase work?", "give me an overview", "onboard me", "explain the architecture", or when project-memory has no entry for the current project. It generates a structured architecture summary by analyzing the codebase structure, entry points, data flow, and conventions.
version: 4.0.0
---

# Codebase Onboarder

Generate a structured architecture overview for any codebase. Understand a project in minutes, not days.

## Why This Exists

Every developer's first day on a new codebase is the same: Where's the entry point? How is it structured? What patterns does it use? What should I not touch? This skill answers all of that by analyzing the code itself — not relying on potentially outdated documentation.

## When to Activate

- When the user is new to a project and asks for an overview
- When project-memory has no entry for the current project
- When the user asks "how does this work?", "explain the architecture", "onboard me"
- When graph-builder runs for the first time on a project
- When switching to an unfamiliar project

## Onboarding Process

### Step 1: Project Identity

Gather basic project information:

1. **Name and description**: from package.json, pyproject.toml, Cargo.toml, go.mod, or README
2. **Language**: primary language from file extensions
3. **Framework**: detect from dependencies and config files
4. **Package manager**: from lockfile presence
5. **Build system**: from config (webpack, vite, tsconfig, Makefile, etc.)

```
## Project: lumacv
Language: TypeScript
Framework: Next.js 14 (App Router)
Package manager: pnpm
Build: Next.js built-in (Turbopack dev)
```

### Step 2: Structure Map

Analyze the directory layout:

1. `ls` the top-level directories
2. Identify the pattern:
   - `src/` monolith? `packages/` monorepo? Feature-based? Layer-based?
3. Map key directories to their purpose:

```
### Project Structure

src/
├── app/          → Next.js App Router pages and layouts
├── components/   → Reusable UI components (60 files)
├── lib/          → Core business logic and utilities
├── hooks/        → Custom React hooks
├── types/        → Shared TypeScript type definitions
├── styles/       → Global styles and theme configuration
└── __tests__/    → Test files (Jest + React Testing Library)

config/           → Environment and app configuration
public/           → Static assets
prisma/           → Database schema and migrations
```

### Step 3: Entry Points and Data Flow

Trace the main execution paths:

1. **Web apps**: identify pages/routes → trace to API calls → trace to data layer
2. **APIs**: identify route definitions → trace to handlers → trace to database
3. **CLI tools**: identify bin entry → trace to command handlers
4. **Libraries**: identify main export → trace to public API

```
### Data Flow

User Request → Next.js App Router
  → Page Component (app/dashboard/page.tsx)
    → Server Action (lib/actions/dashboard.ts)
      → Prisma ORM (lib/db.ts)
        → PostgreSQL

Authentication: NextAuth.js
  → app/api/auth/[...nextauth]/route.ts
    → lib/auth.ts (providers, callbacks)
      → Prisma (user lookup)
```

### Step 4: Conventions and Patterns

Identify project conventions by sampling code:

1. **Naming**: camelCase? snake_case? PascalCase for components?
2. **File organization**: one component per file? barrel exports?
3. **State management**: Context? Redux? Zustand? Server state?
4. **Error handling**: try/catch? Result types? Error boundaries?
5. **Testing**: what's tested? what framework? where are tests?
6. **Linting/formatting**: ESLint? Prettier? Biome? What rules?

```
### Conventions

- Components: PascalCase, one per file, co-located styles
- Functions: camelCase, explicit return types
- Imports: absolute paths via @/ alias (tsconfig paths)
- State: React Server Components + server actions (minimal client state)
- Error handling: Error boundaries for UI, try/catch in server actions
- Testing: Vitest + React Testing Library, co-located test files
- Formatting: Prettier with default config, enforced by pre-commit hook
```

### Step 5: Key Files

Identify the most important files to read:

```
### Key Files (read these first)

1. src/app/layout.tsx — root layout, providers, global setup
2. src/lib/auth.ts — authentication configuration
3. src/lib/db.ts — database connection and client
4. prisma/schema.prisma — data model (source of truth)
5. src/app/api/ — API routes
6. next.config.js — framework configuration
```

### Step 6: Gotchas and Warnings

Identify potential pitfalls:

1. **Unusual patterns**: anything non-standard that could trip someone up
2. **Known issues**: from README, KNOWN_ISSUES, or TODO comments
3. **Technical debt**: large files, complex functions, TODO density
4. **Environment requirements**: required env vars, external services, API keys

```
### Watch Out For

- Auth callback in lib/auth.ts:45 has a workaround for NextAuth bug #1234
- Database migrations must run before starting dev server
- The `legacy/` directory is deprecated — don't add new code there
- Env vars: DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL required
```

## Output

The full onboarding document is presented in chat and optionally saved:

```
## Codebase Onboarding: [project-name]

### Identity
[project basics]

### Structure
[directory map with purposes]

### Data Flow
[entry points and execution paths]

### Conventions
[coding patterns and standards]

### Key Files
[ordered list of files to read first]

### Watch Out For
[gotchas and warnings]

Save to project-memory? (y/n)
```

## Integration

- **graph-builder**: if no graph exists, onboarder triggers a graph build first
- **graph-navigator**: uses graph for dependency analysis and data flow mapping
- **project-memory**: onboarding results are saved as the project memory baseline
- **smart-discovery**: onboarding identifies key files, improving future discovery
- **user-profiler**: adapt onboarding depth to user's expertise level

## Rules

1. **Analyze, don't assume.** Read the actual code to determine conventions — don't guess from the framework.
2. **Keep it under 100 lines.** An onboarding doc nobody reads is useless.
3. **Prioritize what's different.** Standard Next.js patterns don't need explanation. Non-standard patterns do.
4. **Include the "why" for gotchas.** "Don't touch legacy/" is less useful than "legacy/ is deprecated because we migrated to App Router in Q1."
5. **Save to project-memory.** The onboarding analysis shouldn't need to run twice.
6. **Adapt depth to scope.** A 10-file project needs a 20-line overview. A 500-file project needs the full treatment.
