// Crimson Core: one way to open the Spell Book module's window for a character,
// and a button for it on the Inventory tab of the standard D&D sheet.
// (The Spell Book module only puts its own button on the Spells tab.)

/** Open the Spell Book module's spellbook for an actor, with a clear message if it cannot. */
export async function openSpellbook(actor) {
  const api = game.modules.get('spell-book')?.active ? game.modules.get('spell-book').api : null;
  if (!actor) { ui.notifications.warn('No character to open a spellbook for.'); return null; }
  if (typeof api?.openSpellBookForActor !== 'function') {
    ui.notifications.warn('The Spell Book module is not enabled in this world.');
    return null;
  }
  try {
    return await api.openSpellBookForActor(actor);
  } catch (error) {
    console.error('Crimson Core: the spellbook could not be opened.', error);
    ui.notifications.error(`${actor.name}'s spellbook could not be opened. See the console (F12).`);
    return null;
  }
}

function spellbookButton(actor) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'unbutton filter-control always-interactive crimson-spellbook-button';
  button.dataset.tooltip = 'Open spellbook';
  button.setAttribute('aria-label', 'Open spellbook');
  button.innerHTML = '<i class="fa-solid fa-book-open" aria-hidden="true"></i>';
  button.addEventListener('click', (event) => { event.preventDefault(); openSpellbook(actor); });
  return button;
}

/**
 * Say plainly in the title bar whether the standard sheet is being edited.
 * The system marks the window .editable (edit mode) or .locked (no permission).
 */
function updateModeLabel(element) {
  const root = element?.closest?.('.application') ?? element;
  if (!root?.classList?.contains('dnd5e2')) return;
  const header = root.querySelector(':scope > header.window-header') ?? root.querySelector('.window-header');
  if (!header) return;
  let label = header.querySelector('.crimson-mode-label');
  const mode = root.classList.contains('editable') ? 'edit' : root.classList.contains('locked') ? 'locked' : '';
  if (!mode) { label?.remove(); return; }
  if (!label) {
    label = document.createElement('span');
    const slider = header.querySelector('slide-toggle, .mode-slider');
    if (slider) slider.insertAdjacentElement('afterend', label); else header.prepend(label);
  }
  label.className = `crimson-mode-label is-${mode}`;
  label.textContent = mode === 'edit' ? 'EDIT MODE' : 'READ ONLY';
  label.dataset.tooltip = mode === 'edit'
    ? 'You are editing this sheet. Changes save as you go. Flip the switch to return to play mode.'
    : 'You do not own this character, so it cannot be edited.';
}

/** Add the button to the Inventory tab of the standard dnd5e character and NPC sheets. */
function onRenderActorSheet(app, element) {
  updateModeLabel(app.element ?? element);
  const actor = app.actor ?? app.document;
  if (!actor || !['character', 'npc'].includes(actor.type) || !actor.isOwner) return;
  if (!game.modules.get('spell-book')?.active) return;
  const tab = element?.querySelector?.('section.tab[data-tab="inventory"]');
  if (!tab || tab.querySelector('.crimson-spellbook-button')) return;
  const controls = tab.querySelector('item-list-controls search ul.controls');
  if (controls) {
    const li = document.createElement('li');
    li.append(spellbookButton(actor));
    controls.append(li);
    return;
  }
  // Sheet layout changed: fall back to a plain labelled button at the top of the tab.
  const button = spellbookButton(actor);
  button.className = 'crimson-spellbook-button is-fallback';
  button.innerHTML = '<i class="fa-solid fa-book-open" aria-hidden="true"></i> Open spellbook';
  tab.prepend(button);
}

if (typeof Hooks !== 'undefined') {
  Hooks.on('renderActorSheetV2', onRenderActorSheet);
  Hooks.once('ready', () => {
    const core = game.crimsonCore ?? game.crimsonHub;
    if (core) core.openSpellbook = openSpellbook;
  });
}
