// Tiny sun glints, not a glow over the whole scene. The caller appends these
// inside its traced water clip so banks, flowers and railings stay untouched.
export function waterGlisten(doc,points){
 const make=(name,attrs={})=>{const node=doc.createElementNS('http://www.w3.org/2000/svg',name);for(const [k,v] of Object.entries(attrs))node.setAttribute(k,String(v));return node;};
 const group=make('g',{'aria-hidden':'true',class:'yg-water-glisten'});
 for(const [i,[x,y,scale=1]] of points.entries()){
  const anchor=make('g',{transform:`translate(${x} ${y}) scale(${scale})`});
  anchor.append(make('path',{class:'yg-water-sparkle',d:'M-4 0 Q-.5 -.35 0 -2.4 Q.5 -.35 4 0 Q.5 .35 0 2.4 Q-.5 .35 -4 0Z',style:`--delay:${-i*1.73}s;--duration:${6.8+i*.73}s`}));
  group.append(anchor);
 }
 return group;
}
