import {wingIndex,wingSlotMs} from './flight-playback.mjs';
// Select complete drawings, never flip the asymmetric glasses or crossfade faces.
export function flightPose(rover, clips) {
 const graph=rover.graph, route=rover.route;
 const progress=route?Math.min(1,route.elapsed/route.duration):0;
 const dx=route?route.end.x-route.start.x:0;
 const dy=route?route.end.y-route.start.y:0;
 // Mostly vertical travel keeps the approved forward-facing pose throughout,
 // instead of flicking sideways merely because a perch is slightly offset.
 const direction=Math.abs(dx)<Math.max(38,Math.abs(dy)*.65)?'up':dx>0?'right':'left';
 const cruising=route&&progress>=.14&&progress<.82&&direction!=='up';
 const key=cruising?(direction==='right'?'flightRight':'flightLeft'):'flightHover';
 const info=clips[key]??clips.flight;
 let index=wingIndex(rover.flightCycleTime??graph.frame*wingSlotMs)%info.frames.length;
 // Keep the existing blink drawing out of the repeating neutral wingbeat.
 if(key==='flightHover'&&index===7&&!rover.hoverBlink?.closed)index=6;
 return {info,frame:info.frames[index],key,index,kind:cruising?'cruise':'hover',direction,progress};
}
