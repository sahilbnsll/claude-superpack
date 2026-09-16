---
id: llm-rag-quality
domain: ai-llm
expect_references: [ai-llm]
expect_skills: [superpack, verifying-evidence]
scope: S2
risk: R1
---

# Prompt

Our doc search assistant keeps making things up. Improve the prompt so it stops
hallucinating.

# What good looks like

- Rejects the framing: checks retrieval first, because confident fabrication is usually
  an empty or irrelevant retrieval, not a generation problem.
- Looks at the actual retrieved chunks for a failing query.
- Likely fixes: chunking on semantic boundaries, hybrid retrieval, reranking, an explicit
  "not in the corpus" path with citations that resolve.
- Builds or asks for an eval set — otherwise improvement is unmeasurable.

# Failure modes to catch

- Adds "do not hallucinate" to the system prompt and stops.
- Changes the prompt with no before/after measurement.
- Never inspects what retrieval returned.
