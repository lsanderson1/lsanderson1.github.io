import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Companion} from '../assets/yuki/runtime/companion.mjs';
import {projectFrame} from '../assets/yuki/runtime/projection.mjs';
import {emotionPlayback,emotionKinds,talkKinds} from '../assets/yuki/runtime/reply-cues.mjs';
import {takeoffMs,landingMs,contactPhases} from '../assets/yuki/runtime/timing.mjs';
import {airClips} from '../assets/yuki/runtime/air-reactions.mjs';
import {SiteGuide} from '../assets/yuki/runtime/site-guide.mjs';
import {PageMotion,pageProjection,prepareCall,containPageRover} from '../assets/yuki/runtime/page-motion.mjs';
import {VisitorPersonality,greetings,replySequence,cueArtwork} from '../assets/yuki/runtime/visitor-personality.mjs';
import {applyReplyCue} from '../assets/yuki/runtime/reply-cues.mjs';
const {clips}=JSON.parse(fs.readFileSync(new URL('../assets/yuki/manifest.json',import.meta.url)));
const make=(startAsleep=false)=>new Companion({rest:clips.rest.frames.map(f=>f.durationMs),flight:clips.flight.frames.map(f=>f.durationMs??60),takeoff:takeoffMs,landing:landingMs},[{id:'home',x:130,y:680},{id:'projects',x:1000,y:430,autonomous:false}],{random:()=>.7,motion:contactPhases,idle:{},lifecycle:{clips,startAsleep,inactivityMs:Infinity,crashChance:0},greeting:clips.greeting.playback,emotions:{...emotionPlayback(clips),pointLeft:clips.pointLeft.playback,pointRight:clips.pointRight.playback},airClips});
function run(c,ms,guide){const seen=new Set();for(let t=0;t<ms;t+=10){c.update(10);guide?.update();const p=projectFrame(c,clips,155);assert(p.frame?.file,'Every state must have a real drawing');assert(Number.isFinite(p.x)&&Number.isFinite(p.y)&&Number.isFinite(p.scale)&&p.scale>0);seen.add(p.frame.file);}return seen;}
test('all manifest drawings exist, durations are positive, variable frame counts retained',()=>{for(const info of Object.values(clips)){assert(info.frames.length);for(const f of info.frames){assert(fs.existsSync(new URL('../assets/yuki/'+f.file,import.meta.url)));assert(f.durationMs>0);}}assert.equal(clips.pointLeft.frames.length,24);assert.equal(clips.pointRight.frames.length,22);assert.equal(clips.wake.frames.length,19);});
test('sleep → wake → idle and bedtime → sleep draw valid frames',()=>{const c=make(true);assert(run(c,7200).size>2);assert(c.lifecycle.wake());run(c,15000);assert.equal(c.lifecycle.state,'awake');assert(c.lifecycle.requestSleep());run(c,20000);assert.equal(c.lifecycle.state,'sleep');});
for(const kind of [...emotionKinds,...talkKinds,'pointLeft','pointRight'])test('ground '+kind+' preserves valid drawing transitions',()=>{const c=make();assert(c.express(kind));const frames=run(c,22000);assert(frames.size>4);assert(!c.emotion.active);});
for(const kind of [...emotionKinds,...talkKinds])test('hover '+kind+' keeps flight and reaction frames valid',()=>{const c=make();c.rover.setArrivalStyle('hover');assert(c.hoverHere());run(c,5000);assert(c.rover.isHovering);assert(c.express(kind));assert(run(c,18000).size>12);assert(c.rover.isHovering);assert.equal(c.airReaction,null);});
test('site guide completes point, flight, landing and presentation',()=>{const c=make();let arrived=false;const guide=new SiteGuide(c,{destinations:[{id:'projects'}],arrive:()=>arrived=true});assert(guide.request('projects'));run(c,30000,guide);assert(arrived);assert.equal(c.rover.at,'projects');});
test('pause, hide and reduced motion freeze animation; reduced-motion guide works',()=>{const c=make();c.rover.playing=false;const first=projectFrame(c,clips,155).frame.file;run(c,3000);assert.equal(projectFrame(c,clips,155).frame.file,first);c.rover.playing=true;c.setLessMotion(true);c.rover.request('projects');run(c,3000);assert.equal(c.rover.at,'projects');assert.equal(c.rover.graph.state,'rest');});

for(const open of [false,true])test(`scroll never starts flight or changes her page perch (chat ${open?'open':'closed'})`,()=>{
 const c=make(),motion=new PageMotion(c);motion.prepared=true;
 const states=new Set(),files=new Set();
 for(let t=0;t<15000;t+=10){
  if(t<5000&&t%100===0)motion.scroll();
  motion.update(10,{open,roam:true,target:{x:220,y:500}});c.update(10);
  states.add(c.rover.graph.state);files.add(projectFrame(c,clips,155).frame.file);
  assert(!c.rover.hidden);
 }
 assert.deepEqual([...states],['rest']);assert.equal(c.rover.position.y,680);assert.equal(c.rover.wanted,'home');
 const p=projectFrame(c,clips,155),screen=pageProjection(p,500);assert.equal(screen.foot.y,p.foot.y-500);assert.equal(screen.scale,p.scale);
});

test('Call Yuki flies in from offscreen and lands with every frame valid',()=>{
 const c=make(),motion=new PageMotion(c),extent={left:-100,right:100,top:-165,bottom:8},viewport={width:390,height:844};
 prepareCall(c.rover,extent,viewport,8000);assert(c.rover.foot.y+extent.bottom<8000);assert(c.rover.foot.y+extent.bottom>7900);
 motion.travel({x:270,y:8700});const states=new Set();
 for(let t=0;t<15000;t+=10){c.update(10);states.add(c.rover.graph.state);const p=pageProjection(projectFrame(c,clips,138),8000);assert(p.frame.file);assert(Number.isFinite(p.y));}
 assert(states.has('flight')&&states.has('landing'));assert.equal(c.rover.position.y,8700);
 const before={...c.rover.position};prepareCall(c.rover,extent,viewport,8000);assert.deepEqual(c.rover.position,before);
 containPageRover(c.rover,extent,{width:320,height:568});assert.equal(c.rover.position.y,8700);
});
test('rare wandering is blocked offscreen and cannot fire immediately after scrolling',()=>{
 const c=make(),m=new PageMotion(c,{random:()=>0});m.prepared=true;assert.equal(m.nextRoam,75000);
 m.nextRoam=0;m.update(10,{roam:true,visible:false,target:{x:400,y:600}});assert.equal(c.rover.wanted,'home');
 m.scroll();m.update(10,{roam:true,visible:true,target:{x:400,y:600}});assert.equal(c.rover.wanted,'home');assert(m.nextRoam>=75000);
});

test('wandering chooses a fresh random destination only when a flight is due',()=>{
 const c=make(),m=new PageMotion(c,{random:()=>0});m.prepared=true;let calls=0;
 const target=()=>{calls++;return {x:640,y:350};};
 m.update(1000,{roam:true,target});assert.equal(calls,0);
 m.nextRoam=0;m.update(10,{roam:true,visible:false,target});assert.equal(calls,0);
 m.update(10,{roam:true,visible:true,target});assert.equal(calls,1);assert.equal(c.rover.point(c.rover.wanted).x,640);
});
test('first wave is remembered across pages and languages; greetings exhaust the pool before repeating',()=>{
 const values=new Map(),storage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)};
 const first=new VisitorPersonality(storage,()=>0);assert.equal(first.opening('hi').gesture,'wave');first.markMet();
 const returning=new VisitorPersonality(storage,()=>0);assert.equal(returning.opening('hi').gesture,'talkOpen');
 for(const lang of ['en','ja']){const seen=new Set();let prior;for(let i=0;i<greetings[lang].length;i++){const s=returning.next(lang);assert(!seen.has(s));seen.add(s);prior=s;}assert.notEqual(returning.next(lang),prior);}
 const blocked=new VisitorPersonality({getItem(){throw Error();},setItem(){throw Error();}});blocked.markMet();assert.equal(blocked.opening('hi').gesture,'talkOpen');
});

test('one hundred unique greetings per language survive reloads without early repeats',()=>{
 const values=new Map(),storage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)};
 for(const lang of ['en','ja']){
  assert.equal(greetings[lang].length,100);assert.equal(new Set(greetings[lang]).size,100);
  const seen=new Set();let last;
  for(let i=0;i<100;i++){const p=new VisitorPersonality(storage,()=>.7);const text=p.next(lang);p.markMet();assert(!seen.has(text));seen.add(text);last=text;}
  assert.notEqual(new VisitorPersonality(storage,()=>.7).next(lang),last);
 }
 const first=new VisitorPersonality(undefined,()=>.99);assert.equal(first.next('en'),greetings.en[0]);assert.notEqual(first.next('en'),greetings.en[0]);
});

test('every unique animation sheet is reachable; legacy flight is the same hover artwork',()=>{
 const used=new Set(),names=new Map(Object.entries(clips).map(([name,info])=>[info,name]));
 const observe=(c,ms)=>{for(let t=0;t<ms;t+=10){c.update(10);used.add(names.get(projectFrame(c,clips,155).info));}};
 const life=make(true);observe(life,7200);life.lifecycle.wake();observe(life,12000);life.lifecycle.requestSleep();observe(life,20000);
 const travel=make();travel.rover.request('projects');observe(travel,15000);travel.rover.request('home');observe(travel,15000);
 const greeting=make();assert(greeting.greet());observe(greeting,15000);
 const attention=make();assert(attention.look(-1));observe(attention,5000);assert(attention.look(1));observe(attention,5000);
 for(const kind of [...emotionKinds,...talkKinds,'pointLeft','pointRight']){const c=make();assert(c.express(kind));observe(c,22000);}
 for(const kind of [...emotionKinds,...talkKinds]){const c=make();c.rover.setArrivalStyle('hover');assert(c.hoverHere());observe(c,5000);assert(c.express(kind));observe(c,18000);}
 const crash=make();crash.lifecycle.crashCooldownMs=0;crash.lifecycle.crashChance=1;crash.rover.request('projects');observe(crash,22000);
 assert.deepEqual(clips.flight.frames.map(f=>f.file),clips.flightHover.frames.map(f=>f.file));
 assert.deepEqual([...used].sort(),Object.keys(clips).filter(k=>k!=='flight').sort());
});
test('expressive replies use existing whole-body reactions then a calm talking gesture',()=>{
 for(const emotion of emotionKinds){const seq=replySequence({text:'Hello',emotion,gesture:'none'});assert.equal(seq[0].emotion,emotion);assert.equal(seq[1].gesture,'talkOpen');for(const cue of seq)assert(clips[cueArtwork(cue)]);}
 assert(!replySequence({text:'Hi',emotion:'delighted',gesture:'wave'}).some(c=>c.gesture==='wave'));
 assert.equal(replySequence({text:'Hi'},{firstMeeting:true})[0].gesture,'wave');
 const c=make(true),person=new VisitorPersonality(),cue=person.opening('Hi');assert(!applyReplyCue(c,cue).animationAccepted);
 c.lifecycle.wake();run(c,12000);assert(applyReplyCue(c,cue).animationAccepted);run(c,12000);assert(!c.greeting.active);
});
test('roaming waits politely while asleep or while chat is open',()=>{
 const c=make(true),motion=new PageMotion(c);motion.prepared=true;motion.nextRoam=0;
 motion.update(20,{open:false,roam:true,target:{x:300,y:500}});assert.equal(c.rover.wanted,c.rover.at);
 c.lifecycle.enter('awake');motion.update(20,{open:true,roam:true,target:{x:300,y:500}});assert.equal(c.rover.wanted,c.rover.at);
 motion.update(20,{open:false,roam:true,target:{x:300,y:500}});assert.notEqual(c.rover.wanted,c.rover.at);
});
test('viewport containment translates the route with the whole drawing',()=>{
 const c=make(),r=c.rover;r.request('projects');run(c,2500);
 const before=r.position.x-r.route.start.x,extent={left:-90,right:90,top:-160,bottom:8};
 containPageRover(r,extent,{width:320,height:568});
 assert(Math.abs(r.position.x-r.route.start.x-before)<.00001);
 assert(r.foot.x>=98&&r.foot.x<=222);
});
test('guidance travels before presenting instead of pointing at a distant section',()=>{
 const c=make(),g=new SiteGuide(c,{destinations:[{id:'projects'}]});g.request('projects');g.update();
 assert.equal(g.stage,'travel');assert.equal(c.rover.wanted,'projects');assert(!c.emotion.requested);
});
