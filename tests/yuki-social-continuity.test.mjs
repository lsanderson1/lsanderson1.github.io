import test from 'node:test';
import assert from 'node:assert/strict';
import {needsFreshText,requestedTopicReuse,repetitionScore,packChatRequest} from '../assets/yuki/runtime/reply-variety.mjs';
import {modelRequest,validateInput,createHandler,runModel,CLOUDFLARE_HUMOR_MODEL,CLOUDFLARE_TRANSLATION_MODEL} from '../services/yuki-api/worker.mjs';
import {followupIntent} from '../services/yuki-api/followup-context.mjs';
import {assistantQuestions,repeatedConversationQuestion} from '../assets/yuki/runtime/conversation-continuity.mjs';
import {continuityInstructions,isSocialAnswer} from '../services/yuki-api/conversation-continuity.mjs';
import {ConversationMemory} from '../assets/yuki/runtime/conversation-memory.mjs';
import {conversationHistory,messageRecord} from '../assets/yuki/runtime/conversation-language.mjs';

const first="Oh! It’s been a while! I’ve been busy exploring the garden and practicing my flights. How have you been? I’d love to hear what you’ve been up to!";
const progress="Oh, it’s going wonderfully! I’ve been practicing little loops and dives near the cherry blossoms, and today I even managed to hover just long enough to watch a paper crane spin slowly in the breeze—it made me giggle with delight! How about you? Any fun adventures or quiet moments you’d like to share?";
const repeated="Oh! That’s the best kind of visit—just because! I’m so glad you came by. I’ve been practicing my flights around the cherry blossoms, and today I even managed to hover long enough to watch a paper crane twirl in the breeze. It was absolutely delightful! How have you been? I’d love to hear what you’ve been up to!";
const history=[{role:'assistant',content:first},{role:'user',content:"How's that coming along for you?"},{role:'assistant',content:progress}];
const visit={message:'No, I just decided to come see you today!',history,lang:'en',page:'/yuki/',token:'test'};
const warm="You came just to spend a little time with me? That makes this visit feel special. We don't need a grand adventure or a task to work on. I'm happy to share a quiet little moment with you, right here.";

test('the reported visit reply is not permission to replay a flight anecdote or a personal question',()=>{
 assert.equal(requestedTopicReuse(repeated,visit),false,'A shared word such as today is not a requested topic revisit');
 assert.equal(needsFreshText(repeated,visit),true,`must catch the reported reply (old whole-text score ${repetitionScore(repeated,null,history)})`);
 assert.equal(needsFreshText(warm,visit),false);
});

test('progress follow-ups are not treated as requests to explain a technical mechanism',()=>{
 for(const message of ["How's that coming along for you?",'How is it going?','Any progress with that?','それは順調？','その後どう？','どこまで進んだ？'])assert.equal(followupIntent(message),'progress',message);
 assert.equal(followupIntent('How does that work?'),'mechanism');
 assert.equal(followupIntent('その仕組みを教えて'),'mechanism');
});

test('short repeated questions are caught even when surrounded by a genuinely new reply',()=>{
 for(const [old,next,message] of [
  ['I am glad you visited. How have you been?','We can simply enjoy this moment together. How have you been?','I just came to see you.'],
  ['最近はどう過ごしてる？','会いに来てくれたんだね。何か用事がなくても、一緒にのんびりできたら嬉しいな。最近はどう過ごしてる？','今日は会いに来ただけだよ。'],
  ['Which kind of books do you enjoy?','A tiny reading corner sounds lovely. Which kind of books do you enjoy?','I like mysteries.']
 ])assert(needsFreshText(next,{message,history:[{role:'assistant',content:old}]}),message);
});

test('a close personal retelling is caught even without its repeated closing question',()=>{
 assert(needsFreshText(repeated.split('How have you been?')[0],visit));
 const before='今日は桜の近くで飛ぶ練習をして、風にくるくる回る折り鶴を見たんだ。';
 const after='会いに来てくれて嬉しいな。今日は桜のそばで飛ぶ練習をしながら、風に回る折り鶴を見てたんだ。';
 assert(needsFreshText(after,{message:'今日は会いに来ただけだよ',history:[{role:'assistant',content:before}]}));
 // Continuing an activity with a new reflection is not itself a repeated scene.
 assert(!needsFreshText('I like the idea of taking one gentle turn at a time. A smooth landing matters more to me than a showy loop.',visit));
});

test('common check-in rephrasings are caught in both languages',()=>{
 for(const [old,next] of [['How have you been?','How are you doing?'],['最近はどう過ごしてる？','今日はどうだった？'],['最近は何をしてたの？','この頃何していたの？']]){
  assert(repeatedConversationQuestion(next,{message:'I just came to see you.',history:[{role:'assistant',content:old}]}),next);
 }
});

test('short English and Japanese check-ins are not lost to the sentence-length filter',()=>{
 for(const [old,next,message] of [['How are you?','How have you been?','I am doing well.'],['How have you been?','How are you?','Fine, thank you!'],['元気？','最近はどう過ごしてる？','元気だよ'],['最近はどう過ごしてる？','元気？','今日は楽しかったよ']]){
  assert.equal(assistantQuestions(old).length,1,old);
  assert(repeatedConversationQuestion(next,{message,history:[{role:'assistant',content:old}]}),next);
 }
 assert.deepEqual(assistantQuestions('Why?'),[],'a short ambiguous clarification is not a social check-in');
 assert.deepEqual(assistantQuestions('何？'),[]);
});

test('different conversational subjects retain both speakers and the same bilingual personality',()=>{
 const cases=[
  ['en','Which kind of books do you enjoy?','Mysteries are my favorite.'],
  ['en','What did you enjoy about learning that?','The way the pieces finally fit together.'],
  ['en','How has your day been?','I am a little tired, but talking helps.'],
  ['ja','どんな本が好き？','推理小説が好きなんだ。'],
  ['ja','最近はどう過ごしてる？','ちょっと疲れてるけど、お話できて嬉しい。']
 ];
 for(const [lang,answer,message] of cases){
  const input=validateInput({message,lang,page:lang==='ja'?'/ja/resume.html':'/resume.html',token:'test',history:[{role:'assistant',content:answer}]}),request=modelRequest(input,{pages:[]});
  assert(request.messages.some(m=>m.content.includes(answer)),answer);
  assert(request.messages.at(-1).content.includes(message));
  const prompt=request.messages.filter(m=>m.role==='system').map(m=>m.content).join('\n');
  assert.match(prompt,/happy, innocent/);
  assert.match(prompt,/first.person|I\/my/i);
  assert.match(prompt,/detailed explanation|useful detail/);
  assert.match(prompt,/already.*(?:asked|supplied)|answered question/s);
  if(lang==='ja')assert.match(prompt,/普通体/);
 }
});

test('technical, factual, humorous and personal follow-ups keep depth and their actual referent',()=>{
 for(const [lang,answer,message] of [
  ['en','A dictionary associates keys with values.','Can you give me an example of that?'],
  ['en','The joke turns on the two meanings of light: not heavy and illumination.','Explain what you meant.'],
  ['en','I dream of making a flying library that feels welcoming to new readers.','What do you like about that?'],
  ['ja','屈折は、違う物質に入るときに光の進む方向が変わることだよ。','その仕組みを教えて'],
  ['ja','この冗談は、同じ音で違う意味を持つ二つの言葉を使っているよ。','それを詳しく説明して'],
  ['ja','いつか、初めて来た人も安心できる空飛ぶ図書館を作りたいな。','そのどこが好き？']
 ]){
  const input=validateInput({message,lang,page:'/',token:'test',history:[{role:'assistant',content:answer}]}),request=modelRequest(input,{pages:[]});
  const prompt=request.messages.filter(m=>m.role==='system').map(m=>m.content).join('\n');
  assert.match(request.yukiTask,/contextual-followup/);
  assert(prompt.includes(answer));
  assert.match(prompt,/5–8 connected sentences/);
  assert.match(prompt,/not an automatic follow-up question/);
  assert.equal(request.max_tokens,1900);
  assert.match(prompt,/happy, innocent, playful/);
 }
});

test('ordinary meaning questions stay attached to the reply rather than treating the words as a new topic',()=>{
 for(const [lang,messages,answer] of [
  ['en',['Explain what you meant.','What did you mean by that?','Can you clarify what you were getting at?'],'A prism separates light into different colors through refraction.'],
  ['ja',['さっきの返事はどういうこと？','今の説明ってどういう意味？'],'プリズムは屈折によって光をいくつかの色に分けるんだ。']
 ])for(const message of messages){
  const input=validateInput({message,lang,page:'/',token:'test',history:[{role:'assistant',content:answer}]}),request=modelRequest(input,{pages:[]});
  assert.match(request.yukiTask,/contextual-followup/,message);
  assert(request.messages[0].content.includes('EXACT REPLY EXPLANATION'));
  assert(request.messages[0].content.includes(answer));
 }
});

test('page and language changes retain bounded recall and the latest exchange in order',()=>{
 let now=1000;const saved=new Map(),storage={getItem:k=>saved.get(k),setItem:(k,v)=>saved.set(k,v),removeItem:k=>saved.delete(k)};
 const original=new ConversationMemory(storage,'en',()=>now);
 original.remember('I like mysteries.','A mystery gives me little clues to think about!');
 const switched=new ConversationMemory(storage,'ja',()=>now);
 assert.deepEqual(switched.turns,original.turns);
 const visible=[messageRecord('assistant','Which kind of books do you enjoy?','en'),messageRecord('user','Mysteries are my favorite.','en')];
 for(const [page,lang] of [['/yuki/','en'],['/ja/resume.html','ja']]){
  const history=conversationHistory(visible,lang,'Why do you like mysteries?');
  assert.equal(history.at(-1).content,'Mysteries are my favorite.');
  const packed=JSON.parse(packChatRequest({message:'Why do you like mysteries?',lang,page,token:'test',history,memory:switched.recall('mysteries',history)}));
  assert.deepEqual(packed.history,history);
 }
 // A cleared visible transcript is separate from recall; it is not infinite.
 assert.equal(switched.recall('mysteries',[]).length,1);
 now+=86400000;
 assert.equal(switched.recall('mysteries',[]).length,0);
});

test('explicit requests repeat only the question, not the old surrounding anecdote',()=>{
 for(const message of ['What did you just ask?','Could you repeat your question?','Ask me again, please.','さっきの質問をもう一度言って','もう一回聞いて']){
  assert(!needsFreshText('How have you been?',{...visit,message}),message);
  assert(needsFreshText(repeated,{...visit,message}),'question repeat is not an anecdote replay: '+message);
 }
 for(const message of ["Don't repeat your question.",'Please stop asking me that again.','質問を繰り返さないで']){
  assert(needsFreshText('How have you been?',{...visit,message}),message);
 }
});

test('new clarifications and quoted fictional questions are not visitor-question repeats',()=>{
 assert(!needsFreshText('Would you like to sit by the pond or stay by my roost?',visit));
 assert(!repeatedConversationQuestion('Which book did you mean?',{...visit,history:[{role:'assistant',content:'Which kind of books do you enjoy?'}]}));
 for(const quoted of ['The character asks, “Where have you been?”','The character asks, \'Where have you been?\'','登場人物が「最近どう過ごしてる？」と聞く場面だよ。'])assert.deepEqual(assistantQuestions(quoted),[]);
 assert.deepEqual(assistantQuestions("What's your favorite book?"),["What's your favorite book?"]);
 assert(!repeatedConversationQuestion('How have you been?',{message:'Hello',history:[{role:'user',content:'How have you been?'}]}));
});

test('topic revisits stay available but sharing a word in a social answer is not permission',()=>{
 const prior='Syria is in western Asia, on the eastern coast of the Mediterranean Sea. Its capital is Damascus.';
 const history=[{role:'assistant',content:prior}];
 assert(!needsFreshText(prior,{message:'Where is Syria?',history}));
 const priorJa='シリアは西アジアにあり、地中海の東岸に面している国だよ。首都はダマスカスなんだ。';
 assert(!needsFreshText(priorJa,{message:'シリアはどこ？',history:[{role:'assistant',content:priorJa}]}));
 assert(!requestedTopicReuse(repeated,{...visit,message:'I came to share this quiet moment today.'}));
 // Naming a subject never exempts a repeated unsolicited question.
 assert(needsFreshText(prior+' How have you been?',{message:'Where is Syria?',history:[...history,{role:'assistant',content:'How have you been?'}]}));
});

test('actual turns keep chronological context and the last visitor answer through packing',()=>{
 const input=validateInput(JSON.parse(packChatRequest(visit)));
 assert.deepEqual(input.history,history);
 assert.equal(input.message,visit.message);
 const request=modelRequest(input,{pages:[]});
 const messages=request.messages.filter(m=>m.role!=='system');
 assert.equal(messages.at(-1).content.includes(visit.message),true);
 assert(messages.some(m=>m.content.includes(progress)));
 assert(request.messages.some(m=>m.content.includes(continuityInstructions)));
 assert.equal(request.yukiTask,'social-answer');
 assert(request.messages.some(m=>m.content.includes('How have you been?')));
 assert(JSON.stringify(request.messages).length<14000,'social answers should not receive the full portfolio/lore prompt');
 assert(!request.messages[0].content.includes('HOME DETAILS'));
 assert.equal(request.max_tokens,1900);
});

test('short conversational answers route broadly while tasks and questions keep their own paths',()=>{
 for(const message of ['Not really, I just wanted some company.','I had a lovely day, thanks!','That made me smile.','Nothing special; being here is enough.','うん、楽しかった！','今日はちょっと疲れたんだ。','ただ会いに来たんだよ。'])assert(isSocialAnswer({...visit,message}),message);
 for(const message of ['What does that mean?','How is that coming along?','Tell me about your dream.','Show me your garden.','Give me a random fact.','Explain the code.','Compare the two projects.','Can you help me?','それはどういう意味？','庭を見せて','ジョークを教えて','飛ぶ練習は順調？','その後どう','順調','もっと詳しく'])assert(!isSocialAnswer({...visit,message}),message);
 assert(!isSocialAnswer({...visit,history:[]}));
});

test('progress and casual Japanese conversation receive continuity without changing detailed-answer requirements',()=>{
 for(const [lang,message,answer] of [['en',"How's that coming along for you?",first],['ja','それは順調？','飛ぶ練習をしてるんだ。最近はどう過ごしてる？']]){
  const input=validateInput({message,lang,page:lang==='ja'?'/ja/yuki/':'/yuki/',token:'test',history:[{role:'assistant',content:answer}]});
  const request=modelRequest(input,{pages:[]});
  assert.match(request.yukiTask,/contextual-followup/);
  assert(request.messages.some(m=>m.content.includes('progress/status')));
  assert(request.messages.some(m=>m.content.includes(continuityInstructions)));
  assert(request.messages.some(m=>m.content.includes('detailed explanation')));
 }
});

test('social answers reuse the established language-specific follow-up models, never a new provider',async()=>{
 for(const [lang,expected] of [['en',CLOUDFLARE_HUMOR_MODEL],['ja',CLOUDFLARE_TRANSLATION_MODEL]]){
  const message=lang==='ja'?'今日は会いに来ただけだよ！':visit.message;
  const input=validateInput({...visit,lang,message}),request=modelRequest(input,{pages:[]});
  let calls=0;
  await runModel({run:async(name,body)=>{calls++;assert.equal(name,expected);assert(body.response_format.json_schema.schema);assert.equal(body.max_tokens,1900);return {response:cue(warm)};}},request);
  assert.equal(calls,1);
 }
});

const json=value=>new Response(JSON.stringify(value),{headers:{'Content-Type':'application/json'}});
const cue=text=>({text,emotion:'delighted',gesture:'none',destination:'none',sourceIds:[],storyTopics:[]});
function fixture(outputs,quotas=[204,204]){
 const calls=[],reservations=[];
 const handler=createHandler(async url=>url.includes('siteverify')?json({success:true,hostname:'lsanderson1.github.io',action:'yuki-chat'}):json({owner:'Lloyd',bio:{en:'Portfolio owner',ja:'制作者'},pages:[]}));
 const env={SITE_ORIGIN:'https://lsanderson1.github.io',CHAT_ENABLED:'true',FREE_PLAN_CONFIRMED:'true',TURNSTILE_SECRET:'fixture',IP_HASH_SECRET:'f'.repeat(40),
  AI:{run:async(name,body)=>{calls.push(body);return {response:cue(outputs[calls.length-1])};}},
  QUOTA:{idFromName:n=>n,get:()=>({fetch:async(url,options)=>{reservations.push(JSON.parse(options.body));return new Response(null,{status:quotas[reservations.length-1]??500});}})}};
 const request=value=>new Request('https://yuki.example/chat',{method:'POST',headers:{Origin:env.SITE_ORIGIN,'Content-Type':'application/json','CF-Connecting-IP':'192.0.2.1'},body:JSON.stringify(value)});
 return {calls,reservations,handler,env,request};
}

test('the full handler repairs the reported dialogue once without changing sources or animations',async()=>{
 const f=fixture([repeated,warm]),response=await f.handler(f.request(visit),f.env),reply=await response.json();
 assert.equal(response.status,200,JSON.stringify(reply));assert.equal(reply.text,warm);
 assert.equal(f.calls.length,2);assert.equal(f.reservations.length,2);
 assert(f.calls[1].messages.some(m=>m.content.includes('WORDING REVISION')&&m.content.includes('already-asked question')));
 assert.equal(reply.emotion,'delighted');assert.equal(reply.gesture,'none');assert.deepEqual(reply.sources,[]);
});

test('Japanese social replies use the same bounded repair path',async()=>{
 const old='会いに来てくれて嬉しいな。最近はどう過ごしてる？';
 const repeat='用事なんてなくても大歓迎だよ。一緒にゆっくり過ごせたら素敵だね。最近はどう過ごしてる？';
 const fresh='会いに来てくれたんだね。それだけで嬉しいよ！何か特別なことをしなくても、一緒にのんびりする時間っていいな。小さな羽も、今日はゆっくり休められそう。';
 const input={...visit,lang:'ja',message:'今日はただ会いに来ただけだよ',history:[{role:'assistant',content:old}]};
 const f=fixture([repeat,fresh]),response=await f.handler(f.request(input),f.env),reply=await response.json();
 assert.equal(response.status,200,JSON.stringify(reply));assert.equal(reply.text,fresh);assert.equal(f.calls.length,2);
});

test('a denied or still-repetitive repair cannot leak the known duplicate or loop',async()=>{
 for(const quotas of [[204,429],[204,204]]){
  const f=fixture([repeated,repeated],quotas),response=await f.handler(f.request(visit),f.env),reply=await response.json();
  assert.equal(response.status,502);assert.equal(reply.reference,'YUKI_VARIETY');assert.equal(reply.text,undefined);
  assert(f.calls.length<=2);assert.equal(f.reservations.length,2);
 }
});
