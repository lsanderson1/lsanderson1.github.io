// Model JSON can be valid while its text contains a second serialized reply.
// Repair only an unmistakable exact duplicate, never guess which answer is true.
const sameText=(a,b)=>a.replace(/\s+/gu,' ').trim()===b.replace(/\s+/gu,' ').trim();
const envelopeKeys=new Set(['text','emotion','gesture','destination','sourceIds','sources','storyTopics','beats','webQuery']);
export function cleanAssistantText(value){
 if(typeof value!=='string'||!value.trim()||value.length>8000)throw Error('Invalid reply text');
 let text=value.trim();
 // Recover only exact long transcript duplicates with a leaked speaker label.
 // Never remove ordinary quotations, short emphasis or a second distinct answer.
 const parts=text.split(/\*\*(?:ゆき|ユキ|Yuki)\*\*\s*:?[\s]*/iu);
 if(parts.length>1&&parts[0].length>=100&&parts.every(part=>sameText(parts[0],part)))text=parts[0].trim();
 for(let pass=0;pass<3;pass++){
  const json=text.replace(/^```(?:json)?\s*\n([\s\S]*?)\n```$/u,'$1');
  if(json.startsWith('{')){
   let nested;try{nested=JSON.parse(json);}catch{}
   // A bare JSON teaching example with only a "text" key is not an envelope.
   if(nested&&typeof nested.text==='string'&&typeof nested.emotion==='string'&&typeof nested.gesture==='string'){
    if(!Object.keys(nested).every(k=>envelopeKeys.has(k)))throw Error('Unexpected nested reply fields');
    text=nested.text.trim();continue;
   }
   if(/['"]text['"]\s*:/u.test(json)&&/['"](?:emotion|gesture|destination|sourceIds)['"]\s*:/u.test(json))throw Error('Malformed nested reply');
  }
  const fields=/(['"])\s*,\s*(['"])(text|emotion|gesture|destination|sourceIds|storyTopics|beats)\2\s*:\s*/gu;
  // Observed Japanese generation used corner quotes at a broken envelope
  // boundary. Reject that tail; don't erase legitimate quotations or examples.
  const localizedTail=/[」』]\s*(?:[,、]\s*)?[「『'"](?:text|emotion|gesture|destination|sourceIds|storyTopics|beats)(?:['"」』]\s*:|\s*\[\s*\{)/gu;
  for(const match of text.matchAll(localizedTail)){
   const prefix=text.slice(0,match.index).trim();
   if(prefix.length>=40&&/[.!?。！？]$/u.test(prefix)&&!/[{`]/u.test(prefix))throw Error('Reply contains response fields');
  }
  let repaired=false;
  for(const match of text.matchAll(fields)){
   const prefix=text.slice(0,match.index).trim(),tail=text.slice(match.index+match[0].length);
   const quote=tail[0],end=/(['"])\s*(?:[}\]]\s*)*,?\s*$/u.exec(tail);
   if(match[3]==='text'&&['\'','"'].includes(quote)&&end?.[1]===quote&&prefix.length>=40&&sameText(prefix,tail.slice(1,end.index))){text=prefix;repaired=true;break;}
   // Prose followed by dangling response fields is not a reader-facing answer.
   // Leave normal quoted words, JSON examples and code examples alone.
   if(prefix.length>=40&&/[.!?。！？]$/u.test(prefix)&&!/[{`]/u.test(prefix))throw Error('Reply contains response fields');
  }
  if(!repaired){if(!text)throw Error('Empty reply text');return text;}
 }
 throw Error('Nested reply formatting');
}
