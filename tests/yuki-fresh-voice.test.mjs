import test from 'node:test';
import {jokeReviewRequest} from '../services/yuki-api/joke-review.mjs';
import assert from 'node:assert/strict';
import {thirdPersonSelf} from '../assets/yuki/runtime/self-narration.mjs';
import {needsFreshText,rememberReply} from '../assets/yuki/runtime/reply-variety.mjs';
import {recentAnswers,varietyInstructions,rewriteRequest} from '../services/yuki-api/reply-variety.mjs';
import {modelRequest} from '../services/yuki-api/worker.mjs';
import {guideReplyMatches} from '../assets/yuki/runtime/guide-journey.mjs';

test('self narration covers home, possessions, aspirations and creation in EN/JA',()=>{
 for(const text of ["This is Yuki's Garden, her bright little home.","Yuki dreams of a flying library.","Lloyd created Yuki using drawings.","Yuki's glasses help her look carefully.",'ここはゆきの庭。','ユキは本が好きだよ。','Yukiの夢は空飛ぶ図書館だよ。'])assert(thirdPersonSelf(text),text);
 for(const text of ["This is my garden, with room for a little nap.","I love my little glasses.","Lloyd created me from drawings.",'ここはわたしの庭。本を読むのが好き！',"Tap the Yuki's Garden tab.","Choose ‘Yuki’s Garden’ in the header.",'「ゆきの庭」のリンクを選んでね。',"Lloyd likes Blender. His project is shown here.","My friend said, “Yuki loves books.”",'Code: `Yuki is a label`'])assert(!thirdPersonSelf(text),text);
 assert(thirdPersonSelf("Click the Yuki's Garden tab, where Yuki loves to nap."));
 assert(!thirdPersonSelf('Yuki loves the moon.','Tell a story in third person.'));
 assert(!thirdPersonSelf("The official title is Yuki's Garden.",'What is this page called?'));
});

test('a garden arrival can speak as my garden while other route destinations stay exact',()=>{
 for(const [lang,prefix,name,text] of [['en','','Yuki’s Garden','We made it to my garden! This is my cozy little home.'],['ja','/ja','ゆきの庭','ここがわたしの庭！一緒にひと休みしよう。']]){
  const pages=[{id:'garden',url:prefix+'/yuki/',lang,title:name,text:'A sunny garden.'},{id:'resume',url:prefix+'/resume.html',lang,title:'Resume',text:'Skills and education.'}];
  const input={message:'Guide arrival',lang,history:[],guideEvent:{kind:'arrive',url:prefix+'/yuki/'}};
  assert(guideReplyMatches(text,input.guideEvent,pages,lang));assert(!thirdPersonSelf(text));
  assert(!guideReplyMatches(text,{kind:'arrive',url:prefix+'/resume.html'},pages,lang));
  const request=modelRequest(input,{pages:[pages[0]]});assert(request.messages[0].content.includes(lang==='ja'?'わたしの庭':'my garden'));
 }
});

test('facts and punchlines cannot be recycled by attaching a new reaction',()=>{
 for(const [message,old,next] of [
  ['Tell me another fun fact.','Octopuses have three hearts. That is a surprising arrangement!','Octopuses have three hearts. I imagine a tiny orchestra keeping all that rhythm.'],
  ['Tell me another joke.','Why did the bicycle fall over? It was two tired!','Why did the bicycle fall over? It was two tired! That little bicycle needs a nap.'],
  ['別の豆知識を教えて。','タコには心臓が三つあり、そのうち二つはえらに血液を送る。','タコには心臓が三つあり、そのうち二つはえらに血液を送る。体の中で仕事を分けているんだね！']
 ])assert(needsFreshText(next,{message,memory:[{question:message,answer:old}]}));
 const old='Octopuses have three hearts. That is a surprising arrangement!';
 assert(!needsFreshText('A different subject belongs here, with its own explanation and example.',{message:'Tell me another fun fact.',memory:[{answer:old}]}));
 assert(!needsFreshText(old,{message:'Repeat your last answer word for word.',variety:rememberReply(null,old)}));
 assert(!needsFreshText('My name is Yuki.',{message:'What is your name?',history:[{role:'assistant',content:'My name is Yuki.'}]}));
});

test('older recall and bounded excerpts participate in the novelty guard',()=>{
 const old='I imagine warm lanterns above a shelf where each visitor can find a story at their own pace. There would be a quiet corner for questions.';
 assert(needsFreshText(old+' I would enjoy arranging the bookmarks.',{message:'Tell me more.',memory:[{answer:old}]}));
 const input={message:'Tell me another joke.',history:[],memory:[{question:'Tell me a joke.',answer:'An older joke to avoid.'}]};
 assert.deepEqual(recentAnswers(input),['An older joke to avoid.']);
 for(const pages of [[],[{id:'garden',text:'My home.'}]]){
  const request=modelRequest({...input,lang:'en'}, {pages},{mode:'eligible'});
  assert.doesNotMatch(JSON.stringify(request.messages),/An older joke to avoid/,'generation must not be primed by the old plot');
  const review=jokeReviewRequest(request,{text:'A candidate joke.'},input);
  assert.match(review.messages.at(-1).content,/An older joke to avoid/);
  assert.match(review.messages[0].content,/SAME sequence of comic beats/);
  assert.equal(request.max_tokens,1900);
 }
 assert.match(varietyInstructions(input),/do not invent facts/);
});

test('facts search for a new supported subject and do not confuse novelty with evidence',()=>{
 const input={message:'Tell me a random fact.',lang:'en',history:[],memory:[{question:'Trivia?',answer:'Previously shared fact.'}]};
 const request=modelRequest(input,{pages:[]},{mode:'eligible'});
 assert.match(request.messages[0].content,/history, language, art, technology/);
 assert.match(request.messages[0].content,/never visitor details or history/);
 const sourced=modelRequest(input,{pages:[]},{mode:'results',entries:[]});
 assert.match(sourced.messages[0].content,/NOT already shared/);
 assert.match(sourced.messages[0].content,/none of the entries supports a new useful fact/);
 const reply={text:'Repeated fact.',sources:[{url:'https://example.org/source'}],emotion:'thoughtful',gesture:'none',destination:'none'};
 const revised=rewriteRequest(sourced,reply,input);
 assert.match(revised.messages.at(-2).content,/already supplied verified evidence/);
 assert.match(revised.messages.at(-2).content,/request another lookup/);
});
