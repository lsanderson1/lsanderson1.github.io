import {guidePath,guideTarget} from './guide-journey.mjs';
import {safeSitePath} from '../protocol.mjs';

// Intent families, not one magic phrase. Facts/jokes and explicit opt-outs stay
// chat; only an invitation to choose something on the site starts a tour.
export function isDiscoveryRequest(value){
 const q=String(value).normalize('NFKC').trim();
 if(/\b(?:don't|do not|stop|no need|not now)\b|案内しない|案内は(?:いらない|不要)|選ばない|見せない/iu.test(q))return false;
 if(/\b(?:fact|trivia|joke|riddle|story|number|recipe)\b|豆知識|冗談|ジョーク|なぞなぞ|物語/iu.test(q))return false;
 const site=/\b(?:site|website|portfolio|project|essay|page|section|picture|image|look|see|explore|visit|go|show|lead|guide|take)\b|サイト|作品|記事|ページ|写真|画像|見せ|見たい|案内|連れて|行こ|行き|探検/u.test(q.toLowerCase());
 const choose=/\b(?:random|anything|interesting|cool|neat|something (?:fun|different|new)|surprise me|you (?:choose|pick|decide)|pick (?:something|a (?:place|project|page|picture|section|essay)|one)|worth (?:a look|seeing|exploring)|recommend|favorite|catch my eye)\b|ランダム|おまかせ|お任せ|おすすめ|面白い|おもしろい|好きな場所|どれでも|何でも|どこでも|選んで/iu.test(q);
 const invitation=/\b(?:what|which|show|see|take|lead|guide|visit|explore|recommend|choose|pick|surprise|can|could|want)\b|見せて|見たい|案内|連れて|行きたい|どこ|何か|選んで|おすすめ.*[？?]|お任せ|おまかせ/iu.test(q);
 return choose&&invitation&&(site||/^(?:(?:okay|ok|please|yuki)[,!.\s]*)*(?:surprise me|you (?:choose|pick|decide)|pick something|おまかせ|お任せ|ゆきにお任せ|選んで)[!.。！\s]*$/iu.test(q));
}

export class DiscoveryGuide{
 constructor(storage,random=Math.random){this.storage=storage;this.random=random;this.recent=[];try{const items=JSON.parse(storage?.getItem('yuki-discovery-v1'));if(Array.isArray(items))this.recent=items.filter(s=>safeSitePath(s)).slice(-8);}catch{}}
 pick(pages,currentPath,{lang='en',base='',interests=[],request=''}={}){
  const pictures=/\b(?:picture|image|screenshot)\b|写真|画像|スクリーンショット/iu.test(request),projects=/\bprojects?\b|作品|プロジェクト/iu.test(request),essays=/\bessays?\b|記事|エッセイ/iu.test(request);
  const candidates=[];
  for(const page of pages){
   if(page.lang!==lang||!safeSitePath(page.url,base))continue;
   const path=guidePath(page.url,base),text=String(page.summary||page.text||'');
   if((projects||essays)&&!(projects&&/^\/(?:projects|unreal-journey)\/.+/.test(path)||essays&&/^\/essays\/.+/.test(path)))continue;
   const add=(url,title,description,weight)=>{const target=guideTarget(url,pages,lang,base);if(!target||!title||!description.trim())return;candidates.push({target,weight:weight+(interests.some(i=>String(title+' '+description).toLowerCase().includes(i))?2:0)});};
   if(!pictures&&path!==guidePath(currentPath,base))add(page.url,page.title,text,2);
   for(const section of page.sections||[]){
    if(section.id==='s0'||!section.anchor||!section.title||pictures&&section.kind!=='image'||/^(?:contents|on this page|links|contact|目次|連絡先)$/iu.test(section.title))continue;
    add(page.url+'#'+section.anchor,section.title,String(section.text||''),section.kind==='image'?2:1);
   }
  }
  const unique=[...new Map(candidates.map(c=>[c.target.url,c])).values()];
  // Choose a page first: a project with many screenshots must not outweigh
  // the garden, résumé or an essay. Remember whole pages across EN/JA too.
  const recentPages=this.recent.map(url=>guidePath(url,base));
  const fresh=unique.filter(c=>!recentPages.includes(guidePath(c.target.url,base)));
  let pool=fresh.length?fresh:unique;
  const unused=pool.filter(c=>!this.recent.includes(c.target.url));if(unused.length)pool=unused;
  if(!fresh.length&&recentPages.length){const different=pool.filter(c=>guidePath(c.target.url,base)!==recentPages.at(-1));if(different.length)pool=different;}
  if(!pool.length)return null;
  const groups=[...new Set(pool.map(c=>guidePath(c.target.url,base)))];
  const page=groups[Math.floor(Math.min(.999999,Math.max(0,this.random()))*groups.length)];
  pool=pool.filter(c=>guidePath(c.target.url,base)===page);
  let ticket=Math.min(.999999,Math.max(0,this.random()))*pool.reduce((n,c)=>n+c.weight,0),chosen=pool.at(-1);
  for(const candidate of pool){ticket-=candidate.weight;if(ticket<0){chosen=candidate;break;}}
  this.recent=[...this.recent,chosen.target.url].slice(-8);try{this.storage?.setItem('yuki-discovery-v1',JSON.stringify(this.recent));}catch{}
  return chosen.target;
 }
}

// A local fallback quotes published prose, never a chopped-off sentence.
export function discoveryExcerpt(value,limit=1800){
 const text=String(value??'').trim();if(text.length<=limit)return text;
 const sentences=text.match(/[^.!?。！？]+[.!?。！？]+(?:[”」』"])?/gu)||[];
 let excerpt='';for(const sentence of sentences){if(excerpt.length+sentence.length>limit)break;excerpt+=sentence;}return excerpt.trim();
}
