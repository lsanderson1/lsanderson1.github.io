import test from 'node:test';
import assert from 'node:assert/strict';
import {VisitorPersonality,conversationOpening,greetings,localizeGreetingMessages} from '../assets/yuki/runtime/visitor-personality.mjs';
import {readSession} from '../assets/yuki/protocol.mjs';
import {yukiStory,personalityInstructions} from '../services/yuki-api/personality.mjs';
import {modelRequest,parseModel} from '../services/yuki-api/worker.mjs';

const memory=()=>{const values=new Map();return {getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)};};
const request={message:'Why are you called Yuki?',history:[],lang:'en',page:'/',token:'fixture'};

test('one greeting starts an empty conversation; reopening does not consume another or overwrite a reply',()=>{
 for(const lang of ['en','ja']){
  const person=new VisitorPersonality(memory(),()=>0),messages=[];
  const opening=conversationOpening(messages,person,lang);
  assert(opening.text);assert.equal(opening.firstMeeting,true);
  messages.push({role:'assistant',text:opening.text});person.markMet();
  assert.equal(conversationOpening(messages,person,lang),null);
  messages.push({role:'user',text:'Tell me more'}, {role:'assistant',text:'Our current answer'});
  for(let i=0;i<8;i++)assert.equal(conversationOpening(messages,person,lang),null);
  assert.equal(messages.at(-1).text,'Our current answer');assert.equal(person.used[lang].length,1);
 }
});

test('same-tab page and reload changes resume saved messages without another greeting',()=>{
 const local=memory(),session=memory(),person=new VisitorPersonality(local,()=>0);
 const opening=conversationOpening([],person,'en');person.markMet();
 for(const messages of [[{role:'assistant',text:opening.text}],[{role:'user',text:'A failed first send'}],[{role:'user',text:'Question'},{role:'assistant',text:'Reply'}]]){
  session.setItem('yuki-session-v1',JSON.stringify({savedAt:1000,messages}));
  for(const lang of ['en','ja']){
   const next=new VisitorPersonality(local),restored=readSession(session,2000);
   assert.deepEqual(restored.messages.map(({role,text})=>({role,text})),messages);
   assert.equal(conversationOpening(restored.messages,next,lang),null);
   assert.equal(next.used.en.length,1);assert.equal(next.used.ja.length,0);
  }
 }
});

test('all 100 authored openings translate EN ↔ JA without choosing a new greeting or changing the original',()=>{
 assert.equal(greetings.en.length,greetings.ja.length);
 for(let greetingId=0;greetingId<greetings.en.length;greetingId++){
  const original=[{role:'assistant',text:greetings.en[greetingId],greetingId}];
  const japanese=localizeGreetingMessages(original,'ja');
  assert.equal(japanese.length,1);assert.equal(japanese[0].text,greetings.ja[greetingId]);
  assert.deepEqual(localizeGreetingMessages(japanese,'en'),original);
  assert.deepEqual(localizeGreetingMessages(japanese,'ja'),japanese);
  assert.equal(original[0].text,greetings.en[greetingId]);
 }
});

test('saved greeting identity survives reload and switches language without another wave or consuming a greeting',()=>{
 const local=memory(),session=memory(),person=new VisitorPersonality(local,()=>0);
 const opening=conversationOpening([],person,'en');person.markMet();
 assert.equal(opening.greetingId,0);
 const stored=[{role:'assistant',text:opening.text,greetingId:opening.greetingId}];
 for(const lang of ['ja','ja','en','ja','en']){
  session.setItem('yuki-session-v1',JSON.stringify({savedAt:1000,messages:stored}));
  const messages=localizeGreetingMessages(readSession(session,2000).messages,lang);
  assert.equal(messages[0].text,greetings[lang][0]);
  assert.equal(conversationOpening(messages,person,lang),null);
  stored.splice(0,stored.length,...messages);
 }
 assert.equal(person.seen,true);assert.deepEqual(person.used,{en:[0],ja:[]});
});

test('old plain-text greeting sessions migrate without clearing real messages or replacing the last AI reply',()=>{
 for(const from of ['en','ja']){
  const to=from==='en'?'ja':'en';
  const messages=[{role:'assistant',text:greetings[from][24]},{role:'user',text:'Tell me about this project'},{role:'assistant',text:'This is the actual answer.',sources:[{title:'Project',url:'/projects/'}]}];
  const localized=localizeGreetingMessages(messages,to);
  assert.deepEqual(localized[0],{role:'assistant',text:greetings[to][24],greetingId:24});
  assert.equal(localized[1],messages[1]);assert.equal(localized[2],messages[2]);assert.equal(localized.length,messages.length);
 }
});

test('language switching never mistakes user text, ordinary AI replies or malformed metadata for a greeting',()=>{
 for(const messages of [
  [{role:'user',text:greetings.en[0]}],
  [{role:'assistant',text:'A real answer, not a stock greeting.'}],
  [{role:'user',text:'Please say hello'},{role:'assistant',text:greetings.en[0]}],
  ...[-1,100,'0',NaN,null,0].map(greetingId=>[{role:'assistant',text:'Keep this actual reply',greetingId}]),
 ])assert.deepEqual(localizeGreetingMessages(messages,'ja'),messages);
 assert.deepEqual(localizeGreetingMessages([],'ja'),[]);
});

test('cleared or expired conversation may start anew without replaying the first-meeting wave',()=>{
 const storage=memory(),person=new VisitorPersonality(storage,()=>0);person.markMet();
 assert.equal(conversationOpening([],person).firstMeeting,false);
 const session=memory();session.setItem('yuki-session-v1',JSON.stringify({savedAt:1000,messages:[{role:'assistant',text:'Old reply'}]}));
 const expired=readSession(session,1801001);
 assert.equal(conversationOpening(expired.messages??[],person).gesture,'talkOpen');
 // Same-page continuity does not depend on storage being available.
 const blocked=new VisitorPersonality({getItem(){throw Error();},setItem(){throw Error();}});
 const opening=conversationOpening([],blocked);
 assert.equal(conversationOpening([{role:'assistant',text:opening.text}],blocked),null);
});

test('English and Japanese prompts share canonical lore, contextual warmth and factual separation',()=>{
 assert(Object.isFrozen(yukiStory));
 for(const lang of ['en','ja']){
  const prompt=personalityInstructions(lang),body=modelRequest({...request,lang},{pages:[]});
  assert(body.messages[0].content.includes(prompt));
  for(const fact of Object.values(yukiStory))assert(prompt.includes(fact));
  assert.match(prompt,/cherry tree/);assert.match(prompt,/falling petals/);assert.match(prompt,/bright ideas still matter more to her than gold/);
  assert.match(prompt,/not facts about Lloyd/);assert.match(prompt,/Do not invent additional origin stories/);
  assert.match(prompt,/avoid repeating a recent joke/);assert.match(prompt,/Do not end every answer with a question/);
  assert.match(prompt,/not to force novelty in every answer/);assert.match(prompt,/recurring motifs are fine/);
  assert.match(prompt,/sourceIds \[\] and destination none/);
  assert.match(prompt,lang==='ja'?/Reply in natural Japanese/:/Reply in English/);
  assert.equal(body.max_tokens,1900);assert.equal(body.temperature,.7);assert.equal(body.stream,false);assert(!('tools' in body));
 }
});

test('greeting suppression also applies to empty history and focused explanations that omit history',()=>{
 for(const lang of ['en','ja'])for(const focused of [false,true]){
  const history=focused?[{role:'user',content:'Show me the project'},{role:'assistant',content:'It is here.'}]:[];
  const body=modelRequest({...request,lang,history},{pages:[],view:focused?{focus:{sourceId:'project::s1'}}:{}});
  assert.match(body.messages[0].content,/Do not add another greeting/);
  assert.match(body.messages[0].content,/even when history is empty or a page changes/);
  assert.match(body.messages[0].content,/visitor explicitly says hello/);
  assert.equal(body.messages.length,3);assert.match(body.messages.at(-2).content,/CURRENT REPLY CONTRACT/);
 }
});

test('extended conversations distinguish backstory, current goals and future dreams without forced repetition',()=>{
 for(const lang of ['en','ja']){
  const prompt=personalityInstructions(lang);
  for(const key of ['origin','firstFlight','lanternKeeper','firstGuide','treasure','quietEvening','home','dailyGoals','bigDream','innerConflict','littlePreferences','relationships'])assert(yukiStory[key].length>100);
  assert.match(yukiStory.bigDream,/flying library/);assert.match(yukiStory.bigDream,/not something she already owns/);
  assert.match(yukiStory.relationships,/no invented shared history/);
  assert.match(prompt,/deepen that scene with a different relevant detail/);
  assert.match(prompt,/do not restart at hatching/);assert.match(prompt,/never change canon just to sound new/);
  assert.match(prompt,/past story events, present habits and hopes not yet fulfilled/);
  assert.match(prompt,/Do not force portfolio promotion/);assert.match(prompt,/4–6 natural sentences within the 2800-character limit/);
 }
});

test('fictional-personality response keeps its expression without unrelated guide links',()=>{
 const text='In my story, falling petals looked like snow. That is how I got my name!';
 const response=parseModel({response:{text,emotion:'delighted',gesture:'none',destination:'none',sourceIds:[]}},{pages:[{id:'project',title:'Museum',url:'/museum.html'}]});
 assert.equal(response.text,text);assert.equal(response.emotion,'delighted');assert.deepEqual(response.sources,[]);assert.equal(response.destination,'none');
});
