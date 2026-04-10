#!/usr/bin/env node

/**
 * Claude Superpack CLI
 * 
 * Minimal CLI for managing the skill pack installation.
 * 
 * Usage:
 *   claude-superpack install    — Install/reinstall skills to ~/.claude/skills/
 *   claude-superpack uninstall  — Remove skills from ~/.claude/skills/
 *   claude-superpack status     — Check installation status
 *   claude-superpack version    — Show version
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const pkg = require('../package.json');

const TARGET_DIR = path.join(os.homedir(), '.claude', 'skills', 'claude-superpack');
const SKILLS_DIR = path.join(TARGET_DIR, 'skills');

const command = process.argv[2] || 'status';

switch (command) {
  case 'install':
  case 'reinstall':
    require('./install');
    break;

  case 'uninstall':
  case 'remove':
    require('./uninstall');
    break;

  case 'status': {
    console.log(`\n🔌 Claude Superpack v${pkg.version}\n`);

    if (!fs.existsSync(TARGET_DIR)) {
      console.log('   Status: ❌ Not installed');
      console.log(`   Run: claude-superpack install\n`);
      break;
    }

    const skills = fs.existsSync(SKILLS_DIR)
      ? fs.readdirSync(SKILLS_DIR).filter(d =>
          fs.statSync(path.join(SKILLS_DIR, d)).isDirectory()
        )
      : [];

    console.log(`   Status: ✅ Installed`);
    console.log(`   Location: ${TARGET_DIR}`);
    console.log(`   Skills (${skills.length}):`);
    for (const skill of skills) {
      console.log(`     • ${skill}`);
    }
    console.log();
    break;
  }

  case 'version':
  case '-v':
  case '--version':
    console.log(pkg.version);
    break;

  case 'help':
  case '-h':
  case '--help':
    console.log(`
🔌 Claude Superpack v${pkg.version}

Usage:
  claude-superpack install     Install/reinstall skills
  claude-superpack uninstall   Remove skills
  claude-superpack status      Check installation status
  claude-superpack version     Show version
`);
    break;

  default:
    console.error(`Unknown command: ${command}\nRun: claude-superpack help`);
    process.exit(1);
}
