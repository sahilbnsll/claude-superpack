---
name: codebase-recon
description: Use before changing code in a repository whose stack, conventions, or layout you have not already established in this session — and when asked how a codebase works, where something lives, what depends on a module, or what breaks if it changes.
version: 5.0.0
license: MIT
metadata:
  layer: discovery
  pack: claude-superpack
  activation: phase
---

# Codebase recon

Learn what this repository already is, before adding to it. Most bad changes are not wrong code — they are code that ignores what was already there.

## Start with the script

```
node "${CLAUDE_SKILL_DIR}/../superpack/scripts/recon.mjs"
```

One call returns languages, package manager, frameworks, monorepo layout, the project's real lint/typecheck/test/build commands, TypeScript strictness and path aliases, test location and naming, CI, recently-churned files, agent instruction files, and the gaps that matter. That replaces a dozen speculative reads.

Then read `CLAUDE.md` / `AGENTS.md` / `CONTRIBUTING.md` if the script found them. Project instructions outrank anything you would infer.

## Then find the thing you are changing

In this order, stopping as soon as you can act:

1. **Does this already exist?** Grep for the feature's vocabulary — not the filename you expect, the words the domain uses. Half of all "add X" requests are "X exists, wire it up" or "X exists under another name".
2. **Find one good example.** Locate the closest existing implementation of the same kind of thing — another endpoint, another component, another migration. Read it in full. It is the specification for style, error handling, validation, logging, and test shape.
3. **Trace the callers.** Grep for every use of what you are about to change. This is the blast radius, and it is cheap: one search beats one broken consumer.
4. **Read the target ranges.** Now that you know the line numbers, read the ranges — not whole files.

## Conventions to capture before editing

From the example you read, not from your defaults: how errors are raised and handled · how input is validated · how things are named and where files go · what is exported and how · how tests are structured and named · what is logged and at what level · whether comments are used and for what.

Matching a convention you dislike is correct. A repository with one consistent idiom is easier to work in than one with two good ones.

## Answering architecture questions

For "what depends on X" or "what breaks if I change Y": grep for the import or symbol, group the results by directory, and report the consumer list plus which are tests. Do not build or store a graph — a cached graph goes stale silently, and a stale blast radius is worse than none. A fresh grep is fast and always true.

## Output

Report in a few lines, not an essay:

```
Next.js 15 App Router + TypeScript strict, Supabase, Tailwind. npm.
Gates: npm run lint, npx tsc --noEmit, npm run build. No test suite.
Closest example: app/api/resume/route.ts — zod-validated body, returns
{ error: code } on failure, no logging layer.
Changing lib/pdf.ts touches 6 callers, all under app/builder/.
```

## Red flags

- You are about to create a file without having found the existing example of its kind.
- You are about to introduce a library for something the repo already does another way.
- You are about to edit a shared module without having grepped its consumers.
- Recon has taken more than a few tool calls and you have not started the actual work — you are exploring, not reconnoitring. Stop and act on what you know.
