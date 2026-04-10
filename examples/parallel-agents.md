# Parallel Agents Example (Class C)

This example demonstrates multi-agent execution with the Agent tool and worktree isolation.

## Prompt

```text
$ claude
> Refactor the API layer to use the new service pattern, update all route handlers, and add integration tests.
```

## Classification

```
Classification: C
Reasoning: Three concerns (service pattern, route handlers, integration tests) with separable write surfaces.
Route: parallel-orchestrate
```

## DAG

```json
{
  "workstreams": [
    {
      "id": "f3a4b5c6",
      "description": "Create service layer abstraction",
      "goal": "Extract business logic from route handlers into service classes",
      "likely_paths": ["src/services/"],
      "dependencies": [],
      "complexity": 4,
      "model": "opus",
      "parallel_status": "parallel-ready"
    },
    {
      "id": "d7e8f9a0",
      "description": "Update route handlers to use services",
      "goal": "Replace inline logic with service calls in all route handlers",
      "likely_paths": ["src/routes/"],
      "dependencies": ["f3a4b5c6"],
      "complexity": 3,
      "model": "sonnet",
      "parallel_status": "blocked-by-dependency"
    },
    {
      "id": "b1c2d3e4",
      "description": "Add integration tests for service layer",
      "goal": "Test service methods through the API endpoints",
      "likely_paths": ["tests/integration/"],
      "dependencies": ["d7e8f9a0"],
      "complexity": 3,
      "model": "sonnet",
      "parallel_status": "blocked-by-dependency"
    }
  ],
  "execution_order": [["f3a4b5c6"], ["d7e8f9a0"], ["b1c2d3e4"]],
  "total_complexity": 10,
  "estimated_workers": 3
}
```

## Conflict Analysis

Verdict: `fully-serial` -- each workstream depends on the previous.

This is technically Class D execution despite Class C classification. The orchestrator adapts: serial execution with validation between steps.

## Execution

```
[step 1] Spawning worker: f3a4b5c6 (opus, worktree)
         Prompt: "Create service classes for user, auth, and order modules..."
[step 1] f3a4b5c6: success (6 files created, 120s)
[step 1] Validation: type check passed

[step 2] Spawning worker: d7e8f9a0 (sonnet, worktree)
         Prompt: "Update route handlers to import and use the new service classes..."
[step 2] d7e8f9a0: success (8 files modified, 90s)
[step 2] Validation: lint passed, type check passed

[step 3] Spawning worker: b1c2d3e4 (sonnet, worktree)
         Prompt: "Write integration tests that hit API endpoints and verify service behavior..."
[step 3] b1c2d3e4: success (4 files created, 75s)
[step 3] Validation: all 12 new tests passing
```

## Agent Tool Usage

Each worker is spawned using:

```
Agent tool:
  subagent_type: "general-purpose"
  model: [as assigned by decomposer]
  isolation: "worktree"
  prompt: [minimal scoped prompt under 2000 tokens]
```

Workers run in isolated worktrees, so they cannot interfere with each other or the main workspace.

## Key Takeaway

Even when the DAG forces serialization, each worker still benefits from:
- Isolated worktree (no side effects on main workspace)
- Scoped context (only relevant files, not the whole repo)
- Appropriate model tier (opus for architecture, sonnet for implementation)
- Validation gates between steps (catch issues early)
