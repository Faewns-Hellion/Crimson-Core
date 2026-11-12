#!/usr/bin/env node
/**
 * Build the private patron release folders from live Foundry module sources.
 *
 * Everything this script writes lives outside this repository. The public repo
 * only ever contains the free tier, so paid and campaign-private modules are
 * packaged straight from the installed copies in Foundry's Data/modules folder.
 *
 * Usage:
 *   node tools/build-tier-packages.mjs --source "<Foundry Data>/modules"
 *   node tools/build-tier-packages.mjs --source "<Foundry Data>/modules" --extra "some-private-module"
 *
 * Options:
 *   --source <dir>   Foundry Data/modules folder. Defaults to FOUNDRY_MODULES.
 *   --out <dir>      Output root. Defaults to ../Crimson-Private-Releases.
 *   --extra <ids>    Comma-separated campaign-private module ids, packaged into
 *                    campaign-private/. Never list these in this repository.
 */
import { execFileSync } from 'node:child_process';
import { join, resolve, sep } from 'node:path';
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';

const ROOT = resolve(import.meta.dirname, '..');
const ZIP_HELPER = join(ROOT, 'tools', 'zip-module.py');
const TIERS = JSON.parse(readFileSync(join(ROOT, 'tiers.json'), 'utf8'));

function usage(message) {
  if (message) console.error(`\n${message}`);
  console.error(
    '\nUsage: node tools/build-tier-packages.mjs --source "<Foundry Data>/modules" [--out <dir>] [--extra <ids>]',
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

const sourceOption = readOption('--source') ?? process.env.FOUNDRY_MODULES;
if (!sourceOption) usage('Missing module source folder.');
const sourceRoot = resolve(sourceOption);
if (!existsSync(sourceRoot)) usage(`Foundry module folder does not exist: ${sourceRoot}`);

const outRoot = resolve(readOption('--out') ?? join(ROOT, '..', 'Crimson-Private-Releases'));
if (outRoot === ROOT || outRoot.startsWith(`${ROOT}${sep}`)) {
  usage(`Refusing to write paid packaging inside the public repository: ${outRoot}`);
}

const publicIds = new Set(
  TIERS.tiers.filter((tier) => tier.public).flatMap((tier) => tier.modules),
);
const paidTiers = TIERS.tiers.filter((tier) => !tier.public);
if (paidTiers.length === 0) usage('tiers.json has no paid tiers to package.');

const extraIds = (readOption('--extra') ?? '')
  .split(',')
  .map((id) => id.trim())
  .filter(Boolean);

for (const id of extraIds) {
  if (publicIds.has(id)) {
    usage(`"${id}" is a free-tier module; it does not belong in --extra.`);
  }
  if (paidTiers.some((tier) => tier.modules.includes(id))) {
    usage(`"${id}" is already listed in tiers.json; drop it from --extra.`);
  }
}

const allTiers = [...paidTiers];
if (extraIds.length > 0) {
  allTiers.push({
    id: 'campaign-private',
    name: 'Campaign Private',
    price: null,
    public: false,
    description: 'Campaign-specific compendiums that are never sold or published.',
    modules: extraIds,
  });
}

const moduleIds = [...new Set(allTiers.flatMap((tier) => tier.modules))];
if (moduleIds.length === 0) usage('Nothing to package.');

function readManifest(id) {
  const manifestPath = join(sourceRoot, id, 'module.json');
  if (!existsSync(manifestPath)) {
    throw new Error(`Missing module.json for "${id}" in ${join(sourceRoot, id)}`);
  }
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  if (manifest.id !== id) {
    throw new Error(`${manifestPath} declares id "${manifest.id}", expected "${id}"`);
  }
  if (!manifest.version) throw new Error(`${manifestPath} has no version.`);
  return manifest;
}

/**
 * The output folder is generated, so it is rebuilt from scratch. Refuse to
 * delete a directory that this script did not create.
 */
if (existsSync(outRoot) && !existsSync(join(outRoot, 'release.json'))) {
  usage(
    `Refusing to overwrite ${outRoot}: it has no release.json, so it was not made by this script. Move it or pass --out.`,
  );
}
rmSync(outRoot, { recursive: true, force: true });

const packagesRoot = join(outRoot, 'packages');
mkdirSync(packagesRoot, { recursive: true });

const built = new Map();
console.log(`Packaging ${moduleIds.length} paid modules into ${outRoot}`);
for (const id of moduleIds) {
  const manifest = readManifest(id);
  const zipName = `${id}-${manifest.version}.zip`;
  const zipPath = join(packagesRoot, zipName);

  execFileSync('python', [ZIP_HELPER, join(sourceRoot, id), zipPath], {
    stdio: 'inherit',
    timeout: 10 * 60 * 1000,
  });

  const zipBytes = statSync(zipPath).size;
  if (zipBytes === 0) throw new Error(`Zip is empty: ${zipPath}`);

  built.set(id, {
    id,
    title: manifest.title ?? id,
    version: manifest.version,
    zip: zipName,
    zipBytes,
  });
  console.log(`  ${id} ${manifest.version} -> packages/${zipName} (${(zipBytes / 1024).toFixed(0)} KiB)`);
}

const summary = [];
for (const tier of allTiers) {
  const tierDir = join(outRoot, tier.id);
  const tierModulesDir = join(tierDir, 'modules');
  mkdirSync(tierModulesDir, { recursive: true });

  const modules = tier.modules.map((id) => {
    const entry = built.get(id);
    if (!entry) throw new Error(`No package built for "${id}" in tier "${tier.id}".`);
    cpSync(join(packagesRoot, entry.zip), join(tierModulesDir, entry.zip));
    return {
      id: entry.id,
      title: entry.title,
      version: entry.version,
      zip: `modules/${entry.zip}`,
      bytes: entry.zipBytes,
    };
  });

  const tierFile = {
    id: tier.id,
    name: tier.name,
    price: tier.price,
    currency: TIERS.currency,
    billing: TIERS.billing,
    description: tier.description,
    moduleCount: modules.length,
    modules,
  };
  writeFileSync(join(tierDir, 'tier.json'), `${JSON.stringify(tierFile, null, 2)}\n`);

  summary.push({
    id: tier.id,
    name: tier.name,
    price: tier.price,
    moduleCount: modules.length,
    path: `${tier.id}/`,
  });
  console.log(`  ${tier.id}: ${modules.length} module zips`);
}

writeFileSync(
  join(outRoot, 'release.json'),
  `${JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      currency: TIERS.currency,
      billing: TIERS.billing,
      packageCount: built.size,
      tiers: summary,
    },
    null,
    2,
  )}\n`,
);

console.log(`\nDone. ${built.size} unique module zips across ${allTiers.length} tiers.`);
console.log('Private output stays outside the public repository; nothing was copied into it.');
