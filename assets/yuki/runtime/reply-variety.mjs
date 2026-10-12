import {discoveryKind} from './discovery.mjs?v=2';
import {cleanGuideRecords,guideRecord,previousGuideReplies,cleanGuidePrevious,repeatedGuideReply} from './guide-variety.mjs?v=1';
export {previousGuideReplies} from './guide-variety.mjs?v=1';
export {discoveryKind} from './discovery.mjs?v=2';
// Short-lived, tab-local reply metadata. No user profiling or server storage.
export const storyTopicIds=Object.freeze(['origin','firstFlight','lanternKeeper','firstGuide','treasure','quietEvening','home','dailyGoals','bigDream','innerConflict','littlePreferences','relationships','character']);
const recentLimit=12,sampleSize=32,hex=/^[a-f0-9]{8}$/;
export const cleanFactTopic=value=>typeof value==='string'&&/^(?:(?:wiki-en|museum):[1-9]\d{0,9}|crossref:[a-f0-9]{24})$/.test(value)?value:'';
export function rememberFactTopic(value,topic){const memory=cleanVariety(value),id=cleanFactTopic(topic);if(id)memory.factTopics=[...new Set([...(memory.factTopics??[]),id])].slice(-128);return memory;}
export const cleanJokes=value=>[...new Set((Array.isArray(value)?value:[]).filter(s=>typeof s==='string'&&s.trim().length>=8&&s.length<=1200).map(s=>s.trim()))].slice(-24);
export function rememberJoke(value,text){const memory=cleanVariety(value);if(typeof text==='string')memory.jokes=cleanJokes([...(memory.jokes??[]),text.slice(0,1200)]);return memory;}
export const cleanStoryTopics=value=>Array.isArray(value)?[...new Set(value.filter(id=>storyTopicIds.includes(id)))].slice(0,3):[];
const normalized=text=>text.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
// Similarity fingerprints, not encryption or a security boundary.
function hash(text,seed=2166136261){let n=seed;for(const char of text){n^=char.codePointAt(0);n=Math.imul(n,16777619);}return (n>>>0).toString(16).padStart(8,'0');}
export function replyFingerprint(text){
 const chars=[...normalized(text)],grams=new Set();
 for(let i=0;i+5<=chars.length;i++)grams.add(hash(chars.slice(i,i+5).join('')));
 const plain=chars.join('');
 return {digest:hash(plain)+hash(plain,3335557771),length:chars.length,grams:[...grams].sort().slice(0,sampleSize),opening:[...text.trim().replace(/\s+/g,' ')].slice(0,64).join('')};
}
export function cleanVariety(value){
 const topics={};for(const id of storyTopicIds){const n=value?.topics?.[id];if(Number.isInteger(n)&&n>0)topics[id]=Math.min(n,999);}
 const recent=[];
 for(const item of (Array.isArray(value?.recent)?value.recent:[]).slice(-recentLimit)){
  if(!item||typeof item.digest!=='string'||!/^[a-f0-9]{16}$/.test(item.digest)||!Number.isInteger(item.length)||item.length<0||item.length>3000||!Array.isArray(item.grams))continue;
  recent.push({digest:item.digest,length:item.length,grams:[...new Set(item.grams.filter(g=>typeof g==='string'&&hex.test(g)))].sort().slice(0,sampleSize),opening:typeof item.opening==='string'?[...item.opening.replace(/\s+/g,' ').trim()].slice(0,64).join(''):''});
 }
 const factTopics=[...new Set((Array.isArray(value?.factTopics)?value.factTopics:[]).map(cleanFactTopic).filter(Boolean))].slice(-128);
 const jokes=cleanJokes(value?.jokes);
 const guides=cleanGuideRecords(value?.guides);
 return {turn:Number.isInteger(value?.turn)&&value.turn>0?Math.min(value.turn,9999):0,topics,recent,...(factTopics.length?{factTopics}:{}),...(jokes.length?{jokes}:{}),...(guides.length?{guides}:{})};
}
export function rememberGuideReply(value,text,event,lang){
 const memory=cleanVariety(value),record=guideRecord(text,event,lang);
 if(record)memory.guides=cleanGuideRecords([...(memory.guides??[]),record]);
 return memory;
}
export function rememberReply(value,text,storyTopics=[]){
 const memory=cleanVariety(value);memory.turn=Math.min(9999,memory.turn+1);
 for(const id of cleanStoryTopics(storyTopics))memory.topics[id]=Math.min(999,(memory.topics[id]??0)+1);
 memory.recent=[...memory.recent,replyFingerprint(text)].slice(-recentLimit);return memory;
}
export function replySimilarity(a,b){
 // Names, yes/no answers and other short necessary wording are not penalized.
 if(Math.min(a.length,b.length)<48)return 0;
 if(a.digest===b.digest)return 1;
 if(Math.min(a.length,b.length)/Math.max(a.length,b.length)<.65)return 0;
 const left=new Set(a.grams),right=new Set(b.grams),sample=[...new Set([...left,...right])].sort().slice(0,sampleSize);
 return sample.length?sample.filter(g=>left.has(g)&&right.has(g)).length/sample.length:0;
}
// Short facts and punchlines need a stricter check than a necessary name or
// navigation label. This is lexical detection, not a semantic guarantee.
function sharedPassage(text,previous,discovery){
 const parts=value=>(String(value).match(/[^.!?。！？\n]+[.!?。！？\n]*|[^.!?。！？\n]+$/gu)||[]).map(normalized);
 const before=normalized(previous),after=normalized(text);
 // Recall can be a bounded excerpt of a longer reply. Catch that copied
 // excerpt even when the two full replies have quite different lengths.
 const shorter=before.length<after.length?before:after,longer=before.length<after.length?after:before;
 if(shorter.length>=48&&longer.includes(shorter))return 1;
 for(const part of parts(previous)){
  const minimum=discovery?8:48;
  if(part.length>=minimum&&after.includes(part))return .9;
 }
 return 0;
}
const ideaStop=new Set('a an the i me my we our you your it its is are was were be been has have had did does do with of to for in on at as and but or because that this those these they their can could would will about actually really just little very so now then'.split(' '));
function ideaWords(text){
 const digits={one:'1',two:'2',three:'3',four:'4',five:'5',six:'6',seven:'7',eight:'8',nine:'9',ten:'10'};
 return new Set((String(text).normalize('NFKC').toLowerCase().match(/[a-z0-9]+/g)||[]).filter(w=>!ideaStop.has(w)).map(w=>digits[w]??(w.length>5&&w.endsWith('ses')?w.slice(0,-2):w.length>4&&w.endsWith('s')&&!/(?:us|ss)$/u.test(w)?w.slice(0,-1):w)));
}
function discoveryIdeaScore(text,previous){
 // Compare the setup/claim AND short payoff independently of the long personal
 // aside. Lexical overlap is deliberately not called semantic understanding.
 const parts=value=>String(value).split(/[.!?。！？\n]+/u).map(s=>s.trim()).filter(Boolean);
 for(const a of parts(text))for(const b of parts(previous)){
  const left=ideaWords(a),right=ideaWords(b),shared=[...left].filter(w=>right.has(w)).length;
  const numbers=s=>[...s].filter(w=>/^\d+$/.test(w)).sort().join(',');
  if(shared>=3&&numbers(left)===numbers(right)&&shared/Math.min(left.size,right.size)>=.85&&shared/Math.max(left.size,right.size)>=.5)return .84;
 }
 return 0;
}
function sameJapaneseJokeSetup(text,previous){
 const opening=value=>normalized(String(value).split(/[?？!！。\n]/u)[0]);
 const left=opening(text),right=opening(previous);
 if(!/[\p{Script=Hiragana}\p{Script=Katakana}]/u.test(left+right))return false;
 // Catch a reused riddle premise even when its proposed answer changes. This
 // narrow prefix heuristic is not a test of whether Japanese wordplay is funny.
 let common=0;while(common<Math.min(left.length,right.length)&&left[common]===right[common])common++;
 return common>=7&&common>=Math.min(left.length,right.length)*.3;
}
// A narrow, observed story-template repeat: changing an acorn/stone to a
// blanket/leaf must not pass merely because the nouns differ. This is lexical
// detection of an explicit mix-up, not general semantic joke classification.
export function usesMistakenObjectPlot(text){
 return /\b(?:mistook\b.{0,100}\bfor|mistaken (?:for|it for)|had (?:thought|assumed) .{0,80}\bwas\b)|(?:だ|だった|か)と(?:思って|勘違いして).{0,55}(?:実は|本当は)|(?:実は|本当は).{0,55}(?:見間違|取り違)/iu.test(text);
}
function recurringFrame(text,previous){
 if(normalized(text).length<80)return false;
 // Two prior uses of an identical substantial opening/closing are enough;
 // don't reject a necessary name or a single connective word such as "But".
 const edges=value=>{const sentences=String(value).trim().split(/(?<=[.!?。！？])\s*|\n+/u).filter(Boolean);return [normalized(sentences[0]?.split(/[,，、]/u)[0]??'').slice(0,28),normalized(sentences.at(-1)??'')];};
 const [opening,ending]=edges(text);
 return previous.filter(p=>{const [o,e]=edges(p);return opening.length>=18&&opening===o||ending.length>=18&&ending===e;}).length>=2;
}
export function repetitionScore(text,variety,history=[],memory=[],{discovery=false,joke=false}={}){
 const fingerprint=replyFingerprint(text),recent=cleanVariety(variety).recent;
 const previous=[...new Set([...history.filter(item=>item.role==='assistant').map(item=>item.content),...memory.filter(item=>typeof item?.answer==='string').map(item=>item.answer),...(joke?cleanJokes(variety?.jokes):[])])];
 for(const content of previous)recent.push(replyFingerprint(content));
 const score=recent.reduce((score,item)=>Math.max(score,discovery&&fingerprint.length>=8&&fingerprint.digest===item.digest?1:replySimilarity(fingerprint,item)),0);
 return previous.reduce((score,content)=>Math.max(score,sharedPassage(text,content,discovery),discovery?discoveryIdeaScore(text,content):0,joke&&(sameJapaneseJokeSetup(text,content)||usesMistakenObjectPlot(text)&&usesMistakenObjectPlot(content))?.84:0),Math.max(score,recurringFrame(text,previous)? .82:0));
}
export const repeatThreshold=.8;
export function needsFreshText(text,input){
 if(wantsExactRepeat(input.message))return false;
 if(input.guideEvent&&(Array.isArray(input.guideEvent.previous)||input.variety?.guides)){
  // Route-specific prose is compared separately from fixed click instructions
  // and unrelated chats, which previously caused false repeats and stale facts.
  const local=previousGuideReplies(input.variety,input.guideEvent,input.lang??'en');
  return repeatedGuideReply(text,{...input.guideEvent,previous:cleanGuidePrevious([...(input.guideEvent.previous??[]),...local])});
 }
 const kind=discoveryKind(input.message,input.history),discovery=Boolean(kind);
 return repetitionScore(text,input.variety,input.history??[],input.memory??[],{discovery,joke:kind==='joke'})>=(input.guideEvent?0.75:discovery?0.72:repeatThreshold);
}
export function wantsExactRepeat(text){
 if(/\b(?:don't|do not|stop|avoid)\s+(?:repeat|say that again)|\bnot (?:verbatim|word for word)|繰り返さない|繰り返さず|同じ.*(?:言わない|ではなく)/i.test(text))return false;
 return /\b(?:repeat (?:that|your (?:last )?(?:answer|reply))|verbatim|word for word|say that again)\b|(?:同じ|さっきの|前の)(?:答え|回答|返事|言葉).*(?:そのまま|もう一度|繰り返)|そのまま(?:もう一度|繰り返して)/i.test(text);
}

// Keep the existing 14 KB UTF-8 request ceiling, including Japanese and the
// verification token. Prefer recent real turns; trim metadata before history.
export function packChatRequest(input,limit=14000){
 const body={...input,history:input.history.slice(-6),...(input.memory?{memory:input.memory.map(m=>({...m}))}:{}),variety:cleanVariety(input.variety),...(input.guideEvent?{guideEvent:{...input.guideEvent,previous:cleanGuidePrevious(input.guideEvent.previous)}}:{})};
 // Only the selected route's examples are sent, never the whole guide archive.
 delete body.variety.guides;
 const size=()=>new TextEncoder().encode(JSON.stringify(body)).length;
 while(size()>limit&&body.variety.recent.length>2)body.variety.recent.shift();
 while(size()>limit&&body.variety.jokes?.length>4)body.variety.jokes.shift();
 while(size()>limit&&body.variety.factTopics?.length>16)body.variety.factTopics.shift();
 while(size()>limit&&body.memory?.length)body.memory.shift();
 while(size()>limit&&body.history.length)body.history.shift();
 while(size()>limit&&body.variety.recent.length)body.variety.recent.shift();
 while(size()>limit&&body.variety.jokes?.length)body.variety.jokes.shift();
 while(size()>limit&&body.guideEvent?.previous?.length)body.guideEvent.previous.shift();
 if(size()>limit)throw Error('Message too large');
 return JSON.stringify(body);
}
