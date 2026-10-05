export class MotionGraph {
  constructor(clips,{takeoffGroundFrames=3,landingAirFrames=3}={}) {
    for(const name of ['rest','takeoff','flight','landing'])if(!clips[name]?.length||clips[name].some(d=>!Number.isFinite(d)||d<=0))throw new Error('Invalid clip: '+name);
    if(!Number.isInteger(takeoffGroundFrames)||takeoffGroundFrames<1||takeoffGroundFrames>=clips.takeoff.length||!Number.isInteger(landingAirFrames)||landingAirFrames<1||landingAirFrames>=clips.landing.length)throw new Error('Invalid contact phases');
    this.takeoffGroundFrames=takeoffGroundFrames;this.landingAirFrames=landingAirFrames;
    this.clips=clips;this.reset();
  }
  reset(){this.state='rest';this.frame=0;this.elapsed=0;this.desired='rest';this.events=[];}
  request(desired){if(!['rest','flight'].includes(desired))throw new Error('Invalid target');this.desired=desired;this.route();}
  enter(state,frame=0){this.state=state;this.frame=frame;this.elapsed=0;this.events.push(state);}
  route(){
    if(this.state==='rest'&&this.desired==='flight'&&[0,1,2,6,7].includes(this.frame))this.enter('takeoff');
    else if(this.state==='flight'&&this.desired==='rest'&&this.frame===2)this.enter('landing');
  }
  next(){
    const clip=this.clips[this.state];
    if(this.frame+1<clip.length){this.frame++;this.elapsed=0;}
    else if(this.state==='takeoff')this.enter('flight',6);
    else if(this.state==='landing')this.enter('rest');
    else {this.frame=0;this.elapsed=0;}
    this.route();
  }
  advance(ms){
    if(!Number.isFinite(ms)||ms<0||ms>60000)throw new Error('Invalid delta');
    this.events=[];this.route();
    while(ms>0){const remaining=this.clips[this.state][this.frame]-this.elapsed; if(ms<remaining){this.elapsed+=ms;break;} ms-=remaining;this.next();}
  }
  get fraction(){return this.elapsed/this.clips[this.state][this.frame];}
  get transitionTime(){return this.clips[this.state].slice(0,this.frame).reduce((a,b)=>a+b,0)+this.elapsed;}
  get lift(){
    if(this.state==='rest')return 0;if(this.state==='flight')return 1;
    const d=this.clips[this.state];
    const start=this.state==='takeoff'?d.slice(0,this.takeoffGroundFrames).reduce((a,b)=>a+b,0):0;
    const duration=(this.state==='takeoff'?d.slice(this.takeoffGroundFrames):d.slice(0,this.landingAirFrames)).reduce((a,b)=>a+b,0);
    const t=Math.max(0,Math.min(1,(this.transitionTime-start)/duration));
    const eased=t*t*t*(t*(t*6-15)+10);
    return this.state==='takeoff'?eased:1-eased;
  }
}
