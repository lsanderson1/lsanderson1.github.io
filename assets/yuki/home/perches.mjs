// Shared illustration-space anchors for placement, persistence and camera focus.
// Lift the contact point 26 illustration pixels onto the cushion, away from
// the front stone rim. The artwork, its proportions and all other perches stay unchanged.
export const roostPerch=Object.freeze({x:.225,y:.765});
export const gardenSpots=Object.freeze({nest:roostPerch,pond:{x:.35,y:.655},lookout:{x:.53,y:.48},books:{x:.745,y:.635},treasures:{x:.67,y:.80}});
export function gardenPoint(id,rect,scroll=0){const p=gardenSpots[id]??gardenSpots.nest;return {x:rect.left+p.x*rect.width,y:rect.top+scroll+p.y*rect.height};}

// Move only a settled legacy nest pose. Never relocate an ongoing flight,
// a visitor-chosen position, or Yuki on another page during this migration.
export function centerLegacyRoost(state){
 const old=p=>p&&[[.20,.775],[.225,.79]].some(([x,y])=>Math.abs(p.x-x)<.00001&&Math.abs(p.y-y)<.00001);
 if(!state.garden||state.page!=='/yuki/'||state.spot!=='nest'||state.transfer||!['sleep','awake','rest'].includes(state.status)||state.pose?.moving||state.pose?.route||!old(state.position))return state;
 const pose=state.pose?{...state.pose}:null;
 if(pose)for(const key of ['position','at','target'])if(old(pose[key]))pose[key]={...roostPerch};
 return {...state,position:{...roostPerch},pose};
}
