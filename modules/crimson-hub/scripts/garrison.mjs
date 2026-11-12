// Crimson Garrison: a shared readiness ledger for an abandoned fort.
// The journal is the source of truth. The GM owns the automatic long-rest
// tick; manual turns can be taken by any owner of the ledger.

import {
  advanceDay,
  alertState,
  makeDefaultGarrison,
  projectStatus,
  readinessList,
  resupply,
  sectorState,
  toggleProject,
  TRACKS
} from './garrison-data.mjs';

const MODULE_ID = 'crimson-hub';
const FLAG_SCOPE = MODULE_ID;
const FLAG_KEY = 'garrison';
const APP_ID = 'crimson-garrison';
const JOURNAL_NAME = 'The Old Watch';
const REST_DEBOUNCE = 1200;

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'sectors', label: 'Sectors' },
  { id: 'projects', label: 'Projects' },
  { id: 'roster', label: 'Roster' },
  { id: 'stores', label: 'Stores' }
];

const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}[character]));

const number = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function garrisonJournal() {
  return game.journal.find((journal) => journal.getFlag(FLAG_SCOPE, FLAG_KEY)?.isGarrison === true) ?? null;
}

function readState(journal = garrisonJournal()) {
  const data = journal?.getFlag(FLAG_SCOPE, FLAG_KEY);
  if (!data?.isGarrison) return null;
  const base = makeDefaultGarrison();
  const state = { ...base, ...data };
  state.readiness = { ...base.readiness, ...(data.readiness ?? {}) };
  state.sectors = Array.isArray(data.sectors) ? data.sectors : base.sectors;
  state.projects = Array.isArray(data.projects) ? data.projects : base.projects;
  state.roster = Array.isArray(data.roster) ? data.roster : base.roster;
  state.stores = Array.isArray(data.stores) ? data.stores : base.stores;
  state.log = Array.isArray(data.log) ? data.log : base.log;
  return state;
}

async function writeState(state, journal = garrisonJournal()) {
  if (!journal) throw new Error('The garrison ledger does not exist yet.');
  await journal.setFlag(FLAG_SCOPE, FLAG_KEY, { isGarrison: true, ...state });
  return journal;
}

let ensurePromise = null;

async function ensureGarrison() {
  if (!game.user.isGM) return garrisonJournal();
  const existing = garrisonJournal();
  if (existing) return existing;
  ensurePromise ??= JournalEntry.create({
    name: JOURNAL_NAME,
    ownership: { default: 3 },
    flags: {
      [FLAG_SCOPE]: {
        [FLAG_KEY]: { isGarrison: true, ...makeDefaultGarrison() }
      }
    }
  }).finally(() => { ensurePromise = null; });
  return ensurePromise;
}

function canEdit(journal = garrisonJournal()) {
  if (game.user.isGM) return true;
  return Boolean(journal?.testUserPermission?.(game.user, 'OWNER'));
}

function isPrimaryGM() {
  if (!game.user.isGM) return false;
  const activeGM = game.users?.activeGM;
  return !activeGM || activeGM.id === game.user.id;
}

function projectContext(state) {
  return state.projects.map((project) => {
    const meta = projectStatus(project);
    const segments = Math.max(1, number(project.segments, 1));
    const filled = Math.max(0, Math.min(segments, number(project.filled, 0)));
    const track = TRACKS.find((entry) => entry.id === project.track);
    return {
      ...project,
      filled,
      segments,
      pct: Math.round((filled / segments) * 100),
      statusLabel: meta.label,
      statusClass: meta.className,
      trackLabel: track?.label ?? 'Readiness',
      isActive: project.status === 'active',
      isAvailable: project.status !== 'active' && project.status !== 'complete',
      isComplete: project.status === 'complete',
      canToggle: project.status !== 'complete',
      costLabel: `${number(project.cost)} gp`,
      checkLabel: project.check || 'No check'
    };
  });
}

function sectorContext(state, projects) {
  const byId = new Map(projects.map((project) => [project.id, project]));
  return state.sectors.map((sector) => {
    const meta = sectorState(sector.state);
    return {
      ...sector,
      stateLabel: meta.label,
      stateClass: meta.className,
      projectName: byId.get(sector.projectId)?.name ?? 'No active project'
    };
  });
}

function readinessContext(state) {
  return readinessList(state).map((track) => ({
    ...track,
    className: track.value >= 4 ? 'is-ready' : track.value >= 2 ? 'is-partial' : 'is-critical'
  }));
}

function rosterContext(state) {
  return state.roster.map((person) => ({
    ...person,
    payLabel: `${number(person.pay)} gp/day`,
    moralePips: Array.from({ length: 5 }, (_, index) => ({ filled: index < number(person.morale) }))
  }));
}

function storeContext(state) {
  return state.stores.map((store) => {
    const max = Math.max(1, number(store.max, 1));
    const value = Math.max(0, Math.min(max, number(store.value, 0)));
    return {
      ...store,
      value,
      max,
      pct: Math.round((value / max) * 100)
    };
  });
}

function logContext(state) {
  return (state.log ?? []).slice(0, 12).map((entry) => ({
    ...entry,
    dayLabel: `DAY ${number(entry.day, 1)}`,
    kindClass: `is-${entry.kind ?? 'note'}`
  }));
}

function chatCard(state, summary, source) {
  const completed = summary.completed?.length
    ? `<p class="cg-chat-line"><strong>Completed:</strong> ${summary.completed.map(esc).join(', ')}</p>`
    : '';
  const event = summary.event
    ? `<div class="cg-chat-event"><strong>${esc(summary.event.title)}</strong><span>${esc(summary.event.text)}</span></div>`
    : '';
  const payroll = summary.payrollPaid
    ? `<p class="cg-chat-line"><strong>Payroll:</strong> ${esc(state.payroll)} gp paid.</p>`
    : summary.payrollFailed
      ? '<p class="cg-chat-line cg-chat-warning"><strong>Payroll short.</strong> Garrison confidence falls.</p>'
      : '';
  const alertLabel = alertState(state.alert).label.toUpperCase();
  return `<div class="cg-chat-card">
    <header class="cg-chat-head">
      <span class="cg-chat-kicker">CRIMSON GARRISON <span>//</span> ${esc(source)}</span>
      <h2>Day ${esc(summary.toDay)}</h2>
    </header>
    <div class="cg-chat-body">
      <p class="cg-chat-lede"><strong>${esc(state.name)}</strong> — supplies ${esc(summary.supplyAfter)}/${esc(state.supplyMax)}, treasury ${esc(summary.treasuryAfter)} gp.</p>
      ${completed}
      ${event}
      ${payroll}
    </div>
    <footer class="cg-chat-foot"><span>${esc(alertLabel)} ALERT</span><span>DAY ${esc(state.day)}</span></footer>
  </div>`;
}

async function postDayChat(state, summary, source) {
  return ChatMessage.create({
    speaker: { alias: state.name },
    content: chatCard(state, summary, source),
    flags: { [MODULE_ID]: { garrisonDay: state.day } }
  });
}

class GarrisonApp extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: APP_ID,
    classes: ['crimson-garrison'],
    position: { width: 1040, height: 780 },
    window: { title: 'Crimson Garrison', resizable: true },
    actions: {
      selectTab: GarrisonApp.#onTab,
      advanceDay: GarrisonApp.#onAdvanceDay,
      toggleAuto: GarrisonApp.#onToggleAuto,
      toggleProject: GarrisonApp.#onToggleProject,
      resupply: GarrisonApp.#onResupply
    }
  };

  static PARTS = {
    body: { template: `modules/${MODULE_ID}/templates/garrison.hbs` }
  };

  tab = 'overview';

  async _prepareContext() {
    const journal = garrisonJournal();
    const state = readState(journal) ?? makeDefaultGarrison();
    const projects = projectContext(state);
    const activeProjects = projects.filter((project) => project.isActive);
    const alert = alertState(state.alert);
    const canManage = canEdit(journal);
    const supplyPct = Math.round((number(state.supplies) / Math.max(1, number(state.supplyMax, 1))) * 100);

    return {
      isGM: game.user.isGM,
      canManage,
      journalMissing: !journal,
      state,
      name: state.name,
      subtitle: state.subtitle,
      day: state.day,
      alertLabel: alert.label,
      alertClass: alert.className,
      autoOn: Boolean(state.autoAdvanceOnLongRest),
      autoLabel: state.autoAdvanceOnLongRest ? 'Auto after long rest' : 'Manual advance',
      supplies: number(state.supplies),
      supplyMax: number(state.supplyMax, 30),
      supplyPct,
      treasury: number(state.treasury),
      payroll: number(state.payroll),
      readiness: readinessContext(state),
      sectors: sectorContext(state, projects),
      projects,
      activeProjects,
      roster: rosterContext(state),
      stores: storeContext(state),
      logs: logContext(state),
      tabs: TABS.map((tab) => ({ ...tab, active: this.tab === tab.id })),
      isOverview: this.tab === 'overview',
      isSectors: this.tab === 'sectors',
      isProjects: this.tab === 'projects',
      isRoster: this.tab === 'roster',
      isStores: this.tab === 'stores'
    };
  }

  static async #onTab(_event, target) {
    this.tab = target.dataset.tab ?? 'overview';
    await this.render();
  }

  static async #onAdvanceDay() {
    const journal = garrisonJournal() ?? await ensureGarrison();
    if (!journal || !canEdit(journal)) {
      ui.notifications.warn('Only a user with owner permission can advance the garrison ledger.');
      return;
    }
    const state = readState(journal);
    if (!state) {
      ui.notifications.warn('The garrison ledger is missing its state.');
      return;
    }
    try {
      const { state: next, summary } = advanceDay(state, { source: 'Command' });
      await writeState(next, journal);
      await postDayChat(next, summary, 'Command');
      ui.notifications.info(`${next.name}: day ${next.day}.`);
      await this.render();
    } catch (error) {
      console.error('Crimson Garrison: could not advance the day.', error);
      ui.notifications.error('The garrison ledger could not be updated.');
    }
  }

  static async #onToggleAuto() {
    const journal = garrisonJournal() ?? await ensureGarrison();
    if (!journal || !canEdit(journal)) {
      ui.notifications.warn('Only a user with owner permission can change the garrison ledger.');
      return;
    }
    const state = readState(journal);
    if (!state) return;
    state.autoAdvanceOnLongRest = !state.autoAdvanceOnLongRest;
    try {
      await writeState(state, journal);
      ui.notifications.info(state.autoAdvanceOnLongRest
        ? 'The garrison will advance one day after each long rest.'
        : 'Automatic long-rest advance is off.');
      await this.render();
    } catch (error) {
      console.error('Crimson Garrison: could not change the resting rule.', error);
      ui.notifications.error('The resting rule could not be changed.');
    }
  }

  static async #onToggleProject(_event, target) {
    const journal = garrisonJournal() ?? await ensureGarrison();
    if (!journal || !canEdit(journal)) {
      ui.notifications.warn('Only a user with owner permission can change projects.');
      return;
    }
    const state = readState(journal);
    if (!state) return;
    const result = toggleProject(state, target.dataset.projectId);
    if (!result.ok) {
      ui.notifications.warn(result.reason);
      return;
    }
    try {
      await writeState(result.state, journal);
      await this.render();
    } catch (error) {
      console.error('Crimson Garrison: could not change the project.', error);
      ui.notifications.error('The project could not be changed.');
    }
  }

  static async #onResupply() {
    const journal = garrisonJournal() ?? await ensureGarrison();
    if (!journal || !canEdit(journal)) {
      ui.notifications.warn('Only a user with owner permission can resupply the garrison.');
      return;
    }
    const state = readState(journal);
    if (!state) return;
    const result = resupply(state);
    if (!result.ok) {
      ui.notifications.warn(result.reason);
      return;
    }
    try {
      await writeState(result.state, journal);
      await this.render();
    } catch (error) {
      console.error('Crimson Garrison: could not resupply.', error);
      ui.notifications.error('The resupply could not be recorded.');
    }
  }
}

let restTimer = null;
let restAdvanceInFlight = false;

function clearRestTimer() {
  if (restTimer !== null) {
    clearTimeout(restTimer);
    restTimer = null;
  }
}

async function advanceFromLongRest(sourceName) {
  if (!isPrimaryGM() || restAdvanceInFlight) return;
  const journal = garrisonJournal();
  if (!journal) return;
  const state = readState(journal);
  if (!state?.autoAdvanceOnLongRest) return;
  restAdvanceInFlight = true;
  try {
    const { state: next, summary } = advanceDay(state, { source: `Long rest — ${sourceName}` });
    await writeState(next, journal);
    await postDayChat(next, summary, `Long rest — ${sourceName}`);
  } catch (error) {
    console.error('Crimson Garrison: could not advance after a long rest.', error);
  } finally {
    restAdvanceInFlight = false;
  }
}

function scheduleRestAdvance(sourceName) {
  if (!isPrimaryGM()) return;
  clearRestTimer();
  restTimer = setTimeout(() => {
    restTimer = null;
    advanceFromLongRest(sourceName);
  }, REST_DEBOUNCE);
}

function onRestCompleted(actor, result) {
  if (!isPrimaryGM() || !result?.longRest) return;
  scheduleRestAdvance(actor?.name ?? 'the company');
}

function onGroupRestCompleted(group, results) {
  if (!isPrimaryGM()) return;
  const list = results instanceof Map ? [...results.values()] : Array.isArray(results) ? results : [];
  if (!list.some((result) => result?.longRest)) return;
  clearRestTimer();
  advanceFromLongRest(group?.name ?? 'the company');
}

let initialized = false;
let app = null;

export function init() {
  if (initialized) return;
  initialized = true;

  if (game.user.isGM) {
    ensureGarrison().catch((error) => {
      console.error('Crimson Garrison: could not create the ledger.', error);
    });
  }

  Hooks.on('dnd5e.restCompleted', onRestCompleted);
  Hooks.on('dnd5e.groupRestCompleted', onGroupRestCompleted);
  Hooks.on('updateJournalEntry', (journal) => {
    if (journal.id === garrisonJournal()?.id && app?.rendered) app.render();
  });
  Hooks.on('createJournalEntry', (journal) => {
    if (journal.getFlag(FLAG_SCOPE, FLAG_KEY)?.isGarrison && app?.rendered) app.render();
  });
}

export async function open() {
  init();
  if (game.user.isGM) {
    await ensureGarrison().catch((error) => {
      console.error('Crimson Garrison: could not create the ledger.', error);
    });
  }
  app ??= new GarrisonApp();
  app.render(true);
  return app;
}

export const __test = {
  chatCard,
  readState,
  sectorContext,
  projectContext,
  readinessContext,
  rosterContext,
  storeContext,
  logContext,
  advanceFromLongRest,
  clearRestTimer
};
