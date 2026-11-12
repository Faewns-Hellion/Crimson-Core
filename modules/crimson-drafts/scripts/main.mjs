import '../../crimson-hub/scripts/controls.mjs';
import {scopeKey,saveRecord,listRecords,getRecord,deleteRecord,recoverEmergency,writeEmergency} from './store.mjs';
import {builtInAdapters} from './adapters.mjs';
import {rootOf} from './forms.mjs';
const ID='crimson-drafts',{ApplicationV2,HandlebarsApplicationMixin}=foundry.applications.api;
const adapters=builtInAdapters(),tracked=new Set(),known=new Set(),metadata=new WeakMap();let paused=0,windowInstance;
const scope=()=>scopeKey(game.world.id,game.user.id);
export function roleAllowed(user,mode='all'){return !!user && (!!user.isGM || mode==='all' || (mode==='trusted'&&Number(user.role)>=2));}
function setting(key,fallback){try{return game.settings.get(ID,key) ?? fallback;}catch{return fallback;}}
const canUse=()=>roleAllowed(game.user,setting('minimumRole','all'));
function requireAccess(){if(!canUse())throw new Error('The GM has restricted access to Crimson Drafts.');}
const error=err=>{console.error('Crimson Drafts',err);ui.notifications.error(`Draft backup/recovery: ${err.message}`);};
function adapterFor(app){return adapters.find(adapter=>{try{return adapter.match(app);}catch{return false;}});}
function recordFor(app,adapter){const raw=adapter.snapshot(app);if(raw?.then)throw new Error('Draft adapters must return a synchronous snapshot.');const snapshot=JSON.parse(JSON.stringify(raw,(_key,v)=>v instanceof Set?[...v]:v instanceof Map?Object.fromEntries(v):v));const key=String(adapter.key(app));return {version:1,id:`${scope()}:${adapter.id}:${key}`,scope:scope(),key,adapter:adapter.id,adapterLabel:adapter.label,title:String(adapter.title(app)),updatedAt:Date.now(),snapshot};}
function capture(app,{emergencyOnly=false,force=false}={}){
  if(paused||!canUse()||(!force&&!setting('automaticCapture',true)))return;const adapter=adapterFor(app);if(!adapter)return;
  try{const record=recordFor(app,adapter),fingerprint=JSON.stringify(record.snapshot),meta=metadata.get(app);if(!force&&(!meta?.initialized || !meta.interacted || (fingerprint===meta.baseline&&!meta.hasCapturedChange)))return;if(!emergencyOnly&&meta?.fingerprint===fingerprint)return;
    if(meta){meta.fingerprint=fingerprint;meta.hasCapturedChange=true;}
    if(emergencyOnly){writeEmergency(record);return;}
    void saveRecord(record).catch(err=>{if(meta)meta.fingerprint=null;error(err);});
  }catch(err){error(err);}
}
function schedule(app){if(paused)return;const meta=metadata.get(app);if(!meta)return;meta.interacted=true;clearTimeout(meta.timer);meta.timer=setTimeout(()=>capture(app),250);}
function attach(app){
  if(!canUse() || String(app.id).startsWith(ID) || !adapterFor(app))return;
  tracked.add(app);known.add(app);if(known.size>50){const old=[...known].find(a=>!rootOf(a)?.isConnected);if(old)known.delete(old);}let meta=metadata.get(app);
  if(!meta){meta={timer:null,initialized:false,interacted:false};metadata.set(app,meta);
    const originalClose=app.close.bind(app);app.close=async function(...args){clearTimeout(meta.timer);capture(this);try{return await originalClose(...args);}finally{tracked.delete(this);}};
    const originalRender=app.render.bind(app);app.render=function(...args){capture(this);return originalRender(...args);};
  }
  const root=rootOf(app);if(!root)return;
  if(!root.dataset.crimsonDrafts){root.dataset.crimsonDrafts='true';for(const event of ['input','change','keyup','pointerup'])root.addEventListener(event,()=>queueMicrotask(()=>schedule(app)),true);}
  const header=root.querySelector('.window-header');
  if(header&&!header.querySelector('[data-crimson-drafts]')){const button=document.createElement('button');button.type='button';button.dataset.crimsonDrafts='true';button.title='Crimson Drafts — backup and recovery';button.innerHTML='<i class="fa-solid fa-clock-rotate-left"></i>';button.addEventListener('click',()=>{capture(app,{force:true});openDrafts();});header.append(button);}
  if(!meta.initializing&&!meta.initialized){
    meta.initializing=true;
    try{const adapter=adapterFor(app),record=recordFor(app,adapter);meta.baseline=JSON.stringify(record.snapshot);
      void getRecord(record.id).then(async existing=>{
        meta.initialized=true;
        // Reopening a default form must never erase an earlier unsaved recovery.
        if(!existing&&!meta.interacted&&!paused){meta.fingerprint=meta.baseline;await saveRecord(record);}
        if(meta.interacted)capture(app);
      }).catch(error);
    }catch(err){error(err);}
  }
}
async function restoreRecord(record){
  requireAccess();
  if(!record || record.scope!==scope())throw new Error('This draft belongs to another world or user.');
  const adapter=adapters.find(a=>a.id===record.adapter);if(!adapter)throw new Error('The recovery adapter for this application is unavailable.');
  for(const app of tracked){if(adapterFor(app)?.id!==record.adapter)continue;const current=recordFor(app,adapter);if(current.key===record.key && JSON.stringify(current.snapshot)!==JSON.stringify(record.snapshot))await saveRecord({...current,id:current.id+':checkpoint:'+Date.now(),title:current.title+' (before recovery)'});}
  paused++;
  try{const app=await adapter.restore(record.snapshot);if(app){attach(app);const meta=metadata.get(app);if(meta){meta.baseline=JSON.stringify(recordFor(app,adapter).snapshot);meta.fingerprint=meta.baseline;meta.interacted=false;meta.hasCapturedChange=false;}}ui.notifications.info('Recovery window opened. Review restored fields and any editor recovery notes before saving.');return app;}
  finally{paused--;}
}
export class DraftLibrary extends HandlebarsApplicationMixin(ApplicationV2){
  static DEFAULT_OPTIONS={id:ID,classes:['crimson-drafts'],window:{title:'Crimson Drafts',resizable:true},position:{width:900,height:680},actions:{inspect:DraftLibrary.inspect,refresh:DraftLibrary.refresh,restore:DraftLibrary.restore,export:DraftLibrary.export,discard:DraftLibrary.discard,import:DraftLibrary.import}};
  static PARTS={main:{template:`modules/${ID}/templates/library.hbs`}};
  constructor(){super();this.query='';}
  async _prepareContext(){if(!canUse())return {query:'',count:0,records:[],error:'The GM has restricted access to Crimson Drafts.'};const words=this.query.toLowerCase().trim().split(/\s+/).filter(Boolean),rows=await listRecords(scope());return {query:this.query,count:rows.length,records:rows.filter(r=>words.every(w=>`${r.title} ${r.adapterLabel}`.toLowerCase().includes(w))).map(r=>({id:r.id,title:r.title,adapter:r.adapterLabel,date:new Date(r.updatedAt).toLocaleString(),fields:r.snapshot.fields?.length,summary:r.snapshot.blueprint?`${r.snapshot.blueprint.activities?.length || 0} authored activities · ${r.snapshot.blueprint.effects?.length || 0} effects`:r.snapshot.state?'Full Item Creator draft':r.snapshot.draft?'Full Forge preview and swap state':`${r.snapshot.fields?.length || 0} fields · accessible state${r.snapshot.publicState?.truncated?' (partial)':''}` })),error:this.error};}
  _onRender(context,options){super._onRender(context,options);const search=this.element.querySelector('[name="search"]');search.addEventListener('input',()=>{clearTimeout(this.timer);this.timer=setTimeout(async()=>{this.query=search.value;this.refocus=true;await this.render();},180);});if(this.refocus){search.focus();search.setSelectionRange(search.value.length,search.value.length);this.refocus=false;}}
  static async refresh(){for(const app of tracked)capture(app);await this.render();}
  static async inspect(_event,target){requireAccess();const record=await getRecord(target.dataset.id);if(record?.scope!==scope())return;const escaped=JSON.stringify(record.snapshot,null,2).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));await foundry.applications.api.DialogV2.wait({id:'crimson-drafts-inspector',window:{title:record.title+' — recovery data'},position:{width:800,height:600},content:`<p>Captured fields, accessible state, source data and any readable editor/canvas backups.</p><textarea readonly style="width:100%;height:420px;font-family:monospace">${escaped}</textarea>`,buttons:[{action:'close',label:'Close',default:true}],rejectClose:false});}
  static async restore(_event,target){try{await restoreRecord(await getRecord(target.dataset.id));this.error=null;}catch(err){this.error=err.message;}await this.render();}
  static async export(_event,target){try{requireAccess();const record=await getRecord(target.dataset.id);if(record?.scope!==scope())return;saveDataToFile(JSON.stringify({format:ID,version:1,record},null,2),'application/json',`crimson-draft-${Date.now()}.json`);}catch(err){this.error=err.message;await this.render();}}
  static async discard(_event,target){requireAccess();const record=await getRecord(target.dataset.id);if(record?.scope!==scope())return;const accepted=await foundry.applications.api.DialogV2.confirm({window:{title:'Discard recovery copy?'},content:'<p>Delete this recovery copy? The original document and any open editing window are not changed.</p>'});if(accepted){await deleteRecord(record.id);await this.render();}}
  static async import(){requireAccess();const input=document.createElement('input');input.type='file';input.accept='.json';input.addEventListener('change',async()=>{try{const data=JSON.parse(await input.files[0].text());if(data.format!==ID||data.version!==1||!data.record?.snapshot)throw new Error('Choose a Crimson Drafts recovery JSON file.');const record={...data.record,id:`${scope()}:import:${Date.now()}`,scope:scope(),updatedAt:Date.now(),title:data.record.title+' (imported)'};await saveRecord(record);this.error=null;}catch(err){this.error=err.message;}await this.render();});input.click();}
  async close(options){clearTimeout(this.timer);return super.close(options);}
}
export function openDrafts(){requireAccess();if(!windowInstance)windowInstance=new DraftLibrary();windowInstance.render({force:true});return windowInstance;}
async function importLegacy(){try{const legacy=JSON.parse(localStorage.getItem('crimson-item-creator-draft-v1') || 'null');if(legacy?.format!=='item-creator-recovery')return;const id=`${scope()}:item-creator:new`,existing=await getRecord(id),updatedAt=Date.parse(legacy.savedAt)||Date.now();if(!existing||existing.updatedAt<updatedAt)await saveRecord({id,version:1,scope:scope(),key:'new',adapter:'item-creator',adapterLabel:'Item Creator',title:legacy.state?.itemName || 'Recovered item',updatedAt,snapshot:{state:legacy.state,documents:legacy.documents}});}catch(err){console.warn('Legacy item draft migration skipped',err);}}
export async function start(){
  if(game.crimsonDrafts)return game.crimsonDrafts;
  if(!document.querySelector('link[data-crimson-drafts]')){const link=document.createElement('link');link.rel='stylesheet';link.href=`modules/${ID}/styles/drafts.css`;link.dataset.crimsonDrafts='true';document.head.append(link);}
  const api={open:openDrafts,backup:app=>capture(app,{force:true}),restore:async id=>restoreRecord(await getRecord(id)),list:()=>{requireAccess();return listRecords(scope());},findApplication:snapshot=>[...new Set([...foundry.applications.instances.values(),...Object.values(ui.windows||{}),...known])].find(a=>a.constructor.name===snapshot.appClass&&a.id===snapshot.appId)||[...known].find(a=>a.constructor.name===snapshot.appClass&&(a.title||a.options?.window?.title)===snapshot.title),registerAdapter:adapter=>{if(!adapter.id||!adapter.match||!adapter.snapshot||!adapter.restore||!adapter.key||!adapter.title)throw new Error('Incomplete draft adapter.');adapters.unshift(adapter);for(const app of foundry.applications.instances.values())attach(app);}};
  game.crimsonDrafts=api;const module=game.modules.get(ID);if(module)module.api=api;
  for(const hook of ['renderApplication','renderApplicationV1','renderApplicationV2'])Hooks.on(hook,app=>attach(app));
  Hooks.on('getSceneControlButtons',controls=>{controls[ID]={name:ID,title:'Drafts',icon:'fa-solid fa-clock-rotate-left',order:96,visible:canUse(),activeTool:'browse',onChange:(_event,active)=>{if(active)openDrafts();},tools:{browse:{name:'browse',title:'Draft recovery',icon:'fa-solid fa-file-pen',order:0,onChange:()=>{}},open:{name:'open',title:'Open Drafts',icon:'fa-solid fa-up-right-from-square',order:1,button:true,onChange:()=>openDrafts()}}};});
  window.addEventListener('beforeunload',()=>{for(const app of tracked)capture(app,{emergencyOnly:true});});
  await recoverEmergency(scope());await importLegacy();
  for(const app of new Set([...foundry.applications.instances.values(),...Object.values(ui.windows || {}),game.itemCreator?.app].filter(Boolean)))attach(app);
  if(canvas?.ready)ui.controls.render({force:true,reset:true});return api;
}
Hooks.once('init',()=>{
  game.settings.register(ID,'minimumRole',{name:'Draft recovery access',hint:'Controls who can use automatic backups and recovery. Existing document ownership still applies.',scope:'world',config:true,type:String,default:'all',choices:{gm:'GM only',trusted:'GM + trusted players',all:'Everyone'},onChange:()=>{for(const app of foundry.applications.instances.values())attach(app);if(canvas?.ready)ui.controls.render({force:true,reset:true});}});
  game.settings.register(ID,'automaticCapture',{name:'Automatic draft capture',hint:'Keep recent editing states on this device.',scope:'client',config:true,type:Boolean,default:true});
  game.settings.registerMenu(ID,'recovery',{name:'Crimson Drafts',label:'Open Draft Recovery',hint:'Recover recent editing states stored on this client.',icon:'fas fa-clock-rotate-left',type:DraftLibrary,restricted:false});
});
if(game.ready)void start().catch(error);else Hooks.once('ready',()=>{void start().catch(error);});
