import test from 'node:test';
import assert from 'node:assert/strict';
import {pageLayout,visibleFoot,bubblePlacement,pointerTarget,needsFollow} from '../assets/yuki/runtime/page-layout.mjs';
import {localizedPages,localizePath,findPageTarget,pendingGuide} from '../assets/yuki/runtime/page-targets.mjs';
import {safeSpot,fits,atFoot,overlaps} from '../assets/yuki/runtime/clear-space.mjs';

for(const [w,h] of [[320,568],[390,844],[768,1024],[1024,768],[1440,900],[1920,1080],[390,330]]){
 test(`original reading area and compact bubble fit ${w}×${h}`,()=>{
  const l=pageLayout(w,h),foot=visibleFoot(l.home,0,l);
  assert.equal(l.readingWidth,w);assert.equal(l.readingHeight,h);
  assert(foot.x+44<=w&&foot.y<=h);
  const p=bubblePlacement(foot,l,Math.min(316,w-20),Math.min(300,h-20));
  assert(p.left>=10&&p.left+Math.min(316,w-20)<=w-10);
  assert(p.top>=10&&p.top+Math.min(300,h-20)<=h-10);
 });
 test(`scroll stays visible then requests a catch-up at ${w}`,()=>{
  const l=pageLayout(w,h);assert(!needsFollow(l.home,0,l));assert(needsFollow(l.home,h,l));
  for(const scroll of [-500,40,900,3000]){const f=visibleFoot(l.home,scroll,l);assert(f.y<=h&&f.y>=l.bodyHeight);assert(Number.isFinite(f.x));}
 });
}
test('bubble remains inside visual viewport with an open phone keyboard',()=>{
 const l={...pageLayout(390,844),height:300};const p=bubblePlacement({x:326,y:826},l,316,280,150);assert(p.top>=160&&p.top+280<=440);
});
test('a high perch puts the bubble below her instead of covering her head',()=>{
 const p=bubblePlacement({x:310,y:280},pageLayout(390,844),316,225);assert(p.below);assert(p.top>280);
});
test('pointer ends at exact live element edge and chooses inward hand',()=>{
 const rect={left:90,right:310,top:80,bottom:130};assert.deepEqual(pointerTarget(rect,{x:450,y:270}),{x:310,y:130,kind:'pointLeft'});
 assert.deepEqual(pointerTarget(rect,{x:20,y:100}),{x:90,y:100,kind:'pointRight'});
});
const pages=[{lang:'en',title:'Tool',url:'/projects/Tool.html'},{lang:'ja',title:'Tool',url:'/ja/projects/Tool.html'},{lang:'ja',title:'Bad',url:'//evil.example'}];
test('public page directory and AI-source guidance preserve selected language',()=>{
 assert.deepEqual(localizedPages(pages,'ja'),[{title:'Tool',url:'/ja/projects/Tool.html'}]);
 assert.equal(localizePath('/projects/Tool.html#usage',pages,'ja'),'/ja/projects/Tool.html#usage');
 assert.equal(localizePath('/ja/projects/Tool.html',pages,'en'),'/projects/Tool.html');
 assert.equal(localizePath('javascript:alert(1)',pages,'en'),null);
});
test('cross-page guide handoff is bounded, same-site and expires',()=>{
 const now=100000;assert.equal(pendingGuide(JSON.stringify({url:'/projects/Tool.html',at:now}),'/projects/Tool.html',now),'/projects/Tool.html');
 for(const p of [{url:'//evil.example',at:now},{url:'/projects/Tool.html',at:0},{url:'/projects/Tool.html',at:now+1}])assert.equal(pendingGuide(JSON.stringify(p),'/projects/Tool.html',now),null);
 assert.equal(pendingGuide(JSON.stringify({url:'/projects/Tool.html',at:now}),'/ja/projects/Tool.html',now),null);
});
test('exact target uses known ID or card heading, never an AI selector',()=>{
 const heading={},cardHeading={},nav={href:'https://site.test/projects/Tool.html',closest:()=>null};
 const card={querySelector:()=>cardHeading};const cardLink={href:nav.href,closest:s=>s==='article'?card:null};
 const doc={getElementById:id=>id==='usage'?heading:null,querySelector:()=>heading,querySelectorAll:()=>[nav,cardLink]};
 assert.equal(findPageTarget(doc,'/projects/Tool.html','/'),cardHeading);
 assert.equal(findPageTarget(doc,'/projects/Tool.html#usage','/projects/Tool.html'),heading);
});
test('safe placement avoids text, links, images and controls without moving the page',()=>{
 const v={width:390,height:844},extent={left:-56,right:56,top:-100,bottom:7};
 const forbidden=[{left:0,top:0,right:390,bottom:140},{left:20,top:180,right:370,bottom:640},{left:280,top:680,right:370,bottom:820}];
 const p=safeSpot(extent,forbidden,v);assert(p);assert(fits(atFoot(p,extent),forbidden,v));assert(p.x<230);
});
test('a text-filled screen must return no perch rather than cover content',()=>{
 const v={width:320,height:568};assert.equal(safeSpot({left:-50,right:50,top:-100,bottom:8},[{left:0,top:0,right:320,bottom:568}],v),null);
});
test('safety includes the whole drawing and a gap, not just her center or feet',()=>{
 const text={left:100,top:100,right:300,bottom:140};assert(overlaps({left:80,top:50,right:120,bottom:110},text));
 assert(!fits({left:80,top:50,right:98,bottom:110},[text],{width:400,height:800}));
});
test('small restore button stays inside the usable viewport beside a scrollbar',()=>{
 const v=pageLayout(375,844),extent={left:-18,right:18,top:-18,bottom:18};
 const p=safeSpot(extent,[],v,{x:390-30,y:844-30});
 assert(p);assert(atFoot(p,extent).right<=367);assert(fits(atFoot(p,extent),[],v));
});
