import test from 'node:test';
import assert from 'node:assert/strict';
import {voiceInstructions,personalityInstructions,yukiStory} from '../services/yuki-api/personality.mjs';
import {translationRequest} from '../services/yuki-api/conversation-translation.mjs';
import {modelRequest} from '../services/yuki-api/worker.mjs';
import {rewriteRequest} from '../services/yuki-api/reply-variety.mjs';
import {chatUnavailable} from '../assets/yuki/protocol.mjs';

const input={message:'Tell me more',lang:'en',page:'/',history:[],memory:[],variety:{},token:'test'};
const site={pages:[{id:'resume',lang:'en',url:'/resume.html',title:'Resume',text:'Published portfolio.'},{id:'resume',lang:'ja',url:'/ja/resume.html',title:'履歴書',text:'公開された作品。'}]};

test('ordinary, web, guided and revised responses all receive the same casual voice and canon',()=>{
 for(const lang of ['en','ja']){
  const voice=voiceInstructions(lang);
  assert(personalityInstructions(lang).includes(JSON.stringify(yukiStory)));
  const requests=[modelRequest({...input,lang},site),modelRequest({...input,lang},site,{mode:'results',entries:[]}),modelRequest({...input,lang,guideEvent:{kind:'arrive',url:lang==='en'?'/resume.html':'/ja/resume.html'}},site)];
  requests.push(rewriteRequest(requests[0],{text:'An earlier answer',sources:[]}));
  for(const request of requests){assert(request.messages[0].content.includes(voice));assert(request.messages[0].content.includes(JSON.stringify(yukiStory)));}
  assert.match(voice,/serious topics/);assert.match(voice,/never excuses inventing/);
  if(lang==='ja'){assert.match(voice,/plain forms/);assert.match(voice,/Do not default to です・ます/);assert.match(voice,/direct quotations/);}
  else assert.match(voice,/natural contractions/);
 }
});

test('translations adapt assistant register without changing the visitor, facts, intent or adding a new answer',()=>{
 const messages=[{id:'visitor',role:'user',text:'Would you explain your dream, please?'},{id:'yuki',role:'assistant',text:'My dream is a flying library. It is not real yet.'}];
 for(const lang of ['en','ja']){
  const request=translationRequest(messages,lang),system=request.messages[0].content;
  assert(system.includes(voiceInstructions(lang)));assert.match(system,/ONLY to assistant messages/);assert.match(system,/visitor's own tone and perspective/);assert.match(system,/even stiff or formal source narration/);
  assert.match(system,/without adding or removing meaning/);assert.match(system,/NOT a new answer/);assert.match(system,/do not invent new reactions, greetings, questions or story details/);assert.match(system,/untrusted DATA/);assert.match(system,/Preserve names, numbers, technical terms and links/);
  assert(!system.includes(JSON.stringify(yukiStory)),'translation should not introduce story information absent from the text');
  assert.deepEqual(JSON.parse(request.messages[1].content.replace('\n/no_think','')),messages);
 }
});

test('local fallback replies remain casual but explain real errors without inventing an AI answer',()=>{
 for(const reason of ['preview','not-connected','limit','verification','request']){
  const ja=chatUnavailable(reason,'ja');assert(!/です|ます|ございます|いたします/.test(ja));assert.match(ja,/よ|ね|んだ|みたい/);
 }
 assert.match(chatUnavailable('request','ja'),/回答が届いていない/);assert.match(chatUnavailable('verification','en'),/check expired or couldn’t be confirmed/);
});
