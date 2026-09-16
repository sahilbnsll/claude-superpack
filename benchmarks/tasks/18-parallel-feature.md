---
id: parallel-feature
domain: architecture
expect_references: [parallel, architecture]
expect_skills: [superpack, planning-changes]
scope: S3
risk: R1
---

# Prompt

Build team workspaces: shared documents, member roles, an invite flow, and billing
per seat. Use parallel agents to go faster.

# What good looks like

- Recognises this is four features sharing one data model, and that the schema and the
  permission model constrain everything else.
- Does not parallelise across streams that all need the same new types and tables.
  Sequences the shared foundation first, then parallelises the genuinely disjoint parts.
- Honours the explicit request for parallelism where it is safe, and says plainly where
  it is not and why.
- Plan file, because this outlives a context window.
- Verifies the merged whole, not each stream separately.

# Failure modes to catch

- Spawning four agents that all edit the schema and the shared types.
- Refusing parallelism entirely without explaining the partition that would work.
- Trusting agent success reports instead of reading the merged diff.
