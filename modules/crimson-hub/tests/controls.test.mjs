import test from 'node:test';
import assert from 'node:assert/strict';
import {buildTools,mergeControls} from '../scripts/controls.mjs';
const makeGame = (user={isGM:true,role:4},role='all') => ({user,settings:{get:()=>role},modules:new Map([
  'crimson-bag','crimson-random-items','crimson-feats','crimson-icons','crimson-drafts'
].map(id=>[id,{active:true}]))});
test('all enabled Crimson tools share one dragon tab, preserving other controls',()=>{
  const controls={tokens:{name:'tokens'},'crimson-icons':{},'crimson-drafts':{}};
  const calls=[];
  mergeControls(controls,makeGame(),d=>calls.push(d.name));
  assert.deepEqual(Object.keys(controls),['tokens','crimson']);
  assert.equal(controls.crimson.icon,'fa-solid fa-dragon');
  assert.deepEqual(Object.keys(controls.crimson.tools),['home','bag','forge','feats','library','icons','drafts']);
  assert.equal(controls.crimson.tools.bag.button,true);
  controls.crimson.tools.bag.onChange();
  assert.deepEqual(calls,['bag']);
});
test('player navigation respects authoring and draft role restrictions',()=>{
  const game=makeGame({isGM:false,role:1},'gm');
  assert.deepEqual(Object.keys(buildTools(game,()=>{})),['bag','icons']);
  game.settings.get=()=> 'trusted';game.user.role=2;
  assert.deepEqual(Object.keys(buildTools(game,()=>{})),['bag','icons','drafts']);
});
test('disabled modules have no buttons and existing module APIs are dispatched',()=>{
  const game=makeGame();game.modules.get('crimson-bag').active=false;
  const calls=[];const tools=buildTools(game,d=>calls.push([d.module,d.method]));
  assert.equal(tools.bag,undefined);tools.library.onChange();
  assert.deepEqual(calls,[['crimson-feats','library']]);
});

test('Crimson Garrison joins the core toolbar when the hub is active',()=>{
  const game=makeGame();game.modules.set('crimson-hub',{active:true});
  const calls=[];const tools=buildTools(game,d=>calls.push([d.module,d.method]));
  assert.equal(tools.garrison.title,'Crimson Garrison');
  assert.equal(tools.garrison.icon,'fa-solid fa-shield-halved');
  tools.garrison.onChange();
  assert.deepEqual(calls,[['crimson-hub','openGarrison']]);
});

test('Crimson Fleet is a player-facing Neon tool when the generator is active',()=>{
  const game=makeGame({isGM:false,role:1});game.modules.set('neon-odyssey-generator',{active:true});
  const calls=[];const tools=buildTools(game,d=>calls.push([d.module,d.method]));
  assert.equal(tools.fleet.title,'Crimson Fleet');
  assert.equal(tools.fleet.icon,'fa-solid fa-satellite');
  assert.equal(tools.galaxy,undefined);
  tools.fleet.onChange();
  assert.deepEqual(calls,[['neon-odyssey-generator','openFleet']]);
});

test('Galaxy Forge joins Crimson Core for GMs and stays hidden for players',()=>{
  const game=makeGame();game.modules.set('neon-odyssey-generator',{active:true});
  const calls=[];const tools=buildTools(game,d=>calls.push([d.module,d.method]));
  tools.galaxy.onChange();
  assert.deepEqual(calls,[['neon-odyssey-generator','open']]);
  const controls={};mergeControls(controls,game,()=>{});
  assert.equal(controls.crimson.title,'Crimson Core');
  game.user={isGM:false,role:1};assert.equal(buildTools(game,()=>{}).galaxy,undefined);
  game.user={isGM:true,role:4};game.modules.get('neon-odyssey-generator').active=false;
  assert.equal(buildTools(game,()=>{}).galaxy,undefined);
});
