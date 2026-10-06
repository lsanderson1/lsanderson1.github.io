// Whole drawn poses; no sprite stretching. Optional so older studies are unchanged.
export class Lifecycle {
 constructor(companion,{clips,inactivityMs=90000,crashChance=.02,crashCooldownMs=300000,crashCooldownRemainingMs=0,onCrash=()=>{},startAsleep=true}={}){
  this.c=companion;this.clips=clips;this.inactivityMs=inactivityMs;
  this.crashChance=crashChance;this.crashCooldownMs=crashCooldownMs;
  this.state=startAsleep?'sleep':'awake';this.frame=0;this.elapsed=0;this.age=0;
  this.inactive=0;this.clock=0;this.lastCrash=Math.max(0,Math.min(crashCooldownMs,crashCooldownRemainingMs))-crashCooldownMs;this.onCrash=onCrash;this.pendingSleep=false;this.forceCrash=false;
 }
 get locked(){return this.state!=='awake';}
 activity(){this.inactive=0;this.pendingSleep=false;}
 enter(state){this.state=state;this.frame=0;this.elapsed=0;this.age=0;}
 neutralize(){const c=this.c;c.attention.reset();c.greeting.reset();c.emotion.reset();c.airReaction=null;c.rover.restHeld=false;}
 wake(){
  this.activity();if(this.state!=='sleep'&&this.state!=='bedtime')return false;
  // Finish an interrupted curl before rising; avoids teleporting between poses.
  if(this.state==='bedtime'){this.wakeAfterCurl=true;return true;}
  this.enter(this.c.rover.lessMotion?'awake':'wake');return true;
 }
 requestSleep(){
  if(this.locked)return false;this.pendingSleep=true;this.c.rover.setWander(false);
  if(this.c.rover.isHovering)this.c.rover.hoverRemaining=0;
  return true;
 }
 reducedMotion(){
  if(this.state==='crash')this.c.rover.completeLanding();
  if(this.state==='bedtime')this.enter(this.wakeAfterCurl?'awake':'sleep');
  else if(this.state==='wake'||this.state==='crash')this.enter('awake');
  this.wakeAfterCurl=false;this.forceCrash=false;
 }
 previewCrash(){
  const r=this.c.rover;if(this.locked||r.lessMotion||r.graph.state!=='rest'||r.wanted!==r.at)return false;
  this.neutralize();this.activity();this.forceCrash=true;r.setWander(false);
  const accepted=this.c.hoverHere();if(!accepted)this.forceCrash=false;return accepted;
 }
 afterMotion(previous){
  const r=this.c.rover;
  if(this.forceCrash&&r.isHovering)r.hoverRemaining=0;
  if(previous!=='landing'&&r.graph.state==='landing'){
   const crash=this.forceCrash||(this.clock-this.lastCrash>=this.crashCooldownMs&&r.random()<this.crashChance);
   this.forceCrash=false;
   if(crash){this.lastCrash=this.clock;this.neutralize();this.enter('crash');this.onCrash();}
  }
 }
 step(dt){
  const c=this.c,r=c.rover;this.clock+=dt;
  if(this.state==='sleep'&&r.wanted!==r.at)this.wake();
  if(this.state==='awake'){
   this.inactive+=dt;
   if(this.inactive>=this.inactivityMs)this.requestSleep();
   const safe=r.graph.state==='rest'&&r.wanted===r.at&&!c.greeting.active&&!c.greeting.requested&&!c.emotion.active&&!c.emotion.requested&&c.attention.pose===0&&(!c.idle||c.idle.neutral);
   if(this.pendingSleep&&safe){this.pendingSleep=false;this.neutralize();r.graph.reset();this.enter(r.lessMotion?'sleep':'bedtime');}
  }
  if(!this.locked)return false;
  this.age+=dt;this.elapsed+=dt;
  const frames=this.clips[this.state].frames;
  while(this.elapsed>=frames[this.frame].durationMs){
   this.elapsed-=frames[this.frame].durationMs;this.frame++;
   if(this.frame>=frames.length){
    if(this.state==='sleep')this.frame=0;
    else if(this.state==='bedtime'){const wake=this.wakeAfterCurl;this.wakeAfterCurl=false;this.enter(wake?'wake':'sleep');return true;}
    else{if(this.state==='crash')r.completeLanding();else r.graph.reset();this.enter('awake');this.inactive=0;return true;}
   }
  }
  return true;
 }
 get bubble(){
  if(this.state!=='sleep')return null;
  // 3.6-second breath; same phase as four rising / three falling drawn poses.
  const period=this.clips.sleep.frames.reduce((n,f)=>n+f.durationMs,0);
  const phase=(this.age%period)/period;
  const breath=(1-Math.cos(2*Math.PI*phase))/2;
  return {breath,radius:7+18*breath};
 }
}
