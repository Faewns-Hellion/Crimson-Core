import test from 'node:test';
import assert from 'node:assert/strict';
import {wrapIndexMethods,auditIndexes,repairIndex,detachedCopy} from '../scripts/compendium-index.mjs';
class Pack {
  constructor(name='world.items'){this.collection=name;this.index=new Map();this.documents=new Map();}
  get(id){return this.documents.get(id);}
  indexDocument(doc){this.documents.set(doc.id,doc);this.index.set(doc.id,{_id:doc.id,system:doc._source.system,flags:doc._source.flags});}
  async getIndex(){for(const entry of this.index.values())Object.assign(entry.system,{rarity:'rare'});return this.index;}
}
test('reproduces the Fighter equipment failure and detaches index snapshots without changing the document',async()=>{
  const pack=new Pack(),system=Object.seal({type:Object.freeze({value:'weapon'})}),doc={id:'sword',_source:{system,flags:{}}};
  pack.indexDocument(doc);
  await assert.rejects(()=>pack.getIndex(),/not extensible/);
  wrapIndexMethods(Pack.prototype);
  await pack.getIndex();
  assert.equal(pack.index.get('sword').system.rarity,'rare');
  assert.equal(doc._source.system.rarity,undefined);assert.equal(Object.isSealed(doc._source.system),true);
  assert.notEqual(pack.index.get('sword').system,doc._source.system);
  const second={id:'shield',_source:{system:Object.freeze({type:{value:'shield'}}),flags:{}}};
  pack.indexDocument(second);await pack.getIndex();
  assert.equal(pack.index.get('shield').system.rarity,'rare');assert.notEqual(pack.index.get('shield').system.type,second._source.system.type);
});
test('audit catches the same risk across Item and Actor packs and repairs only cached copies',()=>{
  const one=new Pack('world.items'),two=new Pack('world.actors');
  one.index.set('a',{_id:'a',system:Object.freeze({type:{}})});
  const flags={nested:{value:1}},doc={id:'b',_source:{system:{},flags}};
  two.documents.set('b',doc);two.index.set('b',{_id:'b',flags});
  const before=auditIndexes([one,two]);assert.equal(before.affectedEntries,2);assert.equal(Object.isFrozen(one.index.get('a').system),true);
  auditIndexes([one,two],{repair:true});const after=auditIndexes([one,two]);assert.equal(after.affectedEntries,0);
  assert.equal(doc._source.flags,flags);assert.notEqual(two.index.get('b').flags,flags);
});
test('copy preserves collection fields, and unrelated indexing errors are not swallowed',async()=>{
  const source={properties:new Set(['mgc']),values:new Map([['x',{n:1}]])};const copy=detachedCopy(source);
  assert.deepEqual(copy,source);assert.notEqual(copy.properties,source.properties);assert.notEqual(copy.values.get('x'),source.values.get('x'));
  class Broken{constructor(){this.index=new Map();}indexDocument(){}async getIndex(){throw Error('Permission denied');}}
  wrapIndexMethods(Broken.prototype);await assert.rejects(()=>new Broken().getIndex(),/Permission denied/);
});
