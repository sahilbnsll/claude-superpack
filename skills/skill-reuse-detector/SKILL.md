---
name: skill-reuse-detector
description: This skill should be used before implementing any Class B, C, or D task. It checks whether an existing installed skill already handles part or all of the requested work, preventing unnecessary reimplementation and ensuring the full skill library is utilized.
version: 3.0.0
---

# Skill Reuse Detector

Before building something, check if a skill already handles it. Stop reinventing wheels.

## Why This Exists

Users install dozens of skills. Claude Code loads skill descriptions but doesn't always connect a task to an existing skill. This skill explicitly checks for reuse opportunities before implementation begins.

## When to Activate

After auto-router classifies a task as Class B, C, or D — before any implementation work starts.

## Detection Process

### 1. Extract Task Keywords

From the user's request, extract:
- **Action verbs**: build, test, deploy, review, refactor, debug, migrate
- **Domain nouns**: auth, database, API, UI, cache, queue, webhook
- **Tool names**: Docker, Kubernetes, Terraform, Prisma, Next.js

### 2. Scan Installed Skills

Search two locations:
1. `~/.claude/skills/` — globally installed skills (including this superpack)
2. `.claude/skills/` — project-local skills (in current working directory)

For each skill, read the YAML frontmatter:
```yaml
name: <skill-name>
description: <when to use this skill>
```

### 3. Match Strategy

**Exact match**: task keywords appear in skill name or description
- "deploy to Vercel" → matches `vercel-deployment` skill
- "create a PR" → matches `github` skill

**Semantic match**: task intent maps to skill purpose
- "optimize database queries" → matches `database-optimizer` skill
- "fix accessibility issues" → matches `wcag-audit-patterns` skill

**Partial match**: skill handles part of the task
- "build an API with auth" → `auth-implementation-patterns` covers auth, manual for the rest

### 4. Output

```
## Skill Reuse Check

Task: "set up CI/CD with GitHub Actions"

✅ Exact match found:
  • github-actions-templates — Production-ready GitHub Actions workflow patterns
    Location: ~/.claude/skills/github-actions-templates/SKILL.md

🟡 Partial matches:
  • github — Use the gh CLI for issues, pull requests, Actions runs
  • deployment-pipeline-design — Architecture patterns for multi-stage CI/CD

Recommendation: Use github-actions-templates as the primary skill.
Read its SKILL.md before implementing.
```

If no match:
```
## Skill Reuse Check

Task: "implement WebSocket real-time updates"
No matching skills found.
Proceeding with manual implementation.
```

### 5. Apply

If a match is found:
1. Suggest reading the skill's SKILL.md for patterns and conventions
2. Note which parts of the task are covered and which need manual work
3. Log the reuse decision to memory-manager for pattern tracking

## Match Scoring

```
score = (exact_name_match × 10) +
        (keyword_in_description × 3) +
        (domain_overlap × 2) +
        (action_verb_match × 1)
```

Only report skills with score ≥ 3. Below that threshold, the match is too weak.

## Rules

1. **Quick check, not a deep scan**. Read YAML frontmatter only (first 5 lines of SKILL.md), not full file contents.
2. **Report, don't enforce**. Always let the user decide whether to use the suggested skill.
3. **Log reuse to memory**. Track which skills are frequently matched — this helps user-profiler learn preferences.
4. **Don't match this skill pack against itself**. If the task is about orchestration, don't suggest auto-router (it's already active).
5. **Cross-check with memory**. If the user previously rejected a skill match, don't suggest it again for the same pattern.
