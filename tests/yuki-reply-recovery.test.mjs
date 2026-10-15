import test from 'node:test';
import assert from 'node:assert/strict';
import {createHandler,parseModel,modelRequest,selectKnowledge,runModel,CLOUDFLARE_HUMOR_MODEL,CLOUDFLARE_TRANSLATION_MODEL} from '../services/yuki-api/worker.mjs';
import {unfinishedReply} from '../services/yuki-api/reply-completion.mjs';
const resume={id:'resume',url:'/resume.html',lang:'en',title:'Resume',summary:'Lloyd’s skills and education.',text:'Computer Science and Japanese studies. Programming and game development.',sections:[{id:'s0',title:'Education',anchor:'education',text:'Lloyd studied Computer Science and Japanese.'}]};
const knowledge={owner:'Lloyd Sanderson',bio:{en:'Portfolio owner',ja:'作者'},skills:[],pages:[resume,{...resume,lang:'ja',url:'/ja/resume.html',title:'プロフィール'}]};
const text="This is Lloyd’s résumé page. It brings together his education and skills, including programming and game development. I like having those details in one little place to explore!";
const cue={text,emotion:'neutral',gesture:'talkExplain',destination:'none',sourceIds:['resume'],storyTopics:[],webQuery:''};
function fixture(outputs){
 let calls=0,reservations=0;const requests=[];
 const handler=createHandler(async url=>Response.json(url.includes('siteverify')?{success:true,hostname:'lsanderson1.github.io',action:'yuki-chat'}:knowledge));
 const env={SITE_ORIGIN:'https://lsanderson1.github.io',CHAT_ENABLED:'true',FREE_PLAN_CONFIRMED:'true',TURNSTILE_SECRET:'test',IP_HASH_SECRET:'a'.repeat(40),AI:{run:async(model,request)=>{requests.push(request);const value=outputs[Math.min(calls++,outputs.length-1)];if(value instanceof Error)throw value;return value;}},QUOTA:{idFromName:n=>n,get:()=>({fetch:async()=>{reservations++;return new Response(null,{status:204});}})}};
 return {requests,run:()=>handler(new Request('https://api.invalid/chat',{method:'POST',headers:{Origin:env.SITE_ORIGIN,'Content-Type':'application/json','CF-Connecting-IP':'192.0.2.1'},body:JSON.stringify({message:'what is this place',history:[],lang:'en',page:'/resume.html',token:'test'})}),env),counts:()=>({calls,reservations})};
}
test('the exact reported page question recovers completed malformed JSON once, not a generic immediate error',async()=>{
 const f=fixture([{response:'{"text":"This is the resume page."'}, {response:cue}]);
 const response=await f.run(),body=await response.json();assert.equal(response.status,200);assert.equal(body.text,text);assert.deepEqual(f.counts(),{calls:2,reservations:2});
 assert(f.requests[1].messages.some(m=>m.content.includes('RESPONSE FORMAT REPAIR')));assert.equal(body.sources[0].url,'/resume.html');
});
test('format recovery does not retry outages or refusals, and does not add a second quality repair',async()=>{
 for(const bad of [new Error('provider unavailable'),{error:'provider rejected'},{choices:[{finish_reason:'stop',message:{refusal:'Not available'}}]}]){
  const f=fixture([bad,{response:cue}]),response=await f.run();assert.notEqual(response.status,200);assert.deepEqual(f.counts(),{calls:1,reservations:1});
 }
 const f=fixture([{response:'broken JSON'},{response:{...cue,text:'これはロイドのページだよ。詳しい説明がここにあるよ。'}}]);
 assert.notEqual((await f.run()).status,200);assert.deepEqual(f.counts(),{calls:2,reservations:2});
});
test('verified inline citation markers cannot masquerade as an unfinished sentence or leak internal IDs',()=>{
 const reply=parseModel({response:{...cue,text:text+' [sourceId:resume]'}},knowledge);
 assert.equal(reply.text,text);assert(!unfinishedReply(reply.text));assert.equal(reply.sources[0].url,'/resume.html');
 const web={mode:'results',entries:[{id:'web:1',title:'Evidence',url:'https://example.org/article'}]};
 const sourced=parseModel({response:{...cue,text:'The source describes this mechanism. [web:1]',sourceIds:['web:1']}},knowledge,web);
 assert.equal(sourced.text,'The source describes this mechanism.');assert.equal(sourced.sources.length,1);
 const unknown=parseModel({response:{...cue,text:'This is an unsupported marker. [sourceId:forged]'}},knowledge);
 assert(unknown.text.includes('forged'),'Unknown IDs are not silently blessed as checked sources');
});
test('page overviews use focused EN/JA routes and do not duplicate evidence or include unrelated garden lore',async()=>{
 for(const lang of ['en','ja']){
  const input={message:lang==='ja'?'ここはどんな場所？':'what is this place',lang,page:lang==='ja'?'/ja/resume.html':'/resume.html',history:[]};
  const selected=selectKnowledge(knowledge,input),request=modelRequest(input,selected,{mode:'eligible'});
  assert.equal(selected.view.wholePage,true);assert.equal(request.yukiTask,lang==='ja'?'page-answer-ja':'page-answer');
  const prompt=request.messages.map(m=>m.content).join('\n');assert.match(prompt,/actual page type\/title/);assert(!prompt.includes('cushioned dragon roost'));
  assert.equal(prompt.split('Lloyd studied Computer Science and Japanese.').length-1,1);
  let used;await runModel({run:async(model)=>{used=model;return {response:cue};}},request);
  assert.equal(used,lang==='ja'?CLOUDFLARE_TRANSLATION_MODEL:CLOUDFLARE_HUMOR_MODEL);assert.equal(request.max_tokens,1900);
 }
});
