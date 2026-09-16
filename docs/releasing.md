# Releasing

The package publishes to two registries from one GitHub release:

- **npmjs.com** — what users install from. No login needed to install.
- **GitHub Packages** — kept for existing installs. Needs a login even for public packages.

npmjs.com publishing uses **trusted publishing**: GitHub Actions proves its identity to npm
through OIDC, so no npm token is stored anywhere, nothing expires, and every version gets a
signed provenance attestation linking it to the exact workflow run that built it. Long-lived
write tokens are the wrong tool here — npm now caps them at 90 days, requires 2FA by
default, and is restricting tokens that bypass 2FA.

All commands below work in bash and in Windows PowerShell. Run them one line at a time.

---

## One-time setup

npm only lets you configure a trusted publisher on a package that already exists. So the
first version goes out by hand, once. Every release after that is automatic.

### 1. Log in to npm on your machine

```bash
npm login
```

This opens npm's browser sign-in, with your normal 2FA. No token is created or saved as a
secret. Confirm the account name matches the package scope:

```bash
npm whoami
```

It must print `sahilbnsll`. If it prints anything else, stop — the `@sahilbnsll` scope
belongs to that user or organisation, and the package name has to change first.

### 2. Publish the first version by hand

From the repository root, on a clean checkout of the version being released:

```bash
git status
npm publish --access public
```

`git status` should report nothing to commit. `prepublishOnly` runs the benchmark suite
first and refuses to publish if it fails. `--access public` is required once: scoped
packages default to private on npmjs.com.

### 3. Configure the trusted publisher

On npmjs.com, open the package → **Settings** → **Trusted publishing** → **GitHub Actions**:

| Field | Value |
|---|---|
| Organization or user | `sahilbnsll` |
| Repository | `claude-superpack` |
| Workflow filename | `publish.yml` |
| Environment | leave empty |

Allow `npm publish`.

Then, on the same settings page, set **Publishing access** to require two-factor
authentication and disallow tokens. Trusted publishing keeps working; a leaked token no
longer can.

### 4. Log out locally (optional)

```bash
npm logout
```

Nothing on your machine needs publish rights any more.

---

## Every release

1. Bump the version in `package.json` and `.claude-plugin/plugin.json`.
2. Add a section to `CHANGELOG.md`.
3. Commit, tag, and push:

   ```bash
   npm run bench
   git commit -am "release: vX.Y.Z"
   git tag -a vX.Y.Z -m "vX.Y.Z"
   git push origin master
   git push origin vX.Y.Z
   ```

4. Create the GitHub release from that tag:
   `https://github.com/sahilbnsll/claude-superpack/releases/new?tag=vX.Y.Z&title=vX.Y.Z`

The release triggers `.github/workflows/publish.yml`, which runs three jobs:

| Job | Does |
|---|---|
| `verify` | Runs the benchmarks and checks the tag matches `package.json`. Nothing publishes if this fails. |
| `npmjs` | Publishes via OIDC with provenance. |
| `github-packages` | Publishes with the workflow's own `GITHUB_TOKEN`. |

The two publish jobs are independent, so one registry failing never blocks the other. Both
skip a version that is already published, so re-running a release — or running the workflow
manually from the Actions tab — is always safe.

---

## Checking a release

```bash
npm view @sahilbnsll/claude-superpack version
npm view @sahilbnsll/claude-superpack dist.attestations
```

The second prints the provenance attestation for versions published through the workflow.
Versions published by hand, like the first one, have none.

---

## Troubleshooting

**`E401` when installing** — npm is sending the request to GitHub Packages. Usually a scope
mapping left in your user config by an earlier GitHub Packages login:

```bash
npm config get @sahilbnsll:registry
```

If that prints `https://npm.pkg.github.com`, remove it to install from npmjs.com:

```bash
npm config delete @sahilbnsll:registry
```

**`E404` from the `npmjs` job** — the trusted publisher is not configured, or its fields do
not match exactly. The workflow filename is `publish.yml`, not the full path.

**`E403` from the `npmjs` job** — the version already exists and the skip check could not
reach the registry, or the package's publishing access forbids the method used. Check the
package settings page.

**The `verify` job fails on the tag check** — the release tag and `package.json` disagree.
Tags may be `vX.Y.Z`, `X.Y.Z`, or the older major-only `superpack-vN`.
