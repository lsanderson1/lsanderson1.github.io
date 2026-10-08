// Optional model-authored reading beats. They select approved complete clips;
// they never change drawings, synthesize lip-sync, or infer emotion from keywords.
const emotions=['neutral','confused','delighted','thoughtful','surprised','shy','proud','reassuring','amused'];
export function replySentences(text){return typeof text==='string'?text.match(/[^.!?。！？]+(?:[.!?。！？]+|$)/gu)?.map(s=>s.trim()).filter(Boolean)??[]:[];}
export function cleanReplyBeats(value,text){
 if(!Array.isArray(value)||value.length<2||value.length>4||typeof text!=='string')return [];
 const beats=[],sentences=replySentences(text);let previous=-1;
 for(const b of value){
  if(!b||!Number.isInteger(b.sentence)||b.sentence<=previous||b.sentence>=sentences.length||!emotions.includes(b.emotion)||!['none','talkOpen','talkExplain'].includes(b.gesture))return [];
  if(!beats.length&&b.sentence!==0)return [];
  previous=b.sentence;beats.push({sentence:b.sentence,emotion:b.emotion,gesture:b.emotion==='neutral'?(b.gesture==='none'?'talkOpen':b.gesture):'none'});
 }
 return beats;
}
export function beatPause(text){return Math.max(3200,Math.min(12000,[...text].length*(/[\p{Script=Han}\p{Script=Hiragana}]/u.test(text)?110:48)));}
export function expressionSequence(cue,fallback){
 const beats=cleanReplyBeats(cue.beats,cue.text);
 const sentences=replySentences(cue.text);
 return beats.length?beats.map((b,i)=>{const text=sentences.slice(b.sentence,beats[i+1]?.sentence).join(' ');return {...b,text,pauseMs:beatPause(text)};}):fallback;
}
