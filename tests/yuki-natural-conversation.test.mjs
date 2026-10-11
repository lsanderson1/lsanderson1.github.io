import test from 'node:test';
import assert from 'node:assert/strict';
import {firstPersonInstructions,conversationStyleInstructions,voiceInstructions,ownerNameInstructions} from '../services/yuki-api/personality.mjs';
import {modelRequest} from '../services/yuki-api/worker.mjs';
import {pageAnswerRequest} from '../services/yuki-api/page-answer.mjs';
import {lightChatRequest} from '../services/yuki-api/light-chat.mjs';
import {guideReplyRequest} from '../services/yuki-api/guide-followup.mjs';
import {translationRequest} from '../services/yuki-api/conversation-translation.mjs';
import {completionRequest} from '../services/yuki-api/reply-completion.mjs';

const schema={type:'object',properties:{text:{type:'string'}}},knowledge={pages:[],view:{}};
const web={mode:'disabled',entries:[]};
for(const lang of ['en','ja'])test(`all ${lang} answer paths speak as Yuki without altering budgets or ownership`,()=>{
 const input={message:'Tell me about your dreams.',lang,page:'/yuki/',history:[{role:'user',content:'I like quiet reading corners.'},{role:'assistant',content:'I like those too.'}]};
 const general=modelRequest(input,knowledge);
 const requests=[general,pageAnswerRequest({...input,message:'What is this place?'},knowledge,web,schema),lightChatRequest(input,web,schema,'joke'),guideReplyRequest({...input,guideEvent:{kind:'arrive'}},schema,knowledge),translationRequest([{id:'a',role:'assistant',text:'My dream is a flying library.'}],lang)];
 for(const request of requests){const prompt=request.messages.map(m=>m.content).join('\n');assert(prompt.includes(firstPersonInstructions));assert(prompt.includes(conversationStyleInstructions));assert(prompt.includes(ownerNameInstructions));}
 assert.equal(general.max_tokens,1900);assert.equal(general.temperature,.7);
 assert(general.messages.some(m=>m.role==='user'&&m.content==='I like quiet reading corners.'));
 assert.equal(requests[1].max_tokens,1900);assert.equal(requests[2].max_tokens,1900);assert.equal(requests[4].max_tokens,3600);
 assert.match(voiceInstructions(lang),/happy, innocent, cheerful, playful and joyful/);
 assert.match(firstPersonInstructions,/Lloyd's work remains Lloyd's/);assert.match(firstPersonInstructions,/direct quotations/);assert.match(firstPersonInstructions,/Never perform blind/);
 const reply={text:'A complete reply.',sources:[],storyTopics:[]};
 for(const issues of [['voice'],['unfinished'],['repetition']]){const prompt=completionRequest(general,reply,knowledge,web,lang,issues).messages[0].content;assert(prompt.includes(firstPersonInstructions));assert(prompt.includes(ownerNameInstructions));}
 assert.match(ownerNameInstructions,/normally call the portfolio owner Lloyd/);
 assert.match(ownerNameInstructions,/only when the full identity is useful or explicitly requested/);
 assert.match(ownerNameInstructions,/preserve exact official titles/);
 assert.match(ownerNameInstructions,/not automatically the visitor/);
 assert.match(voiceInstructions(lang),/exact-title exception is narrow/);
 assert.doesNotMatch(requests[1].messages.map(m=>m.content).join('\n'),/Name the page and, when resolved/);
});
