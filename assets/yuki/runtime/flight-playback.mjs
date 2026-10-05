// Preserve the original expressive downstroke AND upstroke. No mid-flight
// freeze, coast hold, crossfade, mirroring or silhouette interpolation.
export const wingOrder=Array.from({length:12},(_,i)=>i);
export const wingSlotMs=1000/18;
export const wingPeriod=wingOrder.length*wingSlotMs;
export function wingIndex(time){return wingOrder[Math.floor(((time%wingPeriod)+wingPeriod)%wingPeriod/wingSlotMs)];}

// Skull crown-to-chin measurements in registered 700px drawings, excluding
// horns, frills, wings and legs. Measured against each family's first pose.
// Tucking the legs must not enlarge the face to restore standing body height.
export const flightCalibration={
 flightHover:{headHeight:183,crownBelowHorn:33},
 flightLeft:{headHeight:190,crownBelowHorn:49},
 flightRight:{headHeight:174,crownBelowHorn:32},
};
export const restHeadHeight=178;
export const restCrownToFeet=407;
export function airProjection(info,frame,rest,bodyHeight,key){
 const c=flightCalibration[key]??flightCalibration.flightHover;
 const base=bodyHeight/rest.bodyHeight;
 const scale=base*restHeadHeight/c.headHeight;
 const anchor=frame.hornTop+c.crownBelowHorn+base*restCrownToFeet/scale;
 return {scale,anchor};
}
