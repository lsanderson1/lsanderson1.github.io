// Bounded, same-tab conversation recall. Never a server-side visitor profile.
export const memoryKey='yuki-conversation-memory-v1';
const lifetime=86400000;
const words=text=>new Set((text.normalize('NFKC').toLowerCase().match(/[a-z0-9]{3,}|[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]{2}/gu)||[]));
export function cleanRecall(value){
 return (Array.isArray(value)?value:[]).filter(v=>v&&typeof v.question==='string'&&typeof v.answer==='string').slice(-4).map(v=>({question:v.question.slice(0,500),answer:v.answer.slice(0,700)}));
}
export class ConversationMemory{
 constructor(storage,language,now=Date.now){Object.assign(this,{storage,language,now});this.reload();}
 reload(){
  this.turns=[];this.at=this.now();
  try{const s=JSON.parse(this.storage?.getItem(memoryKey)||'null');if(s?.at<=this.now()&&this.now()-s.at<lifetime&&Array.isArray(s.turns)){this.turns=s.turns.slice(-40).flatMap(t=>cleanRecall([t]));this.at=s.at;}else this.storage?.removeItem(memoryKey);}catch{}
 }
 remember(question,answer){
  // Do not create long-lived recall of obvious credentials/contact details.
  if(!question||/\b(?:password|api.?key|secret|token|credit.?card)\b|パスワード|秘密鍵|クレジット|[\w.+-]+@[\w.-]+\.[a-z]{2,}/i.test(question))return;
  this.expire();this.at=this.now();this.turns=[...this.turns,...cleanRecall([{question,answer}])].slice(-40);
  try{this.storage?.setItem(memoryKey,JSON.stringify({language:this.language,at:this.now(),turns:this.turns}));}catch{}
 }
 recall(question,history=[]){
  this.expire();
  const query=words(question),recent=new Set(history.map(m=>m.content));
  const available=this.turns.map((t,i)=>({t,i,score:[...words(t.question+' '+t.answer)].filter(w=>query.has(w)).length})).filter(({t})=>!recent.has(t.question)&&!recent.has(t.answer));
  // Include the latest older exchange as continuity, plus relevant older turns.
  const selected=available.sort((a,b)=>b.score-a.score||b.i-a.i).slice(0,3);
  const last=available.reduce((a,b)=>!a||b.i>a.i?b:a,null);if(last&&!selected.includes(last))selected.push(last);
  return selected.sort((a,b)=>a.i-b.i).map(({t})=>({...t}));
 }
 expire(){if(this.now()-this.at>=lifetime||this.at>this.now())this.clear();}
 clear(){this.turns=[];try{this.storage?.removeItem(memoryKey);}catch{}}
}
