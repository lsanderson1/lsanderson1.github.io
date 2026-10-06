import {Rover} from './rover.mjs?flight-refinement=3';
import {Attention} from './attention.mjs';
import {Greeting} from './greeting.mjs';
import {Emotion} from './emotion.mjs';
import {wingIndex,wingPeriod,wingSlotMs} from './flight-playback.mjs';
import {HoverBlink} from './hover-blink.mjs';
import {Lifecycle} from './lifecycle.mjs?v=2';
import {IdleMotion} from './idle-motion.mjs?idle=19';
export class Companion {
 constructor(clips,perches,options={}){
  this.rover=new Rover(clips,perches,options);this.attention=new Attention();this.greeting=new Greeting(options.greeting);
  this.emotion=new Emotion(options.emotions);
  this.rover.hoverBlink=new HoverBlink(options.random);
  this.airClips=options.airClips??{};this.airReaction=null;
  this.lifecycle=options.lifecycle?new Lifecycle(this,options.lifecycle):null;
  this.idle=options.idle?new IdleMotion({random:options.random,...options.idle}):null;
  this.rover.canDepart=()=>!this.lifecycle?.locked&&(!this.idle||this.idle.neutral)&&this.attention.pose===0&&!this.greeting.active&&!this.emotion.active;
  this.rover.canLand=()=>!this.greeting.active&&!this.greeting.requested&&!this.emotion.active&&!this.emotion.requested&&!this.airReaction;
 }
 hoverHere(){
  const r=this.rover;
  if(!this.canReact||this.greeting.active||this.greeting.requested||this.emotion.active||this.emotion.requested)return false;
  if(this.idle&&!this.idle.neutral){this.idle.pendingHover=true;this.attention.request(0);return true;}
  return r.hoverHere();
 }
 look(direction){
  const r=this.rover;
  if(this.lifecycle?.locked||r.graph.state!=='rest'||r.wanted!==r.at||r.lessMotion||r.hidden||!r.playing||this.greeting.active||this.greeting.requested||this.emotion.active||this.emotion.requested)return false;
  this.attention.request(direction);return true;
 }
 // Grounded drawings must never replace tucked legs and flapping wings.
 // Airborne emotions are gated until approved hovering-specific art is ready.
 get canReact(){const r=this.rover;return !this.lifecycle?.locked&&!r.lessMotion&&!r.hidden&&r.playing&&r.graph.state==='rest'&&r.wanted===r.at;}
 canExpress(kind){const r=this.rover;return !this.lifecycle?.locked&&(this.canReact||(!r.lessMotion&&!r.hidden&&r.playing&&r.isHovering&&Object.hasOwn(this.airClips,kind)&&!this.airReaction));}
 greet(){if(!this.canReact||this.emotion.active||this.emotion.requested)return false;const accepted=this.greeting.request();if(accepted&&this.rover.graph.state==='flight')this.rover.graph.request('flight');return accepted;}
 express(kind){
  if(!this.canExpress(kind)||this.greeting.active||this.greeting.requested)return false;
  if(this.rover.isHovering){
   const spec=this.airClips[kind];
   const config=typeof spec==='string'?{key:spec,transitionKey:'hoverTransition',exitAfterSlots:36,exitPhase:0}:spec;
   this.airReaction={...config,kind,elapsed:0,queued:true};this.rover.graph.request('flight');return true;
  }
  return this.emotion.request(kind);
 }
 pointer(x){
  if(this.lifecycle?.locked)return;
  const r=this.rover;
  if(r.graph.state==='rest'&&r.wanted===r.at&&!r.lessMotion&&!r.hidden&&r.playing&&!this.greeting.active&&!this.greeting.requested&&!this.emotion.active&&!this.emotion.requested)this.attention.pointer(x-r.foot.x);
 }
 setLessMotion(value){this.rover.setLessMotion(value);if(value){this.idle?.reset();this.lifecycle?.reducedMotion();this.airReaction=null;this.rover.hoverBlink.reset();this.attention.reset();this.attention.setTracking(false);this.greeting.reset();this.emotion.reset();this.rover.restHeld=false;}}
 update(ms){
  if(!Number.isFinite(ms)||ms<0||ms>1000)throw new Error('Invalid companion delta');
  const r=this.rover,a=this.attention,g=this.greeting,e=this.emotion;
  if(!r.playing||r.hidden||r.lessMotion)return;
  while(ms>0){
   const dt=Math.min(ms,10);ms-=dt;
   if(this.idle){
    const present=!this.lifecycle?.locked&&r.graph.state==='rest'&&a.pose===0&&!g.active&&!e.active;
    const interrupt=r.wanted!==r.at||g.requested||e.requested||(a.target!==0&&a.lease>0)||(a.tracking&&a.pointerAge<1800&&a.candidate!==0)||this.idle.pendingHover||this.lifecycle?.pendingSleep||this.lifecycle?.inactive>=this.lifecycle?.inactivityMs-dt;
    this.idle.update(dt,{present,interrupt});
    if(this.idle.pendingHover&&this.idle.neutral){this.idle.pendingHover=false;r.hoverHere();}
   }
   if(this.lifecycle?.step(dt))continue;
   const before=a.pose,rest=r.graph.state==='rest',air=r.graph.state==='flight',open=[0,1,2,6,7].includes(r.graph.frame);
   if(rest&&!g.active&&!e.active)a.advance(dt,{ready:(open&&(!this.idle||this.idle.neutral))||a.pose!==0,departing:r.wanted!==r.at||g.requested||e.requested});
   else a.reset();
   if(rest&&((before===0&&a.pose!==0)||(before!==0&&a.pose===0)))r.graph.enter('rest',0);
   if(!rest){g.reset();e.reset();}
   const wasGreeting=g.active,wasEmotion=e.active,departing=rest&&r.wanted!==r.at;
   const ready=rest&&open&&a.pose===0&&(!this.idle||this.idle.neutral);
   const finished=g.update(dt,{ready:ready&&!e.active&&!e.requested,departing});
   const emotionFinished=e.update(dt,{ready:ready&&!g.active&&!g.requested,departing});
   if(rest&&((!wasGreeting&&g.active)||finished||(!wasEmotion&&e.active)||emotionFinished))r.graph.enter('rest',0);
   const previous=r.graph.state;
   r.restHeld=a.pose!==0||g.active||e.active||Boolean(this.idle&&!this.idle.neutral);r.update(dt);
   this.lifecycle?.afterMotion(previous);
   const phase=wingIndex(r.flightCycleTime);
   if(this.airReaction){
    if(this.airReaction.queued&&phase===0){
     this.airReaction.queued=false;
     this.airReaction.startedAt=Math.floor(r.flightCycleTime/wingPeriod)*wingPeriod;
    }
    if(!this.airReaction.queued){
     const age=r.flightCycleTime-this.airReaction.startedAt;
     this.airReaction.elapsed=age;
     // Six drawn lead-in poses, a full sustained shrug, then six return poses.
     // Wing phase advances normally throughout; no fade/duplicate silhouettes.
     const exitAt=this.airReaction.exitAfterSlots*wingSlotMs;
     if(age>=exitAt+6*wingSlotMs)this.airReaction=null;
     else this.airReaction.stage=age<6*wingSlotMs?'enter':age>=exitAt?'exit':'hold';
    }
   }
   r.hoverBlink.update(dt,{eligible:r.isHovering&&!g.active&&!e.active&&!this.airReaction,phase});
  }
 }
}
