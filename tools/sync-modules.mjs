#!/usr/bin/env node
/**
 * Copy every module in the public tier from a Foundry Data/modules folder into
 * this repository and rebuild its installable zip.
 *
 * Paid tiers and campaign-private modules are intentionally not copied here.
 *
 * Usage:
 *   node tools/sync-modules.mjs --source "C:\path\to\FoundryVTT\Data\modules"
 *
 * The source defaults to FOUNDRY_MODULES when --source is omitted.
 */
import { execFileSync } from 'node:child_process';
import { basename, join, resolve } from 'node:path';
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
} from 'node:fs';
import { applyInstallUrls } from './install-urls.mjs';

const ROOT = resolve(import.meta.dirname, '..');
const TIERS = JSON.parse(readFileSync(join(ROOT, 'tiers.json'), 'utf8'));
const PUBLIC_TIER = TIERS.tiers.find((tier) => tier.public);
if (!PUBLIC_TIER) throw new Error('tiers.json has no public tier.');
const MODULE_IDS = PUBLIC_TIER.modules;
const ZIP_HELPER = join(ROOT, 'tools', 'zip-module.py');

const SKIP_NAMES = new Set(['.git', '.DS_Store', 'LOCK', 'Thumbs.db', 'node_modules']);
const SKIP_EXTENSIONS = ['.tmp', '.zip'];

function usage(message) {
  if (message) console.error(`\n${message}`);
  console.error('\nUsage: node tools/sync-modules.mjs --source "<Foundry Data>/modules"');
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

const sourceOption = readOption('--source') ?? process.env.FOUNDRY_MODULES;
if (!sourceOption) usage('Missing module source folder.');
const sourceRoot = resolve(sourceOption);
if (!existsSync(sourceRoot)) usage(`Foundry module folder does not exist: ${sourceRoot}`);

const modulesRoot = join(ROOT, 'modules');
const distRoot = join(ROOT, 'dist');
mkdirSync(modulesRoot, { recursive: true });
mkdirSync(distRoot, { recursive: true });

function isSkipped(sourcePath) {
  const name = basename(sourcePath);
  if (SKIP_NAMES.has(name)) return true;
  return SKIP_EXTENSIONS.some((extension) => name.toLowerCase().endsWith(extension));
}

function copyModule(id) {
  const source = join(sourceRoot, id);
  const target = join(modulesRoot, id);
  const manifestPath = join(source, 'module.json');

  if (!existsSync(manifestPath)) {
    throw new Error(`Missing module.json for ${id} in ${source}`);
  }

  let manifest;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  } catch (error) {
    throw new Error(`Could not read ${manifestPath}: ${error.message}`);
  }
  if (manifest.id !== id) {
    throw new Error(`${manifestPath} declares id "${manifest.id}", expected "${id}"`);
  }

  rmSync(target, { recursive: true, force: true });
  cpSync(source, target, {
    recursive: true,
    force: true,
    filter: (sourcePath) => !isSkipped(sourcePath),
  });

  if (!existsSync(join(target, 'module.json'))) {
    throw new Error(`Copy failed for ${id}: module.json is missing`);
  }

  applyInstallUrls(join(target, 'module.json'), id, manifest.version);

  const zipPath = join(distRoot, `${id}-${manifest.version}.zip`);
  rmSync(zipPath, { force: true });
  execFileSync('python', [ZIP_HELPER, target, zipPath], {
    stdio: 'inherit',
    timeout: 10 * 60 * 1000,
  });

  const zipBytes = statSync(zipPath).size;
  if (zipBytes === 0) throw new Error(`Zip is empty: ${zipPath}`);

  // dist/ holds the current release of each public module; older builds stay in git history.
  for (const entry of readdirSync(distRoot)) {
    if (entry === `${id}-${manifest.version}.zip`) continue;
    if (!entry.startsWith(`${id}-`) || !entry.endsWith('.zip')) continue;
    rmSync(join(distRoot, entry), { force: true });
    console.log(`  removed stale dist/${entry}`);
  }

  return {
    id,
    title: manifest.title ?? id,
    version: manifest.version ?? '0.0.0',
    zip: `${id}-${manifest.version}.zip`,
    zipBytes,
  };
}

const results = [];
for (const id of MODULE_IDS) {
  const result = copyModule(id);
  results.push(result);
  console.log(`synced ${result.id} ${result.version} -> dist/${result.zip} (${(result.zipBytes / 1024 / 1024).toFixed(1)} MiB)`);
}

console.log(`\nSynced ${results.length} ${PUBLIC_TIER.name} modules. Paid and private modules were not copied.`);
