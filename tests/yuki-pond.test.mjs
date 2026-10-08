import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pondShore,pondLilies,isPondWater,pondImagePoint,pondMask,PondMotion,GardenPond,pondRippleLifetime,pondRippleCapacity} from '../assets/yuki/home/pond.mjs';
import {gardenCamera} from '../assets/yuki/home/camera.mjs';
test('water hit area follows the shoreline and excludes flowers, leaves, stones and nest',()=>{
 for(const p of [{x:160,y:578},{x:319,y:607},{x:403,y:608},{x:205,y:598},{x:324,y:633},{x:134,y:603},{x:128,y:553}])assert(isPondWater(p),JSON.stringify(p));
 for(const p of [...pondLilies,{x:320,y:760},{x:492,y:578},{x:320,y:505},{x:280,y:684},{x:15,y:570}])assert(!isPondWater(p),JSON.stringify(p));
 assert.equal(pondMask().length,pondLilies.length+1);
 assert(pondShore.every(([x,y])=>x>=0&&x<=1536&&y>=0&&y<=1024));
});
test('tap coordinates stay on the painted pond across desktop, portrait and camera pans',()=>{
 for(const [width,height] of [[1440,800],[1042,744],[390,745],[320,600],[844,280]])for(const focus of [{x:.2,y:.775},{x:.35,y:.655},{x:.745,y:.635}]){
  const c=gardenCamera(width,height,focus),r={...c,top:c.top+64};
  const screen={x:r.left+319*r.width/1536,y:r.top+607*r.height/1024};
  const point=pondImagePoint(screen,r);assert(Math.abs(point.x-319)<1e-8);assert(Math.abs(point.y-607)<1e-8);
 }
 assert.equal(pondImagePoint({x:0,y:0},{left:0,top:0,width:0,height:0}),null);
});
test('ripple simulation is bounded, rejects land and never catches up after a hidden tab',()=>{
 const m=new PondMotion(()=>0);assert.equal(m.splash({x:800,y:800}),false);
 for(let i=0;i<1000;i++)m.splash({x:319,y:607});assert.equal(m.rings.length,pondRippleCapacity);
 m.update(120000);assert.equal(m.elapsed,64);
 const saved=structuredClone(m.rings);m.update(5000,false);assert.deepEqual(m.rings,saved);
 for(let i=0;i<1000;i++)m.update(16);assert(m.rings.length<=pondRippleCapacity);assert(m.rings.every(isPondWater));assert(m.rings.every(r=>r.age<pondRippleLifetime));
});
test('rapid splashes never truncate an existing ring; slots reopen only after its natural fade',()=>{
 const m=new PondMotion(()=>0);m.splash({x:319,y:607});const original=structuredClone(m.rings);
 for(let i=0;i<1000;i++)m.splash({x:403,y:608});assert.deepEqual(m.rings.slice(0,3),original);
 const all=structuredClone(m.rings);assert.equal(m.splash({x:160,y:578}),false);assert.deepEqual(m.rings,all);
 m.next=Infinity; // Isolate emission during this lifecycle check.
 for(let i=0;i<206;i++)m.update(16);
 assert(m.rings.some(r=>r.id===original[0].id));assert(m.rings.every(r=>r.age<pondRippleLifetime));
 m.update(16);assert(!m.rings.some(r=>r.id===original[0].id));assert(m.rings.some(r=>r.id===original[1].id));
 assert(m.splash({x:160,y:578}));
 for(let i=0;i<30;i++)m.update(16);assert(original.every(o=>!m.rings.some(r=>r.id===o.id)));
});
function fixture(){
 class Node{
  constructor(name){this.name=name;this.attrs={};this.children=[];this.handlers={};this.dataset={};}
  setAttribute(k,v){this.attrs[k]=String(v);}
  append(n){n.parent=this;this.children.push(n);}
  remove(){this.parent.children=this.parent.children.filter(n=>n!==this);}
  addEventListener(k,fn){this.handlers[k]=fn;}
  removeEventListener(k){delete this.handlers[k];}
 }
 const scene=new Node('div'),messages=[],media={matches:false,addEventListener(k,fn){this.fn=fn;},removeEventListener(){this.fn=null;}},view={innerWidth:1536,innerHeight:1100,matchMedia:()=>media,requestAnimationFrame:()=>1,cancelAnimationFrame(){this.cancelled=true;}};
 let rect={left:0,top:64,width:1536,height:1024};
 scene.ownerDocument={defaultView:view,hidden:false,body:{dataset:{}},createElementNS:(_,n)=>new Node(n)};scene.getBoundingClientRect=()=>rect;
 const pond=new GardenPond(scene,{feedback:text=>messages.push(text)});
 return {pond,scene,media,view,messages,setRect:r=>{rect=r;}};
}
test('pointer and keyboard make rings at valid water positions, not on lily pads',()=>{
 const {pond,messages}=fixture();pond.onPointer({type:'pointerdown',button:0,clientX:319,clientY:671});assert.equal(pond.motion.rings.length,3);assert.equal(messages.length,1);
 pond.onPointer({type:'pointerdown',button:0,clientX:270,clientY:629});assert.equal(pond.motion.rings.length,3);
 pond.onKey({key:'Enter',repeat:false,preventDefault(){}});assert.equal(pond.motion.rings.length,6);
 pond.motion.update(64);pond.render();assert.equal(pond.ripples.children.length,6);assert(pond.ripples.children.every(n=>n.attrs.cx==='319'));
 assert.equal(pond.touch.attrs.role,'button');assert.equal(pond.touch.attrs.tabindex,'0');
});
test('drag and brushing are throttled and never grow an unbounded node collection',()=>{
 const {pond}=fixture();for(let i=0;i<100;i++)pond.onPointer({type:'pointermove',clientX:319+i%10,clientY:671,buttons:1});
 assert.equal(pond.motion.rings.length,2);pond.render();assert.equal(pond.nodes.size,2);
 for(let i=0;i<100;i++)pond.motion.splash({x:319,y:607});pond.render();assert(pond.nodes.size<=pondRippleCapacity);assert(pond.nodes.size>=pondRippleCapacity-2);assert.equal(pond.ripples.children.length,pond.nodes.size);
 pond.motion.clear();pond.render();assert.equal(pond.nodes.size,0);assert.equal(pond.ripples.children.length,0);
});
test('pause, hidden tabs, mobile offscreen pond and reduced motion suspend simulation',()=>{
 const {pond,scene,media,setRect}=fixture();assert(pond.active());
 scene.dataset.paused='true';assert(!pond.active());pond.frame(1000);assert.equal(pond.motion.elapsed,0);scene.dataset.paused='false';
 scene.ownerDocument.hidden=true;assert(!pond.active());scene.ownerDocument.hidden=false;
 scene.ownerDocument.body.dataset.gardenPaused='true';assert(!pond.active());scene.ownerDocument.body.dataset.gardenPaused='false';
 setRect({left:-1200,top:64,width:1536,height:1024});assert(!pond.active());setRect({left:0,top:64,width:1536,height:1024});
 pond.play();assert(pond.motion.rings.length);media.matches=true;media.fn();assert(!pond.active());assert.equal(pond.motion.rings.length,0);
});
test('water mask is shared by drawing and hit target; controls and reduced motion remain accessible',()=>{
 const {pond,scene,view}=fixture();const clip=pond.svg.children[0].children[0].children[0];assert.equal(clip.attrs.d,pond.touch.attrs.d);assert.equal(clip.attrs['clip-rule'],'evenodd');
 let layer=pond.touch.parent;for(let i=pondLilies.length;i>=0;i--){assert.equal(layer.attrs['clip-path'],`url(#yg-pond-surface-${i})`);layer=layer.parent;}
 const css=readFileSync(new URL('../assets/yuki/home/garden.css',import.meta.url),'utf8');assert.match(css,/\.yg-pond-touch:focus-visible/);assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);assert.doesNotMatch(css,/left:3%;top:54%/);
 const html=readFileSync(new URL('../_includes/yuki-home.html',import.meta.url),'utf8');assert.match(html,/Make Pond Ripples/);assert.match(html,/池で波紋あそび/);assert.doesNotMatch(html,/class="yg-water"/);
 pond.destroy();assert.equal(scene.children.length,0);assert(view.cancelled);
});
test('sparse glistening stays inside every pond and lily clip, with varied gentle timing',()=>{
 const {pond}=fixture();
 const surface=pond.ripples.parent,glints=surface.children.find(n=>n.attrs.class==='yg-water-glisten');assert.equal(glints.children.length,6);
 let layer=surface.parent;for(let i=pondLilies.length;i>=0;i--){assert.equal(layer.attrs['clip-path'],`url(#yg-pond-surface-${i})`);layer=layer.parent;}
 const timings=[];
 for(const anchor of glints.children){
  const [,x,y]=anchor.attrs.transform.match(/translate\(([\d.]+) ([\d.]+)\)/);assert(isPondWater({x:+x,y:+y}));
  const sparkle=anchor.children[0];assert.equal(sparkle.attrs.class,'yg-water-sparkle');timings.push(sparkle.attrs.style);
 }
 assert.equal(new Set(timings).size,6);
 const css=readFileSync(new URL('../assets/yuki/home/garden.css',import.meta.url),'utf8');assert.match(css,/\.yg-water-glisten\{display:none\}/);assert.match(css,/@keyframes yg-water-glisten\{0%,12%,88%,100%\{opacity:0/);assert.match(css,/48%,55%\{opacity:1/);
});
