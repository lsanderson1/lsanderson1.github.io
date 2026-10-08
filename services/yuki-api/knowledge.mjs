import {safeSitePath} from '../../assets/yuki/protocol.mjs';
import {readingReference,sectionKey} from '../../assets/yuki/runtime/reading-context.mjs';
import {makingKnowledge} from './making-knowledge.mjs';

const clean=value=>typeof value==='string'?value.replace(/\s+/g,' ').trim():'';
export function validateContext(value){
 if(value===undefined)return {};
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Invalid context');
 if(value.section!==undefined&&value.section!==''&&!sectionKey(value.section))throw Error('Invalid section');
 const guide=value.lastGuide===undefined||value.lastGuide===null?null:readingReference(value.lastGuide);
 if(value.lastGuide!=null&&(!guide||(value.lastGuide.section&&guide.section!==value.lastGuide.section)))throw Error('Invalid guide');
 // Intentionally discard any client-supplied page text, titles or instructions.
 return {section:sectionKey(value.section),...(guide?{lastGuide:guide}:{}),...(['nest','pond','lookout','books','treasures'].includes(value.gardenSpot)?{gardenSpot:value.gardenSpot}:{})};
}
export function queryWords(text){
 const query=text.toLowerCase(),words=query.match(/[a-z0-9_+#]{2,}/g)||[];
 for(const run of query.match(/[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]+/gu)||[])for(let i=0;i<run.length-1;i++)words.push(run.slice(i,i+2));
 const stop=new Set(['the','this','that','these','those','what','how','about','more','tell','explain','does','with','from','you','can','she','please','there']);
 return [...new Set(words)].filter(w=>!stop.has(w)).slice(0,120);
}
export function textChunks(text,size=1700){
 const value=clean(text),out=[];let start=0;
 while(start<value.length){let end=Math.min(start+size,value.length);if(end<value.length){const breakAt=value.lastIndexOf(' ',end);if(breakAt>start+size*.6)end=breakAt;}
  out.push(value.slice(start,end));if(end===value.length)break;start=end-120;
 }return out;
}
const canonical=path=>path.replace(/^\/ja(?=\/)/,'');
const guideExplanation=message=>[
 'Please explain what you just showed me in more detail. How does it relate to this project?',
 'さっき案内してくれたところを、もう少し詳しく説明して。この作品とどう関係しているの？'
].includes(message.trim());
function resolve(pages,ref){
 if(!ref)return null;
 const page=pages.find(p=>p.url===ref.page)??pages.find(p=>canonical(p.url)===canonical(ref.page));if(!page)return null;
 // Section identifiers are local to a language's rendered document.
 const section=page.url===ref.page?page.sections?.find(s=>s.id===ref.section):null;
 return {page:page.url,title:page.title,section:section?.id??'',heading:section?.title??'',kind:section?.kind==='image'?'image':section?'section':'page',sourceId:section?`${page.id}::${section.id}`:page.id};
}
export function retrieveKnowledge(k,input){
 if(!k||typeof k.owner!=='string'||!k.bio||!Array.isArray(k.pages))throw Error('Site information unavailable');
 const pages=k.pages.filter(p=>p&&p.lang===input.lang&&typeof p.id==='string'&&typeof p.title==='string'&&safeSitePath(p.url)&&typeof p.text==='string').map(p=>({id:p.id,url:p.url,lang:p.lang,title:p.title,summary:clean(p.summary).slice(0,500),text:p.text,sections:Array.isArray(p.sections)?p.sections.filter(s=>sectionKey(s?.id)&&typeof s.title==='string'&&typeof s.text==='string'):[]}));
 const current=resolve(pages,{page:input.page,section:input.context?.section});
 const lastGuided=resolve(pages,input.context?.lastGuide);
 // The guide's explicit Explain button starts a new subject. Stale conversation
 // must not pull retrieval or the model back to an earlier, unrelated target.
 const focus=guideExplanation(input.message)?lastGuided:null;
 const query=queryWords(focus?focus.heading:input.message),history=focus?[]:queryWords((input.history??[]).filter(m=>m.role==='user').slice(-2).map(m=>m.content).join(' '));
 const score=(text,words)=>words.reduce((n,w)=>n+(text.includes(w)?1:0),0);
 const chunks=[];
 for(const p of pages){
  const sections=p.sections.length?p.sections:clean(p.text).length>1700?[{id:'',title:p.title,text:p.text,anchor:''}]:[];
  // A small overview makes page identity available without swallowing long text.
  chunks.push({id:p.id,url:p.url,title:p.title,text:(p.summary+' '+clean(p.text).slice(0,p.sections.length?500:1700)).slice(0,1700).trim(),page:p.url,section:'',part:0});
  for(const s of sections){const safeAnchor=typeof s.anchor==='string'&&/^[A-Za-z0-9_\-:.]+$/.test(s.anchor)?s.anchor:'';
   textChunks(s.text).forEach((text,i)=>chunks.push({id:`${p.id}::${s.id||'body'}${i?'::'+i:''}`,url:p.url+(safeAnchor?'#'+safeAnchor:''),title:p.title+(s.id?' — '+s.title:''),text,page:p.url,section:s.id,part:i}));
  }
 }
 const ranked=chunks.filter(c=>!focus||c.page===focus.page).map((c,i)=>{
  const title=c.title.toLowerCase(),body=c.text.toLowerCase();
  return {...c,order:i,score:score(title,query)*8+score(body,query)*3+score(title+' '+body,history)*.35+(c.page===current?.page?2:0)+(c.page===lastGuided?.page?1:0)};
 }).sort((a,b)=>b.score-a.score||a.order-b.order);
 const chosen=[];const add=c=>{if(c&&!chosen.some(x=>x.id===c.id)&&chosen.length<6)chosen.push(c);};
 // Always supply the currently displayed section and recent guided target;
 // explicit questions can still retrieve a different passage anywhere in a page.
 for(const ref of focus?[focus]:[current,lastGuided])if(ref){const c=ranked.find(c=>c.page===ref.page&&c.section===ref.section);add(c);if(c)ref.sourceId=c.id;}
 for(const c of ranked)add(c);
 return {owner:k.owner,bio:clean(k.bio[input.lang]).slice(0,2000),skills:JSON.stringify(k.skills||[]).slice(0,2000),view:{current,lastGuided,focus,...(/^\/(?:ja\/)?yuki\/$/.test(input.page)&&input.context?.gardenSpot?{gardenSpot:input.context.gardenSpot}:{})},pages:chosen.map(({id,url,title,text})=>({id,url,title,text})),makingOf:focus?null:makingKnowledge(input)};
}
