# Crimson-Core

Foundry VTT 14 modules for dnd5e by [Faewns-Hellion](https://github.com/Faewns-Hellion).

This repository is the **Crimson Initiate** tier: the five free modules that every Crimson table runs. Each module installs and releases on its own; there is no bundled core or profile package. Paid tier modules and campaign-private compendiums are packaged from a private release folder and are not part of this repository or its history.

## Tiers

| Tier | Price | Modules |
| --- | --- | --- |
| **Crimson Initiate** | Free | `crimson-hub`, `crimson-fantasy-armory`, `crimson-dragon-theme`, `crimson-drafts`, `crimson-icons` |
| **Fantasy Table** | $5/month | Everything in Crimson Initiate, plus `crimson-fantasy-generator`, `crimson-shipwright`, `crimson-adaptations`, `crimson-random-items`, `crimson-bag`, `crimson-feats` |
| **Galaxy Table** | $5/month | Everything in Crimson Initiate, plus `crimson-galaxy-armory`, `neon-odyssey-generator`, `crimson-mechanic`, `crimson-rivals`, `crimson-currency`, `crimson-obsidian`, `crimson-feats` |
| **Crimson All-Access** | $10/month | All 17 public modules, every future public module, early access, dev logs and votes |
| **Crimson Architect** | $20/month | All-Access, plus priority requests, setup help and credits |

`tiers.json` is the machine-readable tier list. `crimson-feats` belongs to both table tiers, so it is delivered once and shared.

## Free modules

| Module | Version | What it does |
| --- | --- | --- |
| **Crimson Drafts** (`crimson-drafts`) | 0.1.1 | Persistent draft recovery for Crimson builders, Item Creator, and native document editing forms. |
| **Crimson Dragon — Interface Theme** (`crimson-dragon-theme`) | 1.0.1 | Obsidian, crimson, and hoard-gold skin for the full in-world Foundry interface. |
| **Crimson Fantasy Armory** (`crimson-fantasy-armory`) | 0.1.6 | A dragon-hoard character sheet for dnd5e: hoard gauge, initiative plate, item pages, rest controls and a toolbox that launches active Crimson modules. |
| **Crimson Core** (`crimson-hub`) | 1.3.1 | Shared Crimson navigation, compatibility helpers, the Crimson Quest Board, the Crimson Garrison ledger, Crimson Fleet navigation and theme-aware interface styling. |
| **Crimson Icons** (`crimson-icons`) | 0.3.0 | Searchable icon library in the left scene controls, with drag-and-drop into editable image slots and supported builders. |

## Install

Each module is a separate package:

- `modules/<module-id>/` is the complete source, including compendium packs.
- `dist/<module-id>-<version>.zip` is the matching installable bundle. Its root is the module folder, so it can be extracted directly into `Data/modules/`.

A module that advertises install URLs carries them in its own `module.json`, served from `main`:

- manifest — `https://raw.githubusercontent.com/Faewns-Hellion/Crimson-Core/main/modules/<module-id>/module.json`
- package — `https://raw.githubusercontent.com/Faewns-Hellion/Crimson-Core/main/dist/<module-id>-<version>.zip`

`sync-modules.mjs` rewrites both fields on every sync, so they always match the version in `dist/`. Tags named `<module-id>-v<version>` are optional archival snapshots; installs always follow `main`.

In Foundry VTT Setup, open **Add-on Modules → Install Module**, paste a module's manifest URL, and install it. Enable the module in **Manage Modules** in the world. Alternatively, unzip the package into `Data/modules/` and restart Foundry.

Only the free armory sheet ships here. Enable **one** armory module per world: every armory sheet registers for character, NPC and vehicle actors, and running two leaves neither as the default.

## Requirements

- Foundry VTT 14.368 or newer
- dnd5e 5.3.3+ (verified on 6.0.6)

## Updating the repository copies

The repository mirrors the free modules installed in Foundry. After changing or installing one, run this from the repository root:

```powershell
node tools/sync-modules.mjs --source "C:\Users\PC-01\AppData\Local\FoundryVTT\Data\modules"
```

The script reads the public tier from `tiers.json`, copies those modules, drops only transient `LOCK` files, preserves LevelDB journals, and rebuilds `dist/<module-id>-<version>.zip`. It removes older zips of the same module so `dist/` holds exactly one current build per module. Paid and campaign-private modules are never copied.

## Packaging the paid tiers

Paid modules are packaged from the installed Foundry copies straight into a private folder outside this repository:

```powershell
node tools/build-tier-packages.mjs --source "C:\Users\PC-01\AppData\Local\FoundryVTT\Data\modules"
```

That writes `../Crimson-Private-Releases` by default:

```text
release.json              summary of the generated release
packages/                 one zip per module, deduplicated
fantasy-table/            modules/ zips + tier.json
galaxy-table/             modules/ zips + tier.json
all-access/               modules/ zips + tier.json
architect/                modules/ zips + tier.json
```

Pass `--out <dir>` to write somewhere else. Campaign-private modules are only packaged when their ids are passed with `--extra <ids>`, and they land in `campaign-private/`; their ids are deliberately absent from this repository.

The script refuses to write inside this repository and refuses to overwrite a folder that it did not generate.

## Source layout

```text
tiers.json                        machine-readable tier definition
modules/<module-id>/              complete module source and hosted manifest
dist/<module-id>-<version>.zip    current installable bundle per free module
tools/sync-modules.mjs            syncs free modules from Foundry and rebuilds bundles
tools/build-tier-packages.mjs     builds the private paid-tier release folders
tools/zip-module.py               archive helper: module folder at the zip root
```

## Notes

- The armory sheet works in any dnd5e world; the Crimson modules it lists in its toolbox are optional.
- Each module ships Atkinson Hyperlegible Next under the SIL Open Font License 1.1. The full licence is in `fonts/OFL.txt` inside each module that includes the font.
- The world script version of the sheet is not included; these are standalone module copies.

## Optional integrations

- **Midi-QOL** — the armory passes item use through `item.use({ event })`, so Midi-QOL handles attacks and damage when active.
- **Item Piles** — a box button appears in the sheet navigation for Item Piles piles and merchants, opening their interface. Neither module is required.

© Faewns-Hellion
