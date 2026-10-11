// The newest visitor turn can opt into either language. Ambiguous names, emoji
// and numbers fall back to this page, never a stale remembered preference.
export function replyLanguage(message,pageLanguage='en'){
 const text=String(message).replace(/```[\s\S]*?```|`[^`\n]*`|「[^」]*」|『[^』]*』|“[^”]*”|"[^"\n]*"/gu,' ').trim();
 if(/\b(?:reply|answer|speak|talk|respond|explain|say (?:it|that))\b[^.!?\n]{0,60}\bin (?:English|英語)\b|英語で(?:話|答|返|説明|お願い|いい|聞)|^英語(?:で)?[。！!\s]*$/iu.test(text))return 'en';
 if(/\b(?:reply|answer|speak|talk|respond|explain|say (?:it|that))\b[^.!?\n]{0,60}\bin Japanese\b|日本語で(?:話|答|返|説明|お願い|いい|聞)|^日本語(?:で)?[。！!\s]*$/iu.test(text))return 'ja';
 if((text.match(/[\p{Script=Hiragana}\p{Script=Katakana}]/gu)||[]).length>=2)return 'ja';
 if(/\b(?:i|you|she|her|what|why|how|where|when|who|tell|explain|please|yes|no|more|hello|hi|thanks|okay)\b/iu.test(text))return 'en';
 if((text.match(/\b[a-z]+\b/giu)||[]).length>=4)return 'en';
 return pageLanguage==='ja'?'ja':'en';
}

// Conservative guards, not a general language detector. Names, quotations and
// code may legitimately use another language; check the surrounding narration.
export function wrongReplyLanguage(text,language){
 const prose=String(text).replace(/```[\s\S]*?```|`[^`\n]*`|https?:\/\/\S+|「[^」]*」|『[^』]*』|“[^”]*”|"[^"\n]*"/gu,' ');
 const japanese=(prose.match(/[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/gu)||[]).length;
 const latin=(prose.match(/[A-Za-z]/g)||[]).length;
 if(language==='en')return japanese>=8&&japanese>latin*.15;
 if(language==='ja')return japanese<4&&(latin>=65||((prose.match(/\b[a-z]+\b/giu)||[]).length>=4&&/\b(?:could|would|can|do|what|where|why|how|tell|please|I|you)\b/iu.test(prose)));
 return false;
}

// Detect copied prose blocks, not short emphasis, quoted dialogue, song lyrics
// or code. A repeat is repaired as a whole answer, never blindly sliced away.
export function repeatedPassage(text){
 const prose=String(text).replace(/```[\s\S]*?```|`[^`\n]*`|「[^」]*」|『[^』]*』|“[^”]*”|"[^"\n]*"/gu,' ');
 const sentences=(prose.match(/[^.!?。！？]+[.!?。！？]+/gu)||[]).map(s=>s.normalize('NFKC').replace(/\s+/gu,' ').trim().toLowerCase());
 const seen=new Set();
 for(let i=0;i<sentences.length-1;i++){
  const passage=sentences.slice(i,i+2).join(' ');
  if(passage.replace(/\s/gu,'').length<(/[\p{Script=Hiragana}\p{Script=Katakana}]/u.test(passage)?28:60))continue;
  if(seen.has(passage))return true;
  seen.add(passage);
 }
 // A single long sentence/paragraph copied whole is also a loop.
 const long=new Set();
 for(const sentence of sentences){if(sentence.length<100)continue;if(long.has(sentence))return true;long.add(sentence);}
 const openings=new Map();
 for(const sentence of sentences){const size=/[\p{Script=Hiragana}\p{Script=Katakana}]/u.test(sentence)?12:28;if(sentence.length<size+8)continue;const start=sentence.slice(0,size);openings.set(start,(openings.get(start)||0)+1);}
 if([...openings.values()].some(n=>n>=4&&n>=sentences.length*.4))return true;
 return false;
}

export function formalJapaneseVoice(text){
 const prose=String(text).replace(/```[\s\S]*?```|`[^`\n]*`|「[^」]*」|『[^』]*』|“[^”]*”|"[^"\n]*"/gu,' ');
 // Even one formal ending breaks her voice. Include short replies, line ends,
 // emoji and connecting clauses; quoted examples/code above remain untouched.
 if(/(?:です|ます|でした|ました|ません(?:でした)?|でしょう|ましょう|ございます|ございません)(?:よね|よ|ね|か|し|が|けど|けれど(?:も)?|から|ので)?(?=[\s。！？!?、,……\p{Extended_Pictographic}]|$)/u.test(prose))return true;
 const sentences=prose.match(/[^。！？!?]+[。！？!?]+/gu)||[];
 const endings=new Map();
 for(const sentence of sentences){let ending=/(なの|んだ|だよ|の|ね)[。！？!?]+$/u.exec(sentence.trim())?.[1];if(ending==='なの')ending='の';if(ending)endings.set(ending,(endings.get(ending)||0)+1);}
 return [...endings.values()].some(n=>n>=3&&n>=sentences.length*.5);
}

export function replyQualityIssues(text,language,{allowRepetition=false}={}){
 return [...(wrongReplyLanguage(text,language)?['language']:[]),...(!allowRepetition&&repeatedPassage(text)?['repetition']:[])];
}
