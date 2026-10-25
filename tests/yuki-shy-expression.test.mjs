import test from 'node:test';
import assert from 'node:assert/strict';
import {modelRequest,parseModel,selectKnowledge,validateInput} from '../services/yuki-api/worker.mjs';
import {withExpressionGuidance,expressionInstructions,factExpressionInstructions,emotionMeanings} from '../services/yuki-api/expression-guidance.mjs';
import {emotionKinds,normalizeReplyCue} from '../assets/yuki/runtime/reply-cues.mjs';
import {validReply} from '../assets/yuki/protocol.mjs';
import {parseCompletion} from '../services/yuki-api/reply-completion.mjs';
import {expressionSequence} from '../assets/yuki/runtime/reply-beats.mjs';
import {replySequence} from '../assets/yuki/runtime/visitor-personality.mjs';

const input=(message,lang='en',history=[])=>validateInput({message,lang,history,page:lang==='ja'?'/ja/yuki/':'/yuki/',token:'test'});
const empty={pages:[],view:{}};
for(const lang of ['en','ja'])test(`${lang} conversational routes receive context-sensitive guidance for the full emotional range`,()=>{
 const cases=[
  [input(lang==='ja'?'その眼鏡、とっても似合ってるね！':'Those glasses look lovely on you!',lang),{},undefined],
  [input(lang==='ja'?'かわいいね！冗談を聞かせて。':"You're adorable! Tell me a joke.",lang),{},lang==='ja'?'joke-ja':'joke'],
  [input(lang==='ja'?'それをもっと詳しく説明して。':"You're a wonderful explainer! Why does that happen?",lang,[{role:'assistant',content:lang==='ja'?'音は振動によって伝わるんだ。':'Sound travels through vibrations.'}]),{},lang==='ja'?'contextual-followup-ja':'contextual-followup'],
  [input(lang==='ja'?'説明してくれるのが嬉しい！豆知識も聞かせて。':"I love the way you explain things! Tell me a fact, too.",lang),{mode:'results',factIntent:'open',entries:[{id:'web:1',title:'Sound',url:'https://example.org/sound',text:'Sound travels through vibrations.'}]},lang==='ja'?'sourced-fact-ja':'sourced-fact']
 ];
 for(const [i,web,task] of cases){
  const r=modelRequest(i,empty,web),systems=r.messages.filter(m=>m.role==='system');
  const instructions=task?.startsWith('sourced-fact')||task?.startsWith('joke')?factExpressionInstructions:expressionInstructions;
  assert.equal(r.yukiTask,task);assert.equal(r.max_tokens,1900);
  assert.equal(systems.filter(m=>m.content.includes(instructions)).length,1);
  assert(systems.at(-1).content.endsWith(instructions));
  assert(r.response_format.json_schema.properties.emotion.enum.includes('shy'));
  for(const emotion of [...emotionKinds,'neutral']){
   assert(r.response_format.json_schema.properties.emotion.enum.includes(emotion));
   assert(instructions.includes(emotion));
  }
  const final=r.messages.at(-1).content;
  assert.equal(task?.startsWith('joke')?JSON.parse(final.replace(/\n\/no_think$/,'')).request:final,i.message+(task?.startsWith('joke')?'':'\n/no_think'));
 }
});

test('expression guidance preserves requests and budgets, excludes unrelated praise and does not keyword-classify',()=>{
 assert.match(expressionInstructions,/prefer shy over the usual delighted or neutral/);
 assert.match(expressionInstructions,/Do not select shy just because someone says thanks/);
 assert.match(expressionInstructions,/THEMSELVES as shy, praises Lloyd or a project, quotes a compliment, negates it/);
 assert.match(expressionInstructions,/same useful detail/);
 const request={messages:[{role:'system',content:'Keep the answer grounded.'},{role:'user',content:'Lloyd made a cute project.'}],max_tokens:1900,temperature:.7,response_format:{json_schema:{properties:{emotion:{enum:['neutral','shy']}}}}};
 const before=structuredClone(request),r=withExpressionGuidance(request,{});
 assert.deepEqual(request,before);assert.equal(r.response_format,request.response_format);
 assert.equal(r.max_tokens,1900);assert.equal(r.temperature,.7);assert.deepEqual(r.messages.at(-1),request.messages.at(-1));
 assert.equal(withExpressionGuidance(request,{guideEvent:{kind:'arrive'}}),request);
 const fixed={...request,response_format:{json_schema:{properties:{emotion:{const:'thoughtful'}}}}};
 assert.equal(withExpressionGuidance(fixed,{}),fixed);
});

test('focused page explanation keeps the recently repaired text-only schema, not an added emotion requirement',()=>{
 const page={id:'garden',url:'/yuki/',lang:'en',title:"Yuki's Garden",summary:'A storybook dragon garden.',text:'A cozy roost and a pond.',sections:[]};
 const i=input('what is this place'),knowledge=selectKnowledge({owner:'Lloyd Sanderson',bio:{en:'Portfolio owner'},pages:[page]},i),r=modelRequest(i,knowledge);
 assert.equal(r.yukiTask,'page-answer');
 assert.deepEqual(Object.keys(r.response_format.json_schema.properties),['text','sourceIds']);
 assert(!r.messages.some(m=>m.content.includes(expressionInstructions)));
});

for(const text of ['You really think so? That makes me happy.','そんなふうに思ってくれるんだ！嬉しくて、ちょっと照れちゃう。'])test(`Shy survives parsing and neutral reading beats: ${text}`,()=>{
 const beats=[{sentence:0,emotion:'neutral',gesture:'talkExplain'},{sentence:1,emotion:'neutral',gesture:'talkOpen'}];
 const cue=parseModel({response:{text,emotion:'shy',gesture:'none',beats,destination:'none',sourceIds:[],storyTopics:[]}},empty);
 const before=structuredClone(cue),sequence=expressionSequence(cue,replySequence(cue));
 assert.equal(sequence[0].emotion,'shy');assert.equal(sequence[0].gesture,'none');
 assert.equal(sequence[1].gesture,'talkOpen');assert.equal(sequence.length,2);
 assert.equal(sequence.map(b=>b.text).join(''),text.replace(/\? /u,'?'));
 assert.deepEqual(cue,before,'Do not alter saved response metadata');
});

test('keep a deliberately later Shy beat and preserve other expressions, neutral replies, invalid-beat fallback',()=>{
 const text='Let me explain. Thank you for noticing!',beats=[{sentence:0,emotion:'neutral',gesture:'talkExplain'},{sentence:1,emotion:'shy',gesture:'none'}];
 assert.deepEqual(expressionSequence({text,emotion:'shy',beats},[]).map(b=>b.emotion),['neutral','shy']);
 const talking=beats.map(b=>({...b,emotion:'neutral',gesture:'talkOpen'}));
 for(const emotion of emotionKinds)assert.equal(expressionSequence({text,emotion,beats:talking},[])[0].emotion,emotion);
 for(const emotion of ['neutral','unknown',undefined])assert(expressionSequence({text,emotion,beats:talking},[]).every(b=>b.emotion==='neutral'));
 const cue={text,emotion:'shy',gesture:'none',beats:[...talking].reverse()},fallback=replySequence(cue);
 assert.equal(expressionSequence(cue,fallback),fallback);
 assert.equal(replySequence(cue,{firstMeeting:true})[0].gesture,'wave');
});

test('each approved emotion has distinct meaning, with intent and voice safeguards rather than random quotas',()=>{
 assert.deepEqual(Object.keys(emotionMeanings).sort(),[...emotionKinds,'neutral'].sort());
 for(const [name,meaning] of Object.entries(emotionMeanings)){
  assert(expressionInstructions.includes(`${name}: ${meaning}.`));
  assert(factExpressionInstructions.includes(`${name}=`));
 }
 assert.match(emotionMeanings.thoughtful,/not confused just because the topic is technical/);
 assert.match(emotionMeanings.confused,/not a reaction to the visitor being confused/);
 assert.match(emotionMeanings.proud,/never take credit for Lloyd/);
 assert.match(emotionMeanings.amused,/never laugh at distress/);
 assert.match(expressionInstructions,/never cycle through emotions, impose a variety quota/);
 assert.match(expressionInstructions,/English and Japanese, including mixed requests and follow-ups/);
 assert.match(expressionInstructions,/Japanese stays natural and casual \(普通体\)/);
 assert.match(expressionInstructions,/English stays warm and conversational/);
 assert.match(expressionInstructions,/first-person voice and same useful detail/);
 assert.match(expressionInstructions,/not every sentence/);
 assert.match(expressionInstructions,/must not narrate stage directions/);
});

const emotionReplies={
 delighted:['I would love to explore that together! There is so much to notice.','一緒に見に行きたいな！気になるものがいっぱいあるね。'],
 amused:['That little mix-up made me giggle! I pictured the puzzled face.','その勘違い、くすっとしちゃった！きょとんとした顔が浮かぶね。'],
 thoughtful:['There are two possibilities to consider. Let me work through the difference.','二つの考え方があるね。どこが違うのか、一緒に考えたいな。'],
 surprised:['That is an unexpected detail! I want to understand how it works.','そんな仕組みがあるんだ！どうなっているのか、もっと知りたいな。'],
 shy:['You really think so? That makes me happy.','そう思ってくれるんだ！嬉しくて、ちょっと照れちゃう。'],
 proud:['You finished the part you were practicing! That is progress worth celebrating.','練習していたところ、できたんだね！一緒に喜びたくなっちゃう。'],
 reassuring:['That sounds frustrating. We can take it one little step at a time.','うまくいかないと、もどかしいよね。一つずつ考えていこう。'],
 confused:['Which of the two ideas do you mean? I want to understand before I explain.','二つのうち、どちらのことかな？ちゃんとわかってから説明したいな。']
};
for(const [emotion,translations] of Object.entries(emotionReplies))for(const [i,text] of translations.entries())test(`${emotion} round-trips through reply parsing, repair and presentation (${i?'ja':'en'})`,()=>{
 const raw={text,emotion,gesture:'none',destination:'none',sourceIds:[],storyTopics:[],beats:[{sentence:0,emotion:'neutral',gesture:'talkExplain'},{sentence:1,emotion:'neutral',gesture:'talkOpen'}]};
 const reply=validReply(parseModel({response:raw},empty));
 assert.equal(normalizeReplyCue(reply).emotion,emotion);
 const sequence=expressionSequence(reply,replySequence(reply));
 assert.equal(sequence[0].emotion,emotion);assert.equal(sequence[0].gesture,'none');
 assert.equal(sequence[1].gesture,'talkOpen');
 assert.equal(sequence.map(b=>b.text).join(' ').replace(/\s/gu,''),text.replace(/\s/gu,''));
 const repaired=parseCompletion({response:{text}},reply);
 assert.equal(repaired.emotion,emotion);assert.equal(repaired.beats,undefined);
 assert.equal(replySequence(repaired)[0].emotion,emotion);
});

test('context changes can select new expressions without forced rotation or overwriting deliberate sentence beats',()=>{
 for(const emotion of ['thoughtful','thoughtful','delighted','reassuring','neutral','neutral','shy','amused']){
  const cue={text:'A complete answer. A useful second thought.',emotion,gesture:emotion==='neutral'?'talkExplain':'none'};
  const sequence=expressionSequence(cue,replySequence(cue));
  assert.equal(sequence[0].emotion,emotion);
 }
 const cue={text:'Let me consider that. We found the difference! Here is how it works.',emotion:'thoughtful',gesture:'none',beats:[{sentence:0,emotion:'thoughtful',gesture:'none'},{sentence:1,emotion:'delighted',gesture:'none'},{sentence:2,emotion:'neutral',gesture:'talkExplain'}]};
 const sequence=expressionSequence(cue,[]);
 assert.deepEqual(sequence.map(b=>b.emotion),['thoughtful','delighted','neutral']);
 assert.equal(sequence.map(b=>b.text).join(' '),cue.text);
 // Mentioning a feeling is not a client-side animation trigger.
 assert.equal(replySequence({text:'The character in that story felt shy.',emotion:'neutral',gesture:'talkExplain'})[0].emotion,'neutral');
});
