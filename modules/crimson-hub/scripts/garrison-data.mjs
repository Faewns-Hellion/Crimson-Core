// Crimson Garrison — pure state engine.
// Kept free of Foundry globals so the day/readiness rules can be tested with
// plain Node while the ApplicationV2 shell handles presentation.

export const TRACKS = [
  { id: 'security', label: 'Security' },
  { id: 'habitation', label: 'Habitation' },
  { id: 'logistics', label: 'Logistics' },
  { id: 'garrison', label: 'Garrison' },
  { id: 'command', label: 'Command' }
];

export const SECTOR_STATES = {
  sealed: { label: 'Sealed', className: 'is-sealed' },
  surveyed: { label: 'Surveyed', className: 'is-surveyed' },
  secured: { label: 'Secured', className: 'is-secured' },
  restored: { label: 'Restored', className: 'is-restored' },
  operational: { label: 'Operational', className: 'is-operational' }
};

export const ALERTS = {
  green: { label: 'Green', className: 'is-green' },
  amber: { label: 'Amber', className: 'is-amber' },
  red: { label: 'Red', className: 'is-red' }
};

const EVENTS = [
  {
    title: 'A city inspector arrives',
    text: 'The city wants to know who is holding the old watch, and whether the gate tolls still belong to it.',
    effect: { treasury: -10 }
  },
  {
    title: 'The old stores give up something',
    text: 'A sealed crate is recovered from a collapsed store room: dry rations, lamp oil, and a useful map.',
    effect: { supplies: 3 }
  },
  {
    title: 'A patrol reports movement',
    text: 'Smoke on the coast road. Someone is using the old fort’s approaches, and they are not flying a flag.',
    effect: { readiness: { security: -1 } }
  },
  {
    title: 'The well runs foul',
    text: 'The water turns brackish overnight. The cistern needs work before the garrison can grow.',
    effect: { readiness: { habitation: -1 } }
  },
  {
    title: 'A deserter comes back',
    text: 'An old soldier of the garrison returns with news of the regiment, and a request for a place to sleep.',
    effect: { readiness: { garrison: 1 } }
  },
  {
    title: 'The magazine ticks',
    text: 'Something inside the sealed magazine shifts and settles. The engineers want it opened carefully.',
    effect: { readiness: { logistics: -1 } }
  }
];

const deepClone = (value) => JSON.parse(JSON.stringify(value));
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const number = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

function defaultSectors() {
  return [
    {
      id: 'command',
      name: 'Command Post',
      icon: 'fa-solid fa-house-chimney',
      state: 'sealed',
      condition: 'The commandant’s house still has a roof. The lower floor is dark.',
      hazard: 'Sealed cellar; old wards.',
      projectId: 'bunker'
    },
    {
      id: 'barracks',
      name: 'Barracks',
      icon: 'fa-solid fa-bed',
      state: 'surveyed',
      condition: 'The north wing has collapsed; squatters have been using the south hall.',
      hazard: 'Unstable floor; deserters.',
      projectId: 'barracks'
    },
    {
      id: 'armory',
      name: 'Armory & Magazine',
      icon: 'fa-solid fa-boxes-stacked',
      state: 'sealed',
      condition: 'The magazine is intact. The lock is old military issue.',
      hazard: 'Alchemical seep; unstable stores.',
      projectId: 'magazine'
    },
    {
      id: 'parade',
      name: 'Parade Ground',
      icon: 'fa-solid fa-flag',
      state: 'secured',
      condition: 'The muster yard is overgrown, but its walls still stand.',
      hazard: 'None obvious.',
      projectId: null
    },
    {
      id: 'gate',
      name: 'Gatehouse & Walls',
      icon: 'fa-solid fa-chess-rook',
      state: 'surveyed',
      condition: 'The gate is jammed; one tower has a cracked parapet.',
      hazard: 'Collapsed stair; old alarm ward.',
      projectId: 'gatehouse'
    },
    {
      id: 'dock',
      name: 'Naval Slip',
      icon: 'fa-solid fa-anchor',
      state: 'sealed',
      condition: 'The pier is half-sunk. A derelict tender is moored outside the boom.',
      hazard: 'Rotten piers; something in the water.',
      projectId: 'dock'
    },
    {
      id: 'stores',
      name: 'Stores, Workshop & Infirmary',
      icon: 'fa-solid fa-screwdriver-wrench',
      state: 'surveyed',
      condition: 'The stores are empty; the infirmary still has cots and a locked cabinet.',
      hazard: 'Mold; old medicines.',
      projectId: 'water'
    },
    {
      id: 'fields',
      name: 'Fields & Kitchen Gardens',
      icon: 'fa-solid fa-seedling',
      state: 'surveyed',
      condition: 'The plots are overgrown. The old well is fouled and the cistern is cracked.',
      hazard: 'Bad water; sinkholes.',
      projectId: 'water'
    }
  ];
}

function defaultProjects() {
  return [
    {
      id: 'gatehouse',
      name: 'Secure the gatehouse',
      track: 'security',
      sector: 'gate',
      segments: 4,
      filled: 1,
      cost: 50,
      paid: true,
      check: 'Athletics',
      status: 'active',
      note: 'Clear the jammed gate and restore the watch post.'
    },
    {
      id: 'water',
      name: 'Restore the well and cistern',
      track: 'habitation',
      sector: 'fields',
      segments: 6,
      filled: 0,
      cost: 100,
      paid: true,
      check: 'Mason’s tools',
      status: 'active',
      note: 'Clean water is the first prerequisite for a garrison.'
    },
    {
      id: 'barracks',
      name: 'Clear the barracks',
      track: 'habitation',
      sector: 'barracks',
      segments: 5,
      filled: 0,
      cost: 75,
      paid: true,
      check: 'Athletics',
      status: 'active',
      note: 'Make one wing habitable before recruiting.'
    },
    {
      id: 'magazine',
      name: 'Secure the magazine',
      track: 'logistics',
      sector: 'armory',
      segments: 6,
      filled: 0,
      cost: 100,
      paid: false,
      check: 'Thieves’ tools or Arcana',
      status: 'available',
      note: 'The old stores are still sealed. Something inside is leaking.'
    },
    {
      id: 'dock',
      name: 'Reopen the naval slip',
      track: 'logistics',
      sector: 'dock',
      segments: 6,
      filled: 0,
      cost: 150,
      paid: false,
      check: 'Water vehicles',
      status: 'available',
      note: 'A working dock extends patrol range and supply.'
    },
    {
      id: 'watchtower',
      name: 'Rebuild the watchtower',
      track: 'security',
      sector: 'gate',
      segments: 8,
      filled: 0,
      cost: 200,
      paid: false,
      check: 'Mason’s tools',
      status: 'available',
      note: 'Restore the signal tower and the coast watch.'
    },
    {
      id: 'bunker',
      name: 'Clear the command bunker',
      track: 'command',
      sector: 'command',
      segments: 6,
      filled: 0,
      cost: 0,
      paid: true,
      check: 'Investigation or Thieves’ tools',
      status: 'available',
      note: 'The old command post may still hold maps, codes, and orders.'
    }
  ];
}

function defaultRoster() {
  return [
    {
      id: 'sergeant',
      name: 'Sergeant Vell',
      role: 'Acting commander',
      unit: 'Command',
      morale: 3,
      pay: 2,
      note: 'Old regiment. Knows the fort and does not trust the city.'
    },
    {
      id: 'engineer',
      name: 'Mara',
      role: 'Engineer',
      unit: 'Workshop',
      morale: 3,
      pay: 2,
      note: 'Can make the pumps work again, given parts and time.'
    },
    {
      id: 'medic',
      name: 'Ives',
      role: 'Medic',
      unit: 'Infirmary',
      morale: 2,
      pay: 2,
      note: 'Wants the infirmary clean before anyone else gets hurt.'
    }
  ];
}

function defaultStores() {
  return [
    { id: 'food', name: 'Food & water', value: 14, max: 30, unit: 'days' },
    { id: 'medicine', name: 'Medicine', value: 4, max: 10, unit: 'kits' },
    { id: 'parts', name: 'Repair parts', value: 3, max: 10, unit: 'crates' },
    { id: 'arms', name: 'Arms & powder', value: 6, max: 20, unit: 'crates' }
  ];
}

export function makeDefaultGarrison() {
  return {
    version: 1,
    name: 'The Old Watch',
    subtitle: 'Abandoned coastal fort · Crimson Tyrant',
    day: 1,
    alert: 'amber',
    autoAdvanceOnLongRest: true,
    treasury: 240,
    payroll: 40,
    supplies: 14,
    supplyMax: 30,
    readiness: {
      security: 1,
      habitation: 1,
      logistics: 1,
      garrison: 0,
      command: 0
    },
    sectors: defaultSectors(),
    projects: defaultProjects(),
    roster: defaultRoster(),
    stores: defaultStores(),
    log: [
      {
        day: 1,
        kind: 'note',
        text: 'The company takes possession of the old watch. The gate is jammed, the well is foul, and the command post is sealed.'
      }
    ]
  };
}

export function readinessList(state) {
  return TRACKS.map((track) => {
    const value = clamp(number(state.readiness?.[track.id], 0), 0, 5);
    return {
      ...track,
      value,
      pct: Math.round((value / 5) * 100),
      stateLabel: value >= 4 ? 'Ready' : value >= 2 ? 'Partial' : 'Critical'
    };
  });
}

export function sectorState(stateId) {
  return SECTOR_STATES[stateId] ?? SECTOR_STATES.sealed;
}

export function alertState(alertId) {
  return ALERTS[alertId] ?? ALERTS.amber;
}

export function projectStatus(project) {
  if (project?.status === 'complete') return { label: 'Complete', className: 'is-complete' };
  if (project?.status === 'active') return { label: 'Active', className: 'is-active' };
  return { label: 'Available', className: 'is-available' };
}

function addLog(state, text, kind = 'note') {
  state.log.unshift({ day: state.day, kind, text });
  state.log = state.log.slice(0, 30);
}

function applyEvent(state, event) {
  if (!event) return;
  const effect = event.effect ?? {};
  if (Number.isFinite(effect.supplies)) {
    state.supplies = clamp(state.supplies + effect.supplies, 0, state.supplyMax);
  }
  if (Number.isFinite(effect.treasury)) {
    state.treasury = Math.max(0, state.treasury + effect.treasury);
  }
  for (const [track, delta] of Object.entries(effect.readiness ?? {})) {
    if (!(track in state.readiness) || !Number.isFinite(delta)) continue;
    state.readiness[track] = clamp(state.readiness[track] + delta, 0, 5);
  }
  if (effect.alert && ALERTS[effect.alert]) state.alert = effect.alert;
  addLog(state, `${event.title}: ${event.text}`, 'event');
}

function eventForDay(day) {
  if (day % 3 !== 0) return null;
  return EVENTS[(Math.floor(day / 3) - 1) % EVENTS.length];
}

/**
 * Advance the garrison ledger by one day.
 * @param {object} source
 * @param {object} [options]
 * @param {string} [options.source]  Label for the event that triggered the tick.
 * @param {object|null} [options.event]  Override the day's event.
 * @returns {{state: object, summary: object}}
 */
export function advanceDay(source, options = {}) {
  const state = deepClone(source);
  const fromDay = state.day;
  state.day += 1;
  const completed = [];
  let payrollPaid = false;
  let payrollFailed = false;

  const suppliesBefore = state.supplies;
  state.supplies = clamp(state.supplies - 1, 0, state.supplyMax);
  if (suppliesBefore > 0 && state.supplies === 0) {
    state.readiness.habitation = clamp(state.readiness.habitation - 1, 0, 5);
    addLog(state, 'Rations are gone. The garrison is on half-water and short temper.', 'warning');
  }

  for (const project of state.projects) {
    if (project.status !== 'active') continue;
    project.filled = clamp(number(project.filled) + 1, 0, number(project.segments, 1));
    if (project.filled < project.segments) continue;
    project.status = 'complete';
    project.filled = project.segments;
    state.readiness[project.track] = clamp((state.readiness[project.track] ?? 0) + 1, 0, 5);
    const sector = state.sectors.find((entry) => entry.id === project.sector);
    if (sector && ['sealed', 'surveyed', 'secured'].includes(sector.state)) sector.state = 'restored';
    completed.push(project);
    addLog(state, `${project.name} is complete. ${TRACKS.find((track) => track.id === project.track)?.label ?? 'Readiness'} improves.`, 'complete');
  }

  if (state.day % 7 === 0) {
    if (state.treasury >= state.payroll) {
      state.treasury -= state.payroll;
      payrollPaid = true;
      addLog(state, `Payroll paid: ${state.payroll} gp.`, 'ledger');
    } else {
      state.treasury = 0;
      payrollFailed = true;
      state.readiness.garrison = clamp(state.readiness.garrison - 1, 0, 5);
      addLog(state, 'Payroll is short. The garrison’s confidence drops.', 'warning');
    }
  }

  const event = options.event === undefined ? eventForDay(state.day) : options.event;
  applyEvent(state, event);

  addLog(
    state,
    `Day ${state.day}: ${completed.length ? `${completed.length} project${completed.length === 1 ? '' : 's'} completed.` : 'No project completed.'} Supplies ${state.supplies}/${state.supplyMax}.`,
    'day'
  );

  return {
    state,
    summary: {
      source: options.source ?? 'Command',
      fromDay,
      toDay: state.day,
      completed: completed.map((project) => project.name),
      event,
      payrollPaid,
      payrollFailed,
      supplyAfter: state.supplies,
      treasuryAfter: state.treasury
    }
  };
}

export function toggleProject(source, projectId) {
  const state = deepClone(source);
  const project = state.projects.find((entry) => entry.id === projectId);
  if (!project) return { ok: false, reason: 'That project is not on the ledger.', state: source };
  if (project.status === 'complete') return { ok: false, reason: 'That project is already complete.', state: source };

  if (project.status === 'active') {
    project.status = 'available';
    addLog(state, `${project.name} is paused.`, 'note');
    return { ok: true, state };
  }

  if (state.treasury < project.cost) {
    return {
      ok: false,
      reason: `Not enough coin in the ledger. ${project.name} needs ${project.cost} gp.`,
      state: source
    };
  }
  state.treasury -= project.cost;
  project.status = 'active';
  project.paid = true;
  addLog(state, `${project.name} is activated for ${project.cost} gp.`, 'ledger');
  return { ok: true, state };
}

export function resupply(source, cost = 25, amount = 5) {
  const state = deepClone(source);
  if (state.treasury < cost) {
    return { ok: false, reason: `Not enough coin. A resupply run costs ${cost} gp.`, state: source };
  }
  state.treasury -= cost;
  state.supplies = clamp(state.supplies + amount, 0, state.supplyMax);
  addLog(state, `A resupply run buys ${amount} days of food and water for ${cost} gp.`, 'ledger');
  return { ok: true, state };
}

export function __testEventForDay(day) {
  return eventForDay(day);
}
