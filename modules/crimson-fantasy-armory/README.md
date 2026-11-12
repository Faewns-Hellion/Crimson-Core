# Crimson Fantasy Armory

A standalone dnd5e character sheet packaged from the Crimson Tyrant world sheet. It replaces the usual character sheet with a dragon-hoard record: portrait and vitals plate, AC/speed/initiative/hoard gauges, item pages, rest controls, dragon colour schemes, player-facing handouts, and a toolbox that launches whichever Crimson modules are active.

## Install

1. Put the `crimson-fantasy-armory` folder in `Data/modules`.
2. Restart Foundry or refresh the Setup screen.
3. Enable **Crimson Fantasy Armory** in **Manage Modules**.
4. The sheet registers for `character`, `npc` and `vehicle` actors and claims the default sheet for those types.

Do not enable **Crimson Fantasy Armory** and **Crimson Galaxy Armory** in the same world. They are the same sheet with different skins; enabling both leaves neither as the default and makes the sheet picker ambiguous.

## Using it

Open any character, NPC or vehicle. The book-mark button in the sheet's navigation opens the CRIMSON panel:

- **TOOLS** lists only the Crimson modules that are currently active and expose a matching API method.
- **HANDOUTS** lists journals the GM has picked. Players only see entries they have Observer permission on.
- **CHOOSE HANDOUTS** (GM only) opens the journal picker.

The HOARD gauge converts total wealth into the most valuable denomination the actor actually owns: platinum, gold, electrum, silver or copper.

## API

```js
game.crimsonFantasyArmory.open();          // open the current user's character
game.crimsonFantasyArmory.sheet;           // the sheet class
game.crimsonFantasyArmory.setScheme('red'); // change the dragon palette
game.modules.get('crimson-fantasy-armory').api.open();
```

Handout selections are stored in the world setting `crimson-fantasy-armory.crimsonHandouts`.

## Fonts

The sheet ships Atkinson Hyperlegible Next under the SIL Open Font License 1.1. The font files and the full licence (`fonts/OFL.txt`) are in `fonts/`; keep them together if you redistribute this module.

## Notes

- Minimum Foundry 14.368, dnd5e 5.3.3 (verified on dnd5e 6.0.6).
- The sheet has no dependency on the Crimson world; it works in any dnd5e world.
- Crimson modules are optional. Inactive tools simply do not appear.


## Optional integrations

- **Midi-QOL** — item and attack uses go through `item.use({ event })`, so Midi-QOL's workflow handles them when it is active.
- **Item Piles** — when the actor is an Item Piles pile or merchant, a box button appears in the sheet navigation to open its interface. Neither module is required.
