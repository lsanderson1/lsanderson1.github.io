import {wrongReplyLanguage,formalJapaneseVoice,replyQualityIssues} from './reply-quality.mjs?v=3';
import {thirdPersonSelf} from './self-narration.mjs?v=2';
import {referencedExchange} from './discovery.mjs?v=6';
const languages=['en','ja'];
export const translationVoiceVersion=3;
// This revision improves Japanese only; do not spend quota retranslating English.
const voiceVersion=language=>language==='ja'?translationVoiceVersion:1;
let sequence=0;
const needsVoiceRefresh=(text,language)=>(language==='ja'&&formalJapaneseVoice(text))||thirdPersonSelf(text);
export function messageRecord(role,text,language){
 return {id:`m-${Date.now().toString(36)}-${(++sequence).toString(36)}`,role,text,language,translations:{[language]:text}};
}
export function cleanMessages(value,fallbackLanguage='en'){
 const ids=new Set();
 return (Array.isArray(value)?value:[]).filter(m=>m&&['user','assistant'].includes(m.role)&&typeof m.text==='string'&&m.text.trim()&&m.text.length<=(m.role==='assistant'?3000:1000)).slice(-12).map((m,i)=>{
  let language=languages.includes(m.language)?m.language:languages.includes(fallbackLanguage)?fallbackLanguage:'en';
  // Previously a wrong-language answer could be mislabeled as the page's
  // language, making it look already translated. Preserve its actual original.
  if(m.role==='assistant'&&wrongReplyLanguage(m.text,language))language=language==='ja'?'en':'ja';
  let id=typeof m.id==='string'&&/^[\w-]{1,80}$/.test(m.id)?m.id:`legacy-${i}`;while(ids.has(id))id=`legacy-${i}-${++sequence}`;ids.add(id);
  const translations={};for(const lang of languages)if(typeof m.translations?.[lang]==='string'&&m.translations[lang].trim()&&m.translations[lang].length<=6000)translations[lang]=m.translations[lang];
  // Keep the immutable source, but retain a validated same-language voice
  // correction for old assistant replies rather than restoring stiff wording.
  if(!(m.role==='assistant'&&m.translationVoices?.[language]===voiceVersion(language)&&translations[language]&&!needsVoiceRefresh(translations[language],language)))translations[language]=m.text;
  const sources=Array.isArray(m.sources)?m.sources.filter(s=>s&&typeof s.title==='string'&&s.title.length<=250&&typeof s.url==='string'&&s.url.length<=2048).slice(0,3).map(({title,url})=>({title,url})):[];
  const translationVoices={};for(const lang of languages)if(translations[lang]&&m.translationVoices?.[lang]===voiceVersion(lang))translationVoices[lang]=voiceVersion(lang);
  return {id,role:m.role,text:m.text,language,translations,translationVoices,...(sources.length?{sources}:{}),...(Number.isInteger(m.greetingId)?{greetingId:m.greetingId}:{})};
 });
}
export function translatedText(message,language){
 if(Number.isInteger(message.greetingId)&&message.translations?.[language])return message.translations[language];
 const reviewVoice=message.role==='assistant'&&!Number.isInteger(message.greetingId);
 if(message.language===language&&(!reviewVoice||!needsVoiceRefresh(message.text,language)))return message.text;
 // Refresh older-style assistant display wording once, keeping immutable
 // originals/user wording. Authored bilingual greetings need no AI rewrite.
 if(reviewVoice&&message.translationVoices?.[language]!==voiceVersion(language))return null;
 const text=message.translations?.[language];
 return text&&!wrongReplyLanguage(text,language)&&(!reviewVoice||!needsVoiceRefresh(text,language))?text:null;
}
export function conversationHistory(messages,language,question=''){
 const available=messages.map(m=>{const display=translatedText(m,language),limit=m.role==='assistant'?3000:1000;return {role:m.role,content:display&&display.length<=limit?display:m.text};});
 const reference=referencedExchange(question,available),recent=available.slice(-6);
 // Explicitly requested earlier jokes/stories survive the six-message window.
 // Keep chronological order; do not move an older answer into the latest slot.
 if(reference.length&&reference.some(m=>!recent.includes(m)))return [...new Set([...reference,...available.slice(-4)])];
 return recent;
}
// Prioritize what is currently visible (latest reply), then older history.
export function translationBatch(messages,language){
 let bytes=0,characters=0;const batch=[],encoder=new TextEncoder();
 for(const m of [...messages].reverse()){
  if(translatedText(m,language))continue;
  const size=encoder.encode(m.text).length;
  if(bytes+size>10000||characters+m.text.length>4000||encoder.encode(JSON.stringify([...batch,{id:m.id,text:m.text,role:m.role}])).length>11000)continue;
  bytes+=size;characters+=m.text.length;batch.push({id:m.id,text:m.text,role:m.role});
 }return batch;
}
export function checkedTranslations(value,batch,language){
 if(!Array.isArray(value)||value.length!==batch.length)throw Error('Incomplete translation');
 const ids=new Set(batch.map(m=>m.id));
 return value.map(t=>{if(!t||!ids.delete(t.id)||typeof t.text!=='string'||!t.text.trim()||t.text.length>6000)throw Error('Invalid translation');if(language&&(wrongReplyLanguage(t.text,language)||(batch.find(m=>m.id===t.id)?.role==='assistant'&&(replyQualityIssues(t.text,language).length||needsVoiceRefresh(t.text,language)))))throw Error('Invalid translation voice');return {id:t.id,text:t.text.trim()};});
}
export function applyTranslations(messages,items,language){
 for(const item of items){const m=messages.find(m=>m.id===item.id);if(m&&(m.language!==language||(m.role==='assistant'&&needsVoiceRefresh(m.text,language)))){m.translations={...m.translations,[language]:item.text};if(m.role==='assistant')m.translationVoices={...m.translationVoices,[language]:voiceVersion(language)};}}
}
