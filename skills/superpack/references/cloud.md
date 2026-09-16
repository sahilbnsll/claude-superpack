# Cloud

AWS, Azure, GCP: identity, networking, serverless, managed services, and cost.

## Decide first

- **Managed or self-run?** The managed service is usually right. Running your own database to save money reliably costs more once you price the on-call.
- **What is the failure domain?** One availability zone, one region, one account. Name which failures the design survives, and say plainly which it does not. "Multi-AZ" and "multi-region" are different orders of cost and complexity.
- **Who pays, and how much?** Egress, cross-AZ traffic, per-request pricing, and idle provisioned capacity are where surprise bills come from. Estimate before building, not after the invoice.
- **What is the data residency and retention requirement?** This constrains region choice and backup design, and it is expensive to retrofit.

## Identity and access

- Least privilege, scoped to specific resources. `Action: "*"` on `Resource: "*"` is not a policy, it is a deferral.
- Roles for workloads, never long-lived access keys. Instance profiles, IRSA/Workload Identity, managed identities, and OIDC federation from CI all exist so that static keys do not have to.
- Separate accounts or projects per environment. It is the only boundary that reliably stops a staging mistake from touching production.
- Human access through SSO with MFA and short-lived credentials. Break-glass accounts exist, are alarmed on use, and are not anyone's daily login.
- Audit logging on and shipped somewhere the account itself cannot delete.
- Deny-by-default at the organisation level (SCPs, org policies) for the things nobody should ever do: disabling logging, opening public buckets, deleting backups.

## Networking

- Private subnets for anything that does not need to be reachable from the internet. Databases are never public. "Publicly accessible" on a managed database is a data breach waiting for a scanner.
- Security groups reference other security groups, not CIDR ranges, wherever possible. `0.0.0.0/0` is acceptable on exactly two things: a load balancer on 443, and outbound where you have decided egress filtering is not worth it.
- Understand what your NAT gateway, cross-AZ traffic, and load balancer actually cost. Cross-AZ chatter between microservices is a common six-figure surprise.
- Use private connectivity to managed services (VPC endpoints, Private Service Connect, private endpoints) so traffic and credentials stay off the public internet — and so you stop paying NAT charges for it.

## Serverless

- Cold start is a design constraint: package size, runtime choice, and initialisation work all drive it. Move heavy setup outside the handler so it is reused across invocations.
- Set a realistic timeout and a concurrency limit. Unbounded concurrency turns a traffic spike into a database connection exhaustion event.
- Connection pooling does not work naturally in a function-per-request model. Use the platform's proxy (RDS Proxy and equivalents) or a data API rather than opening a connection per invocation.
- Assume every invocation can be a retry. Handlers must be idempotent.
- Watch for the retry-storm shape: a queue-triggered function that fails, retries, and re-fails forever. Bound it and dead-letter it.

## Storage and data

- Object storage: block public access at the account level, encrypt by default, and turn on versioning for anything you would miss. Lifecycle rules to move cold data down the tiers — storage is cheap, forgetting is expensive.
- Backups are only real if a restore has been tested. Write the restore procedure and run it. Untested backups are a belief, not a control.
- Know the recovery objectives: how much data can be lost (RPO) and how long recovery may take (RTO). Design to those numbers, and state them.
- Enable deletion protection and, for critical stores, a delete-retention or soft-delete window. It converts "catastrophe" into "bad day".

## Cost

- Tag everything at creation with owner, environment, and service. Untagged spend cannot be attributed and therefore cannot be cut.
- Set budget alerts before deploying, not after.
- The usual top offenders: idle provisioned capacity, oversized instances chosen by guess, orphaned volumes and snapshots, logs retained forever at premium tier, cross-AZ and egress traffic, NAT gateways, and per-request charges on a chatty path.
- Rightsize from observed utilisation, not from the size that felt safe.

## Failure modes

| Symptom | Usual cause |
|---|---|
| Works in staging, denied in production | IAM policy differs; staging role is broader than anyone realised |
| Intermittent connection failures at scale | Connection limit or NAT port exhaustion, not the application |
| Surprise bill | Egress, cross-AZ, NAT, or log retention — rarely compute |
| Can't reach the database from the app | Security group, subnet routing, or DNS resolution; check in that order |
| Deploy succeeds, function errors at runtime | Missing environment variable or permission that only the runtime path needs |
| Data loss after an incident | Backups existed, restore had never been tested |
| Public bucket found by a scanner | Default-open defaults, or a policy change made to fix something unrelated |

## Evidence

1. **Plan or diff output** before any apply, read line by line, with `destroy` and `replace` lines called out explicitly.
2. **Policy simulation** for IAM changes — the provider's policy simulator, or an explicit test that the role can do what it needs and cannot do what it should not.
3. **Reachability proof**: the actual call from inside the network path, not a description of the topology.
4. **Cost delta**: the pricing calculator output or the provider's estimated change, for anything that provisions capacity.
5. **A tested restore** for any change to backup, retention, or deletion configuration.
