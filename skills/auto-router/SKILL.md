---
name: auto-router
description: This skill should be used when the user submits any implementation request, code change, refactoring, feature addition, bug fix, migration, or multi-step task. It classifies request complexity and routes to the appropriate workflow. Do not use for simple questions, explanations, or information retrieval that require no code changes.
version: 4.0.0
---

# Auto Router

Classify every actionable request before executing anything. Route to the simplest workflow that can deliver the outcome correctly.

## Why This Exists

Context is the most expensive resource. Spawning agents, reading files, and running pipelines for trivial tasks wastes tokens and time. Conversely, handling a cross-cutting refactor as a single-thread edit creates risk. The router eliminates both failure modes.

## Classification Taxonomy

### Class A -- Direct Response

The request asks for an explanation, opinion, or single-concept answer.

Signals:
- question words without action verbs (what, why, how does, explain)
- no files need to change
- 15 words or fewer with no implementation intent

Action: answer directly. No skills. No file reads beyond what the answer requires.

### Class B -- Single-Agent Execution

The request requires code changes scoped to one concern.

Signals:
- one bug fix, one feature, one file or tightly coupled module
- verbs like `fix`, `add`, `update`, `rename` targeting a single area
- no cross-module impact

Action: execute directly or invoke `task-decomposer` for planning only (no parallelism). Use Glob/Grep/Read(offset,limit) to gather context. Apply changes sequentially.

### Class C -- Multi-Agent Orchestration

The request spans multiple independent concerns that can be separated.

Signals:
- compound requests joined by "and" or commas with distinct deliverables
- verbs like `refactor`, `implement`, `migrate`, `across`, `parallel`
- two or more modules with separable write surfaces
- explicit user request for parallel execution

Action: full pipeline -- `task-decomposer` -> `conflict-detector` -> `parallel-orchestrator` -> workers -> `merge-coordinator`.

### Class D -- Serial Complex Execution

The request is cross-cutting but cannot be safely parallelized.

Signals:
- architectural changes that reshape shared abstractions
- migration sequences that must land in order
- single algorithm rewrite touching many files
- high coupling between all deliverables

Action: `task-decomposer` -> `conflict-detector` (expect serialization verdict) -> serial execution with validation between each step -> `merge-coordinator`.

## Classification Output

Always emit before proceeding:

```
Classification: [A|B|C|D]
Reasoning: [one line explaining why]
Route: [direct | single-agent | parallel-orchestrate | serial-orchestrate]
```

## Routing Rules

1. Default to the lowest class that can handle the request. Over-orchestration wastes more tokens than under-orchestration.
2. If uncertain between B and C, choose B. Parallelism has overhead; only use it when the benefit is clear.
3. If the user explicitly asks for parallel execution, upgrade to C regardless of your assessment.
4. Never skip classification. Even "obvious" tasks benefit from the 3-line output -- it creates an audit trail.

## Token Efficiency (Applies to ALL Classes)

Before reading any file:
1. Use Glob to find candidate files.
2. Use Grep to narrow to relevant sections.
3. Use Read with offset and limit to pull only what you need.

Never read a full file unless it is under 100 lines or the user explicitly asks. Prefer diffs over full files, summaries over raw logs, structure over content.

After gathering context: summarize what you learned, then discard the raw data from your working memory. Use `/compact` after each major phase or when context feels heavy.

## Model Tier Guidance

- Haiku: exploration, file discovery, simple edits, documentation
- Sonnet: implementation, test writing, moderate refactoring
- Opus: architecture decisions, complex algorithms, cross-cutting design

When spawning subagents, assign the lightest model that can handle the task.

## Handoff

- Class A: respond immediately.
- Class B: proceed to implementation (optionally via `task-decomposer` for planning).
- Class C: invoke `task-decomposer` with the full request context.
- Class D: invoke `task-decomposer` with a note that serial execution is expected. The full pipeline still applies (decompose -> conflict-detect -> orchestrate in safe mode -> merge), but the orchestrator will execute workstreams sequentially with validation gates.
