import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gardenCamera,GardenCamera,attachGardenExplorer} from '../assets/yuki/home/camera.mjs';
import {gardenSpots,GardenHome} from '../assets/yuki/home/garden.mjs';
import {HomeDialogue,homeLines} from '../assets/yuki/home/home-dialogue.mjs';
import {homeGreetings,homeGreetingBase} from '../assets/yuki/home/greetings.mjs';
import {VisitorPersonality,conversationOpening,localizeGreetingMessages} from '../assets/yuki/runtime/visitor-personality.mjs';
import {cleanMessages,translatedText} from '../assets/yuki/runtime/conversation-language.mjs';

test('camera covers landscape and portrait without stretch or blank edges at every perch',()=>{
 for(const [w,h] of [[390,745],[320,600],[768,900],[1440,736],[844,280]])for(const p of Object.values(gardenSpots)){
  const c=gardenCamera(w,h,p);assert.equal(c.width/c.height,1.5);
  assert(c.width>=w&&c.height>=h);assert(c.left<=0&&c.top<=0);assert(c.left+c.width>=w&&c.top+c.height>=h);
  const foot={x:c.left+p.x*c.width,y:c.top+p.y*c.height};assert(foot.x>=0&&foot.x<=w&&foot.y>=0&&foot.y<=h);
 }
});
test('camera eases to the current foot and snaps only on resize/reduced motion',()=>{
 let viewport={left:0,top:99,width:390,height:745};
 const scene={style:{},ownerDocument:{defaultView:{scrollY:0}},parentElement:{getBoundingClientRect:()=>viewport},getBoundingClientRect:()=>({left:parseFloat(scene.style.left||0),top:99+parseFloat(scene.style.top||0),width:parseFloat(scene.style.width||390),height:parseFloat(scene.style.height||260)})};
 const camera=new GardenCamera(scene),a=camera.update(null,{now:0});
 const p=gardenSpots.books;let previous=a.left;
 for(let t=16;t<=800;t+=16){const r=scene.getBoundingClientRect(),c=camera.update({x:r.left+p.x*r.width,y:r.top+p.y*r.height},{now:t});assert(c.left<=previous&&c.left>=gardenCamera(390,745,p).left);previous=c.left;}
 assert(Math.abs(camera.box.left-gardenCamera(390,745,p).left)<3);
 const r=scene.getBoundingClientRect(),snap=camera.update({x:r.left+.2*r.width,y:r.top+.775*r.height},{now:900,reduced:true});assert.deepEqual(snap,gardenCamera(390,745));
 viewport={...viewport,width:900,height:600};const r2=scene.getBoundingClientRect();camera.update({x:r2.left+.2*r2.width,y:r2.top+.775*r2.height},{now:920});assert.equal(camera.box.width,gardenCamera(900,600).width);assert.equal(camera.box.left,0);
});
test('manual exploration stays put until Follow Yuki and clamps both axes',()=>{
 let v={width:1200,height:650};
 const scene={style:{},dataset:{},ownerDocument:{defaultView:{scrollY:0}},parentElement:{getBoundingClientRect:()=>v},getBoundingClientRect:()=>({left:parseFloat(scene.style.left||0),top:parseFloat(scene.style.top||0),width:parseFloat(scene.style.width||1200),height:parseFloat(scene.style.height||800)})};
 const c=new GardenCamera(scene);c.update(null,{now:0});c.pan(0,-1000);c.update(null,{reduced:true});assert.equal(c.box.top,0);
 for(let t=16;t<1000;t+=16){const b=scene.getBoundingClientRect();c.update({x:b.left+.2*b.width,y:b.top+.775*b.height},{now:t});assert.equal(c.box.top,0);}
 c.pan(0,1000);c.update(null,{reduced:true});assert.equal(c.box.top,650-800);assert.equal(scene.dataset.camera,'explore');
 c.follow();c.update(null,{reduced:true});assert.equal(scene.dataset.camera,'follow');
 v={width:390,height:745};c.update(null,{reduced:true});c.pan(1000,1000);c.update(null,{reduced:true});assert.equal(c.box.left,v.width-c.box.width);assert.equal(c.box.top,v.height-c.box.height);assert(c.box.top<0);
});
test('wheel explores the picture, not menus or browser zoom; keyboard and touch work',()=>{
 const listeners={},moves=[];let followed=0;
 const world={clientHeight:700,addEventListener:(k,f)=>listeners[k]=f,removeEventListener:k=>delete listeners[k]};
 const scene={parentElement:world,ownerDocument:{querySelectorAll:()=>[]}};
 const detach=attachGardenExplorer(scene,{pan:(...v)=>moves.push(v),follow:()=>followed++});
 let prevented=0;const event={target:{closest:()=>null},deltaX:0,deltaY:80,deltaMode:0,preventDefault:()=>prevented++};
 listeners.wheel(event);assert.deepEqual(moves.pop(),[0,80]);assert.equal(prevented,1);
 listeners.wheel({...event,deltaMode:1,deltaY:3});assert.deepEqual(moves.pop(),[0,48]);
 listeners.wheel({...event,ctrlKey:true});listeners.wheel({...event,target:{closest:()=>({})}});assert.equal(moves.length,0);
 listeners.keydown({...event,key:'ArrowUp'});assert.deepEqual(moves.pop(),[0,-90]);listeners.keydown({...event,key:'Home'});assert.equal(followed,1);
 listeners.pointerdown({...event,pointerType:'touch',pointerId:1,clientX:100,clientY:200});listeners.pointermove({...event,pointerId:1,clientX:60,clientY:150});assert.deepEqual(moves.pop(),[40,50]);listeners.pointerup();detach();assert.equal(Object.keys(listeners).length,0);
});
test('home openings avoid repeats across languages and translate without an AI request',()=>{
 const data=new Map(),storage={getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)},p=new VisitorPersonality(storage,()=>0);
 const seen=new Set();let last;
 assert.equal(homeGreetings.length,30);
 for(let n=0;n<30;n++){
  const lang=n%2?'ja':'en',cue=conversationOpening([],p,lang,{home:true});assert(!seen.has(cue.greetingId));seen.add(cue.greetingId);last=cue.greetingId;
  const records=cleanMessages([{role:'assistant',text:cue.text,greetingId:cue.greetingId,language:lang}]);
  const translated=localizeGreetingMessages(records,lang==='en'?'ja':'en');assert.equal(translated[0].text,homeGreetings[cue.greetingId-homeGreetingBase][lang==='en'?1:0]);
  assert.equal(conversationOpening(records,p,lang,{home:true}),null);
 }
 assert.notEqual(conversationOpening([],p,'en',{home:true}).greetingId,last);
 assert(conversationOpening([],p,'en').greetingId<homeGreetingBase);
});
test('all 100 home thoughts cycle without repeating until their corner is exhausted',()=>{
 assert.equal(Object.values(homeLines).flat().length,100);
 for(const [spot,lines] of Object.entries(homeLines))for(const ja of [false,true]){
  const d=new HomeDialogue(()=>0),seen=new Set();let previous;
  for(let n=0;n<lines.length;n++){const line=d.next(spot,ja);assert(!seen.has(line));seen.add(line);previous=line;}
  assert.notEqual(d.next(spot,ja),previous);
 }
});
test('garden keeps shared header and no article panels or outside footer',()=>{
 const layout=readFileSync(new URL('../_layouts/yuki-garden.html',import.meta.url),'utf8');assert.match(layout,/include header.html/);assert.doesNotMatch(layout,/footer/);
 const css=readFileSync(new URL('../assets/yuki/home/garden.css',import.meta.url),'utf8');assert.doesNotMatch(css,/\.fp-nav\{[^}]*background/);assert.match(css,/height:100dvh/);assert.match(css,/\.yg-thought/);
 const template=readFileSync(new URL('../_includes/yuki-home.html',import.meta.url),'utf8');
 for(const title of ['Dragon Roost','Lily Pond','Sky Lookout','Reading Nook','Little Treasures','Talk With Yuki','A Little Flight','Float & Daydream','Chase Petals','Pause Garden','Another Little Thought'])assert(template.includes(title));
});

test('garden gives the unchanged shared glass header scenery underneath, not an opaque override',()=>{
 const css=readFileSync(new URL('../assets/yuki/home/garden.css',import.meta.url),'utf8');
 const shared=readFileSync(new URL('../css/techfolio-theme/sakura-tech.css',import.meta.url),'utf8');
 assert.match(shared,/\.fp-nav\s*\{[^}]*background: color-mix\(in srgb, var\(--background\) 88%, transparent\);[^}]*backdrop-filter: blur\(14px\)/);
 assert.doesNotMatch(css,/background-image:url\('\.\/petal-nook.png'\)/);
 assert.match(css,/\.yg-page\{overflow:visible\}/);
 assert.match(css,/\.yg-world\{top:calc\(-1 \* var\(--yg-header-height,64px\)\)/);
 assert.doesNotMatch(css,/\.fp-nav\{[^}]*(?:background|backdrop-filter)/);
 const html=readFileSync(new URL('../_includes/yuki-home.html',import.meta.url),'utf8');
 assert.match(html,/data-garden-pan="left"/);assert.match(html,/data-garden-pan="right"/);
 assert.doesNotMatch(html,/Follow Yuki|data-garden-follow|yg-camera-controls/);
});

test('garden thoughts follow physical presence and start hidden before location restores',()=>{
 const thought={hidden:true},home={doc:{querySelector:()=>thought}};
 GardenHome.prototype.setPresence.call(home,false);assert.equal(thought.hidden,true);
 GardenHome.prototype.setPresence.call(home,true);assert.equal(thought.hidden,false);
 GardenHome.prototype.setPresence.call(home,false);assert.equal(thought.hidden,true);
 const html=readFileSync(new URL('../_includes/yuki-home.html',import.meta.url),'utf8');assert.match(html,/class="yg-thought" hidden/);
 const ui=readFileSync(new URL('../assets/yuki/yuki.mjs',import.meta.url),'utf8');
 assert.match(ui,/garden\.setPresence\(resident&&!hidden&&!portalTrip\)/);
 assert.match(ui,/if\(garden\)\{\s*garden\.setPresence/);
 assert.doesNotMatch(ui,/if\(garden&&!journey.active&&!portalTrip\)\{/);
 assert.match(ui,/portalTrip\?\.target\?\[portalTrip.target\]/);
});

test('the scene covers the real header, including a wrapped mobile header',()=>{
 let header=64;const properties={};
 const world={style:{setProperty:(k,v)=>properties[k]=v},getBoundingClientRect:()=>({width:390,height:745})};
 const scene={style:{},parentElement:world,ownerDocument:{querySelector:()=>({getBoundingClientRect:()=>({height:header})})},getBoundingClientRect:()=>({left:0,top:0,width:390,height:745})};
 const camera=new GardenCamera(scene);camera.update(null,{now:0});assert.equal(properties['--yg-header-height'],'64px');
 header=99;camera.update(null,{now:16});assert.equal(properties['--yg-header-height'],'99px');
 for(const [w,h] of [[390,844],[768,1024],[1280,720]])assert(gardenCamera(w,h).height>h,'vertical pan range remains available');
});
test('all rotating Japanese thoughts use corner brackets, including after arrival',()=>{
 for(const ja of [false,true]){
  const line={textContent:''},context={ja,dialogue:new HomeDialogue(()=>0),doc:{querySelector:()=>line},chatClock:99};
  for(const selected of Object.keys(homeLines))for(let n=0;n<10;n++){
   context.selected=selected;GardenHome.prototype.remark.call(context);
   assert.match(line.textContent,ja?/^「[^“”]+」$/:/^“[^「」]+”$/);assert.equal(context.chatClock,0);
  }
 }
});
