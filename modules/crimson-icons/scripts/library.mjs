export const ID='crimson-icons';
export const MIME='application/x-crimson-icon';
export function validIconPath(path){return typeof path==='string' && !path.includes('..') && !/[\u0000-\u001f<>"\\]/.test(path) && !/^[a-z]+:/i.test(path) && !path.startsWith('//') && /\.(webp|png|jpe?g|gif|svg|avif)(?:[?#].*)?$/i.test(path);}
export function readIconPayload(transfer){try{const raw=transfer.getData(MIME) || transfer.getData('text/plain');const data=JSON.parse(raw);return data?.type==='CrimsonIcon' && validIconPath(data.src)?data.src:null;}catch{return null;}}
export function makeIconPayload(path){if(!validIconPath(path))throw new Error('Choose a valid relative image path.');return JSON.stringify({type:'CrimsonIcon',src:path});}
export function filterIcons(paths,{query='',folder='all'}={}){const words=query.toLowerCase().trim().split(/\s+/).filter(Boolean);return paths.filter(path=>(folder==='all' || path.split('/')[1]===folder) && words.every(word=>path.toLowerCase().replaceAll('-',' ').replaceAll('_',' ').includes(word)));}
