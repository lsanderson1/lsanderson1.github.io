import {dragonFrames} from './dragons/frames.mjs';

// Distant visitors, never Yuki. Positions are in the unchanged garden's 1536x1024 space.
export const dragonKinds = ['lavender','amber','sage','jade','cloud'];
export const wingedKinds = ['lavender','amber','sage'];
export const flightSheets = kind => [kind,kind+'-turn',...(wingedKinds.includes(kind)?[kind+'-rear',kind+'-glide',kind+'-rear-glide']:[])];
export const skyRoutes = [
 {id:'left-away',points:[[256,124],[448,40],[760,129],[712,242]],size:[.18,.026],depth:[.22,.96],motion:'bank',turn:true,direction:1},
 {id:'right-away',points:[[964,124],[772,40],[460,129],[508,242]],size:[.18,.026],depth:[.22,.96],motion:'bank',turn:true,direction:-1},
 {id:'high-crossing',points:[[280,94],[495,42],[731,57],[990,103]],size:[.14,.12],depth:[.28,.36],motion:'steady',direction:1},
 {id:'returning',points:[[954,158],[705,125],[485,73],[204,148]],size:[.10,.14],depth:[.74,.38],motion:'glide',direction:-1},
 {id:'climbing',points:[[627,250],[688,173],[757,64],[795,-65]],size:[.07,.12],depth:[.84,.28],motion:'climb',direction:1},
 {id:'upper-breeze',points:[[248,50],[470,-2],[740,11],[1005,59]],size:[.075,.065],depth:[.70,.76],motion:'glide',direction:1},
 {id:'left-far-away',points:[[238,197],[450,146],[658,182],[705,243]],size:[.12,.020],depth:[.60,.98],motion:'glide',turn:true,direction:1},
 {id:'right-far-away',points:[[982,197],[770,146],[562,182],[515,243]],size:[.12,.020],depth:[.60,.98],motion:'glide',turn:true,direction:-1},
 {id:'behind-island-water',points:[[296,223],[395,241],[470,244],[651,221]],size:[.085,.06],depth:[.67,.80],motion:'glide',direction:1},
 {id:'near-island-crossing',points:[[296,223],[395,241],[470,244],[651,221]],size:[.13,.12],depth:[.27,.31],motion:'steady',direction:1}
];
// Authored scene depth, near=0 / far=1. Both falls belong to the large left island.
// Depth is independent of species/body size, but follows the same route progress as scale.
export const islandDepths=[.46,.77,.86,.69];
export const islandEdgeInset=.65;
export const skyWindow='M300 -100 H951 V0 L948 36 L947 72 L956 111 L932 116 L930 171 L913 171 L913 140 L918 133 L918 116 L910 107 L886 32 L863 109 L855 117 L852 133 L859 141 L859 211 L852 221 L850 242 L837 240 L834 220 L824 223 L821 192 L816 180 L811 199 L810 224 L802 230 L794 227 L789 233 L785 207 L782 192 L775 181 L771 196 L767 228 L759 234 L751 243 L748 268 L738 285 L716 295 L671 296 L625 293 L580 291 L537 294 L493 291 L447 292 L414 286 L378 282 L337 269 L307 261 L279 247 L248 219 L211 195 L222 152 L250 121 L265 83 L291 52Z';
export const skyIslands=[
 'M325 184 L341 178 L353 177 L358 167 L364 175 L371 173 L372 155 L378 151 L382 129 L388 150 L391 151 L392 140 L401 136 L404 113 L410 137 L416 140 L419 156 L421 143 L427 132 L431 149 L434 157 L438 161 L444 174 L450 179 L460 169 L464 179 L475 181 L478 186 L471 203 L462 211 L461 219 L453 222 L448 215 L439 220 L433 242 L423 240 L415 250 L408 257 L399 253 L391 240 L382 235 L379 225 L370 225 L363 217 L358 231 L352 229 L346 216 L340 211 L337 201 L329 194Z',
 'M475 100 L480 96 L486 97 L488 86 L486 83 L490 74 L495 88 L500 89 L503 79 L509 76 L511 65 L514 56 L518 63 L518 78 L522 78 L523 63 L526 49 L530 62 L533 80 L539 79 L539 69 L543 62 L549 71 L550 81 L555 78 L561 91 L562 85 L566 77 L571 91 L577 98 L581 103 L570 114 L566 132 L560 139 L553 130 L548 144 L541 150 L537 158 L528 163 L516 153 L509 141 L504 143 L498 134 L493 117 L483 113Z',
 'M583 154 L592 150 L595 143 L599 151 L602 137 L606 150 L612 149 L617 146 L621 151 L622 156 L615 160 L612 172 L606 183 L599 180 L595 172 L590 170 L588 161Z',
 'M539 220 L544 216 L547 208 L550 218 L558 216 L564 220 L558 229 L554 228 L551 238 L547 233 L545 227 L541 226Z'
];
// Water attenuates the dragon instead of deleting it like solid rock.
export const skyWater=[
 {island:0,d:'M429 192 Q433 191 437 192 L436 219 L434 247 L434 270 Q434 282 432 288 L428 288 Q431 275 430 253 L429 220Z',transmission:.30,threads:['M431 219 Q431 254 430 283','M434 218 Q435 252 432 287']},
 {island:0,d:'M365 234 L369 234 L369 266 L368 280 L365 280 L367 261Z',transmission:.48,threads:['M367 241 L367 276']}
];
const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
const mix=(a,b,t)=>a+(b-a)*t;
const smooth=t=>{t=clamp(t);return t*t*(3-2*t);};
export function depthOcclusion(depth){
 const islands=islandDepths.map(plane=>smooth((depth-plane+.008)/.016));
 return {islands,water:skyWater.map(w=>1-islands[w.island]*(1-w.transmission))};
}
export function curvePoint(points,t){
 const u=1-t;
 return [0,1].map(axis=>u*u*u*points[0][axis]+3*u*u*t*points[1][axis]+3*u*t*t*points[2][axis]+t*t*t*points[3][axis]);
}
// Continuous blends avoid slowing to a stop at every intermediate drawing.
function cels(sheet,sequence,position){
 const i=Math.floor(position),f=position-i,a=sequence[i%sequence.length],b=sequence[(i+1)%sequence.length];
 const weight=f;
 return [{sheet,frame:a,weight:1-weight},{sheet,frame:b,weight}].filter(p=>p.weight>0);
}
// Ease through a full moving glide, entering/leaving the same level-wing cel.
// The torso stays registered; only the newly drawn tips, membrane and tail flex.
export function glideCels(dragon,age,duration,rear=false){
 const t=clamp(age/duration),blend=smooth(t/.18)*smooth((1-t)/.18);
 const sheet=dragon.kind+(rear?'-rear':'');
 const layers=cels(sheet+'-glide',[0,1,2,3,4,5,6,7],t*8).map(p=>({...p,weight:p.weight*blend}));
 if(blend<1)layers.unshift({sheet,frame:rear?0:2,weight:1-blend});
 return layers.filter(p=>p.weight>0);
}
export function sideCels(dragon,age){
 const serpent=dragon.kind==='jade'||dragon.kind==='cloud';
 const profiles={steady:[1900,4,0],glide:[2200,2,2800],climb:[1600,5,0],bank:[2150,3,2200]};
 const [base,strokes,rest]=profiles[dragon.route.motion],cycle=base*dragon.tempo;
 const restTime=rest*dragon.tempo,phase=(age+dragon.phase)%(cycle*strokes+(serpent?0:restTime));
 if(!serpent&&phase>=cycle*strokes)return glideCels(dragon,phase-cycle*strokes,restTime);
 // A reversible stroke closes on the same level-wing drawing. The original
 // eight-cel order lingered on near-identical raised wings, then jumped down.
 const sequence=serpent?[0,4,5,1,2,6,7,3,7,6,2,1,5,4]:[2,1,0,1,2,3];
 const loop=cycle*(serpent?3:1);
 return cels(dragon.kind,sequence,((serpent?age+dragon.phase:phase)%loop)/loop*sequence.length);
}
export function rearCels(dragon,age){
 // Ordered by wing height: level -> raised -> high -> full downstroke -> recovery.
 // In particular, the downstroke must not be replaced with another level glide.
 const sequence=[0,7,1,2,1,3,4,5,6,5],cycle=2600*dragon.tempo,rest=3200*dragon.tempo;
 const phase=Math.max(0,age)%(cycle*2+rest);
 if(phase>=cycle*2)return glideCels(dragon,phase-cycle*2,rest,true);
 return cels(dragon.kind+'-rear',sequence,(phase%cycle)/cycle*sequence.length);
}
export function dragonPose(dragon){
 const t=clamp(dragon.age/dragon.life),p=curvePoint(dragon.route.points,t),direction=dragon.route.direction;
 const before=curvePoint(dragon.route.points,clamp(t-.002)),after=curvePoint(dragon.route.points,clamp(t+.002));
 const winged=wingedKinds.includes(dragon.kind),turnEnd=winged?.60:.56;
 const turn=dragon.route.turn?smooth((t-.28)/(turnEnd-.28)):0;
 let layers=sideCels(dragon,dragon.age);
 if(dragon.route.turn&&t>=.28){
  const sheet=dragon.kind+'-turn';
  if(t<.34){
   const blend=smooth((t-.28)/.06);
   layers=sideCels(dragon,dragon.age).map(p=>({...p,weight:p.weight*(1-blend)}));
   layers.push({sheet,frame:0,weight:blend});
  }else if(t<turnEnd){
   const last=winged?7:6,progress=smooth((t-.34)/(turnEnd-.34))*last,i=Math.floor(progress),weight=progress-i;
   layers=[{sheet,frame:i,weight:1-weight},{sheet,frame:Math.min(last,i+1),weight}];
  }else if(winged){
   const blend=smooth((t-turnEnd)/.045);
   layers=rearCels(dragon,dragon.age-turnEnd*dragon.life).map(p=>({...p,weight:p.weight*blend}));
   if(blend<1)layers.unshift({sheet,frame:7,weight:1-blend});
  }else{
   // Continue a quiet rear glide/tail sway instead of freezing the last cel.
   const weight=(1-Math.cos((t-.56)*dragon.life/(3100*dragon.tempo)*Math.PI*2))/2;
   layers=[{sheet,frame:6,weight:1-weight},{sheet,frame:7,weight}];
  }
 }
 const distance=dragon.route.turn?smooth((t-.22)/.78):t;
 const scale=mix(dragon.route.size[0],dragon.route.size[1],distance)*dragon.size;
 const depth=mix(dragon.route.depth[0],dragon.route.depth[1],distance);
 const envelope=smooth(t/.075)*smooth((1-t)/.14);
 const sideAngle=clamp(Math.atan2((after[1]-before[1])*direction,Math.abs(after[0]-before[0]))*180/Math.PI,-18,18);
 return {x:p[0],y:p[1]+Math.sin(dragon.age/950+dragon.phase/1000)*1.3,scale,depth,direction,
  angle:sideAngle*(1-turn)+Math.sin(dragon.age/1500)*turn*2,
  opacity:envelope*clamp(.31+scale*3,.35,.87),layers:layers.filter(p=>p.weight>0),turn,
  gliding:!winged||layers.some(p=>p.sheet.endsWith('-glide')&&p.weight>0)};
}
export class DragonFlights{
 constructor(random=Math.random){this.random=random;this.items=[];this.next=600;this.serial=0;this.lastRoute=-1;this.routeBag=[];}
 spawn(available=()=>true){
  if(this.items.length>=5)return;
  const kinds=dragonKinds.filter(available);if(!kinds.length)return;
  const id=this.serial++;
  if(!this.routeBag.length)this.routeBag=skyRoutes.map((_,i)=>i).filter(i=>i!==this.lastRoute);
  const choice=id===0?this.routeBag.indexOf(0):Math.floor(this.random()*this.routeBag.length);
  const routeIndex=this.routeBag.splice(choice,1)[0];
  this.lastRoute=routeIndex;
  this.items.push({id,route:skyRoutes[routeIndex],kind:kinds[id%kinds.length],age:0,
   life:27000+this.random()*11000,tempo:.88+this.random()*.25,size:.84+this.random()*.28,phase:this.random()*5000});
 }
 update(dt,active=true,available=()=>true){
  if(!active)return;
  const step=clamp(Number.isFinite(dt)?dt:0,0,64);
  for(const p of this.items)p.age+=step;
  this.items=this.items.filter(p=>p.age<p.life);this.next-=step;
  if(this.next<=0){this.spawn(available);this.next=this.items.length?4800+this.random()*4800:600;}
 }
 clear(){this.items=[];this.next=1200;}
}
const NS='http://www.w3.org/2000/svg';
function element(doc,name,attrs={}){const n=doc.createElementNS(NS,name);for(const [key,value] of Object.entries(attrs))n.setAttribute(key,String(value));return n;}
let instance=0;
export class GardenSkyDragons{
 constructor(doc,svg,defs){
  this.doc=doc;this.defs=defs;this.model=new DragonFlights();this.nodes=new Map();this.ready=new Set();this.loads=[];this.destroyed=false;
  this.prefix=`yg-dragons-${++instance}`;
  const clip=element(doc,'clipPath',{id:this.prefix+'-sky',clipPathUnits:'userSpaceOnUse'});
  clip.append(element(doc,'path',{d:skyWindow}));defs.append(clip);
  // World-space, per-visitor masks allow near and far flights at the same screen point.
  const layerAttrs={class:'yg-sky-dragons','clip-path':`url(#${this.prefix}-sky)`,'aria-hidden':'true','pointer-events':'none'};
  this.layer=element(doc,'g',{...layerAttrs,id:this.prefix+'-visitors'});svg.append(this.layer);
  this.frontLayer=element(doc,'g',{...layerAttrs,id:this.prefix+'-visitors-front'});svg.append(this.frontLayer);
  this.defined=new Set();
  const ImageClass=doc.defaultView?.Image;
  for(const kind of dragonKinds){
   if(!ImageClass){this.ready.add(kind);continue;}
   let loaded=0;
   const sheets=flightSheets(kind);
   for(const sheet of sheets){
    const image=new ImageClass();this.loads.push(image);
    image.onload=()=>{if(!this.destroyed&&++loaded===sheets.length)this.ready.add(kind);};
    image.onerror=()=>{};image.src=new URL(`./dragons/${sheet}.png`,import.meta.url).href;
   }
  }
 }
 defineFrame(sheet,index){
  const id=`${this.prefix}-${sheet}-${index}`;if(this.defined.has(id))return id;
  this.defined.add(id);const frame=dragonFrames[sheet][index],clipId=id+'-clip';
  const clip=element(this.doc,'clipPath',{id:clipId,clipPathUnits:'userSpaceOnUse'});
  clip.append(element(this.doc,'path',{d:frame.clip}));this.defs.append(clip);
  const group=element(this.doc,'g',{id,transform:`scale(${frame.scale}) translate(${-frame.anchor[0]} ${-frame.anchor[1]})`});
  group.append(element(this.doc,'image',{href:new URL(`./dragons/${sheet}.png`,import.meta.url).href,width:1536,height:1024,'clip-path':`url(#${clipId})`}));this.defs.append(group);
  return id;
 }
 update(dt){if(this.destroyed)return;this.model.update(dt,true,kind=>this.ready.has(kind));this.render();}
 clear(){this.model.clear();this.render();}
 render(){
  const live=new Set(this.model.items.map(p=>p.id));
  for(const [id,node] of this.nodes)if(!live.has(id)){node.outer.remove();node.mask.remove();this.nodes.delete(id);}
  // Paint distant visitors before closer ones, never according to spawn order.
  const poses=this.model.items.map(dragon=>({dragon,p:dragonPose(dragon)})).sort((a,b)=>b.p.depth-a.p.depth);
  for(const {dragon,p} of poses){
   let node=this.nodes.get(dragon.id);
   if(!node){
    const maskId=this.prefix+'-depth-'+dragon.id;
    const mask=element(this.doc,'mask',{id:maskId,maskUnits:'userSpaceOnUse',x:0,y:-100,width:1536,height:1124,'mask-type':'luminance'});
    mask.append(element(this.doc,'rect',{x:0,y:-100,width:1536,height:1124,fill:'white'}));
    const water=skyWater.map(w=>element(this.doc,'path',{d:w.d,fill:'white'}));
    const islands=skyIslands.map(d=>element(this.doc,'path',{d,fill:'white',stroke:'white','stroke-width':islandEdgeInset*2,'stroke-linejoin':'round'}));
    for(const shape of [...water,...islands])mask.append(shape);this.defs.append(mask);
    const outer=element(this.doc,'g',{mask:`url(#${maskId})`});
    const group=element(this.doc,'g',{'data-sky-dragon':dragon.kind,'data-flight':dragon.route.id});
    const blend=element(this.doc,'g',{style:'isolation:isolate'}),uses=[];
    for(let i=0;i<4;i++){const use=element(this.doc,'use',{style:'mix-blend-mode:plus-lighter',opacity:0});blend.append(use);uses.push(use);}
    group.append(blend);outer.append(group);node={group,outer,uses,mask,water,islands};this.nodes.set(dragon.id,node);
   }
   const occlusion=depthOcclusion(p.depth),gray=value=>{const c=Math.round(value*255);return `rgb(${c} ${c} ${c})`;};
   node.water.forEach((shape,i)=>shape.setAttribute('fill',gray(occlusion.water[i])));
   node.islands.forEach((shape,i)=>shape.setAttribute('fill',gray(1-occlusion.islands[i])));
   // The near pass also paints above the animated falling-water threads.
   (p.depth<islandDepths[0]?this.frontLayer:this.layer).append(node.outer);
   node.group.setAttribute('transform',`translate(${p.x.toFixed(2)} ${p.y.toFixed(2)}) rotate(${p.angle.toFixed(2)}) scale(${(p.scale*p.direction).toFixed(4)} ${p.scale.toFixed(4)})`);
   node.group.setAttribute('opacity',p.opacity.toFixed(3));node.group.setAttribute('data-turn',p.turn.toFixed(2));
   node.group.setAttribute('data-gliding',String(p.gliding));
   node.group.setAttribute('data-depth',p.depth.toFixed(4));
   node.uses.forEach((use,i)=>{const layer=p.layers[i];use.setAttribute('opacity',layer?layer.weight.toFixed(4):0);if(layer)use.setAttribute('href','#'+this.defineFrame(layer.sheet,layer.frame));});
  }
 }
 destroy(){this.destroyed=true;for(const image of this.loads){image.onload=null;image.onerror=null;}this.loads=[];this.ready.clear();this.clear();this.layer.remove();this.frontLayer.remove();}
}
