import test from 'node:test';
import assert from 'node:assert/strict';
import {unfinishedReply,unfinishedNotice} from '../assets/yuki/runtime/reply-completion.mjs';
import {completionRequest,parseCompletion,completeRevision,incompleteAnswer} from '../services/yuki-api/reply-completion.mjs';
import {createHandler,modelRequest,validateInput,CLOUDFLARE_MODEL} from '../services/yuki-api/worker.mjs';
import {parseTranslations} from '../services/yuki-api/conversation-translation.mjs';
import {rememberReply} from '../assets/yuki/runtime/reply-variety.mjs';

const cutoff='Lloyd connects a command-line workflow with Blender. It is a way of combining different technologies to create a';
const full='Lloyd connects a command-line workflow with Blender. Commands start the processing, and Blender carries out the supported operation. That gives the workflow a clear handoff between the two parts.';
const cue=(text,patch={})=>({text,emotion:'thoughtful',gesture:'none',destination:'none',sourceIds:[],storyTopics:[],...patch});
const input={message:'How does this workflow work?',history:[],lang:'en',page:'/',token:'fixture'};
const site={owner:'Lloyd',bio:{en:'Developer',ja:'開発者'},pages:[{id:'home',lang:'en',url:'/',title:'Home',text:'Lloyd connects a command-line workflow with Blender.'}]};
const json=(v,status=200)=>new Response(JSON.stringify(v),{status,headers:{'Content-Type':'application/json'}});
function fixture({outputs=[cue(cutoff),{text:full}],quotas=[204,204],afterCall=()=>{}}={}){
 const calls=[],reservations=[],network=[];
 const handler=createHandler(async url=>{network.push(url);if(url.includes('siteverify'))return json({success:true,hostname:'lsanderson1.github.io',action:'yuki-chat'});if(url.endsWith('knowledge.json'))return json(site);throw Error('Unexpected network call');});
 const env={SITE_ORIGIN:'https://lsanderson1.github.io',CHAT_ENABLED:'true',FREE_PLAN_CONFIRMED:'true',TURNSTILE_SECRET:'fixture',IP_HASH_SECRET:'f'.repeat(40),AI:{run:async(name,body)=>{calls.push({name,body});afterCall();const output=outputs[calls.length-1];if(output instanceof Error)throw output;return {response:output,finish_reason:'stop'};}},QUOTA:{idFromName:n=>n,get:()=>({fetch:async(url,options)=>{reservations.push(JSON.parse(options.body));return new Response(null,{status:quotas[reservations.length-1]??500});}})}};
 const request=(patch={})=>new Request('https://yuki.example/chat',{method:'POST',headers:{Origin:env.SITE_ORIGIN,'Content-Type':'application/json','CF-Connecting-IP':'192.0.2.1'},body:JSON.stringify({...input,...patch})});
 return {handler,env,request,calls,reservations,network};
}

test('detects the observed cutoff and unfinished EN/JA explanations without inventing an ending',()=>{
 for(const text of [cutoff,'This works by connecting the',full+' For example:',full+' Another impor','仕組みを説明するよ。小さな仕組みを一つずつつないで画面の動きを実現することで','An example:\n```js\nconst x = 1;'])assert(unfinishedReply(text),text);
 for(const text of [full,'小さな仕組みをつないで動いているんだ。たとえば、移動と絵の切り替えは別々に進むよ！','Yes','Definitely! 🐉','She said, “That makes sense.”','It uses version 3.14.',full+'\n- Flight timing\n- Animation playback','An example:\n```js\nconst x = 1;\n```','{"text":"A requested JSON example"}'])assert(!unfinishedReply(text),text);
});

test('one bounded quality rewrite replaces an unfinished stop response, not by trimming it',async()=>{
 const f=fixture(),response=await f.handler(f.request(),f.env),reply=await response.json();
 assert.equal(response.status,200);assert.equal(reply.text,full);assert.equal(f.calls.length,2);assert.equal(f.reservations.length,2);
 assert(f.calls.every(c=>c.name===CLOUDFLARE_MODEL));assert.equal(f.calls[1].body.max_tokens,1200);assert(!('maxLength' in f.calls[1].body.response_format.json_schema.properties.text));
 assert.match(f.calls[1].body.messages[0].content,/Rewrite the WHOLE answer/);assert.match(f.calls[1].body.messages[0].content,/not a continuation/);assert(!('tools' in f.calls[1].body));assert.equal(f.network.length,2);
});

test('failed, malformed, incompatible or still unfinished repairs return an honest notice with no retry loop',async()=>{
 for(const setup of [{quotas:[204,429]},{quotas:[204,500]},{outputs:[cue(cutoff),new Error('Provider unavailable')]},{outputs:[cue(cutoff),{}]},{outputs:[cue(cutoff),cue(cutoff)]},{outputs:[cue(cutoff),cue(full,{destination:'resume'})]}]){
  const f=fixture(setup),response=await f.handler(f.request(),f.env),reply=await response.json();assert.equal(response.status,200);assert.equal(reply.text,unfinishedNotice());assert.equal(reply.destination,'none');assert.deepEqual(reply.sources,[]);assert(f.calls.length<=2);assert.equal(f.reservations.length,2);
 }
 const f=fixture({quotas:[204,429]}),reply=await (await f.handler(f.request({lang:'ja',message:'この仕組みはどう動く？'}),f.env)).json();assert.equal(reply.text,unfinishedNotice('ja'));
});

test('complete ordinary replies use one call; a broken optional variety revision cannot replace them',async()=>{
 const normal=fixture({outputs:[cue(full)]});assert.equal((await (await normal.handler(normal.request(),normal.env)).json()).text,full);assert.equal(normal.calls.length,1);
 const f=fixture({outputs:[cue(full),cue(cutoff)]}),reply=await (await f.handler(f.request({variety:rememberReply(null,full)}),f.env)).json();assert.equal(reply.text,full);assert.equal(f.calls.length,2);
});

test('completion consumes no further requests after cancellation or the time budget',async t=>{
 const controller=new AbortController(),canceled=fixture({afterCall:()=>controller.abort()});
 const response=await canceled.handler(new Request(canceled.request(),{signal:controller.signal}),canceled.env);assert.equal((await response.json()).text,unfinishedNotice());assert.equal(canceled.calls.length,1);assert.equal(canceled.reservations.length,1);
 let now=Date.now();t.mock.method(Date,'now',()=>now);const slow=fixture({afterCall:()=>now+=31000});assert.equal((await (await slow.handler(slow.request(),slow.env)).json()).text,unfinishedNotice());assert.equal(slow.calls.length,1);assert.equal(slow.reservations.length,1);
});

test('provider errors are not retried, and a denied initial reservation does not call the model',async()=>{
 const failed=fixture({outputs:[new Error('provider')]});assert.equal((await failed.handler(failed.request(),failed.env)).status,503);assert.equal(failed.calls.length,1);
 const denied=fixture({quotas:[429]});assert.equal((await denied.handler(denied.request(),denied.env)).status,429);assert.equal(denied.calls.length,0);
});

test('wrong language and internal loops share one bounded text-only repair without changing metadata',async()=>{
 for(const bad of ['これは小さな図書館の夢のお話だよ。本を読む場所を作りたいんだ。',full+' '+full]){
  const f=fixture({outputs:[cue(bad),{text:full}]}),response=await f.handler(f.request(),f.env),reply=await response.json();
  assert.equal(response.status,200);assert.equal(reply.text,full);assert.equal(f.calls.length,2);assert.equal(f.reservations.length,2);assert.equal(reply.emotion,'thoughtful');
  assert.deepEqual(f.calls[1].body.response_format.json_schema.required,['text']);assert.equal(f.calls[1].body.max_tokens,1900);
 }
});

test('bad language/loop repairs fail closed, never spend a third call or save a defective answer',async()=>{
 const wrong='これは小さな図書館の夢のお話だよ。本を読む場所を作りたいんだ。';
 for(const setup of [{outputs:[cue(wrong),{text:wrong}]},{outputs:[cue(full+' '+full),{text:full+' '+full}]},{outputs:[cue(wrong)],quotas:[204,429]}]){
  const f=fixture(setup),response=await f.handler(f.request(),f.env),reply=await response.json();
  assert.equal(response.status,502);assert.equal(reply.text,undefined);assert(f.calls.length<=2);assert.equal(f.reservations.length,2);
 }
});

test('Japanese on an English page and English on a Japanese page are accepted without repairs',async()=>{
 const japanese='空飛ぶ図書館を想像するとわくわくする！小さな本でも、知らない世界へ連れていってくれるんだ。';
 for(const [lang,message,text] of [['en','どんな夢がある？',japanese],['ja','What is your dream?',full]]){
  const f=fixture({outputs:[cue(text)]}),reply=await (await f.handler(f.request({lang,message}),f.env)).json();
  assert.equal(reply.text,text);assert.equal(f.calls.length,1);
 }
});

test('completion preserves evidence, identity, lore and navigation while discarding stale animation indices',()=>{
 const source={id:'web:1',url:'https://www.nasa.gov/lift',title:'Lift',text:'Wings deflect airflow.'},original={...cue(cutoff),sources:[source],storyTopics:['bigDream'],searchStatus:'used',beats:[{sentence:0,emotion:'thoughtful',gesture:'none'}]};
 const knowledge={pages:[],makingOf:{notes:['Verified implementation notes.']}},request=modelRequest(input,knowledge,{mode:'eligible'}),copy=JSON.stringify(request);
 const revision=completionRequest(request,original,knowledge,{entries:[source]},'en'),data=JSON.parse(revision.messages[1].content.replace(/\n\/no_think$/,''));
 assert.equal(JSON.stringify(request),copy);assert.equal(data.draft,cutoff);assert.deepEqual(data.evidence,[source]);assert(data.characterCanon.bigDream);assert.equal(data.makingOf,undefined);assert.match(revision.messages[0].content,/Do not add new sources or request a web search/);
 assert.deepEqual(revision.response_format.json_schema.required,['text']);assert.deepEqual(Object.keys(revision.response_format.json_schema.properties),['text']);
 const fixed=completeRevision(original,{...original,text:full});assert.equal(fixed.text,full);assert.equal(fixed.searchStatus,'used');assert.deepEqual(fixed.sources,original.sources);assert(!fixed.beats);
 for(const patch of [{emotion:'neutral'},{gesture:'talkOpen'},{sources:[]},{storyTopics:[]},{text:cutoff}])assert.equal(completeRevision(original,{...original,text:full,...patch}),original);
 assert(!unfinishedReply(incompleteAnswer('ja').text));
});

test('text-only completion cannot override metadata, leak reasoning or accept an incomplete envelope',()=>{
 const original={...cue(cutoff),sources:[{url:'/',title:'Home'}],beats:[{sentence:0,emotion:'thoughtful',gesture:'none'}]};
 const fixed=parseCompletion({choices:[{finish_reason:'stop',message:{content:JSON.stringify({text:full})}}]},original);
 assert.equal(fixed.text,full);assert.equal(fixed.emotion,original.emotion);assert.deepEqual(fixed.sources,original.sources);assert(!fixed.beats);
 for(const bad of [{response:{text:full,destination:'resume'}},{response:{text:cutoff}},{response:{text:full},finish_reason:'length'},{choices:[{finish_reason:'stop',message:{content:JSON.stringify({text:full}),refusal:'refused'}}]},{response:'<think>reasoning</think>'+JSON.stringify({text:full})},{response:{text:'a'.repeat(3500)+'.'}}])assert.throws(()=>parseCompletion(bad,original));
});

test('old assistant fragments are excluded from history, without altering visitor quotes',()=>{
 const clean=validateInput({...input,history:[{role:'assistant',content:cutoff},{role:'user',content:cutoff},{role:'assistant',content:full}]});assert.deepEqual(clean.history,[{role:'user',content:cutoff},{role:'assistant',content:full}]);
});

test('translations reject an unfinished assistant answer atomically but preserve visitor fragments',()=>{
 const items=[{id:'a',role:'assistant',text:full},{id:'u',role:'user',text:'What about the'}];
 assert.throws(()=>parseTranslations({response:{translations:[{id:'a',text:cutoff},{id:'u',text:'それについて'}]}},items),/Incomplete translation/);
 const translated=parseTranslations({response:{translations:[{id:'a',text:'二つの仕組みをつないで動かしているんだ。小さな受け渡しが大切だよ。'},{id:'u',text:'それについて'}]}},items);assert.equal(translated[1].text,'それについて');
});

test('fuller default guidance retains personality, requested depth and output headroom',()=>{
 for(const lang of ['en','ja']){const request=modelRequest({...input,lang},{pages:[]});assert.match(request.messages[0].content,/6–8 natural sentences/);assert.match(request.messages[0].content,/6–8 clear sentences/);assert.match(request.messages[0].content,/within 2400 characters/);assert.equal(request.max_tokens,1900);assert.equal(request.response_format.json_schema.properties.text.maxLength,2800);}
});
