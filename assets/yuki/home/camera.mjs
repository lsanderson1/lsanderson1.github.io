// Uniform cover scale: the scene is cropped, never stretched. The camera follows
// the current foot position rather than jumping ahead to a travel destination.
const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
export function gardenCamera(width,height,focus={x:.20,y:.775}){
 // Leave a little vertical exploration room even on tall phones; plain cover
 // has zero vertical range there, making the wheel appear broken.
 const w=Math.max(width,height*1.5*1.12),h=w/1.5;
 return {width:w,height:h,left:clamp(width*.5-focus.x*w,width-w,0),top:clamp(height*.72-focus.y*h,height-h,0)};
}
export class GardenCamera{
 constructor(scene){this.scene=scene;this.focus={x:.20,y:.775};this.box=null;this.last=0;this.manual=null;}
 pan(dx,dy){
  if(!this.box)return;
  const v=this.scene.parentElement.getBoundingClientRect(),b=this.manual??this.box;
  this.manual={left:clamp(b.left-dx,v.width-this.box.width,0),top:clamp(b.top-dy,v.height-this.box.height,0)};
 }
 follow(){this.manual=null;}
 revealPoint(point){this.focus={...point};this.follow();this.update(null,{reduced:true});}
 update(position,{reduced=false,now=performance.now()}={}){
  const header=this.scene.ownerDocument.querySelector?.('.fp-nav')?.getBoundingClientRect().height??0;
  if(this.headerHeight!==header){this.scene.parentElement.style?.setProperty('--yg-header-height',header+'px');this.headerHeight=header;}
  const viewport=this.scene.parentElement.getBoundingClientRect(),old=this.scene.getBoundingClientRect();
  if(position&&this.box&&old.width>0&&old.height>0)this.focus={x:(position.x-old.left)/old.width,y:(position.y-old.top-(this.scene.ownerDocument.defaultView?.scrollY??0))/old.height};
  const target=gardenCamera(viewport.width,viewport.height,this.focus),resized=!this.box||target.width!==this.box.width||target.height!==this.box.height;
  if(this.manual){
   if(resized&&this.box){this.manual.left*=target.width/this.box.width;this.manual.top*=target.height/this.box.height;}
   this.manual={left:clamp(this.manual.left,viewport.width-target.width,0),top:clamp(this.manual.top,viewport.height-target.height,0)};
   Object.assign(target,this.manual);
  }
  const blend=reduced||resized?1:1-Math.exp(-Math.max(0,Math.min(64,now-this.last))/140);
  const next={...target,left:resized?target.left:this.box.left+(target.left-this.box.left)*blend,top:resized?target.top:this.box.top+(target.top-this.box.top)*blend};
  for(const key of ['width','height','left','top'])this.scene.style[key]=next[key]+'px';
  this.box=next;this.last=now;
  if(this.scene.dataset)this.scene.dataset.camera=this.manual?'explore':'follow';
  for(const b of this.scene.ownerDocument.querySelectorAll?.('[data-garden-pan]')??[])b.disabled=b.dataset.gardenPan==='left'?next.left>=-.5:next.left<=viewport.width-next.width+.5;
  return next;
 }
}

// Wheel/drag changes only the camera. The runtime remaps Yuki and her entire
// route with the picture, so exploring cannot move her to a different perch.
export function attachGardenExplorer(scene,camera){
 const world=scene.parentElement,doc=scene.ownerDocument;
 const excluded=e=>e.target.closest?.('.yg-controls,.yg-thought,textarea,input,select');
 const wheel=e=>{if(e.ctrlKey||e.metaKey||excluded(e))return;
  const unit=e.deltaMode===1?16:e.deltaMode===2?world.clientHeight:1;
  camera.pan((e.shiftKey?e.deltaY:e.deltaX)*unit,e.shiftKey?0:e.deltaY*unit);e.preventDefault();};
 const key=e=>{if(excluded(e)||e.target.closest?.('button,a,summary'))return;
  const directions={ArrowUp:[0,-90],ArrowDown:[0,90],ArrowLeft:[-90,0],ArrowRight:[90,0],PageUp:[0,-world.clientHeight*.7],PageDown:[0,world.clientHeight*.7]};
  if(directions[e.key]){camera.pan(...directions[e.key]);e.preventDefault();}else if(e.key==='Home'){camera.follow();e.preventDefault();}};
 let drag=null;
 const down=e=>{if(e.pointerType!=='touch'||excluded(e)||e.target.closest?.('button,a,[role="button"]'))return;drag={id:e.pointerId,x:e.clientX,y:e.clientY};world.setPointerCapture?.(e.pointerId);};
 const move=e=>{if(!drag||drag.id!==e.pointerId)return;camera.pan(drag.x-e.clientX,drag.y-e.clientY);drag={id:e.pointerId,x:e.clientX,y:e.clientY};};
 const up=()=>{drag=null;};
 const controls=[...doc.querySelectorAll('[data-garden-pan]')];
 const click=e=>camera.pan(e.currentTarget.dataset.gardenPan==='left'?-180:180,0);
 world.addEventListener('wheel',wheel,{passive:false});world.addEventListener('keydown',key);
 world.addEventListener('pointerdown',down);world.addEventListener('pointermove',move);world.addEventListener('pointerup',up);world.addEventListener('pointercancel',up);
 for(const b of controls)b.addEventListener('click',click);
 return ()=>{world.removeEventListener('wheel',wheel);world.removeEventListener('keydown',key);world.removeEventListener('pointerdown',down);world.removeEventListener('pointermove',move);world.removeEventListener('pointerup',up);world.removeEventListener('pointercancel',up);for(const b of controls)b.removeEventListener('click',click);};
}
