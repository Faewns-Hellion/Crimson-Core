/* Crimson Tyrant — Crimson Fantasy Armory
   The Neon Odyssey inventory/character sheet rebuilt for this world: same pages and item
   handling, but styled as dragon hoard record instead of a retrowave console.
   Colours come in three dragon families (chromatic, gem, metallic) plus a custom picker. */

const ID = 'crimson-fantasy-armory';
const TEMPLATE = 'modules/crimson-fantasy-armory/templates/armory.hbs';
const ABILITIES = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
const SCHEME_KEY = 'dragon-armory-scheme';
const COLOR_KEY = 'dragon-armory-colors';
const SHARE_NAMESPACE = 'crimson-fantasy-armory';
const SHARE_SETTING = 'crimsonHandouts';

/** Crimson modules the sheet can launch, provided the module is active. */
const TOOLS = [
  { id: 'obsidian', module: 'crimson-obsidian', title: 'Obsidian Vault', icon: 'fa-solid fa-book-atlas', method: 'open' },
  { id: 'bag', module: 'crimson-bag', title: 'Bag O Random Shit', icon: 'fa-solid fa-sack', method: 'open' },
  { id: 'forge', module: 'crimson-random-items', title: 'Crimson Forge', icon: 'fa-solid fa-dice-d20', method: 'open' },
  { id: 'mechanic', module: 'crimson-mechanic', title: 'Vehicle Builder', icon: 'fa-solid fa-rocket', method: 'open' },
  { id: 'feats', module: 'crimson-feats', title: 'Crimson Feats', icon: 'fa-solid fa-fire', method: 'open' },
  { id: 'library', module: 'crimson-feats', title: 'Content Library', icon: 'fa-solid fa-book-open', method: 'library' },
  { id: 'icons', module: 'crimson-icons', title: 'Crimson Icons', icon: 'fa-solid fa-images', method: 'open' },
  { id: 'drafts', module: 'crimson-drafts', title: 'Draft Recovery', icon: 'fa-solid fa-clock-rotate-left', method: 'open' },
  { id: 'adaptations', module: 'crimson-adaptations', title: 'Crimson Adaptations', icon: 'fa-solid fa-dna', method: 'open' },
];

/** Every palette id has a matching `[data-scheme]` block in dragon-armory.css. */
const SCHEMES = [
  { id: 'black', label: 'Black', group: 'chromatic', gradient: 'linear-gradient(120deg, #0c0f0c, #4c7a2e 70%, #d8f7a8)' },
  { id: 'blue', label: 'Blue', group: 'chromatic', gradient: 'linear-gradient(120deg, #061021, #2f7fd4 70%, #b9ecff)' },
  { id: 'green', label: 'Green', group: 'chromatic', gradient: 'linear-gradient(120deg, #07140c, #2f8f45 70%, #cdf7b0)' },
  { id: 'red', label: 'Red', group: 'chromatic', gradient: 'linear-gradient(120deg, #1a0705, #b3271b 70%, #ffc27a)' },
  { id: 'white', label: 'White', group: 'chromatic', gradient: 'linear-gradient(120deg, #0d1319, #7fa8c4 70%, #ffffff)' },
  { id: 'amethyst', label: 'Amethyst', group: 'gem', gradient: 'linear-gradient(120deg, #100821, #7a3fd1 70%, #e2c7ff)' },
  { id: 'crystal', label: 'Crystal', group: 'gem', gradient: 'linear-gradient(120deg, #07161d, #3f9fb8 70%, #e8fbff)' },
  { id: 'emerald', label: 'Emerald', group: 'gem', gradient: 'linear-gradient(120deg, #06140f, #1f9c72 70%, #b8ffe2)' },
  { id: 'sapphire', label: 'Sapphire', group: 'gem', gradient: 'linear-gradient(120deg, #060a1c, #3558c9 70%, #b9caff)' },
  { id: 'topaz', label: 'Topaz', group: 'gem', gradient: 'linear-gradient(120deg, #171106, #c99417 70%, #ffe6a3)' },
  { id: 'brass', label: 'Brass', group: 'metallic', gradient: 'linear-gradient(120deg, #191308, #a8862f 70%, #f2d68f)' },
  { id: 'bronze', label: 'Bronze', group: 'metallic', gradient: 'linear-gradient(120deg, #1a1208, #96602c 70%, #e6b380)' },
  { id: 'copper', label: 'Copper', group: 'metallic', gradient: 'linear-gradient(120deg, #1b0f0a, #a85633 70%, #ffc09c)' },
  { id: 'gold', label: 'Gold', group: 'metallic', gradient: 'linear-gradient(120deg, #1c1505, #c9a227 70%, #ffe9a8)' },
  { id: 'silver', label: 'Silver', group: 'metallic', gradient: 'linear-gradient(120deg, #10141a, #8d9caa 70%, #f2f7ff)' }
];

const GROUPS = [
  { id: 'chromatic', label: 'CHROMATIC' },
  { id: 'gem', label: 'GEM' },
  { id: 'metallic', label: 'METALLIC' }
];

const DEFAULT_COLORS = { accent: '#c8503c', accent2: '#ffb347', bg: '#140a09' };

/** Colour art per item type: several per type so lists never repeat one glyph. */
const TYPE_ICONS = {
  weapon: [
    'icons/weapons/swords/greatsword-crossguard-embossed-gold.webp',
    'icons/weapons/axes/axe-battle-orange.webp',
    'icons/weapons/polearms/halberd-curved-steel.webp'
  ],
  equipment: [
    'icons/equipment/chest/breastplate-banded-steel-gold.webp',
    'icons/equipment/chest/breastplate-banded-blue.webp',
    'icons/equipment/feet/boots-armored-gold.webp'
  ],
  consumable: [
    'icons/consumables/potions/bottle-bulb-corked-glowing-red.webp',
    'icons/consumables/potions/potion-vial-corked-labeled-purple.webp',
    'icons/consumables/potions/bottle-bulb-corked-green.webp'
  ],
  tool: [
    'icons/tools/cooking/cauldron-empty.webp',
    'icons/tools/smithing/anvil.webp',
    'icons/tools/hand/hammer-construction-claw.webp'
  ],
  spell: [
    'icons/sundries/books/book-backed-blue-gold.webp',
    'icons/magic/lightning/orb-ball-spiral-blue.webp',
    'icons/magic/fire/flame-burning-hand-orange.webp'
  ],
  feat: [
    'icons/skills/melee/blade-tip-energy-green.webp',
    'icons/skills/melee/blade-tip-orange.webp',
    'icons/skills/melee/blade-tip-chipped-blood-red.webp'
  ],
  loot: [
    'icons/containers/bags/pack-canvas-white-brown.webp',
    'icons/commodities/gems/gem-cluster-purple.webp',
    'icons/containers/chest/chest-reinforced-steel-brown.webp'
  ],
  vehicle: ['icons/environment/settlement/ship.webp']
};

const BLAND_ART = /^(?:icons\/svg\/|systems\/dnd5e\/icons\/svg\/)/;

/** Inline vector, so an item tile can never end up empty. */
const GLYPH_FALLBACK = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" fill="#150c0c"/><path d="M16 4 L25 12 V24 L16 29 L7 24 V12 Z" fill="none" stroke="#ffb347" stroke-width="2"/><circle cx="16" cy="16" r="3" fill="#c8503c"/></svg>'
)}`;

function readScheme() {
  try {
    const stored = window.localStorage.getItem(SCHEME_KEY);
    if (stored === 'custom' || SCHEMES.some(scheme => scheme.id === stored)) return stored;
  } catch (err) {
    // storage may be blocked; the default palette still applies
  }
  return 'red';
}

function storeScheme(id) {
  try {
    window.localStorage.setItem(SCHEME_KEY, id);
  } catch (err) {
    // the choice simply will not persist
  }
}

function readColors() {
  try {
    const stored = JSON.parse(window.localStorage.getItem(COLOR_KEY) ?? 'null');
    if (stored && typeof stored === 'object') {
      return {
        accent: /^#[0-9a-f]{6}$/i.test(stored.accent) ? stored.accent : DEFAULT_COLORS.accent,
        accent2: /^#[0-9a-f]{6}$/i.test(stored.accent2) ? stored.accent2 : DEFAULT_COLORS.accent2,
        bg: /^#[0-9a-f]{6}$/i.test(stored.bg) ? stored.bg : DEFAULT_COLORS.bg
      };
    }
  } catch (err) {
    // fall through to the defaults
  }
  return { ...DEFAULT_COLORS };
}

function storeColors(colors) {
  try {
    window.localStorage.setItem(COLOR_KEY, JSON.stringify(colors));
  } catch (err) {
    // custom colours stay for this session only
  }
}

function sharedJournalIds() {
  try {
    const stored = game.settings.get(SHARE_NAMESPACE, SHARE_SETTING);
    return Array.isArray(stored) ? stored.filter(id => typeof id === 'string') : [];
  } catch (err) {
    return [];
  }
}

async function storeSharedJournalIds(ids) {
  try {
    await game.settings.set(SHARE_NAMESPACE, SHARE_SETTING, [...new Set(ids)]);
    return true;
  } catch (err) {
    console.warn('[crimson-fantasy-armory] could not save the handout list', err);
    ui.notifications.warn('The handout list could not be saved.');
    return false;
  }
}

/** Coin counts can be fractional once the hoard is reduced to a single denomination. */
function formatCoinAmount(value) {
  if (!Number.isFinite(value)) return '0';
  const rounded = Math.abs(value) >= 100 ? Math.round(value) : Math.round(value * 100) / 100;
  return rounded.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

const COIN_KEYS = ['pp', 'gp', 'ep', 'sp', 'cp'];
const COIN_FALLBACK = { pp: 0.1, gp: 1, ep: 2, sp: 10, cp: 100 };

function coinConfig(key) {
  return CONFIG.DND5E?.currencies?.[key] ?? {};
}

function coinAbbr(key) {
  return loc(coinConfig(key).abbreviation ?? key.toUpperCase());
}

function normalizeCurrency(currency) {
  return Object.fromEntries(COIN_KEYS.map(key => [key, Math.max(0, number(currency?.[key]))]));
}

function currencyHasFunds(currency) {
  return COIN_KEYS.some(key => number(currency?.[key]) > 0);
}

function currencyParts(currency) {
  return COIN_KEYS
    .filter(key => number(currency?.[key]) > 0)
    .map(key => ({ key, value: number(currency[key]), abbr: coinAbbr(key) }));
}

/** Exact denominations held in a container, e.g. "17,856 gp · 4 cp". */
function currencySummary(currency) {
  return currencyParts(currency)
    .map(part => `${formatCoinAmount(part.value)} ${part.abbr}`)
    .join(' · ');
}

/** Gold-equivalent value. `conversion` in dnd5e is coins per gold piece. */
function currencyValue(currency) {
  return COIN_KEYS.reduce((total, key) => {
    const conversion = number(coinConfig(key).conversion, COIN_FALLBACK[key]) || COIN_FALLBACK[key];
    return total + number(currency?.[key]) / conversion;
  }, 0);
}

/** Wealth stored in containers is deliberately kept separate from the pocket purse. */
function summarizeContainerCurrency(containers = []) {
  const totals = Object.fromEntries(COIN_KEYS.map(key => [key, 0]));
  let count = 0;
  for (const container of containers) {
    const currency = container?.system?.currency;
    if (!currencyHasFunds(currency)) continue;
    count += 1;
    for (const key of COIN_KEYS) totals[key] += number(currency?.[key]);
  }
  return {
    count,
    countLabel: `${count} ${count === 1 ? 'container' : 'containers'}`,
    hasFunds: count > 0,
    summary: currencySummary(totals),
    gp: currencyValue(totals),
    parts: currencyParts(totals)
  };
}

const { ActorSheetV2 } = foundry.applications.sheets;
const { HandlebarsApplicationMixin } = foundry.applications.api;

/* ------------------------------------------------------------------ helpers */

const loc = value => {
  if (value === undefined || value === null) return '';
  const key = String(value);
  const out = game.i18n.localize(key);
  return out === key ? key : out;
};

const number = (value, fallback = 0) => (Number.isFinite(Number(value)) ? Number(value) : fallback);
const signed = value => `${number(value) >= 0 ? '+' : ''}${number(value)}`;

function abilityLabel(key) {
  const config = CONFIG.DND5E?.abilities?.[key] ?? {};
  return loc(config.label ?? key);
}

function abilityAbbr(key) {
  const config = CONFIG.DND5E?.abilities?.[key] ?? {};
  return String(config.abbreviation ?? config.abbr ?? key.slice(0, 3)).toUpperCase();
}

function skillLabel(key) {
  const config = CONFIG.DND5E?.skills?.[key] ?? {};
  return loc(config.label ?? key);
}

function itemWeight(item) {
  const weight = item.system?.weight;
  const value = typeof weight === 'object' ? number(weight?.value) : number(weight);
  return value * number(item.system?.quantity, 1);
}

function itemUses(item) {
  const uses = item.system?.uses;
  if (!uses?.max) return null;
  return { value: Math.max(0, number(uses.max) - number(uses.spent)), max: uses.max };
}

function iconFor(item) {
  const set = TYPE_ICONS[item?.type] ?? TYPE_ICONS.loot;
  const seed = [...String(item?.id ?? item?.name ?? '')].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return set[seed % set.length];
}

/** D&D 5e item types that can own a nested inventory. */
const CONTAINER_TYPES = new Set(['container', 'backpack']);

function isContainerItem(item) {
  return CONTAINER_TYPES.has(item?.type);
}

function itemView(item) {
  const uses = itemUses(item);
  const currency = normalizeCurrency(item.system?.currency);
  return {
    id: item.id,
    name: item.name,
    img: item.img && !BLAND_ART.test(item.img) ? item.img : iconFor(item),
    type: item.type,
    qty: number(item.system?.quantity, 1),
    weight: itemWeight(item),
    equipped: Boolean(item.system?.equipped),
    isContainer: isContainerItem(item),
    containerId: typeof item.system?.container === 'string' ? item.system.container : null,
    currency,
    currencyLabel: currencyHasFunds(currency) ? currencySummary(currency) : '',
    usable: typeof item.use === 'function' || typeof item.roll === 'function',
    hasUses: Boolean(uses),
    uses,
    subtitle: loc(CONFIG.Item?.typeLabels?.[item.type] ?? item.type)
  };
}

function bucketOf(item) {
  if (item.type === 'weapon') return 'weapons';
  if (item.type === 'spell') return 'spells';
  if (['feat', 'class', 'subclass', 'race', 'background'].includes(item.type)) return 'features';
  if (item.type === 'consumable') return 'consumables';
  return 'gear';
}

/**
 * Split the actor's hoard into ordinary top-level entries and container trees.
 * Contained items never appear in the flat category lists; they live under
 * their parent container instead, however deeply the containers nest.
 */
export function groupHoardItems(items = []) {
  const entries = [...items];
  const byId = new Map(entries.map(item => [item.id, item]));
  const views = new Map(entries.map(item => [item.id, itemView(item)]));
  const children = new Map();
  const parentOf = new Map();
  const parentIdOf = item => {
    const value = item.system?.container;
    return typeof value === 'string' && value ? value : null;
  };

  const validParent = item => {
    const parentId = parentIdOf(item);
    if (!parentId || parentId === item.id) return null;
    const parent = byId.get(parentId);
    if (!parent || !isContainerItem(parent)) return null;

    // A malformed cyclic containment chain must not swallow the whole hoard.
    const seen = new Set([item.id]);
    let cursor = parent;
    while (cursor) {
      if (seen.has(cursor.id)) return null;
      seen.add(cursor.id);
      const nextId = parentIdOf(cursor);
      if (!nextId) break;
      const next = byId.get(nextId);
      if (!next || !isContainerItem(next)) break;
      cursor = next;
    }
    return parent;
  };

  for (const item of entries) {
    const parent = validParent(item);
    if (!parent) continue;
    parentOf.set(item.id, parent.id);
    if (!children.has(parent.id)) children.set(parent.id, []);
    children.get(parent.id).push(item);
  }

  const roots = entries.filter(item => !parentOf.has(item.id));
  const lists = { weapons: [], consumables: [], gear: [], features: [], spells: [] };
  const containers = [];
  const compare = (a, b) => {
    if (isContainerItem(a) !== isContainerItem(b)) return isContainerItem(a) ? -1 : 1;
    return String(a.name).localeCompare(String(b.name));
  };

  const flatten = (container, depth, rows, path) => {
    for (const child of [...(children.get(container.id) ?? [])].sort(compare)) {
      const view = views.get(child.id);
      rows.push({ ...view, depth, isContainer: isContainerItem(child) });
      if (isContainerItem(child) && !path.has(child.id)) {
        flatten(child, depth + 1, rows, new Set([...path, child.id]));
      }
    }
  };

  for (const item of roots) {
    const view = views.get(item.id);
    if (isContainerItem(item)) {
      const rows = [];
      flatten(item, 1, rows, new Set([item.id]));
      containers.push({
        ...view,
        rows,
        contentsCount: rows.length,
        contentsLabel: `${rows.length} ${rows.length === 1 ? 'item' : 'items'}`
      });
      continue;
    }
    const bucket = bucketOf(item);
    if (lists[bucket]) lists[bucket].push(view);
  }

  for (const list of Object.values(lists)) list.sort((a, b) => a.name.localeCompare(b.name));
  containers.sort((a, b) => a.name.localeCompare(b.name));

  return {
    lists,
    containers,
    storedWealth: summarizeContainerCurrency(entries.filter(isContainerItem)),
    weight: entries.reduce((sum, item) => sum + itemWeight(item), 0),
    count: entries.length,
    storedCount: entries.length - roots.length
  };
}

function spellRankLabel(level) {
  if (level === 0) return 'CANTRIPS';
  const label = loc(CONFIG.DND5E?.spellLevels?.[level] ?? '');
  return (label || `LEVEL ${level}`).toUpperCase();
}

function spellRankTabLabel(level, label) {
  if (level === 0) return 'CANTRIP';
  return label.replace(/\s+LEVEL$/, '');
}

function spellView(item) {
  const base = itemView(item);
  const system = item.system ?? {};
  const labels = item.labels ?? {};
  const level = number(system.level, 0);
  const schoolKey = String(system.school ?? '');
  const schoolConfig = CONFIG.DND5E?.spellSchools?.[schoolKey] ?? {};
  const properties = system.properties;
  const has = key => (typeof properties?.has === 'function'
    ? properties.has(key)
    : Array.isArray(properties) ? properties.includes(key) : false);
  const preparedValue = number(system.prepared, 0);
  const preparedState = Object.values(CONFIG.DND5E?.spellPreparationStates ?? {})
    .find(state => Number(state.value) === preparedValue);
  const componentMap = { vocal: 'V', somatic: 'S', material: 'M' };
  const fallbackComponents = Object.keys(componentMap).filter(has).map(key => componentMap[key]).join(', ');
  const tags = [];
  if (has('concentration')) tags.push('CONCENTRATION');
  if (has('ritual')) tags.push('RITUAL');
  if (preparedValue === 2) tags.push('ALWAYS');
  else if (preparedValue === 1) tags.push('PREPARED');

  return {
    ...base,
    level,
    levelLabel: spellRankLabel(level),
    school: {
      key: schoolKey,
      label: loc(schoolConfig.label ?? schoolKey ?? ''),
      abbr: schoolKey ? schoolKey.toUpperCase() : '—'
    },
    prepared: preparedValue > 0,
    preparedValue,
    preparedLabel: preparedState ? loc(preparedState.label) : (preparedValue ? 'Prepared' : 'Unprepared'),
    activation: labels.activation ?? '',
    range: labels.range ?? '',
    duration: labels.duration ?? '',
    components: labels.components?.vsm ?? fallbackComponents,
    tags
  };
}

/** Rank order, then alphabetical within each rank. */
export function groupSpellsByRank(spells = []) {
  const groups = new Map();
  for (const item of spells) {
    const view = spellView(item);
    if (!groups.has(view.level)) groups.set(view.level, []);
    groups.get(view.level).push(view);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a - b)
    .map(([level, list]) => {
      list.sort((a, b) => a.name.localeCompare(b.name));
      return {
        level,
        label: spellRankLabel(level),
        count: list.length,
        countLabel: `${list.length} ${list.length === 1 ? 'spell' : 'spells'}`,
        preparedCount: list.filter(spell => spell.prepared).length,
        spells: list
      };
    });
}

async function fallbackRoll(actor, path, title) {
  const roll = new Roll(`1d20 + @${path}`, actor.getRollData());
  await roll.evaluate();
  return roll.toMessage({ speaker: ChatMessage.getSpeaker({ actor }), flavor: `${title} — ${actor.name}` });
}

function applyScheme(root, scheme, colors) {
  if (!root) return;
  const shell = root.querySelector('.armory-shell') ?? root;
  shell.dataset.scheme = scheme;
  if (scheme === 'custom') {
    shell.style.setProperty('--dr-accent', colors.accent);
    shell.style.setProperty('--dr-accent-2', colors.accent2);
    shell.style.setProperty('--dr-bg', colors.bg);
  } else {
    shell.style.removeProperty('--dr-accent');
    shell.style.removeProperty('--dr-accent-2');
    shell.style.removeProperty('--dr-bg');
  }
  for (const chip of root.querySelectorAll('[data-scheme-panel] [data-scheme]')) {
    chip.classList.toggle('is-active', chip.dataset.scheme === scheme);
  }
}

/* -------------------------------------------------------------------- sheet */

export class CrimsonArmorySheet extends HandlebarsApplicationMixin(ActorSheetV2) {
  static DEFAULT_OPTIONS = {
    id: 'crimson-fantasy-armory-{id}',
    classes: ['crimson-fantasy-armory'],
    position: { width: 1000, height: 740 },
    window: { title: 'Crimson Fantasy Armory', resizable: true, controls: [] },
    form: { submitOnChange: true, closeOnSubmit: false },
    actions: {
      page: CrimsonArmorySheet.#onTab,
      rollAbility: CrimsonArmorySheet.#onRollAbility,
      rollSave: CrimsonArmorySheet.#onRollSave,
      rollSkill: CrimsonArmorySheet.#onRollSkill,
      cycleSkill: CrimsonArmorySheet.#onCycleSkill,
      useItem: CrimsonArmorySheet.#onUseItem,
      toggleEquip: CrimsonArmorySheet.#onToggleEquip,
      editItem: CrimsonArmorySheet.#onEditItem,
      deleteItem: CrimsonArmorySheet.#onDeleteItem,
      toggleCollapse: CrimsonArmorySheet.#onToggleCollapse,
      selectSpellRank: CrimsonArmorySheet.#onSelectSpellRank,
      toggleInspiration: CrimsonArmorySheet.#onToggleInspiration,
      rest: CrimsonArmorySheet.#onRest,
      rollInitiative: CrimsonArmorySheet.#onRollInitiative,
      openPile: CrimsonArmorySheet.#onOpenPile,
      toggleScheme: CrimsonArmorySheet.#onToggleScheme,
      setScheme: CrimsonArmorySheet.#onSetScheme,
      toggleShare: CrimsonArmorySheet.#onToggleShare,
      openJournal: CrimsonArmorySheet.#onOpenJournal,
      useTool: CrimsonArmorySheet.#onUseTool,
      chooseShare: CrimsonArmorySheet.#onChooseShare,
      repairArt: CrimsonArmorySheet.#onRepairArt
    }
  };

  static PARTS = { armory: { template: TEMPLATE } };

  page = 'core';
  scheme = readScheme();
  colors = readColors();
  collapsed = new Set();
  spellRank = null;

  /* -------------------------------------------- */

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const actor = this.actor;
    const system = actor.system ?? {};
    const hp = system.attributes?.hp ?? {};
    const max = number(hp.max, 1);
    const value = number(hp.value, max);
    const hoard = groupHoardItems([...actor.items]);
    const itemLists = hoard.lists;

    const classes = actor.items.filter(item => item.type === 'class');
    const species = actor.items.find(item => item.type === 'race');
    const isNPC = actor.type === 'npc';
    const isVehicle = actor.type === 'vehicle';
    const className = isVehicle
      ? (loc(system.details?.type ?? '') || 'Vehicle')
      : isNPC
        ? (loc(system.details?.type?.value ?? '') || 'NPC')
        : (classes.length ? classes.map(item => item.name).join(' / ') : loc(system.details?.class ?? ''));

    const abilities = ABILITIES.map(key => {
      const ability = system.abilities?.[key] ?? {};
      const save = ability.save;
      const saveValue = save && typeof save === 'object'
        ? number(save.value, number(ability.mod))
        : number(save, number(ability.mod));
      const saveProf = number(ability.save?.prof?.multiplier, number(ability.proficient)) >= 1;
      return {
        key,
        label: abilityLabel(key),
        abbr: abilityAbbr(key),
        value: number(ability.value, 10),
        mod: signed(ability.mod),
        save: signed(saveValue),
        saveProf
      };
    });

    const skills = Object.entries(system.skills ?? {})
      .map(([id, skill]) => {
        const prof = number(skill?.proficient);
        return {
          id,
          label: skill?.label ? loc(skill.label) : skillLabel(id),
          ability: abilityAbbr(skill?.ability ?? CONFIG.DND5E?.skills?.[id]?.ability ?? ''),
          total: signed(skill?.total),
          expert: prof >= 2,
          proficient: prof >= 1
        };
      })
      .sort((a, b) => a.label.localeCompare(b.label));

    const str = number(system.abilities?.str?.value, 10);
    const capacity = number(system.attributes?.encumbrance?.max, str * 15) || 150;
    // The purse is only what the actor carries personally. Coins inside a
    // container live on that container and never feed this total.
    const pocket = normalizeCurrency(system.currency);
    const coins = currencyValue(pocket);

    context.actor = actor;
    context.editable = this.isEditable;
    context.page = this.page;
    context.pages = [
      { id: 'core', label: 'CORE', icon: 'fa-solid fa-dragon', active: this.page === 'core' },
      { id: 'hoard', label: 'HOARD', icon: 'fa-solid fa-treasure-chest', active: this.page === 'hoard' },
      { id: 'powers', label: 'POWERS', icon: 'fa-solid fa-fire-flame-curved', active: this.page === 'powers' },
      { id: 'log', label: 'LOG', icon: 'fa-solid fa-book-open', active: this.page === 'log' }
    ];
    context.scheme = this.scheme;
    context.schemeLabel = this.scheme === 'custom'
      ? 'CUSTOM COLOURS'
      : (SCHEMES.find(scheme => scheme.id === this.scheme)?.label ?? 'Red').toUpperCase();
    context.schemeGroups = GROUPS.map(group => ({
      label: group.label,
      schemes: SCHEMES.filter(scheme => scheme.group === group.id)
        .map(scheme => ({ ...scheme, active: scheme.id === this.scheme }))
    }));
    context.custom = { ...this.colors, active: this.scheme === 'custom' };
    context.isGM = Boolean(game.user?.isGM);
    const itemPiles = game.itempiles?.API ?? null;
    const pileData = actor.getFlag?.('item-piles', 'data') ?? actor.flags?.['item-piles']?.data;
    context.integrations = {
      midiQol: Boolean(game.modules?.get('midi-qol')?.active),
      itemPiles: Boolean(itemPiles),
      itemPileActor: Boolean(itemPiles && pileData?.enabled)
    };
    context.moduleTools = TOOLS
      .filter(tool => !tool.gm || game.user?.isGM)
      .map(tool => {
        const api = game.modules?.get(tool.module)?.api;
        return typeof api?.[tool.method] === 'function'
          ? { id: tool.id, title: tool.title, icon: tool.icon }
          : null;
      })
      .filter(Boolean);
    context.sharedJournals = sharedJournalIds()
      .map(id => game.journal?.get(id))
      .filter(entry => entry && (!entry.testUserPermission || entry.testUserPermission(game.user, 'OBSERVER')))
      .map(entry => ({ id: entry.id, name: entry.name, folder: entry.folder?.name ?? '' }))
      .sort((a, b) => a.name.localeCompare(b.name));
    context.isVehicle = isVehicle;
    context.kind = isVehicle ? 'VEHICLE' : isNPC ? 'LAIR NPC' : 'DRAGONBOUND';
    context.hasAbilities = Boolean(system.abilities) && ABILITIES.some(key => system.abilities?.[key]);
    context.vehicle = isVehicle ? {
      actions: {
        max: number(system.attributes?.actions?.max),
        remaining: Math.max(0, number(system.attributes?.actions?.max) - number(system.attributes?.actions?.spent))
      },
      crew: { max: number(system.crew?.max), value: (system.crew?.value ?? []).length },
      cargo: {
        value: number(system.attributes?.capacity?.cargo?.value),
        units: system.attributes?.capacity?.cargo?.units ?? ''
      },
      quality: number(system.attributes?.quality?.value)
    } : null;
    const currencyConfig = CONFIG.DND5E?.currencies ?? {};
    const currencyList = ['pp', 'gp', 'ep', 'sp', 'cp'].map(key => {
      const cfg = currencyConfig[key] ?? {};
      return {
        key,
        label: cfg.label ? loc(cfg.label) : key.toUpperCase(),
        abbr: cfg.abbreviation ? loc(cfg.abbreviation) : key.toUpperCase(),
        conversion: number(cfg.conversion, COIN_FALLBACK[key]) || COIN_FALLBACK[key],
        value: number(system.currency?.[key]),
        visible: cfg.visible !== false
      };
    }).filter(coin => coin.visible);
    context.currencies = currencyList;
    // Show the hoard in the most valuable coin the actor actually carries.
    const ownedCoin = currencyList.find(coin => coin.value > 0)
      ?? currencyList.find(coin => coin.key === 'gp')
      ?? currencyList[0];
    context.coinsAbbr = ownedCoin?.abbr ?? 'GP';
    context.header = {
      kind: context.kind,
      rank: isVehicle ? 'VEHICLE' : isNPC ? `CR ${number(system.details?.cr)}` : `LEVEL ${number(system.details?.level, 1)}`,
      showPB: !isNPC && !isVehicle,
      className: className || 'Unsworn',
      species: species?.name
        ?? (isVehicle ? loc(system.details?.vehicleType ?? '') || 'Vehicle' : isNPC ? loc(system.details?.type?.value ?? '') || 'NPC' : 'Unknown lineage'),
      prof: number(system.attributes?.prof, 2),
      ac: number(system.attributes?.ac?.value, 10),
      speed: number(system.attributes?.movement?.walk),
      init: signed(system.attributes?.init?.total),
      exhaustion: number(system.attributes?.exhaustion),
      inspiration: Boolean(system.attributes?.inspiration),
      coins: formatCoinAmount(coins * (ownedCoin?.conversion ?? 1)),
      coinsTitle: `Pocket money in ${ownedCoin?.label ?? 'gold'}. Container and bank funds are not included.`,
      hp: {
        value,
        max,
        temp: number(hp.temp),
        pct: Math.max(0, Math.min(100, Math.round((value / Math.max(max, 1)) * 100)))
      }
    };
    const spellRanks = groupSpellsByRank([...actor.items].filter(item => item.type === 'spell'));
    const spellCount = spellRanks.reduce((total, rank) => total + rank.count, 0);
    const allSpellRanks = this.spellRank === 'all';
    const activeSpellRank = allSpellRanks || spellRanks.some(rank => rank.level === this.spellRank)
      ? this.spellRank
      : (spellRanks[0]?.level ?? null);
    context.abilities = abilities;
    context.saves = abilities.map(ability => ({ ...ability }));
    context.skills = skills;
    context.lists = itemLists;
    context.containers = hoard.containers.map(container => ({
      ...container,
      expanded: !this.collapsed.has(`container:${container.id}`)
    }));
    context.containerCount = hoard.containers.length;
    context.storedCount = hoard.storedCount;
    context.storedWealth = hoard.storedWealth;
    context.activeSpellRank = activeSpellRank;
    context.allSpellRanksActive = allSpellRanks;
    context.showSpellRankMenu = spellRanks.length > 1;
    context.spellRanks = spellRanks.map(rank => ({
      ...rank,
      active: allSpellRanks || rank.level === activeSpellRank,
      chipLabel: rank.level === 0 ? 'C' : String(rank.level),
      tabLabel: spellRankTabLabel(rank.level, rank.label),
      expanded: !this.collapsed.has(`rank:${rank.level}`)
    }));
    context.spellCount = spellCount;
    context.featureCount = itemLists.features.length;
    context.gearCount = hoard.count;
    context.powerCount = itemLists.features.length + spellCount;
    context.load = {
      weight: Math.round(hoard.weight * 10) / 10,
      capacity,
      pct: Math.max(0, Math.min(100, Math.round((hoard.weight / Math.max(capacity, 1)) * 100)))
    };
    context.bio = system.details?.biography?.value ?? '';
    return context;
  }

  /* -------------------------------------------- */

  _onRender(context, options) {
    super._onRender(context, options);
    this._applyPage(this.element);
    applyScheme(this.element, this.scheme, this.colors);
    this.#bindItemImages();
    this.#bindColorInputs();
  }

  _applyPage(root) {
    if (!root) return;
    for (const panel of root.querySelectorAll('[data-panel]')) {
      panel.classList.toggle('is-active', panel.dataset.panel === this.page);
    }
    for (const tab of root.querySelectorAll('[data-action="page"]')) {
      tab.classList.toggle('is-active', tab.dataset.tab === this.page);
    }
  }

  #bindColorInputs() {
    for (const input of this.element?.querySelectorAll('[data-color]') ?? []) {
      input.addEventListener('input', event => {
        const slot = event.currentTarget.dataset.color;
        if (!['accent', 'accent2', 'bg'].includes(slot)) return;
        this.colors = { ...this.colors, [slot]: event.currentTarget.value };
        storeColors(this.colors);
        this.scheme = 'custom';
        storeScheme('custom');
        applyScheme(this.element, 'custom', this.colors);
      });
    }
  }

  /** A broken or white icon falls back to colour type art, then to an inline glyph. */
  #bindItemImages() {
    for (const img of this.element?.querySelectorAll('img.armory-item-img') ?? []) {
      if (img.dataset.fallbackBound) continue;
      img.dataset.fallbackBound = 'true';
      const swap = () => {
        if (img.dataset.fallback === 'glyph') return;
        img.dataset.fallback = img.dataset.fallback === 'type' ? 'glyph' : 'type';
        img.src = img.dataset.fallback === 'type'
          ? iconFor({ type: img.dataset.type, id: img.dataset.itemId ?? img.src })
          : GLYPH_FALLBACK;
      };
      img.addEventListener('error', swap);
      if (img.complete && img.naturalWidth === 0) swap();
    }
  }

  /* -------------------------------------------- */
  /*  Actions                                      */
  /* -------------------------------------------- */

  static #onTab(event, target) {
    event.preventDefault();
    this.page = target.dataset.tab ?? 'core';
    this._applyPage(this.element);
  }

  static async #onRollAbility(event, target) {
    const ability = target.dataset.ability;
    try {
      if (typeof this.actor.rollAbilityCheck === 'function') return await this.actor.rollAbilityCheck({ ability, event });
      if (typeof this.actor.rollAbility === 'function') return await this.actor.rollAbility(ability, { event });
    } catch (err) {
      console.warn('[crimson-fantasy-armory] ability roll fell back', err);
    }
    return fallbackRoll(this.actor, `abilities.${ability}.mod`, `${abilityLabel(ability)} check`);
  }

  static async #onRollSave(event, target) {
    const ability = target.dataset.ability;
    try {
      if (typeof this.actor.rollSave === 'function') return await this.actor.rollSave({ ability, event });
    } catch (err) {
      console.warn('[crimson-fantasy-armory] save roll fell back', err);
    }
    return fallbackRoll(this.actor, `abilities.${ability}.save.value`, `${abilityLabel(ability)} save`);
  }

  static async #onRollSkill(event, target) {
    const skill = target.dataset.skill;
    try {
      if (typeof this.actor.rollSkill === 'function') return await this.actor.rollSkill({ skill, event });
    } catch (err) {
      console.warn('[crimson-fantasy-armory] skill roll fell back', err);
    }
    return fallbackRoll(this.actor, `skills.${skill}.total`, skillLabel(skill));
  }

  static async #onCycleSkill(event, target) {
    if (!this.isEditable) return;
    const id = target.dataset.skill;
    const current = number(this.actor.system.skills?.[id]?.proficient);
    const next = current >= 2 ? 0 : current + 1;
    await this.actor.update({ [`system.skills.${id}.value`]: next });
  }

  static async #onUseItem(event, target) {
    const item = this.actor.items.get(target.dataset.itemId);
    if (!item) return;
    try {
      if (typeof item.use === 'function') return await item.use({ event });
      if (typeof item.roll === 'function') return await item.roll();
    } catch (err) {
      console.warn('[crimson-fantasy-armory] item use failed', err);
      ui.notifications.warn(`${item.name} could not be used automatically.`);
    }
  }

  static async #onToggleEquip(event, target) {
    if (!this.isEditable) return;
    const item = this.actor.items.get(target.dataset.itemId);
    if (!item) return;
    await item.update({ 'system.equipped': !item.system?.equipped });
  }

  static #onToggleCollapse(event, target) {
    event.preventDefault();
    const key = target.dataset.collapseKey;
    const card = target.closest('.armory-container, .armory-spell-rank');
    if (!key || !card) return;
    const collapsed = card.classList.toggle('is-collapsed');
    if (collapsed) this.collapsed.add(key);
    else this.collapsed.delete(key);
    target.setAttribute('aria-expanded', String(!collapsed));
  }

  static #onSelectSpellRank(event, target) {
    event.preventDefault();
    const selection = target.dataset.rank === 'all' ? 'all' : Number(target.dataset.rank);
    if (selection !== 'all' && !Number.isFinite(selection)) return;
    this.spellRank = selection;
    const panel = target.closest('.armory-panel--spells') ?? this.element;
    for (const tab of panel?.querySelectorAll('[data-action="selectSpellRank"]') ?? []) {
      const active = selection === 'all'
        ? tab.dataset.rank === 'all'
        : Number(tab.dataset.rank) === selection;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-selected', String(active));
    }
    for (const section of panel?.querySelectorAll('.armory-spell-rank') ?? []) {
      const active = selection === 'all' || Number(section.dataset.rank) === selection;
      section.hidden = !active;
      section.classList.toggle('is-rank-hidden', !active);
      if (!active || selection === 'all') continue;
      // Opening a rank from the menu should reveal its spells immediately.
      section.classList.remove('is-collapsed');
      this.collapsed.delete(`rank:${selection}`);
      section.querySelector('.armory-spell-rank-toggle')?.setAttribute('aria-expanded', 'true');
    }
  }

  static async #onToggleInspiration(event) {
    event.preventDefault();
    if (!this.isEditable) return;
    const current = Boolean(this.actor.system?.attributes?.inspiration);
    await this.actor.update({ 'system.attributes.inspiration': !current });
    this.render?.();
  }

  static #onEditItem(event, target) {
    const item = this.actor.items.get(target.dataset.itemId);
    item?.sheet.render(true);
  }

  static async #onDeleteItem(event, target) {
    if (!this.isEditable) return;
    const item = this.actor.items.get(target.dataset.itemId);
    if (!item) return;
    const confirmed = await foundry.applications.api.DialogV2.confirm({
      window: { title: 'Remove from hoard' },
      content: `<p>Remove <strong>${foundry.utils.escapeHTML(item.name)}</strong> from ${foundry.utils.escapeHTML(this.actor.name)}?</p>`
    });
    if (confirmed) await item.delete();
  }

  static async #onRest(event, target) {
    const type = target.dataset.type ?? 'long';
    const method = type === 'short' ? this.actor.shortRest : this.actor.longRest;
    if (typeof method !== 'function') {
      ui.notifications.warn('This actor cannot rest.');
      return;
    }
    try {
      return await method.call(this.actor, {});
    } catch (err) {
      console.warn('[crimson-fantasy-armory] rest failed', err);
      ui.notifications.warn('The rest could not be completed.');
    }
  }

  static async #onRollInitiative() {
    try {
      if (typeof this.actor.rollInitiative === 'function') return await this.actor.rollInitiative();
    } catch (err) {
      console.warn('[crimson-fantasy-armory] initiative failed', err);
    }
  }

  static async #onOpenPile(event) {
    event?.preventDefault?.();
    const api = game.itempiles?.API;
    if (!api) return;
    try {
      if (typeof api.openItemPile === 'function') return await api.openItemPile(this.actor, false);
      if (typeof api.renderItemPileInterface === 'function') return api.renderItemPileInterface(this.actor);
    } catch (err) {
      console.warn('[crimson-fantasy-armory] Item Piles could not open this actor', err);
      ui.notifications.warn('Item Piles could not open this actor.');
    }
  }

  static #onToggleShare(event, target) {
    event.preventDefault();
    const panel = this.element?.querySelector('[data-share-panel]');
    if (!panel) return;
    const open = panel.classList.toggle('is-open');
    target.classList.toggle('is-active', open);
    this.element?.querySelector('[data-share-panel]')?.classList.remove('is-open');
    this.element?.querySelector('[data-action="toggleShare"]')?.classList.remove('is-active');
    this.element?.querySelector('[data-scheme-panel]')?.classList.remove('is-open');
    this.element?.querySelector('[data-action="toggleScheme"]')?.classList.remove('is-active');
  }

  static #onOpenJournal(event, target) {
    event.preventDefault();
    const entry = game.journal?.get(target.dataset.journalId);
    this.element?.querySelector('[data-share-panel]')?.classList.remove('is-open');
    this.element?.querySelector('[data-action="toggleShare"]')?.classList.remove('is-active');
    if (!entry) {
      ui.notifications.warn('That handout is no longer available.');
      return;
    }
    return entry.sheet.render(true);
  }

  static async #onUseTool(event, target) {
    event.preventDefault();
    this.element?.querySelector('[data-share-panel]')?.classList.remove('is-open');
    this.element?.querySelector('[data-action="toggleShare"]')?.classList.remove('is-active');
    const tool = TOOLS.find(entry => entry.id === target.dataset.toolId);
    if (!tool) return;
    const api = game.modules?.get(tool.module)?.api;
    if (typeof api?.[tool.method] !== 'function') {
      ui.notifications.warn(`${tool.title} is not available right now.`);
      return;
    }
    try {
      return await api[tool.method]();
    } catch (err) {
      console.error('[crimson-fantasy-armory] tool failed', err);
      ui.notifications.error(err.message || `${tool.title} could not be opened.`);
    }
  }

  static async #onChooseShare(event) {
    event.preventDefault();
    if (!game.user?.isGM) return;
    const selected = new Set(sharedJournalIds());
    const entries = [...(game.journal?.contents ?? [])].sort((a, b) => a.name.localeCompare(b.name));
    const rows = entries.map(entry => {
      const folder = entry.folder?.name ?? '';
      return `<label class="crimson-handout-row">
        <input type="checkbox" name="crimson-handout" value="${entry.id}"${selected.has(entry.id) ? ' checked' : ''}>
        <span class="crimson-handout-name">${foundry.utils.escapeHTML(entry.name)}</span>
        ${folder ? `<small class="crimson-handout-folder">${foundry.utils.escapeHTML(folder)}</small>` : ''}
      </label>`;
    }).join('');

    new foundry.applications.api.DialogV2({
      window: { title: 'Crimson handouts' },
      classes: ['crimson-handout-picker'],
      modal: true,
      content: `<p class="crimson-handout-hint">Pick the journals the CRIMSON button offers. Players only see the ones they have permission to open.</p>
        <div class="crimson-handout-list">${rows || '<p>No journal entries in this world.</p>'}</div>`,
      buttons: [
        {
          label: 'Save',
          action: 'save',
          default: true,
          callback: async (clickEvent, button, dialog) => {
            const ids = [...(dialog.element?.querySelectorAll('input[name="crimson-handout"]:checked') ?? [])]
              .map(input => input.value);
            if (await storeSharedJournalIds(ids)) this.render();
          }
        },
        { label: 'Cancel', action: 'cancel' }
      ]
    }).render(true);
  }

  static #onToggleScheme(event, target) {
    event.preventDefault();
    const panel = this.element?.querySelector('[data-scheme-panel]');
    if (!panel) return;
    const open = panel.classList.toggle('is-open');
    target.classList.toggle('is-active', open);
  }

  static #onSetScheme(event, target) {
    event.preventDefault();
    const id = target.dataset.scheme;
    if (id !== 'custom' && !SCHEMES.some(scheme => scheme.id === id)) return;
    this.scheme = id;
    storeScheme(id);
    applyScheme(this.element, id, this.colors);
    const label = this.element?.querySelector('.armory-foot-status');
    if (label) {
      label.innerHTML = `<i class="fa-solid fa-dragon" aria-hidden="true"></i> ${
        id === 'custom' ? 'CUSTOM COLOURS' : (SCHEMES.find(scheme => scheme.id === id)?.label ?? 'Red').toUpperCase()
      }`;
    }
    this.element?.querySelector('[data-scheme-panel]')?.classList.remove('is-open');
    this.element?.querySelector('[data-action="toggleScheme"]')?.classList.remove('is-active');
  }

  static async #onRepairArt(event) {
    event.preventDefault();
    if (!game.user?.isGM) return;
    await repairArt();
  }
}

/* --------------------------------------------------------------- registration */

const SIBLING_ID = 'crimson-galaxy-armory';

function siblingActive() { return Boolean(game.modules?.get(SIBLING_ID)?.active); }

const SHEET_ID = `${ID}.${CrimsonArmorySheet.name}`;
const SHEET_TYPES = ['character', 'npc', 'vehicle'];
const SCRIPT_VERSION = '2026-11-12.3';

function registerSheet() {
  const DocumentSheetConfig = foundry.applications?.apps?.DocumentSheetConfig;
  const ActorClass = CONFIG.Actor?.documentClass;
  if (!DocumentSheetConfig || !ActorClass) {
    console.error('[crimson-fantasy-armory] sheet registration unavailable; keeping the system sheet.');
    return false;
  }
  try {
    DocumentSheetConfig.registerSheet(ActorClass, ID, CrimsonArmorySheet, {
      types: SHEET_TYPES,
      makeDefault: !siblingActive(),
      label: 'Crimson Fantasy Armory'
    });
    return true;
  } catch (err) {
    console.error('[crimson-fantasy-armory] could not register the armory sheet', err);
    return false;
  }
}

function tryRegister() {
  if (CONFIG.Actor?.sheetClasses?.character?.[SHEET_ID]) return true;
  return registerSheet();
}

/** A saved `core.sheetClasses` setting outranks `makeDefault`, so claim the default slot. */
function forceDefaultSheet() {
  if (siblingActive()) return false;
  let claimed = false;
  for (const type of SHEET_TYPES) {
    const classes = CONFIG.Actor?.sheetClasses?.[type];
    if (!classes?.[SHEET_ID]) continue;
    for (const config of Object.values(classes)) config.default = config.id === SHEET_ID;
    claimed = true;
  }
  if (!claimed) return false;
  for (const actor of game.actors ?? []) {
    if (SHEET_TYPES.includes(actor.type)) actor._sheet = null;
  }
  return true;
}

function openArmory(actor = null) {
  const target = actor
    ?? game.user?.character
    ?? canvas?.tokens?.controlled?.[0]?.actor
    ?? game.actors.find(candidate => candidate.type === 'character' && candidate.isOwner);
  if (!target) {
    ui.notifications.warn('No character armory is available for this user.');
    return null;
  }
  return target.sheet.render(true);
}

/** Replace flat white core line art with colour art, and fill in blank images. */
async function repairArt() {
  const worldUpdates = [];
  const actorUpdates = new Map();

  const consider = (item, collection) => {
    if (item.img && !BLAND_ART.test(item.img)) return;
    const replacement = iconFor(item);
    if (replacement === item.img) return;
    collection.push({ _id: item.id, img: replacement });
  };

  for (const item of game.items) consider(item, worldUpdates);
  for (const actor of game.actors) {
    const updates = [];
    for (const item of actor.items) consider(item, updates);
    if (updates.length) actorUpdates.set(actor, updates);
  }

  let changed = 0;
  if (worldUpdates.length) {
    await Item.updateDocuments(worldUpdates);
    changed += worldUpdates.length;
  }
  for (const [actor, updates] of actorUpdates) {
    await actor.updateEmbeddedDocuments('Item', updates);
    changed += updates.length;
  }

  ui.notifications.info(changed ? `Recoloured ${changed} item icon(s).` : 'Every item already has colour art.');
  return changed;
}

function diagnose() {
  const entry = Object.values(CONFIG.Actor?.sheetClasses?.character ?? {}).find(config => config.id === SHEET_ID);
  return {
    script: SCRIPT_VERSION,
    user: game.user?.name ?? null,
    isGM: Boolean(game.user?.isGM),
    sheetId: SHEET_ID,
    registered: Boolean(entry),
    isDefault: Boolean(entry?.default),
    scheme: readScheme(),
    custom: readColors()
  };
}

Hooks.once('init', () => {
  try {
    game.settings.register(SHARE_NAMESPACE, SHARE_SETTING, {
      name: 'Crimson handouts',
      hint: 'Journal entries offered by the CRIMSON button on the Crimson Fantasy Armory sheet.',
      scope: 'world',
      config: false,
      type: Array,
      default: []
    });
  } catch (err) {
    console.warn('[crimson-fantasy-armory] handout setting unavailable', err);
  }
});

Hooks.on('updateSetting', setting => {
  if (setting?.key !== `${SHARE_NAMESPACE}.${SHARE_SETTING}`) return;
  for (const app of foundry.applications.instances?.values?.() ?? []) {
    if (app instanceof CrimsonArmorySheet) app.render();
  }
});

tryRegister();
Hooks.once('init', tryRegister);

const PACK_ID = 'dragon-armory-pack';
const PACK_POSITION_KEY = 'dragon-armory-pack-position';

function openFloatingArmory() {
  const actor = game.user?.character
    ?? canvas?.tokens?.controlled?.[0]?.actor
    ?? game.actors?.find(candidate => candidate.type === 'character' && candidate.isOwner);
  if (!actor) {
    ui?.notifications?.warn('No character sheet is available for your user.');
    return null;
  }
  if (!actor.sheet) {
    ui?.notifications?.warn(`${actor.name} does not have a character sheet.`);
    return null;
  }
  return actor.sheet.render(true);
}

const PACK_SIZE = 54;
const PACK_MARGIN = 8;

function clampPackPosition(left, top) {
  const maxLeft = Math.max(PACK_MARGIN, window.innerWidth - PACK_SIZE - PACK_MARGIN);
  const maxTop = Math.max(PACK_MARGIN, window.innerHeight - PACK_SIZE - PACK_MARGIN);
  return {
    left: Math.max(PACK_MARGIN, Math.min(Number(left) || 0, maxLeft)),
    top: Math.max(PACK_MARGIN, Math.min(Number(top) || 0, maxTop))
  };
}

function placePack(button, left, top) {
  const position = clampPackPosition(left, top);
  button.style.left = `${position.left}px`;
  button.style.top = `${position.top}px`;
  return position;
}

function savedPackPosition() {
  const fallback = {
    left: window.innerWidth - PACK_SIZE - 24,
    top: window.innerHeight - PACK_SIZE - 24
  };
  try {
    const stored = JSON.parse(localStorage.getItem(PACK_POSITION_KEY) ?? 'null');
    return clampPackPosition(stored?.left ?? fallback.left, stored?.top ?? fallback.top);
  } catch (err) {
    console.warn('[dragon-armory] pack position unavailable', err);
    return clampPackPosition(fallback.left, fallback.top);
  }
}

function installFloatingPack() {
  if (document.getElementById(PACK_ID)) return null;
  const button = document.createElement('button');
  button.id = PACK_ID;
  button.type = 'button';
  button.className = 'dragon-armory-pack';
  button.title = 'Open character sheet';
  button.setAttribute('aria-label', 'Open character sheet');
  button.setAttribute('aria-haspopup', 'dialog');
  button.setAttribute('data-action', 'openArmory');
  button.setAttribute('data-tooltip', 'Open character sheet');
  const colors = readColors();
  button.style.setProperty('--dr-pack-accent', colors.accent);
  button.style.setProperty('--dr-pack-accent-2', colors.accent2);
  button.innerHTML = `
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M8.2 7.2V5.8a3.8 3.8 0 0 1 7.6 0v1.4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
      <path d="M5.2 8.4h13.6a1.8 1.8 0 0 1 1.8 1.8v7.2a2.4 2.4 0 0 1-2.4 2.4H5.8a2.4 2.4 0 0 1-2.4-2.4v-7.2a1.8 1.8 0 0 1 1.8-1.8Z" fill="none" stroke="currentColor" stroke-width="1.6"/>
      <path d="M7.5 8.4h9v4.1h-9z" fill="currentColor" opacity=".3"/>
      <path d="M7.5 15.1h9" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
      <path d="M9.4 5.2h5.2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
    </svg>`;
  document.body.append(button);
  const start = savedPackPosition();
  let position = placePack(button, start.left, start.top);
  let drag = null;
  let suppressClick = false;

  const rememberPosition = () => {
    try {
      localStorage.setItem(PACK_POSITION_KEY, JSON.stringify(position));
    } catch (err) {
      console.warn('[dragon-armory] pack position could not be saved', err);
    }
  };

  const startMove = event => {
    if (event.button !== 0 || drag) return;
    const handle = event.target.closest('[data-action="openArmory"]');
    if (!handle) return;
    event.stopPropagation();
    try { handle.setPointerCapture(event.pointerId); } catch (err) { /* ignore */ }
    suppressClick = false;
    drag = {
      x: event.clientX,
      y: event.clientY,
      left: position.left,
      top: position.top,
      handle,
      pointerId: event.pointerId,
      moved: false
    };
  };

  const move = event => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (!drag.moved && Math.hypot(dx, dy) < 5) return;
    drag.moved = true;
    button.classList.add('is-dragging');
    position = placePack(button, drag.left + dx, drag.top + dy);
  };

  const endMove = (event, cancelled = false) => {
    if (!drag || event.pointerId !== drag.pointerId) return false;
    const current = drag;
    drag = null;
    suppressClick = current.moved || cancelled;
    try {
      if (current.handle.hasPointerCapture(current.pointerId)) {
        current.handle.releasePointerCapture(current.pointerId);
      }
    } catch (err) { /* ignore */ }
    button.classList.remove('is-dragging');
    if (current.moved) rememberPosition();
    return true;
  };

  button.addEventListener('pointerdown', startMove);
  button.addEventListener('pointermove', move);
  button.addEventListener('pointerup', event => endMove(event));
  button.addEventListener('pointercancel', event => endMove(event, true));
  button.addEventListener('lostpointercapture', event => {
    if (drag) endMove(event, true);
  });
  button.addEventListener('click', event => {
    event.preventDefault();
    event.stopPropagation();
    if (suppressClick) {
      suppressClick = false;
      if (event.detail !== 0) return;
    }
    openFloatingArmory();
  });
  window.addEventListener('resize', () => {
    if (drag) return;
    position = placePack(button, position.left, position.top);
  });

  return button;
}

Hooks.once('ready', async () => {
  tryRegister();
  forceDefaultSheet();
  installFloatingPack();

  game.crimsonFantasyArmory = {
    open: openArmory,
    sheet: CrimsonArmorySheet,
    registerSheet,
    repairArt,
    diagnose,
    get scheme() { return readScheme(); },
    get colors() { return readColors(); },
    setScheme(id, colors = null) {
      if (id !== 'custom' && !SCHEMES.some(scheme => scheme.id === id)) return false;
      storeScheme(id);
      if (colors) storeColors({ ...readColors(), ...colors });
      for (const app of foundry.applications.instances?.values?.() ?? []) {
        if (app instanceof CrimsonArmorySheet) {
          app.scheme = id;
          app.colors = readColors();
          app.render();
        }
      }
      return true;
    }
  };

  const module = game.modules.get(ID);
  if (module) module.api = { open: openArmory, sheet: CrimsonArmorySheet, registerSheet, repairArt, diagnose };

  console.info(`[crimson-fantasy-armory] script ${SCRIPT_VERSION} ready`, diagnose());
});
