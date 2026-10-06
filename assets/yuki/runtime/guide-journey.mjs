import {safeSitePath} from '../protocol.mjs';

export const journeyKey='yuki-journey-v1';
const ttl=1800000;
const clean=value=>typeof value==='string'?value.replace(/\s+/g,' ').trim():'';
const words=value=>clean(value).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/([a-z0-9])(?=[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}])/gu,'$1 ').replace(/([\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}])(?=[a-z0-9])/gu,'$1 ').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
export function guidePath(value,base=''){
 const safe=safeSitePath(value,base);if(!safe)return null;
 return (safe.split('#')[0].slice(base.length).replace(/^\/ja(?=\/)/,'').replace(/\/index\.html$/,'/').replace(/\/$/,'')||'/');
}
const categoryNames={'/resume.html':'Resume','/projects':'Projects','/essays':'Essays','/unreal-journey':'Unreal Journey','/':'Home'};
const categoryAliases={'/resume.html':['resume','cv','履歴','経歴','履歴書'],'/projects':['projects','project section','制作実績','作品一覧','プロジェクト一覧'],'/essays':['essays','essay section','技術記事','記事一覧'],'/unreal-journey':['unreal journey','unreal section','開発記録'],'/':['home page','landing page','ホーム']};
export function isGuideRequest(text){
 const q=clean(text);
 if(/\b(?:do not|don['’]t|stop|no need to)\s+(?:guide|lead|show|take|navigate|point)\b/i.test(q)||/(?:案内|誘導)(?:しない|しなくて|をやめ)/.test(q))return false;
 return /\b(?:lead|guide|take|direct)\s+(?:me|us)\b|\b(?:point|navigate|go)\s+(?:me\s+)?(?:to|towards|at)\b|\bshow\s+me\b|\b(?:where|find|locate|open)\b/i.test(q)||/(?:案内|連れて|誘導|どこ|何処|見せて|開いて|探して|に行き|へ行き)/.test(q);
}
const stop=new Set('a an the i me us you her she it to of on in and or for about please can could would will want like website section page project projects show find lead guide take point go open where is are my looking at'.split(' '));
function nameScore(query,title){
 const name=words(title),japanese=/[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u.test(name);if(name.length<(japanese?2:3))return 0;
 if(japanese?query.includes(name):(' '+query+' ').includes(' '+name+' '))return 100+name.length;
 const tokens=name.split(' ').filter(w=>w.length>2&&!stop.has(w));
 const hits=tokens.filter(w=>(' '+query+' ').includes(' '+w+' '));
 return hits.length>=1&&hits.length===tokens.length?40+hits.length:0;
}
// The published catalog, never AI-provided URLs/selectors, is the route authority.
export function guideTarget(url,pages,lang='en',base=''){
 const path=guidePath(url,base);if(!path)return null;
 const page=pages.find(p=>p.lang===lang&&guidePath(p.url,base)===path&&safeSitePath(p.url,base));if(!page)return null;
 const source=pages.find(p=>p.url===url.split('#')[0]);
 const anchor=url.split('#')[1]??'';
 let section=page.sections?.find(s=>s.anchor===anchor&&anchor);
 // Localized section IDs are not interchangeable. An unmatched section falls
 // back to its known page, rather than pointing at a different translated item.
 if(anchor&&!section&&source?.lang===lang)return null;
 return {url:page.url+(section?'#'+section.anchor:''),title:clean(section?.title||categoryNames[path]||page.title),pageTitle:clean(categoryNames[path]||page.title),section:section?.id??''};
}
export function resolveGuideRequest(text,pages,currentPath,{lang='en',base=''}={}){
 if(!isGuideRequest(text))return null;
 const query=words(text),localized=pages.filter(p=>p.lang===lang&&safeSitePath(p.url,base));
 const scored=localized.map(p=>{
  const path=guidePath(p.url,base),aliases=pages.filter(other=>guidePath(other.url,base)===path).map(other=>other.title);
  const score=Math.max(0,...aliases.map(title=>nameScore(query,title)),...(categoryAliases[path]??[]).map(title=>nameScore(query,title)));
  return {page:p,score,category:Boolean(categoryNames[path])};
 }).filter(x=>x.score>0);
 const specifics=scored.filter(x=>!x.category),candidates=(specifics.length?specifics:scored).sort((a,b)=>b.score-a.score);
 if(candidates.length>1&&candidates[0].score-candidates[1].score<20)return {choices:candidates.slice(0,4).map(x=>guideTarget(x.page.url,pages,lang,base))};
 let page=candidates[0]?.page;
 // A named section of the current page can be led to without another page hop.
 if(!page)page=localized.find(p=>guidePath(p.url,base)===guidePath(currentPath,base));
 if(!page)return {choices:[]};
 let sectionQuery=query;
 if(candidates.length)for(const alias of pages.filter(p=>guidePath(p.url,base)===guidePath(page.url,base)).map(p=>words(p.title)))sectionQuery=sectionQuery.split(alias).join(' ');
 const sections=(page.sections??[]).filter(s=>s.id!=='s0'&&s.anchor&&nameScore(sectionQuery,s.title)>0);
 if(sections.length===1)return {target:guideTarget(page.url+'#'+sections[0].anchor,pages,lang,base)};
 if(candidates.length)return {target:guideTarget(page.url,pages,lang,base)};
 return {choices:[]};
}
export function planGuideStep(target,currentPath,pages,{lang='en',base=''}={}){
 const checked=guideTarget(target?.url,pages,lang,base);if(!checked)return null;
 const current=guidePath(currentPath,base),destination=guidePath(checked.url,base);
 if(current===destination)return {kind:'arrive',...checked};
 const group=destination.startsWith('/projects/')?'/projects':destination.startsWith('/essays/')?'/essays':destination.startsWith('/unreal-journey/')?'/unreal-journey':destination;
 const index=pages.find(p=>p.lang===lang&&guidePath(p.url,base)===group);
 if(index&&current!==group)return {kind:'nav',url:index.url,title:categoryNames[group]??clean(index.title),target:checked};
 return {kind:'link',url:checked.url.split('#')[0],title:checked.pageTitle,target:checked};
}
export function findGuideElement(doc,step){
 if(step.kind==='arrive'){
  const anchor=step.url.split('#')[1];return anchor?doc.getElementById(anchor):doc.querySelector('main h1, .fp-resume-head h1, h1');
 }
 const links=[...doc.querySelectorAll(step.kind==='nav'?'.fp-nav a[href]':'main a[href]')];
 const matches=links.filter(a=>{try{const u=new URL(a.href,doc.baseURI);return u.origin===new URL(doc.baseURI).origin&&u.pathname===step.url.split('#')[0];}catch{return false;}});
 // Point at the actual clickable project title, not its whole card or thumbnail.
 return matches.find(a=>a.closest('h2,h3,h4'))??matches[0]??null;
}
export class GuideJourney {
 constructor(storage,now=Date.now){this.storage=storage;this.now=now;this.state=null;try{
  const s=JSON.parse(storage?.getItem(journeyKey));
  if(s&&Number.isFinite(s.at)&&now()-s.at>=0&&now()-s.at<ttl&&safeSitePath(s.target)&&safeSitePath(s.from)&&(!s.expected||safeSitePath(s.expected)))this.state={...s,paused:s.paused===true};
 }catch{}}
 get active(){return Boolean(this.state);}
 persist(){try{if(this.state)this.storage?.setItem(journeyKey,JSON.stringify(this.state));else this.storage?.removeItem(journeyKey);}catch{}}
 start(target,from){if(!safeSitePath(target)||!safeSitePath(from))return false;this.state={target,from,expected:null,at:this.now(),paused:false};this.persist();return true;}
 expect(url,from){if(!this.state)return;this.state.expected=url;this.state.from=from;this.state.at=this.now();this.state.paused=false;this.persist();}
 enter(current,base=''){
  const s=this.state;if(!s)return 'none';
  const path=guidePath(current,base);
  if(path===guidePath(s.target,base))return 'arrived';
  if(path===guidePath(s.expected,base))return 'continue';
  if(path===guidePath(s.from,base))return s.paused?'detour':'resume';
  s.paused=true;s.from=current;s.at=this.now();this.persist();return 'detour';
 }
 depart(foot,viewport){
  if(!this.state||![foot?.x,foot?.y,viewport?.width,viewport?.height].every(Number.isFinite))return;
  this.state.pose={x:foot.x,y:foot.y,width:viewport.width,height:viewport.height};this.persist();
 }
 position(viewport){
  const p=this.state?.pose;if(!p||![p.x,p.y,p.width,p.height].every(Number.isFinite)||p.width<=0||p.height<=0)return null;
  return {x:p.x*viewport.width/p.width,y:p.y*viewport.height/p.height};
 }
 clear(){this.state=null;this.persist();}
}

export function guideCopy(step,{lang='en',detour=false}={}){
 const ja=lang==='ja';
 if(detour)return ja?`あれっ、ちょっと寄り道だね。「${step.target?.title??step.title}」への道は覚えているよ。案内を続ける？`:`Oop, a little detour! I still remember the way to ${step.target?.title??step.title}. Shall we continue, or explore here?`;
 if(step.kind==='nav')return ja?`まずは上の「${step.title}」だよ。このタブをクリックしてね。次のページでも一緒に案内するよ！`:`First stop: ${step.title} up in the header! Click the tab I’m pointing to. I’ll meet you on the next page and keep guiding.`;
 if(step.kind==='link')return ja?`着いた！ここに「${step.title}」があるよ。指しているタイトルをクリックしてみて。開いたら、何から見てみたい？`:`We’re in the right section! Here’s ${step.title}—click the title I’m pointing to. What would you like to explore once we’re inside?`;
 return ja?`じゃーん、「${step.title}」に着いたよ！ぱたぱた、おつかれさま。ここの説明を聞く？それとも気になる項目へ案内しようか？`:`Ta-da, we’ve reached ${step.title}! Tiny wings, successful mission. Would you like me to explain this, or lead you to something specific here?`;
}
