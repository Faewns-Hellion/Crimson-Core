#!/usr/bin/env node
/**
 * Cut a release for a free-tier module: bump the installed manifest, sync the
 * repository copies, commit, tag and push.
 *
 * Usage:
 *   node tools/release-module.mjs <module-id>
 *   node tools/release-module.mjs <module-id> --bump minor
 *   node tools/release-module.mjs <module-id> --version 1.2.3
 *
 * Options:
 *   --bump <level>   patch (default), minor or major.
 *   --version <v>    Explicit target version; overrides --bump.
 *   --source <dir>   Foundry Data/modules folder. Defaults to FOUNDRY_MODULES.
 *   --dry-run        Validate and print the plan without changing anything.
 *   --no-push        Commit and tag locally without pushing.
 */
import { execFileSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { applyInstallUrls } from './install-urls.mjs';

const ROOT = resolve(import.meta.dirname, '..');
const TIERS = JSON.parse(readFileSync(join(ROOT, 'tiers.json'), 'utf8'));
const PUBLIC_TIER = TIERS.tiers.find((tier) => tier.public);
const PUBLIC_IDS = new Set(PUBLIC_TIER?.modules ?? []);
const VALUE_OPTIONS = new Set(['--bump', '--version', '--source']);
const LEVELS = ['patch', 'minor', 'major'];

function usage(message) {
  if (message) console.error(`\n${message}`);
  console.error(
    '\nUsage: node tools/release-module.mjs <module-id> [--bump patch|minor|major] [--version x.y.z]',
  );
  console.error(
    '       [--source "<Foundry Data>/modules"] [--dry-run] [--no-push]',
  );
  process.exit(1);
}

function readOption(name) {
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === name) return args[i + 1];
    if (args[i].startsWith(`${name}=`)) return args[i].slice(name.length + 1);
  }
  return undefined;
}

function hasFlag(name) {
  return process.argv.slice(2).includes(name);
}

function positionalArgs() {
  const args = process.argv.slice(2);
  const out = [];
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      if (!arg.includes('=') && VALUE_OPTIONS.has(arg)) i += 1;
      continue;
    }
    out.push(arg);
  }
  return out;
}

function git(args, options = {}) {
  return execFileSync('git', args, { encoding: 'utf8', ...options });
}

function parseVersion(value) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(value ?? '');
  return match ? match.slice(1).map(Number) : null;
}

function compareVersions(a, b) {
  for (let i = 0; i < 3; i += 1) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return 0;
}

function bumpVersion(current, level) {
  const parts = parseVersion(current);
  if (!parts) throw new Error(`Installed version "${current}" is not x.y.z.`);
  const [major, minor, patch] = parts;
  if (level === 'major') return `${major + 1}.0.0`;
  if (level === 'minor') return `${major}.${minor + 1}.0`;
  return `${major}.${minor}.${patch + 1}`;
}

const [moduleId] = positionalArgs();
if (!moduleId) usage('Missing module id.');

if (!PUBLIC_IDS.has(moduleId)) {
  usage(`${moduleId} is not a ${PUBLIC_TIER?.name ?? 'free-tier'} module.`);
}

const sourceOption = readOption('--source') ?? process.env.FOUNDRY_MODULES;
if (!sourceOption) usage('Missing module source folder.');
const sourceRoot = resolve(sourceOption);
if (!existsSync(sourceRoot)) usage(`Foundry module folder does not exist: ${sourceRoot}`);

const liveManifestPath = join(sourceRoot, moduleId, 'module.json');
if (!existsSync(liveManifestPath)) {
  usage(`No installed module at ${liveManifestPath}`);
}

const installed = JSON.parse(readFileSync(liveManifestPath, 'utf8'));
const current = installed.version;
const level = readOption('--bump') ?? 'patch';
if (!LEVELS.includes(level)) usage(`Unknown --bump level "${level}".`);

const target = readOption('--version') ?? bumpVersion(current, level);
const targetParts = parseVersion(target);
const currentParts = parseVersion(current);
if (!targetParts) usage(`--version must be x.y.z, got "${target}".`);
if (!currentParts) usage(`Installed version "${current}" is not x.y.z.`);
if (compareVersions(targetParts, currentParts) <= 0) {
  usage(`Target ${target} must be newer than the installed ${current}.`);
}

const tag = `${moduleId}-v${target}`;
try {
  git(['rev-parse', '--verify', '--quiet', `refs/tags/${tag}`]);
  usage(`Tag ${tag} already exists locally.`);
} catch {
  // Absent, as expected.
}
if (git(['ls-remote', '--tags', 'origin', tag]).trim()) {
  usage(`Tag ${tag} already exists on origin.`);
}

const branch = git(['rev-parse', '--abbrev-ref', 'HEAD']).trim();
if (branch !== 'main') usage(`Releases are cut from main; you are on ${branch}.`);

const dirty = git(['status', '--porcelain']).trim();
if (dirty) {
  usage(`Working tree is not clean:\n${dirty}\nCommit or stash these before releasing.`);
}

const dryRun = hasFlag('--dry-run');
const noPush = hasFlag('--no-push');

console.log(`Release plan for ${moduleId}`);
console.log(`  version   ${current} -> ${target}`);
console.log(`  tag       ${tag}`);
console.log(`  source    ${sourceRoot}`);
console.log(`  push      ${noPush ? 'no (local only)' : 'origin main + tag'}`);

if (dryRun) {
  console.log('\nDry run: nothing was changed.');
  process.exit(0);
}

const originalManifest = readFileSync(liveManifestPath, 'utf8');
let committed = false;

try {
  installed.version = target;
  writeFileSync(liveManifestPath, `${JSON.stringify(installed, null, 2)}\n`);
  applyInstallUrls(liveManifestPath, moduleId, target);

  execFileSync(
    process.execPath,
    [join(ROOT, 'tools', 'sync-modules.mjs'), '--source', sourceRoot],
    { stdio: 'inherit' },
  );

  const changed = git(['status', '--porcelain'])
    .split('\n')
    .map((line) => line.slice(3).trim())
    .filter(Boolean);
  const allowed = [`modules/${moduleId}/`, `dist/${moduleId}-`];
  const stray = changed.filter((path) => !allowed.some((prefix) => path.startsWith(prefix)));
  if (stray.length > 0) {
    throw new Error(
      `Other files changed during sync, so this is not a clean ${moduleId} release:\n  ${stray.join('\n  ')}\nSync and commit those separately first.`,
    );
  }

  const zipPath = join(ROOT, 'dist', `${moduleId}-${target}.zip`);
  if (!existsSync(zipPath)) throw new Error(`Expected package was not built: ${zipPath}`);
  const zipBytes = statSync(zipPath).size;
  if (zipBytes === 0) throw new Error(`Package is empty: ${zipPath}`);

  git(['add', '-A'], { stdio: 'inherit' });
  git(
    [
      'commit',
      '-m',
      `Release ${moduleId} ${target}\n\nBump the installed manifest from ${current} to ${target} and rebuild its\npackage from source.`,
    ],
    { stdio: 'inherit' },
  );
  committed = true;

  git(['tag', '-a', tag, '-m', `${moduleId} ${target}`], { stdio: 'inherit' });

  if (!noPush) {
    git(['push', 'origin', 'main'], { stdio: 'inherit' });
    git(['push', 'origin', tag], { stdio: 'inherit' });
  }

  console.log(`\nReleased ${moduleId} ${target}`);
  console.log(`  dist/${moduleId}-${target}.zip (${(zipBytes / 1024).toFixed(0)} KiB)`);
  console.log(`  tag ${tag}${noPush ? ' (not pushed)' : ''}`);
  console.log(`  commit ${git(['rev-parse', '--short', 'HEAD']).trim()}`);
} catch (error) {
  if (!committed) {
    writeFileSync(liveManifestPath, originalManifest);
    git(['checkout', '--', '.'], { stdio: 'ignore' });
    console.error(`\nRelease aborted: ${error.message}`);
    console.error('The installed manifest and the working tree were restored.');
  } else {
    console.error(`\nRelease committed but not finished: ${error.message}`);
    console.error(`The commit and tag ${tag} exist locally; fix the problem and push them.`);
  }
  process.exit(1);
}
