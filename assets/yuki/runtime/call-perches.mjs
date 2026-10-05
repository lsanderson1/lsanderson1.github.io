import {atFoot,clampFoot,fits,overlapArea} from './clear-space.mjs';

// Evaluate fresh rendered obstacles on every call, not one fixed home position.
// Calls and occasional independent flights share this history; scrolling never moves her.
export class CallPerches {
 constructor(random=Math.random){this.random=random;this.recent=[];}
 choose(extent,obstacles,viewport,current){
  const {width,height}=viewport;
  const lo=clampFoot({x:-Infinity,y:-Infinity},extent,viewport),hi=clampFoot({x:Infinity,y:Infinity},extent,viewport);
  const axis=(start,end)=>{const values=new Set([start,end]);for(let n=start;n<=end;n+=28)values.add(n);return [...values];};
  const xs=axis(lo.x,hi.x),ys=axis(lo.y,hi.y),candidates=[];
  for(const x of xs)for(const y of ys)candidates.push({x,y});
  let pool=candidates.filter(p=>fits(atFoot(p,extent),obstacles,viewport));
  if(!pool.length){
   // On a packed phone screen, vary only among similarly low-obstruction
   // edges. Never cover more writing merely to create a different flight.
   const edges=candidates.filter(p=>p.x===lo.x||p.x===hi.x).map(p=>({...p,cost:obstacles.reduce((n,r)=>n+overlapArea(atFoot(p,extent),r),0)}));
   const best=Math.min(...edges.map(p=>p.cost));
   pool=edges.filter(p=>p.cost<=best+Math.max(16,best*.02));
  }
  const distance=Math.max(96,(extent.bottom-extent.top)*.75);
  const avoid=[current,...[...this.recent].reverse().map(p=>({x:p.x*width,y:p.y*height}))].filter(Boolean);
  for(const point of avoid){const alternatives=pool.filter(p=>Math.hypot(p.x-point.x,p.y-point.y)>=distance);if(alternatives.length)pool=alternatives;}
  // Uniformly sample the remaining suitable positions: no preferred corner,
  // fixed side, or landing directly underneath her current position.
  const selected=pool[Math.min(pool.length-1,Math.max(0,Math.floor(this.random()*pool.length)))]??lo;
  const point={x:selected.x,y:selected.y};
  this.recent.push({x:point.x/width,y:point.y/height});this.recent=this.recent.slice(-3);
  return point;
 }
}
