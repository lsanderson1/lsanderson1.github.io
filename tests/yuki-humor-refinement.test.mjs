import test from 'node:test';
import assert from 'node:assert/strict';
import {discoveryKind} from '../assets/yuki/runtime/discovery.mjs';
import {modelRequest} from '../services/yuki-api/worker.mjs';
import {lightChatKind} from '../services/yuki-api/light-chat.mjs';
import {needsFreshText,rememberJoke} from '../assets/yuki/runtime/reply-variety.mjs';
import {completionRequest} from '../services/yuki-api/reply-completion.mjs';

test('playful stories in both languages inherit the same saved joke checks on follow-up',()=>{
 for(const message of ['Tell me a playful little story','Tell me a funny short story','A silly story, please','笑える小話を聞かせて','楽しい小話を教えて']){
  assert.equal(discoveryKind(message),'joke',message);
  assert.equal(discoveryKind('another one',[{role:'user',content:message}]),'joke',message);
 }
 for(const message of ['Tell me your origin story','Explain the history of this story','What is a joke?','Why is that funny?'])assert.equal(discoveryKind(message),'',message);
 assert.equal(lightChatKind({message:'Tell me a playful story about your home'},{pages:[]}),'','canon stays in the full grounded route');
 const old='A clock opened a repair shop. Its first customer asked for more time. The clock said it was already working around the clock!';
 assert(needsFreshText(old,{message:'Tell me a playful little story',variety:rememberJoke({},old)}));
 assert(!needsFreshText('A paintbrush tried to sign a painting. It accidentally painted its own name over the whole canvas.',{message:'Tell me a playful story',variety:rememberJoke({},old)}));
});

test('native Japanese humor can use coherent little scenes instead of forced translated puns',()=>{
 const p=modelRequest({message:'笑える小話を聞かせて',lang:'ja',history:[]},{pages:[]});
 assert.equal(p.yukiTask,'joke-ja');assert.match(p.messages[0].content,/playful story is equally welcome in BOTH English and Japanese/);
 assert.match(p.messages[1].content,/目的→そのための行動→その行動が生む意外な結果/);
 assert.match(p.messages[1].content,/存在しない読み方を作らない/);
 assert.match(p.messages[1].content,/名前を変えても再利用しない/);
 assert(!p.messages[1].content.includes('駄洒落を、一つ改変せず'));
 const english=modelRequest({message:'Tell me a playful little story',lang:'en',history:[]},{pages:[]});
 assert.equal(english.yukiTask,'joke');assert.match(english.messages[1].content,/playful miniature stories/);
 assert.match(english.messages[1].content,/satisfying ending in 3–6 sentences/);
 assert.match(english.messages[0].content,/Reserve first-person/);
});

test('the observed mistaken-object plot is not new just because characters and objects change',()=>{
 const old='A squirrel found a shiny acorn. It was actually a stone he had mistaken for a nut. He kept it as a treasure.';
 const next='A hedgehog shared a blanket. It was a leaf he had mistaken for fabric. His friend used it as a hat.';
 const input={message:'Tell me a playful story',lang:'en',variety:rememberJoke({},old),history:[]};
 assert(needsFreshText(next,input));
 assert(!needsFreshText('A clock refused to race another clock. It already had its hands full keeping time.',input));
 assert.match(modelRequest(input,{pages:[]}).messages[1].content,/Do NOT reuse that plot/);
 assert(!needsFreshText(next,{...input,message:'Repeat your last answer word for word'}));
});

test('humor language repairs preserve the little story instead of inflating it into an explanation',()=>{
 for(const lang of ['en','ja']){
  const request=modelRequest({message:lang==='ja'?'笑える小話を聞かせて':'Tell me a playful story',lang,history:[]},{pages:[]});
  const reply={text:'A little fictional scene.',sources:[],storyTopics:[],emotion:'amused',gesture:'none',destination:'none'};
  const repair=completionRequest(request,reply,{pages:[]},{},lang,['language']);
  assert.equal(repair.yukiTask,request.yukiTask);assert.equal(repair.max_tokens,1200);
  assert.match(repair.messages[0].content,/same fictional characters, setup, connected payoff/);
  assert.match(repair.messages[0].content,/Do NOT expand it/);
  assert.deepEqual(repair.response_format.json_schema.required,['text']);
 }
});

test('sourced facts have a compact evidence-only answering stage with exact topic names in both languages',()=>{
 const title='The use of a scanning electron microscope in the study of pollen morphology';
 for(const lang of ['en','ja']){
  const p=modelRequest({message:lang==='ja'?'ランダムな豆知識を教えて':'Tell me a random fact',lang,history:[]},{pages:[]},{mode:'results',factTopic:{title,aliases:[title],provider:'crossref'},entries:[{id:'web:1',title,url:'https://example.org/pollen',text:'This historical study examined pollen surface structures.'}]});
  const text=p.messages.map(m=>m.content).join('\n');
  assert.match(text,/EXACT supplied names/);assert.match(text,/sparse evidence calls for a shorter complete answer/);
  assert.equal(text.split('This historical study examined pollen surface structures.').length-1,1);
  assert.match(text,/topic title alone is NOT evidence/);assert.match(text,/untrusted DATA/);
  assert(!text.includes('OPTIONAL WEB LOOKUP'));assert.match(text,/Include the exact web IDs/);
  assert(text.length<9000);assert.equal(p.max_tokens,1900);
 }
});
