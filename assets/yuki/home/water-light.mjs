// Readable sun glints, not a glow over the whole scene. The caller appends these
// inside its traced water clip so banks, flowers and railings stay untouched.
export function waterGlisten(doc,points){
 const make=(name,attrs={})=>{const node=doc.createElementNS('http://www.w3.org/2000/svg',name);for(const [k,v] of Object.entries(attrs))node.setAttribute(k,String(v));return node;};
 const group=make('g',{'aria-hidden':'true',class:'yg-water-glisten'});
 for(const [x,y,scale=1] of points){
  // Coordinate-seeded timing stays stable across renders, but separate water
  // layers no longer restart the same index-based sparkle sequence together.
  const seed=x*73+y*157,duration=4.8+(seed%431)/100,delay=-((x*47+y*113)%10000)/1000;
  const anchor=make('g',{transform:`translate(${x} ${y}) scale(${scale})`});
  anchor.append(make('path',{class:'yg-water-sparkle',d:'M-9 0 Q-1 -.8 0 -5.5 Q1 -.8 9 0 Q1 .8 0 5.5 Q-1 .8 -9 0Z',style:`--delay:${delay.toFixed(3)}s;--duration:${duration.toFixed(2)}s`}));
  group.append(anchor);
 }
 return group;
}

// Inset windows traced inside the painted water, avoiding islands and banks.
// Distant reflections are smaller, softer and narrower than the nearby pond.
export const gardenWaterSurfaces=[
 {id:'lake-far',opacity:.30,outline:'M463 276 L543 278 L579 282 L617 285 L650 293 L631 299 L600 296 L564 287 L509 284 L465 281Z',points:[[483,279,.28],[542,282,.3],[613,291,.32]]},
 {id:'lake-middle',opacity:.43,outline:'M405 325 L462 326 L510 323 L581 311 L629 302 L647 304 L620 316 L599 323 L574 335 L531 345 L498 354 L459 354 L443 344 L411 339Z',points:[[450,334,.4],[507,334,.42],[572,324,.38],[614,309,.33]]},
 {id:'lake-near',opacity:.58,outline:'M458 367 L493 368 L520 378 L565 384 L610 397 L599 417 L498 417 L481 400 L469 391Z',points:[[487,381,.45],[513,401,.55],[557,395,.5],[579,410,.5]]},
 {id:'pond-stream',opacity:.72,outline:'M47 417 L106 419 L142 425 L126 435 L94 440 L69 433 L30 431Z',points:[[67,425,.55],[109,430,.55]]},
 {id:'pond-fall',opacity:.8,outline:'M94 455 L134 449 Q141 476 143 507 L144 532 L135 550 L108 550 L104 521 L101 491Z',points:[[115,481,.6],[128,523,.65]]},
 {id:'island-upper',opacity:.22,outline:'M543 129 L548 132 L547 152 L545 182 L542 181 L544 151Z',points:[[545,149,.23]]},
 {id:'island-fine',opacity:.24,outline:'M365 239 L370 241 L370 263 L371 291 L367 290 L366 266Z',points:[[368,267,.25]]}
];
export function addGardenWaterSurfaces(doc,svg,defs){
 const make=(name,attrs)=>{const n=doc.createElementNS('http://www.w3.org/2000/svg',name);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,String(v));return n;};
 for(const spec of gardenWaterSurfaces){
  const id=`yg-water-clip-${spec.id}`,clip=make('clipPath',{id,clipPathUnits:'userSpaceOnUse'});
  clip.append(make('path',{d:spec.outline}));defs.append(clip);
  const layer=make('g',{'data-water-surface':spec.id,'aria-hidden':'true','clip-path':`url(#${id})`,opacity:spec.opacity});
  if(spec.id.startsWith('lake-'))for(const [i,[x,y,scale]] of spec.points.entries())layer.append(make('path',{class:'yg-lake-light',d:`M${x-6} ${y+2} q6 -1 ${12+scale*8} 0`,style:`--delay:${-(x+y+i)/37}s`}));
  layer.append(waterGlisten(doc,spec.points));svg.append(layer);
 }
}
