// Short-lived, tab-local reply metadata. No user profiling or server storage.
export const storyTopicIds=Object.freeze(['origin','firstFlight','lanternKeeper','firstGuide','treasure','quietEvening','home','dailyGoals','bigDream','innerConflict','littlePreferences','relationships','character']);
const recentLimit=12,sampleSize=32,hex=/^[a-f0-9]{8}$/;
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
  if(!item||typeof item.digest!=='string'||!/^[a-f0-9]{16}$/.test(item.digest)||!Number.isInteger(item.length)||item.length<0||item.length>1000||!Array.isArray(item.grams))continue;
  recent.push({digest:item.digest,length:item.length,grams:[...new Set(item.grams.filter(g=>typeof g==='string'&&hex.test(g)))].sort().slice(0,sampleSize),opening:typeof item.opening==='string'?[...item.opening.replace(/\s+/g,' ').trim()].slice(0,64).join(''):''});
 }
 return {turn:Number.isInteger(value?.turn)&&value.turn>0?Math.min(value.turn,9999):0,topics,recent};
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
export function repetitionScore(text,variety,history=[]){
 const fingerprint=replyFingerprint(text),recent=cleanVariety(variety).recent;
 for(const item of history)if(item.role==='assistant')recent.push(replyFingerprint(item.content));
 return recent.reduce((score,item)=>Math.max(score,replySimilarity(fingerprint,item)),0);
}
export function wantsExactRepeat(text){
 if(/\b(?:don't|do not|stop|avoid)\s+(?:repeat|say that again)|\bnot (?:verbatim|word for word)|繰り返さない|繰り返さず|同じ.*(?:言わない|ではなく)/i.test(text))return false;
 return /\b(?:repeat (?:that|your (?:last )?(?:answer|reply))|verbatim|word for word|say that again)\b|(?:同じ|さっきの|前の)(?:答え|回答|返事|言葉).*(?:そのまま|もう一度|繰り返)|そのまま(?:もう一度|繰り返して)/i.test(text);
}

// Keep the existing 14 KB UTF-8 request ceiling, including Japanese and the
// verification token. Prefer recent real turns; trim metadata before history.
export function packChatRequest(input,limit=14000){
 const body={...input,history:input.history.slice(-6),variety:cleanVariety(input.variety)};
 const size=()=>new TextEncoder().encode(JSON.stringify(body)).length;
 while(size()>limit&&body.variety.recent.length>2)body.variety.recent.shift();
 while(size()>limit&&body.history.length)body.history.shift();
 while(size()>limit&&body.variety.recent.length)body.variety.recent.shift();
 if(size()>limit)throw Error('Message too large');
 return JSON.stringify(body);
}
