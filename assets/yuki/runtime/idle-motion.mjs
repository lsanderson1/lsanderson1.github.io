// Readable, restrained idle acting over the approved whole drawings. Independent clocks
// keep breathing, weight shifts and blinking from repeating in lockstep.
export class IdleMotion {
 constructor({random=Math.random}={}){this.random=random;this.time=0;this.level=0;this.blinkAge=null;this.nextBlink=this.interval();this.pendingHover=false;}
 interval(){return 4500+Math.max(0,Math.min(1,this.random()))*3500;}
 reset(){this.time=0;this.level=0;this.blinkAge=null;this.nextBlink=this.interval();this.pendingHover=false;}
 get neutral(){return this.level===0&&this.blinkAge===null;}
 get frame(){return this.blinkAge===null?0:this.blinkAge<70?3:this.blinkAge<165?4:5;}
 get amount(){const t=this.level;return t*t*(3-2*t);}
 update(ms,{present=true,interrupt=false}={}){
  if(!present){if(this.level||this.time||this.blinkAge!==null)this.reset();return;}
  this.level=Math.max(0,Math.min(1,this.level+ms/(interrupt?-260:600)));
  if(this.level>0)this.time+=ms;
  if(this.blinkAge!==null){this.blinkAge+=ms;if(this.blinkAge>=275){this.blinkAge=null;this.nextBlink=this.interval();}}
  else if(!interrupt){this.nextBlink-=ms;if(this.nextBlink<=0)this.blinkAge=0;}
 }
 get pose(){return {amount:this.amount,breath:(1-Math.cos(this.time*2*Math.PI/3800))/2,sway:Math.sin(this.time*2*Math.PI/10400),tail:Math.sin(this.time*2*Math.PI/6200+.35),arm:(1-Math.cos(this.time*2*Math.PI/3800-.4))/2};}
}
