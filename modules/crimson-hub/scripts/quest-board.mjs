// Crimson Quest Board: a fantasy contract board for Crimson Core.
// Board data lives in one player-readable journal. Only the GM writes it.
// Player claims are relayed to the GM over the module socket so players never
// need update permission on the journal.

const MODULE_ID = 'crimson-hub';
const FLAG_SCOPE = 'crimson-hub';
const FLAG_KEY = 'questBoard';
const APP_ID = 'crimson-quest-board';
const BOARD_NAME = 'The Crimson Board';
const SOCKET = `module.${MODULE_ID}`;
const SOCKET_CLAIM = 'crimson-quest-claim';
const SOCKET_RELEASE = 'crimson-quest-release';

const TYPES = [
  'Hunt',
  'Investigation',
  'Escort',
  'Exploration',
  'Salvage',
  'Faction',
  'Personal',
  'Other'
];

const STATUSES = {
  open: { label: 'Open', seal: 'OPEN', className: 'is-open' },
  claimed: { label: 'Bound', seal: 'BOUND', className: 'is-claimed' },
  completed: { label: 'Fulfilled', seal: 'SEALED', className: 'is-completed' },
  failed: { label: 'Forfeit', seal: 'VOID', className: 'is-failed' }
};

const TYPE_ICONS = {
  Hunt: 'fa-solid fa-crosshairs',
  Investigation: 'fa-solid fa-magnifying-glass',
  Escort: 'fa-solid fa-shield-halved',
  Exploration: 'fa-solid fa-compass',
  Salvage: 'fa-solid fa-anchor',
  Faction: 'fa-solid fa-flag',
  Personal: 'fa-solid fa-feather-pointed',
  Other: 'fa-solid fa-scroll'
};

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

const text = (value, max = 2000) => String(value ?? '').trim().slice(0, max);
const number = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};
const money = (value) => number(value).toLocaleString('en-US');
const dateLabel = (value) => {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime())
    ? date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    : '';
};
const makeId = () => foundry.utils.randomID(12);
const nameFor = (user = game.user) => {
  const actor = user?.character;
  return actor?.name ? `${actor.name} (${user.name})` : user?.name ?? 'Unknown hunter';
};

function seedQuests() {
  const now = new Date().toISOString();
  const quest = (data) => ({
    id: makeId(),
    status: 'open',
    claimedBy: '',
    claimedById: '',
    published: true,
    createdAt: now,
    updatedAt: now,
    rewardNote: '',
    tags: [],
    ...data
  });
  return [
    quest({
      title: 'The Hollow Tithe',
      type: 'Investigation',
      patron: 'Reeve Maud Ainsley',
      location: 'Greywater Ford',
      danger: 2,
      reward: 450,
      summary: 'Three grain barges have vanished between the ford and the mill, and the reeve’s ledger insists they were never loaded.',
      objectives: 'Find the missing barges.\nQuestion the miller and the lock-keeper.\nBring proof of who is altering the tithe ledger.',
      tags: ['village', 'missing', 'tithe'],
      gmNotes: 'The barges are hidden under the mill race. The lock-keeper is being blackmailed by the Ashen Ledger; he will crack if shown the forged manifest.'
    }),
    quest({
      title: 'Scales on the Saltmarsh',
      type: 'Hunt',
      patron: 'Harbourmaster Vell',
      location: 'Saltmarsh Reach',
      danger: 3,
      reward: 1200,
      summary: 'Something has been taking fishing crews at the reed line. Vell wants the marsh quiet before the next tide.',
      objectives: 'Track the creature through the reed channels.\nBring back a token the harbour can display.\nDo not let it reach the open water.',
      tags: ['heliana', 'serpent', 'hunt'],
      gmNotes: 'A wounded river serpent, roughly CR 7. Use Heliana’s Hunt to carve it. It is defending a nest, not hunting for sport.'
    }),
    quest({
      title: 'The Pale Heron',
      type: 'Salvage',
      patron: 'Mistress Orla Finch',
      location: 'Wreck of the Pale Heron',
      danger: 3,
      reward: 900,
      summary: 'A courier ship went down off the black rocks with a sealed strongbox. Orla will pay for the box, not the story.',
      objectives: 'Reach the wreck before the next storm.\nRecover the sealed strongbox.\nReturn it unopened — or decide what opening it is worth.',
      tags: ['shipwright', 'wreck', 'salvage'],
      gmNotes: 'Use Crimson Shipwright to generate the wreck and its salvage. The strongbox contains letters that implicate a harbour councillor.'
    }),
    quest({
      title: 'Ash at Saint Cinder’s',
      type: 'Exploration',
      patron: 'Abbot Halvern',
      location: 'Saint Cinder’s Chapel',
      danger: 4,
      reward: 2400,
      summary: 'The chapel burned forty years ago and was sealed. Its bell has started ringing again, and the abbot wants the crypt quiet.',
      objectives: 'Enter the sealed chapel.\nFind the source of the bell.\nCleanse or contain what remains below the nave.',
      tags: ['chapel', 'undead', 'bell'],
      gmNotes: 'A wraith bound to the bell, plus two ash zombies. The bell can be silenced by returning the stolen reliquary from the mill.'
    }),
    quest({
      title: 'The Longest Road',
      type: 'Escort',
      patron: 'Caravanmaster Ivo',
      location: 'The Old North Road',
      danger: 2,
      reward: 600,
      summary: 'Ivo’s wagons must reach the winter market. The road is not long, but the last three caravans did not arrive.',
      objectives: 'Escort the wagons to the winter market.\nKeep at least two wagons intact.\nFind out who has been burning the waystations.',
      tags: ['road', 'escort', 'caravan'],
      gmNotes: 'A deserting company of borderers is burning the waystations to cover its looting. They will parley before they fight.'
    }),
    quest({
      title: 'A Debt in Dragon’s Blood',
      type: 'Hunt',
      patron: 'The Ashen Ledger',
      location: 'The Cinder Crags',
      danger: 5,
      reward: 6000,
      rewardNote: 'plus one favour from the Ledger',
      summary: 'The Ledger wants a scale from the crimson wyrm of the Cinder Crags. It will not say what the scale is for.',
      objectives: 'Find the wyrm’s lair.\nTake a scale without waking it — or survive waking it.\nDeliver the scale to the Ledger’s factor.',
      tags: ['dragon', 'legendary', 'ledger'],
      gmNotes: 'An adult crimson dragon. This is a heist first and a fight second. The Ledger’s “favour” is a binding marker; decide whether it can be refused.',
      published: false
    })
  ];
}

function boardJournal() {
  return game.journal.find((journal) => journal.getFlag(FLAG_SCOPE, FLAG_KEY)?.board === true) ?? null;
}

function readData(journal = boardJournal()) {
  return journal?.getFlag(FLAG_SCOPE, FLAG_KEY) ?? null;
}

function questsOf(journal = boardJournal()) {
  const data = readData(journal);
  return Array.isArray(data?.quests) ? data.quests : [];
}

let ensurePromise = null;

async function ensureBoard() {
  if (!game.user.isGM) return boardJournal();
  const existing = boardJournal();
  if (existing) return existing;
  ensurePromise ??= JournalEntry.create({
    name: BOARD_NAME,
    ownership: { default: 2 },
    flags: {
      [FLAG_SCOPE]: {
        [FLAG_KEY]: { board: true, quests: seedQuests() }
      }
    }
  }).finally(() => { ensurePromise = null; });
  return ensurePromise;
}

async function writeQuests(quests) {
  if (!game.user.isGM) throw new Error('Only the GM can change the quest board.');
  const journal = (await ensureBoard()) ?? boardJournal();
  if (!journal) throw new Error('The Crimson Board journal could not be created.');
  await journal.setFlag(FLAG_SCOPE, FLAG_KEY, { board: true, quests });
  return journal;
}

function visibleQuests(journal = boardJournal()) {
  const all = questsOf(journal);
  return game.user.isGM ? all : all.filter((quest) => quest.published);
}

function tabMatches(quest, tab) {
  if (tab === 'open') return quest.status === 'open';
  if (tab === 'claimed') return quest.status === 'claimed';
  if (tab === 'done') return quest.status === 'completed' || quest.status === 'failed';
  return true;
}

function displayQuest(quest, isGM) {
  const status = STATUSES[quest.status] ?? STATUSES.open;
  return {
    ...quest,
    statusLabel: status.label,
    statusClass: status.className,
    sealLabel: status.seal,
    typeLabel: TYPES.includes(quest.type) ? quest.type : 'Other',
    typeIcon: TYPE_ICONS[quest.type] ?? TYPE_ICONS.Other,
    rewardLabel: money(quest.reward),
    dangerPips: Array.from({ length: 5 }, (_, index) => ({ filled: index < Math.min(5, Math.max(1, number(quest.danger, 1))) })),
    createdLabel: dateLabel(quest.createdAt),
    tags: Array.isArray(quest.tags) ? quest.tags : [],
    canClaim: !isGM && Boolean(quest.published) && quest.status === 'open',
    canComplete: ['open', 'claimed'].includes(quest.status),
    canReopen: ['completed', 'failed'].includes(quest.status),
    canRelease: quest.status === 'claimed' && (isGM || quest.claimedById === game.user.id),
    isMine: quest.claimedById === game.user.id,
    gmNotes: isGM ? quest.gmNotes ?? '' : ''
  };
}

class QuestBoardApp extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: APP_ID,
    classes: ['crimson-quest-board'],
    position: { width: 1000, height: 760 },
    window: { title: 'The Crimson Board', resizable: true },
    actions: {
      selectTab: QuestBoardApp.#onTab,
      newQuest: QuestBoardApp.#onNew,
      editQuest: QuestBoardApp.#onEdit,
      saveQuest: QuestBoardApp.#onSave,
      cancelQuest: QuestBoardApp.#onCancel,
      claimQuest: QuestBoardApp.#onClaim,
      releaseQuest: QuestBoardApp.#onRelease,
      completeQuest: QuestBoardApp.#onComplete,
      failQuest: QuestBoardApp.#onFail,
      reopenQuest: QuestBoardApp.#onReopen,
      publishQuest: QuestBoardApp.#onPublish,
      unpublishQuest: QuestBoardApp.#onUnpublish,
      deleteQuest: QuestBoardApp.#onDelete,
      clearQuestFilters: QuestBoardApp.#onClearFilters
    }
  };

  static PARTS = {
    body: { template: `modules/${MODULE_ID}/templates/quest-board.hbs` }
  };

  tab = 'all';
  mode = 'board';
  draft = null;
  error = null;
  filters = { search: '', type: '' };
  searchTimer = null;

  async _prepareContext() {
    const isGM = game.user.isGM;
    const journal = boardJournal();
    const visible = visibleQuests(journal);
    const counts = {
      all: visible.length,
      open: visible.filter((quest) => quest.status === 'open').length,
      claimed: visible.filter((quest) => quest.status === 'claimed').length,
      done: visible.filter((quest) => ['completed', 'failed'].includes(quest.status)).length
    };
    const search = this.filters.search.toLocaleLowerCase();
    const filtered = visible
      .filter((quest) => tabMatches(quest, this.tab))
      .filter((quest) => !this.filters.type || quest.type === this.filters.type)
      .filter((quest) => {
        if (!search) return true;
        return [quest.title, quest.summary, quest.patron, quest.location, quest.type, ...(quest.tags ?? [])]
          .join(' ').toLocaleLowerCase().includes(search);
      })
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));

    const draft = this.draft ?? {
      id: '', title: '', type: 'Hunt', patron: '', location: '', danger: 3,
      reward: 0, rewardNote: '', summary: '', objectives: '', tags: '',
      gmNotes: '', published: true, status: 'open'
    };

    return {
      isGM,
      mode: this.mode,
      isBoard: this.mode === 'board',
      isForm: this.mode === 'form',
      noJournal: !journal,
      roleLabel: isGM ? 'GUILDMASTER' : 'SWORN HUNTER',
      tabs: [
        { id: 'all', label: 'All charters', count: counts.all, active: this.tab === 'all' },
        { id: 'open', label: 'Open', count: counts.open, active: this.tab === 'open' },
        { id: 'claimed', label: 'Bound', count: counts.claimed, active: this.tab === 'claimed' },
        { id: 'done', label: 'Archived', count: counts.done, active: this.tab === 'done' }
      ],
      counts,
      quests: filtered.map((quest) => displayQuest(quest, isGM)),
      questCount: filtered.length,
      totalCount: visible.length,
      filters: this.filters,
      types: [
        { value: '', label: 'All kinds', selected: this.filters.type === '' },
        ...TYPES.map((type) => ({ value: type, label: type, selected: this.filters.type === type }))
      ],
      formTypes: TYPES.map((type) => ({ value: type, label: type, selected: draft.type === type })),
      draft: { ...draft, tags: Array.isArray(draft.tags) ? draft.tags.join(', ') : draft.tags ?? '' },
      error: this.error
    };
  }

  _onRender(context, options) {
    super._onRender(context, options);
    this.element?.querySelector('form')?.addEventListener('submit', (event) => event.preventDefault());
    const search = this.element?.querySelector('[data-quest-search]');
    if (search) {
      search.addEventListener('input', () => {
        const value = search.value;
        window.clearTimeout(this.searchTimer);
        this.searchTimer = window.setTimeout(() => {
          this.filters.search = value;
          this.render().then(() => {
            const next = this.element?.querySelector('[data-quest-search]');
            next?.focus();
            next?.setSelectionRange(value.length, value.length);
          });
        }, 160);
      });
    }
    this.element?.querySelector('[data-quest-type]')?.addEventListener('change', (event) => {
      this.filters.type = event.currentTarget.value;
      this.render();
    });
  }

  static #findQuest(id) {
    return questsOf().find((quest) => quest.id === id) ?? null;
  }

  static async #onTab(event, target) {
    this.tab = target.dataset.tab ?? 'all';
    await this.render();
  }

  static async #onNew() {
    if (!game.user.isGM) return;
    this.mode = 'form';
    this.error = null;
    this.draft = {
      id: '', title: '', type: 'Hunt', patron: '', location: '', danger: 3,
      reward: 0, rewardNote: '', summary: '', objectives: '', tags: '',
      gmNotes: '', published: true, status: 'open'
    };
    await this.render();
  }

  static async #onEdit(event, target) {
    if (!game.user.isGM) return;
    const quest = QuestBoardApp.#findQuest(target.dataset.questId);
    if (!quest) return;
    this.mode = 'form';
    this.error = null;
    this.draft = { ...quest };
    await this.render();
  }

  static async #onCancel() {
    this.mode = 'board';
    this.draft = null;
    this.error = null;
    await this.render();
  }

  static async #onSave() {
    if (!game.user.isGM) return;
    const form = this.element?.querySelector('form[data-quest-form]');
    if (!form) return;
    const data = new FormData(form);
    const field = (key, max = 2000) => text(data.get(key), max);
    const title = field('title', 120);
    if (!title) {
      this.error = 'A posting needs a title.';
      await this.render();
      return;
    }
    const base = this.draft ?? {};
    await ensureBoard();
    const quests = questsOf();
    const now = new Date().toISOString();
    const next = {
      id: base.id || makeId(),
      title,
      type: field('type', 40) || 'Other',
      patron: field('patron', 120),
      location: field('location', 120),
      danger: Math.min(5, Math.max(1, Math.round(number(data.get('danger'), 3)))),
      reward: Math.max(0, Math.round(number(data.get('reward'), 0))),
      rewardNote: field('rewardNote', 160),
      summary: field('summary', 1000),
      objectives: field('objectives', 2400),
      tags: field('tags', 400).split(',').map((tag) => tag.trim()).filter(Boolean).slice(0, 12),
      gmNotes: field('gmNotes', 3000),
      published: Boolean(data.get('published')),
      status: base.status || 'open',
      claimedBy: base.claimedBy || '',
      claimedById: base.claimedById || '',
      createdAt: base.createdAt || now,
      updatedAt: now
    };
    const index = quests.findIndex((quest) => quest.id === next.id);
    if (index >= 0) quests[index] = next;
    else quests.push(next);
    try {
      await writeQuests(quests);
      this.mode = 'board';
      this.draft = null;
      this.error = null;
      ui.notifications.info(`${next.title} posted to the Crimson Board.`);
      await this.render();
    } catch (error) {
      this.error = error.message;
      await this.render();
    }
  }

  static async #onClaim(event, target) {
    const quest = QuestBoardApp.#findQuest(target.dataset.questId);
    if (!quest || !quest.published || quest.status !== 'open') return;
    if (!game.user.isGM) {
      if (![...game.users].some((user) => user.isGM && user.active)) {
        ui.notifications.warn('No GM is connected to receive that claim.');
        return;
      }
      game.socket.emit(SOCKET, {
        type: SOCKET_CLAIM,
        questId: quest.id,
        userId: game.user.id,
        userName: nameFor()
      });
      ui.notifications.info('Claim sent to the GM.');
      return;
    }
    quest.status = 'claimed';
    quest.claimedBy = nameFor();
    quest.claimedById = game.user.id;
    quest.updatedAt = new Date().toISOString();
    await writeQuests(questsOf().map((entry) => entry.id === quest.id ? quest : entry));
    await this.render();
  }

  static async #onRelease(event, target) {
    const quest = QuestBoardApp.#findQuest(target.dataset.questId);
    if (!quest || quest.status !== 'claimed') return;
    if (!game.user.isGM) {
      if (quest.claimedById !== game.user.id) return;
      if (![...game.users].some((user) => user.isGM && user.active)) {
        ui.notifications.warn('No GM is connected to release that claim.');
        return;
      }
      game.socket.emit(SOCKET, {
        type: SOCKET_RELEASE,
        questId: quest.id,
        userId: game.user.id
      });
      ui.notifications.info('Release sent to the GM.');
      return;
    }
    quest.status = 'open';
    quest.claimedBy = '';
    quest.claimedById = '';
    quest.updatedAt = new Date().toISOString();
    await writeQuests(questsOf().map((entry) => entry.id === quest.id ? quest : entry));
    await this.render();
  }

  static async #setStatus(event, target, status) {
    if (!game.user.isGM) return;
    const quest = QuestBoardApp.#findQuest(target.dataset.questId);
    if (!quest) return;
    quest.status = status;
    if (status === 'open') {
      quest.claimedBy = '';
      quest.claimedById = '';
    }
    quest.updatedAt = new Date().toISOString();
    await writeQuests(questsOf().map((entry) => entry.id === quest.id ? quest : entry));
    await this.render();
  }

  static async #onComplete(event, target) {
    return QuestBoardApp.#setStatus(event, target, 'completed');
  }

  static async #onFail(event, target) {
    return QuestBoardApp.#setStatus(event, target, 'failed');
  }

  static async #onReopen(event, target) {
    return QuestBoardApp.#setStatus(event, target, 'open');
  }

  static async #onPublish(event, target) {
    if (!game.user.isGM) return;
    const quest = QuestBoardApp.#findQuest(target.dataset.questId);
    if (!quest) return;
    quest.published = true;
    quest.updatedAt = new Date().toISOString();
    await writeQuests(questsOf().map((entry) => entry.id === quest.id ? quest : entry));
    await this.render();
  }

  static async #onUnpublish(event, target) {
    if (!game.user.isGM) return;
    const quest = QuestBoardApp.#findQuest(target.dataset.questId);
    if (!quest) return;
    quest.published = false;
    quest.updatedAt = new Date().toISOString();
    await writeQuests(questsOf().map((entry) => entry.id === quest.id ? quest : entry));
    await this.render();
  }

  static async #onDelete(event, target) {
    if (!game.user.isGM) return;
    const quest = QuestBoardApp.#findQuest(target.dataset.questId);
    if (!quest) return;
    if (!window.confirm(`Remove "${quest.title}" from the board?`)) return;
    await writeQuests(questsOf().filter((entry) => entry.id !== quest.id));
    await this.render();
  }

  static async #onClearFilters() {
    this.filters = { search: '', type: '' };
    await this.render();
  }
}

async function onSocketMessage(data) {
  if (!game.user.isGM || !data || !data.questId) return;
  if (data.type !== SOCKET_CLAIM && data.type !== SOCKET_RELEASE) return;
  const quest = questsOf().find((entry) => entry.id === data.questId);
  if (!quest) return;
  if (data.type === SOCKET_CLAIM) {
    if (!quest.published || quest.status !== 'open') return;
    quest.status = 'claimed';
    quest.claimedById = String(data.userId ?? '');
    quest.claimedBy = text(data.userName, 80) || 'Unknown hunter';
  } else {
    if (quest.status !== 'claimed' || quest.claimedById !== String(data.userId ?? '')) return;
    quest.status = 'open';
    quest.claimedBy = '';
    quest.claimedById = '';
  }
  quest.updatedAt = new Date().toISOString();
  await writeQuests(questsOf().map((entry) => entry.id === quest.id ? quest : entry));
  ui.notifications.info(`Quest board updated: ${quest.title}.`);
}

let boardApp = null;
let socketBound = false;

export function init() {
  if (!game.user.isGM) return;
  if (!socketBound) {
    socketBound = true;
    game.socket.on(SOCKET, onSocketMessage);
  }
  ensureBoard().catch((error) => {
    console.error('Crimson Quest Board: could not create the board journal.', error);
  });
}

export function open() {
  init();
  boardApp ??= new QuestBoardApp();
  boardApp.render(true);
  return boardApp;
}

Hooks.on('updateJournalEntry', (journal) => {
  if (journal.id === boardJournal()?.id && boardApp?.rendered) boardApp.render();
});

Hooks.on('createJournalEntry', (journal) => {
  if (journal.getFlag(FLAG_SCOPE, FLAG_KEY)?.board && boardApp?.rendered) boardApp.render();
});

export const __test = { seedQuests, displayQuest, tabMatches, TYPES, STATUSES };
