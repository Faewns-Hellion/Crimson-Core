import { readFileSync, writeFileSync } from 'node:fs';

export const INSTALL_BASE =
  'https://raw.githubusercontent.com/Faewns-Hellion/Crimson-Core/main';

/**
 * Point a manifest's Foundry install URLs at this repository's current main
 * branch. Modules that advertise no install URLs are left untouched.
 */
export function applyInstallUrls(manifestPath, id, version) {
  const original = readFileSync(manifestPath, 'utf8');
  const manifest = JSON.parse(original);
  if (!manifest.manifest && !manifest.download) return;
  manifest.manifest = `${INSTALL_BASE}/modules/${id}/module.json`;
  manifest.download = `${INSTALL_BASE}/dist/${id}-${version}.zip`;
  const next = `${JSON.stringify(manifest, null, 2)}\n`;
  // Rewriting an unchanged manifest would bump its mtime and make every
  // rebuild of that module's zip differ byte for byte.
  if (next === original) return;
  writeFileSync(manifestPath, next);
}
