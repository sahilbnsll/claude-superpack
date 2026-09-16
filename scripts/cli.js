#!/usr/bin/env node

/**
 * claude-superpack CLI
 *
 *   claude-superpack               status
 *   claude-superpack install       (re)install the skills
 *   claude-superpack uninstall     remove them
 *   claude-superpack skills        list what is installed, with per-turn cost
 *   claude-superpack doctor        check for duplicate installs and stale v4 skills
 *   claude-superpack bench         run the non-billed benchmark suite
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');

const pkg = require('../package.json');
const PACKAGE_ROOT = path.resolve(__dirname, '..');
const CLAUDE_DIR = path.join(os.homedir(), '.claude');
const SKILLS_DIR = path.join(CLAUDE_DIR, 'skills');
const LEGACY_DIR = path.join(SKILLS_DIR, 'claude-superpack');
const MANIFEST = path.join(CLAUDE_DIR, '.claude-superpack-installed.json');

const SHIPPED = fs.existsSync(path.join(PACKAGE_ROOT, 'skills'))
  ? fs.readdirSync(path.join(PACKAGE_ROOT, 'skills'))
    .filter((d) => fs.statSync(path.join(PACKAGE_ROOT, 'skills', d)).isDirectory())
  : [];

const RETIRED_V4 = [
  'auto-router', 'changelog-writer', 'clarifier', 'codebase-onboarder', 'conflict-detector',
  'context-budget', 'dead-code-finder', 'dep-analyzer', 'doc-generator', 'error-catalog',
  'graph-builder', 'graph-navigator', 'graph-reviewer', 'graph-updater', 'memory-consolidator',
  'memory-manager', 'memory-search', 'merge-coordinator', 'migration-planner',
  'parallel-orchestrator', 'pattern-tracker', 'post-review', 'pre-flight', 'project-memory',
  'rollback', 'security-scanner', 'session-recap', 'skill-reuse-detector', 'smart-discovery',
  'task-decomposer', 'test-generator', 'test-mapper', 'user-profiler',
];

function frontmatter(file) {
  if (!fs.existsSync(file)) return {};
  const m = fs.readFileSync(file, 'utf8').match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return {};
  const out = {};
  let key = null;
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([a-zA-Z_-]+):\s*(.*)$/);
    if (kv) { [, key] = kv; out[key] = kv[2]; } else if (key && /^\s+\S/.test(line)) out[key] += ` ${line.trim()}`;
  }
  return out;
}

const installedSkills = () => SHIPPED.filter((s) => fs.existsSync(path.join(SKILLS_DIR, s, 'SKILL.md')));

function status() {
  const installed = installedSkills();
  console.log(`\nclaude-superpack v${pkg.version}\n`);
  if (!installed.length) {
    console.log('  not installed');
    console.log('  run: claude-superpack install\n');
    return;
  }
  const chars = installed.reduce((n, s) => {
    const fm = frontmatter(path.join(SKILLS_DIR, s, 'SKILL.md'));
    return n + (fm.name || s).length + (fm.description || '').length + 8;
  }, 0);
  console.log(`  installed   ${installed.length}/${SHIPPED.length} skills at ${SKILLS_DIR}`);
  console.log(`  per-turn    ~${Math.round(chars / 3.8)} tokens of always-on metadata`);
  const stale = RETIRED_V4.filter((s) => fs.existsSync(path.join(SKILLS_DIR, s)));
  if (stale.length) console.log(`  warning     ${stale.length} superseded v4 skills still present — run: claude-superpack doctor`);
  if (fs.existsSync(LEGACY_DIR)) console.log('  warning     duplicate install detected — run: claude-superpack doctor');
  console.log('\n  start with: /superpack\n');
}

function skills() {
  const installed = installedSkills();
  if (!installed.length) { console.log('\n  not installed\n'); return; }
  console.log(`\n  ${installed.length} skills\n`);
  const order = ['phase', 'content'];
  const rows = installed.map((s) => {
    const fm = frontmatter(path.join(SKILLS_DIR, s, 'SKILL.md'));
    const body = fs.readFileSync(path.join(SKILLS_DIR, s, 'SKILL.md'), 'utf8');
    const activation = (body.match(/^\s*activation:\s*(\w+)/m) || [])[1] || 'phase';
    return { name: s, activation, desc: (fm.description || '').slice(0, 96) };
  }).sort((a, b) => order.indexOf(a.activation) - order.indexOf(b.activation) || a.name.localeCompare(b.name));
  for (const r of rows) {
    console.log(`  ${r.name.padEnd(26)} ${r.activation.padEnd(8)} ${r.desc}…`);
  }
  const refs = path.join(SKILLS_DIR, 'superpack', 'references');
  if (fs.existsSync(refs)) {
    const list = fs.readdirSync(refs).filter((f) => f.endsWith('.md'));
    console.log(`\n  ${list.length} domain references (loaded only when a task needs them):`);
    console.log(`  ${list.map((f) => f.replace('.md', '')).join(', ')}\n`);
  }
}

function doctor() {
  console.log('\nclaude-superpack doctor\n');
  let problems = 0;

  const missing = SHIPPED.filter((s) => !fs.existsSync(path.join(SKILLS_DIR, s, 'SKILL.md')));
  if (missing.length) {
    problems++;
    console.log(`  [!] ${missing.length} skills not installed: ${missing.join(', ')}`);
    console.log('      fix: claude-superpack install');
  }

  if (fs.existsSync(LEGACY_DIR)) {
    problems++;
    console.log('  [!] duplicate install at ~/.claude/skills/claude-superpack/');
    console.log('      Claude Code discovers both copies, so every description is loaded twice per turn.');
    console.log('      fix: claude-superpack install   (removes it)');
  }

  // Installed both as a plugin and as personal skills: Claude Code loads both, so every
  // description appears twice — the same cost v4's duplicate install caused.
  try {
    const registry = JSON.parse(fs.readFileSync(path.join(CLAUDE_DIR, 'plugins', 'installed_plugins.json'), 'utf8'));
    const asPlugin = Object.keys(registry.plugins || {}).filter((k) => k.startsWith('claude-superpack@'));
    const asSkills = SHIPPED.filter((s) => fs.existsSync(path.join(SKILLS_DIR, s, 'SKILL.md')));
    if (asPlugin.length && asSkills.length) {
      problems++;
      console.log(`  [!] installed twice: as plugin ${asPlugin.join(', ')} and as ${asSkills.length} personal skills`);
      console.log('      Both load, so every description is paid twice. Keep one:');
      console.log('      claude-superpack uninstall      (keeps the plugin)');
      console.log('      /plugin uninstall claude-superpack   (keeps the personal skills)');
    }
  } catch {
    // No plugin registry: nothing installed as a plugin.
  }

  const stale = RETIRED_V4.filter((s) => fs.existsSync(path.join(SKILLS_DIR, s)));
  if (stale.length) {
    problems++;
    console.log(`  [!] ${stale.length} superseded v4 skills still installed`);
    console.log(`      ${stale.join(', ')}`);
    console.log('      They still cost per-turn context. fix: claude-superpack install');
  }

  const other = fs.existsSync(SKILLS_DIR)
    ? fs.readdirSync(SKILLS_DIR).filter((d) => {
      try { return fs.statSync(path.join(SKILLS_DIR, d)).isDirectory(); } catch { return false; }
    }).length
    : 0;
  console.log(`\n  ${other} skill directories total in ${SKILLS_DIR}`);
  if (other > 40) {
    console.log('      Every one of them contributes to per-turn context. Consider removing unused packs.');
  }
  if (!fs.existsSync(MANIFEST)) console.log('  [i] no install manifest — uninstall will fall back to this version\'s skill names');

  console.log(problems ? `\n  ${problems} problem(s) found\n` : '\n  no problems found\n');
  process.exitCode = problems ? 1 : 0;
}

function bench() {
  const runner = path.join(PACKAGE_ROOT, 'benchmarks', 'run.mjs');
  if (!fs.existsSync(runner)) {
    console.error('benchmarks/ is not included in this install — run from a clone of the repository');
    process.exit(1);
  }
  const res = spawnSync(process.execPath, [runner, ...process.argv.slice(3)], { stdio: 'inherit', cwd: PACKAGE_ROOT });
  process.exit(res.status ?? 1);
}

const command = process.argv[2] || 'status';
switch (command) {
  case 'install': case 'reinstall': require('./install'); break;
  case 'uninstall': case 'remove': require('./uninstall'); break;
  case 'status': status(); break;
  case 'skills': case 'list': skills(); break;
  case 'doctor': doctor(); break;
  case 'bench': case 'benchmark': bench(); break;
  case 'version': case '-v': case '--version': console.log(pkg.version); break;
  case 'help': case '-h': case '--help':
    console.log(`
claude-superpack v${pkg.version}

  claude-superpack              status and per-turn context cost
  claude-superpack install      (re)install the skills
  claude-superpack uninstall    remove them
  claude-superpack skills       list skills and domain references
  claude-superpack doctor       find duplicate installs and stale v4 skills
  claude-superpack bench        run the non-billed benchmark suite
  claude-superpack version
`);
    break;
  default:
    console.error(`unknown command: ${command}\nrun: claude-superpack help`);
    process.exit(1);
}
