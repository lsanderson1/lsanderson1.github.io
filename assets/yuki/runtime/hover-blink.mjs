// Independently scheduled, artwork-preserving blink. Use the existing closed-eye
// drawing only at its matching low-wing phase; never blink every wing cycle.
export class HoverBlink {
 constructor(random=Math.random){this.random=random;this.reset();}
 interval(){return 4200+Math.max(0,Math.min(1,this.random()))*3800;}
 reset(){this.remaining=this.interval();this.closed=false;this.lastPhase=-1;this.count=0;}
 update(ms,{eligible,phase}){
  if(!eligible){this.closed=false;this.lastPhase=-1;return;}
  if(this.closed&&phase!==7)this.closed=false;
  this.remaining=Math.max(0,this.remaining-ms);
  if(phase===7&&this.lastPhase!==7&&this.remaining===0){this.closed=true;this.remaining=this.interval();this.count++;}
  this.lastPhase=phase;
 }
}
