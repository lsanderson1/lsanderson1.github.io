import test from 'node:test';
import assert from 'node:assert/strict';
import {modelRequest,parseModel,validateInput,runModel,CLOUDFLARE_HUMOR_MODEL,CLOUDFLARE_TRANSLATION_MODEL} from '../services/yuki-api/worker.mjs';
import {canPlanFact,factIntentInstructions,factIntentRequest} from '../services/yuki-api/fact-intent.mjs';
import {needsFreshReply,recentAnswers,rewriteRequest} from '../services/yuki-api/reply-variety.mjs';

const input={message:'I could use a tiny discovery to brighten my afternoon. You choose the subject!',lang:'en',page:'/',history:[],webSearch:true};
const value={text:'Let me find a little discovery to explore.',emotion:'thoughtful',gesture:'none',destination:'none',sourceIds:[],storyTopics:[]};
test('initial intent hints understand meaning rather than an exact phrase list',()=>{
 for(const lang of ['en','ja']){
  const request=modelRequest({...input,lang},{pages:[]},{mode:'eligible'});
  assert.deepEqual(request.response_format.json_schema.properties.factIntent.enum,['none','open','subject']);
  assert(request.response_format.json_schema.required.includes('factIntent'));
  assert.equal(request.messages.at(-1).role,'user');assert(request.messages.at(-2).content.includes(factIntentInstructions));
  assert.match(factIntentInstructions,/not a closed phrase list/);assert.match(factIntentInstructions,/visitor-requested subject/);
  assert.match(factIntentInstructions,/definition, explanation/);assert.match(factIntentInstructions,/website\/navigation/);
 }
});

test('compact intent and sourced answers use fixed existing models with bounded requests',async()=>{
 const calls=[],ai={run:async(name,request)=>{calls.push({name,request});return {};}};
 await runModel(ai,factIntentRequest(input));
 assert.equal(calls[0].name,CLOUDFLARE_HUMOR_MODEL);assert.equal(calls[0].request.max_tokens,400);
 for(const lang of ['en','ja'])await runModel(ai,modelRequest({...input,lang},{pages:[]},{mode:'results',factIntent:true,entries:[]}));
 assert.deepEqual(calls.map(c=>c.name),[CLOUDFLARE_HUMOR_MODEL,CLOUDFLARE_HUMOR_MODEL,CLOUDFLARE_TRANSLATION_MODEL]);
 for(const call of calls){assert.equal(call.request.yukiTask,undefined);assert.equal(call.request.response_format.json_schema.schema.type,'object');}
});
test('page, portrait, guide, joke and evidence-answer paths do not re-plan a random discovery',()=>{
 for(const view of [{focus:{}},{localQuestion:true},{visual:{}},{questionPage:{}}])assert.equal(canPlanFact(input,{view}),false);
 assert.equal(canPlanFact({...input,guideEvent:{}},{}),false);
 const joke=modelRequest({...input,message:'Tell me a joke'},{pages:[]},{mode:'eligible'});
 assert.equal(joke.response_format.json_schema.properties.factIntent,undefined);
 const answered=modelRequest(input,{pages:[]},{mode:'results',factIntent:true,entries:[]});
 assert.equal(answered.response_format.json_schema.properties.factIntent,undefined);
 assert.match(answered.messages[0].content,/Choose ONE interesting claim/);
});
test('intent and repeat flags are validated server metadata, not accepted from the visitor',()=>{
 const clean=validateInput({...input,token:'fixture',factIntent:'open',factDiscovery:true});
 assert.equal(clean.factIntent,undefined);assert.equal(clean.factDiscovery,undefined);
 assert.equal(parseModel({response:{...value,factIntent:'open'}},{pages:[]},{mode:'eligible'}).factIntent,'open');
 for(const factIntent of ['anything',{},true])assert.throws(()=>parseModel({response:{...value,factIntent}},{pages:[]}));
 assert.equal(parseModel({response:{...value,factIntent:'open'}},{pages:[]},{mode:'results'}).factIntent,undefined);
});
test('semantic discoveries retain the full fact memory and strict claim-repeat checks',()=>{
 const prior='Octopuses have three hearts.';
 const semantic={...input,factDiscovery:true,variety:{facts:[prior]},history:[]};
 assert.deepEqual(recentAnswers(semantic),[prior]);
 assert(needsFreshReply({...value,text:'An octopus actually has 3 hearts. I would love to see that teamwork!'},semantic));
 const request=modelRequest(input,{pages:[]},{mode:'results',factIntent:true,entries:[]});
 assert.match(rewriteRequest(request,{...value,sources:[]},semantic).messages.at(-2).content,/DIFFERENT fact only if the already supplied verified evidence supports it/);
});
test('substantive answers and source-backed discoveries retain explanation craft and character voice',()=>{
 for(const lang of ['en','ja'])for(const web of [{},{mode:'results',factIntent:true,entries:[]}]){
  const request=modelRequest({...input,lang},{pages:[]},web),prompt=request.messages.map(m=>m.content).join('\n');
  assert.match(prompt,/EXPLANATION AND PERSONALITY TOGETHER/);assert.match(prompt,/WHY it delights or interests you/);
  assert.match(prompt,/hypothetical examples/);assert.match(prompt,/first-person, warm and playfully curious/);
  assert.equal(request.max_tokens,1900);
 }
});
