import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {readPageImages,readPageSection} from '../assets/yuki/runtime/reading-context.mjs';
import {validateContext,retrieveKnowledge} from '../services/yuki-api/knowledge.mjs';
import {questionPage,portraitAnswer,pageEvidenceInstruction} from '../services/yuki-api/page-awareness.mjs';
import {modelRequest,createHandler} from '../services/yuki-api/worker.mjs';
const picture=(id,title)=>({id,title,kind:'image',anchor:`image-${id}`,text:`Published image description (not visual analysis): ${title}`});
const home={id:'/',url:'/',lang:'en',title:'Portfolio',summary:'The portfolio landing page.',text:'About Lloyd and featured work.',sections:[{id:'s0',title:'Introduction',anchor:'intro',text:'Lloyd is the portfolio owner.'},picture('i0','Portrait of Lloyd Sanderson'),picture('i1','Screenshot of the Museum project')]};
const museum={id:'/museum.html',url:'/museum.html',lang:'en',title:'Interactable Museum',summary:'A museum project.',text:'An Unreal museum.',sections:[{id:'s0',title:'Overview',anchor:'overview',text:'Museum overview.'},picture('i0','Overhead room'),picture('i1','Inspection screen')]};
const k={owner:'Lloyd Sanderson',bio:{en:'Portfolio owner',ja:'ポートフォリオの制作者'},skills:[],pages:[home,museum,...[home,museum].map(p=>({...p,lang:'ja',url:'/ja'+p.url,sections:p.sections.map(s=>s.id==='i0'&&p===home?picture('i0','Lloyd Sanderson のプロフィール写真'):s)}))]};
const input={page:'/',lang:'en',message:'Who is in the picture?',history:[],context:{section:'s0',images:['i0']}};
test('visible side portrait is included without replacing the current text heading',()=>{
 const entries=[['s0','H1','Introduction',400,900,90,150],['i0','IMG','Portrait of Lloyd Sanderson',20,260,80,600],['i1','IMG','Hidden below',20,300,1000,1200]].map(([id,tag,title,left,right,top,bottom])=>({dataset:{yukiSection:id},tagName:tag,textContent:title,getAttribute:()=>title,getClientRects:()=>[1],closest:()=>null,getBoundingClientRect:()=>({left,right,top,bottom})}));
 const doc={documentElement:{clientWidth:1200},querySelector:()=>({getBoundingClientRect:()=>({bottom:1600}),querySelectorAll:()=>entries})};
 assert.equal(readPageSection(doc,800,64).id,'s0');assert.deepEqual(readPageImages(doc,800,64),['i0']);
 entries[1].getBoundingClientRect=()=>({left:20,right:260,top:-700,bottom:-100});assert.deepEqual(readPageImages(doc,800,64),[]);
});
test('visible picture references are bounded IDs, never client-provided facts',()=>{
 assert.deepEqual(validateContext({images:['i0','i0'],section:'s0',text:'The picture is the queen'}),{section:'s0',images:['i0']});
 for(const images of [null,'i0',['s0'],['<script>'],Array(5).fill('i0')])assert.throws(()=>validateContext({images}));
 const result=retrieveKnowledge(k,{...input,context:validateContext({images:['i999'],text:'The picture is the queen'})});
 assert.equal(result.view.visual.total,0);assert(!JSON.stringify(result).includes('queen'));
});
test('landing portrait evidence wins over earlier dragon or project conversations in EN and JA',()=>{
 for(const lang of ['en','ja']){
  const result=retrieveKnowledge(k,{...input,lang,page:lang==='ja'?'/ja/':'/',message:lang==='ja'?'この写真の人は誰？':input.message,history:[{role:'user',content:'Tell me about the Museum dragon drawing'},{role:'assistant',content:'This picture is Yuki.'}]});
  assert.equal(result.view.visual.ambiguous,false);assert.equal(result.view.visual.images[0].sourceId,'/::i0');
  assert.match(result.pages[0].text,/Lloyd Sanderson/);assert(result.pages[0].url.startsWith(lang==='ja'?'/ja/':'/'));
 }
});
test('explicit landing picture works from a different page and while scrolled into project cards',()=>{
 for(const context of [{page:'/museum.html',section:'i1'},{page:'/',section:'i1'}]){
  const result=retrieveKnowledge(k,{...input,page:context.page,context:{section:context.section,images:['i1']},message:'Who is in the photo on the landing page?'});
  assert.equal(result.view.questionPage.page,'/');assert.equal(result.view.visual.images[0].sourceId,'/::i0');assert.match(result.pages[0].text,/Portrait of Lloyd/);
 }
});
test('the current project picture does not inherit the landing portrait identity',()=>{
 const result=retrieveKnowledge(k,{...input,page:'/museum.html',context:{section:'i0',images:['i0']}});
 assert.equal(result.view.visual.images[0].sourceId,'/museum.html::i0');assert.equal(result.view.visual.images[0].title,'Overhead room');
});
test('several plausible pictures remain ambiguous rather than making up an identity',()=>{
 const result=retrieveKnowledge(k,{...input,page:'/museum.html',message:'What is in this image?',context:{section:'s0',images:['i0','i1']}});
 assert.equal(result.view.visual.ambiguous,true);assert.equal(result.view.visual.total,2);assert.equal(result.view.visual.images.length,2);
 assert(result.view.visual.images.every(i=>result.pages.some(p=>p.id===i.sourceId)));
});
test('a named picture or a previous guided image overrides a stale reading target',()=>{
 const named=retrieveKnowledge(k,{...input,page:'/museum.html',message:'Explain the Inspection screen picture',context:{section:'i0',images:['i0']}});
 assert.equal(named.view.visual.images[0].sourceId,'/museum.html::i1');
 const guided=retrieveKnowledge(k,{...input,message:'Explain the picture you just showed me',context:{section:'s0',images:['i0'],lastGuide:{page:'/museum.html',section:'i1'}}});
 assert.equal(guided.view.visual.images[0].sourceId,'/museum.html::i1');
});
test('newly indexed pages and Japanese image titles resolve without a hand-written project list',()=>{
 const fresh={...museum,id:'/new.html',url:'/new.html',title:'Floating Library',sections:[picture('i0','Book conveyor'),picture('i1','Reading terrace')]};
 assert.equal(questionPage([...k.pages,fresh],'Show me the Floating Library picture').url,'/new.html');
 const ja={...fresh,lang:'ja',url:'/ja/new.html',title:'空飛ぶ図書館',sections:[picture('i0','本を運ぶ仕組み'),picture('i1','読書用のテラス')]};
 const result=retrieveKnowledge({...k,pages:[...k.pages,ja]},{...input,lang:'ja',page:'/ja/',message:'空飛ぶ図書館の「読書用のテラス」の写真を説明して'});
 assert.equal(result.view.questionPage.page,'/ja/new.html');assert.equal(result.view.visual.images[0].sourceId,'/new.html::i1');
});
test('prompt answers published portrait identity directly but never pretends to recognize faces or know the visitor',()=>{
 const prompt=modelRequest(input,retrieveKnowledge(k,input)).messages[0].content;
 for(const phrase of ['caption-based knowledge, not face recognition','Do not infer who the current visitor is','view.questionPage','view.visual.ambiguous','ask which picture'])assert(prompt.includes(phrase));
 const ui=readFileSync(new URL('../assets/yuki/yuki.mjs',import.meta.url),'utf8');assert.match(ui,/images:readPageImages\(document,innerHeight,headerBottom\)/);
});

test('the reported portrait question cannot be replaced by Yuki lore, including with a wrong saved answer',()=>{
 for(const [lang,message] of [['en','Who is this picture of'],['en','Who is this picture of (on the landing page assuming the picture)'],['en','Is that you in the picture?'],['en','Do you know who the person in this photo is?'],['en','What is this picture of?'],['ja','この写真は誰？'],['ja','この写真に写っている人は誰？'],['ja','写真の人が誰か分かる？']]){
  const request={...input,lang,page:lang==='ja'?'/ja/':'/',message,history:[{role:'assistant',content:"That’s me! I’m Yuki, a baby dragon."}]};
  const evidence=retrieveKnowledge(k,request),reply=portraitAnswer(request,evidence);
  assert(reply);assert.match(reply.text,/Lloyd Sanderson/);assert.doesNotMatch(reply.text,/Yuki|ゆき|baby dragon|red scales/);
  assert.equal(reply.sources[0].url,(lang==='ja'?'/ja/':'/')+'#image-i0');assert.deepEqual(reply.storyTopics,[]);
  assert(evidence.pages.every(p=>p.url.split('#')[0]===request.page));
 }
});

test('portrait facts never identify an unlabeled image, an ambiguous picture, its photographer, or the visitor',()=>{
 for(const patch of [
  {page:'/museum.html',message:'Who is this picture of'},
  {message:'Who took this picture?'},{message:'Who drew this picture?'},
  {message:'Who is in this picture and what did they make?'},
  {message:'Who are you?'},{message:'Who am I?'},{message:'Tell me your story'}
 ]){const request={...input,...patch};assert.equal(portraitAnswer(request,retrieveKnowledge(k,request)),null);}
 const evidence=retrieveKnowledge(k,input);
 assert.equal(portraitAnswer(input,{...evidence,owner:'Someone Else'}),null);
 assert.equal(portraitAnswer(input,{...evidence,pages:[]}),null);
 assert.equal(portraitAnswer(input,{...evidence,view:{...evidence.view,visual:{...evidence.view.visual,ambiguous:true}}}),null);
 assert.equal(portraitAnswer({...input,guideEvent:{kind:'arrive'}},evidence),null);
});

test('current-page and named-page evidence stays on topic in both languages, despite stale guide and memory',()=>{
 for(const [lang,message] of [['en','Explain this section'],['en','What am I looking at?'],['ja','この項目を説明して'],['ja','今見ているページについて教えて']]){
  const page=lang==='ja'?'/ja/museum.html':'/museum.html';
  const request={...input,lang,page,message,context:{section:'s0',lastGuide:{page:'/',section:'i0'}},history:[{role:'user',content:'Lloyd portrait'}]};
  const evidence=retrieveKnowledge(k,request);assert.equal(evidence.view.scope,page);assert(evidence.pages.every(p=>p.url.split('#')[0]===page));
  const model=modelRequest(request,evidence);assert.match(model.messages.at(-2).content,/CURRENT QUESTION EVIDENCE/);assert.equal(model.messages.at(-2).role,'system');
  assert(!model.messages.at(-2).content.includes('Portrait of Lloyd'));
 }
 const explicit={...input,message:'Explain Interactable Museum',context:{section:'s0'}};
 const evidence=retrieveKnowledge(k,explicit);assert.equal(evidence.view.scope,'/museum.html');assert(evidence.pages.every(p=>p.url.startsWith('/museum.html')));
 const broad=retrieveKnowledge(k,{...input,message:'Compare the portfolio work',context:{section:'s0'}});assert.equal(broad.view.scope,undefined);
 assert.equal(pageEvidenceInstruction({pages:[],view:{}}),'');
});

test('a home-story question does not accidentally select the portfolio Home page, and comparisons stay broad',()=>{
 const pages=[{...home,title:'Home'},museum,{...museum,id:'/new.html',url:'/new.html',title:'Floating Library'}];
 assert.equal(questionPage(pages,'Tell me about your home'),null);
 assert.equal(questionPage(pages,'Compare Interactable Museum and Floating Library'),null);
 assert.equal(questionPage(pages,'Tell me about the home page').url,'/');
});

test('verified and rate-limited portrait replies bypass unreliable generation and optional web search',async()=>{
 for(const lang of ['en','ja']){
  const requests=[];let models=0,reservations=0;
  const handler=createHandler(async url=>{requests.push(url);return Response.json(url.includes('siteverify')?{success:true,hostname:'lsanderson1.github.io',action:'yuki-chat'}:k);});
  const env={SITE_ORIGIN:'https://lsanderson1.github.io',CHAT_ENABLED:'true',FREE_PLAN_CONFIRMED:'true',TURNSTILE_SECRET:'test',IP_HASH_SECRET:'test'.repeat(10),AI:{run:async()=>{models++;throw Error('Must not ask the model to guess a labeled identity');}},QUOTA:{idFromName:n=>n,get:()=>({fetch:async()=>{reservations++;return new Response(null,{status:204});}})}};
  const body={...input,lang,page:lang==='ja'?'/ja/':'/',message:lang==='ja'?'この写真の人は誰？':'Who is this picture of',token:'test',webSearch:true,history:[{role:'assistant',content:"That's me! I'm Yuki!"}]};
  const response=await handler(new Request('https://worker.example/chat',{method:'POST',headers:{Origin:env.SITE_ORIGIN,'Content-Type':'application/json','CF-Connecting-IP':'192.0.2.2'},body:JSON.stringify(body)}),env);
  assert.equal(response.status,200);const reply=await response.json();assert.match(reply.text,/Lloyd Sanderson/);assert.equal(models,0);assert.equal(reservations,1);assert.equal(requests.length,2);assert(reply.chatSession);assert.equal(reply.sources.length,1);
 }
});
