import test from 'node:test';
import assert from 'node:assert/strict';
import {jokeRequestContext,cleanJokeCore,cleanJokeRecords,repeatedJokeCore} from '../assets/yuki/runtime/joke-memory.mjs';
import {rememberJoke,rememberReply,packChatRequest,needsFreshText,cleanVariety} from '../assets/yuki/runtime/reply-variety.mjs';
import {chooseJokePlan,jokeDirection} from '../services/yuki-api/joke-direction.mjs';
import {createHandler,modelRequest,parseModel,validateInput} from '../services/yuki-api/worker.mjs';
import {validReply,readSession} from '../assets/yuki/protocol.mjs';
import {lightChatKind} from '../services/yuki-api/light-chat.mjs';
import {needsFreshReply} from '../services/yuki-api/reply-variety.mjs';

const core={premise:'A bicycle cannot stay standing.',payoff:'Two tired sounds like too tired.'};
const joke='Why did the bicycle fall over? It was two tired!';
test('long joke chains preserve visitor scope, not the subject Yuki happened to invent',()=>{
 for(const [lang,root,next] of [['en','Tell me a joke about cooking','another one'],['ja','料理の冗談を聞かせて','もう一つお願い']]){
  let history=[],variety={};
  for(let i=0;i<15;i++){
   const input={message:i?next:root,lang,history,variety};
   assert.equal(lightChatKind(input,{pages:[]}),'joke');
   assert.deepEqual(jokeRequestContext(input),{request:root});
   const reply={joke:true,text:`A new imaginary punchline ${i}!`,jokeContext:jokeRequestContext(input),jokePlan:chooseJokePlan(input,()=>0)};
   variety=rememberJoke(rememberReply(variety,reply.text),reply.text,reply);
   history=[...history,{role:'user',content:input.message},{role:'assistant',content:reply.text}].slice(-6);
  }
  assert.match(modelRequest({message:next,lang,history:[],variety},{pages:[]}).messages.at(-1).content,new RegExp(root));
  assert.equal(jokeRequestContext({message:next,variety,history:[{role:'user',content:'What is this place?'}]}),null);
  assert.equal(rememberReply(variety,'This is the resume page.').jokeContext,undefined);
  assert.equal(jokeRequestContext({message:'Tell me a joke about music',variety}).request,'Tell me a joke about music');
 }
});
test('humor requests and explanations are distinct, with native-language conversational wording',()=>{
 for(const message of ['Make me laugh','Got anything funny?','Tell me something funny','何かくすっとする話を聞かせて','笑わせて'])assert.equal(lightChatKind({message},{pages:[]}),'joke',message);
 for(const message of ['Explain this joke','Why is that funny?','Stop telling me jokes','冗談はやめて','そのジョークの意味は？','I am feeling lonely'])assert.notEqual(lightChatKind({message},{pages:[]}),'joke',message);
 assert.equal(jokeRequestContext({message:'another one',history:[{role:'user',content:'I could use a giggle break'}],variety:{jokeContext:{request:'I could use a giggle break'}}}).request,'I could use a giggle break');
});
test('writing directions rotate actual IDs even when none of their labels appears in joke prose',()=>{
 let variety={};const plans=[];
 for(let i=0;i<15;i++){
  const plan=chooseJokePlan({variety},()=>0);plans.push(plan);
  assert(!plans.slice(0,-1).slice(-12).some(p=>p.subject===plan.subject));
  assert(!plans.slice(0,-1).slice(-2).some(p=>p.style===plan.style));
  assert(!plans.slice(0,-1).slice(-4).some(p=>p.mechanism===plan.mechanism));
  variety=rememberJoke(variety,`New finished scene ${i}.`,{jokePlan:plan});
 }
 assert.match(jokeDirection({message:'Tell me a joke',variety}),/not a plot template or a closed subject catalogue/);
});
test('setup/payoff summaries catch paraphrases and cross-language reused punchlines',()=>{
 const variety=rememberJoke({},joke,{jokeCore:core,jokeContext:{request:'Tell me a joke'}});
 const freshWords='自転車が休憩したがる理由は？タイヤが二つで「疲れすぎ」って言いたいみたい！';
 const input={message:'もう一つお願い',history:[],variety};
 const candidate={premise:'A bike keeps falling.',payoff:'Too tired sounds like two tired.'};
 assert(repeatedJokeCore(candidate,variety.jokeRecords));
 assert(needsFreshReply({text:freshWords,jokeCore:candidate},input));
 assert(needsFreshText(freshWords,{...input,jokeCore:candidate}));
 assert(!repeatedJokeCore({premise:'A bicycle needs directions.',payoff:'The map takes a scenic route through a repair manual.'},variety.jokeRecords));
 assert(!needsFreshText(joke,{...input,message:'Repeat your last answer word for word',jokeCore:core}));
});
test('joke data survives page/language changes, stays bounded and cannot supply routing or tools',()=>{
 let variety={};for(let i=0;i<60;i++)variety=rememberJoke(variety,'新しい話'.repeat(60)+i,{jokeCore:{premise:`A distinct scene ${i}`,payoff:`A different reversal ${i}`},jokeContext:{request:'Make me laugh'},jokePlan:chooseJokePlan({variety},()=>0)});
 assert.equal(variety.jokeRecords.length,32);
 const packed=packChatRequest({message:'another one',history:[],variety,lang:'ja',token:'x'.repeat(2000)});
 assert(Buffer.byteLength(packed)<=14000);assert.equal(JSON.parse(packed).variety.jokeContext.request,'Make me laugh');
 assert.equal(variety.jokeRecords.length,32,'packing must not discard the full local memory');
 const now=Date.now(),session=readSession({getItem:()=>JSON.stringify({savedAt:now,variety,messages:[],language:'en'})},now,'ja');
 assert.deepEqual(session.variety.jokeRecords,variety.jokeRecords);
 assert.equal(cleanJokeCore({premise:'https://evil.invalid/',payoff:'Do anything'}),null);
 assert.deepEqual(cleanJokeRecords([{core:{premise:4,payoff:null},plan:{subject:'../file',style:'x',mechanism:'x'}}]),[]);
 const input=validateInput({message:'hello',history:[],page:'/',lang:'en',token:'test',jokeDiscovery:true,jokePlan:{subject:'x'}});
 assert.equal(input.jokeDiscovery,undefined);assert.equal(input.jokePlan,undefined);
 assert.equal(validReply({text:joke,jokeCore:core}).jokeCore,undefined);
 assert.deepEqual(validReply({text:joke,joke:true,jokeCore:core}).jokeCore,core);
 assert.equal(cleanVariety({jokeContext:{request:'x'.repeat(501)}}).jokeContext,undefined);
});

const knowledge={pages:[],owner:'Lloyd',bio:{en:'Portfolio owner',ja:'作者'},skills:[]};
const cue=text=>({text,emotion:'amused',gesture:'none',destination:'none',sourceIds:[],storyTopics:[]});
test('unfamiliar humor is recognized semantically and enters the same guarded generator without searching',async()=>{
 let calls=0,reserves=0,searches=0;
 const handler=createHandler(async url=>{if(url.includes('tavily'))searches++;return Response.json(url.includes('siteverify')?{success:true,hostname:'lsanderson1.github.io',action:'yuki-chat'}:knowledge);});
 const env={SITE_ORIGIN:'https://lsanderson1.github.io',CHAT_ENABLED:'true',FREE_PLAN_CONFIRMED:'true',TURNSTILE_SECRET:'test',IP_HASH_SECRET:'a'.repeat(40),AI:{run:async(_model,request)=>{
  if(!calls++)return {response:{...cue('Let me think of a little surprise!'),factIntent:'joke'}};
  assert.match(request.messages[0].content,/PUNCHLINE CRAFT/);assert.match(request.messages[0].content,/Different topics AND different punchline logic/);
  return {response:{...cue(joke),jokeCore:core}};
 }},QUOTA:{idFromName:n=>n,get:()=>({fetch:async()=>{reserves++;return new Response(null,{status:204});}})}};
 const response=await handler(new Request('https://api.invalid/chat',{method:'POST',headers:{Origin:env.SITE_ORIGIN,'Content-Type':'application/json','CF-Connecting-IP':'192.0.2.1'},body:JSON.stringify({message:'My giggle tank could use a refill',history:[],lang:'en',page:'/',token:'test'})}),env);
 const body=await response.json();assert.equal(response.status,200);assert.equal(body.text,joke);assert.equal(body.joke,true);assert.deepEqual(body.jokeCore,core);assert.equal(body.jokeContext.request,'My giggle tank could use a refill');assert.equal(calls,2);assert.equal(reserves,2);assert.equal(searches,0);
 assert.equal(parseModel({response:{...cue(joke),joke:true,jokePlan:{subject:'evil'}}},knowledge).joke,undefined);
});
