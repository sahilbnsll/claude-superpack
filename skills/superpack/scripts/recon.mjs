#!/usr/bin/env node
// recon.mjs — detect stack, layout, conventions, and the project's real verification commands.
// Output: compact JSON. Nothing is written to disk.
import { basename, join } from 'node:path';
import {
  countBy, exists, helpAndExit, isGitRepo, out, parseArgs, read, readJson, repoRoot, topN, walk, git,
} from './lib.mjs';

const HELP = `
recon.mjs — what is this project, and how do I verify a change to it?

Usage:
  node recon.mjs [--root DIR] [--compact] [--no-git]

Reports: languages, package manager, frameworks, monorepo layout, test/lint/typecheck/build
commands the project actually defines, config conventions, and where tests live.

Flags:
  --root DIR   analyse DIR instead of the detected repository root
  --compact    single-line JSON
  --no-git     skip git history probes
`;

const EXT_LANG = {
  ts: 'typescript', tsx: 'typescript', mts: 'typescript', cts: 'typescript',
  js: 'javascript', jsx: 'javascript', mjs: 'javascript', cjs: 'javascript',
  py: 'python', rb: 'ruby', go: 'go', rs: 'rust', java: 'java', kt: 'kotlin',
  swift: 'swift', cs: 'csharp', php: 'php', ex: 'elixir', exs: 'elixir',
  scala: 'scala', dart: 'dart', c: 'c', h: 'c', cc: 'cpp', cpp: 'cpp', hpp: 'cpp',
  sql: 'sql', tf: 'terraform', hcl: 'terraform', vue: 'vue', svelte: 'svelte',
  sh: 'shell', ps1: 'powershell', yml: 'yaml', yaml: 'yaml',
};

// Frameworks and platforms, keyed by the dependency or file that proves them.
const DEP_SIGNALS = [
  ['next', 'next.js'], ['react', 'react'], ['react-native', 'react-native'], ['vue', 'vue'],
  ['nuxt', 'nuxt'], ['svelte', 'svelte'], ['@sveltejs/kit', 'sveltekit'], ['@angular/core', 'angular'],
  ['solid-js', 'solid'], ['astro', 'astro'], ['remix', 'remix'], ['@remix-run/react', 'remix'],
  ['express', 'express'], ['fastify', 'fastify'], ['@nestjs/core', 'nestjs'], ['hono', 'hono'],
  ['koa', 'koa'], ['apollo-server', 'apollo'], ['graphql', 'graphql'], ['trpc', 'trpc'],
  ['@trpc/server', 'trpc'], ['prisma', 'prisma'], ['@prisma/client', 'prisma'],
  ['drizzle-orm', 'drizzle'], ['typeorm', 'typeorm'], ['sequelize', 'sequelize'],
  ['mongoose', 'mongodb'], ['pg', 'postgres'], ['mysql2', 'mysql'], ['redis', 'redis'],
  ['ioredis', 'redis'], ['bullmq', 'bullmq'], ['kafkajs', 'kafka'],
  ['@aws-sdk/client-s3', 'aws'], ['aws-cdk-lib', 'aws-cdk'], ['@azure/identity', 'azure'],
  ['@google-cloud/storage', 'gcp'], ['firebase', 'firebase'], ['firebase-admin', 'firebase'],
  ['@supabase/supabase-js', 'supabase'], ['stripe', 'stripe'],
  ['openai', 'llm'], ['@anthropic-ai/sdk', 'llm'], ['langchain', 'llm'], ['ai', 'llm'],
  ['@langchain/core', 'llm'], ['llamaindex', 'llm'], ['@pinecone-database/pinecone', 'vector-db'],
  ['chromadb', 'vector-db'], ['tailwindcss', 'tailwind'], ['styled-components', 'css-in-js'],
  ['@emotion/react', 'css-in-js'], ['zustand', 'zustand'], ['redux', 'redux'],
  ['@reduxjs/toolkit', 'redux'], ['@tanstack/react-query', 'react-query'],
  ['framer-motion', 'motion'], ['three', 'three.js'], ['electron', 'electron'],
  ['socket.io', 'websockets'], ['ws', 'websockets'], ['zod', 'zod'], ['yup', 'yup'],
  ['opentelemetry', 'opentelemetry'], ['@opentelemetry/api', 'opentelemetry'],
  ['@sentry/node', 'sentry'], ['@sentry/react', 'sentry'], ['pino', 'structured-logging'],
  ['winston', 'structured-logging'],
];

const TEST_RUNNERS = [
  ['vitest', 'vitest'], ['jest', 'jest'], ['mocha', 'mocha'], ['@playwright/test', 'playwright'],
  ['playwright', 'playwright'], ['cypress', 'cypress'], ['@testing-library/react', 'testing-library'],
  ['ava', 'ava'], ['tap', 'tap'], ['node:test', 'node-test'], ['supertest', 'supertest'],
  ['k6', 'k6'], ['artillery', 'artillery'],
];

const LINTERS = [
  ['eslint', 'eslint'], ['@biomejs/biome', 'biome'], ['oxlint', 'oxlint'],
  ['prettier', 'prettier'], ['stylelint', 'stylelint'],
];

const FILE_SIGNALS = [
  ['Dockerfile', 'docker'], ['docker-compose.yml', 'docker-compose'],
  ['docker-compose.yaml', 'docker-compose'], ['Chart.yaml', 'helm'],
  ['kustomization.yaml', 'kustomize'], ['serverless.yml', 'serverless-framework'],
  ['template.yaml', 'aws-sam'], ['vercel.json', 'vercel'], ['netlify.toml', 'netlify'],
  ['fly.toml', 'fly.io'], ['Procfile', 'heroku'], ['pyproject.toml', 'python-project'],
  ['requirements.txt', 'python-pip'], ['Pipfile', 'pipenv'], ['poetry.lock', 'poetry'],
  ['go.mod', 'go-modules'], ['Cargo.toml', 'cargo'], ['Gemfile', 'bundler'],
  ['pom.xml', 'maven'], ['build.gradle', 'gradle'], ['build.gradle.kts', 'gradle'],
  ['composer.json', 'composer'], ['mix.exs', 'mix'], ['pubspec.yaml', 'pub'],
  ['Makefile', 'make'], ['justfile', 'just'], ['Taskfile.yml', 'task'],
  ['tsconfig.json', 'typescript-config'], ['.editorconfig', 'editorconfig'],
  ['turbo.json', 'turborepo'], ['nx.json', 'nx'], ['lerna.json', 'lerna'],
  ['pnpm-workspace.yaml', 'pnpm-workspaces'], ['.pre-commit-config.yaml', 'pre-commit'],
  ['renovate.json', 'renovate'], ['.nvmrc', 'node-version-pin'],
];

function detectPackageManager(root) {
  if (exists(root, 'pnpm-lock.yaml')) return 'pnpm';
  if (exists(root, 'bun.lockb') || exists(root, 'bun.lock')) return 'bun';
  if (exists(root, 'yarn.lock')) return 'yarn';
  if (exists(root, 'package-lock.json')) return 'npm';
  if (exists(root, 'package.json')) return 'npm';
  if (exists(root, 'poetry.lock')) return 'poetry';
  if (exists(root, 'uv.lock')) return 'uv';
  if (exists(root, 'Pipfile.lock')) return 'pipenv';
  if (exists(root, 'requirements.txt')) return 'pip';
  if (exists(root, 'Cargo.toml')) return 'cargo';
  if (exists(root, 'go.mod')) return 'go';
  if (exists(root, 'Gemfile')) return 'bundler';
  return null;
}

/** Map a package manager to how it runs a named script. */
function runner(pm) {
  switch (pm) {
    case 'pnpm': return (s) => `pnpm run ${s}`;
    case 'yarn': return (s) => `yarn ${s}`;
    case 'bun': return (s) => `bun run ${s}`;
    default: return (s) => `npm run ${s}`;
  }
}

/** Pick the best script for a role from package.json scripts. */
function pickScript(scripts, patterns) {
  const names = Object.keys(scripts);
  for (const p of patterns) {
    const hit = names.find((n) => n === p);
    if (hit) return hit;
  }
  for (const p of patterns) {
    const hit = names.find((n) => n.startsWith(`${p}:`) || n.endsWith(`:${p}`));
    if (hit) return hit;
  }
  return null;
}

function nodeCommands(root, pkg, pm) {
  const scripts = pkg?.scripts || {};
  const r = runner(pm);
  const cmds = {};
  const lint = pickScript(scripts, ['lint', 'check', 'biome']);
  if (lint) cmds.lint = r(lint);
  const types = pickScript(scripts, ['typecheck', 'type-check', 'tsc', 'types']);
  if (types) cmds.typecheck = r(types);
  else if (exists(root, 'tsconfig.json')) cmds.typecheck = 'npx tsc --noEmit';
  const test = pickScript(scripts, ['test', 'test:unit', 'tests']);
  if (test) cmds.test = r(test);
  const e2e = pickScript(scripts, ['test:e2e', 'e2e', 'test:integration']);
  if (e2e) cmds.e2e = r(e2e);
  const build = pickScript(scripts, ['build', 'compile']);
  if (build) cmds.build = r(build);
  const fmt = pickScript(scripts, ['format', 'fmt']);
  if (fmt) cmds.format = r(fmt);
  return cmds;
}

function pythonCommands(root) {
  const cmds = {};
  const pyproject = read(join(root, 'pyproject.toml'));
  const hasRuff = /\[tool\.ruff/.test(pyproject) || exists(root, 'ruff.toml') || exists(root, '.ruff.toml');
  const hasMypy = /\[tool\.mypy/.test(pyproject) || exists(root, 'mypy.ini');
  const hasPyright = /\[tool\.pyright/.test(pyproject) || exists(root, 'pyrightconfig.json');
  const hasPytest = /\[tool\.pytest/.test(pyproject) || exists(root, 'pytest.ini') || exists(root, 'tests');
  const prefix = exists(root, 'uv.lock') ? 'uv run ' : exists(root, 'poetry.lock') ? 'poetry run ' : '';
  if (hasRuff) cmds.lint = `${prefix}ruff check .`;
  if (hasMypy) cmds.typecheck = `${prefix}mypy .`;
  else if (hasPyright) cmds.typecheck = `${prefix}pyright`;
  if (hasPytest) cmds.test = `${prefix}pytest -q`;
  return cmds;
}

function otherCommands(root) {
  const cmds = {};
  if (exists(root, 'Cargo.toml')) {
    cmds.lint = 'cargo clippy --all-targets -- -D warnings';
    cmds.test = 'cargo test';
    cmds.build = 'cargo build';
  }
  if (exists(root, 'go.mod')) {
    cmds.lint = exists(root, '.golangci.yml') || exists(root, '.golangci.yaml')
      ? 'golangci-lint run' : 'go vet ./...';
    cmds.test = 'go test ./...';
    cmds.build = 'go build ./...';
  }
  if (exists(root, 'Gemfile')) {
    if (exists(root, '.rubocop.yml')) cmds.lint = 'bundle exec rubocop';
    cmds.test = exists(root, 'spec') ? 'bundle exec rspec' : 'bundle exec rake test';
  }
  if (exists(root, 'pom.xml')) cmds.test = 'mvn -q test';
  if (exists(root, 'build.gradle') || exists(root, 'build.gradle.kts')) cmds.test = './gradlew test';
  return cmds;
}

function makeTargets(root) {
  const mk = read(join(root, 'Makefile'));
  if (!mk) return [];
  return [...mk.matchAll(/^([a-zA-Z][\w.-]*):(?!=)/gm)].map((m) => m[1]).slice(0, 25);
}

function detectWorkspaces(root, pkg, files) {
  const ws = [];
  if (Array.isArray(pkg?.workspaces)) ws.push(...pkg.workspaces);
  else if (Array.isArray(pkg?.workspaces?.packages)) ws.push(...pkg.workspaces.packages);
  const pnpmWs = read(join(root, 'pnpm-workspace.yaml'));
  if (pnpmWs) {
    for (const m of pnpmWs.matchAll(/^\s*-\s*['"]?([^'"\n]+)['"]?\s*$/gm)) ws.push(m[1].trim());
  }
  if (exists(root, 'Cargo.toml') && /^\[workspace\]/m.test(read(join(root, 'Cargo.toml')))) {
    ws.push('cargo-workspace');
  }
  // Concrete package roots actually present in the tree.
  const pkgDirs = files
    .filter((f) => f.endsWith('/package.json') && f.split('/').length <= 4)
    .map((f) => f.replace(/\/package\.json$/, ''));
  return { patterns: [...new Set(ws)], packages: pkgDirs.slice(0, 40) };
}

function detectTestLayout(files) {
  const testFiles = files.filter((f) =>
    /(^|\/)(tests?|__tests__|spec|e2e|cypress)\//i.test(f) ||
    /\.(test|spec)\.[cm]?[jt]sx?$/.test(f) ||
    /(^|\/)test_[^/]+\.py$/.test(f) ||
    /_test\.(go|py|rb)$/.test(f));
  const dirs = countBy(testFiles, (f) => {
    const parts = f.split('/');
    const i = parts.findIndex((p) => /^(tests?|__tests__|spec|e2e|cypress)$/i.test(p));
    return i >= 0 ? parts.slice(0, i + 1).join('/') : parts.slice(0, -1).join('/') || '.';
  });
  const colocated = testFiles.filter((f) => /\.(test|spec)\.[cm]?[jt]sx?$/.test(f) &&
    !/(^|\/)(tests?|__tests__|spec|e2e)\//i.test(f)).length;
  return {
    count: testFiles.length,
    style: colocated > testFiles.length / 2 ? 'colocated' : 'separate-directory',
    top_dirs: topN(dirs, 5).map(([d, n]) => `${d} (${n})`),
    naming_sample: testFiles.slice(0, 3),
  };
}

function detectConventions(root, files, pkg) {
  const c = {};
  const tsconfig = readJson(join(root, 'tsconfig.json'));
  if (tsconfig?.compilerOptions) {
    const o = tsconfig.compilerOptions;
    c.typescript = {
      strict: o.strict === true,
      module_resolution: o.moduleResolution || null,
      path_aliases: o.paths ? Object.keys(o.paths).slice(0, 8) : [],
    };
  }
  if (pkg?.type) c.module_system = pkg.type;
  else if (files.some((f) => f.endsWith('.mjs'))) c.module_system = 'mixed';
  const ec = read(join(root, '.editorconfig'));
  if (ec) {
    c.indent = (ec.match(/indent_style\s*=\s*(\w+)/) || [])[1] || null;
    c.indent_size = (ec.match(/indent_size\s*=\s*(\w+)/) || [])[1] || null;
  }
  if (exists(root, '.prettierrc') || exists(root, '.prettierrc.json') || pkg?.prettier) {
    c.formatter = 'prettier';
  } else if (exists(root, 'biome.json') || exists(root, 'biome.jsonc')) {
    c.formatter = 'biome';
  }
  // Directory vocabulary: the words this repo uses for its own layers.
  const topDirs = countBy(files.filter((f) => f.includes('/')), (f) => f.split('/')[0]);
  c.top_level_dirs = topN(topDirs, 10).map(([d, n]) => `${d} (${n})`);
  const srcDirs = countBy(
    files.filter((f) => /^(src|app|lib|packages|apps|internal|cmd)\//.test(f) && f.split('/').length > 2),
    (f) => f.split('/').slice(0, 2).join('/'),
  );
  c.source_layout = topN(srcDirs, 10).map(([d, n]) => `${d} (${n})`);
  return c;
}

function detectCI(root, files) {
  const ci = [];
  const wf = files.filter((f) => f.startsWith('.github/workflows/'));
  if (wf.length) ci.push(`github-actions (${wf.length} workflows)`);
  if (exists(root, '.gitlab-ci.yml')) ci.push('gitlab-ci');
  if (exists(root, 'Jenkinsfile')) ci.push('jenkins');
  if (exists(root, '.circleci', 'config.yml')) ci.push('circleci');
  if (exists(root, 'azure-pipelines.yml')) ci.push('azure-pipelines');
  if (exists(root, '.buildkite')) ci.push('buildkite');
  return ci;
}

function main() {
  const { flags } = parseArgs(process.argv.slice(2));
  if (flags.help || flags.h) helpAndExit(HELP);

  const root = typeof flags.root === 'string' ? flags.root : repoRoot();
  const { files, truncated } = walk(root);
  const pkg = readJson(join(root, 'package.json'));
  const pm = detectPackageManager(root);

  const langs = topN(countBy(files, (f) => EXT_LANG[f.split('.').pop()?.toLowerCase()]), 6)
    .map(([l, n]) => `${l} (${n})`);

  const deps = { ...(pkg?.dependencies || {}), ...(pkg?.devDependencies || {}) };
  const depNames = Object.keys(deps);
  const pyDeps = `${read(join(root, 'requirements.txt'))}\n${read(join(root, 'pyproject.toml'))}`;
  const allDepText = `${depNames.join('\n')}\n${pyDeps}`;

  const frameworks = [...new Set(DEP_SIGNALS
    .filter(([d]) => depNames.includes(d) || new RegExp(`(^|[\\s"'=])${d.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([\\s"'<>=~]|$)`, 'm').test(allDepText))
    .map(([, name]) => name))];

  const fileSignals = [...new Set(FILE_SIGNALS
    .filter(([f]) => exists(root, f) || files.some((x) => x.endsWith(`/${f}`)))
    .map(([, name]) => name))];

  const iac = [];
  if (files.some((f) => f.endsWith('.tf'))) iac.push('terraform');
  if (files.some((f) => /(^|\/)k8s\/|(^|\/)kubernetes\/|\.k8s\.ya?ml$/.test(f))) iac.push('kubernetes-manifests');
  if (files.some((f) => /(^|\/)(migrations?|alembic|prisma\/migrations)\//i.test(f))) iac.push('db-migrations');

  const commands = { ...otherCommands(root), ...pythonCommands(root), ...(pkg ? nodeCommands(root, pkg, pm) : {}) };
  const mkTargets = makeTargets(root);
  if (mkTargets.length && !commands.test && mkTargets.includes('test')) commands.test = 'make test';
  if (mkTargets.length && !commands.lint && mkTargets.includes('lint')) commands.lint = 'make lint';

  const report = {
    root: basename(root) || root,
    absolute_root: root,
    git: isGitRepo(root),
    files_scanned: files.length,
    scan_truncated: truncated,
    languages: langs,
    package_manager: pm,
    frameworks,
    infrastructure: [...new Set([...fileSignals, ...iac])],
    test_runners: [...new Set(TEST_RUNNERS.filter(([d]) => depNames.includes(d) || allDepText.includes(d)).map(([, n]) => n))],
    linters: [...new Set(LINTERS.filter(([d]) => depNames.includes(d) || allDepText.includes(d)).map(([, n]) => n))],
    verification_commands: commands,
    make_targets: mkTargets,
    ci: detectCI(root, files),
    workspaces: detectWorkspaces(root, pkg, files),
    tests: detectTestLayout(files),
    conventions: detectConventions(root, files, pkg),
    agent_instructions: ['CLAUDE.md', 'AGENTS.md', '.cursorrules', 'CONTRIBUTING.md', '.claude/rules']
      .filter((f) => exists(root, f)),
  };

  if (flags['no-git'] !== true && report.git) {
    const branch = git(['rev-parse', '--abbrev-ref', 'HEAD'], root);
    const dirty = git(['status', '--porcelain'], root);
    const churn = git(['log', '--since=90.days', '--name-only', '--pretty=format:'], root);
    report.repo = {
      branch: branch.stdout.trim() || null,
      dirty_files: dirty.stdout.trim() ? dirty.stdout.trim().split(/\r?\n/).length : 0,
      hot_files: topN(countBy(churn.stdout.split(/\r?\n/).filter(Boolean), (f) => f), 8)
        .map(([f, n]) => `${f} (${n})`),
    };
  }

  // Gaps worth flagging: things whose absence changes how you should work.
  const gaps = [];
  if (!commands.test) gaps.push('no test command detected — behavioural verification needs another form of evidence');
  if (!commands.lint) gaps.push('no linter detected');
  if (!commands.typecheck && /typescript/.test(langs.join())) gaps.push('typescript present but no typecheck command');
  if (!report.agent_instructions.length) gaps.push('no CLAUDE.md/AGENTS.md — conventions must be inferred from code');
  if (report.tests.count === 0) gaps.push('no test files found');
  report.gaps = gaps;

  out(report, { pretty: !flags.compact });
}

main();
