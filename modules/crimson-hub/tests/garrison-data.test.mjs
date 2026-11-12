import test from 'node:test';
import assert from 'node:assert/strict';

import {
  advanceDay,
  makeDefaultGarrison,
  resupply,
  toggleProject
} from '../scripts/garrison-data.mjs';

test('the default ledger is an abandoned fort with active work', () => {
  const state = makeDefaultGarrison();
  assert.equal(state.name, 'The Old Watch');
  assert.equal(state.day, 1);
  assert.equal(state.supplies, 14);
  assert.equal(state.projects.filter((project) => project.status === 'active').length, 3);
  assert.equal(state.sectors.length, 8);
  assert.equal(state.readiness.security, 1);
  assert.equal(state.autoAdvanceOnLongRest, true);
});

test('a day consumes supplies, advances active projects, and preserves the resting rule', () => {
  const state = makeDefaultGarrison();
  const { state: next, summary } = advanceDay(state, { source: 'Long rest — Vell' });

  assert.equal(state.day, 1, 'the source ledger is not mutated');
  assert.equal(next.day, 2);
  assert.equal(next.supplies, 13);
  assert.equal(next.projects.find((project) => project.id === 'gatehouse').filled, 2);
  assert.equal(next.autoAdvanceOnLongRest, true);
  assert.equal(summary.source, 'Long rest — Vell');
  assert.equal(summary.completed.length, 0);
});

test('the gatehouse completes on the fourth day and raises security', () => {
  const state = makeDefaultGarrison();
  const first = advanceDay(state);
  const second = advanceDay(first.state);
  const third = advanceDay(second.state);
  const fourth = advanceDay(third.state);

  assert.equal(fourth.state.projects.find((project) => project.id === 'gatehouse').status, 'complete');
  assert.equal(fourth.state.readiness.security, 2);
  assert.equal(fourth.state.sectors.find((sector) => sector.id === 'gate').state, 'restored');
  assert.deepEqual(third.summary.completed, ['Secure the gatehouse']);
});

test('payroll is paid on the seventh day', () => {
  let state = makeDefaultGarrison();
  for (let day = 0; day < 6; day += 1) state = advanceDay(state).state;

  assert.equal(state.day, 7);
  assert.equal(state.treasury, 190);
});

test('the third day produces a log event', () => {
  let state = makeDefaultGarrison();
  for (let day = 0; day < 2; day += 1) state = advanceDay(state).state;

  assert.equal(state.day, 3);
  assert.ok(state.log.some((entry) => entry.kind === 'event'));
});

test('an available project can be activated for its cost and paused without refund', () => {
  const state = makeDefaultGarrison();
  const activated = toggleProject(state, 'magazine');

  assert.equal(activated.ok, true);
  assert.equal(activated.state.treasury, 140);
  assert.equal(activated.state.projects.find((project) => project.id === 'magazine').status, 'active');

  const paused = toggleProject(activated.state, 'magazine');
  assert.equal(paused.ok, true);
  assert.equal(paused.state.projects.find((project) => project.id === 'magazine').status, 'available');
  assert.equal(paused.state.treasury, 140);
});

test('a project cannot be activated without enough coin', () => {
  const state = makeDefaultGarrison();
  state.treasury = 10;
  const result = toggleProject(state, 'dock');

  assert.equal(result.ok, false);
  assert.match(result.reason, /Not enough coin/);
});

test('resupply spends coin and restores supplies without exceeding the cap', () => {
  const state = makeDefaultGarrison();
  state.treasury = 100;
  state.supplies = 28;
  const result = resupply(state);

  assert.equal(result.ok, true);
  assert.equal(result.state.treasury, 75);
  assert.equal(result.state.supplies, 30);
});
