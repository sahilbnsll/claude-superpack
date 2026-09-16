#!/usr/bin/env node

/**
 * claude-superpack — postinstall
 *
 * Installs each skill once, at `~/.claude/skills/<skill-name>/`.
 *
 * Installing once matters more than it sounds. Every installed skill's name and
 * description sit in the prompt on every turn of every session, whether or not the skill
 * is used. Earlier versions of this package copied the skills to the top level *and* left
 * a plugin-shaped copy underneath, so Claude Code discovered both and every description
 * was loaded twice — doubling a cost that is paid continuously. This script installs one
 * copy and actively removes the duplicate if a previous version left one behind.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const PACKAGE_ROOT = path.resolve(__dirname, '..');
const CLAUDE_DIR = path.join(os.homedir(), '.claude');
const SKILLS_DIR = path.join(CLAUDE_DIR, 'skills');
const LEGACY_DIR = path.join(SKILLS_DIR, 'claude-superpack');
const MANIFEST = path.join(CLAUDE_DIR, '.claude-superpack-installed.json');

// Skills shipped by v4 and earlier, folded into the nine-skill architecture in v5.
// Left in place they would keep charging per-turn context for capabilities that moved.
const RETIRED = [
  'auto-router', 'changelog-writer', 'clarifier', 'codebase-onboarder', 'conflict-detector',
  'context-budget', 'dead-code-finder', 'dep-analyzer', 'doc-generator', 'error-catalog',
  'graph-builder', 'graph-navigator', 'graph-reviewer', 'graph-updater', 'memory-consolidator',
  'memory-manager', 'memory-search', 'merge-coordinator', 'migration-planner',
  'parallel-orchestrator', 'pattern-tracker', 'post-review', 'pre-flight', 'project-memory',
  'rollback', 'security-scanner', 'session-recap', 'skill-reuse-detector', 'smart-discovery',
  'task-decomposer', 'test-generator', 'test-mapper', 'user-profiler',
];

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(from, to);
    else fs.copyFileSync(from, to);
  }
}

/** True when this directory is ours to replace rather than the user's own edit. */
function ownedByUs(dir, installed) {
  if (!fs.existsSync(dir)) return true;
  try {
    if (fs.lstatSync(dir).isSymbolicLink()) return true;
  } catch {
    return true;
  }
  return installed.includes(path.basename(dir));
}

/**
 * Positively identify a skill directory as one this package shipped in v1–v4, rather than
 * assuming it from the name alone. A user could have their own skill called `rollback`;
 * removing it because the name matched would be unforgivable. Every v1–v4 skill carried a
 * 1.x–4.x version and the house description style, so both must match.
 */
function isOurLegacySkill(dir) {
  let text;
  try {
    text = fs.readFileSync(path.join(dir, 'SKILL.md'), 'utf8');
  } catch {
    return false;
  }
  const fm = (text.match(/^---\r?\n([\s\S]*?)\r?\n---/) || [])[1];
  if (!fm) return false;
  const version = (fm.match(/^version:\s*(.+)$/m) || [])[1] || '';
  const description = (fm.match(/^description:\s*(.+)$/m) || [])[1] || '';
  return /^["']?[1-4]\./.test(version.trim())
    && /^["']?This skill should be used\b/i.test(description.trim());
}

function readManifest() {
  try {
    return JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
  } catch {
    return { skills: [], version: null };
  }
}

function install() {
  const source = path.join(PACKAGE_ROOT, 'skills');
  if (!fs.existsSync(source)) throw new Error('package is missing its skills/ directory');

  const previous = readManifest();
  const names = fs.readdirSync(source).filter((d) => fs.statSync(path.join(source, d)).isDirectory());

  fs.mkdirSync(SKILLS_DIR, { recursive: true });
  console.log('\nclaude-superpack — installing\n');

  const installed = [];
  const skipped = [];
  for (const name of names) {
    const dest = path.join(SKILLS_DIR, name);
    if (!ownedByUs(dest, previous.skills || [])) {
      skipped.push(name);
      continue;
    }
    fs.rmSync(dest, { recursive: true, force: true });
    copyDir(path.join(source, name), dest);
    installed.push(name);
  }
  console.log(`  ${installed.length} skills -> ${SKILLS_DIR}`);
  for (const name of installed) console.log(`    ${name}`);
  if (skipped.length) {
    console.log(`\n  skipped (a directory you own already exists): ${skipped.join(', ')}`);
  }

  // Remove the plugin-shaped copy older versions left behind. Left in place, Claude Code
  // discovers it as a second source and loads every description twice.
  if (fs.existsSync(LEGACY_DIR)) {
    fs.rmSync(LEGACY_DIR, { recursive: true, force: true });
    console.log('\n  removed the duplicate copy at ~/.claude/skills/claude-superpack/');
    console.log('  (it caused every skill description to be loaded twice per turn)');
  }

  // Retire the v1–v4 skills this version replaces. A directory is only removed when its
  // own frontmatter identifies it as ours; anything else with the same name is left alone.
  const retired = [];
  const leftAlone = [];
  for (const name of RETIRED) {
    const dir = path.join(SKILLS_DIR, name);
    if (!fs.existsSync(dir)) continue;
    if (!isOurLegacySkill(dir) && !(previous.skills || []).includes(name)) {
      leftAlone.push(name);
      continue;
    }
    fs.rmSync(dir, { recursive: true, force: true });
    retired.push(name);
  }
  if (retired.length) {
    console.log(`\n  retired ${retired.length} superseded v1-v4 skills, freeing ~${Math.round(retired.length * 300 / 3.8)} tokens per turn`);
    console.log(`    ${retired.slice(0, 6).join(', ')}${retired.length > 6 ? `, +${retired.length - 6} more` : ''}`);
    console.log('    where each capability went: docs/migration-v4-to-v5.md');
  }
  if (leftAlone.length) {
    console.log(`\n  left alone (name matches a retired skill but the content is not ours): ${leftAlone.join(', ')}`);
  }

  fs.writeFileSync(MANIFEST, `${JSON.stringify({
    version: require('../package.json').version,
    installedAt: new Date().toISOString(),
    skills: installed,
    location: SKILLS_DIR,
  }, null, 2)}\n`);

  console.log('\n  Available in your next Claude Code session. Start with: /superpack\n');
}

try {
  install();
} catch (err) {
  console.error(`\nclaude-superpack: install step failed — ${err.message}`);
  console.error(`Copy the skills/ directory into ${SKILLS_DIR} manually to finish.\n`);
  // A failed postinstall should not fail the package install.
  process.exit(0);
}
