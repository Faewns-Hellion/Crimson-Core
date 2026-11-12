// Shared navigation and sealed-index compatibility. Existing modules import
// this ESM once; artwork and icon generation stay with their own modules.
import './compendium-index.mjs';
import './spellbook-button.mjs';
export const HUB = 'crimson';
const DEFINITIONS = [
  {name:'galaxy',module:'neon-odyssey-generator',title:'Crimson Galaxy Forge',icon:'fa-solid fa-user-astronaut',method:'open',gm:true},
  {name:'fantasy',module:'crimson-fantasy-generator',title:'Crimson Fantasy Forge',icon:'fa-solid fa-scroll',method:'open',gm:true},
  {name:'board',module:'neon-odyssey-generator',title:'Contract Network',icon:'fa-solid fa-satellite-dish',method:'openBoard'},
  {name:'fleet',module:'neon-odyssey-generator',title:'Crimson Fleet',icon:'fa-solid fa-satellite',method:'openFleet'},
  {name:'adaptations',module:'crimson-adaptations',title:'Crimson Adaptations',icon:'fa-solid fa-dna',method:'open'},
  {name:'obsidian',module:'crimson-obsidian',title:'Obsidian Vault',icon:'fa-solid fa-book-atlas',method:'open'},
  {name:'bag', module:'crimson-bag', title:'Crimson Bag', icon:'fa-solid fa-sack', method:'open'},
  {name:'forge', module:'crimson-random-items', title:'Crimson Forge', icon:'fa-solid fa-dice-d20', method:'open', gm:true},
  {name:'hunt', module:'crimson-heliana-hunt', title:"Heliana's Hunt", icon:'fa-solid fa-paw', method:'open'},
  {name:'quests', module:'crimson-hub', title:'Quest Board', icon:'fa-solid fa-scroll', method:'openQuests'},
  {name:'garrison', module:'crimson-hub', title:'Crimson Garrison', icon:'fa-solid fa-shield-halved', method:'openGarrison'},
  {name:'rivals', module:'crimson-rivals', title:'Crimson Rivals', icon:'fa-solid fa-skull', method:'open'},
  {name:'mechanic',module:'crimson-mechanic',title:'Crimson Mechanic',icon:'fa-solid fa-rocket',method:'open'},
  {name:'shipwright',module:'crimson-shipwright',title:'Crimson Shipwright',icon:'fa-solid fa-sailboat',method:'open'},
  {name:'feats', module:'crimson-feats', title:'Crimson Feats', icon:'fa-solid fa-fire', method:'open', gm:true},
  {name:'library', module:'crimson-feats', title:'Crimson Content Library', icon:'fa-solid fa-book-open', method:'library', gm:true},
  {name:'icons', module:'crimson-icons', title:'Crimson Icons', icon:'fa-solid fa-images', method:'open'},
  {name:'drafts', module:'crimson-drafts', title:'Crimson Draft Recovery', icon:'fa-solid fa-clock-rotate-left', method:'open'}
];
export function buildTools(game, invoke) {
  const entries = DEFINITIONS.filter(d => {
    if (!game.modules.get(d.module)?.active || (d.gm && !game.user.isGM)) return false;
    if (d.name !== 'drafts' || game.user.isGM) return true;
    const role = game.settings.get('crimson-drafts','minimumRole');
    return role === 'all' || (role === 'trusted' && Number(game.user.role) >= 2);
  });
  if (game.modules.get('crimson-dragon-theme')?.active && game.user.isGM) entries.push({
    name:'theme',title:'Crimson Interface Settings',icon:'fa-solid fa-palette',settings:true
  });
  return Object.fromEntries(entries.map((d,order) => [d.name, {
    name:d.name,title:d.title,icon:d.icon,order,visible:true,button:true,onChange:()=>invoke(d)
  }]));
}
export function mergeControls(controls, game, invoke) {
  for (const id of ['crimson-icons','crimson-drafts','crimson-bag','crimson-feats','crimson-random-items']) delete controls[id];
  const tools = buildTools(game,invoke);
  if (!Object.keys(tools).length) return;
  controls[HUB] = {name:HUB,title:'Crimson Core',icon:'fa-solid fa-dragon',order:95,visible:true,activeTool:'home',tools:{
    home:{name:'home',title:'Crimson Core',icon:'fa-solid fa-dragon',order:-1,visible:true,onChange:()=>{}},...tools
  }};
}
async function invoke(definition) {
  try {
    if (definition.settings) return game.settings.sheet.render(true);
    const api = game.modules.get(definition.module)?.api;
    if (typeof api?.[definition.method] !== 'function') throw new Error(`${definition.title} is still loading or unavailable.`);
    await api[definition.method]();
  } catch (error) {console.error('Crimson Tools',error);ui.notifications.error(error.message);}
}
function install() {
  if (game.crimsonCore || game.crimsonHub) return;
  const core = {refresh:()=>ui.controls?.render({force:true,reset:true}),openQuests:async()=>{const {open}=await import('./quest-board.mjs');core.openQuests=open;return open();},openGarrison:async()=>{const {open}=await import('./garrison.mjs');core.openGarrison=open;return open();}};
  game.crimsonCore = game.crimsonHub = core;
  import('./quest-board.mjs').then(({open,init})=>{core.openQuests=open;init?.();}).catch(error=>console.error('Crimson Quest Board failed to load',error));
  import('./garrison.mjs').then(({open,init})=>{core.openGarrison=open;init?.();}).catch(error=>console.error('Crimson Garrison failed to load',error));
  const stylesheet='modules/crimson-hub/styles/core.css';
  if(!document.querySelector('link[data-crimson-core]')){
    const link=document.createElement('link');link.rel='stylesheet';link.dataset.crimsonCore='true';
    link.href=foundry.utils.getRoute(stylesheet);document.head.append(link);
  }
  const module=game.modules.get('crimson-hub');if(module)module.api=game.crimsonCore;
  // Run last, after Icons and Drafts register their original navigation hooks.
  setTimeout(()=>{
    Hooks.on('getSceneControlButtons',controls=>mergeControls(controls,game,invoke));
    for (const button of document.querySelectorAll('[data-crimson-forge], [data-crimson-feats]')) button.remove();
    game.crimsonHub.refresh();
  },0);
}
if (typeof Hooks !== 'undefined') {
  if (game.ready) install(); else Hooks.once('ready',install);
}
