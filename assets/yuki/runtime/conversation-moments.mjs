// Small local asides, not AI replies or conversation/memory entries.
// Paired wording keeps the same intent in English and Japanese without a call.
export const momentLines={
 clear:[
  ['All tidy! If you need a little paw, I’m right here.','チャットを片づけたよ！お手伝いがほしくなったら、いつでも呼んでね。'],
  ['Fresh chat, same little dragon. Need help with anything else?','チャットはすっきり！小さな案内役はそのまま。ほかにも手伝えることはある？'],
  ['Chat tucked away! Give me a nudge whenever you need a hand.','チャットのお片づけ、完了！手伝ってほしくなったら、ちょんと呼んでね。'],
  ['There we go! I’m still here if you want to explore or chat.','片づけ完了！作品を見に行くのも、おしゃべりするのも大歓迎。']
 ],
 refresh:[
  ['Back already? Little wings at the ready!','おかえり！小さな羽も準備ばっちり。'],
  ['There you are! Ready for another little look around?','おかえり！またちょこっと見て回る？'],
  ['Page refreshed, glasses straightened. What caught your eye?','ページもめがねも、すっきり！何か気になるものはあった？'],
  ['Hello again! Shall we pick up where we left off?','また会えた！さっきの続きからお話ししよっか。']
 ],
 leave:[
  ['Off on another little adventure? Take care!','次の小さな冒険へ出発かな？いってらっしゃい！'],
  ['See you around! My little wings and I will be here.','またね！小さな羽を休めながら、ここにいるよ。'],
  ['Happy exploring! Come say hi whenever you like.','探検、楽しんできて！また気が向いたら遊びに来てね。'],
  ['A tiny wave for the road. See you next time!','小さなおててで、いってらっしゃい！また会おうね。']
 ]
};
const key='yuki-moments-v1';
export class ConversationMoments{
 constructor(storage,random=Math.random){this.storage=storage;this.random=random;this.last={};try{const saved=JSON.parse(storage?.getItem(key));for(const kind of Object.keys(momentLines))if(Number.isInteger(saved?.[kind])&&saved[kind]>=0&&saved[kind]<momentLines[kind].length)this.last[kind]=saved[kind];}catch{}}
 next(kind,lang='en'){
  if(!Object.hasOwn(momentLines,kind))return '';const lines=momentLines[kind];
  const candidates=lines.map((_,i)=>i).filter(i=>i!==this.last[kind]),roll=Number(this.random());
  const index=candidates[Math.min(candidates.length-1,Math.max(0,Math.floor((Number.isFinite(roll)?roll:0)*candidates.length)))];
  this.last[kind]=index;try{this.storage?.setItem(key,JSON.stringify(this.last));}catch{}
  return lines[index][lang==='ja'?1:0];
 }
}
export function shouldWelcomeOnRefresh(type,saved={},guiding=false){return type==='reload'&&!saved.hidden&&!guiding&&(saved.awake===true||saved.messages?.length>0);}
export function isLeavingLink(href,currentURL,event={}){
 if(event.defaultPrevented||event.download||event.button>0||event.altKey||event.ctrlKey||event.metaKey||event.shiftKey)return false;
 try{const from=new URL(currentURL),to=new URL(href,from);return ['http:','https:'].includes(to.protocol)&&to.origin!==from.origin;}catch{return false;}
}
