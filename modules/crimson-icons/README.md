# Crimson Icons

Shared item matching API: `game.crimsonIcons.matchItem(itemData, {force:false})` returns a related image path from the same catalogue the app displays; `game.crimsonIcons.catalogue()` reads that catalogue. Existing non-default artwork is preserved unless `force` is requested. Matching itself does not update documents. Crimson Bag uses this API for generated/missing artwork and retains unidentified names and properties for players.

Foundry 14 module, independent of Crimson Feats. Adds **Icons** to the left scene controls. Open it, search 7,100 bundled Foundry icons, filter by folder, and drag an icon onto a supported image slot. The gallery shows 90 per page and loads thumbnails lazily. Clicking copies an icon's path as a fallback.

Supported targets:

- Native editable document images marked `data-edit` (items, actors, effects and other sheets using that convention). Drop updates only the image field through the normal document API; other fields are not submitted by this module. Foundry may rerender that sheet as it normally does when its document changes.
- Named image/texture path form inputs and native FilePicker buttons. The drop fills the form field and emits input/change events. The owning form's save behavior still applies.
- Crimson Feats' icon slot and review icon: updates the current blueprint, capturing other inputs first.
- Item Creator's icon square: enables its Customize Icon override and updates only the draft icon. Saving the item remains a separate action.
- Other modules can mark an image with `data-crimson-icon-key="img"` or an image path input with `data-crimson-icon-input`.

Drop targets glow red. Read-only/unowned sheets and locked compendiums cannot be updated. Arbitrary decorative images are deliberately not drop targets. Custom applications without supported image fields need an adapter; this cannot guarantee compatibility with every module's private UI.

## Activation without interrupting players

A newly created module may require a Foundry server restart to appear in Manage Modules. No restart or activation was performed during development. To use the library on the current GM client without any reload, run in its developer console:

```js
await import('/modules/crimson-icons/scripts/main.mjs');
```

This installs the toolbar and drop handlers on that client only for the current session. At a convenient maintenance time, enable **Crimson Icons** normally for persistent loading. An unactivated session import does not survive F5. No world setting, actor migration, or connected-player reload is performed by the session loader.

API: `game.crimsonIcons.open()` or `game.modules.get('crimson-icons').api.open()` after normal activation. `game.crimsonIcons.resolveTarget(element)` exposes target recognition for integration diagnostics. The module uses custom HTML5 drag data; dragging onto the scene does not place tokens or tiles.

## Validation

Five Node tests pass for payload validation, filtered search, image-only document updates and permission/compendium checks. Headless Edge DOM integration checks pass for native image drops, Crimson Feats drafts, Item Creator drafts, form input events, readonly rejection and non-image field exclusion. Gallery template renders 90 icons per page; preview saved in Backups/crimson-icons-validation. These use mocked Foundry applications/documents; the live game and other modules remain to be checked after loading. No live items were changed.
