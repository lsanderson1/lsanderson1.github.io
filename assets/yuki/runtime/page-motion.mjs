import {clampFoot} from './clear-space.mjs';

// Screen-space motion keeps a fast wheel/touch scroll from teleporting a
// document-space route offscreen. Scroll starts takeoff immediately, even while
// the speech bubble is open; the last wingbeat flows into landing after settling.
export class PageMotion {
 constructor(companion){this.c=companion;this.serial=0;this.clock=0;this.lastScroll=-Infinity;this.nextRoam=14000;this.prepared=false;this.following=false;}
 scroll(){this.lastScroll=this.clock;this.c.lifecycle?.activity();}
 get scrolling(){return this.clock-this.lastScroll<800;}
 travel(target,{hover=false}={}){
  const r=this.c.rover,id='page-move-'+(++this.serial%2);
  r.points=r.points.filter(p=>!p.id.startsWith('page-move-')||p.id===r.at||p.id===r.wanted);
  const i=r.points.findIndex(p=>p.id===id),point={id,...target,autonomous:false};
  if(i<0)r.points.push(point);else r.points[i]=point;
  r.setArrivalStyle(hover?'hover':'land');r.request(id);
 }
 update(dt,{hidden,paused,guiding,open,roam,target,currentClear=true}){
  this.clock+=dt;const r=this.c.rover;
  if(!this.prepared||hidden||paused||guiding||r.lessMotion)return;
  if(this.scrolling){
   if(!this.following){this.following=true;this.c.lifecycle?.wake();this.travel(target,{hover:true});}
   r.setArrivalStyle('hover');
  }else if(this.following){r.setArrivalStyle('land');if(r.graph.state==='rest'){this.following=false;this.nextRoam=this.clock+14000;}}
  if(this.following)return;
  if(r.graph.state!=='rest'||this.c.lifecycle?.locked||this.c.emotion.active||this.c.emotion.requested)return;
  if(!currentClear&&this.clock>=this.nextAvoid){this.travel(target);this.nextAvoid=this.clock+3000;}
  else if(roam&&!open&&this.clock>=this.nextRoam){this.travel(target);this.nextRoam=this.clock+18000+Math.random()*12000;}
 }
 nextAvoid=0;
}

// Translate the *whole* model/route, never individual dimensions. This also
// protects wing tips during resizing and mobile keyboard changes.
export function containRover(rover,extent,viewport){
 const before=rover.foot,after=clampFoot(before,extent,viewport),dx=after.x-before.x,dy=after.y-before.y;
 if(!dx&&!dy)return;
 rover.position.x+=dx;rover.position.y+=dy;
 if(rover.route){for(const p of [rover.route.start,rover.route.end]){p.x+=dx;p.y+=dy;}}
 for(const p of rover.points)if(p.id===rover.at||p.id===rover.wanted){p.x+=dx;p.y+=dy;}
}
