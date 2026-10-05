import {MotionGraph} from './graph.mjs';
import {wingSlotMs} from './flight-playback.mjs';
export const smooth=t=>t*t*t*(t*(t*6-15)+10);
export const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export const clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));

// Points refer to her feet. Art is always uniformly scaled, never warped or flipped.
export function safePerches(width,height,bodyHeight=150){
 const margin=Math.min(width*.28,bodyHeight*.85+15);
 const bottom=Math.max(bodyHeight+95,height-126);
 const top=Math.min(bottom,width<700?Math.max(bodyHeight+104,height*.64):bodyHeight+104);
 return [
  {id:'left',name:'Left perch',x:margin,y:bottom},
  {id:'high',name:'High perch',x:width-margin,y:top},
  {id:'right',name:'Right perch',x:width-margin,y:bottom},
 ];
}
export class Rover {
 constructor(clips,perches,{random=Math.random,motion={}}={}){
  this.graph=new MotionGraph(clips,motion);this.random=random;this.playing=true;this.hidden=false;this.lessMotion=false;this.wander=false;
  this.canDepart=()=>true;this.restHeld=false;
  this.canLand=()=>true;this.flightCycleTime=0;
  this.arrivalStyle='land';this.hoverRemaining=0;this.hoverClock=0;this.hoverChoice=null;
  this.points=perches;this.at=perches[0].id;this.wanted=this.at;this.position={...perches[0]};this.route=null;this.dwell=0;this.wait=7000;this.arrivals=0;
 }
 point(id){const p=this.points.find(p=>p.id===id);if(!p)throw new Error('Unknown perch');return p;}
 request(id){
  this.point(id);this.wanted=id;this.dwell=0;
  if(this.lessMotion){this.graph.reset();this.at=id;this.position={...this.point(id)};this.route=null;return;}
  if(this.graph.state==='rest'&&id!==this.at&&this.canDepart())this.graph.request('flight');
  else if(this.graph.state==='flight'&&this.route?.id!==id)this.beginRoute();
 }
 beginRoute(){
  const end=this.point(this.wanted),visible=this.foot,start={x:visible.x,y:visible.y+this.graph.lift*48};
  this.position={...start};
  this.route={id:end.id,start,end:{...end},elapsed:0,duration:clamp(distance(start,end)/.15,1000,4000),arrived:false};
  this.hoverRemaining=0;this.hoverClock=0;
  this.graph.request('flight');
 }
 setPerches(points){
  this.points=points;
  const minX=Math.min(...points.map(p=>p.x)),maxX=Math.max(...points.map(p=>p.x));
  const minY=Math.min(...points.map(p=>p.y)),maxY=Math.max(...points.map(p=>p.y));
  this.position.x=clamp(this.position.x,minX,maxX);this.position.y=clamp(this.position.y,minY,maxY);
  if(this.graph.state==='rest'||this.graph.state==='takeoff')this.position={...this.point(this.at)};
  else if(this.graph.state==='landing')this.position={...this.point(this.route?.id??this.at)};
  else if(this.route&&distance(this.route.end,this.point(this.route.id))>.5)this.beginRoute();
 }
 setLessMotion(value){
  this.lessMotion=value;
  if(value){this.wander=false;this.graph.reset();this.at=this.wanted;this.position={...this.point(this.at)};this.route=null;this.hoverRemaining=0;}
 }
 setArrivalStyle(value){
  if(!['auto','land','hover'].includes(value))throw new Error('Invalid arrival style');
  this.arrivalStyle=value;
  if(this.isHovering)this.hoverRemaining=value==='hover'?Infinity:value==='land'?0:4000+this.random()*4000;
  if(this.isHovering&&this.hoverRemaining>0)this.graph.request('flight');
 }
 hoverHere(){
  if(this.graph.state!=='rest'||this.lessMotion||!this.playing||this.hidden||!this.canDepart())return false;
  this.hoverChoice=true;this.wanted=this.at;this.graph.request('flight');return true;
 }
 get isHovering(){return this.graph.state==='flight'&&Boolean(this.route?.arrived);}
 setWander(value){this.wander=value&&!this.lessMotion;this.dwell=0;if(this.wander)this.chooseNext();}
 chooseNext(){
  if(this.arrivalStyle==='auto'&&this.random()<.28&&this.hoverHere())return;
  const choices=this.points.filter(p=>p.id!==this.at&&p.autonomous!==false);
  if(choices.length)this.request(choices[Math.min(choices.length-1,Math.floor(this.random()*choices.length))].id);
 }
 update(ms){
  if(!Number.isFinite(ms)||ms<0||ms>1000)throw new Error('Invalid rover delta');
  if(!this.playing||this.hidden||this.lessMotion)return;
  // Small fixed substeps make route/animation joins independent of browser frame rate.
  while(ms>0){const dt=Math.min(ms,10);ms-=dt;this.step(dt);}
 }
 completeLanding(){
  this.at=this.route?.id??this.at;this.position={...this.point(this.at)};this.route=null;
  this.graph.reset();this.arrivals++;this.dwell=0;this.wait=7000+this.random()*4000;
 }
 step(dt){
  const before=this.graph.state;
  if(before==='rest'&&this.wanted!==this.at&&this.canDepart())this.graph.request('flight');
  if(!(this.graph.state==='rest'&&this.restHeld))this.graph.advance(dt);
  if(before==='takeoff'&&this.graph.state==='flight'){this.flightCycleTime=5*wingSlotMs;this.beginRoute();}
  if(this.graph.state==='flight'&&this.route){
   this.flightCycleTime+=dt;
   this.route.elapsed=Math.min(this.route.duration,this.route.elapsed+dt);
   const t=smooth(this.route.elapsed/this.route.duration);
   this.position={x:this.route.start.x+(this.route.end.x-this.route.start.x)*t,y:this.route.start.y+(this.route.end.y-this.route.start.y)*t};
   if(t===1){
    if(!this.route.arrived){
     this.route.arrived=true;
     const hover=this.hoverChoice??(this.arrivalStyle==='hover'||(this.arrivalStyle==='auto'&&this.random()<.5));
     this.hoverChoice=null;
     this.hoverRemaining=hover?(this.arrivalStyle==='hover'?Infinity:4500+this.random()*4500):0;
    }
    this.hoverClock+=dt;
    if(this.hoverRemaining>0)this.hoverRemaining=Math.max(0,this.hoverRemaining-dt);
    else if(this.canLand())this.graph.request('rest');
   }
  }
  if(before==='landing'&&this.graph.state==='rest'){
   this.completeLanding();
   if(this.wanted!==this.at&&this.canDepart())this.graph.request('flight');
  }
  if(this.graph.state==='rest'){
   this.dwell+=dt;
   if(this.wander&&this.dwell>=this.wait)this.chooseNext();
  }
 }
 get foot(){
  const t=this.route?this.route.elapsed/this.route.duration:0;
  const arc=this.graph.state==='flight'?Math.sin(Math.PI*t)*14:0;
  const hoverBob=this.isHovering?Math.sin(this.hoverClock/650)*2.5:0;
  return {x:this.position.x,y:this.position.y-this.graph.lift*48-arc-hoverBob};
 }
}
