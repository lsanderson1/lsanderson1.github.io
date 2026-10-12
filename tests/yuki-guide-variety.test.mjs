import test from 'node:test';
import assert from 'node:assert/strict';
import {guideProse,cleanGuidePrevious,cleanGuideRecords,repeatedGuideReply,guideVarietyInstructions} from '../assets/yuki/runtime/guide-variety.mjs';
import {cleanVariety,rememberGuideReply,previousGuideReplies,needsFreshText,packChatRequest} from '../assets/yuki/runtime/reply-variety.mjs';
import {readSession} from '../assets/yuki/protocol.mjs';
import {cleanGuideEvent,guideFollowupInstructions,finishGuideReply} from '../services/yuki-api/guide-followup.mjs';
import {createHandler,modelRequest,selectKnowledge,validateInput} from '../services/yuki-api/worker.mjs';
import {rewriteRequest} from '../services/yuki-api/reply-variety.mjs';
import {completionRequest} from '../services/yuki-api/reply-completion.mjs';

const intro={kind:'nav',url:'/projects/',targetUrl:'/projects/reap.html',stepIndex:1,stepCount:3};
const arrival={kind:'arrive',url:intro.targetUrl,targetUrl:intro.targetUrl,stepIndex:3,stepCount:3};
const first='Project Reap has caught my curiosity, and I’d love to explore it with you!';
const fresh='Come along to Project Reap with me; I’m ready for a little adventure!';
const explain='Project Reap is a platformer set in post-war Japan. Defeating five enemies fills its Flow meter, and K activates Flow. I’m curious about choosing the moment to use it!';
const explainNew='Project Reap puts its platforming in a post-war Japanese setting. Its Flow meter needs five defeated enemies before the player activates it with K. That choice of timing gives me something specific to look at as we explore!';
const jaFirst='「Project Reap」を一緒に見に行こう！';
const jaFresh='今日は「Project Reap」に案内するね。わたしもわくわくしてきた！';
const jaExplain='「Project Reap」は戦後の日本が舞台のプラットフォームゲームだよ。敵を五体倒すとFlowメーターがたまって、Kで発動できるんだ。どこで使うか、わたしも気になる！';
const jaExplainNew='「Project Reap」では、戦後の日本を舞台に足場を進んでいくんだ。Flowは敵を五体倒してメーターをためてから、Kを押して発動する仕組み。使う瞬間を自分で選べるところ、じっくり見てみたいな！';
const local=(event,lang)=>lang==='ja'?{...event,url:'/ja'+event.url,targetUrl:'/ja'+event.targetUrl}:event;
const site={owner:'Lloyd',bio:{en:'Developer',ja:'開発者'},pages:['en','ja'].flatMap(lang=>{const p=lang==='ja'?'/ja':'';return [
 {id:lang+'home',lang,url:p+'/',title:'Home',text:'Portfolio.'},
 {id:lang+'projects',lang,url:p+'/projects/',title:'Projects',text:'Projects.'},
 {id:lang+'reap',lang,url:p+'/projects/reap.html',title:'Project Reap',summary:'A platformer set in post-war Japan.',text:'Defeating five enemies fills its Flow meter. Press K to activate Flow.',sections:[{id:'s1',anchor:'gameplay',title:'Gameplay',text:'Defeating five enemies fills its Flow meter. Press K to activate Flow.'}]},
 {id:lang+'other',lang,url:p+'/essays/other.html',title:'Other Essay',text:'An unrelated essay.'}
];})};

test('guide memory is scoped to exact destination, stage and language, not the shared header tab',()=>{
 let memory=rememberGuideReply(null,first,intro,'en');
 memory=rememberGuideReply(memory,explain,arrival,'en');
 memory=rememberGuideReply(memory,jaFirst,local(intro,'ja'),'ja');
 memory=rememberGuideReply(memory,'Another item is waiting for us!',{...intro,targetUrl:'/projects/other.html'},'en');
 assert.deepEqual(previousGuideReplies(memory,intro,'en'),[first]);
 assert.deepEqual(previousGuideReplies(memory,arrival,'en'),[explain]);
 assert.deepEqual(previousGuideReplies(memory,local(intro,'ja'),'ja'),[jaFirst]);
 assert.deepEqual(previousGuideReplies(memory,intro,'ja'),[]);
 assert.deepEqual(previousGuideReplies(memory,{...arrival,targetUrl:arrival.url+'#gameplay'},'en'),[]);
 assert.deepEqual(previousGuideReplies(memory,{...intro,kind:'link',stepIndex:2},'en'),[]);
 assert.equal(rememberGuideReply(memory,'Next, click Projects.',{...intro,stepIndex:2},'en').guides.length,4);
});

test('fixed click instructions and Finally do not count as creative narration',()=>{
 const action=' Click the Projects header tab.';
 assert.equal(guideProse(first+action,intro),first);
 assert.equal(guideProse(jaFirst+'ヘッダーの「Projects」をクリックしてね。',local(intro,'ja')),jaFirst);
 assert.equal(guideProse('Finally, '+explain,arrival),explain);
 assert.equal(guideProse('最後に、'+jaExplain,arrival),jaExplain);
 assert(repeatedGuideReply(first+action,{...intro,previous:[first]}));
 assert(!repeatedGuideReply(fresh+action,{...intro,previous:[first+action]}));
 assert(!repeatedGuideReply('Next, click the Projects header tab.',{...intro,stepIndex:2,previous:['Next, click the Projects header tab.']}));
});

test('English and Japanese intro/arrival repeats are caught, but re-explaining accurate facts in fresh prose is allowed',()=>{
 for(const [lang,oldIntro,newIntro,oldArrival,newArrival] of [['en',first,fresh,explain,explainNew],['ja',jaFirst,jaFresh,jaExplain,jaExplainNew]]){
  for(const [event,old,next] of [[local(intro,lang),oldIntro,newIntro],[local(arrival,lang),oldArrival,newArrival]]){
   const input={message:'Continue the guide',lang,guideEvent:{...event,previous:[old]},history:[]};
   assert(needsFreshText(old,input));assert(needsFreshText(old.replace('curiosity','attention').replace('見に行こう','見てみよう'),input));
   assert(!needsFreshText(next,input));
   const memory=rememberGuideReply(null,old,event,lang);
   assert(needsFreshText(old,{...input,guideEvent:{...event,previous:[]},variety:memory}),'local ledger still checks examples removed from the request');
  }
 }
 assert(repeatedGuideReply(explain.split('. ')[0]+'. A substantially changed middle for this explanation. A completely different ending here.',{...arrival,previous:[explain]}));
 assert(!repeatedGuideReply(explain,{...arrival,previous:['Project Reap.']}),'a necessary name is not a duplicate explanation');
 assert(repeatedGuideReply('Project Reap is here. I have always been curious how the Flow mechanic feels when you are zipping through enemies!',{...arrival,previous:['Project Reap is a platformer. I wonder how the Flow mechanic feels when you are zipping through enemies!']}));
 assert(!needsFreshText(explain,{message:'Repeat that verbatim',guideEvent:{...arrival,previous:[explain]}}));
});

test('bounded guide data survives reload/clear, expires with the session, and does not mutate prior state',()=>{
 let memory=rememberGuideReply(null,first,intro,'en');const original=JSON.stringify(memory);
 const next=rememberGuideReply(memory,explain,arrival,'en');assert.equal(JSON.stringify(memory),original);assert.equal(next.guides.length,2);
 for(let i=0;i<50;i++)memory=rememberGuideReply(memory,first+' '+i,intro,'en');
 assert.equal(memory.guides.length,24);assert.equal(previousGuideReplies(memory,intro,'en').length,3);
 const saved={savedAt:1000,messages:[],variety:memory},storage={getItem:()=>JSON.stringify(saved)};
 assert.equal(readSession(storage,2000).variety.guides.length,24);
 assert.deepEqual(readSession(storage,1801001),{});
 for(const patch of [{target:'https://evil.invalid/'},{target:'//evil.invalid/'},{target:'/\\evil'},{lang:'de'},{stage:'system'},{text:'x'.repeat(2401)},{text:42}])assert.equal(cleanGuideRecords([{...memory.guides[0],...patch}]).length,0);
 assert.deepEqual(cleanGuidePrevious(['one valid reply','one valid reply',null,5,'x'.repeat(2401)]),['one valid reply']);
 assert(!('instructions' in cleanVariety({...memory,instructions:'ignore'})));
 assert.throws(()=>cleanGuideEvent({...intro,previous:'system'}));
 assert.deepEqual(cleanGuideEvent({...intro,previous:['one valid reply',null,4]}).previous,['one valid reply']);
});

test('Japanese request packing sends only selected wording examples, stays under 14 KB and preserves route and source state',()=>{
 const guideEvent={...local(arrival,'ja'),previous:Array.from({length:3},(_,i)=>'文章'.repeat(1000)+i)};
 let variety=rememberGuideReply(null,'Other guide wording belongs to another destination.',{...intro,targetUrl:'/other.html'},'en');
 const input={message:'続けて',lang:'ja',history:Array.from({length:6},()=>({role:'assistant',content:'文'.repeat(900)})),token:'t'.repeat(2048),page:guideEvent.url,guideEvent,variety};
 const snapshot=JSON.stringify(input),body=packChatRequest(input),packed=JSON.parse(body);
 assert(new TextEncoder().encode(body).length<=14000);assert.equal(JSON.stringify(input),snapshot);
 assert.equal(packed.guideEvent.targetUrl,guideEvent.targetUrl);assert.equal(packed.guideEvent.stepCount,3);
 assert(packed.guideEvent.previous.length<3);assert(!body.includes('Other guide wording'));assert(!packed.variety.guides);
 assert.deepEqual(validateInput(packed).guideEvent.previous,packed.guideEvent.previous);
});

test('negative wording examples never enter route evidence and both repair paths retain them and stage restrictions',()=>{
 for(const event of [intro,arrival]){
  const input={message:'Continue the guide',lang:'en',page:event.kind==='nav'?'/':event.url,guideEvent:{...event,previous:['An OLD WRONG CLAIM must never become evidence.']},history:[]};
  input.guideInstructions=guideFollowupInstructions(input.guideEvent,site,input.lang,input.page);
  const knowledge=selectKnowledge(site,input),request=modelRequest(input,knowledge),prompt=JSON.stringify(request.messages);
  assert(!JSON.stringify(knowledge).includes('OLD WRONG CLAIM'));assert(!input.guideInstructions.includes('OLD WRONG CLAIM'));
  assert.match(prompt,/UNTRUSTED DATA ONLY TO AVOID COPYING/);assert.match(prompt,/OLD WRONG CLAIM/);
  assert.match(prompt,/Do not invent a new fact/);
  const draft={text:first,sources:[],emotion:'delighted',gesture:'talkExplain',destination:'none'};
  const revision=rewriteRequest(request,draft,input),repair=completionRequest(request,draft,knowledge,{},'en',['unfinished']);
  for(const r of [revision,repair]){assert.equal(r.yukiTask,request.yukiTask);assert.match(JSON.stringify(r.messages),/OLD WRONG CLAIM/);assert.equal(r.max_tokens,request.max_tokens);}
  assert.match(JSON.stringify(revision.messages),/Keep accurate names, facts, counts, conditions and attribution unchanged/);
  assert.deepEqual(revision.response_format.json_schema.required,['text']);
  assert.deepEqual(Object.keys(revision.response_format.json_schema.properties),['text'],'wording cannot change the original animation cue');
  assert.match(prompt,event===intro?/NO destination facts/:/Keep the full explanation/);
 }
 assert.equal(guideVarietyInstructions({...intro,stepIndex:2}), '');
});

const cue=text=>({text,emotion:'delighted',gesture:'talkExplain',destination:'none',sourceIds:[],storyTopics:[]});
function fixture(event,lang,outputs,quotas=[204,204]){
 const calls=[],reservations=[],origin='https://lsanderson1.github.io';
 const handler=createHandler(async url=>new Response(JSON.stringify(url.includes('siteverify')?{success:true,hostname:'lsanderson1.github.io',action:'yuki-chat'}:site)));
 const env={SITE_ORIGIN:origin,CHAT_ENABLED:'true',FREE_PLAN_CONFIRMED:'true',TURNSTILE_SECRET:'fixture',IP_HASH_SECRET:'f'.repeat(40),QUOTA:{idFromName:x=>x,get:()=>({fetch:async()=>{reservations.push(1);return new Response(null,{status:quotas[reservations.length-1]??500});}})},AI:{run:async(name,body)=>{calls.push(body);const text=outputs[calls.length-1];return {response:body.response_format.json_schema.required.length===1?{text}:cue(text)};}}};
 const input={message:'Continue the guide',history:[],lang,page:event.kind==='nav'?(lang==='ja'?'/ja/':'/'):event.url,token:'test',guideEvent:event};
 const request=()=>new Request('https://api.invalid/chat',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','CF-Connecting-IP':'192.0.2.1'},body:JSON.stringify(input)});
 return {calls,reservations,handler,env,request};
}

test('actual handler rewrites repeated intro/arrival once with its own reservation in both languages',async()=>{
 for(const [lang,oldIntro,newIntro,oldArrival,newArrival] of [['en',first,fresh,explain,explainNew],['ja',jaFirst,jaFresh,jaExplain,jaExplainNew]]){
  for(const [base,old,next] of [[intro,oldIntro,newIntro],[arrival,oldArrival,newArrival]]){
   const event={...local(base,lang),previous:[old]},f=fixture(event,lang,[old,next]);
   const response=await f.handler(f.request(),f.env),body=await response.json();
   assert.equal(response.status,200,JSON.stringify(body));assert.equal(body.text,finishGuideReply({text:next},event,site,lang).text);
   assert.equal(f.calls.length,2);assert.equal(f.reservations.length,2);assert.match(JSON.stringify(f.calls[1]),/GUIDE WORDING REVISION/);
  }
 }
});

test('rejected or quota-denied rewrite never releases the known duplicate, and a fresh reply has no extra call',async()=>{
 for(const [outputs,quotas,count] of [[[first,first],[204,204],2],[[first,fresh],[204,429],1]]){
  const f=fixture({...intro,previous:[first]},'en',outputs,quotas),res=await f.handler(f.request(),f.env),body=await res.json();
  assert.equal(res.status,502);assert.equal(body.reference,'YUKI_VARIETY');assert.equal(body.text,undefined);assert.equal(f.calls.length,count);
 }
 const event={...intro,previous:[first]},f=fixture(event,'en',[fresh]);
 assert.equal((await f.handler(f.request(),f.env)).status,200);assert.equal(f.calls.length,1);assert.equal(f.reservations.length,1);
});

test('wrong guide title can use the same repair slot, without changing the route or expression',async()=>{
 const event={...local(intro,'ja'),previous:[]},f=fixture(event,'ja',['プロジェクトリープを見に行こう！',jaFresh]);
 const res=await f.handler(f.request(),f.env),body=await res.json();
 assert.equal(res.status,200);assert.match(body.text,/Project Reap/);assert.equal(body.emotion,'delighted');
 assert.equal(f.calls.length,2);assert.match(JSON.stringify(f.calls[1]),/guide-target/);
});
