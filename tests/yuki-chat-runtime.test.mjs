import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {ChatSession} from '../assets/yuki/runtime/chat-access.mjs';
import {ConversationMemory,memoryKey} from '../assets/yuki/runtime/conversation-memory.mjs';
import {ConversationMoments} from '../assets/yuki/runtime/conversation-moments.mjs';
import {packChatRequest,rememberReply} from '../assets/yuki/runtime/reply-variety.mjs';
import {validReply,chatUnavailable,readSession} from '../assets/yuki/protocol.mjs';
import {messageRecord,translationBatch,checkedTranslations,applyTranslations} from '../assets/yuki/runtime/conversation-language.mjs';
// Execute the actual front-end request function with injected DOM/network
// dependencies. No browser, credentials or live model requests are involved.
const source=readFileSync(new URL('../assets/yuki/yuki.mjs',import.meta.url),'utf8');
const run=source.slice(source.indexOf(' async function runChat('),source.indexOf(' function render(){'));
const clear=source.slice(source.indexOf(' function clearConversation(){'),source.indexOf(" for(const b of root.querySelectorAll('[data-action]'))"));
const momentFunctions=source.slice(source.indexOf(' function hideMoment(){'),source.indexOf(' function readingContext(){'));
const store=()=>{const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)};};
const cue={text:'Ooh, the little library dream! A cozy perch matters as much as its books.',emotion:'thoughtful',gesture:'none',destination:'none',sources:[],storyTopics:['bigDream']};
function fixture({network}={}){
 const storage=store(),elements=new Map(),calls={verify:0,fetch:[],stop:0,fallback:0,status:[]};
 const context={busy:false,open:false,momentKind:'',moments:new ConversationMoments(storage,()=>0),hidden:false,journey:{active:false},translationFailed:false,online:true,permission:{allowed:true},journeySerial:4,ja:false,base:'',messages:[],variety:{},knowledge:[],paths:{},names:{},pendingCue:null,reactionVersion:0,
  AbortController,setTimeout,clearTimeout,Date,Error,JSON,Map,controller:undefined,location:{pathname:'/resume.html'},endpoint:'https://api.invalid/chat',
  chatSession:new ChatSession(storage),conversationMemory:new ConversationMemory(storage,'en'),searchPermission:{allowed:true},
  verification:{takeToken:async()=>{calls.verify++;return 'single-use-test-token';},stop:()=>{calls.stop++;}},
  tr:(en,jp)=>context.ja?jp:en,$:selector=>{if(!elements.has(selector))elements.set(selector,{value:'Draft to preserve',disabled:false,readOnly:false,hidden:true,setAttribute:()=>{},focus:()=>{}});return elements.get(selector);},
  readingContext:()=>({}),updateReading:()=>{},translationUI:()=>{},drawMessages:()=>{},translationBatch,checkedTranslations,applyTranslations,wake:async()=>{},status:s=>calls.status.push(s),react:async()=>{},
  stopJourney:()=>{context.journeySerial++;},
  save:()=>storage.setItem('yuki-session-v1',JSON.stringify({savedAt:Date.now(),language:context.ja?'ja':'en',messages:context.messages,variety:context.variety})),
  readingMemory:{set:()=>{},clear:()=>{}},followUpReference:()=>null,packChatRequest,validReply,chatUnavailable,isGuideRequest:()=>false,
  addMessage:(role,text)=>context.messages.push({role,text}),beginJourney:async()=>{},
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
test('automatic follow-up preserves the draft, adds no synthetic user message and never uses search',async()=>{
 const f=fixture();f.context.messages.push({role:'user',text:'Lead me to Resume'});
 await f.send('Offer a contextual follow-up',{kind:'arrive',url:'/resume.html'});
 assert.equal(f.context.messages.length,2);assert.equal(f.context.messages[1].role,'assistant');assert.equal(f.context.$('textarea').value,'Draft to preserve');
 assert.equal(f.calls.fetch[0].webSearch,false);assert.equal(f.calls.fetch[0].guideEvent.kind,'arrive');assert.equal(f.context.conversationMemory.turns.length,0);
});
test('route change or cancellation discards a late follow-up without storing it or starting another request',async()=>{
 for(const cancel of [f=>f.context.journeySerial++,f=>f.context.controller.abort(),f=>{f.context.permission.allowed=false;}]){
  let finish;const f=fixture({network:()=>new Promise(resolve=>{finish=()=>resolve(new Response(JSON.stringify(cue)));})});
  const sending=f.send('Follow up',{kind:'nav',url:'/resume.html'},()=>f.calls.fallback++);
  await new Promise(resolve=>setImmediate(resolve));cancel(f);finish();await sending;
  assert.equal(f.context.messages.length,0);assert.equal(f.calls.fallback,0);assert.equal(f.calls.fetch.length,1);assert.equal(f.context.busy,false);assert.equal(f.context.$('textarea').readOnly,false);
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
 f.context.messages=[messageRecord('user','What is your dream?','en'),messageRecord('assistant',cue.text,'en')];f.context.ja=true;
 const originals=f.context.messages.map(m=>m.text);await f.translate();
 assert.equal(f.calls.verify,1);assert.equal(f.calls.fetch.length,1);assert.deepEqual(f.context.messages.map(m=>m.text),originals);assert.equal(f.context.messages.length,2);assert(f.context.messages.every(m=>m.translations.ja));assert.equal(f.context.conversationMemory.turns.length,0);assert.equal(f.context.$('textarea').value,'Draft to preserve');assert.deepEqual(f.calls.fetch[0].history,[]);assert.equal(f.calls.fetch[0].webSearch,false);
 f.context.ja=false;await f.translate();f.context.ja=true;await f.translate();assert.equal(f.calls.fetch.length,1);assert.equal(f.context.busy,false);
});

test('failed/partial translation retains all originals, re-enables chat and never retries automatically',async()=>{
 for(const status of [200,429,403,503]){
  const f=fixture({network:async()=>new Response(JSON.stringify({translations:[]}),{status})});f.context.messages=[messageRecord('assistant',cue.text,'en')];f.context.ja=true;await f.translate();
  assert.equal(f.calls.fetch.length,1);assert.equal(f.context.messages[0].text,cue.text);assert.equal(f.context.messages[0].translations.ja,undefined);assert.equal(f.context.busy,false);assert.equal(f.context.$('textarea').readOnly,false);assert.equal(f.context.$('textarea').value,'Draft to preserve');
 }
});

test('clearing chat while translating discards late results and duplicate clicks cannot queue work',async()=>{
 let finish;const f=fixture({network:(_url,options)=>new Promise(resolve=>{finish=()=>resolve(new Response(JSON.stringify({translations:JSON.parse(options.body).translation.map(m=>({id:m.id,text:'翻訳済み'}))})));})});
 f.context.messages=[messageRecord('assistant',cue.text,'en')];f.context.conversationMemory.remember('Dream?',cue.text);const memory=f.storage.getItem(memoryKey);f.context.ja=true;const pending=f.translate();await new Promise(resolve=>setImmediate(resolve));await f.translate();assert.equal(f.calls.fetch.length,1);f.clear();finish();await pending;assert.equal(f.context.messages.length,0);assert.equal(f.context.busy,false);assert.equal(f.storage.getItem(memoryKey),memory);
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
