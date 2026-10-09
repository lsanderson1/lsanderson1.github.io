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
// A guided reply must name its actual target, not recycle a different
// portfolio item's introduction. This is a title guard, not fact verification.
export function guideReplyMatches(text,event,pages,lang='en',base=''){
 const target=guideTarget(event.targetUrl||event.url,pages,lang,base);if(!target)return false;
 const prose=words(text),title=words(target.title),path=guidePath(target.url,base);
 const includes=value=>/[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u.test(value)?prose.includes(words(value)):(' '+prose+' ').includes(' '+words(value)+' ');
 if(!includes(title))return false;
 const stop=guideTarget(event.url,pages,lang,base);
 if(event.kind==='nav'&&stop&&!includes(stop.title)&&!(guidePath(stop.url,base)==='/yuki'&&includes('Yuki')))return false;
 if(event.kind==='link'&&['Read essay','記事を読む'].includes(event.linkLabel)&&!includes(event.linkLabel))return false;
 const page=pages.find(p=>p.lang===lang&&guidePath(p.url,base)===path);
 const section=page?.sections?.find(s=>s.id===target.section);
 const evidence=words([target.title,page?.title,page?.summary,section?.text||page?.text].join(' '));
 return !pages.some(p=>guidePath(p.url,base)!==path&&guidePath(p.url,base)!==guidePath(event.url,base)&&words(p.title).length>=10&&includes(p.title)&&!evidence.includes(words(p.title)));
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
 start(target,from,{discovery=false}={}){if(!safeSitePath(target)||!safeSitePath(from))return false;this.state={target,from,expected:null,at:this.now(),paused:false,...(discovery?{discovery:true}:{})};this.persist();return true;}
 expect(url,from){if(!this.state)return;this.state.expected=url;this.state.from=from;this.state.at=this.now();this.state.paused=false;this.persist();}
 claimStep(step){
  if(!this.state)return false;const key=step.kind+':'+step.url;
  if(this.state.spoken===key)return false;
  this.state.spoken=key;this.persist();return true;
 }
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
 copy(step,options){const count=step.kind==='arrive'?8:4,used=this.recent.slice(-(count-1)).map(i=>i%count);const choices=Array.from({length:count},(_,i)=>i).filter(i=>!used.includes(i));const index=choices[Math.min(choices.length-1,Math.floor(this.random()*choices.length))];
  this.recent=[...this.recent,index].slice(-6);try{this.storage?.setItem('yuki-guide-lines-v1',JSON.stringify(this.recent));}catch{}
  return guideCopy(step,{...options,variant:index});
 }
}
export function guideCopy(step,{lang='en',detour=false,variant=0}={}){
 const ja=lang==='ja';
 if(detour)return ja?`あれっ、ちょっと寄り道だね。「${step.target?.title??step.title}」への道は覚えているよ。案内を続ける？`:`Oop, a little detour! I still remember the way to ${step.target?.title??step.title}. Shall we continue, or explore here?`;
 const destination=step.target?.title??step.title;
 if(step.kind==='nav'||step.kind==='link'){
  const nav=step.kind==='nav',link=ja?`「${step.title}」`:`${step.title}`;
  const separate=step.linkLabel&&!words(step.linkLabel).includes(words(step.title));
  const action=ja?(nav?`ヘッダーの${link}をクリックしてね。`:separate?`${link}の「${step.linkLabel}」リンクをクリックしてね。`:`指している${link}のタイトルをクリックしてね。`):(nav?`Click the ${link} header tab.`:separate?`Click the “${step.linkLabel}” link for ${link}, where I’m pointing.`:`Click ${link} where I’m pointing.`);
  const directions=ja?[
   `一緒に「${destination}」を見に行こう！${action}次のページでも案内するよ。`,
   `こっちだよ！「${destination}」への道は、ここから続いているんだ。${action}`,
   `小さな寄り道、出発！行き先は「${destination}」。${action}そこから一緒に進もう。`,
   `「${destination}」まで、もう少し！${action}開いたら、一緒に続きを見てみよう。`
  ]:[
   `Come along—let’s explore ${destination} together! ${action} I’ll keep leading you from there.`,
   `This way! Our destination is ${destination}. ${action} We’ll take the next step together.`,
   `Ooh, a little detour for us! I’m taking you to ${destination}. ${action} We’re not at the final stop yet.`,
   `Let’s go have a look at ${destination}! ${action} I’ll be there to show you the way.`
  ];
  return directions[Math.abs(Math.trunc(variant))%directions.length];
 }
 const endings=[
  [`We’ve reached ${step.title}! Let’s take a closer look together, one little detail at a time.`,`「${step.title}」に着いたよ！小さなところから、一緒にじっくり見ていこう。`],
  [`Here we are: ${step.title}. I’ll stay nearby while you have a look—there’s no hurry to rush away.`,`「${step.title}」に到着！そばにいるから、ゆっくり見てね。急いで次に行かなくても大丈夫。`],
  [`Found it—${step.title}! My little map can rest now. Exploring together is my favorite part.`,`見つけた、「${step.title}」だよ！小さな地図もちょっと休憩。一緒に見て回る時間が好きなんだ。`],
  [`${step.title}, right here! We can pause and take it in together.`,`ここが「${step.title}」！ひと休みしながら、一緒に見てみよう。`],
  [`We’re at ${step.title}. I’m glad we followed this little trail together.`,`「${step.title}」まで来たよ。一緒にここまでたどり着けてうれしい！`],
  [`This is ${step.title}—our destination! I’ll keep you company while you explore.`,`目的地の「${step.title}」だよ！見て回るあいだ、わたしもそばにいるね。`],
  [`We made it to ${step.title}! Finding our way is lovely; taking time to look is lovely too.`,`「${step.title}」に着いたね！道を探すのも楽しいけど、ゆっくり眺める時間も好き。`],
  [`Your stop: ${step.title}. One tiny guide, mission complete! Now we can settle in and look together.`,`「${step.title}」、到着でーす。小さな案内役、お仕事できた！落ち着いて一緒に見てみよう。`]
 ];
 return endings[Math.abs(Math.trunc(variant))%endings.length][ja?1:0];
}
