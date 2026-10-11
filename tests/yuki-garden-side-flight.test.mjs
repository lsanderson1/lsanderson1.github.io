import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {roostPerch,centerLegacyRoost,gardenSpots} from '../assets/yuki/home/perches.mjs';
import {YukiLocation,locationKey} from '../assets/yuki/home/location.mjs';
import {skyRoutes,dragonKinds,flightSheets,dragonPose} from '../assets/yuki/home/sky-dragons.mjs';

test('new, returning and legacy settled roost positions use the centered anchor',()=>{
 const old={x:.2,y:.775},saved={version:1,page:'/yuki/',garden:true,spot:'nest',position:old,status:'sleep',updatedAt:100,pose:{position:old,at:old,target:old,life:{frame:3}}};
 const store={getItem:key=>key===locationKey?JSON.stringify(saved):null,setItem(){}};
 const yuki=new YukiLocation(store,{now:()=>200});assert.deepEqual(yuki.state.position,roostPerch);assert.deepEqual(yuki.state.pose.position,roostPerch);assert.equal(yuki.state.pose.life.frame,3);
 assert.deepEqual(yuki.home().position,roostPerch);assert.deepEqual(new YukiLocation(null).state.position,gardenSpots.nest);
 assert.deepEqual(centerLegacyRoost(yuki.state),yuki.state);
 for(const override of [{page:'/resume.html'},{status:'flight'},{position:{x:.3,y:.8}},{transfer:{}},{pose:{moving:true}},{pose:{route:{}}}]){const state={...saved,...override};assert.equal(centerLegacyRoost(state),state);}
});

test('every live route stays sideways at one depth and scale throughout its full loop',()=>{
 assert(skyRoutes.some(r=>r.direction===1)&&skyRoutes.some(r=>r.direction===-1));
 for(const route of skyRoutes)for(const kind of dragonKinds){
  assert(!route.turn);assert.equal(route.size[0],route.size[1]);assert.equal(route.depth[0],route.depth[1]);
  let previous;
  for(let age=0;age<=32000;age+=16){
   const p=dragonPose({kind,route,age,life:32000,tempo:1,size:1,phase:0});
   assert.equal(p.turn,0);assert.equal(p.scale,route.size[0]);assert.equal(p.depth,route.depth[0]);
   assert(p.layers.every(f=>flightSheets(kind).includes(f.sheet)));assert(Math.abs(p.layers.reduce((s,f)=>s+f.weight,0)-1)<1e-8);
   if(previous){assert((p.x-previous.x)*route.direction>=0);assert(Math.hypot(p.x-previous.x,p.y-previous.y)<2);}
   previous=p;
  }
 }
});

test('garden layers put artwork behind petals and text without blocking chat controls',()=>{
 const css=readFileSync(new URL('../assets/yuki/home/garden.css',import.meta.url),'utf8');
 assert.match(css,/#yuki-companion\{position:absolute;z-index:auto\}/);
 assert.match(css,/\.yuki-pet,\.yuki-hit,\.yuki-guide-line,\.yuki-target-ring\)\{z-index:40\}/);
 assert.match(css,/\.yg-weather,\.yg-chase-petal\{z-index:41\}/);
 assert.match(css,/\.yg-thought,\.yg-controls,\.yg-pan-edge,\.yg-beta,\.yg-hotspots button\{z-index:42\}/);
 assert.match(css,/\.yuki-panel,\.yuki-launcher,\.yuki-location\)\{z-index:48\}/);
 assert.doesNotMatch(css,/\.yg-(main|scene)\{[^}]*isolation:isolate/);
});
