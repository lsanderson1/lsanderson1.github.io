import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolveGuideRequest,planGuideStep,findGuideElement} from '../assets/yuki/runtime/guide-journey.mjs';
import {Companion} from '../assets/yuki/runtime/companion.mjs';
import {flightPose} from '../assets/yuki/runtime/flight.mjs';
import {wingIndex,wingSlotMs} from '../assets/yuki/runtime/flight-playback.mjs';
import {takeoffMs,landingMs,contactPhases} from '../assets/yuki/runtime/timing.mjs';
import {destinations,validReply} from '../assets/yuki/protocol.mjs';
import {modelRequest} from '../services/yuki-api/worker.mjs';
import {PageObstacles} from '../assets/yuki/runtime/clear-space.mjs';
const {clips}=JSON.parse(readFileSync(new URL('../assets/yuki/manifest.json',import.meta.url)));
const pages=['en','ja'].flatMap(lang=>[['/','Home'],['/yuki/','Yuki’s Garden'],['/resume.html','Resume']].map(([path,title])=>({lang,title,url:(lang==='ja'?'/ja':'')+path,sections:[]})));
test('home and garden guidance resolves in both languages, keeping homepage distinct',()=>{
 for(const lang of ['en','ja']){
  for(const message of ['Take me to your home','Show me your garden','Where is Petal Nook?','Go home','Guide me to your nest','おうちへ連れていって','ゆきの庭を見せて','庭はどこ？']){
   const result=resolveGuideRequest(message,pages,'/',{lang});assert.equal(result.target?.url,(lang==='ja'?'/ja':'')+'/yuki/',message);
   assert.equal(planGuideStep(result.target,'/',pages,{lang}).kind,'nav');
  }
  for(const text of ['Go to the home page','Show me the landing page','Take me to the portfolio home'])assert.equal(resolveGuideRequest(text,pages,'/yuki/',{lang}).target?.url,(lang==='ja'?'/ja':'')+'/',text);
 }
 for(const message of ['Tell me about your garden','What is your home like?','おうちのお話を聞かせて','Do not take me home'])assert.equal(resolveGuideRequest(message,pages,'/'),null);
});
test('garden arrival points to a visible place rather than the visually hidden page heading',()=>{
 const lookout={},heading={};assert.equal(findGuideElement({getElementById:id=>id==='garden-lookout'?lookout:null,querySelector:()=>heading},{kind:'arrive',url:'/ja/yuki/'}),lookout);
});
test('the guiding reveal helper is imported so route requests cannot kill the animation loop',()=>{
 const ui=readFileSync(new URL('../assets/yuki/yuki.mjs',import.meta.url),'utf8');
 assert.match(ui,/import \{[^}]*\bprepareCall\b[^}]*\} from '\.\/runtime\/page-motion/);
 assert.match(ui,/garden:'\/yuki\/'/);assert(destinations.includes('garden'));
 assert.equal(validReply({text:'Follow my little wings!',destination:'garden'}).destination,'garden');
});
test('AI home directions distinguish visiting from talking and never claim navigation happened',()=>{
 const request=modelRequest({lang:'en',history:[],message:'Show me your home'}, {pages:[],view:{}});
 assert.match(request.messages[0].content,/HOME GUIDANCE:/);assert.match(request.messages[0].content,/destination garden/);assert.match(request.messages[0].content,/destination none/);
});
test('decorative garden background is not an obstacle, but real content pictures still are',()=>{
 const art={closest:()=>null,matches:()=>true},content={closest:()=>null,matches:()=>false};
 const context={root:{contains:()=>false},doc:{body:{},createTreeWalker:()=>({nextNode:()=>false}),querySelectorAll:()=>[art,content]}};
 const previous=globalThis.NodeFilter;globalThis.NodeFilter={SHOW_TEXT:4};
 try{PageObstacles.prototype.rebuild.call(context);assert.deepEqual(context.elements,[content]);}finally{if(previous===undefined)delete globalThis.NodeFilter;else globalThis.NodeFilter=previous;}
});
test('flight drawing clock stays synchronized with the motion graph over every wingbeat',()=>{
 for(const dt of [10,16,33,64]){
  const c=new Companion({rest:clips.rest.frames.map(f=>f.durationMs),flight:clips.flight.frames.map(f=>f.durationMs),takeoff:takeoffMs,landing:landingMs},[{id:'a',x:300,y:300},{id:'b',x:390,y:780}],{motion:contactPhases});
  c.rover.request('b');let flying=0,previous;
  for(let time=0;time<14000;time+=dt){c.update(dt);const r=c.rover;if(r.graph.state==='flight'){
   flying++;if(wingIndex(r.flightCycleTime)!==r.graph.frame)assert(Math.abs(r.flightCycleTime/wingSlotMs-Math.round(r.flightCycleTime/wingSlotMs))<1e-7,'only floating-point equality at the exact frame boundary is tolerable');assert.equal(flightPose(r,clips).key,'flightHover','mostly downward travel must not flick sideways');
   if(previous==='takeoff')assert.equal(wingIndex(r.flightCycleTime),6);
  }previous=r.graph.state;}
  assert(flying>20);assert.equal(c.rover.at,'b');
 }
});
