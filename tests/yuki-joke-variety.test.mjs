import test from 'node:test';
import assert from 'node:assert/strict';
import {cleanVariety,rememberJoke,needsFreshText,packChatRequest} from '../assets/yuki/runtime/reply-variety.mjs';
import {recentAnswers} from '../services/yuki-api/reply-variety.mjs';
import {jokeDirection} from '../services/yuki-api/joke-direction.mjs';
import {modelRequest,createHandler,parseModel} from '../services/yuki-api/worker.mjs';

const old='Why did the bicycle fall over? It was two tired!';
test('joke memory catches older setups and payoffs even when ordinary history and recall omit them',()=>{
 let variety=rememberJoke({},old);for(let i=0;i<20;i++)variety=rememberJoke(variety,'A different older joke about a subject numbered '+i+'.');
 const input={message:'Tell me another joke',history:[],memory:[],variety};
 assert(needsFreshText('Why did the bicycle fall over? It was two tired! I imagine a tiny repair shop.',input));
 assert(needsFreshText('Why was the bicycle unable to stand up? Because it was two tired!',input));
 assert(recentAnswers(input).includes(old));assert.equal(variety.jokes.length,21);
 assert(!needsFreshText('A penguin was looking for a map of the library. The librarian pointed out that it was a very small library.',input));
 assert(!needsFreshText(old,{...input,message:'Repeat your last answer word for word.'}));
 const japanese={message:'もう一つ冗談を聞かせて',history:[],variety:rememberJoke({},'パンはパンでも、食べられないパンは？フライパン！')};
 assert(needsFreshText('パンはパンでも、食べるととってもおいしいパンは？メロンパン！',japanese));
 assert(!needsFreshText('「アルミ缶の上にあるミカン」って、きれいに並んだところを想像しちゃった。',japanese));
});
test('joke history is bounded and request packing never changes the current visitor question',()=>{
 let variety={};for(let i=0;i<40;i++)variety=rememberJoke(variety,'冗談の例'.repeat(150)+i);
 assert.equal(variety.jokes.length,24);assert.equal(cleanVariety({jokes:[null,4,'short','x'.repeat(1201)]}).jokes,undefined);
 const request={message:'別の冗談を教えて',variety,history:[],lang:'ja',page:'/',token:'test'};
 const packed=packChatRequest(request);assert(Buffer.byteLength(packed)<=14000);assert.equal(JSON.parse(packed).message,request.message);
 assert.equal(variety.jokes.length,24,'packing does not mutate local history');assert(JSON.parse(packed).variety.jokes.length<24);
});
test('fresh joke directions vary generation rather than serving canned jokes, and explicit subjects take priority',()=>{
 const input={message:'Tell me a joke',lang:'en',history:[],variety:{jokes:[old]}};
 assert.notEqual(jokeDirection(input,()=>0),jokeDirection(input,()=>.99));assert.match(jokeDirection(input,()=>0),/requested topic or form/);
 assert.match(jokeDirection({...input,lang:'ja'},()=>0),/相手が指定した話題/);
 const p=modelRequest(input,{pages:[]});assert.match(p.messages[0].content,/Why did the bicycle/);assert.match(p.messages[1].content,/FRESH WRITING DIRECTION/);
 assert.match(p.messages[0].content,/fresh small observational scene/);assert.equal(p.max_tokens,1900);
 assert.equal(jokeDirection({message:'What is your home?'}),'');
});
test('worker rejects an old joke after one bounded repair and only marks successful jokes',async()=>{
 const cue=text=>({text,emotion:'amused',gesture:'none',destination:'none',sourceIds:[],storyTopics:[]});
 const fresh='A little cloud asked for a window seat. The plane was already sitting in its living room! I think that cloud has a very roomy house.';
 for(const revised of [old,fresh]){
  let calls=0,reservations=0;const handler=createHandler(async url=>Response.json(url.includes('siteverify')?{success:true,hostname:'lsanderson1.github.io',action:'yuki-chat'}:{pages:[],owner:'Lloyd',bio:{en:'Portfolio owner.',ja:'作品の作者。'},skills:[]}));
  const env={SITE_ORIGIN:'https://lsanderson1.github.io',CHAT_ENABLED:'true',FREE_PLAN_CONFIRMED:'true',TURNSTILE_SECRET:'test',IP_HASH_SECRET:'a'.repeat(40),AI:{run:async()=>({response:cue(calls++?revised:old)})},QUOTA:{idFromName:n=>n,get:()=>({fetch:async()=>{reservations++;return new Response(null,{status:204});}})}};
  const request=new Request('https://api.invalid/chat',{method:'POST',headers:{Origin:env.SITE_ORIGIN,'Content-Type':'application/json','CF-Connecting-IP':'192.0.2.1'},body:JSON.stringify({message:'Tell me another joke',history:[],lang:'en',page:'/',token:'test',variety:rememberJoke({},old)})});
  const response=await handler(request,env),value=await response.json();
  assert.equal(calls,2);assert.equal(reservations,2);
  if(revised===old){assert.equal(response.status,502);assert.equal(value.reference,'YUKI_VARIETY');assert.equal(value.joke,undefined);}
  else{assert.equal(response.status,200);assert.equal(value.text,fresh);assert.equal(value.joke,true);}
 }
 assert.equal(parseModel({response:{...cue(fresh),joke:true}},{pages:[]}).joke,undefined,'model cannot forge history classification');
});
