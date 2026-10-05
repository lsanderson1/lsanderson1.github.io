import {safeSitePath} from '../protocol.mjs';

export const readingMemoryKey='yuki-reading-v1';
export const sectionKey=value=>typeof value==='string'&&/^[si]\d{1,4}$/.test(value)?value:'';
export function readingReference(value){
 if(!value||typeof value!=='object'||typeof value.page!=='string'||value.page.length>500)return null;
 const page=safeSitePath(value.page);if(!page||page.includes('#'))return null;
 return {page,section:sectionKey(value.section)};
}
export class ReadingMemory {
 constructor(storage,now=Date.now){this.storage=storage;this.now=now;}
 get(){try{const v=JSON.parse(this.storage?.getItem(readingMemoryKey));return v&&Number.isFinite(v.at)&&this.now()-v.at>=0&&this.now()-v.at<1800000?readingReference(v):null;}catch{return null;}}
 set(value){const ref=readingReference(value);if(!ref)return;try{this.storage?.setItem(readingMemoryKey,JSON.stringify({...ref,at:this.now()}));}catch{}}
 clear(){try{this.storage?.removeItem(readingMemoryKey);}catch{}}
}

// This is a viewport hint, not eye tracking. Never read form values, chat text,
// selections, screenshots, or the rest of the DOM into an AI request.
export function chooseReadingSection(headings,height,header=0){
 const valid=headings.filter(h=>sectionKey(h.id)&&Number.isFinite(h.top)&&Number.isFinite(h.bottom)&&h.bottom>h.top);
 const line=header+Math.max(0,height-header)*.45;
 let chosen=null;
 for(let i=0;i<valid.length;i++){
  const h=valid[i],end=valid[i+1]?.top??h.end??h.bottom;
  if(end<=header||h.top>=height)continue;
  if(h.top<=line&&end>line)return h;
  if(!chosen||Math.abs(h.top-line)<Math.abs(chosen.top-line))chosen=h;
 }
 return chosen;
}
export function readPageSection(doc,height,header=0){
 const main=doc.querySelector('main');if(!main)return null;
 const end=main.getBoundingClientRect().bottom;
 const headings=[...main.querySelectorAll('[data-yuki-section]')].filter(el=>el.getClientRects().length&&!el.closest('[hidden], [aria-hidden="true"]')).map(el=>{
  const r=el.getBoundingClientRect();return {id:el.dataset.yukiSection,title:(el.getAttribute('alt')||el.textContent).trim(),top:r.top,bottom:r.bottom,end};
 });
 return chooseReadingSection(headings,height,header);
}
export function guideReference(el,page,url){
 if(url){const path=safeSitePath(url);if(path){const target=new URL(path,'https://portfolio.invalid');if(target.pathname!==page)return {page:target.pathname,section:''};}}
 const heading=el?.matches?.('[data-yuki-section]')?el:el?.closest?.('[data-yuki-section]')??el?.querySelector?.('[data-yuki-section]');
 return readingReference({page,section:heading?.dataset.yukiSection??''});
}
