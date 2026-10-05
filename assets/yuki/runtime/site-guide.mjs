// Only caller-registered page destinations are allowed. No URLs/selectors from AI.
export class SiteGuide {
 constructor(companion,{destinations=[],reveal=()=>{},arrive=()=>{},direction=()=> 'pointLeft'}={}) {
  this.c=companion;this.destinations=new Map(destinations.map(p=>[p.id,p]));
  this.reveal=reveal;this.arrive=arrive;this.direction=direction;this.reset();
 }
 reset(){this.target=null;this.stage='idle';this.pointKind=null;}
 get active(){return this.stage!=='idle';}
 request(id){
  if(!this.destinations.has(id))return false;
  // New clicks queue the latest destination; never interrupt an active gesture.
  this.target=id;this.stage='queued';return true;
 }
 update(){
  if(!this.active)return;
  const c=this.c,r=c.rover;
  if(r.hidden||!r.playing)return;
  if(r.lessMotion){
   this.reveal(this.target);r.request(this.target);
   this.arrive(this.target);this.reset();return;
  }
  if(this.stage==='queued'){
   if(r.graph.state==='flight'){
    this.reveal(this.target);r.request(this.target);this.stage='travel';return;
   }
   if(r.graph.state!=='rest'||r.wanted!==r.at||c.greeting.active||c.greeting.requested||c.emotion.active||c.emotion.requested)return;
   this.reveal(this.target);
   r.request(this.target);this.stage='travel';return;
  }
  if(this.stage==='travel'){
   if(r.isHovering&&r.route.id===this.target&&r.hoverClock>600){
    this.arrive(this.target);this.reset();return;
   }
   if(r.graph.state!=='rest'||r.at!==this.target)return;
   // Land, then present the content inward from its right-hand edge.
   if(c.express(this.direction(this.target)))this.stage='presenting';
   return;
  }
  if(this.stage==='presenting'&&!c.emotion.active&&!c.emotion.requested){
   this.arrive(this.target);this.reset();
  }
 }
}

export function elementPerch(rect,{id,name,width,height,bodyHeight}) {
 const margin=bodyHeight*.9+12;
 return {id,name,autonomous:false,
  x:Math.max(margin,Math.min(width-margin,rect.right-28)),
  y:Math.max(bodyHeight+30,Math.min(height-150,rect.top-3))};
}
