import test from 'node:test';
import assert from 'node:assert/strict';
import {asksConversationFollowup,explicitFollowupSubject,followupHistory,followupIntent} from '../services/yuki-api/followup-context.mjs';
import {namedFollowupSubject,isContextualFollowup,followupReplyIssues} from '../services/yuki-api/followup-answer.mjs';
import {modelRequest,validateInput,selectKnowledge} from '../services/yuki-api/worker.mjs';
import {replyLanguage} from '../assets/yuki/runtime/reply-quality.mjs';
import {needsFreshText} from '../assets/yuki/runtime/reply-variety.mjs';
import {completionRequest} from '../services/yuki-api/reply-completion.mjs';

const matrix=[
 ['tool','Lloyd used Blender to create models for a game.','What is that tool for?','ロイドはゲームのモデル作りにBlenderを使った。','そのツールは何に使うの？'],
 ['science','Refraction changes the direction of light as it crosses between materials.','How does that work?','屈折は、違う物質に進むときに光の進む向きが変わること。','どうやって？'],
 ['reason','A spoon partly in water can appear bent because light changes direction at the surface.','Why?','水に入れたスプーンが曲がって見えるのは、水面で光の進む向きが変わるから。','どうして？'],
 ['example','A variable is a named place to refer to a value in a program.','Can you give me an example?','変数は、プログラムの値を名前で扱うための仕組み。','具体例は？'],
 ['person','Marie Curie studied radioactivity.','Who was she?','マリー・キュリーは放射能を研究した。','彼女はだれ？'],
 ['culture','Haiku often focuses on a brief observation of nature or everyday life.','Could you elaborate?','俳句は自然や日常の小さな発見を短い言葉で表すことが多い。','もう少し詳しく教えて'],
 ['history','The printing press made it easier to produce many copies of a text.','Tell me more','活版印刷は同じ文章をたくさん刷ることに役立った。','もっと教えて'],
 ['clarification','Two different approaches were just mentioned: a list and a dictionary.','How are they different?','直前にリストと辞書という二つの方法を説明した。','その違いは？'],
 ['simplify','An event loop schedules work when pending operations can proceed.','In simpler terms?','イベントループは、処理を進められる順番に作業を扱う仕組み。','もっとわかりやすく説明して'],
 ['opinion','I dream of a small flying library with comfortable reading perches.','What do you like about that?','小さな空飛ぶ図書館を作るのが夢。読む人がゆっくり座れる場所も用意したい。','そのどこが好き？']
];

test('follow-up routing covers varied subjects and elliptical questions in both languages',()=>{
 for(const [id,en,qen,ja,qja] of matrix)for(const [lang,answer,message] of [['en',en,qen],['ja',ja,qja]]){
  const input={message,lang,history:[{role:'user',content:lang==='en'?'Please explain.':'説明して。'},{role:'assistant',content:answer}],page:'/yuki/'};
  assert(asksConversationFollowup(input),`${id}: ${message}`);
  const request=modelRequest(input,{pages:[]});
  assert.equal(request.yukiTask,lang==='ja'?'contextual-followup-ja':'contextual-followup',`${id}: ${message}`);
  assert.equal(request.max_tokens,1900);assert.equal(request.messages.at(-1).content,message+'\n/no_think');
  assert.match(request.messages[0].content,/5–8 connected sentences/);
  assert.match(request.messages[0].content,/happy, innocent, playful, kind and joyful/);
  assert.match(request.messages[0].content,/Speak in first person/);
  assert.match(request.messages[0].content,/not an automatic follow-up question/);
  assert.match(request.messages[0].content,/two referents are genuinely plausible/);
  if(lang==='ja')assert.match(request.messages[0].content,/普通体.*です・ます/s);
 }
});

test('the requested answer type determines the next layer rather than a repeated definition',()=>{
 for(const [expected,questions] of [
  ['reason',['Why?','How come?','どうして？','なぜ？','なんで？']],
  ['example',['An example?','Give me an example of that','具体例は？','例を見せて']],
  ['mechanism',['How does it work?','How?','どうやって？','その仕組みを教えて']],
  ['expand',['Tell me more','Could you elaborate?','もう少し詳しく教えて','続きを聞かせて']],
  ['comparison',['How are they different?','Compare that with the first one','その違いは？','前のものと比べて']],
  ['simplify',['In simpler terms?','I do not understand that','もっとわかりやすく説明して']],
  ['opinion',['What do you think about it?','What do you like about that?','それをどう思う？']],
  ['correction',["No, I meant the second one",'そうじゃなくて、二つ目のこと。','違うよ、二つ目のこと。']],
  ['evidence',['Sources?','How do you know that?','根拠は？','出典を教えて']]
 ])for(const message of questions)assert.equal(followupIntent(message),expected,message);
});

test('short corrections and evidence requests keep conversational context',()=>{
 for(const message of ['Sources?','Evidence?','根拠は？','出典を教えて',"No, I meant the second one",'違うよ、二つ目のこと。']){
  const input={message,history:[{role:'assistant',content:'Two possible approaches are a list and a dictionary.'}],lang:'en'};
  assert(asksConversationFollowup(input),message);
  assert(isContextualFollowup(input,{}),message);
 }
});

test('already-mentioned explicit subjects work across domains and languages without copying old prose',()=>{
 for(const [message,answer,name] of [
  ['What is Blender used for?','Lloyd made game assets with Blender.','Blender'],
  ['Who was Marie Curie?','Marie Curie studied radioactivity.','Marie Curie'],
  ['What is refraction?','Refraction affects the path of light.','refraction'],
  ['Tell me about haiku.','Haiku is a form of poetry.','haiku'],
  ['Blenderって何？','モデルの制作にBlenderを使った。','Blender'],
  ['マリー・キュリーとは？','放射能の研究でマリー・キュリーが知られている。','マリー・キュリー'],
  ['「屈折」って何？','水に入るときの屈折で向きが変わる。','屈折'],
  ['俳句について教えて','俳句は短い言葉の表現。','俳句']
 ]){
  assert.equal(explicitFollowupSubject(message,[answer]),name);
  const history=[{role:'assistant',content:answer}],input={message,history,lang:replyLanguage(message,'en')};
  assert(isContextualFollowup(input,{pages:[]}));
  const request=modelRequest(input,{pages:[]});
  assert(request.messages[0].content.includes('RESOLVED SUBJECT NAME'));
  assert(!request.messages[0].content.includes(answer));
 }
 assert.equal(explicitFollowupSubject('What is Java?',['JavaScript is a programming language.']),'');
 for(const message of ['What is that tool?','Who is she?','What is your dream?','それって何？'])assert.equal(explicitFollowupSubject(message,['that tool she your dream それ']),'');
});

test('Japanese named geographic references have the same conservative name-only handling',()=>{
 for(const [message,answer,name] of [
  ['その海はどこ？','シリアの西側に地中海がある。','地中海'],
  ['その海って何？','ペルーは太平洋に面している。','太平洋'],
  ['その川はどこ？','アマゾン川が流れている。','アマゾン川'],
  ['その山はどこ？','富士山が見える。','富士山']
 ])assert.equal(namedFollowupSubject(message,[{role:'assistant',content:answer}]),name);
 assert.equal(namedFollowupSubject('その海はどこ？',[{role:'assistant',content:'地中海と太平洋について説明した。'}]),'');
 assert.equal(namedFollowupSubject('その海はなぜ深い？',[{role:'assistant',content:'太平洋の深さについて説明した。'}]),'');
});

test('history is minimal once, but comparisons and explicit older revisits keep necessary context',()=>{
 const history=[{role:'user',content:'Tell me about a list.'},{role:'assistant',content:'A list stores ordered items.'},{role:'user',content:'And a dictionary?'},{role:'assistant',content:'A dictionary associates keys with values.'}];
 const input={message:'An example?',history,lang:'en',memory:[{question:'Old unrelated question',answer:'Old unrelated answer.'}]},before=JSON.stringify(input);
 assert.deepEqual(followupHistory(input),history.slice(-2));
 let request=modelRequest(input,{pages:[]});assert(!request.messages[0].content.includes('Old unrelated answer'));assert(!request.messages[0].content.includes('A list stores'));
 assert.equal(JSON.stringify(input),before);
 request=modelRequest({...input,message:'How does that compare with the first one?'},{pages:[]});
 assert(request.messages[0].content.includes('A list stores'));assert(request.messages[0].content.includes('A dictionary associates'));
 const consecutive=[{role:'assistant',content:'An earlier greeting.'},{role:'assistant',content:'The latest answer.'}];
 assert.deepEqual(followupHistory({message:'Why?',history:consecutive}),consecutive.slice(-1));
 const recall={message:'What is Blender?',lang:'en',history:[],memory:[{question:'A tool?',answer:'Blender creates 3D models.'}]};
 assert(isContextualFollowup(recall,{}));assert(!isContextualFollowup({...recall,message:'Why?'},{}));
});

test('new questions, page awareness, guides, and fresh discoveries retain their own routing',()=>{
 const history=[{role:'assistant',content:'A rainbow separates sunlight into colors.'}];
 for(const message of ['Hello','Thank you','Why is the sky blue?','Where is Tokyo?','What is photosynthesis?'])assert(!isContextualFollowup({message,history},{}),message);
 for(const view of [{focus:{}},{localQuestion:true},{visual:{}},{questionPage:{}}])assert(!isContextualFollowup({message:'Why?',history},{view}));
 assert(!isContextualFollowup({message:'Why?',history,guideEvent:{}},{}));
 for(const message of ['Tell me another fact about it.','その話題の別の豆知識を教えて','Tell me another joke.','別のジョークを教えて'])assert(!modelRequest({message,history,lang:replyLanguage(message,'en')},{pages:[]}).yukiTask?.startsWith('contextual-followup'));
 const site={owner:'Lloyd',bio:{en:'Developer',ja:'開発者'},pages:[{id:'garden',lang:'en',url:'/yuki/',title:'Yuki’s Garden',text:'A sunny castle garden.',sections:[]}]};
 for(const message of ['What is this place?','ここはどんな場所？']){
  const input={message,history,lang:'en',page:'/yuki/'},knowledge=selectKnowledge(site,input);
  assert(knowledge.view.localQuestion);assert(!modelRequest(input,knowledge).yukiTask?.startsWith('contextual-followup'));
 }
});

test('short EN and JA follow-ups choose their spoken language even on the opposite page',()=>{
 for(const page of ['en','ja'])for(const [language,queries] of [['en',['Why?','An example?','For example?','Simpler?','Sources?','Evidence?']],['ja',['なぜ？','具体例は？','例は？','例？','誰？','理由は？','仕組みは？','根拠？','彼女は誰？','もっと教えて']]])for(const message of queries){
  const input=validateInput({message,lang:page,page:page==='ja'?'/ja/':'/',token:'fixture',history:[{role:'assistant',content:'Refraction bends the path of light. 屈折で光の進む向きが変わる。'}]});
  assert.equal(input.replyLanguage,language,message);
  assert.equal(modelRequest(input,{pages:[]}).yukiTask,language==='ja'?'contextual-followup-ja':'contextual-followup',message);
 }
});

test('new detail and examples cannot quietly reuse the entire old paragraph',()=>{
 for(const [lang,message,old,next] of [
  ['en','An example?','Variables let programs refer to a stored value by name, and that value can change as the program runs.','For example, a score variable can start at zero and increase by one when a player earns a point.'],
  ['ja','具体例は？','変数はプログラムの値を名前で扱う仕組み。動作中に値を変えられるので、その時の点数などを覚えておくのに役立つ。','例えば、点数を表す変数を最初はゼロにして、得点したら一つ増やす場面を考えてみて。']
 ]){
  const input={message,lang,history:[{role:'assistant',content:old}]};
  assert(needsFreshText(old,input));assert(!needsFreshText(next,input));
  const request=modelRequest(input,{pages:[]}),repair=completionRequest(request,{text:'unfinished because',sources:[],storyTopics:[]},{pages:[]},{},lang);
  assert.equal(repair.messages.at(-1).content,message+'\n/no_think');
  assert.equal(repair.yukiTask,request.yukiTask);
  assert(repair.messages[0].content.includes(old));
 }
});

test('general tool questions cannot borrow character or portfolio claims as their explanation',()=>{
 for(const [lang,message,answer] of [['en','What is that tool for?','Lloyd used Blender to make a 3D model.'],['ja','そのツールは何に使うの？','ロイドは3Dモデルの制作にBlenderを使った。']]){
  const knowledge={owner:'Lloyd',pages:[{id:'garden',text:'My garden has a roost.'}]},history=[{role:'assistant',content:answer}];
  const request=modelRequest({lang,message,history},knowledge);
  assert(request.messages[0].content.includes('RESOLVED SUBJECT NAME'));
  assert(!request.messages[0].content.includes('\nSITE: '));assert(!request.messages[0].content.includes('\nCHARACTER: '));
  assert.deepEqual(followupReplyIssues('Lloyd used it to build my garden.',request),['unrelated-owner']);
  assert.deepEqual(followupReplyIssues('ロイドがわたしの庭を作った。',request),['unrelated-owner']);
  assert.deepEqual(followupReplyIssues('I imagine making a little model with it!',request),[]);
  const repair=completionRequest(request,{text:'Lloyd used it to build my garden.',sources:[],storyTopics:[]},knowledge,{},lang,['unrelated-owner']);
  assert.equal(repair.yukiTask,request.yukiTask);assert.match(repair.messages.at(-2).content,/Remove ALL claims about Lloyd/);
 }
 assert.equal(namedFollowupSubject('What is that tool for?',[{role:'assistant',content:'Lloyd used Blender to model. He used Unity for the game.'}]),'');
 assert.equal(namedFollowupSubject('そのツールは何に使うの？',[{role:'assistant',content:'Blenderを使い、Unityを使った。'}]),'');
});
