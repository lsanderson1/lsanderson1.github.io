import test from 'node:test';
import assert from 'node:assert/strict';
import {modelRequest,parseModel,selectKnowledge,validateInput} from '../services/yuki-api/worker.mjs';
import {withExpressionGuidance,expressionInstructions,factExpressionInstructions} from '../services/yuki-api/expression-guidance.mjs';
import {expressionSequence} from '../assets/yuki/runtime/reply-beats.mjs';
import {replySequence} from '../assets/yuki/runtime/visitor-personality.mjs';

const input=(message,lang='en',history=[])=>validateInput({message,lang,history,page:lang==='ja'?'/ja/yuki/':'/yuki/',token:'test'});
const empty={pages:[],view:{}};
for(const lang of ['en','ja'])test(`${lang} conversational routes receive the same context-sensitive Shy guidance`,()=>{
 const cases=[
  [input(lang==='ja'?'その眼鏡、とっても似合ってるね！':'Those glasses look lovely on you!',lang),{},undefined],
  [input(lang==='ja'?'かわいいね！冗談を聞かせて。':"You're adorable! Tell me a joke.",lang),{},lang==='ja'?'joke-ja':'joke'],
  [input(lang==='ja'?'それをもっと詳しく説明して。':"You're a wonderful explainer! Why does that happen?",lang,[{role:'assistant',content:lang==='ja'?'音は振動によって伝わるんだ。':'Sound travels through vibrations.'}]),{},lang==='ja'?'contextual-followup-ja':'contextual-followup'],
  [input(lang==='ja'?'説明してくれるのが嬉しい！豆知識も聞かせて。':"I love the way you explain things! Tell me a fact, too.",lang),{mode:'results',factIntent:'open',entries:[{id:'web:1',title:'Sound',url:'https://example.org/sound',text:'Sound travels through vibrations.'}]},lang==='ja'?'sourced-fact-ja':'sourced-fact']
 ];
 for(const [i,web,task] of cases){
  const r=modelRequest(i,empty,web),systems=r.messages.filter(m=>m.role==='system');
  const instructions=task?.startsWith('sourced-fact')?factExpressionInstructions:expressionInstructions;
  assert.equal(r.yukiTask,task);assert.equal(r.max_tokens,1900);
  assert.equal(systems.filter(m=>m.content.includes(instructions)).length,1);
  assert(systems.at(-1).content.endsWith(instructions));
  assert(r.response_format.json_schema.properties.emotion.enum.includes('shy'));
  assert.equal(r.messages.at(-1).content,i.message+'\n/no_think');
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
 for(const emotion of ['shy','thoughtful','reassuring','amused'])assert.equal(expressionSequence({text,emotion,beats:talking},[])[0].emotion,emotion);
 for(const emotion of ['neutral','unknown',undefined])assert(expressionSequence({text,emotion,beats:talking},[]).every(b=>b.emotion==='neutral'));
 const cue={text,emotion:'shy',gesture:'none',beats:[...talking].reverse()},fallback=replySequence(cue);
 assert.equal(expressionSequence(cue,fallback),fallback);
 assert.equal(replySequence(cue,{firstMeeting:true})[0].gesture,'wave');
});
