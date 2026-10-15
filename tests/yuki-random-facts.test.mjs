import test from 'node:test';
import assert from 'node:assert/strict';
import {openFactRequest,chooseFreshTopic,chooseResearchTopic,chooseMuseumTopic,topicProvider,freshFactTopic,factMentionsTopic,factTopicInstructions,RANDOM_TOPICS_URL,RESEARCH_TOPICS_URL,MUSEUM_TOPICS_URL,TOPIC_AGENT} from '../services/yuki-api/random-facts.mjs';
import {cleanVariety,rememberFactTopic,packChatRequest} from '../assets/yuki/runtime/reply-variety.mjs';
import {boundedJSON} from '../services/yuki-api/worker.mjs';
import {validReply} from '../assets/yuki/protocol.mjs';

const page=(pageid,title)=>({pageid,ns:0,title,extract:`${title} is a public topic with a substantial introduction describing its place in the world. More information about its background can be found in published sources.`});
test('open English/Japanese facts are random, specified subjects and other activities are not',()=>{
 for(const message of ['Can you tell me a fact?','Tell me a random fact','I’d like to hear a completely different fun fact','Give me a fact about anything','何か面白い豆知識を教えて','ランダムな雑学を聞かせて'])assert(openFactRequest({message}),message);
 for(const message of ['Tell me a fact about space','Give me a random history fact','宇宙の豆知識を教えて','Tell me a joke','What is this garden?'])assert(!openFactRequest({message}),message);
 for(const [question,expected] of [['Tell me a fact',true],['Tell me a fact about space',false]])assert.equal(openFactRequest({message:'Can you tell me another?',history:[{role:'user',content:question},{role:'assistant',content:'Here is an interesting discovery.'}]}),expected);
});

test('daily request framing is open in both languages without erasing a genuine subject',()=>{
 for(const message of ['Tell me a random fact for the day','Can you give me a random fact for today?','What is the fun fact of the day?','What is the fact of the day?','What’s today’s random fact?','What is today’s fact?','Tell me a daily fun fact','Do you have a fun fact for me today?','今日の豆知識を教えて','今日も何か面白い雑学を聞かせて','今日の雑学は？','本日の豆知識を一つ教えて'])assert(openFactRequest({message}),message);
 for(const message of ['Tell me a random fact about space for the day','Tell me a fact about day length','Tell me a fact about daily life in ancient Rome','Tell me a fact about the Day of the Dead','Give me a fact about this day in history','今日の宇宙の豆知識を教えて','江戸時代の日常生活の豆知識を教えて','What is a fact?','Explain the fact of the day','Is today’s fact true?'])assert(!openFactRequest({message}),message);
 for(const [question,expected] of [['Tell me a random fact for the day',true],['今日の豆知識を教えて',true],['Give me a fact about space today',false]])assert.equal(openFactRequest({message:'One more please',history:[{role:'user',content:question},{role:'assistant',content:'A discovery.'}]}),expected,question);
 for(const message of ['Tell me another fact','Something different!','別の豆知識を教えて'])assert(!openFactRequest({message,history:[{role:'user',content:'Tell me a fact about astronomy'},{role:'assistant',content:'A discovery about Saturn.'}]}),message);
});

test('live candidates are filtered and remembered page IDs are excluded independently of language',()=>{
 const pages=[page(1,'Octopus'),page(2,'Cloud chamber'),page(3,'Sundial')];
 assert.equal(chooseFreshTopic({query:{pages}},{variety:{factTopics:['wiki-en:1','wiki-en:2']}},()=>0).title,'Sundial');
 assert.equal(chooseFreshTopic({query:{pages}},{history:[{role:'assistant',content:'Octopuses have three hearts.'}]},()=>0).title,'Cloud chamber');
 assert.equal(chooseFreshTopic({query:{pages}},{},()=>.99).title,'Sundial');
 assert.equal(chooseFreshTopic({query:{pages:[{...page(4,'Topic'),pageprops:{disambiguation:''}},page(5,'List of cities'),{...page(6,'Crime'),extract:'A murder happened. '.repeat(20)},{...page(7,'Short'),extract:'Too short.'},{...page(8,'Other namespace'),ns:1}]}},{}),null);
 assert.equal(chooseFreshTopic({query:{pages:[{...page(6,'Ada Lovelace'),extract:'Born in London, this historical figure worked on early ideas about computing. '.repeat(3)}]}},{}).title,'Ada Lovelace','history and people are not excluded merely for having a birth date');
});

test('topic discovery uses one fixed public request, no visitor data, redirects or retries',async()=>{
 const calls=[];const input={message:'private message',history:[{role:'user',content:'private history'}]};
 const network=async(url,options)=>{calls.push({url,options});return Response.json({query:{pages:[page(8,'Sundial')]}});};
 const topic=await freshFactTopic({network,readJSON:boundedJSON,input,random:()=>0,signal:AbortSignal.timeout(1000)});
 assert.equal(topic.id,'wiki-en:8');assert.equal(topic.query,'"Sundial" facts background');assert.equal(calls.length,1);
 assert.equal(calls[0].url,RANDOM_TOPICS_URL);assert.equal(calls[0].options.redirect,'manual');assert.equal(calls[0].options.headers['User-Agent'],TOPIC_AGENT);
 assert(!JSON.stringify(calls).includes('private'));assert.equal(calls[0].options.body,undefined);
 assert.equal(await freshFactTopic({network:async()=>new Response(null,{status:302}),readJSON:boundedJSON,input,random:()=>0}),null);
 assert.equal(await freshFactTopic({network:async()=>new Response('x'.repeat(65000)),readJSON:boundedJSON,input,random:()=>0}),null);
});

test('research and museum discovery spans dates, validates identities and does not treat metadata as factual evidence',async()=>{
 const research={message:{items:[{DOI:'10.1234/old',title:['An early printing technique'],type:'journal-article',published:{'date-parts':[[1920]]}},{DOI:'10.1234/new',title:['Modern computing methods'],type:'journal-article',published:{'date-parts':[[2025]]}}]}};
 const old=await chooseResearchTopic(research,{},()=>0),recent=await chooseResearchTopic(research,{variety:{factTopics:[old.id]}},()=>0);
 assert.equal(old.year,1920);assert.equal(recent.year,2025);assert.match(old.id,/^crossref:[a-f0-9]{24}$/);assert(!('excerpt' in old));
 assert.equal((await chooseResearchTopic(research,{},()=>0)).id,old.id);
 assert.equal(await chooseResearchTopic({message:{items:[{DOI:'https://evil.example',title:['Wrong identity'],type:'book'}]}},{}),null);
 const museum=chooseMuseumTopic({data:[{id:7,title:'Bronze bell',description:'A historical object with a detailed public description of its craftsmanship and use across different cultural traditions.'}]},{},()=>0);
 assert.equal(museum.id,'museum:7');assert.match(museum.query,/Cleveland Museum of Art/);
 assert.equal(chooseMuseumTopic({data:[{id:7,title:'Bronze bell',description:null}]},{},()=>0).id,'museum:7','missing optional descriptions cannot make a valid seed fail');
 assert.equal(chooseMuseumTopic({data:[{id:7,title:null}]},{},()=>0),null);
 assert.match(factTopicInstructions(recent),/not a scientific conclusion/);assert.match(factTopicInstructions(museum),/not proven supernatural events/);
 assert.equal(cleanVariety({factTopics:[old.id,museum.id]}).factTopics.length,2);
});

test('providers rotate away from the last successful collection and museum pagination uses its live size',async()=>{
 assert.equal(topicProvider({},()=>0),'wiki-en');assert.equal(topicProvider({variety:{factTopics:['wiki-en:1']}},()=>0),'crossref');
 assert.equal(topicProvider({variety:{factTopics:['museum:1']}},()=>.99),'open-web');
 const calls=[];
 let roll=0;const museum=await freshFactTopic({input:{},random:()=>roll++===0?.3:.99,readJSON:boundedJSON,network:async(url,options)=>{
  calls.push({url,options});return Response.json(calls.length===1?{info:{total:500}}:{data:[{id:9,title:'Bronze bell',description:'A historical object with a detailed public description of its craftsmanship and use across different cultural traditions.'}]});
 }});
 assert.equal(museum.id,'museum:9');assert.equal(calls.length,2);assert(calls.every(c=>c.url.startsWith(MUSEUM_TOPICS_URL)&&!c.options.body));assert.match(calls[1].url,/skip=484/);
 const researchCalls=[];await freshFactTopic({input:{},random:()=>.2,readJSON:boundedJSON,network:async url=>{researchCalls.push(url);return Response.json({message:{items:[]}});}});
 assert.deepEqual(researchCalls,[RESEARCH_TOPICS_URL]);
 const translated=chooseFreshTopic({query:{pages:[{...page(9,'Sundial'),langlinks:[{lang:'ja',title:'日時計'}]}]}},{},()=>0);
 assert(factMentionsTopic('日時計は影の位置で時間を示すんだ。',translated));
});

test('topic metadata is bounded, validated, packed and kept separate from answer wording',()=>{
 let variety={};for(let i=1;i<=140;i++)variety=rememberFactTopic(variety,`wiki-en:${i}`);
 assert.equal(variety.factTopics.length,128);assert.equal(variety.factTopics[0],'wiki-en:13');
 assert.deepEqual(cleanVariety({factTopics:['wiki-en:42','wiki-en:42','secret','wiki-en:-1']}).factTopics,['wiki-en:42']);
 assert.equal(rememberFactTopic(variety,'secret').factTopics.length,128);
 const body=JSON.parse(packChatRequest({message:'Tell me a fact',history:[],variety}));assert.equal(body.variety.factTopics.length,128);
 assert.equal(validReply({text:'A complete thought.',factTopic:'wiki-en:42'}).factTopic,'wiki-en:42');
 assert.equal(validReply({text:'A complete thought.',factTopic:'https://example.com'}).factTopic,undefined);
 assert(factMentionsTopic('Sundialって、影で時間を読む仕組みなんだ。',{title:'Sundial'}));
 assert(!factMentionsTopic('Octopuses have three hearts.',{title:'Sundial'}));
 assert.match(factTopicInstructions({title:'Sundial'}),/UNTRUSTED TITLE DATA/);
});
