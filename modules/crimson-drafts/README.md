# Crimson Drafts

Local draft recovery for Foundry VTT 14. Enable in Manage Modules on your next launch. Open Drafts from left controls, module settings, or the recovery button on an editing window.

Captures recent visible fields, accessible public application state, source document snapshots, readable code editor text, and readable canvas/SVG visuals. Native document sheets, V1/V2 windows, and unknown module editors have a generic fallback. Crimson Feats, Item Creator, and Crimson Forge have specialized adapters; Forge retains preview swap state too. Item Creator’s prior local recovery copy is imported when newer.

Changes debounce for 250 ms and closing captures pending edits. IndexedDB retains records per world/user on this browser profile. A small emergency localStorage copy covers the most recent five drafts when quota permits. Reopening a fresh default editor does not overwrite an existing unsaved recovery. Restoring over a different open draft preserves a before-recovery checkpoint. There is no automatic save or document update during generic form restoration. Inspect and export JSON before discarding important recovery copies.

The GM’s **Draft recovery access** setting offers Everyone (default), GM + trusted players, or GM only. Native document ownership still applies. Automatic capture is a per-client setting. Copies are local to each device/browser, not shared with the GM or other players. Clearing browser storage can delete them; export important work.

## Coverage limits

This is draft recovery, not a filesystem/world/database backup. A module’s private JavaScript fields, inaccessible frames, collaborative editor transactions, or opaque canvas scene model cannot be recovered universally. Visual canvas copies are reference images, not an editable scene reconstruction. Unknown tools may need to be reopened before Restore; specialized unsupported fields remain available in the JSON export. No old edit can be recovered unless a copy was captured. Password/file fields and obvious secret fields are excluded. Imported JSON should be from a trusted backup.

Generic restore fills supported controls without dispatching change/submit events. Review the reopened editor and explicitly save through its normal controls. Each tool may render or behave differently; native Foundry and third-party module updates can require adapter updates.

## Adapter API

`game.crimsonDrafts.open()`, `.list()`, `.backup(app)`, `.restore(recordId)` and `.registerAdapter(adapter)` are available after ready. An adapter provides id, label, match(app), key(app), title(app), synchronous snapshot(app), and async restore(snapshot) returning an application. Snapshots must be JSON-serializable and must not contain live Document/DOM objects or executable functions. Adapter registration takes precedence over generic fallbacks.

Verification: browser integration covers IndexedDB reload preservation, reopening an unknown editor, unnamed inputs/public model restoration, native checkbox/text restoration with no change events or document writes, and GM-only access. Testing used a simulated Foundry environment, not a running campaign.
