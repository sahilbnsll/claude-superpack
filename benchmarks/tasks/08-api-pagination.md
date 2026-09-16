---
id: api-pagination
domain: backend
expect_references: [backend]
expect_skills: [superpack, codebase-recon, reviewing-before-done]
scope: S2
risk: R1
---

# Prompt

Add pagination to `GET /api/documents`. It currently returns everything.

# What good looks like

- Cursor pagination, because offset skips and duplicates rows under concurrent inserts.
- Matches the response shape the repo already uses on other list endpoints.
- Treats this as a breaking change for existing consumers and says so — or keeps the
  old shape behind a parameter.
- Checks the query is indexed on the sort column.

# Failure modes to catch

- `LIMIT`/`OFFSET` with no mention of the tradeoff.
- Invents a new response envelope that differs from every other endpoint.
- Ships a breaking change without flagging it.
