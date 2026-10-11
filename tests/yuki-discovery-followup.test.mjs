import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {discoveryKind} from '../assets/yuki/runtime/discovery.mjs';
import {lightChatKind} from '../services/yuki-api/light-chat.mjs';
import {needsFreshText} from '../assets/yuki/runtime/reply-variety.mjs';
import {ConversationMemory} from '../assets/yuki/runtime/conversation-memory.mjs';
import {modelRequest,selectKnowledge,runModel,CLOUDFLARE_HUMOR_MODEL,CLOUDFLARE_TRANSLATION_MODEL,CLOUDFLARE_MODEL,validateInput} from '../services/yuki-api/worker.mjs';
const history=(kind='fact')=>[{role:'user',content:`Can you tell me a ${kind}?`},{role:'assistant',content:kind==='fact'?'Octopuses have three hearts.':'Why did the bicycle fall over? It was two tired!'}];

test('plain fact requests and natural short follow-ups retain their activity in both languages',()=>{
 assert.equal(lightChatKind({message:'Can you tell me a fact?'},{}),'fact');
 for(const kind of ['fact','joke'])for(const message of ['Can you tell me another?','another one please','How about another one?','Do you have any others?','Something different!','That’s cool, got another one?','Can I hear one more?','もうひとつ教えて','もう一つお願い']){
  assert.equal(discoveryKind(message,history(kind)),kind,message);
  assert.equal(lightChatKind({message,history:history(kind)},{}),kind,message);
 }
 assert.equal(discoveryKind('Can you tell me another?',[]),'');
 assert.equal(discoveryKind('another one',[...history(),{role:'user',content:'Explain the resume.'}]),'');
});

test('explanation follow-ups and new specific topics are not another random discovery',()=>{
 for(const message of ['Why is that funny?','Explain that joke.','Is that fact true?','How do you know?','Tell me more about that.','What is a fact?','What is refraction?','Show me another project.','Tell me about your garden.'])assert.equal(discoveryKind(message,history()),'',message);
 assert.equal(lightChatKind({message:'Tell me a fact about this project',history:history()},{}),'');
 const input={message:'What is refraction?',history:history(),lang:'en',page:'/yuki/',context:{gardenSpot:'nest'}};
 const k=selectKnowledge({owner:'Lloyd',bio:{en:'Creator'},pages:[{id:'garden',url:'/yuki/',lang:'en',title:'Yuki’s Garden',text:'A fictional sunny garden.',sections:[]}]},input);
 assert.equal(Boolean(k.view.localQuestion),false);
 assert(modelRequest(input,k,{mode:'eligible'}).messages[0].content.includes('OPTIONAL WEB LOOKUP'));
});

test('short payoff and lightly paraphrased claim stay repeated despite a different personal aside',()=>{
 for(const [old,next] of [
  ['Why did the bicycle fall over? It was two tired!','A bicycle toppled over because it was two tired. I would lend it a tiny pillow.'],
  ['Octopuses have three hearts. Two pump blood to the gills.','An octopus actually has 3 hearts. I picture a little team keeping things moving.']
 ])assert(needsFreshText(next,{message:'Can you tell me another?',history:[{role:'user',content:'Tell me a '+(old.startsWith('Why')?'joke':'fact')},{role:'assistant',content:old}]}));
 assert(!needsFreshText('Wombats make cube-shaped droppings. This needs its own source and explanation.',{message:'another one',history:history()}));
});

test('recall retains older discoveries even when the visitor repeats the same question',()=>{
 const memory=new ConversationMemory(null,'en');
 memory.remember('Tell me a fact.','An older octopus fact.');
 memory.remember('Tell me about your garden.','The garden is my fictional home.');
 const recalled=memory.recall('Tell me a fact.',[{role:'user',content:'Tell me a fact.'},{role:'assistant',content:'A newer astronomy fact.'}]);
 assert(recalled.some(m=>m.answer==='An older octopus fact.'));
});

test('generic recurring framing is detected without changing ordinary necessary identity answers',()=>{
 const prior=['That is such an interesting question! A volcano releases molten rock.','That is such an interesting question! A prism separates colors.'];
 assert(needsFreshText('That is such an interesting question! A telescope gathers light so distant objects become easier to study.',{message:'What does a telescope do?',history:prior.map(content=>({role:'assistant',content}))}));
 assert(!needsFreshText('My name is Yuki.',{message:'What is your name?',history:[{role:'assistant',content:'My name is Yuki.'}]}));
 assert(!needsFreshText('That is such an interesting question! A telescope gathers light so distant objects become easier to study.',{message:'What does a telescope do?',history:[{role:'assistant',content:prior[0]}],memory:[{question:'What is a volcano?',answer:prior[0]}]}),'One answer supplied twice is not two prior uses');
});

test('joke prompt requires a connected payoff and lookup notices stay outside remembered conversation',()=>{
 const prompt=modelRequest({message:'another one',history:history('joke'),lang:'en'},{pages:[]}).messages[0].content;
 assert.match(prompt,/HUMOR LOGIC/);assert.match(prompt,/same punchline is the SAME joke/);assert.match(prompt,/new joke/);
 const ui=readFileSync(new URL('../assets/yuki/yuki.mjs',import.meta.url),'utf8');
 const start=ui.indexOf('const cue=validReply(result);'),guard=ui.indexOf('if(cue.notice)',start),remember=ui.indexOf('conversationMemory.remember(text,cue.text)',start);
 assert(guard>start&&guard<remember);assert.match(ui.slice(guard,guard+95),/status\(cue.text\).*return/s);
});

test('only trusted joke classification selects the fixed free-plan humor model with no extra inference',async()=>{
 const calls=[],ai={run:async(name,request)=>{calls.push({name,request});return {};}};
 const joke=modelRequest({message:'Can you tell me another?',history:history('joke'),lang:'en'},{pages:[]});
 await runModel(ai,joke);assert.equal(calls.length,1);assert.equal(calls[0].name,CLOUDFLARE_HUMOR_MODEL);
 assert.equal(calls[0].request.yukiTask,undefined);assert.equal(calls[0].request.chat_template_kwargs.enable_thinking,false);
 assert.equal(calls[0].request.response_format.json_schema.schema.type,'object');assert.equal(calls[0].request.max_tokens,1900);
 const input=validateInput({message:'How does the project work?',lang:'en',page:'/',token:'fixture',history:[],yukiTask:'joke',model:'arbitrary'});
 assert.equal(input.yukiTask,undefined);await runModel(ai,modelRequest(input,{pages:[]}));assert.equal(calls[1].name,CLOUDFLARE_MODEL);
 const japanese=modelRequest({message:'もうひとつ教えて',history:history('joke'),lang:'en',replyLanguage:'ja'},{pages:[]});
 await runModel(ai,japanese);assert.equal(calls.length,3);assert.equal(calls[2].name,CLOUDFLARE_TRANSLATION_MODEL);
 assert.equal(calls[2].request.yukiTask,undefined);assert.equal(calls[2].request.chat_template_kwargs.enable_thinking,false);
});
