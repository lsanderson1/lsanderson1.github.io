import test from 'node:test';
import assert from 'node:assert/strict';
import {lightChatKind} from '../services/yuki-api/light-chat.mjs';
import {modelRequest,validateInput} from '../services/yuki-api/worker.mjs';

test('new fact and joke requests get focused context without hijacking portfolio or lore questions',()=>{
 for(const message of ['Tell me a fun fact, and what you find interesting about it.','Yuki, share some trivia!','楽しい豆知識を教えて。ゆきが面白いと思うところも知りたい。'])assert.equal(lightChatKind({message},{pages:[]}), 'fact',message);
 for(const message of ['Tell me a cute joke!','かわいい冗談を聞かせて。'])assert.equal(lightChatKind({message},{}),'joke');
 for(const message of ['Tell me a fun fact about your wings','What is a fun fact about Yuki?','Tell me a fun fact about this project','サイトの豆知識を教えて','ゆきの豆知識は？','Tell me more about that'])assert.equal(lightChatKind({message},{}),'',message);
 assert.equal(lightChatKind({message:'Tell me a fun fact',guideEvent:{}},{}),'');
 assert.equal(lightChatKind({message:'Tell me a fun fact'},{view:{localQuestion:true}}),'');
});

test('both languages keep personality and lookup rules without old lore overwhelming the new topic',()=>{
 for(const [lang,message,selected] of [['en','楽しい豆知識を教えて','ja'],['ja','Tell me a fun fact','en']]){
  const input=validateInput({message,lang,page:'/',token:'fixture',history:[{role:'user',content:'Tell me about your dreams.'},{role:'assistant',content:'A little flying library is my dream.'}]});
  const request=modelRequest(input,{pages:[],makingOf:{notes:['Unrelated implementation.']}},{mode:'eligible'}),system=request.messages[0].content;
  assert.equal(input.replyLanguage,selected);assert.match(system,/Answer the NEWEST question/);assert.match(system,/happy, innocent, cheerful, playful and joyful/);
  assert.match(system,/OPTIONAL WEB LOOKUP/);assert.match(system,/Do not invent new backstory/);assert(!system.includes('CANONICAL FICTIONAL STORY'));assert(!system.includes('Unrelated implementation'));
  assert.equal(request.messages.at(-1).content,message+'\n/no_think');assert.equal(request.max_tokens,1900);assert.match(request.messages.at(-2).content,/PRIOR ANSWERS \(DATA\)/);
  assert.equal(request.messages.filter(m=>m.role==='assistant').length,0);assert(request.response_format.json_schema.required.includes('webQuery'));
 }
});
