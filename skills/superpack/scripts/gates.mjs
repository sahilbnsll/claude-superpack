#!/usr/bin/env node
// gates.mjs — run the project's own verification commands and report only the signal.
// Raw tool output is discarded; you get pass/fail, counts, and the real error lines.
import { join } from 'node:path';
import { helpAndExit, out, parseArgs, read, readJson, exists, repoRoot, sh, distill } from './lib.mjs';

const HELP = `
gates.mjs — run verification gates and return a compact digest.

Usage:
  node gates.mjs [--only lint,typecheck,test,build] [--root DIR] [--timeout SECONDS]
  node gates.mjs --cmd "npm run test" --label test
  node gates.mjs --list

Runs in cheap-to-expensive order and stops after a failing gate unless --keep-going.
Exit code is 0 when every gate that ran passed, 1 otherwise — so it can be used in CI.

Flags:
  --only LIST      comma-separated subset of gates to run
  --skip LIST      comma-separated gates to skip
  --cmd STRING     run an arbitrary command as a gate instead of the detected set
  --label NAME     label for --cmd (default "custom")
  --keep-going     run every gate even after one fails
  --timeout SEC    per-gate timeout, default 900
  --list           print the detected gates without running them
  --compact        single-line JSON
`;

// Error-shaped lines worth surfacing, ordered roughly by how much they usually mean.
const SIGNAL = [
  /\berror\b/i,
  /\bERR!/,
  /\bfail(ed|ure|ing)?\b/i,
  /\b(\d+)\s+(problems?|errors?|failures?|failing)\b/i,
  /^\s*[✕✖×✗]/u,
  /^\s*not ok\b/,
  /\bTS\d{4,5}\b/,
  /\b(AssertionError|TypeError|ReferenceError|SyntaxError|Panic|panic:|Traceback|Exception)\b/,
  /^\s+at .*\(.*:\d+:\d+\)$/,
  /^[^\s:]+:\d+:\d+[:\s]/,
  /\bwarning:\s.*\bdeny\b/i,
];

const SUMMARY = [
  /\b\d+\s+(passed|passing|failed|failing|skipped|pending|todo)\b/i,
  /\bTests?:\s/i,
  /\bTest Suites?:\s/i,
  /\bok\s+\d+\s+-\s/,
  /\b(\d+)\s+problems?\s*\(/i,
  /\bFound\s+\d+\s+errors?\b/i,
  /\bcompiled\s+(successfully|with)/i,
  /\bbuild\s+(succeeded|failed|complete)/i,
  /\ball checks passed\b/i,
  /\bno issues found\b/i,
];

const ORDER = ['format', 'lint', 'typecheck', 'test', 'build', 'e2e'];

function detectCommands(root) {
  const pkg = readJson(join(root, 'package.json'));
  const cmds = {};
  const pm = exists(root, 'pnpm-lock.yaml') ? 'pnpm run'
    : exists(root, 'yarn.lock') ? 'yarn'
      : exists(root, 'bun.lockb') || exists(root, 'bun.lock') ? 'bun run'
        : 'npm run';
  const scripts = pkg?.scripts || {};
  const pick = (names) => names.find((n) => scripts[n]);
  const lint = pick(['lint', 'check']);
  if (lint) cmds.lint = `${pm} ${lint}`;
  const tc = pick(['typecheck', 'type-check', 'tsc']);
  if (tc) cmds.typecheck = `${pm} ${tc}`;
  else if (exists(root, 'tsconfig.json')) cmds.typecheck = 'npx tsc --noEmit';
  const test = pick(['test', 'test:unit']);
  if (test) cmds.test = `${pm} ${test}`;
  const build = pick(['build']);
  if (build) cmds.build = `${pm} ${build}`;

  if (!Object.keys(cmds).length) {
    const py = read(join(root, 'pyproject.toml'));
    const prefix = exists(root, 'uv.lock') ? 'uv run ' : exists(root, 'poetry.lock') ? 'poetry run ' : '';
    if (/\[tool\.ruff/.test(py) || exists(root, 'ruff.toml')) cmds.lint = `${prefix}ruff check .`;
    if (/\[tool\.mypy/.test(py) || exists(root, 'mypy.ini')) cmds.typecheck = `${prefix}mypy .`;
    if (/\[tool\.pytest/.test(py) || exists(root, 'pytest.ini') || exists(root, 'tests')) cmds.test = `${prefix}pytest -q`;
    if (exists(root, 'Cargo.toml')) {
      cmds.lint = 'cargo clippy --all-targets -- -D warnings';
      cmds.test = 'cargo test';
    }
    if (exists(root, 'go.mod')) {
      cmds.lint = 'go vet ./...';
      cmds.test = 'go test ./...';
    }
  }
  return cmds;
}

function digest(label, command, res, elapsedMs) {
  const combined = `${res.stdout}\n${res.stderr}`;
  const passed = res.code === 0 && !res.timedOut;
  const errors = distill(combined, SIGNAL, { max: passed ? 3 : 20 });
  const summary = distill(combined, SUMMARY, { max: 4 });
  return {
    gate: label,
    command,
    status: res.timedOut ? 'timeout' : passed ? 'pass' : 'fail',
    exit_code: res.code,
    seconds: Math.round(elapsedMs / 100) / 10,
    output_lines: combined.split(/\r?\n/).filter(Boolean).length,
    summary,
    errors: passed ? [] : errors,
    ...(res.error && res.code === -1 ? { spawn_error: res.error } : {}),
  };
}

function main() {
  const { flags } = parseArgs(process.argv.slice(2), { booleans: ['keep-going', 'list'] });
  if (flags.help || flags.h) helpAndExit(HELP);

  const root = typeof flags.root === 'string' ? flags.root : repoRoot();
  const timeout = (Number(flags.timeout) || 900) * 1000;

  let commands;
  if (typeof flags.cmd === 'string') {
    commands = { [typeof flags.label === 'string' ? flags.label : 'custom']: flags.cmd };
  } else {
    commands = detectCommands(root);
    if (typeof flags.only === 'string') {
      const keep = new Set(flags.only.split(',').map((s) => s.trim()));
      commands = Object.fromEntries(Object.entries(commands).filter(([k]) => keep.has(k)));
    }
    if (typeof flags.skip === 'string') {
      const drop = new Set(flags.skip.split(',').map((s) => s.trim()));
      commands = Object.fromEntries(Object.entries(commands).filter(([k]) => !drop.has(k)));
    }
  }

  const ordered = Object.keys(commands).sort((a, b) => {
    const ia = ORDER.indexOf(a); const ib = ORDER.indexOf(b);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });

  if (flags.list) {
    out({ root, gates: ordered.map((g) => ({ gate: g, command: commands[g] })) }, { pretty: !flags.compact });
    return;
  }

  if (!ordered.length) {
    out({
      root,
      gates: [],
      verdict: 'no-gates',
      note: 'No verification commands detected. Behavioural evidence must come from another source — a script run, an HTTP call, a browser check. Say so explicitly rather than claiming verification.',
    }, { pretty: !flags.compact });
    process.exit(0);
  }

  const results = [];
  for (const gate of ordered) {
    const startedAt = Date.now();
    const res = sh(commands[gate], { cwd: root, timeout });
    const d = digest(gate, commands[gate], res, Date.now() - startedAt);
    results.push(d);
    if (d.status !== 'pass' && !flags['keep-going']) {
      d.stopped_early = true;
      break;
    }
  }

  const failed = results.filter((r) => r.status !== 'pass');
  const notRun = ordered.filter((g) => !results.some((r) => r.gate === g));
  out({
    root,
    gates: results,
    not_run: notRun,
    verdict: failed.length ? 'fail' : 'pass',
    evidence_line: failed.length
      ? `${failed.map((f) => f.gate).join(', ')} failing`
      : `${results.map((r) => r.gate).join(' + ')} pass`,
  }, { pretty: !flags.compact });

  process.exit(failed.length ? 1 : 0);
}

main();
