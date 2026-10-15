import test from 'node:test';
import assert from 'node:assert/strict';
import {packChatRequest,rememberJoke,rememberReply,rememberFact,rememberFactTopic} from '../assets/yuki/runtime/reply-variety.mjs';
import {conversationHistory,messageRecord} from '../assets/yuki/runtime/conversation-language.mjs';
import {discoveryKind,explanationKind} from '../assets/yuki/runtime/discovery.mjs';
import {modelRequest,selectKnowledge,validateInput} from '../services/yuki-api/worker.mjs';
import {followupHistory} from '../services/yuki-api/followup-context.mjs';
import {completionRequest} from '../services/yuki-api/reply-completion.mjs';

const turtle="A baby turtle wanted to win the forest race, so it curled up tight inside its shell and didn’t move at all. The other animals zoomed past, cheering and laughing. When the turtle finally peeked out, the referee shook his head and said, 'You can’t win if you don’t move — this isn’t naptime!' I thought that was so silly, I almost forgot to blink!";
const joke=[{role:'user',content:'Tell me a joke'},{role:'assistant',content:turtle}];
const phrase=[{role:'user',content:'Explain this'},{role:'assistant',content:'A phrase is a group of words that work together in a sentence.'}];
const catalog={owner:'Lloyd',bio:{en:'Creator',ja:'作者'},pages:['en','ja'].flatMap(lang=>['/resume.html','/yuki/'].map(url=>({id:(lang==='ja'?'/ja':'')+url,url:(lang==='ja'?'/ja':'')+url,lang,title:url==='/yuki/'?'Yuki’s Garden':'Resume',summary:url==='/yuki/'?'A sunny castle garden, with a roost, pond, lookout, books and treasures.':'Published résumé.',text:'Published description.',sections:[{id:'s1',anchor:'garden-nest',kind:'garden',title:'Dragon Roost',text:'A cushion for naps.'}]})))};
const base={lang:'en',page:'/yuki/',history:joke,context:{gardenSpot:'nest'},token:'fixture',webSearch:true};

test('the exact reported turtle follow-up retains the joke, not a grammar subject or new discovery',()=>{
 for(const message of ['explain this','What does this mean?','could you explain what you just said?','Explain the joke you previously said','Could you explain your previous joke?','What is that joke about?']){
  const input=validateInput({...base,message}),knowledge=selectKnowledge(catalog,input),request=modelRequest(input,knowledge,{mode:'eligible'});
  assert.equal(discoveryKind(message,joke),'',message);
  assert.equal(request.yukiTask,'contextual-followup',message);
  assert(!knowledge.view.localQuestion,message);
  assert(request.messages[0].content.includes(turtle),message);
  assert.match(request.messages[0].content,/EXACT REPLY EXPLANATION/);
  assert.match(request.messages[0].content,/If it has no convincing twist/);
  assert(!request.response_format.json_schema.properties.factIntent,'No new-discovery planner for an answer explanation');
 }
});

test('an explicitly previous joke selects that real exchange rather than the erroneous phrase explanation',()=>{
 for(const message of ['Explain the joke you previously said','What did your earlier joke mean?','さっきの冗談を説明して','前のジョークはどういう意味？']){
  const input={...base,message,history:[...joke,...phrase]};
  assert.equal(explanationKind(message),'joke');
  assert.deepEqual(followupHistory(input),joke);
  const request=modelRequest(input,selectKnowledge(catalog,input),{mode:'eligible'});
  assert(request.messages[0].content.includes(turtle));assert(!request.messages[0].content.includes(phrase[1].content));
 }
 assert.deepEqual(followupHistory({...base,message:'Explain the joke you previously said',history:[...joke,{role:'assistant',content:'Here we are in my garden!'}]}),joke,'An automatic arrival greeting is not the joke');
});

test('the browser can retain an explicitly requested earlier joke beyond six turns',()=>{
 const messages=[...joke,...phrase,{role:'user',content:'What is a variable?'},{role:'assistant',content:'A variable names a value.'},{role:'user',content:'What is a loop?'},{role:'assistant',content:'A loop repeats work.'}].map(m=>messageRecord(m.role,m.content,'en'));
 const history=conversationHistory(messages,'en','Explain the joke you previously said');
 assert(history.length<=6);assert.deepEqual(history.slice(0,2),joke);
 assert.equal(history.at(-1).content,'A loop repeats work.');
});

test('full novelty memory never evicts the answer being explained under the UTF8 request cap',()=>{
 let variety={};for(let i=0;i<30;i++){
  const text=`Joke ${i}. `+'楽しい別の話。'.repeat(80);
  variety=rememberReply(variety,text);variety=rememberJoke(variety,text,{jokeCore:{premise:'A different setup '+i,payoff:'A different connected payoff '+i}});variety=rememberFact(variety,'A fact '+i+'. '+ 'Different useful details. '.repeat(35));variety=rememberFactTopic(variety,'wiki-en:'+(i+1));
 }
 for(const [message,history] of [['explain this',joke],['Explain the joke you previously said',[...joke,...phrase]]]){
  const input={...base,message,history,variety,token:'x'.repeat(2048)},before=JSON.stringify(input);
  const packed=packChatRequest(input),result=validateInput(JSON.parse(packed));
  assert(Buffer.byteLength(packed)<=14000);assert.equal(JSON.stringify(input),before);
  assert(result.history.some(m=>m.content===turtle),'Must retain the full delivered joke');
  assert(result.history.some(m=>m.content===history.at(-1).content),'Must retain the latest reply too');
 }
});

test('garden identity always follows current page and stays first-person even during a quality repair',()=>{
 for(const lang of ['en','ja'])for(const message of (lang==='en'?['what is this place','Can you tell me about this place?','What are we looking at here?']:['ここはどんな場所？','この場所について教えて','今どこにいるの？'])){
  const input={...base,lang,page:(lang==='ja'?'/ja':'')+'/yuki/',message,history:[...joke,...phrase],context:{gardenSpot:'nest',lastGuide:{page:'/resume.html',section:'s1'}}};
  const knowledge=selectKnowledge(catalog,input),request=modelRequest(input,knowledge);
  assert.equal(knowledge.view.scope,input.page);assert(knowledge.view.wholePage);
  assert.equal(request.yukiTask,lang==='ja'?'page-answer-ja':'page-answer');
  assert.match(request.messages[0].content,/Identify this as MY garden/);assert(!request.messages[0].content.includes(turtle));
  const repair=completionRequest(request,{text:'This is Yuki’s Garden.',sources:[]},knowledge,{},lang,['self-narration']);
  assert.equal(repair.yukiTask,request.yukiTask);assert.match(repair.messages.at(-2).content,/Lloyd created the site and artwork, not you/);
 }
});

test('a request for another joke remains new humor, and asking about a page is not a joke follow-up',()=>{
 for(const message of ['Tell me another joke','Tell me a different joke about that story','別の冗談を教えて'])assert.equal(discoveryKind(message,joke),'joke');
 const input={...base,message:'what is this place',page:'/resume.html'};
 assert.equal(selectKnowledge(catalog,input).view.scope,'/resume.html');
 const missing={...base,message:'Explain the joke you previously said',history:[]};
 const request=modelRequest(missing,selectKnowledge(catalog,missing),{mode:'eligible'});
 assert.equal(request.yukiTask,'contextual-followup');
 assert.match(request.messages[0].content,/ask the visitor to quote the one they mean/);
 assert(!request.response_format.json_schema.properties.factIntent);
});
