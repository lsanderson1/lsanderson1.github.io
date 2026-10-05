import {flightPose} from './flight.mjs?flight-refinement=3';
import {airProjection,wingIndex} from './flight-playback.mjs';
// Shared by the browser and deterministic playback review. No sprite deformation.
export function projectFrame(companion,clips,bodyHeight){
 const life=companion.lifecycle;
 if(life?.locked){
  const info=clips[life.state],frame=info.frames[life.frame],scale=bodyHeight/444;
  const r=companion.rover,foot={...r.position};
  // Accelerating fall to belly contact; drawings provide the squash/rebound.
  if(life.state==='crash')foot.y-=48*Math.max(0,1-(life.age/305)**2);
  const anchor=615;
  return {info,frame,scale,foot,anchor,x:foot.x-info.width*scale/2,y:foot.y-anchor*scale,lifecycle:life.state};
 }
 const {rover,attention:a,greeting:g,emotion:e}=companion,{graph}=rover,state=graph.state;
 const reactingState=state==='rest';
 const isGreeting=reactingState&&g.active,isEmotion=reactingState&&Boolean(e?.active),isAttention=state==='rest'&&a.pose!==0;
 let info=clips[state],frame=info.frames[graph.frame],flight=null;
 if(state==='flight'){flight=flightPose(rover,clips);info=flight.info;frame=flight.frame;}
 const airReaction=state==='flight'&&companion.airReaction&&!companion.airReaction.queued?companion.airReaction:null;
 if(airReaction){
  const phase=wingIndex(rover.flightCycleTime);
  const bridge=clips[airReaction.transitionKey??'hoverTransition'];
  const transition=bridge&&airReaction.stage!=='hold';
  info=transition?bridge:clips[airReaction.key];
  const bridgePhase=airReaction.stage==='exit'?(phase-(airReaction.exitPhase??0)+12)%12:phase;
  frame=info.frames[transition?(airReaction.stage==='exit'?6:0)+Math.min(5,bridgePhase):phase];
  flight={...flight,kind:'hover-reaction'};
 }
 if(isEmotion){const clip=clips[e.kind];info=(e.frame===0||e.frame===clip.frames.length-1)?clips.rest:clip;frame=info.frames[info===clips.rest?0:e.frame];}
 else if(isGreeting){info=(g.frame===0||g.frame===clips.greeting.frames.length-1)?clips.rest:clips.greeting;frame=info.frames[info===clips.rest?0:g.frame];}
 else if(isAttention){info=clips.attention;frame=info.frames[a.frame];}
 else if(state==='rest'&&companion.idle){info=clips.rest;frame=info.frames[companion.idle.frame];}
 else if((state==='takeoff'&&graph.frame===0)||(state==='landing'&&graph.frame===clips.landing.frames.length-1)){info=clips.rest;frame=info.frames[0];}
 else if(state==='takeoff'&&graph.frame===clips.takeoff.frames.length-1){info=clips.flightHover??clips.flight;frame=info.frames[6];}
 else if(state==='landing'&&graph.frame===0){info=clips.flightHover??clips.flight;frame=info.frames[2];}
 const isAirFamily=[clips.flight,clips.flightHover,clips.flightLeft,clips.flightRight].includes(info);
 let scale=isAttention||isGreeting||isEmotion||isAirFamily?bodyHeight/info.bodyHeight:bodyHeight/clips.rest.bodyHeight*clips.rest.hornSpan/info.hornSpan;
 const foot=rover.foot;let anchor=info.bodyBottom;
 if(isAirFamily){
  const key=info===clips.flightLeft?'flightLeft':info===clips.flightRight?'flightRight':'flightHover';
  ({scale,anchor}=airProjection(info,frame,clips.rest,bodyHeight,key));
 }
 if(airReaction){
  const hover=clips.flightHover??clips.flight;
  const base=airProjection(hover,hover.frames[wingIndex(rover.flightCycleTime)],clips.rest,bodyHeight,'flightHover');
  // Same source-cell size: undo only each sheet's extraction scale. Tilted
  // horns must not shrink the body or drag it sideways/upward during a shrug.
  // New expression sheets need not use the old source-cell pixel size.
  // Match whole-character height; exact neutral bookends carry their own
  // height so a different source sheet cannot make her shrink at either join.
  const ratio=info.presentationRegistration==='body-height'
   ?(frame.presentationBodyHeight??info.bodyHeight)/hover.bodyHeight
   :info.sourceScale/1.7044145873320538;
  scale=base.scale/ratio;anchor=info.bodyBottom+(base.anchor-hover.bodyBottom)*ratio;
 }
 if(state==='flight'&&(isGreeting||isEmotion))flight={...flight,kind:'air-reaction'};
 if(![clips.flight,clips.flightHover].includes(info)&&((state==='takeoff'&&graph.frame>=graph.takeoffGroundFrames)||(state==='landing'&&graph.frame<graph.landingAirFrames))){
  const hover=clips.flightHover??clips.flight;
  const airAnchor=frame.hornTop+hover.bodyHeight/hover.hornSpan*info.hornSpan;
  const q=graph.fraction*graph.fraction*(3-2*graph.fraction);
  const weight=state==='landing'&&graph.frame===graph.landingAirFrames-1?1-q:state==='takeoff'&&graph.frame===graph.takeoffGroundFrames?q:1;
  anchor+=(airAnchor-anchor)*weight;
 }
 return {info,frame,scale,foot,anchor,x:foot.x-info.width*scale/2,y:foot.y-anchor*scale,isGreeting,isAttention,isEmotion,flight,airReaction};
}
