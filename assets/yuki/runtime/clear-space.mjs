export function overlaps(a,b,padding=6){return a.left<b.right+padding&&a.right>b.left-padding&&a.top<b.bottom+padding&&a.bottom>b.top-padding;}
export function fits(rect,obstacles,{width,height},padding=6){
 return rect.left>=8&&rect.top>=8&&rect.right<=width-8&&rect.bottom<=height-8&&!obstacles.some(r=>overlaps(rect,r,padding));
}
export function atFoot(foot,extent){return {left:foot.x+extent.left,right:foot.x+extent.right,top:foot.y+extent.top,bottom:foot.y+extent.bottom};}
export function safeSpot(extent,obstacles,viewport,preferred={x:viewport.width-70,y:viewport.height-24}){
 if(fits(atFoot(preferred,extent),obstacles,viewport))return {...preferred};
 let best=null,score=Infinity;
 const xs=new Set([8-extent.left,viewport.width-8-extent.right]);
 const ys=new Set([8-extent.top,viewport.height-8-extent.bottom]);
 for(let x=8-extent.left;x<=viewport.width-8-extent.right;x+=18)xs.add(x);
 for(let y=viewport.height-8-extent.bottom;y>=8-extent.top;y-=18)ys.add(y);
 for(const x of xs)for(const y of ys){const s=Math.hypot(x-preferred.x,y-preferred.y)+Math.min(x,viewport.width-x)*.3;
  if(s>=score||!fits(atFoot({x,y},extent),obstacles,viewport))continue;score=s;best={x,y};}
 return best;
}

export function clampFoot(foot,extent,{width,height}){
 const limit=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));
 return {x:limit(foot.x,8-extent.left,width-8-extent.right),y:limit(foot.y,8-extent.top,height-8-extent.bottom)};
}
export function overlapArea(a,b){return Math.max(0,Math.min(a.right,b.right)-Math.max(a.left,b.left))*Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top));}
// Visibility takes priority on a full phone screen. Never shrink or hide the
// drawing to force a fit; prefer empty space, then the least obstructive edge.
export function visibleSpot(extent,obstacles,viewport,preferred){
 const clear=safeSpot(extent,obstacles,viewport,preferred);if(clear)return clear;
 let best=clampFoot(preferred,extent,viewport),score=Infinity;
 for(const x of [8-extent.left,viewport.width-8-extent.right]){
  for(let y=8-extent.top;y<=viewport.height-8-extent.bottom;y+=16){
   const p={x,y},box=atFoot(p,extent);
   const cost=obstacles.reduce((n,r)=>n+overlapArea(box,r),0)*12+Math.hypot(x-preferred.x,y-preferred.y);
   if(cost<score){score=cost;best=p;}
  }
 }
 return best;
}

export function guideSpot(rect,extent,obstacles,viewport,bodyHeight){
 const center={x:(rect.left+rect.right)/2,y:(rect.top+rect.bottom)/2};
 const y=clampFoot({x:center.x,y:center.y+bodyHeight*.52},extent,viewport).y;
 let best=null,cost=Infinity;
 // Prefer a genuine side-by-side presentation, not a closer but misleading
 // empty gap underneath the project description.
 for(let x=8-extent.left;x<=viewport.width-8-extent.right;x+=12){
  const p={x,y},box=atFoot(p,extent);
  if(!(box.right<rect.left-10||box.left>rect.right+10)||!fits(box,obstacles,viewport))continue;
  const d=Math.abs(x-center.x);if(d<cost){best=p;cost=d;}
 }
 return best??visibleSpot(extent,obstacles,viewport,{x:rect.right-extent.left+18,y});
}

// Read actual rendered line boxes rather than guessing from section positions.
// Text inside headings, Japanese wrapping, sticky navigation, images and controls
// all become forbidden regions. Decorative background artwork is not content.
export class PageObstacles {
 constructor(doc,root){this.doc=doc;this.root=root;this.dirty=true;this.ranges=[];this.elements=[];
  this.observer=new MutationObserver(records=>{if(records.some(r=>!root.contains(r.target)))this.dirty=true;});
  this.observer.observe(doc.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['hidden','class','style','open']});
 }
 rebuild(){
  this.ranges=[];const walker=this.doc.createTreeWalker(this.doc.body,NodeFilter.SHOW_TEXT);
  while(walker.nextNode()){const node=walker.currentNode,parent=node.parentElement;
   if(!node.textContent.trim()||!parent||this.root.contains(parent)||parent.closest('script,style,noscript,[aria-hidden="true"]'))continue;
   const range=this.doc.createRange();range.selectNodeContents(node);this.ranges.push(range);
  }
  this.elements=[...this.doc.querySelectorAll('a,button,input,textarea,select,img,video,iframe,pre,nav,header,[role="button"]')].filter(el=>!this.root.contains(el)&&!el.closest('[aria-hidden="true"]')&&!el.matches('.yg-backdrop'));
  this.dirty=false;
 }
 read(width,height){
  if(this.dirty)this.rebuild();const result=[];
  const add=r=>{if(r.width>0&&r.height>0&&r.bottom>0&&r.top<height&&r.right>0&&r.left<width)result.push({left:Math.max(0,r.left),top:Math.max(0,r.top),right:Math.min(width,r.right),bottom:Math.min(height,r.bottom)});};
  for(const range of this.ranges)for(const rect of range.getClientRects())add(rect);
  for(const el of this.elements)for(const rect of el.getClientRects())add(rect);
  return result;
 }
}
