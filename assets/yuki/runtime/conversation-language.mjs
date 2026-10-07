const languages=['en','ja'];
export const translationVoiceVersion=1;
let sequence=0;
export function messageRecord(role,text,language){
 return {id:`m-${Date.now().toString(36)}-${(++sequence).toString(36)}`,role,text,language,translations:{[language]:text}};
}
export function cleanMessages(value,fallbackLanguage='en'){
 const ids=new Set();
 return (Array.isArray(value)?value:[]).filter(m=>m&&['user','assistant'].includes(m.role)&&typeof m.text==='string'&&m.text.trim()&&m.text.length<=(m.role==='assistant'?2000:1000)).slice(-12).map((m,i)=>{
  const language=languages.includes(m.language)?m.language:languages.includes(fallbackLanguage)?fallbackLanguage:'en';
  let id=typeof m.id==='string'&&/^[\w-]{1,80}$/.test(m.id)?m.id:`legacy-${i}`;while(ids.has(id))id=`legacy-${i}-${++sequence}`;ids.add(id);
  const translations={};for(const lang of languages)if(typeof m.translations?.[lang]==='string'&&m.translations[lang].trim()&&m.translations[lang].length<=4000)translations[lang]=m.translations[lang];
  translations[language]=m.text;
  const sources=Array.isArray(m.sources)?m.sources.filter(s=>s&&typeof s.title==='string'&&s.title.length<=250&&typeof s.url==='string'&&s.url.length<=2048).slice(0,3).map(({title,url})=>({title,url})):[];
  const translationVoices={};for(const lang of languages)if(translations[lang]&&m.translationVoices?.[lang]===translationVoiceVersion)translationVoices[lang]=translationVoiceVersion;
  return {id,role:m.role,text:m.text,language,translations,translationVoices,...(sources.length?{sources}:{}),...(Number.isInteger(m.greetingId)?{greetingId:m.greetingId}:{})};
 });
}
export function translatedText(message,language){
 if(message.language===language)return message.text;
 // Refresh old formal assistant translations once, never original/user wording
 // or authored bilingual greetings. Keep stale variants stored until replaced.
 if(message.role==='assistant'&&!Number.isInteger(message.greetingId)&&message.translationVoices?.[language]!==translationVoiceVersion)return null;
 return message.translations?.[language]||null;
}
// Prioritize what is currently visible (latest reply), then older history.
export function translationBatch(messages,language){
 let bytes=0,characters=0;const batch=[],encoder=new TextEncoder();
 for(const m of [...messages].reverse()){
  if(translatedText(m,language))continue;
  const size=encoder.encode(m.text).length;
  if(bytes+size>6000||characters+m.text.length>3000||encoder.encode(JSON.stringify([...batch,{id:m.id,text:m.text,role:m.role}])).length>10000)continue;
  bytes+=size;characters+=m.text.length;batch.push({id:m.id,text:m.text,role:m.role});
 }return batch;
}
export function checkedTranslations(value,batch){
 if(!Array.isArray(value)||value.length!==batch.length)throw Error('Incomplete translation');
 const ids=new Set(batch.map(m=>m.id));
 return value.map(t=>{if(!t||!ids.delete(t.id)||typeof t.text!=='string'||!t.text.trim()||t.text.length>4000)throw Error('Invalid translation');return {id:t.id,text:t.text.trim()};});
}
export function applyTranslations(messages,items,language){
 for(const item of items){const m=messages.find(m=>m.id===item.id);if(m&&m.language!==language){m.translations={...m.translations,[language]:item.text};if(m.role==='assistant')m.translationVoices={...m.translationVoices,[language]:translationVoiceVersion};}}
}
