// A call has two real legs: leave the saved spot, then fly across this page.
// The origin page may be unloaded, so only its elapsed journey is simulated.
import {takeoffMs} from '../runtime/timing.mjs';
export function summonTiming(origin,clips,{reduced=false}={}){
 const length=key=>(clips[key]?.frames??[]).reduce((n,f)=>n+(f.durationMs??60),0);
 const sleeping=['sleep','bedtime'].includes(origin.status);
 const airborne=['flight','takeoff','hover','returning'].includes(origin.status);
 const wake=sleeping?length('wake'):0;
 const takeoff=airborne?0:takeoffMs.reduce((n,ms)=>n+ms,0);
 const distance=Number.isFinite(origin.departureDistance)?Math.max(0,origin.departureDistance):500;
 const flight=Math.round(Math.max(4200,Math.min(12000,distance/.18)));
 return reduced?{wake:0,takeoff:0,flight:500,total:500}:{wake,takeoff,flight,total:wake+takeoff+flight+450};
}
export function summonPhase(age,timing){return age<timing.wake?'waking':age<timing.wake+timing.takeoff?'taking-off':'travelling';}
export function callFlightDuration(from,to){return Math.round(Math.max(1800,Math.min(18000,Math.hypot(to.x-from.x,to.y-from.y)/.18)));}
// Stop a flying dragon at the same visible feet position. Keep flapping, not a
// grounded idle pose in mid-air. No changes to any of the approved drawings.
export function catchInFlight(c){
 const r=c.rover;if(r.graph.state==='rest'&&!c.lifecycle?.locked)return false;
 const foot={...r.foot},airborne=r.graph.lift>.02;
 c.lifecycle.neutralize();c.lifecycle.activity();c.idle?.reset();
 if(c.lifecycle.locked)c.lifecycle.wake();
 r.points=[{id:'caught',x:foot.x,y:foot.y+(airborne?48:0)}];r.at=r.wanted='caught';r.position={...r.point('caught')};
 if(airborne){c.lifecycle.enter('awake');r.graph.enter('flight',r.graph.state==='flight'?r.graph.frame:6);r.graph.desired='flight';r.route={id:'caught',start:{...r.position},end:{...r.position},elapsed:1,duration:1,arrived:true};r.arrivalStyle='hover';r.hoverRemaining=Infinity;r.hoverClock=0;}
 else {r.graph.reset();r.route=null;}
 return true;
}
