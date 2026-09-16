// Shared helpers for superpack scripts. Zero dependencies, Node 18+, Windows + POSIX.
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

export const IS_WIN = process.platform === 'win32';

/** Read a file, returning '' instead of throwing. */
export function read(path) {
  try {
    return readFileSync(path, 'utf8');
  } catch {
    return '';
  }
}

/** Parse JSON leniently; returns null on failure. */
export function readJson(path) {
  const raw = read(path);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function exists(root, ...parts) {
  return existsSync(join(root, ...parts));
}

/** Run a command, capturing output. Never throws. */
export function run(cmd, args, { cwd = process.cwd(), timeout = 600_000, input } = {}) {
  const res = spawnSync(cmd, args, {
    cwd,
    timeout,
    input,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    shell: false,
    windowsHide: true,
  });
  return {
    code: res.status === null ? (res.error ? -1 : 124) : res.status,
    stdout: res.stdout || '',
    stderr: res.stderr || '',
    error: res.error ? String(res.error.message) : null,
    timedOut: res.error?.code === 'ETIMEDOUT' || res.signal === 'SIGTERM',
  };
}

/** Run a shell command string (needed for project scripts like `npm run lint`). */
export function sh(command, opts = {}) {
  if (IS_WIN) return run(process.env.COMSPEC || 'cmd.exe', ['/d', '/s', '/c', command], opts);
  return run('/bin/sh', ['-c', command], opts);
}

export function git(args, cwd = process.cwd()) {
  return run('git', args, { cwd, timeout: 60_000 });
}

export function isGitRepo(cwd = process.cwd()) {
  return git(['rev-parse', '--git-dir'], cwd).code === 0;
}

/** Find the repository root, falling back to cwd. */
export function repoRoot(cwd = process.cwd()) {
  const r = git(['rev-parse', '--show-toplevel'], cwd);
  if (r.code === 0 && r.stdout.trim()) return r.stdout.trim();
  return cwd;
}

const SKIP_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', 'out', 'target', 'vendor', '.next', '.nuxt',
  '.svelte-kit', 'coverage', '__pycache__', '.venv', 'venv', '.tox', '.mypy_cache',
  '.pytest_cache', '.gradle', '.idea', '.vscode', 'bin', 'obj', '.terraform', '.cache',
  '.turbo', '.parcel-cache', 'Pods', '.dart_tool', '.serverless', '.output',
]);

/**
 * Walk the tree collecting relative file paths, bounded so this stays cheap on
 * large monorepos. Returns { files, truncated }.
 */
export function walk(root, { maxFiles = 6000, maxDepth = 8 } = {}) {
  const files = [];
  let truncated = false;
  const stack = [[root, 0]];
  while (stack.length) {
    if (files.length >= maxFiles) {
      truncated = true;
      break;
    }
    const [dir, depth] = stack.pop();
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of entries) {
      const full = join(dir, e.name);
      if (e.isDirectory()) {
        if (SKIP_DIRS.has(e.name) || e.name.startsWith('.') && e.name !== '.github') continue;
        if (depth < maxDepth) stack.push([full, depth + 1]);
      } else if (e.isFile()) {
        files.push(relative(root, full).split(sep).join('/'));
        if (files.length >= maxFiles) {
          truncated = true;
          break;
        }
      }
    }
  }
  return { files, truncated };
}

export function countBy(items, fn) {
  const out = new Map();
  for (const i of items) {
    const k = fn(i);
    if (k == null) continue;
    out.set(k, (out.get(k) || 0) + 1);
  }
  return out;
}

export function topN(map, n) {
  return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);
}

/** Keep only the lines that carry signal, capped. */
export function distill(text, patterns, { max = 25, contextTrim = 400 } = {}) {
  const lines = text.split(/\r?\n/);
  const hits = [];
  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;
    if (patterns.some((p) => p.test(line))) {
      hits.push(t.length > contextTrim ? `${t.slice(0, contextTrim)}…` : t);
      if (hits.length >= max) break;
    }
  }
  return hits;
}

export function out(obj, { pretty = true } = {}) {
  process.stdout.write(`${JSON.stringify(obj, null, pretty ? 2 : 0)}\n`);
}

/**
 * Minimal argv parser. `--key=value` and `--key value` both work; flags listed in
 * `booleans` never consume the following token.
 */
export function parseArgs(argv, { booleans = [] } = {}) {
  const bool = new Set([...booleans, 'help', 'h', 'compact', 'no-git', 'staged', 'all', 'json', 'quiet', 'fix', 'verbose']);
  const flags = {};
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const eq = a.indexOf('=');
      if (eq !== -1) {
        flags[a.slice(2, eq)] = a.slice(eq + 1);
        continue;
      }
      const key = a.slice(2);
      const next = argv[i + 1];
      if (!bool.has(key) && next !== undefined && !next.startsWith('--')) {
        flags[key] = next;
        i++;
      } else flags[key] = true;
    } else if (a.startsWith('-') && a.length > 1) {
      flags[a.slice(1)] = true;
    } else positional.push(a);
  }
  return { flags, positional };
}

export function helpAndExit(text) {
  process.stdout.write(`${text.trim()}\n`);
  process.exit(0);
}

export { execFileSync, existsSync, readFileSync, readdirSync, statSync, join };
