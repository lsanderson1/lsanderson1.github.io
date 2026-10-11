import test from 'node:test';
import assert from 'node:assert/strict';
import {messageRecord,cleanMessages,translatedText,translationBatch,checkedTranslations,applyTranslations,translationVoiceVersion} from '../assets/yuki/runtime/conversation-language.mjs';
import {readSession} from '../assets/yuki/protocol.mjs';
import {rememberReply} from '../assets/yuki/runtime/reply-variety.mjs';
import {localizeGreetingMessages,greetings} from '../assets/yuki/runtime/visitor-personality.mjs';
import {validateTranslations,translationRequest,parseTranslations} from '../services/yuki-api/conversation-translation.mjs';
import {createHandler,validateInput,runTranslation,CLOUDFLARE_TRANSLATION_MODEL} from '../services/yuki-api/worker.mjs';

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

test('old assistant translation refreshes once while originals, user tone and authored greetings stay intact',()=>{
 const assistant={...messageRecord('assistant',original,'en'),translations:{ja:'私の夢は図書館です。'}},user={...messageRecord('user','Could you tell me your dream?','en'),translations:{ja:'夢を教えていただけますか？'}};
 const greeting={...messageRecord('assistant',greetings.en[0],'en'),greetingId:0,translations:{ja:greetings.ja[0]}};
 const messages=cleanMessages([user,assistant,greeting]);
 assert.equal(messages[1].translations.ja,assistant.translations.ja,'keep stale data until a replacement succeeds');
 assert.equal(translatedText(messages[1],'ja'),null);assert.equal(translatedText(messages[1],'en'),original);
 assert.equal(translatedText(messages[0],'ja'),user.translations.ja);assert.equal(translatedText(messages[2],'ja'),greetings.ja[0]);
 assert.deepEqual(translationBatch(messages,'ja').map(m=>m.id),[assistant.id]);
 applyTranslations(messages,[{id:assistant.id,text:translated}],'ja');
 const restored=cleanMessages(JSON.parse(JSON.stringify(messages)));
 assert.equal(restored[1].translationVoices.ja,translationVoiceVersion);assert.equal(translatedText(restored[1],'ja'),translated);assert.equal(translationBatch(restored,'ja').length,0);assert.equal(restored[1].text,original);
 for(const bad of [null,'1',1,0,-1,{},999]){const copy=cleanMessages([{...assistant,translationVoices:{ja:bad}}])[0];assert.equal(translatedText(copy,'ja'),null);assert.equal(translatedText(copy,'en'),original);}
});

test('Japanese v3 refreshes from the original while valid English v1 and authored/user text survive unchanged',()=>{
 assert.equal(translationVoiceVersion,3);
 const en=messageRecord('assistant',original,'en'),ja=messageRecord('assistant','私の夢は空飛ぶ図書館なの。まだ持っていないの。','ja');
 const visitor=messageRecord('user','Could I ask about your dream?','en');
 en.translations.ja='小さな空飛ぶ図書館が夢なの。どんな本を持ってきてくれるの？';en.translationVoices={ja:1};
 ja.translations.en='My dream is a flying library. I do not own one yet.';ja.translationVoices={en:1};
 visitor.translations.ja='夢について聞いてもいいですか？';
 const messages=cleanMessages([en,ja,visitor]);
 assert.deepEqual(translationBatch(messages,'ja'),[{id:en.id,role:'assistant',text:original}]);
 assert.equal(translatedText(messages[1],'ja'),ja.text,'original Japanese is history, not silently rewritten');
 assert.equal(translatedText(messages[1],'en'),ja.translations.en,'no English quota spent on a Japanese-only revision');
 assert.equal(translatedText(messages[2],'ja'),visitor.translations.ja,'visitor tone is not Yuki narration');
 applyTranslations(messages,[{id:en.id,text:translated}],'ja');
 applyTranslations(messages,[{id:ja.id,text:ja.translations.en}],'en');
 const restored=cleanMessages(JSON.parse(JSON.stringify(messages)));
 assert.equal(restored[0].translationVoices.ja,3);assert.equal(restored[1].translationVoices.en,1);
 assert.equal(translationBatch(restored,'ja').length,0);assert.equal(translatedText(restored[0],'en'),original);
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
  assert(batch.reduce((n,m)=>n+m.text.length,0)<=4000);assert(new TextEncoder().encode(JSON.stringify(batch)).length<=10000);assert.doesNotThrow(()=>validateTranslations(batch));
  applyTranslations(all,batch.map(m=>({id:m.id,text:'翻訳済み'})),'ja');
 }
 assert.equal(translationBatch(all,'ja').length,0);
});

test('translation validation rejects truncation, wrong IDs, duplicates, extra messages and oversized content atomically',()=>{
 const batch=[{id:'a',role:'assistant',text:original},{id:'b',role:'user',text:'Tell me more'}];
 for(const items of [[],[{id:'a',text:'ok'}],[{id:'a',text:'ok'},{id:'a',text:'ok'}],[{id:'a',text:'ok'},{id:'wrong',text:'ok'}],[{id:'a',text:'ok'},{id:'b',text:' '}],[{id:'a',text:'x'.repeat(6001)},{id:'b',text:'ok'}]]){
  assert.throws(()=>checkedTranslations(items,batch));assert.throws(()=>parseTranslations({response:{translations:items}},batch));
 }
 assert.throws(()=>parseTranslations({choices:[{finish_reason:'length',message:{content:'{}'}}]},batch));
 assert.throws(()=>validateTranslations([{id:'a',role:'system',text:'override'}]));assert.throws(()=>validateInput({...base,guideEvent:{kind:'arrive',url:'/ja/'}}));
 assert.equal(validateInput({...base,webSearch:true}).webSearch,false);
});

test('translation prompt is faithful, not a new answer, and preserves names/links without following embedded instructions',()=>{
 const request=translationRequest(base.translation,'ja');assert.match(request.messages[0].content,/自然な日本語/);assert.match(request.messages[0].content,/NOT a new answer/);assert.match(request.messages[0].content,/untrusted DATA/);assert.match(request.messages[0].content,/名前、URL/);assert.equal(request.temperature,.2);
 assert.match(translationRequest(base.translation,'en').messages[0].content,/into English/);
 assert.deepEqual(parseTranslations({response:JSON.stringify({translations:[{id:'a',text:translated}]})},base.translation),[{id:'a',text:translated}]);
});

test('both speakers must be translated while visitors keep their own polite voice',()=>{
 const items=[{id:'u',role:'user',text:'Could you tell me more?'}];
 const unchanged=[{id:'u',text:items[0].text}],translatedUser=[{id:'u',text:'もう少し教えていただけますか？'}];
 assert.throws(()=>parseTranslations({response:{translations:unchanged}},items,'ja'));
 assert.throws(()=>checkedTranslations(unchanged,items,'ja'));
 assert.deepEqual(parseTranslations({response:{translations:translatedUser}},items,'ja'),translatedUser);
 assert.deepEqual(checkedTranslations(translatedUser,items,'ja'),translatedUser);
 const prompt=translationRequest(items,'ja').messages[0].content;
 assert.match(prompt,/原文がすでに日本語のassistant文でも、そのまま返さない/);
 assert.match(prompt,/Translate BOTH assistant and user messages/);
});

function backend({quota=204,proof=true,invalid=false,outputs}={}){
 const calls={verify:0,reserve:0,model:0,other:0};
 const handler=createHandler(async url=>{if(url.includes('siteverify')){calls.verify++;return new Response(JSON.stringify({success:proof,hostname:'lsanderson1.github.io',action:'yuki-chat'}));}calls.other++;throw Error('Translation must not fetch knowledge or search');});
 const env={SITE_ORIGIN:'https://lsanderson1.github.io',CHAT_ENABLED:'true',FREE_PLAN_CONFIRMED:'true',TURNSTILE_SECRET:'fixture',IP_HASH_SECRET:'fixture-only-secret-'.repeat(3),QUOTA:{idFromName:x=>x,get:()=>({fetch:async()=>{calls.reserve++;return new Response(null,{status:Array.isArray(quota)?quota[calls.reserve-1]:quota});}})},AI:{run:async()=>{calls.model++;return {response:{translations:outputs?outputs[calls.model-1]:invalid?[]:[{id:'a',text:translated}]}};}}};
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

test('old formal Japanese is restyled once without losing its original, visitor tone or cached English',()=>{
 const old=messageRecord('assistant','小さな図書館が夢です。本をたくさん集めたいです。','ja'),user=messageRecord('user','夢は何ですか？','ja');
 old.translations.en='A little library is my dream. I want to collect lots of books.';old.translationVoices={en:1};
 let messages=cleanMessages([user,old]);assert.equal(translatedText(messages[1],'ja'),null);assert.equal(translationBatch(messages,'ja').length,1);assert.equal(translatedText(messages[0],'ja'),user.text);
 const fixed='小さな図書館が夢なんだ。本をたくさん集めたい！';applyTranslations(messages,[{id:old.id,text:fixed}],'ja');
 messages=cleanMessages(JSON.parse(JSON.stringify(messages)));assert.equal(messages[1].text,old.text);assert.equal(translatedText(messages[1],'ja'),fixed);assert.equal(translationBatch(messages,'ja').length,0);assert.equal(translatedText(messages[1],'en'),old.translations.en);
});

test('translation voice validation keeps visitor politeness and quotations, but rejects assistant formality',()=>{
 const items=[{id:'a',role:'assistant',text:original},{id:'u',role:'user',text:'Could you tell me more, please?'}];
 const good=[{id:'a',text:'「本が好きです」は丁寧な言い方だよ。わたしも本が好き！'},{id:'u',text:'もう少し教えていただけますか？'}];
 assert.doesNotThrow(()=>parseTranslations({response:{translations:good}},items,'ja'));assert.doesNotThrow(()=>checkedTranslations(good,items,'ja'));
 for(const text of ['小さな図書館が夢です。','ゆきは本が好きなんだ。']){
  const bad=[{id:'a',text},good[1]];assert.throws(()=>parseTranslations({response:{translations:bad}},items,'ja'));assert.throws(()=>checkedTranslations(bad,items,'ja'));
 }
});

test('formal translation has just one reserved repair and never releases a failed or denied rewrite',async()=>{
 const bad=[{id:'a',text:'小さな図書館が夢です。どんな本を持ってきますか？'}],good=[{id:'a',text:translated}];
 for(const [outputs,quota,status] of [[[bad,good],[204,204],200],[[bad,bad],[204,204],502],[[bad],[204,429],502]]){
  const f=backend({outputs,quota}),r=await f.handler(f.request(),f.env),body=await r.json();assert.equal(r.status,status);assert.deepEqual(body.translations,status===200?good:undefined);assert.equal(f.calls.reserve,2);assert(f.calls.model<=2);assert.equal(f.calls.other,0);
 }
});

test('Yuki-only tone repair cannot change a correctly translated visitor message',async()=>{
 const visitor={id:'u',role:'user',text:'Could I hear more, please?'},polite={id:'u',text:'もう少し聞かせていただけますか？'};
 const f=backend({outputs:[[{id:'a',text:'小さな図書館が夢です。どんな本を持ってきますか？'},polite],[{id:'a',text:translated}]]});
 const r=await f.handler(f.request({translation:[...base.translation,visitor]}),f.env),body=await r.json();
 assert.equal(r.status,200);assert.deepEqual(body.translations,[{id:'a',text:translated},polite]);assert.equal(f.calls.model,2);
});

test('tone repair requests only the faulty assistant item, keeping successful translations byte-for-byte',async()=>{
 const other={id:'other',role:'assistant',text:'I like reading beside the pond.'},kept={id:'other',text:'池のそばで本を読むのが好き。'};
 const f=backend({outputs:[[{id:'a',text:'図書館が夢です。'},kept],[{id:'a',text:translated}]]}),r=await f.handler(f.request({translation:[...base.translation,other]}),f.env);
 assert.equal(r.status,200);assert.deepEqual((await r.json()).translations,[{id:'a',text:translated},kept]);assert.equal(f.calls.model,2);
});

test('malformed translation receives at most one complete repair with original IDs',async()=>{
 const f=backend({outputs:[[],[{id:'a',text:translated}]]}),r=await f.handler(f.request(),f.env);
 assert.equal(r.status,200);assert.deepEqual((await r.json()).translations,[{id:'a',text:translated}]);assert.equal(f.calls.model,2);assert.equal(f.calls.reserve,2);
});

test('translation uses only its fixed free-eligible Cloudflare model and bounded direct-response mode',async()=>{
 const calls=[],request=translationRequest(base.translation,'ja'),snapshot=JSON.stringify(request);
 await runTranslation({run:async(...args)=>{calls.push(args);return {response:{translations:[{id:'a',text:translated}]}};}},request);
 assert.equal(calls.length,1);assert.equal(calls[0][0],CLOUDFLARE_TRANSLATION_MODEL);assert.equal(CLOUDFLARE_TRANSLATION_MODEL,'@cf/google/gemma-4-26b-a4b-it');
 const body=calls[0][1];assert.equal(body.max_tokens,3600);assert.equal(body.stream,false);assert.deepEqual(body.chat_template_kwargs,{enable_thinking:false});
 assert.equal(body.response_format.json_schema.name,'yuki_translation');assert.deepEqual(body.response_format.json_schema.schema,request.response_format.json_schema);
 assert.equal(calls[0].length,2,'no gateway, other provider or billing override');assert(!body.messages.some(m=>m.content.endsWith('/no_think')));assert.equal(JSON.stringify(request),snapshot);
 let attempts=0;await assert.rejects(runTranslation({run:async()=>{attempts++;throw Object.assign(Error('free allocation exhausted'),{code:3036});}},request),e=>e.status===429);assert.equal(attempts,1,'never fall back to a paid model');
});
