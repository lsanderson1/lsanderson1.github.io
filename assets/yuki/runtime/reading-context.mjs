import {safeSitePath} from '../protocol.mjs';

export const readingMemoryKey='yuki-reading-v1';
const cleanTitle=value=>typeof value==='string'?value.replace(/\s+/g,' ').trim():'';
const pagePath=value=>value.split(/[?#]/)[0].replace(/\/index\.html$/,'/').replace(/\/$/,'')||'/';
export function pageTitle({path='/',base='',title='',heading='',navigation=[],lang='en'}={}){
 const current=pagePath(path),home=pagePath(base+(lang==='ja'?'/ja/':'/'));
 if(current===home)return lang==='ja'?'ホーム':'Landing page';
 // Match only the actual index URL: an active parent nav item must never
 // replace an individual project's title. New nav/pages need no manual list.
 const nav=navigation.find(item=>pagePath(item.path)===current);
 return cleanTitle(nav?.title)||cleanTitle(title)||cleanTitle(heading)||(lang==='ja'?'このページ':'This page');
}
export function readPageTitle(doc,{path,base='',title='',lang='en'}={}){
 const navigation=[...doc.querySelectorAll('.fp-nav nav a[href]')].map(a=>{
  let path='';try{const u=new URL(a.href,doc.baseURI);if(u.origin===new URL(doc.baseURI).origin)path=u.pathname;}catch{}
  // The small Japanese subtitle is not part of the main navigation label.
  return {path,title:[...a.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent).join(' ')};
 });
 return pageTitle({path,base,title,lang,navigation,heading:doc.querySelector('main h1')?.textContent});
}
export function readingDetail(section,title,lang='en'){
 if(!section||section.level===1||cleanTitle(section.title).toLocaleLowerCase()===cleanTitle(title).toLocaleLowerCase())return '';
 return (section.kind==='image'?(lang==='ja'?'画像：':'Image: '):'')+cleanTitle(section.title);
}
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

// A guide follow-up belongs to the portfolio answer that still cites it, not
// every subsequent conversation (e.g. a greeting or a question about Yuki).
export function followUpReference(reply,previous,pages){
 const ref=readingReference(previous);if(!ref)return null;
 const page=pages.find(p=>p.url===ref.page);if(!page)return null;
 const section=ref.section?page.sections?.find(s=>s.id===ref.section):null;
 if(ref.section&&!section)return null;
 return reply.sources?.some(source=>{
  const path=safeSitePath(source.url);if(!path)return false;
  const [url,anchor='']=path.split('#');
  return pagePath(url)===pagePath(ref.page)&&(!ref.section||!anchor||anchor===section.anchor);
 })?ref:null;
}

// This is a viewport hint, not eye tracking. Never read form values, chat text,
// selections, screenshots, or the rest of the DOM into an AI request.
export function chooseReadingSection(headings,height,header=0,width=Infinity){
 const valid=headings.filter(h=>sectionKey(h.id)&&Number.isFinite(h.top)&&Number.isFinite(h.bottom)&&h.bottom>h.top);
 const line=header+Math.max(0,height-header)*.45;
 const image=valid.find(h=>h.kind==='image'&&h.top<=line&&h.bottom>line&&(!Number.isFinite(width)||h.left<=width/2&&h.right>=width/2));
 if(image)return image;
 const text=valid.filter(h=>h.kind!=='image');
 let chosen=null;
 for(let i=0;i<text.length;i++){
  const h=text[i],end=text[i+1]?.top??h.end??h.bottom;
  if(end<=header||h.top>=height)continue;
  if(h.top<=line&&end>line)return h;
  if(!chosen||Math.abs(h.top-line)<Math.abs(chosen.top-line))chosen=h;
 }
 return chosen??valid.find(h=>h.kind==='image'&&h.bottom>header&&h.top<height)??null;
}
export function readPageSection(doc,height,header=0){
 const main=doc.querySelector('main');if(!main)return null;
 const end=main.getBoundingClientRect().bottom,width=doc.documentElement?.clientWidth||Infinity;
 const headings=[...main.querySelectorAll('[data-yuki-section]')].filter(el=>el.getClientRects().length&&!el.closest('[hidden], [aria-hidden="true"]')).flatMap(el=>{
  const r=el.getBoundingClientRect(),clip=el.closest('[data-feature-carousel]')?.getBoundingClientRect(),card=el.closest('.fp-feature')?.getBoundingClientRect()??r;
  const left=Math.max(0,clip?.left??0),right=Math.min(width,clip?.right??width);
  // A carousel's off-screen cards still have DOM rectangles, but they are
  // not what the visitor is viewing. Prefer the card centered in its window.
  if(r.right<=left||r.left>=right||clip&&(card.left>=(left+right)/2||card.right<=(left+right)/2))return [];
  return [{id:el.dataset.yukiSection,title:(el.getAttribute('alt')||el.textContent).trim(),kind:el.tagName==='IMG'?'image':'section',level:Number(el.tagName.slice(1))||0,top:r.top,bottom:r.bottom,left:r.left,right:r.right,end}];
 });
 return chooseReadingSection(headings,height,header,width);
}
export function guideReference(el,page,url){
 if(url){const path=safeSitePath(url);if(path){const target=new URL(path,'https://portfolio.invalid');if(target.pathname!==page)return {page:target.pathname,section:''};}}
 const heading=el?.matches?.('[data-yuki-section]')?el:el?.closest?.('[data-yuki-section]')??el?.querySelector?.('[data-yuki-section]');
 return readingReference({page,section:heading?.dataset.yukiSection??''});
}
