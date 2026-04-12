---
name: pattern-tracker
description: This skill should be used after every completed task to record the classification decision, execution path, and outcome. It tracks which patterns lead to success and which lead to failure, feeding data back to auto-router for improved routing decisions over time.
version: 4.0.0
---

# Pattern Tracker

Track decision patterns and outcomes across sessions. Build a statistical model of what works.

## Why This Exists

auto-router makes classification decisions based on static heuristics. Pattern tracker observes actual outcomes and builds a data-driven feedback loop. Over time, routing gets smarter because it's informed by real results.

## When to Activate

- After every completed task (success or failure)
- When auto-router needs historical data for an ambiguous classification
- When the user asks: "what's been working?", "show me stats"

## Data Model

### Pattern Store

Location: `~/.claude/memory/patterns.json`

```json
{
  "version": "1.0",
  "total_tasks": 156,
  "last_updated": "2026-04-10T13:00:00Z",
  "patterns": [
    {
      "id": "p_001",
      "timestamp": "2026-04-10T13:00:00Z",
      "classification": "C",
      "route": "parallel-orchestrate",
      "task_summary": "refactor auth module and add tests",
      "worker_count": 3,
      "outcome": "success",
      "outcome_signals": {
        "user_accepted": true,
        "rework_needed": false,
        "tests_passed": true,
        "build_passed": true,
        "post_review_clean": true
      },
      "duration_seconds": 180,
      "tokens_estimated": 45000,
      "project": "lumacv",
      "tags": ["refactor", "testing"]
    }
  ],
  "statistics": {
    "by_class": {
      "A": { "total": 45, "success": 44, "rate": 0.98 },
      "B": { "total": 67, "success": 58, "rate": 0.87 },
      "C": { "total": 32, "success": 25, "rate": 0.78 },
      "D": { "total": 12, "success": 9, "rate": 0.75 }
    },
    "by_worker_count": {
      "1": { "success_rate": 0.92 },
      "2": { "success_rate": 0.85 },
      "3": { "success_rate": 0.78 },
      "4+": { "success_rate": 0.65 }
    },
    "common_failure_patterns": [
      {
        "pattern": "Class C with 4+ workers",
        "failure_rate": 0.35,
        "common_cause": "cross-worker conflicts on shared files"
      }
    ]
  }
}
```

## Recording a Pattern

After each task completes, record:

### 1. Classification Data
- What class was assigned (A/B/C/D)?
- What route was taken?
- Was the classification overridden by the user?

### 2. Execution Data
- How many workers were spawned?
- How long did it take?
- Estimated token usage

### 3. Outcome Data

Outcome signals (automatically detected):

| Signal | How to Detect | Weight |
|---|---|---|
| User accepted result | No rework request after delivery | +2 |
| User requested rework | User asks to redo or change approach | -2 |
| Tests passed (post-review) | post-review reports pass | +1 |
| Tests failed | post-review reports failure | -1 |
| Build passed | post-review reports pass | +1 |
| Lint clean | post-review reports pass | +0.5 |
| Rollback triggered | rollback skill was used | -3 |

**Composite outcome**:
- Sum of weights ≥ 2: `success`
- Sum of weights 0–1: `partial`
- Sum of weights < 0: `failure`

## Feeding Back to auto-router

When auto-router is classifying a new task:

1. pattern-tracker provides historical statistics
2. If the task matches a known failure pattern: warn auto-router
3. Example: "Tasks with 4+ workers have a 35% failure rate. Consider splitting into two sequential orchestrations."

### Recommendation Format

```
## Pattern Insight

This task resembles past Class C executions with 3 workers.
Historical success rate for this pattern: 78% (25/32)

Common issues in similar tasks:
- Cross-worker conflicts on shared config files (4 occurrences)
- Test failures when auth module is part of blast radius (2 occurrences)

Recommendation: proceed with Class C, but assign shared files to one worker.
```

## Statistics Dashboard

When the user asks "show me stats" or "what's been working":

```
## Pattern Statistics

Total tasks tracked: 156

By Classification:
  Class A: 98% success (45 tasks)
  Class B: 87% success (67 tasks)
  Class C: 78% success (32 tasks)
  Class D: 75% success (12 tasks)

Top Failure Patterns:
  1. 4+ parallel workers → 35% failure (6/17)
  2. Cross-module refactors as Class C → 40% failure (4/10)
  3. Database migration + feature in same orchestration → 50% failure (2/4)

Insights:
  - Tasks are most efficient as Class B (87% success, lowest token cost)
  - Parallel orchestration works best with 2-3 workers (85% success)
  - Consider splitting 4+ worker tasks into sequential batches
```

## Rules

1. **Record every task**, even trivial ones. The data is only useful if it's complete.
2. **Outcome detection is automatic**. Don't ask the user "was this successful?" — infer from post-review, rework requests, and rollbacks.
3. **Statistics update on every record**. Don't defer computation.
4. **Never auto-modify auto-router**. Provide data and recommendations only. The routing logic stays in auto-router.
5. **Privacy**: patterns.json stays local. Never transmit this data anywhere.
