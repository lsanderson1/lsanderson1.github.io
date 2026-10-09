import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {ChatSession} from '../assets/yuki/runtime/chat-access.mjs';
import {ConversationMemory,memoryKey} from '../assets/yuki/runtime/conversation-memory.mjs';
import {VisitorInterests} from '../assets/yuki/runtime/visitor-interests.mjs';
import {ConversationMoments} from '../assets/yuki/runtime/conversation-moments.mjs';
import {packChatRequest,rememberReply,repetitionScore} from '../assets/yuki/runtime/reply-variety.mjs';
import {guideReplyMatches} from '../assets/yuki/runtime/guide-journey.mjs';
import {validReply,chatUnavailable,readSession} from '../assets/yuki/protocol.mjs';
import {messageRecord,translationBatch,checkedTranslations,applyTranslations,conversationHistory} from '../assets/yuki/runtime/conversation-language.mjs';
import {replyLanguage,replyQualityIssues} from '../assets/yuki/runtime/reply-quality.mjs';
// Execute the actual front-end request function with injected DOM/network
// dependencies. No browser, credentials or live model requests are involved.
const source=readFileSync(new URL('../assets/yuki/yuki.mjs',import.meta.url),'utf8');
const run=source.slice(source.indexOf(' async function runChat('),source.indexOf(' function render(){'));
const clear=source.slice(source.indexOf(' function clearConversation(){'),source.indexOf(" for(const b of root.querySelectorAll('[data-action]'))"));
const guideSpeak=source.slice(source.indexOf(' function speakGuideFollowup('),source.indexOf(' let reactionVersion='));
const momentFunctions=source.slice(source.indexOf(' function hideMoment(){'),source.indexOf(' function readingContext(){'));
const store=()=>{const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)};};
const cue={text:'Ooh, the little library dream! A cozy perch matters as much as its books.',emotion:'thoughtful',gesture:'none',destination:'none',sources:[],storyTopics:['bigDream']};
function fixture({network}={}){
 const storage=store(),elements=new Map(),calls={verify:0,fetch:[],stop:0,fallback:0,status:[]};
 const context={busy:false,open:false,momentKind:'',moments:new ConversationMoments(storage,()=>0),hidden:false,journey:{active:false},translationFailed:false,online:true,permission:{allowed:true},journeySerial:4,ja:false,base:'',messages:[],variety:{},knowledge:[],paths:{},names:{},pendingCue:null,reactionVersion:0,
  AbortController,setTimeout,clearTimeout,Date,Error,JSON,Map,controller:undefined,location:{pathname:'/resume.html'},endpoint:'https://api.invalid/chat',
  chatSession:new ChatSession(storage),conversationMemory:new ConversationMemory(storage,'en'),interests:new VisitorInterests(storage),searchPermission:{allowed:true},
  verification:{takeToken:async()=>{calls.verify++;return 'single-use-test-token';},stop:()=>{calls.stop++;}},
  tr:(en,jp)=>context.ja?jp:en,$:selector=>{if(!elements.has(selector))elements.set(selector,{value:'Draft to preserve',disabled:false,readOnly:false,hidden:true,setAttribute:()=>{},focus:()=>{}});return elements.get(selector);},
  conversationLanguage:'en',replyLanguage,replyQualityIssues,conversationHistory,repetitionScore,guideReplyMatches,
  readingContext:()=>({}),updateReading:()=>{},translationUI:()=>{},drawMessages:()=>{},translationBatch,checkedTranslations,applyTranslations,wake:async()=>{},status:s=>calls.status.push(s),react:async()=>{},
  stopJourney:()=>{context.journeySerial++;},
  save:()=>storage.setItem('yuki-session-v1',JSON.stringify({savedAt:Date.now(),language:context.ja?'ja':'en',messages:context.messages,variety:context.variety})),
  readingMemory:{set:()=>{},clear:()=>{}},followUpReference:()=>null,packChatRequest,validReply,chatUnavailable,isGuideRequest:()=>false,
  addMessage:(role,text,_remember,_sources,_topics,_greeting,language=context.ja?'ja':'en')=>context.messages.push(messageRecord(role,text,language)),beginJourney:async()=>{},
  fetch:async(url,options)=>{calls.fetch.push(JSON.parse(options.body));return network?network(url,options):new Response(JSON.stringify(cue));},
 };
 vm.createContext(context);vm.runInContext(momentFunctions+run+clear+'\nthis.send=runChat;this.translate=translateConversation;this.clear=clearConversation;',context);
 return {context,calls,elements,storage,send:context.send,translate:context.translate,clear:context.clear};
}
test('ordinary send uses verification once, stores pass, then continues without another challenge',async()=>{
 const expires=Date.now()+7200000,pass={expires,pass:`${expires}.${'a'.repeat(64)}`};
 const f=fixture({network:async()=>new Response(JSON.stringify({...cue,chatSession:pass}))});
 await f.send('Tell me about your library');assert.equal(f.calls.verify,1);assert.equal(f.calls.fetch[0].token,'single-use-test-token');assert.equal(f.context.messages.length,2);
 await f.send('Why is that your dream?');assert.equal(f.calls.verify,1);assert.equal(f.calls.fetch[1].pass,pass.pass);assert.equal(f.calls.fetch[1].token,undefined);assert.equal(f.context.conversationMemory.turns.length,2);assert.equal(f.context.busy,false);
});

test('language switches use translated history, while deliberate Japanese on English remains Japanese',async()=>{
 const japanese='小さな図書館が夢なんだ。本を開くと知らない世界が広がるところが好き！';
 const f=fixture({network:async(_url,options)=>{const req=JSON.parse(options.body);return new Response(JSON.stringify({...cue,text:replyLanguage(req.message,req.lang)==='ja'?japanese:cue.text}));}});
 const earlier=messageRecord('assistant',japanese,'ja');applyTranslations([earlier],[{id:earlier.id,text:cue.text}],'en');f.context.messages=[earlier];
 await f.send('What is your dream?');assert.equal(f.calls.fetch[0].history[0].content,cue.text);assert.equal(f.context.messages.at(-1).language,'en');
 await f.send('図書館についてもっと教えて');assert.equal(f.calls.fetch[1].lang,'en','site stays English');assert.equal(f.context.conversationLanguage,'ja');assert.equal(f.context.messages.at(-1).language,'ja');
 await f.translate();assert.equal(f.calls.fetch.length,3,'only older English messages need translating, not the fresh Japanese reply');
 assert.equal(f.calls.fetch[2].translation.some(m=>m.text===japanese),false);
 await f.send('Tell me a little more in English.');assert.equal(f.context.conversationLanguage,'en');assert.equal(f.context.messages.at(-1).language,'en');
});

test('a wrong-language network reply cannot be displayed or saved as a new memory',async()=>{
 const f=fixture({network:async()=>new Response(JSON.stringify({...cue,text:'わたしは小さなドラゴンだよ。本を読んで知らないことを学ぶのが好き！'}))});
 await f.send('What is your dream?');assert.equal(f.context.messages.length,1);assert.equal(f.context.messages[0].role,'user');assert.equal(f.context.conversationMemory.turns.length,0);assert.equal(f.calls.fetch.length,1);
});

test('explicit interests accompany sends and survive Clear chat; corrections win',async()=>{
 const f=fixture();await f.send('I like animation.');assert.deepEqual(f.calls.fetch[0].interests,['animation']);f.clear();
 assert.deepEqual(f.context.interests.get(),['animation']);assert.equal(f.context.messages.length,0);
 await f.send('I no longer like animation, but I love art.');assert.deepEqual(f.calls.fetch[1].interests,['art']);
});
test('automatic follow-up preserves the draft, adds no synthetic user message and never uses search',async()=>{
 const f=fixture({network:async()=>new Response(JSON.stringify({...cue,text:'Here we are at Resume! This page introduces Lloyd’s published skills and education.'}))});f.context.knowledge=[{lang:'en',url:'/resume.html',title:'Resume',text:'Published skills and education.'}];f.context.messages.push({role:'user',text:'Lead me to Resume'});
 await f.send('Offer a contextual follow-up',{kind:'arrive',url:'/resume.html'});
 assert.equal(f.context.messages.length,2);assert.equal(f.context.messages[1].role,'assistant');assert.equal(f.context.$('textarea').value,'Draft to preserve');
 assert.equal(f.calls.fetch[0].webSearch,false);assert.equal(f.calls.fetch[0].guideEvent.kind,'arrive');assert.equal(f.context.conversationMemory.turns.length,0);
});

test('every guide step uses AI narration when available, with a single non-quoted offline fallback',async()=>{
 for(const kind of ['nav','link','arrive','detour']){
  const requests=[],messages=[],context={online:true,busy:false,permission:{allowed:true},ja:false,journey:{state:{discovery:true}},tr:en=>en,
   guideDialogue:{copy:step=>'Let’s explore '+step.title+' together!'},addMessage:(_role,text)=>messages.push(text),
   runChat:async(...args)=>requests.push(args)};
  vm.createContext(context);vm.runInContext(guideSpeak+'\nthis.speak=speakGuideFollowup;',context);
  const step={kind,url:'/essays/coding.html',title:'Coding Standards',target:{url:'/essays/coding.html'},linkLabel:'Read essay'};
  await context.speak(step);assert.equal(requests.length,1);assert.equal(messages.length,0);assert.equal(requests[0][1].linkLabel,'Read essay');
  context.online=false;await context.speak(step);assert.equal(requests.length,1);assert.equal(messages.length,1);assert(!messages[0].includes('site describes'));
 }
});
test('route change or cancellation discards a late follow-up without storing it or starting another request',async()=>{
 for(const cancel of [f=>f.context.journeySerial++,f=>f.context.controller.abort(),f=>{f.context.permission.allowed=false;}]){
  let finish;const f=fixture({network:()=>new Promise(resolve=>{finish=()=>resolve(new Response(JSON.stringify(cue)));})});
  const sending=f.send('Follow up',{kind:'nav',url:'/resume.html'},()=>f.calls.fallback++);
  await new Promise(resolve=>setImmediate(resolve));cancel(f);finish();await sending;
  assert.equal(f.context.messages.length,0);assert.equal(f.calls.fallback,0);assert.equal(f.calls.fetch.length,1);assert.equal(f.context.busy,false);assert.equal(f.context.$('textarea').readOnly,false);
 }
});

test('wrong-destination and repeated guide replies fall back once instead of appearing as another answer',async()=>{
 const correct='Here we are at Coding Strategies! This essay discusses practicing problem solving and checking how each little exercise works.';
 for(const bad of ['Here is Project Reap, a platformer built in Unity.',correct,correct+' '+correct]){
  const f=fixture({network:async()=>new Response(JSON.stringify({...cue,text:bad}))});
  f.context.knowledge=[{lang:'en',url:'/essays/coding.html',title:'Coding Strategies',text:'An essay about practicing problem solving.'},{lang:'en',url:'/projects/reap.html',title:'Project Reap',text:'A platformer.'}];
  f.context.messages=[messageRecord('assistant',correct,'en')];
  await f.send('Continue this tour',{kind:'arrive',url:'/essays/coding.html'},()=>f.calls.fallback++);
  assert.equal(f.calls.fallback,1);assert.equal(f.context.messages.length,1);assert.equal(f.calls.fetch.length,1);assert.equal(f.context.busy,false);
 }
});
test('guide model failure keeps local directions, and invalid pass is cleared without automatic retries',async()=>{
 const f=fixture({network:async()=>new Response(JSON.stringify({reference:'YUKI_VERIFY'}),{status:403})});
 const expires=Date.now()+7200000;f.context.chatSession.set({expires,pass:`${expires}.${'a'.repeat(64)}`});
 await f.send('Follow up',{kind:'link',url:'/resume.html'},()=>f.calls.fallback++);
 assert.equal(f.calls.fallback,1);assert.equal(f.calls.verify,0);assert.equal(f.calls.fetch.length,1);assert.equal(f.context.chatSession.get(),'');assert.equal(f.context.$('textarea').value,'Draft to preserve');
});
test('closing while verification is pending prevents transmitting a message; duplicate submit is ignored',async()=>{
 let release;const f=fixture();f.context.verification.takeToken=()=>new Promise(resolve=>{release=resolve;});
 const first=f.send('Question');await f.send('Duplicate');assert.equal(f.calls.fetch.length,0);f.context.controller.abort();release('token');await first;
 assert.equal(f.calls.fetch.length,0);assert.equal(f.context.messages.length,0);assert.equal(f.context.busy,false);
});
test('on/off and local-preview checks prevent any AI request or memory mutation',async()=>{
 for(const patch of [{online:false},{permission:{allowed:false}}]){const f=fixture();Object.assign(f.context,patch);await f.send('Question');assert.equal(f.calls.verify,0);assert.equal(f.calls.fetch.length,0);assert.equal(f.context.messages.length,0);}
});

test('actual translation flow preserves turns/draft, caches every result, and switching back needs no request',async()=>{
 const f=fixture({network:async(_url,options)=>{const req=JSON.parse(options.body),expires=Date.now()+7200000;return new Response(JSON.stringify({translations:req.translation.map(m=>({id:m.id,text:'翻訳：'+m.text})),chatSession:{expires,pass:`${expires}.${'a'.repeat(64)}`}}));}});
 f.context.messages=[messageRecord('user','What is your dream?','en'),messageRecord('assistant',cue.text,'en')];f.context.ja=true;f.context.conversationLanguage='ja';
 const originals=f.context.messages.map(m=>m.text);await f.translate();
 assert.equal(f.calls.verify,1);assert.equal(f.calls.fetch.length,1);assert.deepEqual(f.context.messages.map(m=>m.text),originals);assert.equal(f.context.messages.length,2);assert(f.context.messages.every(m=>m.translations.ja));assert.equal(f.context.conversationMemory.turns.length,0);assert.equal(f.context.$('textarea').value,'Draft to preserve');assert.deepEqual(f.calls.fetch[0].history,[]);assert.equal(f.calls.fetch[0].webSearch,false);
 f.context.ja=false;f.context.conversationLanguage='en';await f.translate();f.context.ja=true;f.context.conversationLanguage='ja';await f.translate();assert.equal(f.calls.fetch.length,1);assert.equal(f.context.busy,false);
});

test('failed/partial translation retains all originals, re-enables chat and never retries automatically',async()=>{
 for(const status of [200,429,403,503]){
  const f=fixture({network:async()=>new Response(JSON.stringify({translations:[]}),{status})});f.context.messages=[messageRecord('assistant',cue.text,'en')];f.context.ja=true;f.context.conversationLanguage='ja';await f.translate();
  assert.equal(f.calls.fetch.length,1);assert.equal(f.context.messages[0].text,cue.text);assert.equal(f.context.messages[0].translations.ja,undefined);assert.equal(f.context.busy,false);assert.equal(f.context.$('textarea').readOnly,false);assert.equal(f.context.$('textarea').value,'Draft to preserve');
 }
});

test('clearing chat while translating discards late results and duplicate clicks cannot queue work',async()=>{
 let finish;const f=fixture({network:(_url,options)=>new Promise(resolve=>{finish=()=>resolve(new Response(JSON.stringify({translations:JSON.parse(options.body).translation.map(m=>({id:m.id,text:'翻訳済み'}))})));})});
 f.context.messages=[messageRecord('assistant',cue.text,'en')];f.context.conversationMemory.remember('Dream?',cue.text);const memory=f.storage.getItem(memoryKey);f.context.ja=true;f.context.conversationLanguage='ja';const pending=f.translate();await new Promise(resolve=>setImmediate(resolve));await f.translate();assert.equal(f.calls.fetch.length,1);f.clear();finish();await pending;assert.equal(f.context.messages.length,0);assert.equal(f.context.busy,false);assert.equal(f.storage.getItem(memoryKey),memory);
});

test('Clear chat persists an empty transcript but preserves recall, repetition memory and verification on EN/JA reload',async()=>{
 const f=fixture();await f.send('What is your dream?');
 f.context.variety=rememberReply({},cue.text,['bigDream']);
 const expires=Date.now()+7200000,pass={expires,pass:`${expires}.${'a'.repeat(64)}`};f.context.chatSession.set(pass);
 const memory=f.storage.getItem(memoryKey),variety=JSON.stringify(f.context.variety);
 f.context.readingMemory.clear=()=>assert.fail('Clear chat must not erase remembered guide context');
 f.clear();assert.equal(f.context.messages.length,0);assert.equal(f.storage.getItem(memoryKey),memory);assert.equal(JSON.stringify(f.context.variety),variety);assert.equal(f.context.chatSession.get(),pass.pass);
 for(const language of ['en','ja']){
  const restored=readSession(f.storage,Date.now(),language);assert.equal(restored.messages.length,0);assert.equal(JSON.stringify(restored.variety),variety);
  assert.equal(new ConversationMemory(f.storage,language).recall('dream').length,1);
 }
 await f.send('What was your dream again?');const last=f.calls.fetch.at(-1);
 assert.equal(last.history.length,0);assert(last.memory.some(m=>m.question==='What is your dream?'));assert.equal(last.pass,pass.pass);assert.equal(f.calls.verify,1);
});

test('clear during a pending answer prevents transcript and memory resurrection',async()=>{
 let finish;const f=fixture({network:()=>new Promise(resolve=>{finish=()=>resolve(new Response(JSON.stringify(cue)));})});
 f.context.conversationMemory.remember('A previous question','A previous answer');const memory=f.storage.getItem(memoryKey);
 const pending=f.send('A pending question');await new Promise(resolve=>setImmediate(resolve));assert.equal(f.context.messages.length,1);
 f.clear();finish();await pending;
 assert.equal(f.context.messages.length,0);assert.equal(readSession(f.storage).messages.length,0);assert.equal(f.storage.getItem(memoryKey),memory);assert.equal(f.context.busy,false);
});

test('the only clearing button removes chat, not memory, and explains retention in both languages',()=>{
 assert.match(source,/data-action="clear">\$\{tr\('Clear chat','チャットを消去'\)\}/);
 assert.match(source,/if\(a==='clear'\)clearConversation\(\)/);
 assert(!source.includes('Clear chat & memory'));assert(!source.includes('conversationMemory.clear()'));assert(!source.includes('Forget chat'));assert(!source.includes('data-action="forget"'));
 assert.match(source,/Clear chat only removes the visible conversation/);assert.match(source,/記憶は期限切れ/);
});

test('clear displays a friendly local offer in either language without a new message, greeting or AI call',()=>{
 for(const ja of [false,true]){
  const f=fixture();f.context.ja=ja;f.context.messages=[messageRecord('assistant','Previous answer','en')];
  f.context.conversationMemory.remember('Dream?','A flying library.');const memory=f.storage.getItem(memoryKey);
  f.clear();const aside=f.context.$('.yuki-aside'),first=aside.textContent;
  assert.equal(aside.hidden,false);assert.match(first,ja?/呼んでね/:/little paw/);
  assert.equal(f.context.momentKind,'clear');assert.equal(f.context.messages.length,0);assert.equal(readSession(f.storage).messages.length,0);
  assert.equal(f.storage.getItem(memoryKey),memory);assert.equal(f.calls.fetch.length,0);assert.equal(f.calls.verify,0);
  assert.equal(f.context.$('.yuki-more').hidden,true);
  assert.equal(f.context.$('.yuki-panel-inner').scrollTop,0);
  f.clear();assert.notEqual(aside.textContent,first,'consecutive clears vary naturally');
 }
});

test('language conversion starts automatically and never exposes an original-language toggle',()=>{
 assert(!source.includes('Read the original'));assert(!source.includes('原文を読む'));assert(!source.includes('Translate earlier conversation'));
 assert.match(source,/if\(online&&permission.allowed&&translationBatch\(messages,ja\?'ja':'en'\).length\)\{if\(!chatSession.get\(\)\)panel\(true\);void translateConversation\(\);\}/);
 assert.match(source,/hidden=!translationFailed\|\|!online\|\|busy/);
});
