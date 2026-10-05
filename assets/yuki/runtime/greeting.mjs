// Full-character drawings only. The return revisits the raised and halfway
// poses, instead of jumping straight from an outward wave to the lowered paw.
export const greetingOrder=[0,1,2,3,2,3,2,1,4,5];
export const greetingDurations=[120,120,110,190,115,190,105,120,110,160];
export class Greeting {
 constructor({order=greetingOrder,durations=greetingDurations}={}){
  if(!Array.isArray(order)||!Array.isArray(durations)||!order.length||order.length!==durations.length||order.some(f=>!Number.isInteger(f)||f<0)||durations.some(t=>!Number.isFinite(t)||t<=0))throw new Error('Invalid greeting clip');
  this.order=[...order];this.durations=[...durations];this.reset();
 }
 reset(){this.requested=false;this.active=false;this.index=0;this.elapsed=0;}
 request(){if(this.active||this.requested)return false;this.requested=true;return true;}
 update(ms,{ready=false,departing=false}={}){
  if(!Number.isFinite(ms)||ms<0||ms>1000)throw new Error('Invalid greeting delta');
  if(this.requested&&departing)this.requested=false;
  if(this.requested&&ready){this.active=true;this.requested=false;this.index=0;this.elapsed=0;}
  if(!this.active)return false;
  this.elapsed+=ms;
  while(this.elapsed>=this.durations[this.index]){
   this.elapsed-=this.durations[this.index];this.index++;
   if(this.index===this.order.length){this.reset();return true;}
  }
  return false;
 }
 get frame(){return this.active?this.order[this.index]:null;}
}
