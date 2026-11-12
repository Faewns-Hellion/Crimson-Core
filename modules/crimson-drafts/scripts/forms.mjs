export function rootOf(app){return app.element?.[0] || app.element;}
const secret=key=>/password|secret|access.?token|api.?key|authorization/i.test(key);
function elements(root){
  if(!root)return [];
  const rows=[...root.querySelectorAll('input,textarea,select,prose-mirror,[data-field],[contenteditable="true"]')].filter(e=>!e.closest('prose-mirror')||e.tagName==='PROSE-MIRROR');
  for(const node of root.querySelectorAll('*'))if(node.shadowRoot)rows.push(...elements(node.shadowRoot));return [...new Set(rows)];
}
function typeOf(e){return e.tagName==='PROSE-MIRROR'?'richtext':e.isContentEditable||e.getAttribute('contenteditable')==='true'?'contenteditable':e.type || e.tagName.toLowerCase();}
function signature(e){return [e.tagName,e.getAttribute('aria-label') || '',e.getAttribute('placeholder') || '',e.getAttribute('role') || ''].join('|');}
function identity(e,index){
  if(e.dataset?.field)return {strategy:'field',key:e.dataset.field};
  if(e.getAttribute('name')||e.dataset?.edit)return {strategy:'name',key:e.getAttribute('name')||e.dataset.edit};
  if(e.id)return {strategy:'id',key:e.id};return {strategy:'index',key:String(index)};
}
export function snapshotForm(root){
  const rows=[];for(const [index,e] of elements(root).entries()){
    const {strategy,key}=identity(e,index),type=typeOf(e);if(secret(key)||e.disabled||e.readOnly||['password','file','submit','button','reset'].includes(type))continue;
    if(!('value' in e)&&!['contenteditable','richtext'].includes(type))continue;
    const value=type==='checkbox'||type==='radio'?e.checked:type==='contenteditable'?e.innerHTML:e.multiple?[...e.selectedOptions].map(o=>o.value):String(e.value ?? '');
    rows.push({strategy,key,type,signature:signature(e),option:type==='radio'?e.value:null,value});
  }
  return rows;
}
function safeHTML(html){const doc=new DOMParser().parseFromString(String(html),'text/html');for(const e of doc.querySelectorAll('script,iframe,object,embed'))e.remove();for(const e of doc.querySelectorAll('*'))for(const a of [...e.attributes])if(/^on/i.test(a.name)||a.name==='srcdoc'||(/^(href|src|action|formaction)$/i.test(a.name)&&/^\s*javascript:/i.test(a.value)))e.removeAttribute(a.name);return doc.body.innerHTML;}
export function restoreForm(root,rows){
  let restored=0,skipped=0;const list=elements(root);
  for(const row of rows){if(secret(row.key))continue;
    const e=list.find((node,index)=>{const info=identity(node,index);return info.strategy===row.strategy&&info.key===row.key&&typeOf(node)===row.type&&(row.strategy!=='index'||signature(node)===row.signature)&&(row.type!=='radio'||node.value===row.option);});
    if(!e||e.disabled||e.readOnly){skipped++;continue;}
    if(row.type==='richtext'){
      if(e.hasAttribute('collaborate')&&e.getAttribute('collaborate')!=='false'){skipped++;continue;}
      const replacement=e.cloneNode(false);replacement.setAttribute('value',safeHTML(row.value));replacement.value=safeHTML(row.value);e.replaceWith(replacement);
    }else if(row.type==='contenteditable'){
      if(e.closest('.ProseMirror,.monaco-editor,.cm-editor,.CodeMirror')){skipped++;continue;}e.innerHTML=safeHTML(row.value);
    }else if(row.type==='checkbox'||row.type==='radio')e.checked=!!row.value;
    else if(e.multiple){for(const option of e.options)option.selected=row.value.includes(option.value);}
    else e.value=row.value;
    restored++;
  }
  return {restored,skipped};
}
const excluded=new Set(['element','form','options','window','position','tabGroups','busy','loading','saving','pending','_state','_priorState','_element','_events','_listeners','_application','_rendered','_renderContext','_tabs','_dragDrop','_scrollPositions','_popOut']);
export function snapshotPublicState(app){
  const seen=new WeakSet();let nodes=0,truncated=false;
  function clone(value,depth=0){
    if(value===null||['string','number','boolean'].includes(typeof value))return value;
    if(typeof value!=='object'||value instanceof Promise||(typeof Node!=='undefined'&&value instanceof Node)||depth>9||nodes++>12000){if(depth>9||nodes>12000)truncated=true;return undefined;}
    if(seen.has(value))return undefined;seen.add(value);
    if(value.documentName&&value.uuid)return {documentUuid:value.uuid,documentName:value.documentName};
    if(value instanceof Set)return [...value].map(v=>clone(v,depth+1));if(value instanceof Map)return Object.fromEntries([...value].map(([k,v])=>[k,clone(v,depth+1)]));
    if(Array.isArray(value))return value.map(v=>clone(v,depth+1));
    const result={};for(const [key,v] of Object.entries(value)){if(secret(key)||excluded.has(key)||['__proto__','prototype','constructor'].includes(key)||typeof v==='function')continue;const copied=clone(v,depth+1);if(copied!==undefined)result[key]=copied;}return result;
  }
  const state={};for(const [key,value] of Object.entries(app)){if(secret(key)||excluded.has(key)||typeof value==='function'||['__proto__','prototype','constructor'].includes(key))continue;const copied=clone(value);if(copied!==undefined)state[key]=copied;}
  return {state,truncated};
}
export function restorePublicState(app,state){
  function merge(current,saved,depth=0){if(depth>9)return current;if(saved===null||typeof saved!=='object')return saved;if(saved.documentUuid)return current;
    if(Array.isArray(saved))return saved.map((v,i)=>merge(current?.[i],v,depth+1));
    if(current&&Object.getPrototypeOf(current)!==Object.prototype&&Object.getPrototypeOf(current)!==null)return current;
    const result={...(current||{})};for(const [key,value] of Object.entries(saved)){if(secret(key)||excluded.has(key)||['__proto__','prototype','constructor'].includes(key))continue;result[key]=merge(current?.[key],value,depth+1);}return result;
  }
  for(const [key,value] of Object.entries(state || {})){if(excluded.has(key)||secret(key)||['__proto__','prototype','constructor'].includes(key))continue;const descriptor=Object.getOwnPropertyDescriptor(app,key);if(descriptor?.writable===false||descriptor?.get)continue;try{app[key]=merge(app[key],value);}catch{}}
}
export function snapshotVisuals(root){const canvases=[];for(const canvas of root?.querySelectorAll('canvas') || []){if(canvas.width*canvas.height>4000000)continue;try{canvases.push({width:canvas.width,height:canvas.height,image:canvas.toDataURL('image/webp',0.85)});}catch{}}
  const editors=[];for(const element of root?.querySelectorAll('.CodeMirror,.cm-content,.monaco-editor') || []){let text;try{text=element.CodeMirror?.getValue?.() || element.innerText;}catch{}if(text)editors.push({className:element.className,text});}
  try{for(const editor of globalThis.monaco?.editor?.getEditors?.() || [])if(root.contains(editor.getDomNode()))editors.push({className:'Monaco model',text:editor.getModel()?.getValue(),uri:String(editor.getModel()?.uri || '')});}catch{}
  return {canvases,editors,svg:[...(root?.querySelectorAll('svg')||[])].slice(0,10).map(e=>e.outerHTML)};
}
