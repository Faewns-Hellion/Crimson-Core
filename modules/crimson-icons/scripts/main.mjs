import {loadIconCatalogue,matchItemIcon} from './matching.mjs';
import '../../crimson-hub/scripts/controls.mjs';
import {ID,MIME,makeIconPayload,filterIcons} from './library.mjs';
import {registerDrops,resolveIconTarget} from './drops.mjs';
import {applyIconPlan} from './reassign.mjs';
const {ApplicationV2,HandlebarsApplicationMixin}=foundry.applications.api;
let catalogue,windowInstance,opening;
export class IconLibrary extends HandlebarsApplicationMixin(ApplicationV2){
  static DEFAULT_OPTIONS={id:ID,classes:['crimson-icons-library'],window:{title:'Crimson Icons',resizable:true},position:{width:790,height:680},actions:{next:IconLibrary.next,previous:IconLibrary.previous,copy:IconLibrary.copy}};
  static PARTS={main:{template:`modules/${ID}/templates/library.hbs`}};
  constructor(){super();this.query='';this.folder='all';this.page=0;}
  async _prepareContext(){
    if(!catalogue)catalogue=await loadIconCatalogue();
    const results=filterIcons(catalogue,this),pages=Math.max(1,Math.ceil(results.length/90));this.page=Math.max(0,Math.min(this.page,pages-1));
    return {query:this.query,count:results.length,total:catalogue.length,page:this.page+1,pages,first:this.page===0,last:this.page===pages-1,
      folders:['all',...new Set(catalogue.map(p=>p.split('/')[1]))].map(value=>({value,label:value==='all'?'All folders':value,selected:this.folder===value})),
      icons:results.slice(this.page*90,(this.page+1)*90).map(path=>({path,label:path.split('/').at(-1).replace(/\.[^.]+$/,'').replaceAll('-',' ')}))};
  }
  _onRender(context,options){super._onRender(context,options);
    const search=this.element.querySelector('[name="search"]');search.addEventListener('input',()=>{clearTimeout(this.timer);this.timer=setTimeout(async()=>{this.query=search.value;this.page=0;this.refocus=true;await this.render();},160);});
    this.element.querySelector('[name="folder"]').addEventListener('change',async e=>{this.folder=e.target.value;this.page=0;await this.render();});
    if(this.refocus){search.focus();search.setSelectionRange(search.value.length,search.value.length);this.refocus=false;}
    for(const button of this.element.querySelectorAll('[data-icon]'))button.addEventListener('dragstart',event=>{
      const payload=makeIconPayload(button.dataset.icon);event.dataTransfer.setData(MIME,payload);event.dataTransfer.setData('text/plain',payload);event.dataTransfer.effectAllowed='copy';event.dataTransfer.setDragImage(button,32,32);
    });
  }
  static async next(){this.page++;await this.render();}static async previous(){this.page--;await this.render();}
  static async copy(_event,target){try{await navigator.clipboard.writeText(target.dataset.icon);ui.notifications.info('Icon path copied.');}catch{ui.notifications.warn('Clipboard unavailable. Drag the icon onto an image slot instead.');}}
  async close(options){clearTimeout(this.timer);return super.close(options);}
}
export function openIcons(){if(!windowInstance)windowInstance=new IconLibrary();if(!opening)opening=Promise.resolve(windowInstance.render({force:true})).catch(error=>{console.error('Crimson Icons could not open',error);ui.notifications.error(error.message);}).finally(()=>{opening=null;});return windowInstance;}
function controls(controls){
  controls[ID]={name:ID,title:'Icons',icon:'fa-solid fa-icons',order:95,visible:true,activeTool:'browse',
    onChange:(_event,active)=>{if(active)openIcons();},tools:{browse:{name:'browse',title:'Icon Library',icon:'fa-solid fa-images',order:0,visible:true,onChange:()=>{}},open:{name:'open',title:'Open Icons',icon:'fa-solid fa-up-right-from-square',order:1,visible:true,button:true,onChange:()=>openIcons()},reassign:{name:'reassign',title:'Reassign Item Icons',icon:'fa-solid fa-wand-magic-sparkles',order:2,visible:true,button:true,onChange:()=>applyIconPlan()}}};
}
async function ensureIconMacro(){
  const command=`(async()=>{const {applyIconPlan}=await import('modules/crimson-icons/scripts/reassign.mjs');await applyIconPlan();})();`;
  const existing=game.macros.find(macro=>macro.name==='Reassign Item Icons'&&macro.type==='script');
  if(existing){if(existing.command!==command)await existing.update({command});return existing;}
  return Macro.create({name:'Reassign Item Icons',type:'script',img:'icons/svg/upgrade.svg',command,scope:'global'});
}

export function start(){
  if(game.crimsonIcons)return game.crimsonIcons;
  // Also supports a GM-only, session-local import without a world reload.
  if(!document.querySelector('link[data-crimson-icons]')){const link=document.createElement('link');link.rel='stylesheet';link.href=`modules/${ID}/styles/icons.css`;link.dataset.crimsonIcons='true';document.head.append(link);}
  registerDrops();Hooks.on('getSceneControlButtons',controls);
  const api={open:openIcons,resolveTarget:resolveIconTarget,matchItem:matchItemIcon,catalogue:loadIconCatalogue,applyIconPlan};game.crimsonIcons=api;if(game.user?.isGM)ensureIconMacro();const module=game.modules.get(ID);if(module)module.api=api;
  if(canvas?.ready)ui.controls.render({force:true,reset:true});return api;
}
if(game.ready)start();else Hooks.once('ready',start);
