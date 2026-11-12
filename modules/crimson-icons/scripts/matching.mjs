// Shared, read-only matching against the same catalogue shown in Crimson Icons.
let cataloguePromise;
export function loadIconCatalogue() {
  cataloguePromise??=fetch('modules/crimson-icons/data/icons.json').then(r=>{
    if(!r.ok)throw Error('Crimson Icons catalogue unavailable.');return r.json();
  }).catch(error=>{cataloguePromise=null;throw error;});
  return cataloguePromise;
}
const words=value=>String(value??'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().split(/\s+/).filter(Boolean);
const RULES=[
  [/\b(?:sword|greatsword|blade)\b/,['weapons','swords']],
  [/\b(?:whip|vines)\b/,['weapons','whip']],
  [/\b(?:dagger|karambit|knife|razor)\b/,['weapons','dagger']],
  [/\b(?:dildo|vibrator)\b/,['weapons','wands']],
  [/\b(?:warhead)\b/,['weapons','ammunition','rocket']],
  [/\b(?:bomb|grenade)\b/,['weapons','ammunition','grenade']],
  [/\b(?:time machine)\b/,['commodities','tech','clock']],
  [/\b(?:space station|time machine|mech|tank|vending machine|chainsaw)\b/,['commodities','tech']],
  [/\b(?:shark)\b/,['creatures','fish','shark']],
  [/\b(?:goldfish|fish)\b/,['environment','creatures','fish']],
  [/\b(?:goose|duck)\b/,['creatures','birds','duck']],
  [/\b(?:chicken|bird)\b/,['creatures','birds','chicken']],
  [/\b(?:egg)\b/,['consumables','eggs']],
  [/\b(?:bottle|whiskey|sweat|cure)\b/,['consumables','potions']],
  [/\b(?:cheese|sandwich|food)\b/,['consumables','food']],
  [/\b(?:mushroom)\b/,['consumables','mushrooms']],
  [/\b(?:book|manual)\b/,['sundries','books']],
  [/\b(?:tax|audit|invoice|contract|deed)\b/,['sundries','documents','letter']],
  [/\b(?:tapestry)\b/,['commodities','cloth']],
  [/\b(?:scroll|wish)\b/,['sundries','scrolls']],
  [/\b(?:boot|sock)\b/,['equipment','feet']],
  [/\b(?:crown)\b/,['equipment','head','crown']],
  [/\b(?:ring)\b/,['equipment','finger']],
  [/\b(?:teeth|tooth|skull|bones)\b/,['commodities','bones']],
  [/\b(?:thunderstorm|lightning|storm)\b/,['magic','lightning']],
  [/\b(?:volcano|fire)\b/,['magic','fire']],
  [/\b(?:black hole|planet|moon|universe|dimension|constellation|sun|cosmic)\b/,['environment','cosmos']],
  [/\b(?:ship|fleet|battleship)\b/,['environment','settlement','ship']],
  [/\b(?:horse)\b/,['environment','creatures','horse']],
  [/\b(?:wand)\b/,['weapons','wands']],
  [/\b(?:jar)\b/,['consumables','potions','jar']],
  [/\b(?:brick|marble|orb|glass|disco ball)\b/,['commodities','materials']],
  [/\b(?:toilet|chamber pot|kitchen sink|bong)\b/,['containers','kitchenware']],
  [/\b(?:handcuffs)\b/,['sundries','survival','cuffs']],
  [/\b(?:chain)\b/,['commodities','metal','chain']],
  [/\b(?:key)\b/,['sundries','misc','key']]
];
const TYPE_TERMS={weapon:['weapons'],equipment:['equipment'],consumable:['consumables'],spell:['magic'],feat:['skills'],tool:['tools'],loot:['commodities'],container:['containers'],backpack:['containers','bags']};
export function rankItemIcons(paths,item={}) {
  const name=item.flags?.['crimson-bag']?.object??item.name??'';
  const query=words(name),rule=RULES.find(([pattern])=>pattern.test(name.toLowerCase()));
  const desired=rule?.[1]??TYPE_TERMS[item.type]??['commodities'];
  let candidates=paths.filter(p=>!p.includes('/svg/'));
  if(rule){const category=candidates.filter(path=>desired.slice(0,2).every(w=>words(path).includes(w)));if(category.length)candidates=category;}
  return candidates.map(path=>{
    const tokens=words(path),base=words(path.split('/').at(-1).replace(/\.[^.]+$/,''));
    let score=desired.reduce((s,w)=>s+(tokens.includes(w)?12:0),0);
    for(const w of query)if(w.length>2)score+=base.includes(w)?45:tokens.includes(w)?3:0;
    // Prefer a matching object category over an unrelated icon sharing its colour.
    if(desired[0]&&tokens.includes(desired[0]))score+=10;
    if(/\b(?:broken|cracked)\b/.test(base.join(' '))&&!/\b(?:broken|cracked)\b/.test(name))score-=15;
    return {path,score};
  }).sort((a,b)=>b.score-a.score||a.path.localeCompare(b.path));
}
export async function matchItemIcon(item,{force=false}={}) {
  const current=item.img;
  if(!force&&current&&!/^(?:icons\/svg\/|systems\/dnd5e\/icons\/svg\/)/.test(current))return current;
  return rankItemIcons(await loadIconCatalogue(),item)[0]?.path??current??'icons/containers/bags/pack-leather-white-tan.webp';
}
