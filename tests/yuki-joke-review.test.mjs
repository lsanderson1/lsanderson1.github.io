import test from 'node:test';
import assert from 'node:assert/strict';
import {createHandler,modelRequest,validateInput,runModel,CLOUDFLARE_HUMOR_MODEL} from '../services/yuki-api/worker.mjs';
import {hasJokeComparison,jokeReviewRequest,parseJokeReview} from '../services/yuki-api/joke-review.mjs';
import {cleanJokeCore,repeatedJokeCore,jokeRequestContext} from '../assets/yuki/runtime/joke-memory.mjs';
import {rememberJoke,rememberReply,packChatRequest,needsFreshText} from '../assets/yuki/runtime/reply-variety.mjs';
import {validReply,readSession} from '../assets/yuki/protocol.mjs';

const hedgehog="A sleepy hedgehog tried to tuck itself into a teacup for a nap. But every time it curled up, the cup tipped over and said, 'I'm not a bed—I'm for tea!' The hedgehog blinked, then whispered, 'Oh! So you're not sleepy, you're just steaming!' and went to find a soft leaf instead.";
const moon="A little bird tried to sing a lullaby to the moon so it could go to sleep. The moon said, 'I'm not tired—I'm just reflecting!' The bird chirped, 'Oh! So you're not sleepy, you're just shiny!' and went to sing to the stars instead.";
const pattern='Character treats an object as sleepy; object corrects its purpose; character says not sleepy just its ordinary property and goes elsewhere.';
const core={premise:'A bird tries to put the moon to sleep.',payoff:'Not sleepy, just shiny.',pattern};
const fresh='A librarian asked a dragon to keep its voice down. It whispered, “Of course. Which shelf should I put it on?” I hope the library has a very small bookmark for that whisper!';
const newCore={premise:'A librarian asks a visitor to keep its voice down.',payoff:'The visitor tries to put its voice on a lower shelf.',pattern:'Visitor interprets a volume instruction as physically storing a voice at a lower height.'};
const cue=text=>({text,emotion:'amused',gesture:'none',destination:'none',sourceIds:[],sources:[],storyTopics:[]});
const rating=(candidate,duplicate=false)=>({candidate,duplicate,coherent:true,native:true,reason:'Setup and payoff comparison.'});
const reviewed=()=>({assessments:[rating(0,true),rating(1)]});
const draft=()=>({...cue(moon),jokeCore:core,jokeAlternatives:[{text:fresh,jokeCore:newCore}]});
const base={message:'Can you tell me another joke?',lang:'en',page:'/yuki/',token:'test',history:[],variety:rememberJoke({},hedgehog)};

test('legacy joke prose gets a causal comparison even without saved summaries or lexical similarity',()=>{
 assert(needsFreshText(moon,base),'the repeated correction punchline is rejected even without summaries');
 assert(hasJokeComparison(base));
 const req=jokeReviewRequest(modelRequest(base,{pages:[]}),cue(moon),base);
 const data=JSON.parse(req.messages.at(-1).content.replace(/\n\/no_think$/,''));
 assert(data.priorAnswers.includes(hedgehog));assert.equal(data.candidates[0].text,moon);
 assert.match(req.messages[0].content,/same.*sequence|SAME sequence/);
 assert.match(req.messages[0].content,/not just the same genre/);
 assert.deepEqual(req.response_format.json_schema.required,['assessments']);
 assert.equal(req.yukiTask,'joke-review');
});

test('canonical patterns catch translated, renamed jokes but not all jokes sharing a broad mechanism',()=>{
 const older={premise:'ハリネズミがカップで昼寝しようとする。',payoff:'眠いのではなく湯気が出ている。',pattern};
 assert(repeatedJokeCore(core,[{core:older}]));
 assert(!repeatedJokeCore(newCore,[{core:older}]));
 const words={...core,pattern:'Object corrects its purpose when character treats it as sleepy; character goes elsewhere after saying not sleepy just its ordinary property.'};
 assert(repeatedJokeCore(words,[{core:older}]));
 assert.deepEqual(cleanJokeCore({premise:'An old setup',payoff:'An old payoff'}),{premise:'An old setup',payoff:'An old payoff'});
 assert.equal(cleanJokeCore({...core,pattern:'https://evil.invalid/'}).pattern,undefined);
});

test('fresh reviewed core survives session/language changes and bounded request packing',()=>{
 const reply=validReply({...cue(fresh),joke:true,jokeCore:newCore});
 const variety=rememberJoke(rememberReply(base.variety,fresh),fresh,reply),now=Date.now();
 const session=readSession({getItem:()=>JSON.stringify({savedAt:now,messages:[],variety,language:'en'})},now,'ja');
 assert.deepEqual(session.variety.jokeRecords.at(-1).core,newCore);
 const packed=packChatRequest({...base,lang:'ja',variety});assert(Buffer.byteLength(packed)<=14000);
 assert.deepEqual(validateInput(JSON.parse(packed)).variety.jokeRecords.at(-1).core,newCore);
});

test('review selects only supplied text and cannot modify navigation, citations or expression',()=>{
 const original={...cue(moon),jokeCore:core,jokeCandidates:[{text:fresh,jokeCore:newCore}],beats:[{at:0,emotion:'amused'}]};
 const output=parseJokeReview({response:reviewed()},original);
 assert.equal(output.text,fresh);assert.deepEqual(output.jokeCore,newCore);assert.equal(output.beats,undefined);
 for(const k of ['destination','emotion','gesture','sources'])assert.deepEqual(output[k],original[k]);
 assert.throws(()=>parseJokeReview({response:{assessments:[rating(0,true),rating(1,true)]}},original));
 assert.throws(()=>parseJokeReview({response:{assessments:[rating(0),rating(0)]}},original));
 assert.throws(()=>parseJokeReview({response:{...reviewed(),destination:'resume'}},original));
 assert.throws(()=>parseJokeReview({response:{assessments:[rating(0),rating(3)]}},original));
 assert.throws(()=>parseJokeReview({choices:[{finish_reason:'length',message:{content:JSON.stringify(reviewed())}}]},original));
 assert.equal(parseJokeReview({response:{assessments:[rating(0),rating(1)]}},original).text,moon);
 assert.equal(parseJokeReview({response:{assessments:[rating(0),rating(1)]}},original,c=>c.text!==moon).text,fresh);
 assert.throws(()=>parseJokeReview({response:reviewed()},original,()=>false));
});

function fixture(outputs,quota=[204,204]){
 const calls=[],reserves=[];
 const handler=createHandler(async url=>Response.json(url.includes('siteverify')?{success:true,hostname:'lsanderson1.github.io',action:'yuki-chat'}:{pages:[],owner:'Lloyd',bio:{en:'Portfolio owner',ja:'制作者'},skills:[]}));
 const env={SITE_ORIGIN:'https://lsanderson1.github.io',CHAT_ENABLED:'true',FREE_PLAN_CONFIRMED:'true',TURNSTILE_SECRET:'test',IP_HASH_SECRET:'x'.repeat(40),AI:{run:async(_model,body)=>{calls.push(body);const out=outputs[calls.length-1];if(out instanceof Error)throw out;return {response:out};}},QUOTA:{idFromName:n=>n,get:()=>({fetch:async()=>{reserves.push(1);return new Response(null,{status:quota[reserves.length-1]??500});}})}};
 const send=(input=base)=>handler(new Request('https://api.invalid/chat',{method:'POST',headers:{Origin:env.SITE_ORIGIN,'Content-Type':'application/json','CF-Connecting-IP':'192.0.2.1'},body:JSON.stringify(input)}),env);
 return {send,calls,reserves};
}

test('worker reviews a lexically novel reskin, returns only the new joke, within two reserved calls',async()=>{
 const f=fixture([draft(),reviewed()]),res=await f.send(),body=await res.json();
 assert.equal(res.status,200,JSON.stringify(body));assert.equal(body.text,fresh);assert.equal(body.joke,true);
 assert.deepEqual(body.jokeCore,newCore);assert.equal(body.verdict,undefined);assert.equal(f.calls.length,2);assert.equal(f.reserves.length,2);
 assert.equal(f.calls[1].messages.length,2,'focused comparison, not another long generation prompt');
});

test('Japanese and mixed-language joke history get the same reviewed path',async()=>{
 const text='図書館でドラゴンが「声を小さくしてね」と言われた。「小さな箱に入れたらいい？」って首をかしげたんだ。ささやき声なら、栞の間に入りそう！';
 const candidate={...core,premise:'小鳥が月に子守歌を歌う。',payoff:'眠いのではなく光っている。'};
 const f=fixture([{...cue('月に子守歌を歌ったら「眠くないよ、光ってるだけ！」と言われたんだ。'),jokeCore:candidate,jokeAlternatives:[{text,jokeCore:newCore}]},reviewed()]);
 const res=await f.send({...base,lang:'ja',message:'ほかに笑える話ある？'}),body=await res.json();
 assert.equal(res.status,200,JSON.stringify(body));assert.equal(body.text,text);assert.equal(f.calls.length,2);
 assert.match(f.calls[1].messages[0].content,/Japanese with real native wordplay/);
});

test('denied, failed, unavailable and still-repeating reviews never leak a known or unchecked joke',async()=>{
 for(const [out,quota] of [[{assessments:[rating(0)]},[204,429]],[new Error('provider'),[204,204]],[{assessments:[rating(0,true)]},[204,204]],[{assessments:[rating(0)]},[204,204]]]){
  const variety=rememberJoke(base.variety,hedgehog,{jokeCore:{premise:'A hedgehog sleeps in a teacup.',payoff:'Not sleepy, just steaming.',pattern}});
  const f=fixture([{...cue(moon),jokeCore:core},out],quota),res=await f.send({...base,variety}),body=await res.json();
  assert.equal(res.status,502);assert.equal(body.reference,'YUKI_VARIETY');assert.equal(body.text,undefined);assert(f.calls.length<=2);
 }
});

test('ordinary joke explanations and explicitly requested repeats keep their original routes',()=>{
 const history=[{role:'user',content:'Tell me a joke'},{role:'assistant',content:hedgehog}];
 for(const [lang,message] of [['en','Explain that joke'],['en','What does this mean?'],['ja','さっきの冗談を説明して'],['ja','それはどういう意味？']]){
  const request=modelRequest({...base,history,lang,message},{pages:[]});
  assert(!['joke','joke-ja'].includes(request.yukiTask),message);
 }
 assert(!needsFreshText(hedgehog,{...base,history,message:'Repeat the last joke word for word'}));
});

test('different Japanese wording carries the humor activity instead of becoming a random fact',()=>{
 for(const message of ['違うネタでもう一つお願い','別のネタを聞かせて','ほかのネタある？']){
  const input={...base,message,lang:'ja',history:[{role:'user',content:'冗談を聞かせて'}],variety:{jokeContext:{request:'冗談を聞かせて'}}};
  assert.equal(jokeRequestContext(input).request,'冗談を聞かせて');
  assert.equal(modelRequest(input,{pages:[]}).yukiTask,'joke-ja');
 }
 assert.equal(jokeRequestContext({...base,message:'さっきのネタを説明して'}),null);
});

test('a broad genre alone is not enough for a deterministic duplicate verdict',()=>{
 const a={premise:'A scarecrow wins an award.',payoff:'Outstanding in his field.',pattern:'Someone interprets a figurative phrase literally.'};
 const b={premise:'A student carries a ladder to class.',payoff:'Going to high school.',pattern:'Someone interprets a figurative phrase literally.'};
 assert(!repeatedJokeCore(a,[{core:b}]));
});

test('both languages use the established humor model for one bounded review, never a new provider',async()=>{
 for(const lang of ['en','ja']){
  let calls=0;
  const request=jokeReviewRequest(modelRequest({...base,lang},{pages:[]}),cue(moon),{...base,lang});
  await runModel({run:async(model,body)=>{calls++;assert.equal(model,CLOUDFLARE_HUMOR_MODEL);assert.equal(body.max_tokens,1200);assert.equal(body.yukiTask,undefined);assert.equal(body.response_format.json_schema.name,'yuki_joke_review');return {}; }},request);
  assert.equal(calls,1);
 }
});

test('a mistaken fresh verdict cannot release the reported correction plot, even across languages',async()=>{
 for(const [lang,text] of [['en',moon],['ja','小鳥が月に子守歌を歌った。月は「眠いんじゃないよ、光っているだけ！」と言った。小鳥は星に歌いに行った。']]){
  const replacement=lang==='ja'?'パンはパンでも食べられないパンは？フライパン！名前だけじゃ、おやつを選べないね。':fresh;
  const f=fixture([{...cue(text),jokeAlternatives:[{text:replacement,jokeCore:newCore}]},{assessments:[rating(0),rating(1)]}]);
  const response=await f.send({...base,lang,message:lang==='ja'?'別のジョークを聞かせて':base.message}),body=await response.json();
  assert.equal(response.status,200,JSON.stringify(body));assert.equal(body.text,replacement);
  assert.equal(body.jokeCandidates,undefined);assert.equal(body.jokeAlternatives,undefined);assert.equal(body.assessments,undefined);
 }
});
