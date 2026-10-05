// Every integer is an actual drawing, never a raster rotation or a mirrored face.
export class Attention {
 constructor(){this.pose=0;this.target=0;this.lease=0;this.elapsed=0;this.source='none';this.tracking=false;this.hold=false;this.candidate=0;this.dwell=0;this.pointerAge=Infinity;}
 reset(){this.pose=0;this.clear();}
 clear(){this.target=0;this.lease=0;this.elapsed=0;this.source='none';this.candidate=0;this.dwell=0;this.pointerAge=Infinity;}
 request(direction){
  if(![-1,0,1].includes(direction))throw new Error('Invalid attention direction');
  this.target=direction*3;this.lease=direction?(this.hold?Infinity:3000):1000;this.source='button';this.elapsed=0;this.pointerAge=Infinity;this.candidate=0;this.dwell=0;
 }
 setHold(value){this.hold=Boolean(value);if(this.source==='button'&&this.target!==0&&this.lease>0)this.lease=this.hold?Infinity:3000;}
 setTracking(value){this.tracking=Boolean(value);if(!value&&this.source==='pointer'){this.target=0;this.lease=0;}this.candidate=0;this.dwell=0;this.pointerAge=Infinity;}
 pointer(dx){
  if(!Number.isFinite(dx)||!this.tracking||(this.source==='button'&&this.lease>0))return;
  const a=Math.abs(dx),sign=Math.sign(dx);
  let level=a<70?0:a<145?1:a<235?2:3;
  // 18px of release hysteresis prevents chatter at each threshold.
  const prior=Math.abs(this.candidate),threshold=[0,70,145,235][prior];
  if(sign===Math.sign(this.candidate)&&level<prior&&a>threshold-18)level=prior;
  const next=sign*level;
  if(next!==this.candidate){this.candidate=next;this.dwell=0;}
  this.pointerAge=0;
 }
 advance(ms,{ready=true,departing=false}={}){
  if(!Number.isFinite(ms)||ms<0||ms>1000)throw new Error('Invalid attention delta');
  this.pointerAge+=ms;this.lease=Math.max(0,this.lease-ms);
  if(departing){this.target=0;this.lease=0;this.candidate=0;this.dwell=0;}
  else if(this.tracking&&this.pointerAge<1800&&!(this.source==='button'&&this.lease>0)){
   this.dwell+=ms;
   if(this.dwell>=160){this.target=this.candidate;this.lease=1800-this.pointerAge;this.source='pointer';}
  }
  const goal=ready&&!departing&&this.lease>0?this.target:0;
  if(this.pose===goal){this.elapsed=0;return;}
  this.elapsed+=ms;
  while(this.elapsed>=100&&this.pose!==goal){this.elapsed-=100;this.pose+=Math.sign(goal-this.pose);}
 }
 get direction(){return this.pose<0?'left':this.pose>0?'right':'front';}
 get frame(){return this.pose<0?-this.pose:this.pose>0?this.pose+4:null;}
}
