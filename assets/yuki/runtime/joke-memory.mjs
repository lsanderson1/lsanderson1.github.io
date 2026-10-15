import {discoveryKind,isAnotherDiscovery} from './discovery.mjs?v=6';

// Bounded task/novelty data, never instructions, factual evidence or permission.
const shortText=(s,max)=>typeof s==='string'&&s.trim().length>=3&&s.length<=max&&!/[\u0000-\u001f\u007f]|https?:|www\./iu.test(s)?s.trim():'';
export function cleanJokeCore(value){
 const premise=shortText(value?.premise,180),payoff=shortText(value?.payoff,180);
 return premise&&payoff?{premise,payoff}:null;
}
export function cleanJokeContext(value){const request=shortText(value?.request,500);return request?{request}:null;}
export function cleanJokePlan(value){
 const out={};for(const key of ['subject','style','mechanism'])if(typeof value?.[key]==='string'&&/^[a-z][a-z-]{1,39}$/u.test(value[key]))out[key]=value[key];
 return Object.keys(out).length===3?out:null;
}
export function cleanJokeRecords(value){
 return (Array.isArray(value)?value:[]).flatMap(v=>{const core=cleanJokeCore(v?.core),plan=cleanJokePlan(v?.plan);return core||plan?[{...(core?{core}:{}),...(plan?{plan}:{})}]:[];}).slice(-32);
}
const anotherJoke=q=>isAnotherDiscovery(q)||/^(?:(?:can|could|would) you )?(?:(?:tell|give|share) (?:me |us )?)?(?:another|one more|a different|a new) (?:joke|pun|riddle|funny story)(?: please)?[.!?\s]*$|^(?:もう一つ|別の|ほかの|他の)(?:冗談|ジョーク|ダジャレ|笑える話)(?:を)?(?:教えて|聞かせて|お願い)?[。！？\s]*$/iu.test(String(q));
export function jokeRequestContext(input){
 const message=String(input.message??'');
 if(anotherJoke(message)){
  const saved=cleanJokeContext(input.variety?.jokeContext);
  const anchor=(input.history??[]).filter(m=>m.role==='user').findLast(m=>!anotherJoke(m.content));
  // An intervening explanation or a subject change ends implicit joke mode.
  if(anchor&&discoveryKind(anchor.content)!=='joke'&&anchor.content!==saved?.request)return discoveryKind(message)==='joke'?cleanJokeContext({request:message}):null;
  return saved??cleanJokeContext({request:anchor?.content??(discoveryKind(message)==='joke'?message:'')});
 }
 return input.jokeDiscovery||discoveryKind(message)==='joke'?cleanJokeContext({request:message}):null;
}

const stop=new Set('a an the to of for in on at with from and but or because is was were be been it its his her their he she they that this then does did has have had very little joke pun setup payoff makes make gets get says said'.split(' '));
const synonyms={bike:'bicycle',bikes:'bicycle',bicycles:'bicycle',fell:'fall',falls:'fall',falling:'fall',tired:'tired',exhausted:'tired',cannot:'unable',cant:'unable',two:'2',three:'3',four:'4',six:'6',seven:'7',eight:'8',nine:'9',ate:'8'};
const words=s=>new Set((String(s).normalize('NFKC').toLowerCase().match(/[a-z0-9]+|[一-龠々]{2,}|[ァ-ヺー]{2,}/gu)??[]).filter(w=>!stop.has(w)).map(w=>synonyms[w]??(w.length>4&&w.endsWith('s')?w.slice(0,-1):w)));
function overlap(a,b){const x=words(a),y=words(b),n=[...x].filter(w=>y.has(w)).length;return {n,ratio:n/Math.max(1,x.size,y.size),equal:n>=2&&n===x.size&&n===y.size};}
// Meaning summaries help EN/JA continuity and paraphrase comparison.
// They are model-produced hints, not a semantic proof; actual prose is checked too.
export function repeatedJokeCore(core,records){
 const candidate=cleanJokeCore(core);if(!candidate)return false;
 return cleanJokeRecords(records).some(({core:old})=>{
  if(!old)return false;
  const premise=overlap(candidate.premise,old.premise),payoff=overlap(candidate.payoff,old.payoff);
  return payoff.equal&&(payoff.n>=3||premise.n>=1)||payoff.n>=3&&payoff.ratio>=.65&&premise.n>=2&&premise.ratio>=.4;
 });
}
