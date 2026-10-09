import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {GuideJourney,GuideDialogue,journeyKey,guidePath,guideTarget,isGuideRequest,resolveGuideRequest,guideChoice,planGuideStep,findGuideElement,guideCopy} from '../assets/yuki/runtime/guide-journey.mjs';
import {readSession} from '../assets/yuki/protocol.mjs';

const fixtures=[['/','Home','ホーム'],['/projects/','Projects','制作実績'],['/essays/','Essays','技術記事'],['/unreal-journey/','Unreal Journey','開発記録'],['/resume.html','Resume','履歴書'],['/projects/ProjectReap.html','Project Reap','Project Reap'],['/projects/BlenderCLI.html','Blender CLI Integration','Blender CLI Integration'],['/unreal-journey/museum.html','Interactable Museum','インタラクティブ博物館']];
const pages=['en','ja'].flatMap(lang=>fixtures.map(([url,en,ja])=>({url:(lang==='ja'?'/ja':'')+url,title:lang==='ja'?ja:en,lang,sections:[{id:'s0',title:lang==='ja'?ja:en,anchor:'title'},{id:'s1',title:lang==='ja'?'制作の流れ':'Development process',anchor:lang==='ja'?'yuki-section-1':'development'},{id:'i0',title:'Overview image',anchor:'yuki-image-0',kind:'image'}]})));
const store=()=>{const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)};};

test('the exact requested résumé sentence resolves without AI or external URLs',()=>{
 const request=resolveGuideRequest('alright, about the website can you point and lead me to the resume section?',pages,'/');
 assert.equal(request.target.url,'/resume.html');
 assert.equal(planGuideStep(request.target,'/',pages).kind,'nav');
 assert.equal(planGuideStep(request.target,'/',pages).url,'/resume.html');
});
test('English and Japanese route intents understand page names, particles and résumé accents',()=>{
 for(const text of ['Take me to the résumé','履歴書へ案内して','履歴はどこ？'])assert.equal(resolveGuideRequest(text,pages,'/ja/',{lang:'ja'}).target.url,'/ja/resume.html');
 assert.equal(resolveGuideRequest('Project Reapへ連れていって',pages,'/ja/',{lang:'ja'}).target.url,'/ja/projects/ProjectReap.html');
 assert.equal(resolveGuideRequest('インタラクティブ博物館へ案内して',pages,'/ja/',{lang:'ja'}).target.url,'/ja/unreal-journey/museum.html');
});
test('specific project routes lead through the header category, clickable project title, and destination',()=>{
 for(const lang of ['en','ja']){
  const prefix=lang==='ja'?'/ja':'',options={lang};
  const target=resolveGuideRequest('Can you show me Project Reap?',pages,prefix+'/',options).target;
  const a=planGuideStep(target,prefix+'/',pages,options),b=planGuideStep(target,prefix+'/projects/',pages,options),c=planGuideStep(target,target.url,pages,options);
  assert.equal(a.kind,'nav');assert.equal(a.url,prefix+'/projects/');
  assert.equal(b.kind,'link');assert.equal(b.url,prefix+'/projects/ProjectReap.html');
  assert.equal(c.kind,'arrive');assert.equal(c.url,target.url);
 }
});
test('Unreal projects use Unreal Journey instead of the unrelated Projects category',()=>{
 const target=guideTarget('/unreal-journey/museum.html',pages);
 assert.equal(planGuideStep(target,'/projects/',pages).url,'/unreal-journey/');
 assert.equal(planGuideStep(target,'/unreal-journey/',pages).url,target.url);
});
test('normal factual questions, explicit refusal and fiction do not start navigation',()=>{
 for(const text of ['Explain the résumé','What technology does Project Reap use?','Do not guide me to the resume','Don’t show me Project Reap','案内しないで','Tell me a story about your wings'])assert.equal(isGuideRequest(text),false,text);
});
test('ambiguous project requests ask a choice and unknown requests never invent a destination',()=>{
 const multiple=resolveGuideRequest('Show me Project Reap or Blender CLI Integration',pages,'/');
 assert.equal(multiple.choices.length,2);
 assert.deepEqual(resolveGuideRequest('Take me to a secret admin area',pages,'/'),{choices:[]});
});

test('clarification answers start the named route without confirmation buttons in either language',()=>{
 const choices=[guideTarget('/resume.html',pages),guideTarget('/projects/ProjectReap.html',pages)];
 for(const text of ['1','first','Resume please'])assert.equal(guideChoice(text,choices).url,'/resume.html');
 for(const text of ['2','second','Project Reap','2番'])assert.equal(guideChoice(text,choices).url,'/projects/ProjectReap.html');
 for(const text of ['3','Tell me a story','yes','https://evil.test'])assert.equal(guideChoice(text,choices),null);
 const jp=[guideTarget('/ja/resume.html',pages,'ja'),guideTarget('/ja/unreal-journey/museum.html',pages,'ja')];
 assert.equal(guideChoice('インタラクティブ博物館でお願い',jp).url,jp[1].url);
 const ui=readFileSync(new URL('../assets/yuki/yuki.mjs',import.meta.url),'utf8');
 assert.doesNotMatch(ui,/routeButtons|yuki-route-actions|Show me: /);
 assert.match(ui,/if\(requested\?\.target\)\{[^}]*await beginJourney\(requested.target\)/);
 assert.match(ui,/if\(chosen\)\{[^}]*await beginJourney\(chosen\)/);
});
test('sections and images use catalogued anchors; unknown/external/protocol URLs are rejected',()=>{
 const target=resolveGuideRequest('Show me the development process',pages,'/projects/ProjectReap.html').target;
 assert.equal(target.url,'/projects/ProjectReap.html#development');assert.equal(target.section,'s1');
 assert.equal(planGuideStep(target,'/projects/ProjectReap.html',pages).kind,'arrive');
 assert.equal(guideTarget('/projects/ProjectReap.html#yuki-image-0',pages).section,'i0');
 for(const url of ['//evil.test','https://evil.test','javascript:alert(1)','/unpublished.html','/projects/ProjectReap.html#missing'])assert.equal(guideTarget(url,pages),null,url);
});
test('language switches retain the route but do not reinterpret localized section IDs',()=>{
 const target=guideTarget('/projects/ProjectReap.html#development',pages,'ja');
 assert.equal(target.url,'/ja/projects/ProjectReap.html');
 assert.equal(planGuideStep(target,'/ja/projects/',pages,{lang:'ja'}).kind,'link');
 assert.equal(guidePath('/ja/projects/index.html'),guidePath('/projects/'));
});
test('a picture named after a project does not steal a whole-project destination',()=>{
 const catalog=pages.map(p=>({...p,sections:[...p.sections,{id:'i1',title:p.title,anchor:'title-image',kind:'image'}]}));
 assert.equal(resolveGuideRequest('Show me Project Reap',catalog,'/').target.url,'/projects/ProjectReap.html');
 assert.equal(resolveGuideRequest('Show me Project Reap development process',catalog,'/').target.url,'/projects/ProjectReap.html#development');
});
test('routes work under a base path without allowing destinations outside it',()=>{
 const nested=pages.map(p=>({...p,url:'/portfolio'+p.url}));
 const t=guideTarget('/portfolio/projects/ProjectReap.html',nested,'ja','/portfolio');
 assert.equal(t.url,'/portfolio/ja/projects/ProjectReap.html');
 assert.equal(planGuideStep(t,'/portfolio/ja/',nested,{lang:'ja',base:'/portfolio'}).url,'/portfolio/ja/projects/');
 assert.equal(guideTarget('/projects/ProjectReap.html',nested,'en','/portfolio'),null);
});
test('route memory survives navigation, reload and language switching; wrong turns pause gently',()=>{
 const storage=store(),clock=()=>1000;let route=new GuideJourney(storage,clock);
 route.start('/projects/ProjectReap.html','/');route.expect('/projects/','/');
 route=new GuideJourney(storage,clock);
 assert.equal(route.enter('/ja/'),'resume');assert.equal(route.enter('/projects/'),'continue');
 route.expect('/projects/ProjectReap.html','/projects/');
 assert.equal(new GuideJourney(storage,clock).enter('/essays/'),'detour');
 route=new GuideJourney(storage,clock);assert(route.state.paused);assert.equal(route.enter('/essays/'),'detour');
 route.expect('/projects/','/essays/');assert.equal(route.enter('/projects/'),'continue');
 assert.equal(route.enter('/ja/projects/ProjectReap.html'),'arrived');
 route.clear();assert.equal(new GuideJourney(storage,clock).active,false);
});
test('only active leading mode carries position and adapts it to a resized viewport',()=>{
 const storage=store(),route=new GuideJourney(storage,()=>1000),view={width:1200,height:800};
 route.depart({x:600,y:300},view);assert.equal(route.position(view),null);
 route.start('/resume.html','/');route.depart({x:600,y:300},view);
 const next=new GuideJourney(storage,()=>1000);
 assert.deepEqual(next.position(view),{x:600,y:300});
 assert.deepEqual(next.position({width:600,height:400}),{x:300,y:150});
 route.clear();assert.equal(route.position(view),null);
});
test('expired, future, malformed and unsupported-storage journeys fail safely',()=>{
 for(const value of ['not json',JSON.stringify({at:1000,target:'//evil.test',from:'/'}),JSON.stringify({at:9999999,target:'/resume.html',from:'/'})]){
  const storage=store();storage.setItem(journeyKey,value);assert.equal(new GuideJourney(storage,()=>2000).active,false);
 }
 const storage=store(),route=new GuideJourney(storage,()=>1000);route.start('/resume.html','/');
 assert.equal(new GuideJourney(storage,()=>1801000).active,false);
 const blocked=new GuideJourney({getItem(){throw Error();},setItem(){throw Error();},removeItem(){throw Error();}});blocked.start('/resume.html','/');assert(blocked.active);blocked.clear();assert(!blocked.active);
});
test('DOM targets select the real header/tab and project-title links, not duplicate thumbnails',()=>{
 const thumb={href:'https://site.test/projects/ProjectReap.html',closest:()=>null};
 const title={...thumb,closest:()=>({})},nav={href:'https://site.test/projects/',closest:()=>null};
 const doc={baseURI:'https://site.test/',querySelectorAll:s=>s.startsWith('.fp-nav')?[nav]:[thumb,title],querySelector:()=>title,getElementById:id=>id==='development'?title:null};
 assert.equal(findGuideElement(doc,{kind:'nav',url:'/projects/'}),nav);
 assert.equal(findGuideElement(doc,{kind:'link',url:'/projects/ProjectReap.html'}),title);
 assert.equal(findGuideElement(doc,{kind:'arrive',url:'/projects/ProjectReap.html#development'}),title);
 assert.equal(findGuideElement(doc,{kind:'nav',url:'/essays/'}),null);
});
test('cute route copy remains factual, requires visitor clicks, and avoids obligatory arrival questions',()=>{
 for(const lang of ['en','ja']){
  const nav=guideCopy({kind:'nav',title:'Projects'},{lang}),link=guideCopy({kind:'link',title:'Project Reap'},{lang}),arrival=guideCopy({kind:'arrive',title:'Project Reap'},{lang});
  assert.match(nav,lang==='en'?/click.*header tab/i:/クリック/);assert.match(link,lang==='en'?/click.*pointing/i:/クリック/);
  assert.match(arrival,/Project Reap/);assert(!/[?？]$/.test(arrival));assert.match(guideCopy({title:'Project Reap'},{lang,detour:true}),lang==='en'?/detour/:/寄り道/);
 }
});

test('tour endings vary across page reloads and language changes without inventing destination details',()=>{
 const storage=store(),recent=[];
 for(let i=0;i<24;i++){
  const lang=i%2?'ja':'en',copy=new GuideDialogue(storage,()=>0).copy({kind:'arrive',title:'Project Reap'},{lang});
  const variant=JSON.parse(storage.getItem('yuki-guide-lines-v1')).at(-1);
  assert(!recent.slice(-6).includes(variant));recent.push(variant);
  assert(copy.includes('Project Reap'));assert(!/[?？]$/.test(copy));
  if(lang==='ja')assert(copy.includes('「Project Reap」'));
 }
});

test('guided page transitions use physical presence and the same origin-based summon entrance',()=>{
 const ui=readFileSync(new URL('../assets/yuki/yuki.mjs',import.meta.url),'utf8');
 assert.doesNotMatch(ui,/resident=presence.here\(location.pathname\)\|\|journey.active/);
 assert.match(ui,/const carriedPosition=resident\?journey.position\(layout\):null/);
 assert.match(ui,/callYuki\(\{keepJourney:d.journeySerial!==undefined,destinationPoint:/);
 assert.match(ui,/const origin=\{\.\.\.presence.state\},target=destinationPoint\?\?/);
 assert.match(ui,/if\(presence.transfer\)\{[^}]*continueTransfer\(\)/);
 assert.match(ui,/if\(keepJourney&&calling&&portalTrip\?\.kind==='incoming'\)/);
});
test('UI starts local route requests before AI, persists only leading position and keeps navigation user-driven',()=>{
 const ui=readFileSync(new URL('../assets/yuki/yuki.mjs',import.meta.url),'utf8');
 assert(ui.indexOf('resolveGuideRequest(text,knowledge')<ui.indexOf('await verification.takeToken'));
 assert.match(ui,/if\(journey.active&&companion\)journey.depart/);assert.match(ui,/carriedPosition\?clampFoot/);
 assert(!ui.includes('location.assign('));assert.equal((ui.match(/fetch\(endpoint/g)||[]).length,2);
 assert.match(ui,/if\(d.journeySerial!==undefined&&d.journeySerial!==journeySerial\)return/);
});
test('changing language retains original messages, preferences and a separate active journey',()=>{
 const storage=store(),route=new GuideJourney(storage,()=>1000);route.start('/projects/ProjectReap.html','/');
 for(const [from,to] of [['en','ja'],['ja','en'],[undefined,'ja']]){
  storage.setItem('yuki-session-v1',JSON.stringify({savedAt:1000,language:from,awake:true,roam:true,messages:[{role:'assistant',text:'Hello there!'}],variety:{recent:['Hello there!']}}));
  const switched=readSession(storage,2000,to);assert.equal(switched.messages.length,1);assert.equal(switched.messages[0].text,'Hello there!');assert.equal(switched.messages[0].language,from??'en');assert.equal(switched.language,to);assert(switched.awake&&switched.roam);assert(new GuideJourney(storage,()=>2000).active);
 }
 storage.setItem('yuki-session-v1',JSON.stringify({savedAt:1000,language:'en',messages:[{role:'user',text:'Lead me to Resume'}]}));
 assert.equal(readSession(storage,2000,'en').messages.length,1);
});
