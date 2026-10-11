import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {traceSourceSha256,tracedContours,tracedIslands,tracedTerrain,contourPath} from '../assets/yuki/home/depth-contours.mjs';
import {skyIslands,skyTerrain,skyWater,depthOcclusion} from '../assets/yuki/home/sky-dragons.mjs';
const review=JSON.parse(readFileSync(new URL('../docs/garden-depth-trace.json',import.meta.url)));
function inside(points,x,y){let yes=false;for(let i=0,j=points.length-1;i<points.length;j=i++){const a=points[i],b=points[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])yes=!yes;}return yes;}

test('production masks use all six full-resolution annotations and preserve their provenance',()=>{
 assert.deepEqual(review.size,[1536,1024]);assert.equal(traceSourceSha256,review.sourceSha256);
 assert.equal(Object.keys(tracedContours).length,6);assert.equal(skyIslands,tracedIslands);assert.equal(skyTerrain,tracedTerrain);
 for(const [name,points] of Object.entries(tracedContours)){
  assert.deepEqual(points,review.outlines[name].points);assert(points.length>=15);
  assert(points.every(p=>p.every(Number.isFinite)&&p[0]>=0&&p[0]<=1536&&p[1]>=0&&p[1]<=1024));
  assert(review.outlines[name].maxDistanceToInk<3);
  assert(review.outlines[name].maxInkDistanceToContour<4);
  assert(review.outlines[name].p99InkDistanceToContour<2.5);
  assert.match(contourPath(points),/^M/);
 }
});

test('island edges follow the marked rock/tower silhouette, not broad old hulls',()=>{
 const probes=[['main-island',[400,200],[408,256]],['upper-island',[527,109],[527,161]],['small-island',[603,155],[603,184]],['tiny-island',[550,223],[550,241]]];
 for(const [id,solid,clear] of probes){const p=tracedContours[id];assert.deepEqual(p[0],p.at(-1));assert(inside(p,...solid),id);assert(!inside(p,...clear),id);}
 // Open pen strokes are deliberately closed only off the sky-facing edge.
 assert(inside(tracedContours['left-ridge'],190,400));assert(!inside(tracedContours['left-ridge'],190,175));
 assert(inside(tracedContours.castle,1100,400));assert(!inside(tracedContours.castle,900,50));
 assert(tracedContours.castle.length>600);assert(tracedContours['main-island'].length>400);
});

test('thin castle flags and deep brush-overlap notches survive contour conversion',()=>{
 const probes=[['castle',886,36,true],['castle',892,39,true],['castle',957.5,56,true],
  ['castle',786.5,237,false],['castle',805,237,false],['main-island',434.5,160,false],
  ['upper-island',541.8,61,false]];
 for(const [id,x,y,solid] of probes)assert.equal(inside(tracedContours[id],x,y),solid,`${id} at ${x},${y}`);
});

test('water is excluded from solid masks and inherits its own parent island depth',()=>{
 assert.equal(skyWater.length,3);assert.equal(skyWater[2].island,1);
 assert(inside(tracedContours['main-island'],432,218));assert(!inside(tracedContours['main-island'],432,269));
 assert(!inside(tracedContours['upper-island'],545,175));
 const middle=depthOcclusion(.70),far=depthOcclusion(.99);
 assert(middle.water[0]<1);assert.equal(middle.water[2],1);assert.equal(far.water[2],skyWater[2].transmission);
});

test('the published garden remains unmarked original artwork',()=>{
 const png=readFileSync(new URL('../assets/yuki/home/petal-nook-roost.png',import.meta.url));
 assert.equal(png.readUInt32BE(16),1536);assert.equal(png.readUInt32BE(20),1024);
 assert.notEqual(createHash('sha256').update(png).digest('hex'),review.projectionSha256);
});
