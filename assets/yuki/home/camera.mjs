// Uniform cover scale: the scene is cropped, never stretched. The camera follows
// the current foot position rather than jumping ahead to a travel destination.
const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
export function gardenCamera(width,height,focus={x:.20,y:.775}){
 const w=Math.max(width,height*1.5),h=w/1.5;
 return {width:w,height:h,left:clamp(width*.5-focus.x*w,width-w,0),top:clamp(height*.72-focus.y*h,height-h,0)};
}
export class GardenCamera{
 constructor(scene){this.scene=scene;this.focus={x:.20,y:.775};this.box=null;this.last=0;}
 update(position,{reduced=false,now=performance.now()}={}){
  const viewport=this.scene.parentElement.getBoundingClientRect(),old=this.scene.getBoundingClientRect();
  if(position&&this.box&&old.width>0&&old.height>0)this.focus={x:(position.x-old.left)/old.width,y:(position.y-old.top-(this.scene.ownerDocument.defaultView?.scrollY??0))/old.height};
  const target=gardenCamera(viewport.width,viewport.height,this.focus),resized=!this.box||target.width!==this.box.width||target.height!==this.box.height;
  const blend=reduced||resized?1:1-Math.exp(-Math.max(0,Math.min(64,now-this.last))/140);
  const next={...target,left:resized?target.left:this.box.left+(target.left-this.box.left)*blend,top:resized?target.top:this.box.top+(target.top-this.box.top)*blend};
  for(const key of ['width','height','left','top'])this.scene.style[key]=next[key]+'px';
  this.box=next;this.last=now;return next;
 }
}
