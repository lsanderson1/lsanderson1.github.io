import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Companion} from '../assets/yuki/runtime/companion.mjs';
import {projectFrame} from '../assets/yuki/runtime/projection.mjs';
import {emotionPlayback,emotionKinds,talkKinds} from '../assets/yuki/runtime/reply-cues.mjs';
import {takeoffMs,landingMs,contactPhases} from '../assets/yuki/runtime/timing.mjs';
import {airClips} from '../assets/yuki/runtime/air-reactions.mjs';
import {SiteGuide} from '../assets/yuki/runtime/site-guide.mjs';
import {PageMotion,containRover} from '../assets/yuki/runtime/page-motion.mjs';
const {clips}=JSON.parse(fs.readFileSync(new URL('../assets/yuki/manifest.json',import.meta.url)));
const make=(startAsleep=false)=>new Companion({rest:clips.rest.frames.map(f=>f.durationMs),flight:clips.flight.frames.map(f=>f.durationMs??60),takeoff:takeoffMs,landing:landingMs},[{id:'home',x:130,y:680},{id:'projects',x:1000,y:430,autonomous:false}],{random:()=>.7,motion:contactPhases,idle:{},lifecycle:{clips,startAsleep,inactivityMs:Infinity,crashChance:0},greeting:clips.greeting.playback,emotions:{...emotionPlayback(clips),pointLeft:clips.pointLeft.playback,pointRight:clips.pointRight.playback},airClips});
function run(c,ms,guide){const seen=new Set();for(let t=0;t<ms;t+=10){c.update(10);guide?.update();const p=projectFrame(c,clips,155);assert(p.frame?.file,'Every state must have a real drawing');assert(Number.isFinite(p.x)&&Number.isFinite(p.y)&&Number.isFinite(p.scale)&&p.scale>0);seen.add(p.frame.file);}return seen;}
test('all manifest drawings exist, durations are positive, variable frame counts retained',()=>{for(const info of Object.values(clips)){assert(info.frames.length);for(const f of info.frames){assert(fs.existsSync(new URL('../assets/yuki/'+f.file,import.meta.url)));assert(f.durationMs>0);}}assert.equal(clips.pointLeft.frames.length,24);assert.equal(clips.pointRight.frames.length,22);assert.equal(clips.wake.frames.length,19);});
test('sleep → wake → idle and bedtime → sleep draw valid frames',()=>{const c=make(true);assert(run(c,7200).size>2);assert(c.lifecycle.wake());run(c,15000);assert.equal(c.lifecycle.state,'awake');assert(c.lifecycle.requestSleep());run(c,20000);assert.equal(c.lifecycle.state,'sleep');});
for(const kind of [...emotionKinds,...talkKinds,'pointLeft','pointRight'])test('ground '+kind+' preserves valid drawing transitions',()=>{const c=make();assert(c.express(kind));const frames=run(c,22000);assert(frames.size>4);assert(!c.emotion.active);});
for(const kind of [...emotionKinds,...talkKinds])test('hover '+kind+' keeps flight and reaction frames valid',()=>{const c=make();c.rover.setArrivalStyle('hover');assert(c.hoverHere());run(c,5000);assert(c.rover.isHovering);assert(c.express(kind));assert(run(c,18000).size>12);assert(c.rover.isHovering);assert.equal(c.airReaction,null);});
test('site guide completes point, flight, landing and presentation',()=>{const c=make();let arrived=false;const guide=new SiteGuide(c,{destinations:[{id:'projects'}],arrive:()=>arrived=true});assert(guide.request('projects'));run(c,30000,guide);assert(arrived);assert.equal(c.rover.at,'projects');});
test('pause, hide and reduced motion freeze animation; reduced-motion guide works',()=>{const c=make();c.rover.playing=false;const first=projectFrame(c,clips,155).frame.file;run(c,3000);assert.equal(projectFrame(c,clips,155).frame.file,first);c.rover.playing=true;c.setLessMotion(true);c.rover.request('projects');run(c,3000);assert.equal(c.rover.at,'projects');assert.equal(c.rover.graph.state,'rest');});

for(const open of [false,true])test(`scroll takes off, keeps flapping, then lands (chat ${open?'open':'closed'})`,()=>{
 const c=make(),motion=new PageMotion(c);motion.prepared=true;
 const states=new Set(),files=new Set();
 for(let t=0;t<15000;t+=10){
  if(t<5000&&t%100===0)motion.scroll();
  motion.update(10,{open,roam:false,target:{x:220,y:500}});c.update(10);
  states.add(c.rover.graph.state);files.add(projectFrame(c,clips,155).frame.file);
  assert(!c.rover.hidden);
 }
 assert(states.has('takeoff')&&states.has('flight')&&states.has('landing'));
 assert(files.size>20);assert.equal(c.rover.graph.state,'rest');assert(!motion.following);
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
 containRover(r,extent,{width:320,height:568});
 assert(Math.abs(r.position.x-r.route.start.x-before)<.00001);
 assert(r.foot.x>=98&&r.foot.x<=222&&r.foot.y>=168&&r.foot.y<=552);
});
test('guidance travels before presenting instead of pointing at a distant section',()=>{
 const c=make(),g=new SiteGuide(c,{destinations:[{id:'projects'}]});g.request('projects');g.update();
 assert.equal(g.stage,'travel');assert.equal(c.rover.wanted,'projects');assert(!c.emotion.requested);
});
