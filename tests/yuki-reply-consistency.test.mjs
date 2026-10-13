import test from 'node:test';
import assert from 'node:assert/strict';
import {thirdPersonSelf} from '../assets/yuki/runtime/self-narration.mjs';
import {translationVoiceNeedsRepair,parseTranslations} from '../services/yuki-api/conversation-translation.mjs';
import {createHandler,runModel,initialInferenceTimeout,CLOUDFLARE_TRANSLATION_MODEL} from '../services/yuki-api/worker.mjs';
import {chatUnavailable} from '../assets/yuki/protocol.mjs';
import {searchInstructions} from '../services/yuki-api/web-search.mjs';

test('shared speaker guard checks quoted self names, abilities, feelings and possessions, not only home',()=>{
 for(const text of [
  '“Yuki” wears her glasses when she reads.',
  'Yuki often explores new ideas with visitors.',
  "Yuki's voice stays cheerful while she explains things.",
  "Lloyd taught Yuki to guide visitors through his projects.",
  "[Yuki's thoughts](https://example.org/) are full of curiosity.",
  "I'm Yuki. Her dream is a flying library.",
  "Click Yuki's Garden, where she keeps her treasures.",
  '「ゆき」は知らないことを学ぶのが好き。',
  'ゆきの気持ちはいつもわくわくでいっぱい。',
  'ユキの仕組みはロイドが作ったんだ。'
 ])assert(thirdPersonSelf(text),text);
 for(const text of [
  'I wear my glasses when I read. Lloyd gave them to me.',
  'Marie Curie studied radioactivity. Her work helped people understand atoms.',
  'A little dragon found a book. She opened it carefully.',
  'My friend said, “Yuki loves reading.” I like that description!',
  'The title reads “Yuki’s Garden”. It is my home.',
  "Tap the Yuki's Garden tab.",
  '「ゆきは読書が好き」と友達が言ったよ。',
  '「ゆきの庭」のタブを選んでね。',
  'わたしの仕組みはロイドが作ったんだ。'
 ])assert(!thirdPersonSelf(text),text);
});

test('assistant translations use the same speaker check while visitor wording stays untouched',()=>{
 const items=[{id:'a',role:'assistant',text:'I like learning.'},{id:'u',role:'user',text:'Yuki likes learning.'}];
 for(const [lang,bad,good,user] of [['en','“Yuki” learns new things.','I like learning new things.','Yuki learns new things.'],['ja','「ゆき」は学ぶのが好き。','新しいことを学ぶのが好き！','ゆきは学ぶのが好き。']]){
  const rows=text=>[{id:'a',text},{id:'u',text:user}];
  assert(translationVoiceNeedsRepair(rows(bad),items,lang));
  assert.throws(()=>parseTranslations({response:{translations:rows(bad)}},items,lang),/voice/);
  const result=parseTranslations({response:{translations:rows(good)}},items,lang);
  assert.equal(result[1].text,user);assert(!translationVoiceNeedsRepair(result,items,lang));
 }
});

const origin='https://lsanderson1.github.io';
const site={owner:'Lloyd',bio:{en:'Developer',ja:'開発者'},pages:[{id:'home',lang:'en',url:'/',title:'Home',text:'Lloyd builds software.'},{id:'home-ja',lang:'ja',url:'/ja/',title:'ホーム',text:'ロイドのポートフォリオ。'}]};
const cue=text=>({text,emotion:'delighted',gesture:'talkOpen',destination:'none',sourceIds:[],storyTopics:[],webQuery:''});
const json=value=>new Response(JSON.stringify(value));
function fixture(outputs,{search=false,quotas=[204,204,204]}={}){
 const calls=[],reservations=[],network=[];
 const handler=createHandler(async url=>{network.push(url);if(url.includes('siteverify'))return json({success:true,hostname:'lsanderson1.github.io',action:'yuki-chat'});if(url.endsWith('knowledge.json'))return json(site);if(url.includes('tavily'))return json({results:[{title:'Rainbows',url:'https://example.org/rainbows',content:'Refraction and reflection in raindrops separate sunlight into colors.'}]});throw Error('Unexpected network call');});
 const env={SITE_ORIGIN:origin,CHAT_ENABLED:'true',FREE_PLAN_CONFIRMED:'true',TURNSTILE_SECRET:'test',IP_HASH_SECRET:'test'.repeat(12),...(search?{WEB_SEARCH_ENABLED:'true',TAVILY_FREE_PLAN_CONFIRMED:'true',TAVILY_API_KEY:'test-key-placeholder',SEARCH_MONTHLY_LIMIT:'900',SEARCH_DAILY_LIMIT:'30',SEARCH_VISITOR_DAILY_LIMIT:'3'}:{}),QUOTA:{idFromName:n=>n,get:()=>({fetch:async(url)=>{reservations.push(url);return new Response(null,{status:quotas[reservations.length-1]??204});}})},AI:{run:async(name,body)=>{calls.push({name,body});const value=outputs[calls.length-1];if(value instanceof Error)throw value;return {response:value};}}};
 const request=(patch={})=>new Request('https://test.invalid/chat',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','CF-Connecting-IP':'192.0.2.1'},body:JSON.stringify({message:'Tell me about yourself.',history:[],page:'/',lang:'en',token:'test',webSearch:search,...patch})});
 return {handler,env,request,calls,reservations,network};
}

test('ordinary questions, follow-ups and page explanations repair the whole speaker voice once',async()=>{
 for(const [lang,message,history,bad,good] of [
  ['en','How did Lloyd make you?',[],"Yuki's animations use drawings. Lloyd made Yuki to help visitors.",'My animations use drawings. Lloyd made me to help visitors. I like how a little gesture can make an explanation feel friendly!'],
  ['en','What do you like about that?',[{role:'assistant',content:'We were talking about books.'}],'Yuki really loves learning. Yuki keeps a notebook of questions.','I really love learning. I keep a notebook of questions, because one little question can lead to a wonderful discovery!'],
  ['en','What is this page?',[],'This is Lloyd’s portfolio. Yuki helps visitors find his work.','This is Lloyd’s portfolio. I help visitors find his work, and I enjoy pointing out the ideas behind a project!'],
  ['ja','ゆきの仕組みを教えて。',[],'「ゆき」は絵を切り替えて動く。ゆきの動きはロイドが作った。','わたしは絵を切り替えて動くんだ。ロイドがつないでくれた動きで、小さな身ぶりも伝えられるのがうれしい！']
 ]){
  const f=fixture([cue(bad),{text:good}]),r=await f.handler(f.request({lang,message,history}),f.env),body=await r.json();
  assert.equal(r.status,200,JSON.stringify(body));assert.equal(body.text,good);assert.equal(body.emotion,'delighted');assert.equal(body.gesture,'talkOpen');assert.equal(body.destination,'none');assert.equal(f.calls.length,2);assert.equal(f.reservations.length,2);
  assert.equal(f.calls[1].name,CLOUDFLARE_TRANSLATION_MODEL);assert.equal(f.calls[1].body.max_tokens,1900);
  assert.match(f.calls[1].body.messages[0].content,/Keep every distinct supported explanation/);
  assert.equal(JSON.parse(f.calls[1].body.messages[1].content).draft,bad);
 }
});

test('sourced explanations keep their evidence while a personal aside is repaired',async()=>{
 const bad='Refraction and reflection in raindrops separate sunlight into colors. Yuki always enjoys imagining those colors.',good='Refraction and reflection in raindrops separate sunlight into colors. I enjoy imagining each raindrop as a tiny window for light!';
 const f=fixture([{...cue('I want to verify how rainbows form.'),webQuery:'rainbow refraction reflection'}, {...cue(bad),sourceIds:['web:1']},{text:good}],{search:true});
 const r=await f.handler(f.request({message:'How do rainbows form? Please check a source.'}),f.env),body=await r.json();
 assert.equal(r.status,200,JSON.stringify(body));assert.equal(body.text,good);assert.deepEqual(body.sources,[{title:'Rainbows',url:'https://example.org/rainbows'}]);assert.equal(f.calls.length,3);assert.equal(f.network.filter(u=>u.includes('tavily')).length,1);
});

test('a denied or still-third-person repair cannot leak a bad answer or loop',async()=>{
 const bad='Yuki often reads books in her garden.';
 for(const denied of [true,false]){
  const f=fixture([cue(bad),{text:bad}],{quotas:denied?[204,429]:[204,204]}),r=await f.handler(f.request(),f.env),body=await r.json();
  assert.equal(r.status,502);assert.equal(body.reference,'YUKI_REPLY');assert.equal(body.text,undefined);assert.equal(f.calls.length,denied?1:2);
 }
});

test('initial wait uses a shared bounded budget rather than whether search is switched on',async t=>{
 assert.equal(initialInferenceTimeout(1000,2000),22000);assert.equal(initialInferenceTimeout(1000,21000),18000);assert.equal(initialInferenceTimeout(1000,40000),1);
 const native=setTimeout,delays=[];t.mock.method(globalThis,'setTimeout',(fn,ms,...args)=>{delays.push(ms);return native(fn,ms,...args);});
 for(const search of [true,false]){
  const f=fixture([cue('Light changes direction when it enters water.')],{search}),r=await f.handler(f.request({message:'How does that work?',history:[{role:'assistant',content:'Light bends as it enters water.'}]}),f.env);
  assert.equal(r.status,200);assert.equal(f.calls.length,1);assert(delays.includes(22000));delays.length=0;
 }
 assert.match(searchInstructions({mode:'eligible'}),/CONTEXTUAL FOLLOW-UPS/);
 assert.match(searchInstructions({mode:'eligible'}),/familiar, stable definition, location or mechanism/);
});

test('provider failures and timeouts are safe, distinct, and never automatically retried',async()=>{
 let calls=0;
 await assert.rejects(()=>runModel({run:()=>{calls++;return new Promise(()=>{});}},{},5),{status:503,inferenceIssue:'timeout'});assert.equal(calls,1);
 for(const [issue,reference,status] of [['capacity','YUKI_MODEL_CAPACITY',503],['provider','YUKI_MODEL',503],['quota','YUKI_MODEL',429]]){
  const err=Object.assign(new Error('private provider data'),{code:issue==='capacity'?3040:issue==='quota'?3036:0}),f=fixture([err]),r=await f.handler(f.request({message:'Where is Syria?'}),f.env),body=await r.json();
  assert.equal(r.status,status);assert.equal(body.reference,reference);assert.equal(f.calls.length,1);assert(!JSON.stringify(body).includes('private'));
 }
 for(const lang of ['en','ja'])for(const ref of ['YUKI_MODEL','YUKI_MODEL_TIMEOUT','YUKI_MODEL_CAPACITY','YUKI_REPLY']){
  const notice=chatUnavailable('request',lang,ref);assert(notice.includes(ref));assert(!notice.includes('My AI chat isn’t available right now'));
 }
 assert.match(chatUnavailable('request','en','YUKI_MODEL_TIMEOUT'),/took too long/);
 assert.match(chatUnavailable('request','en','YUKI_MODEL_CAPACITY'),/busy/);
 assert(!chatUnavailable('request','en','YUKI_MODEL_SECRET').includes('SECRET'));
});
