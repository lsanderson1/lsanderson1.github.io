// All positions are measured in CSS pixels. The original drawings stay unchanged.
export const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
export function pageLayout(width,height){
 const bodyHeight=width>=700?155:138;
 return {bodyHeight,width,height,readingWidth:width,readingHeight:height,
  home:{x:width-bodyHeight*.72,y:height-24},alternate:{x:bodyHeight*.72,y:height-24}};
}
export function bubblePlacement(foot,{width,height,bodyHeight},bubbleWidth,bubbleHeight,offsetTop=0){
 const pad=10,w=Math.min(bubbleWidth,width-pad*2),h=Math.min(bubbleHeight,height-pad*2);
 const left=clamp(foot.x-w+32,pad,width-w-pad);
 const below=foot.y-bodyHeight-h-12<offsetTop+pad&&foot.y+12+h<=offsetTop+height-pad;
 const top=clamp(below?foot.y+12:foot.y-bodyHeight-h-12,offsetTop+pad,offsetTop+height-h-pad);
 return {left,top,below,tail:clamp(foot.x-left,22,w-22)};
}
export function bubbleHeightLimit(foot,{height,bodyHeight},offsetTop=0){
 // Prefer a scrollable bubble to covering her face at a mid-screen perch.
 // Leave rounding slack: offsetHeight rounds fractional CSS pixels to integers.
 const above=foot.y-bodyHeight-offsetTop-24,below=offsetTop+height-foot.y-24;
 return Math.max(100,Math.min(height-24,Math.max(above,below)));
}
export function pointerTarget(rect,foot){
 // Exact edge of the real element, not an estimated coordinate from a model.
 const x=clamp(foot.x,rect.left,rect.right),y=clamp(foot.y,rect.top,rect.bottom);
 return {x,y,kind:(rect.left+rect.right)/2<foot.x?'pointLeft':'pointRight'};
}
