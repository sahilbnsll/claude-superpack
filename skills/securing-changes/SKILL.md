---
name: securing-changes
description: Use when work touches authentication, authorization, secrets, user input, file or URL handling, payments, personal data, dependencies, CI, or cloud and infrastructure configuration such as Terraform, IAM, security groups, and network access — and before committing anything that might carry a credential.
version: 5.0.0
license: MIT
metadata:
  layer: security
  pack: claude-superpack
  activation: content
---

# Securing changes

Security applied while building, not audited afterwards.

**Division of labour:** if `/security-review` is available, it audits a branch in depth — run it for R2+ work. This skill is the design-time decision and the fast pre-commit scan.

## Before designing

Four sentences, written down:

1. **Protecting what?** The data and the operations at stake.
2. **From whom?** Anonymous scanner, a logged-in user reaching across a tenant boundary, an insider, a compromised dependency.
3. **Trust boundary where?** Every point where data moves from less-trusted to more-trusted is a validation point.
4. **Worst single failure?** If one control fails, what is reachable? If the answer is "everything", add a second layer.

Skipping this is how insecure *design* happens — a flaw no code review finds, because every line is correct.

## While building

Apply the default, then deviate deliberately:

- **Deny by default.** New routes, endpoints, resources, and consumers start closed.
- **Authorize on the object, not just the route.** "Is the caller authenticated" is not "may this caller read *this* row". Broken object-level access control is the most common serious vulnerability in real applications.
- **Re-derive identity server-side.** Never trust a client-supplied user id, role, price, tenant, or ownership claim.
- **Parameterise everything.** SQL, shell, templates, LDAP. Concatenation is the vulnerability.
- **Encode on output, by context.** HTML, attribute, URL, and JS contexts each escape differently. Sanitise with a maintained library, never a regex.
- **Allow-list, never block-list**, for URLs the server fetches, redirect targets, file paths, and file types. Blocklists lose to encoding, redirects, and rebinding.
- **Secrets from the environment or a manager.** Never in code, logs, URLs, error messages, or container images.
- **Rate-limit anything expensive or abusable** — login, reset, search, upload, export, model calls, outbound email — per account *and* per source.
- **Fail closed.** A `catch` around an authorization check that lets the request continue is a vulnerability wearing error handling.
- **Least privilege** for every identity: service accounts, CI tokens, database users, IAM roles.

For the full class-by-class checklist — current OWASP Top 10, SSRF, CSRF, path traversal, mass assignment, deserialisation, prompt injection — read [security.md](../superpack/references/security.md).

## Before committing

```
node "${CLAUDE_SKILL_DIR}/../superpack/scripts/secrets.mjs"
node "${CLAUDE_SKILL_DIR}/../superpack/scripts/diffstat.mjs"
```

The first flags credential-shaped literals in added lines and untracked files; the second flags the risk surfaces the change touches. Address every finding or state why it does not apply.

**If a real credential was committed, it is compromised.** Removing it from the file is not enough — it is in history, and in any clone or CI cache. The credential must be rotated at the provider. Rotation is a destructive, externally-visible action: state exactly which credential and where, and get explicit confirmation before doing it. Do not rotate on your own initiative.

## Evidence

Security claims need the same evidence discipline as everything else:

- The **negative test** is the real proof. A test where the wrong user is refused beats any amount of reasoning about the code.
- Dependency audit output (`npm audit`, `pip-audit`, `cargo audit`, `govulncheck`) for any dependency change.
- Policy simulation or an explicit permission test for IAM changes.
- The clean scan output, or each finding explained.

## Red flags

- A new endpoint with no explicit authorization decision.
- Any string concatenation building SQL, a shell command, or a path.
- `catch` around a permission check.
- A URL, filename, or redirect target derived from user input with no allow-list.
- A new dependency added without looking at what it pulls in.
- "It's internal, so it doesn't need auth."
- A wildcard: `*` in an IAM action, `0.0.0.0/0`, `Access-Control-Allow-Origin: *` on a credentialed endpoint.
