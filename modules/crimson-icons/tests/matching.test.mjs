import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {rankItemIcons,matchItemIcon} from '../scripts/matching.mjs';
const catalogue=JSON.parse(fs.readFileSync(new URL('../data/icons.json',import.meta.url),'utf8'));
test('semantic matching chooses the object category and preserves authored art',async()=>{
  const cases=[['sentient sword',/weapons\/swords\//],['rubber chicken',/creatures\/birds\/chicken/],['live goose',/creatures\/birds\/duck/],['jar of stolen luck',/potions\/.*jar/],['dwarven sex manual',/sundries\/books\//],['pair of enchanted handcuffs',/cuffs/],['time machine',/clock/],['black hole in a jam jar',/cosmos/],['Gold Key',/key-gold/]];
  for(const [name,expected]of cases)assert.match(rankItemIcons(catalogue,{name,type:'loot'})[0].path,expected,name);
  assert.equal(await matchItemIcon({name:'Sword',img:'worlds/custom/heirloom.webp'}),'worlds/custom/heirloom.webp');
});
test('the generated base object takes precedence over its random adjectives',()=>{
  const item={name:'blood-soaked divine chicken',flags:{'crimson-bag':{object:'rubber chicken'}},type:'loot'};
  assert.match(rankItemIcons(catalogue,item)[0].path,/creatures\/birds\/chicken/);
});
