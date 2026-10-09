import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dragonFrames} from '../assets/yuki/home/dragons/frames.mjs';
import {dragonKinds,wingedKinds,flightSheets,rearCels,sideCels,glideCels,skyRoutes,DragonFlights,dragonPose,curvePoint,GardenSkyDragons,skyWindow,skyIslands,skyWater,islandDepths,islandEdgeInset,depthOcclusion} from '../assets/yuki/home/sky-dragons.mjs';
const specimen=(kind,route,age=0)=>({id:0,kind,route,age,life:32000,tempo:1,size:1,phase:0});
test('five approved designs have complete side and turn atlases, without rejected variants',()=>{
 assert.deepEqual(dragonKinds,['lavender','amber','sage','jade','cloud']);
 assert.equal(Object.keys(dragonFrames).length,19);
 for(const name of Object.keys(dragonFrames)){
  const png=readFileSync(new URL(`../assets/yuki/home/dragons/${name}.png`,import.meta.url));
  assert.equal(png.readUInt32BE(16),1536);assert.equal(png.readUInt32BE(20),1024);
  assert.equal(dragonFrames[name].length,8);
  for(const f of dragonFrames[name]){
   assert.match(f.clip,/^M.*Z$/);assert.equal(f.anchor.length,2);assert(f.anchor.every(Number.isFinite));
   assert(f.scale>0&&f.scale<=1);assert(f.bounds[0]>=0&&f.bounds[1]>=0);
  }
 }
});
test('left and right arrivals turn away symmetrically without suddenly flipping',()=>{
 const [left,right]=skyRoutes;
 for(const kind of dragonKinds)for(let age=0;age<=32000;age+=20){
  const a=dragonPose(specimen(kind,left,age)),b=dragonPose(specimen(kind,right,age));
  assert.equal(a.direction,1);assert.equal(b.direction,-1);
  assert(Math.abs(a.x+b.x-1220)<1e-8);assert.equal(a.y,b.y);assert.equal(a.scale,b.scale);
  assert.deepEqual(a.layers,b.layers);
  if(age>24000)assert(a.layers.every(p=>wingedKinds.includes(kind)?[kind+'-rear',kind+'-rear-glide'].includes(p.sheet):p.sheet===kind+'-turn'&&p.frame>=6));
 }
});
test('all poses remain finite, blend weights sum to one, and disappear gently at the end',()=>{
 for(const kind of dragonKinds)for(const route of skyRoutes){
  let previous;
  for(let age=0;age<=32000;age+=16){
   const p=dragonPose(specimen(kind,route,age));
   assert([p.x,p.y,p.scale,p.depth,p.angle,p.opacity,p.turn].every(Number.isFinite));
   assert(p.opacity>=0&&p.opacity<=1);assert(p.layers.length<=4);
   assert(Math.abs(p.layers.reduce((s,f)=>s+f.weight,0)-1)<1e-8);
   assert(p.layers.every(f=>dragonFrames[f.sheet][f.frame]&&f.weight>=0&&f.weight<=1));
   if(previous){assert(Math.abs(p.scale-previous.scale)<.001);assert(Math.hypot(p.x-previous.x,p.y-previous.y)<2);}
   previous=p;
  }
  assert.equal(dragonPose(specimen(kind,route,0)).opacity,0);
  assert.equal(dragonPose(specimen(kind,route,32000)).opacity,0);
  assert.deepEqual(curvePoint(route.points,0),route.points[0]);
  assert.deepEqual(curvePoint(route.points,1),route.points[3]);
 }
});
test('distant rear flight still moves its tail rather than freezing a final frame',()=>{
 for(const kind of dragonKinds){
  const d=specimen(kind,skyRoutes[0]);
  const a=dragonPose({...d,age:25000}),b=dragonPose({...d,age:26200});
  assert.notDeepEqual(a.layers,b.layers);assert(b.scale<a.scale);
 }
});
test('frame weights close every loop and join glides/turns without discontinuities',()=>{
 for(const kind of dragonKinds)for(const route of skyRoutes){
  let previous;
  for(let age=0;age<32000;age+=8){
   const weights=new Map(dragonPose(specimen(kind,route,age)).layers.map(f=>[f.sheet+f.frame,f.weight]));
   if(previous){const keys=new Set([...weights.keys(),...previous.keys()]);let change=0;for(const key of keys)change+=Math.abs((weights.get(key)||0)-(previous.get(key)||0));assert(change<.16,`${kind} ${route.id} at ${age}: ${change}`);}
   previous=weights;
  }
 }
});
test('flights are bounded, pause exactly, avoid catchup, and wait for paired artwork',()=>{
 const m=new DragonFlights(()=>.3);m.spawn(()=>false);assert.equal(m.items.length,0);
 m.spawn();m.update(600000);assert.equal(m.items[0].age,64);
 const snapshot=structuredClone(m.items);m.update(100,false);assert.deepEqual(m.items,snapshot);
 const kinds=new Set(),routes=new Set();
 for(let i=0;i<30000;i++){m.update(16);assert(m.items.length<=5);for(const d of m.items){kinds.add(d.kind);routes.add(d.route.id);}}
 assert.equal(kinds.size,5);assert(routes.has('left-away')&&routes.has('right-away'));
 m.clear();assert.equal(m.items.length,0);m.update(NaN);assert.equal(m.items.length,0);
});
function fixture(ImageClass){
 class Node{constructor(name){this.name=name;this.attrs={};this.children=[];}setAttribute(k,v){this.attrs[k]=String(v);}append(n){if(n.parent)n.remove();n.parent=this;this.children.push(n);}remove(){this.parent.children=this.parent.children.filter(n=>n!==this);this.parent=null;}}
 const doc={defaultView:{Image:ImageClass},createElementNS:(_,name)=>new Node(name)},svg=new Node('svg'),defs=new Node('defs');svg.append(defs);
 return {sky:new GardenSkyDragons(doc,svg,defs),svg,defs};
}
test('renderer mirrors the same artwork and intersects sky with island occlusion',()=>{
 const {sky,svg,defs}=fixture();
 sky.model.items=[specimen('cloud',skyRoutes[1],18000)];sky.render();
 const node=sky.nodes.get(0);assert.match(node.group.attrs.transform,/scale\(-/);
 assert(node.uses.some(n=>n.attrs.href?.includes('cloud-turn')));
 assert.equal(defs.children[0].children[0].attrs.d,skyWindow);
 assert.equal(node.mask.children.length,skyIslands.length+skyWater.length+1);
 assert(skyWater.every(w=>w.transmission>0&&w.transmission<1));
 assert(node.outer.attrs.mask);assert(sky.layer.attrs['clip-path']);assert.equal(sky.layer.attrs['clip-path'],sky.frontLayer.attrs['clip-path']);
 assert.equal(node.uses.length,4);
 sky.clear();assert.equal(sky.nodes.size,0);sky.destroy();assert.equal(svg.children.length,1);
});
test('distance changes masking consistently, with water following its parent island',()=>{
 assert.equal(islandDepths.length,skyIslands.length);assert(islandEdgeInset>0&&islandEdgeInset<1);
 const near=depthOcclusion(.2),far=depthOcclusion(.99),middle=depthOcclusion(.72);
 assert(near.islands.every(n=>n===0));assert(near.water.every(n=>n===1));
 assert(far.islands.every(n=>n===1));assert(far.water.every((n,i)=>Math.abs(n-skyWater[i].transmission)<1e-9));
 assert.equal(middle.islands[0],1);assert.equal(middle.islands[1],0);
 for(const plane of islandDepths){
  const before=depthOcclusion(plane-.009),after=depthOcclusion(plane+.009);
  assert(before.islands.every((n,i)=>n<=after.islands[i]));
 }
 for(const kind of dragonKinds)for(const route of skyRoutes){
  let previous=dragonPose(specimen(kind,route,0));
  for(let age=100;age<=32000;age+=100){const p=dragonPose(specimen(kind,route,age));
   assert(Math.abs(p.depth-previous.depth)<.02);
   if(route.depth[1]>=route.depth[0]){assert(p.depth>=previous.depth);assert(p.scale<=previous.scale+1e-8);}
   else{assert(p.depth<=previous.depth);assert(p.scale>=previous.scale-1e-8);}
   previous=p;
  }
 }
});
test('identical screen paths can pass in front or behind without scale-dependent mask guesses',()=>{
 const close=skyRoutes.find(r=>r.id==='near-island-crossing'),far=skyRoutes.find(r=>r.id==='behind-island-water');
 const {sky}=fixture();
 sky.model.items=[{...specimen('lavender',close,13000),id:1},{...specimen('amber',far,13000),id:2}];sky.render();
 const a=sky.nodes.get(1),b=sky.nodes.get(2),ap=dragonPose(sky.model.items[0]),bp=dragonPose(sky.model.items[1]);
 assert.equal(ap.x,bp.x);assert.equal(ap.y,bp.y);assert(ap.scale>bp.scale);
 assert.equal(a.outer.parent,sky.frontLayer);assert.equal(b.outer.parent,sky.layer);
 assert.equal(a.islands[0].attrs.fill,'rgb(255 255 255)');assert.equal(b.islands[0].attrs.fill,'rgb(0 0 0)');
 assert.equal(a.water[0].attrs.fill,'rgb(255 255 255)');assert.equal(b.water[0].attrs.fill,'rgb(77 77 77)');
 sky.render();assert.equal(sky.frontLayer.children.length,1);assert.equal(sky.layer.children.length,1);
 const masks=[a.mask,b.mask];sky.clear();assert(masks.every(n=>n.parent===null));
});
test('near passes render above water threads and hidden/reduced scenes keep both depth layers paused',()=>{
 const code=readFileSync(new URL('../assets/yuki/home/world-life.mjs',import.meta.url),'utf8');
 assert(code.indexOf('this.svg.append(this.dragons.frontLayer)')>code.indexOf('addWaterfalls(this.doc,this.svg,defs)'));
 assert.match(code,/if\(this.active\(\)\).*this.dragons.update/s);
 assert.match(readFileSync(new URL('../assets/yuki/home/garden.css',import.meta.url),'utf8'),/yg-sky-dragons/);
});
test('a design waits for every side/turn/rear sheet and late callbacks cannot revive a destroyed scene',()=>{
 class FakeImage{constructor(){this.src='';}}
 const {sky}=fixture(FakeImage);assert.equal(sky.ready.size,0);
 assert.equal(sky.loads.length,dragonKinds.flatMap(flightSheets).length);
 for(let i=0;i<4;i++)sky.loads[i].onload();assert.equal(sky.ready.size,0);sky.loads[4].onload();assert(sky.ready.has('lavender'));
 const late=sky.loads[5].onload,images=[...sky.loads];sky.destroy();late();
 assert.equal(sky.ready.size,0);assert(images.every(i=>i.onload===null&&i.onerror===null));
});
test('rear wingbeats alternate with living glides and retain a full up/down stroke',()=>{
 for(const kind of wingedKinds){
  const frames=dragonFrames[kind+'-rear'],d=specimen(kind,skyRoutes[0]),used=new Set();
  assert(frames[2].bounds[1]%512<frames[0].bounds[1]%512-80,'high wing silhouette must be visibly raised');
  assert(frames[6].bounds[2]<frames[0].bounds[2]*.7,'downstroke must tuck wings instead of holding a glide');
  let gliding=0,flapping=0;
  for(let age=22000;age<31000;age+=20){const p=dragonPose({...d,age});if(p.gliding)gliding++;else flapping++;for(const layer of p.layers)if(layer.sheet===kind+'-rear'&&layer.weight>.4)used.add(layer.frame);}
  assert(gliding>30&&flapping>30);
  assert(used.has(2)&&used.has(6));
  assert.deepEqual(rearCels(d,0),rearCels(d,8400));
  assert.equal(flightSheets(kind).length,5);
 }
 assert.equal(flightSheets('jade').length,2);assert.equal(flightSheets('cloud').length,2);
});
test('side and rear glide companions move through all eight drawings and rejoin neutral exactly',()=>{
 for(const kind of wingedKinds)for(const rear of [false,true]){
  const d=specimen(kind,skyRoutes[3]),sheet=kind+(rear?'-rear':'')+'-glide',used=new Set();
  for(let age=0;age<3200;age+=40)for(const p of glideCels(d,age,3200,rear))if(p.sheet===sheet)used.add(p.frame);
  assert.equal(used.size,8);assert.deepEqual(glideCels(d,0,3200,rear),glideCels(d,3200,3200,rear));
  assert.notDeepEqual(glideCels(d,800,3200,rear),glideCels(d,2000,3200,rear));
  const frames=dragonFrames[sheet];
  const centers=frames.map(f=>f.bounds[1]-f.anchor[1]);
  assert(Math.max(...centers)-Math.min(...centers)<35,'glide heads and torsos must not jump between rows');
 }
});
test('glide and turn transitions retain every blend layer at varied tempos and phases',()=>{
 for(const tempo of [.88,1,1.13])for(const phase of [0,900,3700]){
  const d={...specimen('lavender',skyRoutes[6]),tempo,phase};
  let previous;
  for(let age=0;age<34000;age+=8){
   const p=dragonPose({...d,age}),weights=new Map(p.layers.map(f=>[f.sheet+f.frame,f.weight]));
   assert(p.layers.length<=4);assert(Math.abs([...weights.values()].reduce((a,b)=>a+b,0)-1)<1e-8);
   if(previous){let delta=0;for(const key of new Set([...weights.keys(),...previous.keys()]))delta+=Math.abs((weights.get(key)||0)-(previous.get(key)||0));assert(delta<.17,`${tempo} ${phase} ${age}: ${delta}`);}
   previous=weights;
  }
  assert(sideCels({...d,route:skyRoutes[3],phase:0},6000*tempo).some(p=>p.sheet.endsWith('-glide')));
 }
});
