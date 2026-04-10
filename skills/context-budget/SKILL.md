---
name: context-budget
description: This skill should be used throughout every session to track estimated token usage, warn when context is getting heavy, suggest compaction points, and ensure efficient use of the context window. It activates automatically and runs in the background.
version: 3.0.0
---

# Context Budget

Track and optimize token usage across the session. Warn before context overflow. Suggest compaction at the right moments.

## Why This Exists

Claude Code's context window is finite. Without tracking, you discover you've run out of context mid-task — the worst possible time. This skill maintains a running estimate and optimizes usage proactively.

## How It Works

### Token Estimation

Maintain a mental running tally of tokens consumed:

| Operation | Estimated Tokens |
|---|---|
| File read (per 100 lines) | ~500 tokens |
| Grep results (per 10 matches) | ~200 tokens |
| Glob listing (per 50 files) | ~150 tokens |
| Skill invocation overhead | ~300 tokens |
| Agent spawn (base cost) | ~1,000 tokens |
| User message (per 100 words) | ~150 tokens |
| Your response (per 100 words) | ~150 tokens |

These are rough estimates. The goal is awareness, not precision.

### Budget Thresholds

| Usage | Action |
|---|---|
| 0-40% | ✅ Normal operation |
| 40-60% | 📊 Report budget in next response |
| 60-80% | ⚠️ Warn: "Context at ~X%. Consider compacting." |
| 80-90% | 🔶 Strongly suggest: "Run /compact now to free context." |
| 90%+ | 🔴 Emergency: summarize all working state, then compact |

### Budget Report Format

Include in responses when threshold triggers:

```
📊 Context: ~42,000 / 200,000 tokens (21%)
   File reads: ~15,000 (8 files)
   Skill overhead: ~4,000 (3 invocations)
   Conversation: ~23,000
```

### Compaction Protocol

When suggesting compaction, prepare first:

1. **Summarize working state**: what task is in progress, what files have been read, what decisions were made.
2. **Save to memory**: record the working state to `recent.md` via memory-manager.
3. **Identify disposable context**: raw file contents that have been analyzed, grep results that have been processed, error outputs that have been resolved.
4. **Then compact**: the summary becomes the new context.

Post-compaction checkpoint:
```
📊 Context: ~8,000 / 200,000 tokens (4%) — compacted from 65%
   Working state preserved in memory
   Ready to continue
```

## Integration with auto-router

Inform routing decisions based on budget:

- If budget >70%: avoid upgrading to Class C (parallel orchestration is expensive)
- If budget >85%: refuse to spawn new agents. Suggest completing current work first.
- Class A tasks should never exceed 5,000 tokens total.

## Integration with Other Skills

- **graph-reviewer**: encourage `sigs` and `diff` reading strategies when budget is >50%
- **smart-discovery**: weight file selection towards smaller files when budget is constrained
- **merge-coordinator**: after merge, budget is usually high — suggest compaction
- **task-decomposer**: when decomposing, factor budget into the number of workers (each costs ~1,000 base tokens)

## Rules

1. **Never block on budget alone**. Warn, suggest, but don't refuse to work unless at 95%+.
2. **Budget is an estimate**. Off by 20% is fine. The goal is preventing surprise context exhaustion.
3. **Report minimally**. One line in the response, not a full budget breakdown every time.
4. **Proactive, not reactive**. Suggest compaction BEFORE it's needed, not after context overflows.
