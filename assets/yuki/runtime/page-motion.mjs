import {clampFoot} from './clear-space.mjs';

// Feet and routes live in document coordinates. Scrolling changes only their
// projection, never requests flight. A visitor can explicitly call her back.
export class PageMotion {
 constructor(companion,{random=Math.random}={}){this.c=companion;this.random=random;this.serial=0;this.clock=0;this.lastScroll=-Infinity;this.prepared=false;this.defer();}
 defer(){this.nextRoam=this.clock+75000+this.random()*45000;}
 scroll(){this.lastScroll=this.clock;this.defer();}
 get scrolling(){return this.clock-this.lastScroll<4000;}
 travel(target,{arrival='land',duration}={}){
  const r=this.c.rover,id='page-move-'+(++this.serial%2);
  r.points=r.points.filter(p=>!p.id.startsWith('page-move-')||p.id===r.at||p.id===r.wanted);
  const i=r.points.findIndex(p=>p.id===id),point={id,...target,autonomous:false,routeDuration:Number.isFinite(duration)?Math.max(1000,Math.min(18000,duration)):undefined};
  if(i<0)r.points.push(point);else r.points[i]=point;
  r.setArrivalStyle(arrival);r.request(id);this.defer();
 }
 update(dt,{hidden,paused,guiding,open,roam,target,visible=true,reacting=false}){
  this.clock+=dt;const r=this.c.rover;
  if(!this.prepared||hidden||paused||guiding||open||!visible||!roam||reacting||this.scrolling||r.lessMotion)return;
  if(r.graph.state!=='rest'||r.wanted!==r.at||this.c.lifecycle?.locked||this.c.greeting.active||this.c.greeting.requested||this.c.emotion.active||this.c.emotion.requested)return;
  if(this.clock>=this.nextRoam){
   const destination=typeof target==='function'?target():target;
   if(destination&&Math.hypot(r.foot.x-destination.x,r.foot.y-destination.y)>80)this.travel(destination,{arrival:'auto'});
   else this.defer();
  }
 }
}

export function pageProjection(p,scrollY){return {...p,y:p.y-scrollY,foot:{x:p.foot.x,y:p.foot.y-scrollY}};}
export function inViewport(box,{width,height}){return box.bottom>0&&box.top<height&&box.right>0&&box.left<width;}
export function translateRover(rover,dx,dy){
 rover.position.x+=dx;rover.position.y+=dy;
 if(rover.route)for(const p of [rover.route.start,rover.route.end]){p.x+=dx;p.y+=dy;}
 for(const p of rover.points)if(p.id===rover.at||p.id===rover.wanted){p.x+=dx;p.y+=dy;}
}
// A distant, fully offscreen dragon enters from just beyond the nearest edge.
// Never relocate a drawing that the visitor can currently see.
export function prepareCall(rover,extent,viewport,scrollY){
 const f=rover.foot,y=f.y-scrollY;
 if(y+extent.bottom<0)translateRover(rover,0,scrollY-extent.bottom-24-f.y);
 else if(y+extent.top>viewport.height)translateRover(rover,0,scrollY+viewport.height-extent.top+24-f.y);
}
export function containPageRover(rover,extent,viewport){
 const f=rover.foot,x=clampFoot(f,extent,viewport).x;
 translateRover(rover,x-f.x,0);
}
