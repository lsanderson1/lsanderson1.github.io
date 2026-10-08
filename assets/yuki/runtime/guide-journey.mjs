import {safeSitePath} from '../protocol.mjs';

export const journeyKey='yuki-journey-v1';
const ttl=1800000;
const clean=value=>typeof value==='string'?value.replace(/\s+/g,' ').trim():'';
const words=value=>clean(value).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/([a-z0-9])(?=[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}])/gu,'$1 ').replace(/([\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}])(?=[a-z0-9])/gu,'$1 ').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
export function guidePath(value,base=''){
 const safe=safeSitePath(value,base);if(!safe)return null;
 return (safe.split('#')[0].slice(base.length).replace(/^\/ja(?=\/)/,'').replace(/\/index\.html$/,'/').replace(/\/$/,'')||'/');
}
const categoryNames={'/resume.html':'Resume','/projects':'Projects','/essays':'Essays','/unreal-journey':'Unreal Journey','/yuki':'Yuki’s Garden','/':'Home'};
const categoryAliases={'/resume.html':['resume','cv','履歴','経歴','履歴書'],'/projects':['projects','project section','制作実績','作品一覧','プロジェクト一覧'],'/essays':['essays','essay section','技術記事','記事一覧'],'/unreal-journey':['unreal journey','unreal section','開発記録'],'/yuki':['garden','your home','your house','your nest','petal nook','ゆきの庭','ユキの庭','おうち','君の家','あなたの家','庭','花びらのすみか'],'/':['home page','landing page','portfolio home','ホーム','トップページ']};
export function isGuideRequest(text){
 const q=clean(text);
 if(/\b(?:do not|don['’]t|stop|no need to)\s+(?:guide|lead|show|take|navigate|point)\b/i.test(q)||/(?:案内|誘導)(?:しない|しなくて|をやめ)/.test(q))return false;
 return /\b(?:lead|guide|take|direct)\s+(?:me|us)\b|\b(?:point|navigate|go)\s+(?:me\s+)?(?:to|towards|at)\b|\bgo\s+home\b|\bshow\s+me\b|\b(?:where|find|locate|open|visit)\b/i.test(q)||/(?:案内|連れて|誘導|どこ|何処|見せて|開いて|探して|に行き|へ行き)/.test(q);
}
const stop=new Set('a an the i me us you her she it to of on in and or for about please can could would will want like website section page project projects show find lead guide take point go open where is are my looking at'.split(' '));
function nameScore(query,title){
 const name=words(title),japanese=/[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u.test(name);if(name.length<(japanese?2:3)&&name!=='庭')return 0;
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
 const pageTitle=clean(path==='/yuki'?page.title:categoryNames[path]||page.title);
 return {url:page.url+(section?'#'+section.anchor:''),title:clean(section?.title||pageTitle),pageTitle,section:section?.id??''};
}
export function resolveGuideRequest(text,pages,currentPath,{lang='en',base=''}={}){
 if(!isGuideRequest(text))return null;
 const query=words(text),localized=pages.filter(p=>p.lang===lang&&safeSitePath(p.url,base));
 // In conversation with Yuki, an unqualified "home" means her home. Explicit
 // "home page"/"landing page" still means the portfolio, not the garden.
 const homeOnly=/\bhome\b/.test(query)&&!/(?:home page|landing page|portfolio home)/.test(query);
 const scored=localized.map(p=>{
  const path=guidePath(p.url,base),aliases=pages.filter(other=>guidePath(other.url,base)===path).map(other=>other.title);
  const score=Math.max(homeOnly&&path==='/yuki'?120:0,...aliases.filter(title=>!(homeOnly&&path==='/'&&words(title)==='home')).map(title=>nameScore(query,title)),...(categoryAliases[path]??[]).map(title=>nameScore(query,title)));
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
// A clarification is answered in the conversation, not by a second start button.
// Only the offered catalog entries can match a short name or numbered answer.
export function guideChoice(text,choices){
 const q=words(text).replace(/^(?:the |number |option )/,'').replace(/(?: please| お願い|でお願い|番)$/,'').trim();
 const ordinal={'first':1,'second':2,'third':3,'fourth':4,'最初':1,'一つ目':1,'二つ目':2,'三つ目':3,'四つ目':4};
 const n=ordinal[q]??(/^\d$/.test(q)?Number(q):0);
 if(n)return choices[n-1]??null;
 const matches=choices.filter(t=>nameScore(q,t.title)>0);
 return matches.length===1?matches[0]:null;
}
export function planGuideStep(target,currentPath,pages,{lang='en',base=''}={}){
 const checked=guideTarget(target?.url,pages,lang,base);if(!checked)return null;
 const current=guidePath(currentPath,base),destination=guidePath(checked.url,base);
 if(current===destination)return {kind:'arrive',...checked};
 const group=destination.startsWith('/projects/')?'/projects':destination.startsWith('/essays/')?'/essays':destination.startsWith('/unreal-journey/')?'/unreal-journey':destination;
 const index=pages.find(p=>p.lang===lang&&guidePath(p.url,base)===group);
 if(index&&current!==group)return {kind:'nav',url:index.url,title:group==='/yuki'?'Yuki':categoryNames[group]??clean(index.title),target:checked};
 return {kind:'link',url:checked.url.split('#')[0],title:checked.pageTitle,target:checked};
}
export function findGuideElement(doc,step){
 if(step.kind==='arrive'){
  if(guidePath(step.url)==='/yuki'&&!step.url.includes('#'))return doc.getElementById('garden-lookout')??doc.querySelector('main h1');
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

export class GuideDialogue {
 constructor(storage,random=Math.random){this.storage=storage;this.random=random;this.recent=[];try{const v=JSON.parse(storage?.getItem('yuki-guide-lines-v1'));if(Array.isArray(v))this.recent=v.filter(n=>Number.isInteger(n)&&n>=0&&n<8).slice(-6);}catch{}}
 copy(step,options){const choices=Array.from({length:8},(_,i)=>i).filter(i=>!this.recent.includes(i));const index=choices[Math.min(choices.length-1,Math.floor(this.random()*choices.length))];
  if(step.kind==='arrive'){this.recent=[...this.recent,index].slice(-6);try{this.storage?.setItem('yuki-guide-lines-v1',JSON.stringify(this.recent));}catch{}}
  return guideCopy(step,{...options,variant:index});
 }
}
export function guideCopy(step,{lang='en',detour=false,variant=0}={}){
 const ja=lang==='ja';
 if(detour)return ja?`あれっ、ちょっと寄り道だね。「${step.target?.title??step.title}」への道は覚えているよ。案内を続ける？`:`Oop, a little detour! I still remember the way to ${step.target?.title??step.title}. Shall we continue, or explore here?`;
 if(step.kind==='nav')return ja?`まずは上の「${step.title}」だよ。このタブをクリックしてね。次のページでも一緒に案内するよ！`:`First stop: ${step.title} up in the header! Click the tab I’m pointing to. I’ll meet you on the next page and keep guiding.`;
 if(step.kind==='link')return ja?`着いた！ここに「${step.title}」があるよ。指しているタイトルをクリックしてみて。開いたら、何から見てみたい？`:`We’re in the right section! Here’s ${step.title}—click the title I’m pointing to. What would you like to explore once we’re inside?`;
 const endings=[
  [`Ta-da, we’ve reached ${step.title}! Would you like me to explain what’s here?`,`じゃーん、「${step.title}」に着いたよ！ここの説明を聞く？`],
  [`Here we are: ${step.title}. A soft landing for once! What caught your eye here?`,`「${step.title}」に到着！今日はそーっと着地できたよ。何が気になった？`],
  [`Found it—${step.title}! My little map can rest now. What would you like to understand about this part?`,`見つけた、「${step.title}」だよ！小さな地図もちょっと休憩。ここで詳しく知りたいことはある？`],
  [`${step.title}, right here! Wings folded, ears ready. What brought you to this part of the portfolio?`,`ここが「${step.title}」！羽をたたんで、お話を聞く準備もできたよ。どんなところに興味があった？`],
  [`A little flutter, and we’re at ${step.title}. Shall we unpack what this page is about together?`,`ぱたぱたっ、「${step.title}」まで来たよ。一緒に、どんな内容か見てみようか？`],
  [`This is ${step.title}—our destination! I’ll stay nearby. Is there a particular detail you want to explore?`,`目的地の「${step.title}」だよ！近くにいるからね。もっと見てみたいところはある？`],
  [`We made it to ${step.title}! My glasses survived the flight, too. Where would you like to begin?`,`「${step.title}」に着いたね！眼鏡もちゃんと無事。どこから見てみようか？`],
  [`Your stop: ${step.title}. One tiny guide, mission complete! What should we look into here?`,`「${step.title}」、到着でーす。小さな案内役、お仕事できた！ここでは何を調べてみようか？`]
 ];
 return endings[Math.abs(Math.trunc(variant))%endings.length][ja?1:0];
}
