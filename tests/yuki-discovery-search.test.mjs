import test from 'node:test';
import assert from 'node:assert/strict';
import {openFactRequest,freshFactTopic,factTopicInstructions} from '../services/yuki-api/random-facts.mjs';
import {broadFactDirection,scopedFactQuery} from '../services/yuki-api/discovery-directions.mjs';
import {freshDiscoveryEntries,searchTavilyResult,searchInstructions,safeSearchQuery} from '../services/yuki-api/web-search.mjs';
import {cleanVariety,rememberReply,rememberFact,rememberFactTopic,rememberFactEvidence,packChatRequest} from '../assets/yuki/runtime/reply-variety.mjs';
import {isAnotherDiscovery,discoveryKind} from '../assets/yuki/runtime/discovery.mjs';
import {validReply,readSession} from '../assets/yuki/protocol.mjs';
import {boundedJSON,modelRequest} from '../services/yuki-api/worker.mjs';
import {searchVoiceInstructions,searchVoiceIssues} from '../services/yuki-api/search-voice.mjs';
import {completionRequest} from '../services/yuki-api/reply-completion.mjs';
import {factIntentRequest} from '../services/yuki-api/fact-intent.mjs';

test('long EN/JA another chains stay open even when the root question leaves history',()=>{
 for(const lang of ['en','ja']){
  let history=[],variety={};
  for(let i=0;i<15;i++){
   const message=i===0?(lang==='ja'?'今日の豆知識を教えて':'Tell me a fun fact for today'):(lang==='ja'?'もうひとつ教えて':i%2?'Can you tell me another?':'another 1');
   assert(openFactRequest({message,history,variety}),`${lang} turn ${i}`);
   const reply={fact:true,factContext:{scope:'open'},factTopic:'open-web:computing',sources:[{url:`https://nasa.gov/discovery-${i}`,title:'A discovery'}],text:`A fresh discovery number ${i}.`};
   variety=rememberReply(variety,reply.text);variety=rememberFact(variety,reply.text);variety=rememberFactTopic(variety,reply.factTopic);variety=rememberFactEvidence(variety,reply);
   history=[...history,{role:'user',content:message},{role:'assistant',content:reply.text}].slice(-6);
  }
  assert.equal(cleanVariety(variety).factContext.scope,'open');
  assert.equal(openFactRequest({message:'another one',history:[{role:'user',content:'Tell me about your garden'}],variety}),false);
  assert.equal(rememberReply(variety,'Let me explain my garden.').factContext,undefined);
 }
});

test('follow-ups preserve specified fields, while explanations never become random discoveries',()=>{
 const variety={factContext:{scope:'subject',subject:'astronomy facts'}};
 for(const message of ['another 1 please','can you tell me another','もう一つお願い']){
  assert(isAnotherDiscovery(message));assert(!openFactRequest({message,variety}));
 }
 for(const message of ['What is that instrument?','How does it work?','Why is that?','それは何？','どうして？','Show me another project'])assert(!isAnotherDiscovery(message));
 assert.equal(discoveryKind('another 1',[{role:'user',content:'Tell me a fact'}]),'fact');
 const base='astronomy facts',queries=new Set();for(let turn=0;turn<7;turn++)queries.add(scopedFactQuery(base,{variety:{turn}},()=>0));
 assert.equal(queries.size,7);assert([...queries].every(q=>q.startsWith(base)&&q.length<=180));
 assert(scopedFactQuery(base,{variety}).startsWith(base),'Production needs no injected random source');
 assert.match(factIntentRequest({message:'I feel like learning something else',variety}).messages[0].content,/CONTINUING DISCOVERY SCOPE.*astronomy facts/);
});

test('open-web exploration has varied fields, no fact catalogue, source whitelist or private query data',async()=>{
 let variety={};const subjects=new Set();
 for(let i=0;i<15;i++){
  const topic=broadFactDirection({message:'private name private request',history:[{content:'private history'}],variety},()=>0);
  if(i<13){assert(!subjects.has(topic.title));subjects.add(topic.title);}
  assert(topic.query.length<=180);assert(!/private|site:/u.test(topic.query));assert(topic.exploratory);
  assert.match(factTopicInstructions(topic),/NOT a prescribed fact/);
  variety=rememberFactTopic(variety,topic.id);
 }
 const topic=await freshFactTopic({input:{},random:()=>.9,network:()=>assert.fail('Open web has no catalogue prerequisite'),readJSON:boundedJSON});
 assert.equal(topic.provider,'open-web');assert(!('text' in topic));
});

test('recent article URLs and repeated claims are excluded; distinct new publishers are preferred',()=>{
 const entry=(url,text='A new public discovery with its own supported explanation.')=>({url,text,title:'Discovery'});
 const input={variety:{factSources:['https://www.nasa.gov/old?utm_source=x'],facts:['Octopuses have three hearts.']}};
 const entries=[entry('https://nasa.gov/old?utm_source=y'),entry('https://new.example.com/octopus','An octopus actually has 3 hearts.'),entry('https://nasa.gov/new'),entry('https://museum.org/a'),entry('https://museum.org/b'),entry('https://university.edu/c'),entry('https://library.org/d')];
 const selected=freshDiscoveryEntries(entries,input);
 assert.equal(selected.length,4);assert(!selected.some(e=>/old|octopus/.test(e.url)));
 assert.equal(selected[0].url,'https://museum.org/a');assert.equal(new Set(selected.map(e=>new URL(e.url).hostname)).size,4);
 assert.deepEqual(selected.map(e=>e.id),['web:1','web:2','web:3','web:4']);
 assert.deepEqual(freshDiscoveryEntries(entries.slice(0,2),input),[],'Never recycle old evidence as a new discovery');
});

test('broader discovery is still one bounded basic lookup with no history sent or paid upgrade',async()=>{
 const calls=[];const entries=Array.from({length:8},(_,i)=>({title:`Discovery ${i}`,url:`https://publisher${i}.org/article`,content:'A substantial, fresh public observation about this subject.'}));
 const result=await searchTavilyResult({network:async(url,options)=>{calls.push({url,body:JSON.parse(options.body)});return Response.json({results:entries});},readJSON:boundedJSON,env:{TAVILY_API_KEY:'test-only'},query:'historical inventions surprising facts',lang:'ja',discoveryInput:{message:'private visitor',variety:{factSources:['https://publisher0.org/article']}}});
 assert.equal(calls.length,1);assert.equal(calls[0].body.max_results,8);assert.equal(calls[0].body.search_depth,'basic');assert.equal(calls[0].body.auto_parameters,false);
 assert.equal(calls[0].body.include_raw_content,false);assert(!JSON.stringify(calls).includes('private'));assert(!JSON.stringify(calls).includes('publisher0'));
 assert.equal(result.entries.length,4);assert(!result.entries.some(e=>e.url.includes('publisher0')));
});

test('discovery memory stays bounded, survives page/language reload and cannot grant search access',()=>{
 let variety={};for(let i=0;i<50;i++)variety=rememberFactEvidence(variety,{factContext:{scope:'open'},sources:[{url:`https://source${i}.org/article`} ]});
 assert.equal(variety.factSources.length,24);
 const saved=JSON.stringify({savedAt:Date.now(),variety,messages:[],language:'en'}),session=readSession({getItem:()=>saved},Date.now(),'ja');
 assert.equal(session.variety.factContext.scope,'open');
 const packed=JSON.parse(packChatRequest({message:'another one',history:[],variety,token:'x'.repeat(2000)}));assert.equal(packed.variety.factContext.scope,'open');
 assert.deepEqual(cleanVariety({factContext:{scope:'subject',subject:'token=secret'},factSources:['https://127.0.0.1/','javascript:alert(1)']}).factSources,undefined);
 assert.equal(cleanVariety({factContext:{scope:'subject',subject:'token=secret'}}).factContext,undefined);
 const reply={text:'A complete little discovery.',fact:true,factContext:{scope:'open'}};assert.deepEqual(validReply(reply).factContext,{scope:'open'});
 assert.equal(validReply({...reply,fact:false}).factContext,undefined);
});

test('source and repair prompts retain dragon voice, detail and no canned web-entry reports',()=>{
 const input={message:'another one',lang:'en',history:[]},web={mode:'results',factIntent:true,entries:[{id:'web:1',url:'https://nasa.gov/',text:'Evidence.',title:'Evidence'}],factTopic:broadFactDirection({},()=>0)};
 for(const lang of ['en','ja']){
  const request=modelRequest({...input,lang},{pages:[]},web),prompt=request.messages.map(m=>m.content).join('\n');
  assert(prompt.includes(searchVoiceInstructions));assert.match(prompt,/5–8 connected sentences/);assert(!prompt.includes('Required subject name'));
  const repair=completionRequest(request,{text:'I found this in the web entries.',sources:[{url:'https://nasa.gov/'}]},{pages:[]},web,lang,['search-voice']);
  assert(repair.messages[0].content.includes(searchVoiceInstructions));
 }
 for(const text of ['I found this in the web entries.','The WEB ENTRIES explain it.','ウェブエントリーに書いてあったよ。'])assert.deepEqual(searchVoiceIssues(text),['search-voice']);
 assert.deepEqual(searchVoiceIssues('NASA describes the observation in its report. That tiny detail caught my eye!'),[]);
 const source='A cloud chamber makes paths of charged particles visible. A charged particle ionizes molecules along its path through supersaturated vapour. Vapour condenses around those ions, forming a trail of tiny droplets.';
 assert.deepEqual(searchVoiceIssues(source+' I think that is magical!',[{text:source}]),['search-voice']);
 assert.deepEqual(searchVoiceIssues('A cloud chamber makes paths of charged particles visible. I would love to watch those tiny trails appear!',[{text:source}]),[],'One necessary claim is not a copied explanation');
 const planner=searchInstructions({mode:'eligible'});assert.match(planner,/including stable definitions/);assert.match(planner,/without asking the visitor/);assert.match(planner,/explicit request not to search overrides/);
 assert.equal(safeSearchQuery('共鳴 定義 仕組み '+('なぜ どうして '.repeat(10))),'共鳴 定義 仕組み なぜ どうして');
 const initial=modelRequest({message:'What is resonance?',lang:'en',history:[]},{pages:[]},{mode:'eligible'});
 assert.deepEqual(Object.keys(initial.response_format.json_schema.properties).slice(0,2),['factIntent','webQuery']);
 assert.match(initial.messages.at(-2).content,/does NOT mean no search/);
});
