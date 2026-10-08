import {waterGlisten} from './water-light.mjs?v=3';
// Coordinates are traced in the original 1536 x 1024 illustration, not the
// viewport. The same water mask controls drawing AND pointer hit testing.
export const pondShore=[[81,540],[112,534],[192,535],[259,530],[340,533],[406,538],[449,551],[448,579],[462,600],[438,619],[393,635],[327,648],[239,657],[175,660],[106,650],[70,639],[41,621],[22,600],[48,582],[65,573]];
export const pondLilies=[{x:75,y:625,rx:60,ry:36},{x:174,y:645,rx:49,ry:25},{x:257,y:618,rx:35,ry:17},{x:270,y:565,rx:57,ry:20},{x:373,y:574,rx:48,ry:18}];
export function isPondWater({x,y}){
 let inside=false;
 for(let i=0,j=pondShore.length-1;i<pondShore.length;j=i++){
  const [a,b]=pondShore[i],[c,d]=pondShore[j];
  if((b>y)!==(d>y)&&x<(c-a)*(y-b)/(d-b)+a)inside=!inside;
 }
 return inside&&!pondLilies.some(p=>((x-p.x)/p.rx)**2+((y-p.y)/p.ry)**2<=1);
}
export function pondImagePoint(client,rect){
 if(!(rect.width>0&&rect.height>0))return null;
 const p={x:(client.x-rect.left)*1536/rect.width,y:(client.y-rect.top)*1024/rect.height};
 return isPondWater(p)?p:null;
}
export function pondMask(){
 const shore=`M${pondShore.map(p=>p.join(',')).join(' L')} Z`;
 // Intersect separate exclusions: a single even-odd path would paint again
 // wherever two lily masks overlap, or where a lily reaches past the bank.
 return [shore,...pondLilies.map(p=>`M0 0 H1536 V1024 H0 Z M${p.x-p.rx},${p.y} a${p.rx},${p.ry} 0 1,0 ${p.rx*2},0 a${p.rx},${p.ry} 0 1,0 ${-p.rx*2},0 Z`)];
}
const ambientPoints=[{x:160,y:578},{x:319,y:607},{x:403,y:608},{x:205,y:598},{x:324,y:633},{x:134,y:603}];
export const pondRippleLifetime=3300;
export const pondRippleCapacity=96;
export class PondMotion{
 constructor(random=Math.random){this.random=random;this.rings=[];this.elapsed=0;this.next=500;this.drip=0;this.serial=0;}
 splash(point,{gentle=false}={}){
  if(!isPondWater(point))return false;
  // Never evict a visible ripple for a newer one. Reserve room for an entire
  // splash; under extreme input, skip new emissions until old rings fade out.
  const count=gentle?2:3;
  if(this.rings.length+count>pondRippleCapacity)return false;
  for(let i=0;i<count;i++)this.rings.push({...point,id:++this.serial,age:-i*220,size:gentle?48:78});
  return true;
 }
 update(dt,active=true){
  if(!active)return;
  const step=Math.max(0,Math.min(64,dt));this.elapsed+=step;this.drip+=step;
  for(const ring of this.rings)ring.age+=step;
  this.rings=this.rings.filter(r=>r.age<pondRippleLifetime);
  if(this.elapsed>=this.next){this.splash(ambientPoints[Math.floor(this.random()*ambientPoints.length)],{gentle:true});this.next=this.elapsed+1900+this.random()*1600;}
  if(this.drip>1400){this.drip=0;this.splash({x:128,y:553},{gentle:true});}
 }
 clear(){this.rings=[];}
}
const NS='http://www.w3.org/2000/svg';
function svgElement(doc,name,attributes={}){const node=doc.createElementNS(NS,name);for(const [key,value] of Object.entries(attributes))node.setAttribute(key,String(value));return node;}
export class GardenPond{
 constructor(scene,{ja=false,feedback=()=>{}}={}){
  this.scene=scene;this.doc=scene.ownerDocument;this.feedback=feedback;this.ja=ja;this.motion=new PondMotion();this.nodes=new Map();this.last=0;this.lastTouch=-Infinity;this.lastPoint=null;
  this.media=this.doc.defaultView.matchMedia('(prefers-reduced-motion: reduce)');
  this.svg=svgElement(this.doc,'svg',{class:'yg-pond',viewBox:'0 0 1536 1024',focusable:'false'});
  const defs=svgElement(this.doc,'defs'),masks=pondMask();this.svg.append(defs);let clipped=this.svg;
  for(const [i,d] of masks.entries()){
   const clip=svgElement(this.doc,'clipPath',{id:`yg-pond-surface-${i}`});clip.append(svgElement(this.doc,'path',{d,'clip-rule':'evenodd'}));defs.append(clip);
   const layer=svgElement(this.doc,'g',{'clip-path':`url(#yg-pond-surface-${i})`});clipped.append(layer);clipped=layer;
  }
  const surface=svgElement(this.doc,'g',{'aria-hidden':'true'});
  // Small moving reflected strokes, not a bright oval floating above the bank.
  for(let i=0;i<24;i++){
   const x=75+(i*67)%367,y=539+(i*23)%116,length=9+(i*7)%23;
   surface.append(svgElement(this.doc,'path',{class:'yg-water-glint',d:`M${x} ${y} q${length/2} -2 ${length} 0`,style:`--delay:${-i*.71}s;--duration:${3.4+(i%5)*.6}s`}));
  }
  this.ripples=svgElement(this.doc,'g',{class:'yg-pond-ripples'});surface.append(this.ripples);
  surface.append(waterGlisten(this.doc,ambientPoints.map((p,i)=>[p.x,p.y,.75+(i%3)*.15])));
  for(const [i,p] of [{x:197,y:596},{x:343,y:608},{x:414,y:552}].entries()){
   const drift=svgElement(this.doc,'g',{transform:`translate(${p.x} ${p.y})`});
   drift.append(svgElement(this.doc,'path',{class:'yg-water-petal',d:'M-4 0 Q-1 -4 5 -1 Q2 4 -4 0',style:`--delay:${i*-3}s`}));surface.append(drift);
  }
  clipped.append(surface);
  const fall=svgElement(this.doc,'g',{class:'yg-waterfall','aria-hidden':'true'});
  for(let i=0;i<6;i++)fall.append(svgElement(this.doc,'path',{d:`M${94+i*7} ${454-i*.3} Q${103+i*6} 490 ${108+i*6} 514 T${113+i*5} 549`,style:`--delay:${-i*.2}s;--duration:${1.35+i*.13}s`}));
  this.svg.append(fall);
  this.touch=svgElement(this.doc,'path',{class:'yg-pond-touch',d:masks[0],tabindex:'0',role:'button','aria-label':ja?'水面に触れて波紋を作る':'Touch the Water to Make Ripples'});
  const title=svgElement(this.doc,'title');title.textContent=ja?'タップやドラッグで波紋を作れるよ。キーボードなら Enter。':'Tap or brush the water to make ripples. Keyboard: Enter.';this.touch.append(title);clipped.append(this.touch);scene.append(this.svg);
  this.onPointer=e=>{
   if(e.type==='pointerdown'&&e.button!==0)return;
   const p=pondImagePoint({x:e.clientX,y:e.clientY},scene.getBoundingClientRect());
   if(!p||!this.active())return;
   const now=performance.now(),down=e.type==='pointerdown';
   if(!down&&(now-this.lastTouch<(e.buttons?150:420)||this.lastPoint&&Math.hypot(p.x-this.lastPoint.x,p.y-this.lastPoint.y)<12))return;
   this.lastTouch=now;this.lastPoint=p;this.motion.splash(p,{gentle:!down});
   if(down)this.describe();
  };
  this.onKey=e=>{if(!['Enter',' '].includes(e.key))return;e.preventDefault();if(!e.repeat)this.play();};
  this.touch.addEventListener('pointerdown',this.onPointer,{passive:true});this.touch.addEventListener('pointermove',this.onPointer,{passive:true});this.touch.addEventListener('keydown',this.onKey);
  this.onReduced=()=>{if(this.media.matches){this.motion.clear();this.render();}};this.media.addEventListener('change',this.onReduced);
  this.frame=now=>{const dt=this.last?now-this.last:0;this.last=now;if(this.active()){this.motion.update(dt);this.render();}this.raf=this.doc.defaultView.requestAnimationFrame(this.frame);};
  this.raf=this.doc.defaultView.requestAnimationFrame(this.frame);
 }
 active(){
  if(this.media.matches||this.doc.hidden||this.scene.dataset.paused==='true'||this.scene.dataset.offscreen==='true'||this.doc.body.dataset.gardenPaused==='true')return false;
  const r=this.scene.getBoundingClientRect(),view=this.doc.defaultView;
  // Stop the water simulation when mobile panning carries the whole pond away.
  return r.left+462*r.width/1536>0&&r.left+22*r.width/1536<view.innerWidth&&r.top+660*r.height/1024>0&&r.top+530*r.height/1024<view.innerHeight;
 }
 describe(){this.feedback(this.ja?'ぽちゃん！波紋が広がっていくね。水面をなぞって遊んでみて。':'Plip! Watch those little rings grow. You can brush the water, too.');}
 play(){if(this.active())this.motion.splash({x:319,y:607});this.describe();}
 render(){
  const live=new Set(this.motion.rings.map(r=>r.id));for(const [id,node] of this.nodes)if(!live.has(id)){node.remove();this.nodes.delete(id);}
  for(const r of this.motion.rings){
   let node=this.nodes.get(r.id);if(!node){node=svgElement(this.doc,'ellipse',{class:'yg-water-ring',cx:r.x,cy:r.y});this.nodes.set(r.id,node);this.ripples.append(node);}
   const p=Math.max(0,r.age)/pondRippleLifetime,rx=3+r.size*(1-(1-p)**1.6);
   node.setAttribute('rx',rx.toFixed(2));node.setAttribute('ry',(rx*.26).toFixed(2));node.setAttribute('opacity',r.age<0?'0':(Math.sin(Math.PI*p)*(1-p)*.85).toFixed(3));
  }
 }
 destroy(){this.doc.defaultView.cancelAnimationFrame(this.raf);this.media.removeEventListener('change',this.onReduced);this.touch.removeEventListener('pointerdown',this.onPointer);this.touch.removeEventListener('pointermove',this.onPointer);this.touch.removeEventListener('keydown',this.onKey);this.svg.remove();}
}
