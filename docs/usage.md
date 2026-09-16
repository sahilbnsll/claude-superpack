# Usage

## Nothing to invoke

The skills trigger on their own conditions. You work normally; the pack changes what
happens when a task turns out to be risky, ambiguous, or in a domain with sharp edges.

To reach the core explicitly:

```
/superpack
```

## What a real task looks like

```
> Add rate limiting to the login endpoint.

Scope S2 / Risk R2 — auth path, new shared middleware, 3 call sites.

[reads backend.md and security.md]
[runs recon.mjs — express + prisma; gates: npm run lint, npx tsc --noEmit, npm test]
[finds the existing middleware pattern in src/middleware/cors.ts]

Three things change the shape of this. My recommendation on each:
1. Per user or per API key? → per API key, matches how billing is keyed
2. 429 with Retry-After, or queue? → 429; queuing moves the problem into our memory
3. Exempt internal service calls? → yes, or the nightly batch starts failing at 2am

> go

[implements, matching the existing middleware idiom]
[runs gates.mjs — lint + typecheck + 34/34 tests pass]
[runs diffstat.mjs — R2 confirmed: auth path, no migration, config-only rollback]

Done: per-key limiting on /api/login, 429 + Retry-After, internal tokens exempt.
Verified: lint + typecheck + 34/34 tests pass; the over-limit case and the
  unauthorised-caller case are both covered by new tests.
Rollback: RATE_LIMIT_ENABLED=false, no deploy needed.
Worth knowing: the limiter is in-process, so limits are per-instance until it
  moves to Redis.
```

The three things to notice: the sizing line before any work, the questions carrying
recommendations so "go" is a complete answer, and a report that states what was verified
and what is still true but unpleasant.

## What it does on a trivial task

```
> The footer says "Copright 2025". Fix it.

Fixed the typo in components/footer.tsx:18. The year is also stale — want 2026?
```

No classification block, no plan, no review. S0 work getting ceremony is treated as a
defect, and the benchmark measures it.

## When it will stop and ask

Only for R3 — actions you cannot quietly undo:

```
> Apply the terraform changes.

terraform plan wants to replace aws_db_instance.primary. That destroys the current
instance and its data and creates a new empty one. Plan: 1 to add, 0 to change,
1 to destroy. Confirm before I run apply?
```

An earlier "go ahead" does not authorise this. The blast radius has to be said out loud
and agreed for the specific action.

## Invoking a skill directly

Each skill is user-invocable if you want it out of sequence:

```
/grilling-requirements     interrogate a plan before building
/codebase-recon            what is this repo, where does X live
/planning-changes          write the plan and the rollback
/debugging-systematically  stop guessing, find the cause
/verifying-evidence        prove the current claim
/reviewing-before-done     last pass before reporting complete
/securing-changes          threat model and pre-commit scan
/shipping-safely           gate in front of something irreversible
```

## Running the scripts yourself

They are ordinary Node programs and work outside Claude entirely.

```bash
node $HOME/.claude/skills/superpack/scripts/recon.mjs
node $HOME/.claude/skills/superpack/scripts/gates.mjs --only lint,typecheck
node $HOME/.claude/skills/superpack/scripts/diffstat.mjs --base main
node $HOME/.claude/skills/superpack/scripts/secrets.mjs --staged
```

`secrets.mjs` and `gates.mjs` exit non-zero on failure, so they work as a pre-commit hook
or a CI step. See [scripts.md](scripts.md).

## CLI

Run it with `npx`, which needs no global install and no PATH setup:

```bash
npx @sahilbnsll/claude-superpack             # status and per-turn context cost
npx @sahilbnsll/claude-superpack skills      # what's installed, and the reference library
npx @sahilbnsll/claude-superpack doctor      # duplicate installs, stale v4 skills, total skill count
npx @sahilbnsll/claude-superpack uninstall   # remove the skills
```

With a global install (`npm install -g @sahilbnsll/claude-superpack`), the same commands are
available as `claude-superpack <command>`. `bench` runs the benchmark suite from a clone.

`doctor` is worth running once after upgrading, and again if sessions start feeling heavy —
it reports how many skill directories in total are competing for per-turn context, across
every pack you have installed.

## Turning parts off

The pack is nine independent directories. Delete any you do not want from
`~/.claude/skills/` — nothing else breaks. `superpack` is the one that makes the rest
cohere; the others degrade gracefully on their own.

To silence a skill without deleting it, add `user-invocable: false` to keep it available
to Claude but out of your `/` menu, or `disable-model-invocation: true` to make it manual
only.
