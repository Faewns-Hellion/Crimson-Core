import {MIME,readIconPayload,validIconPath} from './library.mjs';
const imageKey=key=>typeof key==='string' && /(^|\.)(img|icon|image|src)(\.|$)/i.test(key) && !/(^|\.)(__proto__|constructor|prototype)(\.|$)/.test(key);
export function editableDocument(document,application,user=game.user){return !!document && application?.isEditable!==false && (document.isOwner || document.canUserModify?.(user,'update')) && !document.pack?.locked;}
export async function updateDocumentIcon(document,key,path,{application,user=game.user}={}){
  if(!validIconPath(path) || !imageKey(key))throw new Error('This is not a supported image field.');
  if(!editableDocument(document,application,user))throw new Error('You do not have permission to edit this image.');
  if(typeof document.pack==='string' && game.packs.get(document.pack)?.locked)throw new Error('Unlock the compendium before changing its images.');
  await document.update({[key]:path});
}
function applications(){const values=foundry.applications.instances?.values?.() || [];return [...new Set([...values,...Object.values(ui.windows || {}),game.itemCreator?.app].filter(Boolean))];}
function applicationFor(target){return applications().filter(a=>a.element?.contains?.(target) || a.element?.[0]?.contains?.(target)).sort((a,b)=>{const ae=a.element?.[0] || a.element,be=b.element?.[0] || b.element;return ae?.contains?.(be)?1:-1;})[0];}
function inputTarget(input,application){
  if(!input || input.disabled || input.readOnly || application?.isEditable===false)return null;
  const doc=application?.document || application?.object;
  if(doc?.documentName && !editableDocument(doc,application))return null;
  return {element:input,async apply(path){input.value=path;input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));}};
}
export function resolveIconTarget(target){
  if(!(target instanceof Element) || target.closest('.crimson-icons-library'))return null;
  const app=applicationFor(target);
  const featSlot=target.closest('.cf-icon-choice, .cf-preview img');
  if(featSlot && app?.blueprint && game.user.isGM){return {element:featSlot,async apply(path){app.capture?.();app.blueprint.img=path;await app.render({force:true});}};}
  const creatorSlot=target.closest('[data-action="open-icon-browser"]');
  if(creatorSlot && app?.selectedWeaponDocument && app?.overrides && game.user.isGM){return {element:creatorSlot,async apply(path){app.selectedIcon=path;app.customized.icon=true;app.overrides.icon=path;await app.render({force:true});}};}
  const input=target.closest('input[data-crimson-icon-input], input[data-edit="img"], input[data-file-picker], input[name="img"], input[name="icon"], input[name$=".img"], input[name$=".icon"], input[name$="texture.src"]');
  if(input && (input.hasAttribute('data-crimson-icon-input') || imageKey(input.name || input.dataset.edit)))return inputTarget(input,app);
  const picker=target.closest('[data-action="filePicker"], [data-action="file-picker"], [data-filepicker]');
  if(picker){const name=picker.dataset.target || picker.dataset.name || picker.dataset.filepicker;const form=picker.closest('form') || app?.element;const field=name && [...(form?.querySelectorAll('input[name]') || [])].find(i=>i.name===name);if(field && imageKey(name))return inputTarget(field,app);}
  const image=target.closest('img[data-edit], img[data-crimson-icon-key]');
  if(image){const key=image.dataset.edit || image.dataset.crimsonIconKey;if(!imageKey(key))return null;const doc=app?.document || app?.object || app?.item || app?.actor;
    if(doc?.documentName && editableDocument(doc,app))return {element:image,apply:path=>updateDocumentIcon(doc,key,path,{application:app})};
    const form=image.closest('form');const field=[...(form?.querySelectorAll('input[name]') || [])].find(i=>i.name===key);if(field)return inputTarget(field,app);
  }
  return null;
}
export function registerDrops(){
  let highlighted;
  const clear=()=>{highlighted?.classList.remove('crimson-icon-drop-target');highlighted=null;};
  const ourDrag=event=>[...(event.dataTransfer?.types || [])].includes(MIME);
  document.addEventListener('dragover',event=>{if(!ourDrag(event))return;const target=resolveIconTarget(event.target);clear();if(!target)return;event.preventDefault();event.stopPropagation();event.dataTransfer.dropEffect='copy';highlighted=target.element;highlighted.classList.add('crimson-icon-drop-target');},true);
  document.addEventListener('drop',async event=>{if(!ourDrag(event))return;const path=readIconPayload(event.dataTransfer),target=resolveIconTarget(event.target);clear();if(!path || !target)return;event.preventDefault();event.stopImmediatePropagation();try{await target.apply(path);ui.notifications.info('Icon updated.');}catch(error){console.error('Crimson Icons drop failed',error);ui.notifications.error(error.message);}},true);
  document.addEventListener('dragend',clear,true);window.addEventListener('blur',clear);
}
