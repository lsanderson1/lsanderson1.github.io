// Resolve a short follow-up from actual recent visitor turns, never from the
// currently visible garden, a guessed topic, or a model's old biography.
function explicitKind(message){
 const q=String(message??'');
 if(/\b(?:jokes?|puns?|riddles?)\b|\b(?:funny|playful|silly|amusing|lighthearted)(?: little| short)? stor(?:y|ies)\b|冗談|ジョーク|なぞなぞ|ダジャレ|笑える(?:小)?話|楽しい小話/iu.test(q))return 'joke';
 if(/\b(?:facts?|trivia)\b|豆知識|雑学/iu.test(q))return 'fact';
 return '';
}
export function isAnotherDiscovery(message){
 const q=String(message??'').trim().replace(/[’]/gu,"'").replace(/\b1\b/gu,'one').replace(/^(?:that(?:'s| is) (?:cool|interesting|funny|neat)|nice|haha|面白い|おもしろい|なるほど)[,.!。！、\s]+/iu,'');
 return /^(?:(?:ok(?:ay)?|yes|sure|please|yeah|well|and)[,!.\s]*)?(?:(?:can|could|would) you )?(?:(?:tell|give|show) me |(?:i(?:'d| would) like|let(?:'s| us) hear|do you have|have you got|got|how about|can i hear) )?(?:another(?: one)?|a different one|something (?:else|different|new)|one more|any (?:more|others))(?:[,!.?\s]*(?:please|instead|this time))?[!.?\s]*$|^(?:じゃあ|それなら|うん|ほかにも|他にも)?(?:もう(?:一|ひと)つ|もう一個|別の(?:もの|話|やつ)|ほかの(?:もの|話)|他の(?:もの|話))(?:を)?(?:聞かせて|教えて|お願い|ある|あるかな|は)?[。！？?\s]*$/iu.test(q);
}
export function discoveryKind(message,history=[]){
 if(/\b(?:what is (?:a |the )?(?:fact|joke)|why (?:is|was) (?:that|it|the joke) funny|explain (?:that|the) (?:joke|fact)|is (?:that|this) (?:fact )?true|how do you know)\b|(?:その|さっきの)(?:冗談|ジョーク|豆知識).*(?:意味|なぜ|どうして|説明)|それ(?:は|って)?本当/iu.test(String(message??'')))return '';
 const direct=explicitKind(message);if(direct)return direct;
 // "Why?" and "Tell me more about that" ask for explanation, not a new fact.
 if(!isAnotherDiscovery(message))return '';
 for(const turn of history.filter(m=>m.role==='user').slice(-6).reverse()){
  const kind=explicitKind(turn.content);if(kind)return kind;
  if(!/another|one more|different|もう|別|ほか|他/iu.test(turn.content))break;
 }
 return '';
}
