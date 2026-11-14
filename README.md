# Crimson-Core

Foundry VTT 14 modules for dnd5e by [Faewns-Hellion](https://github.com/Faewns-Hellion).

This repository is the **Crimson Initiate** tier from my collection of modules. This small collection of free content includes an icon picker that finally puts all the icons you own in one easy to read menu, a new character sheet, and integration with midiQOL and other modules when specified. Each module installs and releases on its own; there is no bundled core or profile package. Paid tier modules and campaign-private compendiums are packaged from a private release folder and are not part of this repository or its history.

## Tiers

| Tier | Price | Modules |
| --- | --- | --- |
| **Crimson Initiate** | Free | `crimson-hub`, `crimson-fantasy-armory`, `crimson-dragon-theme`, `crimson-drafts`, `crimson-icons` |
| **Fantasy Table** | $5/month | Everything in Crimson Initiate, plus `crimson-fantasy-generator`, `crimson-shipwright`, `crimson-adaptations`, `crimson-random-items`, `crimson-bag`, `crimson-feats`, `crimson-fantasy-tokens` |
| **Galaxy Table** | $5/month | Everything in Crimson Initiate, plus `crimson-galaxy-armory`, `neon-odyssey-generator`, `crimson-mechanic`, `crimson-rivals`, `crimson-obsidian`, `crimson-feats` |
| **Crimson All-Access** | $10/month | All 16 public modules, every future public module, early access, dev logs and votes |
| **Crimson Architect** | $20/month | All-Access, plus priority requests, setup help and credits |

`crimson-feats` belongs to both table tiers, so it is delivered once and shared.

## Free modules

| Module | Version | What it does |
| --- | --- | --- |
| **Crimson Drafts** (`crimson-drafts`) | 0.1.1 | Persistent draft recovery for Crimson builders, Item Creator, and native document editing forms. |
| **Crimson Dragon — Interface Theme** (`crimson-dragon-theme`) | 1.0.1 | Obsidian, crimson, and hoard-gold skin for the full in-world Foundry interface. |
| **Crimson Fantasy Armory** (`crimson-fantasy-armory`) | 0.1.6 | A dragon-hoard character sheet for dnd5e: hoard gauge, initiative plate, item pages, rest controls and a toolbox that launches active Crimson modules. |
| **Crimson Core** (`crimson-hub`) | 1.3.1 | Shared Crimson navigation, compatibility helpers, the Crimson Quest Board, the Crimson Garrison ledger, Crimson Fleet navigation and theme-aware interface styling. |
| **Crimson Icons** (`crimson-icons`) | 0.3.0 | Searchable icon library in the left scene controls, with drag-and-drop into editable image slots and supported builders. |

## Install

Every module is a separate package: install only the ones you want.

In Foundry VTT Setup, open **Add-on Modules → Install Module**, paste the manifest URL for the module, and install it:

```text
https://raw.githubusercontent.com/Faewns-Hellion/Crimson-Core/main/modules/<module-id>/module.json
```

Replace `<module-id>` with a name from the table above, for example `crimson-icons` or `crimson-hub`.

To install by hand instead, download `dist/<module-id>-<version>.zip`, unzip it into `Data/modules/`, and restart Foundry. The zip's root is the module folder, so it extracts straight into place.

Either way, enable the module in **Manage Modules** in your world.

Only the free armory sheet ships here. Enable **one** armory module per world: every armory sheet registers for character, NPC and vehicle actors, and running two leaves neither as the default.

## Requirements

- Foundry VTT 14.368 or newer
- dnd5e 5.3.3+ (verified on 6.0.6)

## Notes

- The armory sheet works in any dnd5e world; the Crimson modules it lists in its toolbox are optional.
- Each module ships Atkinson Hyperlegible Next under the SIL Open Font License 1.1. The full licence is in `fonts/OFL.txt` inside each module that includes the font.
- The world script version of the sheet is not included; these are standalone module copies.

## Optional integrations

- **Midi-QOL** — the armory passes item use through `item.use({ event })`, so Midi-QOL handles attacks and damage when active.
- **Item Piles** — a box button appears in the sheet navigation for Item Piles piles and merchants, opening their interface. Neither module is required.

## For maintainers

The repository mirrors the free modules installed in Foundry. Point `--source` at your own Foundry `Data/modules` folder, or set `FOUNDRY_MODULES` and leave the flag off.

```powershell
node tools/sync-modules.mjs --source "<Foundry Data>/modules"
node tools/release-module.mjs <module-id>
```

- `sync-modules.mjs` copies the free tier out of Foundry, drops transient `LOCK` files, preserves LevelDB journals, and rebuilds one zip per module.
- `release-module.mjs` bumps the installed manifest, syncs, commits, tags `<module-id>-v<version>` and pushes `main`.
- `build-tier-packages.mjs` packages the paid tiers from the same source into a separate folder outside this repository.
- `tiers.json` lists every tier; only the free one is ever synced here.

```text
modules/<module-id>/              module source, including compendium packs
dist/<module-id>-<version>.zip    installable bundle for each free module
tiers.json                        tier definition
tools/                            sync, release and packaging scripts
```

© Faewns-Hellion
