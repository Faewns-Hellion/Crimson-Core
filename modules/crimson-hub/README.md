# Crimson Core

Shared navigation, compatibility helpers, the Crimson Quest Board and theme-aware UI for the Crimson modules. The existing package ID `crimson-hub` remains stable to preserve imports and world settings. The dragon toolbar is labeled Crimson Core. Galaxy Forge and Fantasy Forge are available to GMs when enabled; Shipwright, Heliana's Hunt and the Quest Board are available when active. Science-fiction colors apply only while the science-fiction theme is selected. Existing module permissions and APIs remain intact. Reload Foundry after this update.

## Quest Board

Open it from **Crimson Core → Quest Board**, or call `game.crimsonCore.openQuests()`.

- The GM can post quests, edit them, publish or hide drafts, mark them complete or failed, and reopen them.
- Players see published postings only. They can claim an open quest; the claim is relayed to the GM, who owns the shared journal.
- Quest data lives in the **Crimson Board** journal, so it survives reloads and can be backed up with the world.
- On first use the board creates six Crimson Tyrant hooks: *The Hollow Tithe*, *Scales on the Saltmarsh*, *The Pale Heron*, *Ash at Saint Cinder’s*, *The Longest Road*, and the unpublished *A Debt in Dragon’s Blood*. Edit or delete them freely.

## Crimson Garrison

Open it from **Crimson Core → Crimson Garrison**, or call `game.crimsonCore.openGarrison()`.

- Tracks the shared garrison day, five readiness tracks (Security, Habitation, Logistics, Garrison, Command), sectors, projects, roster, stores, and a watch log.
- **Advance day** consumes one day of supplies, moves every active project one segment, pays payroll every seventh day, and posts a chat summary.
- **Auto after long rest** is on by default. When enabled, a long rest advances the garrison ledger by exactly one day on the primary active GM client. A group rest ticks once, not once per resting actor.
- The ledger advances only its own day counter. It does not move Foundry's world clock; dnd5e and Calendaria handle world time.
- Data lives in **The Old Watch** journal. The GM creates it on first load. Players with owner permission can manage the ledger; the GM remains the only client that applies the automatic long-rest tick.
- The first build is a playable reclamation ledger for an abandoned coastal fort. Edit the journal flag to rename the site, change sectors, or replace the starting projects.
