import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

// Exercise the actual page controller, including DOM visibility ordering.
const source=readFileSync(new URL('../assets/yuki/yuki.mjs',import.meta.url),'utf8');
const code=source.slice(source.indexOf(' function showExitSeal(){'),source.indexOf('\n const sections=',source.indexOf(' function showExitSeal(){')));
function fixture({kind='returning',reduced=false}={}){
 const nodes={'.yuki-pet':{hidden:false},'.yuki-hit':{hidden:false}},target={x:200,y:100},events=[];
 const r={foot:{x:200,y:200},point:()=>target,wanted:'exit',at:'start',graph:{state:'flight'},hidden:false};
 const s={portalAfterglow:null,portalTrip:{kind,phase:'flying',age:0,origin:{page:'/essays/'}},paused:false,hidden:false,companion:{rover:r,lifecycle:{locked:false}},resident:true,calling:true,media:{matches:reduced},$:key=>nodes[key],portalPoint:section=>{s.portal.dataset.source=section??(kind==='returning'?'/yuki/':'/essays/');return target;},presence:{home:()=>events.push('home'),transit:()=>events.push('transit')}};
 let visible=false;s.portal={dataset:{},get hidden(){return !visible;},set hidden(value){visible=!value;if(visible)events.push({show:true,petHidden:nodes['.yuki-pet'].hidden,hitHidden:nodes['.yuki-hit'].hidden,roverHidden:r.hidden,resident:s.resident});}};
 runInNewContext(code,s);return {s,r,nodes,events};
}
test('return seal stays hidden throughout approach, then appears after Yuki disappears',()=>{
 const {s,r,events}=fixture();for(const distance of [500,220,100,21]){r.foot.y=100+distance;s.updatePortal(16);assert(s.portal.hidden);assert(s.resident);}
 r.foot.y=110;s.updatePortal(16);assert(!s.portal.hidden);assert.equal(s.portalTrip,null);assert.equal(s.calling,false);assert.equal(s.portalAfterglow.section,'/yuki/');
 assert.deepEqual(events,['home',{show:true,petHidden:true,hitHidden:true,roverHidden:true,resident:false}]);
});
test('the completed return keeps the seal at its exit for 2.4 seconds, then hides it',()=>{
 const {s,r}=fixture();r.foot.y=100;s.updatePortal(16);s.updatePortal(1200);assert(!s.portal.hidden);assert.equal(s.portal.dataset.source,'/yuki/');s.updatePortal(1199);assert(!s.portal.hidden);s.updatePortal(1);assert(s.portal.hidden);assert.equal(s.portalAfterglow,null);
});
test('a cross-page departure also waits until the character has disappeared',()=>{
 const {s,events}=fixture({kind:'departing'});s.portalTrip.transfer={startedAt:Date.now(),timing:{total:100000}};s.updatePortal(16);assert(s.portal.hidden);assert(s.resident);
 s.portalTrip.transfer.startedAt=Date.now()-100001;s.updatePortal(16);assert(!s.portal.hidden);assert.equal(s.portalAfterglow.section,'/essays/');assert.equal(events[0],'transit');assert.equal(events[1].petHidden,true);assert.equal(events[1].resident,false);
});
test('reduced motion suppresses the seal without blocking completed travel',()=>{
 const {s,r}=fixture({reduced:true});r.foot.y=100;s.updatePortal(16);assert(!s.resident);assert(s.portal.hidden);s.updatePortal(2400);assert.equal(s.portalAfterglow,null);
});
test('pausing an afterglow hides it without advancing its timer',()=>{
 const {s,r}=fixture();r.foot.y=100;s.updatePortal(16);s.paused=true;s.updatePortal(1000);assert(s.portal.hidden);assert.equal(s.portalAfterglow.age,0);s.paused=false;s.updatePortal(16);assert(!s.portal.hidden);
});
