// Foundry 14 indexDocument copies indexed object fields by reference from a
// Document's sealed _source. A later getIndex requesting additional fields can
// then fail while mergeObject inserts a field such as system.rarity.
// Detach index snapshots; never loosen or modify the source Document itself.
const INSTALLED=Symbol.for('crimson.compendium-index-compat');
export function immutablePaths(value,path='',seen=new WeakSet()) {
  if(!value||typeof value!=='object'||seen.has(value))return [];
  seen.add(value);
  if(!Array.isArray(value)&&Object.getPrototypeOf(value)!==Object.prototype&&Object.getPrototypeOf(value)!==null)return [];
  const result=[];
  if(!Object.isExtensible(value))result.push(path||'<entry>');
  for(const [key,child]of Object.entries(value)){
    const descriptor=Object.getOwnPropertyDescriptor(value,key);
    const next=path?`${path}.${key}`:key;
    if(descriptor&&'writable' in descriptor&&!descriptor.writable)result.push(next);
    result.push(...immutablePaths(child,next,seen));
  }
  return [...new Set(result)];
}
export function detachedCopy(value,seen=new WeakMap()) {
  if(!value||typeof value!=='object')return value;
  if(seen.has(value))return seen.get(value);
  if(value instanceof Date)return new Date(value);
  if(value instanceof Set){const out=new Set();seen.set(value,out);for(const v of value)out.add(detachedCopy(v,seen));return out;}
  if(value instanceof Map){const out=new Map();seen.set(value,out);for(const [k,v]of value)out.set(k,detachedCopy(v,seen));return out;}
  const out=Array.isArray(value)?[]:{};seen.set(value,out);
  for(const key of Object.keys(value))Object.defineProperty(out,key,{value:detachedCopy(value[key],seen),writable:true,configurable:true,enumerable:true});
  return out;
}
export function repairIndex(pack) {
  const repaired=[];
  for(const entry of pack.index?.values?.()??[]) {
    const paths=immutablePaths(entry);
    if(!paths.length)continue;
    pack.index.set(entry._id,detachedCopy(entry));
    repaired.push({id:entry._id,paths});
  }
  return repaired;
}
export function auditIndexes(packs,{repair=false}={}) {
  let entries=0;const findings=[];
  for(const pack of packs) {
    for(const entry of pack.index?.values?.()??[]) {
      entries++;
      const paths=immutablePaths(entry);
      const doc=pack.get?.(entry._id);
      const aliases=['system','flags','ownership'].filter(key=>entry[key]&&entry[key]===doc?._source?.[key]);
      if(!paths.length&&!aliases.length)continue;
      findings.push({pack:pack.collection,id:entry._id,paths,aliases});
      if(repair)pack.index.set(entry._id,detachedCopy(entry));
    }
  }
  return {at:new Date().toISOString(),packs:packs.length??packs.size,entries,repair,affectedEntries:findings.length,findings};
}
export function wrapIndexMethods(prototype,register=null) {
  if(!prototype||prototype[INSTALLED])return false;
  const wrapDocument=function(wrapped,document,...args){
    const result=wrapped(document,...args);
    const entry=this.index.get(document.id);
    if(entry)this.index.set(document.id,detachedCopy(entry));
    return result;
  };
  const wrapGet=async function(wrapped,...args){
    repairIndex(this);
    try{return await wrapped(...args);}
    catch(error){
      // A competing module may replace a cached entry while the request awaits.
      // Retry only this exact mutation failure, and only if a repair was made.
      if(!/not extensible|read.only|Cannot assign to read only/i.test(error.message)||!repairIndex(this).length)throw error;
      return wrapped(...args);
    }
  };
  if(register){register('indexDocument',wrapDocument);register('getIndex',wrapGet);}
  else for(const [name,wrapper]of [['indexDocument',wrapDocument],['getIndex',wrapGet]]){
    const original=prototype[name];prototype[name]=function(...args){return wrapper.call(this,original.bind(this),...args);};
  }
  Object.defineProperty(prototype,INSTALLED,{value:true});return true;
}
function install() {
  const cls=globalThis.CompendiumCollection??foundry.documents?.collections?.CompendiumCollection;
  if(!cls)throw Error('CompendiumCollection is unavailable for Crimson index compatibility.');
  const owner=['crimson-hub','crimson-icons','crimson-bag','crimson-drafts','crimson-random-items','crimson-feats'].find(id=>game.modules.get(id)?.active);
  const target=globalThis.CompendiumCollection?'CompendiumCollection':'foundry.documents.collections.CompendiumCollection';
  const register=globalThis.libWrapper&&owner?(name,wrapper)=>libWrapper.register(owner,`${target}.prototype.${name}`,wrapper,'WRAPPER'):null;
  wrapIndexMethods(cls.prototype,register);
  game.crimsonIndexCompat={audit:options=>auditIndexes([...game.packs],options)};
}
if(typeof Hooks!=='undefined') {
  if(game.ready)install();else Hooks.once('setup',install);
  const audit=async()=>{
    const report=game.crimsonIndexCompat?.audit({repair:true});
    if(!report)return;
    console.info('Crimson compendium index audit',report);
    if(!game.user.isGM||game.users.activeGM?.id!==game.user.id)return;
    const folder=`worlds/${game.world.id}/crimson-diagnostics`;
    const picker=foundry.applications.apps.FilePicker.implementation;
    try{await picker.createDirectory('data',folder);}catch(error){if(!/exist/i.test(error.message))console.warn('Crimson diagnostics directory',error);}
    try{await picker.upload('data',folder,new File([JSON.stringify(report,null,2)],'compendium-index-audit.json',{type:'application/json'}),{}, {notify:false});}
    catch(error){console.warn('Crimson index audit is available in game.crimsonIndexCompat instead',error);}
  };
  if(game.ready)void audit();else Hooks.once('ready',audit);
}
