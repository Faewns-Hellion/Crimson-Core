import test from 'node:test';
import assert from 'node:assert/strict';

import { makeDefaultGarrison } from '../scripts/garrison-data.mjs';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let journalFlags = { isGarrison: true, ...makeDefaultGarrison() };
const chatMessages = [];
const hooks = new Map();

const journal = {
  id: 'test-garrison-journal',
  getFlag(scope, key) {
    return scope === 'crimson-hub' && key === 'garrison' ? journalFlags : null;
  },
  async setFlag(scope, key, value) {
    if (scope === 'crimson-hub' && key === 'garrison') journalFlags = value;
  },
  testUserPermission() {
    return true;
  }
};

globalThis.foundry = {
  applications: {
    api: {
      ApplicationV2: class {
        render() {
          return this;
        }
      },
      HandlebarsApplicationMixin: (Base) => class extends Base {}
    }
  }
};

globalThis.Hooks = {
  on(name, handler) {
    if (!hooks.has(name)) hooks.set(name, []);
    hooks.get(name).push(handler);
  }
};

globalThis.game = {
  user: { isGM: true },
  journal: { find: () => journal }
};

globalThis.ui = {
  notifications: {
    info() {},
    warn() {},
    error() {}
  }
};

globalThis.ChatMessage = {
  async create(data) {
    chatMessages.push(data);
    return data;
  }
};

globalThis.JournalEntry = {
  async create() {
    return journal;
  }
};

const app = await import('../scripts/garrison.mjs');
app.init();
await wait(10);

test('a group long rest advances one garrison day and posts one summary', async () => {
  const before = journalFlags.day;
  const messagesBefore = chatMessages.length;

  const groupHandlers = hooks.get('dnd5e.groupRestCompleted') ?? [];
  assert.equal(groupHandlers.length, 1);
  groupHandlers[0]({ name: 'The Company' }, new Map([['actor', { longRest: true }]]));

  await wait(25);

  assert.equal(journalFlags.day, before + 1);
  assert.equal(chatMessages.length, messagesBefore + 1);
  assert.match(chatMessages.at(-1).content, /Long rest/);
});

test('a single long rest advances one day', async () => {
  journalFlags = { ...journalFlags, autoAdvanceOnLongRest: true };
  const before = journalFlags.day;

  const restHandlers = hooks.get('dnd5e.restCompleted') ?? [];
  restHandlers[0]({ name: 'Vell' }, { longRest: true });

  await wait(1300);

  assert.equal(journalFlags.day, before + 1);
});

test('a group rest does not double-advance from member hooks', async () => {
  const before = journalFlags.day;

  const restHandlers = hooks.get('dnd5e.restCompleted') ?? [];
  const groupHandlers = hooks.get('dnd5e.groupRestCompleted') ?? [];
  restHandlers[0]({ name: 'Vell' }, { longRest: true });
  groupHandlers[0]({ name: 'The Company' }, new Map([['actor', { longRest: true }]]));

  await wait(25);
  assert.equal(journalFlags.day, before + 1);

  await wait(1300);
  assert.equal(journalFlags.day, before + 1);
});

test('automatic advance can be disabled without disabling manual work', async () => {
  journalFlags = { ...journalFlags, autoAdvanceOnLongRest: false };
  const before = journalFlags.day;

  const groupHandlers = hooks.get('dnd5e.groupRestCompleted') ?? [];
  groupHandlers[0]({ name: 'The Company' }, new Map([['actor', { longRest: true }]]));

  await wait(25);

  assert.equal(journalFlags.day, before);
});
