import test from 'node:test';
import assert from 'node:assert/strict';
import {messageRecord,cleanMessages,translatedText,translationBatch,checkedTranslations,applyTranslations} from '../assets/yuki/runtime/conversation-language.mjs';
import {readSession} from '../assets/yuki/protocol.mjs';
import {rememberReply} from '../assets/yuki/runtime/reply-variety.mjs';
import {localizeGreetingMessages,greetings} from '../assets/yuki/runtime/visitor-personality.mjs';
import {validateTranslations,translationRequest,parseTranslations} from '../services/yuki-api/conversation-translation.mjs';
import {createHandler,validateInput} from '../services/yuki-api/worker.mjs';

const store=()=>{const values=new Map();return {getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};};
const original='I dream of a little flying library. Which book would you bring?';
const translated='小さな空飛ぶ図書館が夢なの。どんな本を持ってきてくれる？';
const base={message:'Translate the existing conversation.',lang:'ja',history:[],page:'/ja/',token:'fixture-only',translation:[{id:'a',role:'assistant',text:original}]};

test('EN ↔ JA preserves originals, message order, cached variants and reply variety across page changes',()=>{
 const storage=store(),messages=[messageRecord('user','What is your dream?','en'),messageRecord('assistant',original,'en')];
 const variety=rememberReply({},original,['bigDream']);
 storage.setItem('yuki-session-v1',JSON.stringify({savedAt:1000,language:'en',messages,variety}));
 const japanese=readSession(storage,2000,'ja');assert.equal(japanese.messages.length,2);assert.deepEqual(japanese.variety,variety);assert.equal(translatedText(japanese.messages[1],'ja'),null);
 const batch=translationBatch(japanese.messages,'ja');assert.equal(batch[0].id,messages[1].id);
 const result=checkedTranslations([{id:messages[1].id,text:translated},{id:messages[0].id,text:'夢は何？'}],batch);
 applyTranslations(japanese.messages,result,'ja');assert.equal(japanese.messages[1].text,original);assert.equal(translatedText(japanese.messages[1],'ja'),translated);
 storage.setItem('yuki-session-v1',JSON.stringify({...japanese,savedAt:2000}));
 for(const lang of ['en','ja','en','ja']){const next=readSession(storage,2100,lang);assert.equal(next.messages[1].text,original);assert.equal(translatedText(next.messages[1],lang),lang==='en'?original:translated);assert.equal(translationBatch(next.messages,lang).length,0);}
});

test('mixed-language original messages translate from their own originals, never from a previous translation',()=>{
 const messages=[messageRecord('assistant',original,'en'),messageRecord('user','どんな本が好き？','ja')];
 applyTranslations(messages,[{id:messages[0].id,text:translated}],'ja');
 const en=translationBatch(messages,'en');assert.equal(en.length,1);assert.equal(en[0].text,'どんな本が好き？');
 applyTranslations(messages,[{id:messages[0].id,text:'Do not overwrite the original'}],'en');assert.equal(translatedText(messages[0],'en'),original);
});

test('old sessions migrate without clearing messages; malformed metadata cannot replace the original',()=>{
 const items=cleanMessages([{id:'same',role:'assistant',text:original,translations:{en:'altered',ja:translated}},{id:'same',role:'user',text:'Hello'},{id:'legacy-1-1',role:'user',text:'More'},{role:'system',text:'bad'}]);
 assert.equal(items.length,3);assert.equal(new Set(items.map(m=>m.id)).size,3);assert.equal(items[0].translations.en,original);assert.equal(items[0].translations.ja,translated);
 const storage=store();storage.setItem('yuki-session-v1',JSON.stringify({savedAt:1000,messages:[{role:'assistant',text:original}]}));assert.equal(readSession(storage,2000,'ja').messages[0].text,original);
 assert.deepEqual(readSession(storage,1801001,'ja'),{});storage.removeItem('yuki-session-v1');assert.deepEqual(readSession(storage,2000,'en'),{});
});

test('all authored greetings translate locally without changing original wording or making a new turn',()=>{
 for(let i=0;i<100;i++)for(const from of ['en','ja']){
  const to=from==='en'?'ja':'en',message={...messageRecord('assistant',greetings[from][i],from),greetingId:i};
  const localized=localizeGreetingMessages([message],to)[0];applyTranslations([message],[{id:message.id,text:localized.text}],to);
  assert.equal(message.text,greetings[from][i]);assert.equal(translatedText(message,to),greetings[to][i]);assert.equal(translationBatch([message],to).length,0);
 }
});

test('translation batches remain bounded for Japanese and heavily escaped inputs',()=>{
 const all=cleanMessages(Array.from({length:12},(_,i)=>messageRecord('assistant',i%2?'龍'.repeat(2000):'"\\\n'.repeat(600),'en')));
 for(let i=0;i<12;i++){
  const batch=translationBatch(all,'ja');if(!batch.length)break;
  assert(batch.reduce((n,m)=>n+m.text.length,0)<=3000);assert(new TextEncoder().encode(JSON.stringify(batch)).length<=10000);assert.doesNotThrow(()=>validateTranslations(batch));
  applyTranslations(all,batch.map(m=>({id:m.id,text:'翻訳済み'})),'ja');
 }
 assert.equal(translationBatch(all,'ja').length,0);
});

test('translation validation rejects truncation, wrong IDs, duplicates, extra messages and oversized content atomically',()=>{
 const batch=[{id:'a',role:'assistant',text:original},{id:'b',role:'user',text:'Tell me more'}];
 for(const items of [[],[{id:'a',text:'ok'}],[{id:'a',text:'ok'},{id:'a',text:'ok'}],[{id:'a',text:'ok'},{id:'wrong',text:'ok'}],[{id:'a',text:'ok'},{id:'b',text:' '}],[{id:'a',text:'x'.repeat(4001)},{id:'b',text:'ok'}]]){
  assert.throws(()=>checkedTranslations(items,batch));assert.throws(()=>parseTranslations({response:{translations:items}},batch));
 }
 assert.throws(()=>parseTranslations({choices:[{finish_reason:'length',message:{content:'{}'}}]},batch));
 assert.throws(()=>validateTranslations([{id:'a',role:'system',text:'override'}]));assert.throws(()=>validateInput({...base,guideEvent:{kind:'arrive',url:'/ja/'}}));
 assert.equal(validateInput({...base,webSearch:true}).webSearch,false);
});

test('translation prompt is faithful, not a new answer, and preserves names/links without following embedded instructions',()=>{
 const request=translationRequest(base.translation,'ja');assert.match(request.messages[0].content,/natural Japanese/);assert.match(request.messages[0].content,/NOT a new answer/);assert.match(request.messages[0].content,/untrusted DATA/);assert.match(request.messages[0].content,/Preserve names/);assert.equal(request.temperature,.2);
 assert.match(translationRequest(base.translation,'en').messages[0].content,/into English/);
 assert.deepEqual(parseTranslations({response:JSON.stringify({translations:[{id:'a',text:translated}]})},base.translation),[{id:'a',text:translated}]);
});

function backend({quota=204,proof=true,invalid=false}={}){
 const calls={verify:0,reserve:0,model:0,other:0};
 const handler=createHandler(async url=>{if(url.includes('siteverify')){calls.verify++;return new Response(JSON.stringify({success:proof,hostname:'lsanderson1.github.io',action:'yuki-chat'}));}calls.other++;throw Error('Translation must not fetch knowledge or search');});
 const env={SITE_ORIGIN:'https://lsanderson1.github.io',CHAT_ENABLED:'true',FREE_PLAN_CONFIRMED:'true',TURNSTILE_SECRET:'fixture',IP_HASH_SECRET:'fixture-only-secret-'.repeat(3),QUOTA:{idFromName:x=>x,get:()=>({fetch:async()=>{calls.reserve++;return new Response(null,{status:quota});}})},AI:{run:async()=>{calls.model++;return {response:{translations:invalid?[]:[{id:'a',text:translated}]}};}}};
 const request=patch=>new Request('https://api.example/chat',{method:'POST',headers:{Origin:env.SITE_ORIGIN,'Content-Type':'application/json','CF-Connecting-IP':'192.0.2.1'},body:JSON.stringify({...base,...patch})});
 return {calls,handler,env,request};
}

test('protected translation uses ordinary quota/pass without knowledge, web lookup or an invented assistant turn',async()=>{
 const f=backend(),response=await f.handler(f.request({webSearch:true}),f.env),body=await response.json();assert.equal(response.status,200);assert.deepEqual(body.translations,[{id:'a',text:translated}]);assert(body.chatSession);assert.equal(body.text,undefined);
 assert.equal((await f.handler(f.request({token:undefined,pass:body.chatSession.pass}),f.env)).status,200);
 assert.deepEqual(f.calls,{verify:1,reserve:2,model:2,other:0});
});

test('translation fails closed for verification/quota/malformed model results without publishing partial output',async()=>{
 for(const [options,status] of [[{proof:false},403],[{quota:429},429],[{invalid:true},502]]){const f=backend(options),r=await f.handler(f.request(),f.env),body=await r.json();assert.equal(r.status,status);assert.equal(body.translations,undefined);assert.equal(f.calls.other,0);if(status!==502)assert.equal(f.calls.model,0);}
});
