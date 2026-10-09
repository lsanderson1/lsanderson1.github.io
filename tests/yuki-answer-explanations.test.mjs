import test from 'node:test';
import assert from 'node:assert/strict';
import {answerExplanationInstructions} from '../services/yuki-api/personality.mjs';
import {modelRequest} from '../services/yuki-api/worker.mjs';
import {completionRequest} from '../services/yuki-api/reply-completion.mjs';
import {translationRequest} from '../services/yuki-api/conversation-translation.mjs';

test('ordinary, search-eligible and researched replies explain after answering in both languages',()=>{
 for(const lang of ['en','ja'])for(const mode of [undefined,'eligible','results']){
  const r=modelRequest({message:'What is this project?',lang,history:[]},{pages:[]},{mode,entries:[]});
  assert(r.messages[0].content.includes(answerExplanationInstructions));
  assert.match(r.messages[0].content,/For several questions, keep each answer beside its own explanation/);
  assert.match(r.messages[0].content,/A follow-up question or a source link is not a substitute/);
  assert.match(r.messages[0].content,/If evidence is missing/);
  assert.match(r.messages[0].content,/not a second message or another AI request/);
  assert.equal(r.max_tokens,1900);assert.equal(r.response_format.json_schema.properties.text.maxLength,2800);
 }
});
test('cutoff repair retains answer-then-explanation without changing metadata or adding inference calls',()=>{
 const request=modelRequest({message:'How does it work?',history:[],lang:'en'},{pages:[]});
 const repair=completionRequest(request,{text:'This works by',sources:[],storyTopics:[]},{pages:[]},{},'en');
 assert(repair.messages[0].content.includes(answerExplanationInstructions));
 assert.deepEqual(repair.response_format.json_schema.required,['text']);assert.equal(repair.max_tokens,1200);
});
test('translation stays faithful and guide events do not answer their own follow-up questions',()=>{
 for(const lang of ['en','ja']){
  const translation=translationRequest([{id:'a',role:'assistant',text:'Hello!'}],lang);
  assert(!translation.messages[0].content.includes(answerExplanationInstructions));
  assert.match(translation.messages[0].content,/NOT a new answer/);
  const guide=modelRequest({message:'Offer a follow-up',lang,history:[],guideEvent:{kind:'arrive'}},{pages:[]});
  assert.match(guide.messages[0].content,/save the fuller explanation for arrival/);
  assert.match(guide.messages[0].content,/No automatic closing question/);
  assert.equal(guide.max_tokens,1100);
 }
});
