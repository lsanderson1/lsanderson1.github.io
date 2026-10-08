import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {GardenDiscoveries,gardenDiscoveries,GardenParticles,particlePose,GardenWorldLife,gardenWaterfalls} from '../assets/yuki/home/world-life.mjs';
import {GardenHome} from '../assets/yuki/home/garden.mjs';
import {gardenWaterSurfaces,waterGlisten} from '../assets/yuki/home/water-light.mjs';
test('eleven discoveries cover the whole garden with bounded, artwork-space targets',()=>{
 assert.equal(Object.keys(gardenDiscoveries).length,11);
 for(const p of Object.values(gardenDiscoveries)){
  const [x,y,w,h]=p.box;assert(x>=0&&y>=0&&w>0&&h>0&&x+w<=1536&&y+h<=1024);
  assert(p.at[0]>=x&&p.at[0]<=x+w&&p.at[1]>=y&&p.at[1]<=y+h);assert.equal(p.label.length,2);assert(p.label[0]&&p.label[1]);
 }
});
test('little discoveries vary their paired story lines and lantern genuinely toggles',()=>{
 for(const id of Object.keys(gardenDiscoveries)){
  const model=new GardenDiscoveries(),one=model.activate(id),two=model.activate(id);assert.notEqual(one.text,two.text,id);
  assert.equal(new GardenDiscoveries().activate(id,true).text===one.text,false);
 }
 const model=new GardenDiscoveries();assert(model.activate('lantern').lantern);assert(!model.activate('lantern').lantern);assert.equal(model.activate('missing'),null);
});
test('particle effects expire, stay bounded, pause, and avoid background-tab catch-up',()=>{
 const p=new GardenParticles(()=>.4);for(let i=0;i<200;i++)p.burst('petal',[100,100],24);assert.equal(p.items.length,90);
 p.update(120000);assert.equal(p.items[0].age,64);const before=structuredClone(p.items);p.update(300,false);assert.deepEqual(p.items,before);
 for(let i=0;i<500;i++)p.update(16);assert.equal(p.items.length,0);
});
test('every effect has finite, gently faded positions throughout its lifespan',()=>{
 const model=new GardenParticles(()=>.5);
 for(const kind of ['petal','leaf','page','star','comet','butterfly','mist','mote']){
  model.burst(kind,[900,400],1);const p=model.items.at(-1);
  assert.equal(particlePose(p).opacity,0);
  for(const age of [100,500,1500,3000,p.life]){const v=particlePose({...p,age});assert([v.x,v.y,v.opacity,v.rotation].every(Number.isFinite));assert(v.opacity>=0&&v.opacity<=1);}
  assert(particlePose({...p,age:p.life}).opacity<1e-9);
 }
});
function fixture(ja=false){
 class Node{
  constructor(name){this.name=name;this.attrs={};this.children=[];this.handlers={};this.dataset={};this.style={};}
  setAttribute(k,v){this.attrs[k]=String(v);}
  append(n){n.parent=this;this.children.push(n);}
  remove(){this.parent.children=this.parent.children.filter(n=>n!==this);}
  addEventListener(k,fn){this.handlers[k]=fn;}
 }
 const scene=new Node('div'),messages=[],calls={nest:0},media={matches:false,addEventListener(k,fn){this.fn=fn;},removeEventListener(){this.fn=null;}};
 const view={matchMedia:()=>media,requestAnimationFrame:()=>1,cancelAnimationFrame(){this.cancelled=true;},IntersectionObserver:class{constructor(fn,options){this.fn=fn;this.options=options;this.targets=[];}observe(n){this.targets.push(n);}disconnect(){this.disconnected=true;}}};
 scene.parentElement={};scene.ownerDocument={defaultView:view,hidden:false,body:{dataset:{}},createElementNS:(_,name)=>new Node(name),createElement:name=>new Node(name)};scene.getBoundingClientRect=()=>({left:0,top:64,width:1536,height:1024});
 const life=new GardenWorldLife(scene,{ja,feedback:text=>messages.push(text),onNest:()=>calls.nest++});return {life,scene,media,view,messages,calls};
}
test('actual controller updates lantern, stories, nest callback, and separate effects',()=>{
 const {life,messages,calls}=fixture();assert.equal(life.buttons.size,11);
 life.buttons.get('lantern').handlers.click();assert.equal(life.lamp.dataset.bright,'true');assert.equal(life.buttons.get('lantern').attrs['aria-pressed'],'true');
 life.activate('lantern');assert.equal(life.lamp.dataset.bright,'false');
 life.activate('books');assert(life.particles.items.some(p=>p.kind==='page'));assert.equal(calls.nest,0);
 life.activate('nest');assert.equal(calls.nest,1);assert.equal(messages.length,4);assert.equal(life.buttons.get('books').type,'button');
 life.particles.update(16);life.render();assert(life.nodes.size>0&&life.nodes.size<=90);life.particles.clear();life.render();assert.equal(life.nodes.size,0);
});
test('all three painted waterfalls use traced clips and fade out before their visible ends',()=>{
 const {life}=fixture(),defs=life.svg.children[0];
 assert.deepEqual(gardenWaterfalls.map(s=>s.id),['island','castle-left','castle-right']);
 for(const spec of gardenWaterfalls){
  const group=life.svg.children.find(n=>n.attrs['data-waterfall']===spec.id);
  assert.equal(group.attrs['clip-path'],`url(#yg-fall-clip-${spec.id})`);
  const clip=defs.children.find(n=>n.attrs.id===`yg-fall-clip-${spec.id}`);
  assert.equal(clip.attrs.clipPathUnits,'userSpaceOnUse');assert.equal(clip.children[0].attrs.d,spec.outline);
  const fade=defs.children.find(n=>n.attrs.id===`yg-fall-fade-${spec.id}`);
  assert.equal(fade.attrs.gradientUnits,'userSpaceOnUse');assert.equal(+fade.attrs.y1,spec.top);assert.equal(+fade.attrs.y2,spec.bottom);
  assert.equal(fade.children.at(-1).attrs['stop-opacity'],'0');
  assert.equal(group.children.length,spec.threads.length+1);
  for(const p of group.children.filter(n=>n.name==='path')){assert.equal(p.attrs.class,'yg-distant-fall');assert.equal(p.attrs.stroke,`url(#yg-fall-fade-${spec.id})`);assert.match(p.attrs.style,/--duration:/);}
  assert.equal(group.children.at(-1).attrs.class,'yg-water-glisten');assert.equal(group.children.at(-1).children.filter(n=>n.attrs.class==='yg-water-star').length,spec.glints.length);
 }
 assert.equal(gardenWaterfalls[0].top,191);assert.equal(gardenWaterfalls[0].bottom,289); // Previously y264..350: spilling into the lake.
 assert.equal(gardenWaterfalls[1].outline.match(/M/g).length,2); // Separate sections above/below the balustrade, never on it.
 const css=readFileSync(new URL('../assets/yuki/home/garden.css',import.meta.url),'utf8');
 assert.match(css,/\.yg-distant-fall\{[^}]*animation:yg-far-water/);assert.match(css,/\.yg-spark,\.yg-distant-fall,\.yg-lake-light\{display:none\}/);
});
test('whole-garden breeze affects both trees and flowers, with optional discoverability hints',()=>{
 const {life,scene}=fixture();life.breeze();assert(life.particles.items.some(p=>p.x<300));assert(life.particles.items.some(p=>p.x>1200));assert(life.particles.items.some(p=>p.kind==='butterfly'));
 life.reveal(true);assert.equal(scene.dataset.discoveries,'true');life.reveal(false);assert.equal(scene.dataset.discoveries,'false');
});

test('lake, stream and small waterfalls glisten only inside their own water windows',()=>{
 const {life,scene}=fixture(),defs=life.svg.children[0];
 assert.deepEqual(gardenWaterSurfaces.map(s=>s.id),['lake-far','lake-middle','lake-near','pond-stream','pond-fall','island-upper','island-fine']);
 const timings=[];
 for(const spec of gardenWaterSurfaces){
  const layer=life.svg.children.find(n=>n.attrs['data-water-surface']===spec.id);
  assert.equal(layer.attrs['clip-path'],`url(#yg-water-clip-${spec.id})`);
  assert.equal(+layer.attrs.opacity,spec.opacity);
  const clip=defs.children.find(n=>n.attrs.id===`yg-water-clip-${spec.id}`);
  assert.equal(clip.attrs.clipPathUnits,'userSpaceOnUse');assert.equal(clip.children[0].attrs.d,spec.outline);
  const glints=layer.children.at(-1),stars=glints.children.filter(n=>n.attrs.class==='yg-water-star');assert.equal(glints.attrs.class,'yg-water-glisten');assert.equal(stars.length,spec.points.length);
  for(const anchor of stars)timings.push(anchor.children[0].attrs.style);
 }
 assert(gardenWaterSurfaces[0].opacity<gardenWaterSurfaces[1].opacity&&gardenWaterSurfaces[1].opacity<gardenWaterSurfaces[2].opacity);
 assert(gardenWaterSurfaces[0].points.every(p=>p[2]<gardenWaterSurfaces[2].points[0][2]));
 // Include separate existing waterfall/pond groups: their first glints must
 // not share a zero delay or repeat an index-derived timing sequence.
 for(const spec of gardenWaterfalls)for(const n of waterGlisten(scene.ownerDocument,spec.glints).children.filter(n=>n.attrs.class==='yg-water-star'))timings.push(n.children[0].attrs.style);
 for(const n of waterGlisten(scene.ownerDocument,[[160,578],[319,607],[403,608]]).children.filter(n=>n.attrs.class==='yg-water-star'))timings.push(n.children[0].attrs.style);
 assert.equal(new Set(timings).size,timings.length);
 assert.equal(life.svg.children.filter(n=>n.attrs.class==='yg-lake-light').length,0,'no unmasked reflections over islands');
});

test('reference-style water stars have tapered rays, weaker diagonal spikes and a bounded soft halo',()=>{
 const {scene}=fixture(),doc=scene.ownerDocument;
 const first=waterGlisten(doc,[[319,607,1.15]]),second=waterGlisten(doc,[[483,279,.28]]);
 const gradient=first.children[0].children[0],other=second.children[0].children[0];
 assert.notEqual(gradient.attrs.id,other.attrs.id,'water groups never share conflicting gradient ids');
 assert.equal(gradient.name,'radialGradient');assert.equal(gradient.children.at(-1).attrs['stop-opacity'],'0');
 const star=first.children[1],pulse=star.children[0];assert.equal(star.attrs.transform,'translate(319 607) scale(1.15)');
 assert.deepEqual(pulse.children.map(n=>n.attrs.class),['yg-water-halo','yg-water-rays-faint','yg-water-rays','yg-water-core']);
 const [halo,diagonal,rays,core]=pulse.children;
 assert.equal(halo.attrs.fill,`url(#${gradient.attrs.id})`);assert.equal(+halo.attrs.r,10);
 assert.match(rays.attrs.d,/M0 -21 C/);assert.match(rays.attrs.d,/18 0/);assert.match(rays.attrs.d,/0 21/);
 assert.equal(diagonal.attrs.transform,'rotate(45) scale(.38)');assert.equal(+core.attrs.r,1.1);
 const css=readFileSync(new URL('../assets/yuki/home/garden.css',import.meta.url),'utf8');
 assert.match(css,/\.yg-water-rays-faint\{[^}]*opacity:\.48/);
 assert.match(css,/\.yg-water-glisten\{pointer-events:none\}/);
 assert.doesNotMatch(css,/\.yg-water-sparkle\{[^}]*filter:/,'bounded gradient replaces an expensive blur on every star');
});
test('reduced motion and pause keep static interactions but do not emit or advance motion',()=>{
 const {life,scene,media,messages}=fixture(true);scene.dataset.paused='true';assert(!life.active());life.activate('books');assert.equal(life.particles.items.length,0);assert(messages[0].includes('今日'));
 scene.dataset.paused='false';life.activate('flowers');assert(life.particles.items.length);scene.ownerDocument.hidden=true;assert(!life.active());life.frame(600);assert.equal(life.particles.items[0].age,0);scene.ownerDocument.hidden=false;
 media.matches=true;media.fn();assert.equal(life.particles.items.length,0);life.activate('lantern');assert.equal(life.particles.items.length,0);assert.equal(life.lamp.dataset.bright,'true');
});
test('cropped-away controls leave tab order and cleanup removes observers and scene layers',()=>{
 const {life,scene,view}=fixture(),button=life.buttons.get('books');assert.equal(life.observer.targets.length,11);
 life.observer.fn([{target:button,intersectionRatio:0}]);assert.equal(button.tabIndex,-1);life.observer.fn([{target:button,intersectionRatio:1}]);assert.equal(button.tabIndex,0);
 life.destroy();assert.equal(scene.children.length,0);assert(view.cancelled);assert(life.observer.disconnected);
});
test('discoveries use the existing thought area and keep Japanese corner quotation marks',()=>{
 for(const ja of [true,false]){const line={},status={},ctx={ja,doc:{querySelector:()=>line},say:text=>{status.text=text;}};GardenHome.prototype.discovery.call(ctx,'hello');assert.equal(line.textContent,ja?'「hello」':'“hello”');assert.equal(ctx.chatClock,0);assert.equal(ctx.inactive,0);}
 const css=readFileSync(new URL('../assets/yuki/home/garden.css',import.meta.url),'utf8');assert.match(css,/\.yg-discovery:focus-visible/);assert.match(css,/garden-hidden=true/);assert.match(css,/prefers-reduced-motion/);
 assert.match(css,/\.yg-page,\.yg-world\{[^}]*overflow:clip/);
 const html=readFileSync(new URL('../_includes/yuki-home.html',import.meta.url),'utf8');assert.match(html,/Find Garden Surprises/);assert.match(html,/庭にそよ風を送る/);
});
