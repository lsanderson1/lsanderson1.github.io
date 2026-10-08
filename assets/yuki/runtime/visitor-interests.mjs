// Only explicit topic preferences, never identity, inferred traits or browsing.
export const interestTopics=['animation','game-development','art','yuki-story','making-yuki','japanese'];
const key='yuki-explicit-interests-v1',lifetime=86400000;
const rules=[['animation',/\banimation\b|アニメーション/i],['game-development',/\b(?:game development|unreal|unity)\b|ゲーム(?:制作|開発)/i],['art',/\b(?:art|drawing|illustration)\b|イラスト|絵を描く|絵が/i],['yuki-story',/\b(?:your story|yuki.s story|dragon stories)\b|ゆきの(?:話|物語)/i],['making-yuki',/\b(?:how you were made|making yuki)\b|ゆきの(?:作り方|制作)/i],['japanese',/\bjapanese\b|日本語/i]];
export function cleanInterests(value){return [...new Set(Array.isArray(value)?value:[])].filter(t=>interestTopics.includes(t)).slice(0,6);}
export function explicitInterests(text,current=[]){
 let topics=cleanInterests(current);
 if(typeof text!=='string'||text.length>1000||/password|api.?key|token|secret|パスワード|秘密鍵|@/i.test(text))return topics;
 for(const clause of (text.match(/[^.!?。！？;；\n]+[.!?。！？;；]?/gu)??[]).flatMap(s=>s.split(/\bbut\b|けど|けれど/iu))){
  const negative=/\b(?:i (?:don't|do not|no longer) (?:like|enjoy)|i(?:'m| am) (?:not|no longer) interested in)\b|好き(?:では|じゃ)ない|興味(?:が|は)ない|興味をなくし/i.test(clause);
  const positive=/\bi (?:really |especially )?(?:like|love|enjoy)\b|\bi(?:'m| am) (?:really |especially )?interested in\b|(?:が|は)(?:とても|特に)?好き|に興味がある/i.test(clause);
  if(positive&&!negative&&/\bnot\b|じゃない|ではない/i.test(clause))continue;
  // Questions, quotes and hypotheticals are not assertions of a preference.
  if(/[?？「」“”"]|\b(?:if|would|said|says|not sure)\b/i.test(clause)||(!positive&&!negative))continue;
  for(const [topic,pattern] of rules)if(pattern.test(clause)){topics=topics.filter(t=>t!==topic);if(!negative)topics.push(topic);}
 }
 return cleanInterests(topics);
}
export class VisitorInterests{
 constructor(storage,now=Date.now){this.storage=storage;this.now=now;}
 get(){try{const v=JSON.parse(this.storage?.getItem(key)||'null');if(v&&v.at<=this.now()&&this.now()-v.at<lifetime)return cleanInterests(v.topics);this.storage?.removeItem(key);}catch{}return [];}
 remember(text){const before=this.get(),topics=explicitInterests(text,before);if(JSON.stringify(before)!==JSON.stringify(topics))try{this.storage?.setItem(key,JSON.stringify({at:this.now(),topics}));}catch{}return topics;}
}
