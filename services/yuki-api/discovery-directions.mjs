import {cleanVariety} from '../../assets/yuki/runtime/reply-variety.mjs';

// Search directions, NEVER a pool of prewritten facts. The live result set
// supplies the subject and every claim. Past and present both remain eligible.
const fields=Object.freeze([
 ['computing','computing and information technology'],['engineering','engineering and inventions'],
 ['materials','materials and surprising physical properties'],['mathematics','mathematics and patterns'],
 ['space','astronomy and space exploration'],['earth','geology and the changing Earth'],
 ['weather','weather and atmospheric phenomena'],['oceans','ocean science and exploration'],
 ['plants','plants fungi and ecology'],['animals','animal behaviour and adaptations'],
 ['history','world history and everyday life in the past'],['archaeology','archaeology and ancient technology'],
 ['languages','languages writing systems and etymology'],['culture','cultural traditions and their history'],
 ['music','music and musical instruments'],['art','art techniques and art history'],
 ['architecture','architecture and building design'],['food','food science and culinary history'],
 ['transport','transport and navigation inventions'],['crafts','traditional crafts and manufacturing'],
 ['games','games sports and their history'],['maps','maps geography and cartography'],
 ['design','everyday objects and industrial design'],['libraries','books printing and libraries'],
 ['energy','energy and electricity discoveries'],['agriculture','agriculture and domestication'],
 ['chemistry','chemistry in everyday life'],['measurement','timekeeping measurement and scientific instruments']
]);
const angles=Object.freeze(['surprising facts explained','little known discovery explained','unusual invention or technique explained','unexpected connections explained','how it works interesting facts','historical origins and discoveries','remarkable adaptations or innovations']);
const pick=(list,random)=>list[Math.min(list.length-1,Math.max(0,Math.floor(random()*list.length)))];
export function broadFactDirection(input,random){
 const recent=cleanVariety(input.variety).factTopics??[];
 const avoid=new Set(recent.filter(id=>id.startsWith('open-web:')).slice(-12));
 const field=pick(fields.filter(([id])=>!avoid.has('open-web:'+id)),random),angle=pick(angles,random);
 return {id:'open-web:'+field[0],title:field[1],provider:'open-web',exploratory:true,query:`${field[1]} ${angle} educational sources`};
}

export function scopedFactQuery(subject,input,random=()=>crypto.getRandomValues(new Uint32Array(1))[0]/4294967296){
 // Change the angle inside the visitor's chosen field; never turn a scoped
 // astronomy request into an unrelated museum fact. Keep the stored base clean.
 const offset=(cleanVariety(input.variety).turn+Math.floor(random()*angles.length))%angles.length;
 const suffix=' '+angles[offset];
 return subject.length+suffix.length<=180?subject+suffix:subject;
}
