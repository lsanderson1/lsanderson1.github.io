import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {VisitorPersonality,conversationOpening} from '../assets/yuki/runtime/visitor-personality.mjs';

const ui=readFileSync(new URL('../assets/yuki/yuki.mjs',import.meta.url),'utf8');
// Exercise the real click/open functions, with only the DOM and animation
// services replaced. Keeping an animation pending must not block closing.
function fixture({ready=true,lang='en'}={}){
 const state={ready,open:false,messages:[],personality:new VisitorPersonality(undefined,()=>0),ja:lang==='ja',conversationOpening,panels:[],reactions:[]};
 state.panel=value=>{state.open=value;state.panels.push(value);};
 state.addMessage=(role,text,_remember,_sources,_topics,greetingId)=>state.messages.push({role,text,greetingId});
 state.react=cue=>{state.reactions.push(cue);return new Promise(()=>{});};
 state.translateConversation=()=>{};
 const functions=ui.match(/async function openConversation\(\)\{[\s\S]*?\n \}\n function toggleConversation\(\)\{[^\n]*\}/)?.[0];
 assert(functions,'The actual conversation handlers should be available');
 runInNewContext(functions,state);
 return state;
}

test('click opens, clicks hide/reopen, and a pending greeting animation never prevents toggling',()=>{
 for(const lang of ['en','ja']){
  const state=fixture({lang});
  state.toggleConversation();assert.equal(state.open,true);
  const greeting=state.messages[0];assert(greeting.text);
  for(let i=0;i<4;i++){
   state.toggleConversation();assert.equal(state.open,false);
   state.toggleConversation();assert.equal(state.open,true);
  }
  assert.equal(state.messages.length,1);assert.equal(state.messages[0],greeting);
  assert.equal(state.reactions.length,1);
 }
});

test('clicks before loading do nothing and reopening preserves an existing conversation',()=>{
 const state=fixture({ready:false});
 state.toggleConversation();assert.equal(state.open,false);assert.equal(state.panels.length,0);
 state.ready=true;
 const history=[{role:'user',text:'Hello'},{role:'assistant',text:'The current answer'}];
 state.messages.push(...history);
 state.toggleConversation();state.toggleConversation();state.toggleConversation();
 assert.deepEqual(state.messages,history);assert.equal(state.reactions.length,0);
 assert.deepEqual(state.panels,[true,false,true]);
});

test('the character button toggles the shared panel and exposes its state in both languages',()=>{
 assert.match(ui,/\$\('\.yuki-hit'\)\.onclick=toggleConversation/);
 assert.match(ui,/class="yuki-hit" hidden aria-controls="yuki-panel" aria-expanded="false"/);
 assert.match(ui,/\$\('\.yuki-hit'\)\.setAttribute\('aria-expanded',String\(value\)\)/);
 assert.match(ui,/open\?tr\('Hide chat with Yuki','ゆきとのチャットを隠す'\)/);
});
