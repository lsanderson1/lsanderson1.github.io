// One companion location for this visitor's tab, shared by all site pages and
// languages. No chat contents, credentials or cross-visitor/server tracking.
export const locationKey='yuki-location-v1';
export const returnAfterSleepMs=45000;
export function locationPage(path,base=''){
 let p=String(path).split(/[?#]/)[0];if(base&&p.startsWith(base+'/'))p=p.slice(base.length);
 p=p.replace(/^\/ja(?=\/|$)/,'')||'/';return p.endsWith('/index.html')?p.slice(0,-10):p;
}
export function portalSection(page){
 const p=locationPage(page);for(const prefix of ['/yuki/','/essays/','/projects/','/unreal-journey/'])if(p.startsWith(prefix))return prefix;
 return p==='/resume.html'?p:'/';
}
// A doorway names the OTHER end of the journey: enter the destination's tab
// on departure, then emerge from the origin's tab on the receiving page.
export function travelPortalSection(trip,fallbackPage='/'){
 const page=trip?.kind==='returning'?'/yuki/':trip?.kind==='departing'?trip.transfer?.target?.page:trip?.origin?.page??trip?.transfer?.origin?.page;
 return portalSection(page??fallbackPage);
}
const number=(n,max=1e7)=>Number.isFinite(n)&&Math.abs(n)<=max;
const point=p=>p&&number(p.x)&&number(p.y);
const states=['sleep','awake','wake','bedtime','crash','rest','takeoff','flight','landing','hover','returning'];
export class YukiLocation{
 constructor(storage,{now=Date.now,base=''}={}){this.storage=storage;this.now=now;this.base=base;this.reload();}
 reload(){let s;try{s=JSON.parse(this.storage?.getItem(locationKey)||'null');}catch{}
  this.state=s?.version===1&&typeof s.page==='string'&&/^\/(?!\/)[^?#\s]*$/.test(s.page)&&point(s.position)&&states.includes(s.status)&&number(s.updatedAt,Number.MAX_SAFE_INTEGER)&&s.updatedAt<=this.now()+10000?s:{version:1,page:'/yuki/',title:'Yuki’s Garden',garden:true,spot:'nest',position:{x:.20,y:.775},status:'sleep',sleepSince:this.now(),updatedAt:this.now(),pose:null};return this.state;
 }
 here(path){return this.state.page===locationPage(path,this.base);}
 write(change){this.state={...this.state,...change,version:1,updatedAt:this.now()};try{this.storage?.setItem(locationKey,JSON.stringify(this.state));}catch{}return this.state;}
 beginTransfer(target,timing,arrivalMs){
  const origin={...this.state,transfer:null};
  const transfer={origin,target,timing,arrivalMs,startedAt:this.now()};this.write({transfer});return transfer;
 }
 get transfer(){const t=this.state.transfer;return t&&typeof t.origin?.page==='string'&&typeof t.target?.page==='string'&&point(t.origin.position)&&point(t.target.position)&&number(t.startedAt,Number.MAX_SAFE_INTEGER)&&Number.isFinite(t.timing?.total)&&t.timing.total>=0&&t.timing.total<=30000&&Number.isFinite(t.arrivalMs)&&t.arrivalMs>0&&t.arrivalMs<=30000?t:null;}
 transit(){
  const t=this.transfer;if(!t)return null;const age=Math.max(0,this.now()-t.startedAt),departing=age<t.timing.total;
  const page=departing?t.origin:t.target;
  if(age>=t.timing.total+t.arrivalMs){this.write({...t.target,status:'rest',pose:null,sleepSince:null,transfer:null});return null;}
  if(this.state.page!==page.page)this.write({...page,status:departing?t.origin.status:'flight',pose:null,sleepSince:null,transfer:t});
  return {transfer:t,leg:departing?'departing':'incoming',age:departing?age:age-t.timing.total};
 }
 cancelTransfer(){this.write({transfer:null});}
 record({page,title,garden,spot,position,status,pose,departureDistance}){const same=this.here(page);return this.write({page:locationPage(page,this.base),title:String(title||'').slice(0,120),garden:Boolean(garden),spot:spot??null,position,status,pose,departureDistance:number(departureDistance)?departureDistance:null,sleepSince:status==='sleep'?(same&&this.state.status==='sleep'?this.state.sleepSince:this.now()):null});}
 home(){return this.write({page:'/yuki/',title:'Yuki’s Garden',garden:true,spot:'nest',position:{x:.20,y:.775},status:'sleep',sleepSince:this.now(),pose:null,departureDistance:null,transfer:null});}
 // An unloaded page has no animation loop. Resolve an overdue off-page nap
 // when another page checks her location, rather than pretending it rendered.
 settleAway(path){const s=this.state;if(this.here(path)||s.garden||s.pose?.playing===false||s.pose?.hidden)return s;
  if(this.transfer){this.transit();return this.state;}
  if(s.status==='returning'&&this.now()-s.updatedAt>=Math.max(1000,(s.pose?.route?.duration??5000)-(s.pose?.route?.elapsed??0))){this.home();return this.state;}
  if(['rest','awake'].includes(s.status)){const asleepAt=s.updatedAt+Math.max(0,90000-(s.pose?.life?.inactive??0));if(this.now()>=asleepAt)this.write({status:'sleep',sleepSince:asleepAt,pose:null});}
  if(this.state.status==='sleep'&&this.now()-(this.state.sleepSince??this.now())>=returnAfterSleepMs)this.home();return this.state;
 }
 get shouldReturn(){return !this.state.garden&&this.state.status==='sleep'&&this.now()-(this.state.sleepSince??this.now())>=returnAfterSleepMs;}
}
const clock=g=>({active:Boolean(g?.active),requested:Boolean(g?.requested),index:g?.index??0,elapsed:g?.elapsed??0});
export function capturePose(c,map=p=>({...p})){
 const r=c.rover,l=c.lifecycle;
 return {position:map(r.position),at:map(r.point(r.at)),target:map(r.point(r.wanted)),moving:r.wanted!==r.at,playing:r.playing,hidden:r.hidden,
  graph:{state:r.graph.state,frame:r.graph.frame,elapsed:r.graph.elapsed,desired:r.graph.desired},
  route:r.route?{start:map(r.route.start),end:map(r.route.end),elapsed:r.route.elapsed,duration:r.route.duration,arrived:r.route.arrived}:null,targetDuration:r.point(r.wanted).routeDuration,
  flightCycleTime:r.flightCycleTime,hoverRemaining:Number.isFinite(r.hoverRemaining)?r.hoverRemaining:-1,hoverClock:r.hoverClock,arrivalStyle:r.arrivalStyle,
  life:{state:l.state,frame:l.frame,elapsed:l.elapsed,age:l.age,inactive:l.inactive},greeting:clock(c.greeting),
  emotion:c.emotion.kind?{kind:c.emotion.kind,...clock(c.emotion.clip)}:null,
  attention:{pose:c.attention.pose,target:c.attention.target,lease:Number.isFinite(c.attention.lease)?c.attention.lease:3000,elapsed:c.attention.elapsed},
  airReaction:c.airReaction?{...c.airReaction}:null,
  idle:c.idle?{time:c.idle.time,level:c.idle.level,blinkAge:c.idle.blinkAge,nextBlink:c.idle.nextBlink}:null};
}
export function poseArtwork(p,clips){return [...new Set(['rest','sleep','wake','bedtime','crash','takeoff','landing','flight','flightHover','flightLeft','flightRight','attention',...(p?.greeting?.active?['greeting']:[]),...[p?.emotion?.kind,p?.airReaction?.key,p?.airReaction?.transitionKey].filter(k=>typeof k==='string'&&Object.hasOwn(clips,k))])];}
export function restorePose(c,p,clips,unmap=p=>({...p})){
 if(!p||!point(p.position)||!point(p.at)||!point(p.target)||!['rest','takeoff','flight','landing'].includes(p.graph?.state)||!['sleep','awake','wake','bedtime','crash'].includes(p.life?.state))return false;
 const r=c.rover,l=c.lifecycle;
 const bounded=(v,max,fallback=0)=>number(v)&&v>=0?Math.min(max,v):fallback;
 const frame=(v,length)=>Number.isInteger(v)?Math.max(0,Math.min(length-1,v)):0;
 r.position=unmap(p.position);r.points=[{id:'memory-at',...unmap(p.at)},{id:'memory-target',...unmap(p.target),routeDuration:bounded(p.targetDuration,18000)||undefined}];r.at='memory-at';r.wanted=p.moving?'memory-target':'memory-at';
 r.graph.enter(p.graph.state,frame(p.graph.frame,r.graph.clips[p.graph.state].length));r.graph.elapsed=bounded(p.graph.elapsed,r.graph.clips[r.graph.state][r.graph.frame]-1);r.graph.desired=p.graph.desired==='flight'?'flight':'rest';
 r.route=p.route&&point(p.route.start)&&point(p.route.end)?{id:'memory-target',start:unmap(p.route.start),end:unmap(p.route.end),duration:Math.max(1,bounded(p.route.duration,18000,1000)),elapsed:bounded(p.route.elapsed,18000),arrived:Boolean(p.route.arrived)}:null;
 if(r.route){r.wanted='memory-target';r.route.elapsed=Math.min(r.route.elapsed,r.route.duration);}else if(r.graph.state!=='rest'&&r.graph.state!=='takeoff')r.graph.reset();
 r.flightCycleTime=bounded(p.flightCycleTime,1e7);r.hoverRemaining=p.hoverRemaining===-1?Infinity:bounded(p.hoverRemaining,60000);r.hoverClock=bounded(p.hoverClock,1e7);r.arrivalStyle=['land','auto','hover'].includes(p.arrivalStyle)?p.arrivalStyle:'land';
 l.enter(p.life.state);l.frame=frame(p.life.frame,clips[l.state]?.frames.length??1);l.elapsed=bounded(p.life.elapsed,clips[l.state]?.frames[l.frame]?.durationMs-1||0);l.age=bounded(p.life.age,1e7);l.inactive=bounded(p.life.inactive,90000);
 const restoreClock=(g,s)=>{if(!s)return;g.active=Boolean(s.active);g.requested=Boolean(s.requested);g.index=frame(s.index,g.order.length);g.elapsed=bounded(s.elapsed,g.durations[g.index]-1);};
 restoreClock(c.greeting,p.greeting);if(p.emotion&&Object.hasOwn(c.emotion.clips,p.emotion.kind)){c.emotion.request(p.emotion.kind);restoreClock(c.emotion.clip,p.emotion);}
 if(p.attention){c.attention.pose=Math.round(Math.max(-3,Math.min(3,number(p.attention.pose)?p.attention.pose:0)));c.attention.target=Math.round(Math.max(-3,Math.min(3,number(p.attention.target)?p.attention.target:0)));c.attention.lease=bounded(p.attention.lease,3000);c.attention.elapsed=bounded(p.attention.elapsed,99);}
 const a=p.airReaction,spec=c.airClips[a?.kind];if(a&&spec&&typeof spec==='object'&&a.key===spec.key&&Object.hasOwn(clips,a.key)){c.airReaction={...spec,kind:a.kind,queued:Boolean(a.queued),startedAt:bounded(a.startedAt,1e7),elapsed:bounded(a.elapsed,1e7),stage:['enter','hold','exit'].includes(a.stage)?a.stage:'enter'};}
 if(c.idle&&p.idle){c.idle.time=bounded(p.idle.time,1e7);c.idle.level=bounded(p.idle.level,1);c.idle.blinkAge=p.idle.blinkAge===null?null:bounded(p.idle.blinkAge,274);c.idle.nextBlink=bounded(p.idle.nextBlink,8000);}
 return true;
}
export function locationLabel(s,ja=false){
 const places={nest:['Leaf Nest','葉っぱの巣'],pond:['Lily Pond','スイレンの池'],lookout:['Sky Lookout','空の見晴らし台'],books:['Reading Nook','読書のコーナー'],treasures:['Little Treasures','小さな宝物']};
 const place=s.garden?(places[s.spot]?.[ja?1:0]??(ja?'ゆきの庭':'Yuki’s Garden')):s.title||s.page;
 return s.status==='sleep'?(ja?`${place}でお昼寝中`:`Sleeping in ${place}`):s.status==='returning'?(ja?'巣へ帰るところ':'Returning to Her Nest'):(ja?`${place}にいるよ`:`Currently at ${place}`);
}
