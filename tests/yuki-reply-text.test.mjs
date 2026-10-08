import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {cleanAssistantText,validReply,readSession} from '../assets/yuki/protocol.mjs';
import {parseModel,modelRequest,validateInput} from '../services/yuki-api/worker.mjs';
import {unfinishedReply,unfinishedNotice} from '../assets/yuki/runtime/reply-completion.mjs';
import {parseTranslations,validateTranslations} from '../services/yuki-api/conversation-translation.mjs';
import {messageRecord,translationBatch,checkedTranslations,applyTranslations,translatedText} from '../assets/yuki/runtime/conversation-language.mjs';
import {normalizeReplyCue} from '../assets/yuki/runtime/reply-cues.mjs';
import {rememberReply,cleanVariety,packChatRequest} from '../assets/yuki/runtime/reply-variety.mjs';

// Verbatim bug report: a regression fixture, not a verified biology reference.
const octopus=`Did you know octopuses have three hearts? Two pump blood to their gills, and the third sends it to the rest of their body! But here's the fun part - the main heart actually stops beating when they swim, which is why they often prefer crawling instead. It's like having a car that works best in reverse! I can't imagine how that would feel, but I'm always curious about how different creatures move and live. Have you ever seen an octopus up close? They're such fascinating creatures! How about you - do you have any favorite sea creatures or things that surprise you with their abilities? I'd love to hear about them!`;
const broken=`${octopus}','text':'${octopus}'},`;
const cue=text=>({text,emotion:'thoughtful',gesture:'none',destination:'none',sourceIds:[],storyTopics:[]});
const output=text=>({response:JSON.stringify(cue(text))});
const input={message:'Explain how your animation works, with an example.',history:[],lang:'en',page:'/yuki/',token:'test-token'};

test('the exact reported duplicated text tail is displayed once with apostrophes intact',()=>{
 assert.equal(cleanAssistantText(broken),octopus);
 assert.equal(validReply(cue(broken)).text,octopus);
 assert.equal(parseModel(output(broken),{pages:[]}).text,octopus);
 for(const q of ['"',"'"])assert.equal(cleanAssistantText(`${octopus}${q}, ${q}text${q}: ${q}${octopus}${q}}`),octopus);
});
test('Japanese duplicate wrappers are cleaned without replacing particles or quotations',()=>{
 const ja='「羽ばたき」の仕組みは、小さな絵を順番に見せること。絵ごとに表示時間が決まっているから、動きの速さも調整できるよ。';
 assert.equal(cleanAssistantText(`${ja}','text':'${ja}'},`),ja);
});
test('ambiguous, partial and mismatched nested responses fail closed instead of guessing',()=>{
 for(const text of [`${octopus}','text':'A different answer.'},`,`${octopus}','text':'unfinished`,`${octopus}','emotion':'neutral'}`,`{'text':'hello','emotion':'neutral','gesture':'none'}`,JSON.stringify({...cue(octopus),unexpected:'field'})]){
  assert.throws(()=>cleanAssistantText(text));assert.throws(()=>parseModel(output(text),{pages:[]}));
 }
});
test('recognized nested reply envelopes unwrap only their readable text',()=>{
 for(const value of [JSON.stringify(cue(octopus)),`\x60\x60\x60json\n${JSON.stringify(cue(octopus))}\n\x60\x60\x60`])assert.equal(cleanAssistantText(value),octopus);
});
test('ordinary text, quotations, JSON examples and deliberate repetition remain intact',()=>{
 for(const text of [`I love the word 'text'! It's how these messages travel.`, 'The text field contains the answer; emotion chooses a reaction.', '{"text":"This is a JSON example."}', `Here's a code example: {'text':'hello','text':'hello'}`, 'Very, very tiny paws. Very, very tiny paws.', '日本語の「の」は、自然なところではそのまま使えるよ。'])assert.equal(cleanAssistantText(text),text);
});
test('repair preserves approved sources and cues but drops stale sentence animation indices',()=>{
 const value=validReply({...cue(broken),sources:[{title:'Public page',url:'/yuki/'}],beats:[{sentence:0,emotion:'neutral',gesture:'talkOpen'},{sentence:10,emotion:'thoughtful',gesture:'none'}]});
 assert.deepEqual(value.sources,[{title:'Public page',url:'/yuki/'}]);assert.equal(value.emotion,'thoughtful');assert.equal(value.beats,undefined);
});
test('prior assistant wrappers cannot be echoed from history; visitor examples are unchanged',()=>{
 const parsed=validateInput({...input,history:[{role:'assistant',content:broken},{role:'user',content:broken.slice(0,900)},{role:'assistant',content:`${octopus}','text':'bad'}`} ]});
 assert.equal(parsed.history[0].content,octopus);assert.equal(parsed.history[1].content,broken.slice(0,900));assert.equal(parsed.history.length,2);
});
test('translated assistant replies use the same check without changing quoted visitor messages',()=>{
 const batch=[{id:'a',role:'assistant',text:octopus},{id:'b',role:'user',text:'What is this?'}];
 const translations=parseTranslations({response:{translations:[{id:'a',text:broken},{id:'b',text:broken}]}},batch);
 assert.equal(translations[0].text,octopus);assert.equal(translations[1].text,broken);
});
test('long EN and JA replies survive validation, session restore, cues and variety tracking',()=>{
 for(const text of [('Here is a connected explanation with a useful example.\n\n').repeat(50),'羽ばたく仕組みを順番に説明するよ。'.repeat(130)]){
  assert(text.length>2000&&text.length<=3000);
  assert.equal(validReply(cue(text)).text,text.trim());assert.equal(normalizeReplyCue(cue(text)).text,text.trim());
  const messages=[messageRecord('assistant',text,'en')],variety=rememberReply({},text,[]);
  assert.equal(cleanVariety(variety).recent.length,1);
  const session=readSession({getItem:()=>JSON.stringify({savedAt:1000,messages,variety})},2000);
  assert.equal(session.messages[0].text,text);assert.equal(session.variety.recent.length,1);
  assert.equal(validateInput({...input,history:[{role:'assistant',content:text}]}).history[0].content,text.trim());
 }
 assert.throws(()=>validReply(cue('x'.repeat(3001))));assert.throws(()=>normalizeReplyCue(cue('x'.repeat(3001))));
});
test('a maximum-length Japanese answer can be translated within the unchanged request budget',()=>{
 const messages=[messageRecord('assistant','龍'.repeat(3000),'ja')],batch=translationBatch(messages,'en');
 assert.equal(batch.length,1);assert.equal(validateTranslations(batch)[0].text.length,3000);
 const body=packChatRequest({...input,token:'x'.repeat(2048),translation:batch,history:[]});assert(new TextEncoder().encode(body).length<=14000);assert.doesNotThrow(()=>validateInput(JSON.parse(body)));
 const translated=checkedTranslations([{id:batch[0].id,text:'x'.repeat(5500)}],batch);applyTranslations(messages,translated,'en');
 assert.equal(translatedText(messages[0],'en').length,5500);assert.equal(messages[0].text.length,3000);
});
test('longer explanations retain personality, examples, evidence limits and short guide follow-ups',()=>{
 for(const lang of ['en','ja']){
  const request=modelRequest({...input,lang},{pages:[]}),prompt=request.messages[0].content;
  assert.equal(request.max_tokens,1900);assert.equal(request.response_format.json_schema.properties.text.maxLength,2800);
  for(const part of ['6–8 clear sentences','concrete example','casual, curious voice','REPLY TEXT BOUNDARY','Never invent credentials'])assert(prompt.includes(part));
  assert.equal(modelRequest({...input,lang,guideEvent:{kind:'arrive'}},{pages:[]}).max_tokens,500);
 }
});
test('the actual message renderer protects both speech and saved history without touching user input',()=>{
 const source=readFileSync(new URL('../assets/yuki/yuki.mjs',import.meta.url),'utf8');
 const fn=source.slice(source.indexOf(' function addMessage('),source.indexOf(' function save(){'));
 const make=()=>({children:[],dataset:{},append(...items){this.children.push(...items);},replaceChildren(...items){this.children=items;},cloneNode(){return this;}});
 const elements=new Map(),$=key=>{if(!elements.has(key))elements.set(key,make());return elements.get(key);};
 const document={createElement:()=>make(),createTextNode:t=>t};
 const add=new Function('cleanAssistantText','unfinishedReply','unfinishedNotice','document','$','tr','online','ja',`return (${fn.trim()});`)(cleanAssistantText,unfinishedReply,unfinishedNotice,document,$,(en)=>en,false,false);
 add('assistant',broken,false);assert.equal($('.yuki-speech').children[0].children[1],octopus);assert.equal($('.yuki-log').children[0].children[1],octopus);
 add('user',broken,false);assert.equal($('.yuki-log').children[1].children[1],broken);
 add('assistant',`${octopus}','text':'broken'}`,false);assert.match($('.yuki-speech').children[0].children[1],/got tangled/);
 const cutoff='Lloyd connected different technologies to create a';
 add('assistant',cutoff,false,[{url:'/projects/',title:'Projects'}]);assert.equal($('.yuki-speech').children[0].children[1],unfinishedNotice());assert.equal($('.yuki-speech').children[0].children.length,2);
 add('user',cutoff,false);assert.equal($('.yuki-log').children.at(-1).children[1],cutoff);
});
