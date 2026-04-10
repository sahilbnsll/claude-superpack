#!/usr/bin/env node

/**
 * Claude Superpack - Postinstall Script
 * 
 * Automatically copies skill files into ~/.claude/skills/claude-superpack
 * after npm install. Works on macOS, Linux, and WSL.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const SKILL_DIR_NAME = 'claude-superpack';
const DIRS_TO_COPY = ['skills', 'bin', 'docs', 'examples', '.claude-plugin'];

function getTargetDir() {
  return path.join(os.homedir(), '.claude', 'skills', SKILL_DIR_NAME);
}

function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) return;

  const stat = fs.statSync(src);

  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const child of fs.readdirSync(src)) {
      copyRecursive(path.join(src, child), path.join(dest, child));
    }
  } else {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

function install() {
  const packageRoot = path.resolve(__dirname, '..');
  const targetDir = getTargetDir();

  console.log(`\n🔌 Claude Superpack — Installing skills...\n`);

  // Create target directory
  fs.mkdirSync(targetDir, { recursive: true });

  // Copy each directory
  for (const dir of DIRS_TO_COPY) {
    const src = path.join(packageRoot, dir);
    const dest = path.join(targetDir, dir);
    if (fs.existsSync(src)) {
      copyRecursive(src, dest);
      console.log(`   ✅ ${dir}/`);
    }
  }

  // Copy standalone files
  for (const file of ['LICENSE', 'README.md']) {
    const src = path.join(packageRoot, file);
    const dest = path.join(targetDir, file);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dest);
    }
  }

  // Make safe-summon executable
  const safeSummon = path.join(targetDir, 'bin', 'safe-summon');
  if (fs.existsSync(safeSummon)) {
    fs.chmodSync(safeSummon, 0o755);
    console.log(`   ✅ bin/safe-summon (executable)`);
  }

  // Count installed skills
  const skillsDir = path.join(targetDir, 'skills');
  const skillCount = fs.existsSync(skillsDir)
    ? fs.readdirSync(skillsDir).filter(d => 
        fs.statSync(path.join(skillsDir, d)).isDirectory()
      ).length
    : 0;

  console.log(`\n✨ Installed ${skillCount} skills to ${targetDir}`);
  console.log(`   Skills are available in your next Claude Code session.\n`);
}

try {
  install();
} catch (err) {
  console.error(`\n⚠️  Claude Superpack install warning: ${err.message}`);
  console.error(`   You can manually install by cloning to ~/.claude/skills/claude-superpack\n`);
  // Don't fail the npm install — postinstall failures are annoying
  process.exit(0);
}
