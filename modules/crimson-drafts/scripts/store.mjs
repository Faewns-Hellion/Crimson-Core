let connection;
const EMERGENCY='crimson-drafts-emergency-v1';
export function scopeKey(world,user){return `${world}:${user}`;}
function db(){if(!connection)connection=new Promise((resolve,reject)=>{const request=indexedDB.open('crimson-drafts',1);request.onupgradeneeded=()=>request.result.createObjectStore('drafts',{keyPath:'id'});request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});return connection;}
function emergency(record){
  let rows=[];try{rows=JSON.parse(localStorage.getItem(EMERGENCY)||'[]');if(!Array.isArray(rows))rows=[];}catch{}
  rows=[record,...rows.filter(r=>r.id!==record.id)].slice(0,5);
  while(rows.length){try{localStorage.setItem(EMERGENCY,JSON.stringify(rows));return;}catch{rows.pop();}}
  throw new Error('Emergency draft storage is full. Export the draft before closing.');
}
export function writeEmergency(record){emergency(record);}
export async function saveRecord(record,{emergencyCopy=true}={}){
  if(emergencyCopy)try{emergency(record);}catch(error){console.warn('Crimson Drafts emergency copy unavailable',error);}
  const database=await db();return new Promise((resolve,reject)=>{const transaction=database.transaction('drafts','readwrite');transaction.objectStore('drafts').put(record);transaction.oncomplete=()=>resolve(record);transaction.onerror=()=>reject(transaction.error);transaction.onabort=()=>reject(transaction.error || new Error('Draft transaction aborted.'));});
}
export async function listRecords(scope){const database=await db();return new Promise((resolve,reject)=>{const request=database.transaction('drafts').objectStore('drafts').getAll();request.onsuccess=()=>resolve(request.result.filter(r=>r.scope===scope).sort((a,b)=>b.updatedAt-a.updatedAt));request.onerror=()=>reject(request.error);});}
export async function getRecord(id){const database=await db();return new Promise((resolve,reject)=>{const request=database.transaction('drafts').objectStore('drafts').get(id);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});}
export async function deleteRecord(id){const database=await db();await new Promise((resolve,reject)=>{const tx=database.transaction('drafts','readwrite');tx.objectStore('drafts').delete(id);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});try{const rows=JSON.parse(localStorage.getItem(EMERGENCY)||'[]').filter(r=>r.id!==id);localStorage.setItem(EMERGENCY,JSON.stringify(rows));}catch{}}
export async function recoverEmergency(scope){let rows=[];try{rows=JSON.parse(localStorage.getItem(EMERGENCY)||'[]');if(!Array.isArray(rows))rows=[];}catch{}for(const row of rows.filter(r=>r.scope===scope)){const saved=await getRecord(row.id);if(!saved || saved.updatedAt<=row.updatedAt)await saveRecord(row,{emergencyCopy:false});}}
