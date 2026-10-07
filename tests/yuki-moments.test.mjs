import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {ConversationMoments,momentLines,shouldWelcomeOnRefresh,isLeavingLink} from '../assets/yuki/runtime/conversation-moments.mjs';
import {readSession} from '../assets/yuki/protocol.mjs';
const source=readFileSync(new URL('../assets/yuki/yuki.mjs',import.meta.url),'utf8');
const store=()=>{const values=new Map();return {getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)};};

test('local asides have paired languages and never immediately repeat, even after reload',()=>{
 const storage=store();
 for(const kind of Object.keys(momentLines)){
  let previous='';
  for(let i=0;i<12;i++){
   const moments=new ConversationMoments(storage,()=>0),text=moments.next(kind,'en');
   assert(text);assert.notEqual(text,previous);previous=text;
   const index=moments.last[kind];assert.equal(text,momentLines[kind][index][0]);assert.match(momentLines[kind][index][1],/[ぁ-ん]/);
  }
 }
 const state=JSON.parse(storage.getItem('yuki-moments-v1'));
 assert.deepEqual(Object.keys(state).sort(),['clear','leave','refresh']);assert(Object.values(state).every(Number.isInteger));
});

test('corrupt/unavailable local storage cannot break a message and never stores chat content',()=>{
 const storage={getItem:()=>'{bad',setItem:()=>{throw Error('unavailable');}};
 for(const random of [()=>0,()=>1,()=>NaN,()=>-1]){const moments=new ConversationMoments(storage,random);assert(moments.next('clear','ja'));assert.equal(moments.next('constructor'),'');}
 assert(new ConversationMoments().next('leave'));
});

test('refresh welcomes returning awake/chatting visitors, not first loads, language navigation or hidden/guided pets',()=>{
 const saved={awake:true,messages:[]};
 assert.equal(shouldWelcomeOnRefresh('reload',saved),true);
 assert.equal(shouldWelcomeOnRefresh('reload',{messages:[{}]}),true);
 for(const type of ['navigate','back_forward',undefined])assert.equal(shouldWelcomeOnRefresh(type,saved),false);
 assert.equal(shouldWelcomeOnRefresh('reload'),false);assert.equal(shouldWelcomeOnRefresh('reload',{...saved,hidden:true}),false);assert.equal(shouldWelcomeOnRefresh('reload',saved,true),false);
 const storage=store();for(const value of [true,false,'true',1]){storage.setItem('yuki-session-v1',JSON.stringify({savedAt:1000,chatOpen:value}));assert.equal(readSession(storage,1001).chatOpen,value===true);}
});

test('only an ordinary outbound web-link activation qualifies for a farewell',()=>{
 const current='https://lsanderson1.github.io/ja/resume.html',external='https://github.com/lsanderson1';
 assert.equal(isLeavingLink(external,current),true);
 for(const href of ['#skills','/resume.html','https://lsanderson1.github.io/projects/','mailto:hello@example.com','javascript:alert(1)','file:///tmp/file','https://[bad'])assert.equal(isLeavingLink(href,current),false);
 for(const event of [{button:1},{button:2},{defaultPrevented:true},{download:true},{altKey:true},{ctrlKey:true},{metaKey:true},{shiftKey:true}])assert.equal(isLeavingLink(external,current,event),false);
});

test('the actual departure handler respects hidden/busy/guiding/offscreen states and does not intercept navigation',()=>{
 const handler=source.slice(source.indexOf(" document.addEventListener('click',event=>{"),source.indexOf(" document.addEventListener('visibilitychange'"));
 const calls=[],state={ready:true,hidden:false,busy:false,journey:{active:false},onScreen:true,isLeavingLink,location:{href:'https://lsanderson1.github.io/ja/'},showMoment:(kind,options)=>calls.push({kind,reveal:options.reveal}),document:{addEventListener:(_name,callback)=>{state.click=callback;}}};
 runInNewContext(handler,state);
 const link={href:'https://github.com/lsanderson1',hasAttribute:()=>false};
 const event={button:0,target:{closest:()=>link},preventDefault:()=>assert.fail('must not delay navigation')};
 state.click(event);assert.deepEqual(calls,[{kind:'leave',reveal:true}]);
 for(const patch of [{ready:false},{hidden:true},{busy:true},{journey:{active:true}},{onScreen:false}]){const original={...state};Object.assign(state,patch);state.click(event);Object.assign(state,original);assert.equal(calls.length,1);}
});

test('revealing a local aside can leave focus and translation untouched',()=>{
 const panel=source.slice(source.indexOf(' function panel('),source.indexOf(' async function openConversation'));
 let focused=0,queued=0,saved=0;
 const state={open:false,hidden:false,busy:false,motion:null,$:()=>({setAttribute:()=>{},focus:()=>{focused++;}}),wake:()=>{},updateReading:()=>{},queueMicrotask:()=>{queued++;},placeBubble:()=>{},save:()=>{saved++;}};
 runInNewContext(panel,state);state.panel(true,{focus:false,translate:false});
 assert.equal(state.open,true);assert.equal(focused,0);assert.equal(queued,0);assert.equal(saved,1);
 assert.match(source,/showMoment\('refresh',\{reveal:saved.chatOpen===true\}\)/);
 assert.match(source,/if\(remember\)hideMoment\(\)/);
 assert(!source.includes("addEventListener('beforeunload'"),'no disruptive exit confirmation');
});
