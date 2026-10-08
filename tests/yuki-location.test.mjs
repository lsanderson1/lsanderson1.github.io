import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {YukiLocation,locationKey,locationPage,portalSection,travelPortalSection,capturePose,restorePose,poseArtwork,returnAfterSleepMs} from '../assets/yuki/home/location.mjs';
import {HomeDialogue,homeLines} from '../assets/yuki/home/home-dialogue.mjs';
import {Companion} from '../assets/yuki/runtime/companion.mjs';
import {emotionPlayback} from '../assets/yuki/runtime/reply-cues.mjs';
import {takeoffMs,landingMs,contactPhases} from '../assets/yuki/runtime/timing.mjs';
import {airClips} from '../assets/yuki/runtime/air-reactions.mjs';
import {projectFrame} from '../assets/yuki/runtime/projection.mjs';
import {summonTiming,summonPhase,callFlightDuration,catchInFlight} from '../assets/yuki/home/summon.mjs';
import {PageMotion} from '../assets/yuki/runtime/page-motion.mjs';
const {clips}=JSON.parse(fs.readFileSync(new URL('../assets/yuki/manifest.json',import.meta.url)));
const make=()=>new Companion({rest:clips.rest.frames.map(f=>f.durationMs),flight:clips.flight.frames.map(f=>f.durationMs??60),takeoff:takeoffMs,landing:landingMs},[{id:'home',x:130,y:680},{id:'next',x:750,y:430}],{random:()=>.7,motion:contactPhases,idle:{},lifecycle:{clips,startAsleep:false,inactivityMs:90000,crashChance:0},greeting:clips.greeting.playback,emotions:emotionPlayback(clips),airClips});
const storage=()=>{const data=new Map();return {getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)};};
const run=(c,ms)=>{for(let t=0;t<ms;t+=10)c.update(10);};

test('one canonical location starts in the nest, carries between languages, never follows unrelated navigation',()=>{
 const s=storage(),a=new YukiLocation(s,{now:()=>10000});assert(a.here('/yuki/'));assert(a.here('/ja/yuki/'));assert(!a.here('/'));
 a.record({page:'/ja/resume.html',title:'Resume',garden:false,position:{x:.7,y:1480},status:'rest',pose:null});
 const b=new YukiLocation(s,{now:()=>10100});assert(b.here('/resume.html'));assert(!b.here('/projects/'));assert.deepEqual(b.state.position,{x:.7,y:1480});
 assert.equal(locationPage('/site/ja/yuki/index.html','/site'),'/yuki/');
});
test('real Unix timestamps survive navigation rather than falling back to the nest',()=>{
 const s=storage(),now=Date.now(),a=new YukiLocation(s,{now:()=>now});a.record({page:'/resume.html',title:'Resume',position:{x:.68,y:728},status:'rest',pose:null});
 const b=new YukiLocation(s,{now:()=>now+50});assert(b.here('/resume.html'));assert(!b.here('/yuki/'));assert.deepEqual(b.state.position,{x:.68,y:728});
});
test('portal categories include Japanese and specific project pages',()=>{
 for(const [from,expected] of [['/yuki/','/yuki/'],['/ja/essays/smartquestions.html','/essays/'],['/projects/ProjectReap.html','/projects/'],['/unreal-journey/project-1.html','/unreal-journey/'],['/ja/resume.html','/resume.html'],['/','/']])assert.equal(portalSection(from),expected);
});
test('every cross-page journey enters the destination tab and exits the origin tab',()=>{
 const pages=['/yuki/','/ja/yuki/','/resume.html','/ja/resume.html','/projects/ProjectReap.html','/ja/essays/smartquestions.html','/unreal-journey/project-1.html','/'];
 for(const from of pages)for(const to of pages){
  const transfer={origin:{page:from},target:{page:to}};
  assert.equal(travelPortalSection({kind:'departing',origin:transfer.origin,transfer},from),portalSection(to),`${from} enters ${to}`);
  assert.equal(travelPortalSection({kind:'incoming',origin:transfer.origin,transfer},to),portalSection(from),`${to} emerges from ${from}`);
  assert.equal(travelPortalSection({kind:'incoming',transfer},to),portalSection(from));
 }
 assert.equal(travelPortalSection({kind:'returning'},'/resume.html'),'/yuki/');
 assert.equal(travelPortalSection(null,'/ja/essays/example.html'),'/essays/');
});
test('actual portal placement uses the travel leg while the exit afterglow stays at its doorway',()=>{
 const source=fs.readFileSync(new URL('../assets/yuki/yuki.mjs',import.meta.url),'utf8');
 const start=source.indexOf(' function portalPoint('),end=source.indexOf('\n function placeAt(',start);
 const anchors=new Map([['/yuki/',{left:580,bottom:54,width:80}],['/resume.html',{left:280,bottom:54,width:80}]]);
 const portal={dataset:{},style:{}},presence={state:{page:'/yuki/'}},trip={kind:'departing',origin:{page:'/yuki/'},transfer:{target:{page:'/resume.html'}}};
 const point=new Function('travelPortalSection','portalTrip','presence','headerAnchor','portal','layout','bodyHeight','scrollY','headerBottom',`${source.slice(start,end)};return portalPoint;`)(travelPortalSection,trip,presence,section=>({closest:()=>null,getBoundingClientRect:()=>anchors.get(section)}),portal,{width:1280},155,200,54);
 assert.equal(point().x,320);assert.equal(portal.dataset.source,'/resume.html');
 const exitSection=portal.dataset.source;trip.kind='incoming';assert.equal(point().x,620);assert.equal(portal.dataset.source,'/yuki/');
 assert.equal(point(exitSection).x,320);assert.equal(portal.dataset.source,'/resume.html');
 assert.equal(point().y,54+155*.30+200);
});
test('return-home waits 45 seconds after sleep, never resets that timestamp on periodic saves',()=>{
 const s=storage();let now=1000;const a=new YukiLocation(s,{now:()=>now});const record={page:'/resume.html',position:{x:.5,y:800},status:'sleep'};
 a.record(record);now+=20000;a.record(record);assert.equal(a.state.sleepSince,1000);assert(!a.shouldReturn);
 now=1000+returnAfterSleepMs;assert(a.shouldReturn);a.home();assert(!a.shouldReturn);assert(a.here('/ja/yuki/'));assert.equal(a.state.spot,'nest');
});
test('an unloaded page resolves inactivity without moving the visitor or waking a paused dragon',()=>{
 let now=1000;const s=storage(),a=new YukiLocation(s,{now:()=>now});a.record({page:'/resume.html',position:{x:.5,y:800},status:'rest',pose:{playing:true,life:{inactive:0}}});
 now=91000;a.settleAway('/');assert.equal(a.state.status,'sleep');assert.equal(a.state.sleepSince,91000);
 now=136000;a.settleAway('/');assert(a.here('/yuki/'));
 a.record({page:'/resume.html',position:{x:.5,y:800},status:'rest',pose:{playing:false,life:{inactive:0}}});now+=999999;a.settleAway('/');assert(a.here('/resume.html'));
});
test('corrupt storage and unavailable storage fall back safely',()=>{
 const s=storage();for(const value of ['broken','{}',JSON.stringify({version:1,page:'//evil.example',position:{x:1,y:2},status:'sleep',updatedAt:1})]){s.setItem(locationKey,value);assert(new YukiLocation(s).here('/yuki/'));}
 const a=new YukiLocation({getItem(){throw Error();},setItem(){throw Error();}});assert.doesNotThrow(()=>a.home());
});
for(const state of ['sleep','wake','bedtime','crash'])test(`restoring ${state} preserves its frame and position`,()=>{
 const a=make();a.lifecycle.enter(state);run(a,330);const p=capturePose(a),b=make();assert(restorePose(b,JSON.parse(JSON.stringify(p)),clips));
 const before=projectFrame(a,clips,155),after=projectFrame(b,clips,155);assert.equal(after.frame.file,before.frame.file);assert.deepEqual(after.foot,before.foot);assert.equal(b.lifecycle.state,a.lifecycle.state);
});
test('flight position, route, direction and wing phase restore without restarting takeoff',()=>{
 const a=make();a.rover.request('next');run(a,2100);assert.equal(a.rover.graph.state,'flight');
 const encoded=capturePose(a,p=>({x:p.x/1000,y:p.y/1000})),b=make();assert(restorePose(b,encoded,clips,p=>({x:p.x*1000,y:p.y*1000})));
 assert.equal(b.rover.graph.state,'flight');assert(Math.abs(a.rover.foot.x-b.rover.foot.x)<.00001);assert.equal(projectFrame(a,clips,155).frame.file,projectFrame(b,clips,155).frame.file);
 run(b,10000);assert.equal(b.rover.graph.state,'rest');assert.equal(b.rover.position.x,750);
});
test('hover reaction and grounded gesture resume with the same drawings',()=>{
 const a=make();a.express('talkOpen');run(a,500);const b=make();assert(restorePose(b,capturePose(a),clips));assert.equal(projectFrame(a,clips,155).frame.file,projectFrame(b,clips,155).frame.file);
 const c=make();c.rover.setArrivalStyle('hover');c.hoverHere();run(c,5000);c.express('confused');run(c,700);assert(c.airReaction);const p=capturePose(c),d=make();assert(restorePose(d,p,clips));assert.equal(d.rover.hoverRemaining,Infinity);assert.deepEqual(d.airReaction,c.airReaction);assert(poseArtwork(p,clips).includes('hoverConfused'));
});
test('invalid playback frames are clamped and unknown art cannot be loaded',()=>{
 const a=make(),p=capturePose(a);p.graph.frame=10000;p.life.frame=-99;p.emotion={kind:'https://elsewhere'};assert(restorePose(a,p,clips));assert(!poseArtwork(p,clips).includes('https://elsewhere'));assert(projectFrame(a,clips,155).frame.file);assert(!restorePose(a,{...p,position:{x:NaN,y:10}},clips));
});
test('all 100 thoughts survive refresh and language changes without reuse until each pool is exhausted',()=>{
 const s=storage();for(const spot of Object.keys(homeLines)){const seen=new Set();for(let n=0;n<20;n++){const ja=n%2===1,text=new HomeDialogue(()=>0,s).next(spot,ja),i=homeLines[spot].findIndex(pair=>pair[ja?1:0]===text);assert(!seen.has(i));seen.add(i);}assert.equal(seen.size,20);}
});
test('calls take longer from distant spots and sleeping adds the complete wake-up',()=>{
 const near=summonTiming({status:'rest',departureDistance:220},clips),far=summonTiming({status:'rest',departureDistance:1500},clips),asleep=summonTiming({status:'sleep',departureDistance:220},clips);
 assert(far.total>near.total);assert.equal(asleep.total-near.total,clips.wake.frames.reduce((n,f)=>n+f.durationMs,0));assert.equal(summonPhase(1,asleep),'waking');assert.equal(summonPhase(asleep.wake+1,asleep),'taking-off');assert.equal(summonPhase(asleep.wake+asleep.takeoff+1,asleep),'travelling');
 assert.equal(summonTiming({status:'sleep'},clips,{reduced:true}).total,500);
});
test('an offscreen call keeps the true start and takes time proportional to distance',()=>{
 const a=make();a.rover.position.y=3200;a.rover.points[0].y=3200;const target={x:600,y:600},duration=callFlightDuration(a.rover.foot,target),motion=new PageMotion(a);
 motion.travel(target,{duration});assert.equal(a.rover.position.y,3200);run(a,2100);assert(a.rover.route);assert.equal(a.rover.route.duration,duration);assert(duration>10000);
 const b=make();restorePose(b,capturePose(a),clips);assert.equal(b.rover.route.duration,duration);
});
test('summoning persists both travel legs and can be intercepted on the origin page',()=>{
 let now=Date.now();const s=storage(),a=new YukiLocation(s,{now:()=>now});a.record({page:'/essays/',title:'Essays',position:{x:.8,y:700},status:'rest',pose:capturePose(make()),departureDistance:800});
 const timing=summonTiming(a.state,clips),target={page:'/resume.html',title:'Resume',garden:false,spot:null,position:{x:.7,y:640}};
 a.beginTransfer(target,timing,7000);now+=1200;const b=new YukiLocation(s,{now:()=>now});assert.equal(b.transit().leg,'departing');assert(b.here('/ja/essays/'));assert.equal(b.transfer.origin.position.x,.8);
 b.cancelTransfer();now+=30000;assert.equal(b.transit(),null);assert(b.here('/essays/'));assert.equal(new YukiLocation(s,{now:()=>now}).transfer,null);
});
test('switching pages midway neither skips departure nor restarts the arriving flight',()=>{
 let now=Date.now();const s=storage(),a=new YukiLocation(s,{now:()=>now}),timing=summonTiming(a.state,clips);a.beginTransfer({page:'/projects/',title:'Projects',position:{x:.65,y:620}},timing,6000);
 now+=timing.total-1;assert.equal(a.transit().leg,'departing');assert(a.here('/yuki/'));
 now+=501;const b=new YukiLocation(s,{now:()=>now});assert.equal(b.transit().age,500);assert.equal(b.transit().leg,'incoming');assert(b.here('/projects/'));assert(!b.here('/yuki/'));
 now+=6000;b.transit();assert.equal(b.transfer,null);assert(b.here('/projects/'));assert.equal(b.state.status,'rest');assert.deepEqual(b.state.position,{x:.65,y:620});
});
test('catching mid-flight stops at the current feet position and keeps flapping',()=>{
 const a=make();a.rover.request('next');run(a,2200);const before={...a.rover.foot};assert(catchInFlight(a));assert.deepEqual(a.rover.foot,before);assert(a.rover.isHovering);assert.equal(a.rover.hoverRemaining,Infinity);
 run(a,8000);assert.equal(a.rover.foot.x,before.x);assert(Math.abs(a.rover.foot.y-before.y)<3);
 const b=make();restorePose(b,capturePose(a),clips);assert(b.rover.isHovering);assert.deepEqual(b.rover.foot,a.rover.foot);
});
test('a return-home already underway completes off-page, not a reset during unrelated navigation',()=>{
 let now=Date.now();const a=new YukiLocation(storage(),{now:()=>now});a.record({page:'/resume.html',position:{x:.6,y:700},status:'returning',pose:{route:{duration:8000,elapsed:1000}}});
 now+=3000;a.settleAway('/essays/');assert(a.here('/resume.html'));now+=5000;a.settleAway('/essays/');assert(a.here('/yuki/'));
});
