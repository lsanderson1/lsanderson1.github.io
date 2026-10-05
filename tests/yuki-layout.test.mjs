import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {pageLayout,bubblePlacement,bubbleHeightLimit,pointerTarget} from '../assets/yuki/runtime/page-layout.mjs';
import {pageProjection} from '../assets/yuki/runtime/page-motion.mjs';
import {localizedPages,localizePath,findPageTarget,pendingGuide,targetRect,curateDestinations} from '../assets/yuki/runtime/page-targets.mjs';
import {safeSpot,visibleSpot,guideSpot,clampFoot,fits,atFoot,overlaps} from '../assets/yuki/runtime/clear-space.mjs';
import {CallPerches} from '../assets/yuki/runtime/call-perches.mjs';

for(const [w,h] of [[320,568],[390,844],[768,1024],[1024,768],[1440,900],[1920,1080],[390,330]]){
 test(`original reading area and compact bubble fit ${w}×${h}`,()=>{
  const l=pageLayout(w,h),foot=l.home;
  assert.equal(l.readingWidth,w);assert.equal(l.readingHeight,h);
  assert(foot.x+44<=w&&foot.y<=h);
  const p=bubblePlacement(foot,l,Math.min(316,w-20),Math.min(300,h-20));
  assert(p.left>=10&&p.left+Math.min(316,w-20)<=w-10);
  assert(p.top>=10&&p.top+Math.min(300,h-20)<=h-10);
 });
 test(`scroll projects the same page perch without clamping or following at ${w}`,()=>{
  const l=pageLayout(w,h);
  for(const scroll of [0,40,900,3000]){const f=pageProjection({y:l.home.y-200,foot:l.home,scale:1},scroll);assert.equal(f.foot.y+scroll,l.home.y);assert.equal(f.scale,1);}
 });
}
test('bubble remains inside visual viewport with an open phone keyboard',()=>{
 const l={...pageLayout(390,844),height:300};const p=bubblePlacement({x:326,y:826},l,316,280,150);assert(p.top>=160&&p.top+280<=440);
});
test('a high perch puts the bubble below her instead of covering her head',()=>{
 const p=bubblePlacement({x:310,y:280},pageLayout(390,844),316,225);assert(p.below);assert(p.top>280);
});
test('expanded context bubble scrolls above or below a mid-screen perch without covering her',()=>{
 const layout={...pageLayout(1265,713),height:649},foot={x:145,y:435},offset=64;
 const limit=bubbleHeightLimit(foot,layout,offset),p=bubblePlacement(foot,layout,316,Math.min(400,limit),offset);
 assert(p.top>=offset+10&&p.top+limit<=offset+layout.height-10);
 assert(p.top>=foot.y+12||p.top+limit<=foot.y-layout.bodyHeight-12);
 assert(limit<317);
 const fractionalFoot={x:145,y:433.37},fractionalLimit=bubbleHeightLimit(fractionalFoot,layout,offset);
 const rounded=bubblePlacement(fractionalFoot,layout,316,Math.ceil(fractionalLimit),offset);
 assert(rounded.below);assert(rounded.top>fractionalFoot.y);
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

test('crowded mobile fallback stays full-sized and on screen, never null',()=>{
 const viewport={width:320,height:568},extent={left:-92,right:92,top:-148,bottom:8};
 const p=visibleSpot(extent,[{left:0,top:0,right:320,bottom:568}],viewport,{x:280,y:540});
 assert(p);assert(fits(atFoot(p,extent),[],viewport));assert.equal(atFoot(p,extent).right-atFoot(p,extent).left,184);
});
test('visible fallback still chooses genuinely empty space first',()=>{
 const viewport={width:390,height:844},extent={left:-80,right:80,top:-145,bottom:8};
 const obstacles=[{left:0,top:0,right:390,bottom:450}];
 assert(fits(atFoot(visibleSpot(extent,obstacles,viewport,{x:300,y:220}),extent),obstacles,viewport));
});
test('orientation and crowding never reduce the chosen body height',()=>{
 assert.equal(pageLayout(390,844).bodyHeight,pageLayout(390,330).bodyHeight);
 assert(pageLayout(390,844).bodyHeight>=138);
 const extent={left:-100,right:100,top:-160,bottom:8};
 assert.deepEqual(clampFoot({x:-100,y:9999},extent,{width:390,height:844}),{x:108,y:828});
});
test('title highlight measures actual text with finite width and height',()=>{
 const el={getBoundingClientRect:()=>({left:20,right:700,top:200,bottom:240}),ownerDocument:{createRange:()=>({selectNodeContents:()=>{},getClientRects:()=>[{left:20,right:230,top:202,bottom:236,width:210,height:34}]})}};
 assert.deepEqual(targetRect(el),{left:20,right:230,top:202,bottom:236,width:210,height:34});
});
test('guide presents beside the title instead of below the description',()=>{
 const title={left:64,right:316,top:346,bottom:374},extent={left:-98,right:98,top:-163,bottom:8},obstacles=[{left:64,right:584,top:64,bottom:448}];
 const p=guideSpot(title,extent,obstacles,{width:1265,height:720},155);
 assert(p.x-98>584);assert(Math.abs(p.y-155*.52-360)<1);
});
test('guide menu is curated, bounded, deduplicated and still searches public projects',()=>{
 const items=[{title:'Projects',local:true},...Array.from({length:15},(_,i)=>({title:'Project '+i,url:'/projects/'+i,featured:i<3})),{title:'Projects',url:'/projects/'},{title:'Essay example',url:'/essays/example'},{title:'日本語の作品',url:'/ja/projects/example'}];
 const home=curateDestinations(items,'','/');assert.equal(home.length,4);assert(home.every(x=>x.local||x.featured));
 const project=curateDestinations(items,'','/projects/');assert(project.length<=8);assert(!project.some(x=>x.title==='Essay example'));
 assert.equal(curateDestinations(items,'Project 14','/')[0].title,'Project 14');assert.equal(curateDestinations(items,'日本語','/ja/')[0].title,'日本語の作品');
 assert.equal(curateDestinations(items,'nonexistent','/').length,0);
});

test('calls vary horizontally and vertically, avoiding recent positions without changing size',()=>{
 const extent={left:-98,right:98,top:-163,bottom:8},viewport={width:1265,height:720};
 const picker=new CallPerches(()=>.46),positions=[];let current={x:1100,y:650};
 for(let i=0;i<12;i++){const p=picker.choose(extent,[],viewport,current);assert(fits(atFoot(p,extent),[],viewport));assert(Math.hypot(p.x-current.x,p.y-current.y)>=128);positions.push(p);current=p;}
 assert(new Set(positions.map(p=>p.x)).size>2);assert(new Set(positions.map(p=>p.y)).size>2);
 assert.equal(picker.recent.length,3);
});
test('random calls cover different suitable areas instead of choosing a fixed corner',()=>{
 const extent={left:-90,right:90,top:-150,bottom:8},v={width:1265,height:720};
 const results=[.01,.2,.4,.6,.8,.99].map(n=>new CallPerches(()=>n).choose(extent,[],v));
 assert(results.some(p=>p.x<v.width/3));assert(results.some(p=>p.x>v.width*2/3));
 assert(new Set(results.map(p=>p.y)).size>2);
});
test('a clear central gap is a valid perch when pictures occupy both sides',()=>{
 const v={width:1000,height:800},e={left:-95,right:95,top:-160,bottom:8};
 const pictures=[{left:0,top:0,right:330,bottom:800},{left:670,top:0,right:1000,bottom:800}];
 const picker=new CallPerches(()=>.5);
 for(let i=0;i<5;i++){const p=picker.choose(e,pictures,v,{x:880,y:730});assert(p.x>430&&p.x<570);assert(fits(atFoot(p,e),pictures,v));}
});
test('call variation never sacrifices the only clear pocket or covers the call button',()=>{
 const v={width:390,height:844},e={left:-80,right:80,top:-145,bottom:8};
 const obstacles=[{left:0,top:0,right:390,bottom:540},{left:0,top:540,right:190,bottom:844},{left:270,top:790,right:385,bottom:840}];
 const picker=new CallPerches(()=>.5);let current={x:290,y:730};
 for(let i=0;i<8;i++){current=picker.choose(e,obstacles,v,current);assert(fits(atFoot(current,e),obstacles,v));}
});
test('packed-screen call fallback stays full size and random among comparable edge spots',()=>{
 const v={width:320,height:568},e={left:-92,right:92,top:-148,bottom:8},obstacles=[{left:0,top:0,right:320,bottom:568}];
 const picker=new CallPerches(()=>.3),a=picker.choose(e,obstacles,v,{x:220,y:540}),b=picker.choose(e,obstacles,v,a);
 assert(fits(atFoot(a,e),[],v));assert(fits(atFoot(b,e),[],v));assert.notDeepEqual(a,b);
 assert.equal(atFoot(b,e).right-atFoot(b,e).left,184);
 // Previous phone choices are normalized rather than reused as stale pixels.
 const resized=picker.choose(e,[],{width:1440,height:900},b);assert(fits(atFoot(resized,e),[],{width:1440,height:900}));
});
test('chat can stay below the header while Yuki passes behind it',()=>{
 const l={...pageLayout(1265,720),height:656};
 const p=bubblePlacement({x:1100,y:120},l,316,225,64);
 assert(p.top>=74);assert(p.top+225<=710);
});
test('header and decorative petals stack above Yuki without raising the branch layer',()=>{
 const theme=fs.readFileSync(new URL('../css/techfolio-theme/sakura-tech.css',import.meta.url),'utf8');
 const widget=fs.readFileSync(new URL('../assets/yuki/yuki.css',import.meta.url),'utf8');
 const layer=(css,selector)=>Number(css.split(selector+'{')[1]?.split('}')[0].match(/z-index:\s*(\d+)/)?.[1]??css.split(selector+' {')[1]?.split('}')[0].match(/z-index:\s*(\d+)/)?.[1]);
 assert(layer(theme,'.fp-sakura-scene')<layer(widget,'#yuki-companion'));
 assert(layer(widget,'#yuki-companion')<layer(theme,'.fp-sakura-foreground'));
 assert(layer(theme,'.fp-sakura-foreground')<layer(theme,'.fp-nav'));
});
