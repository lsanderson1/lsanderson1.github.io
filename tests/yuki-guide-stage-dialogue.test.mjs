import test from 'node:test';
import assert from 'node:assert/strict';
import {GuideJourney,guideStepsRemaining,planGuideStep,guideStage,guideCopy,guideArrivalText,guideReplyMatches} from '../assets/yuki/runtime/guide-journey.mjs';
import {cleanGuideEvent,guideNextAction,guideFollowupInstructions,finishGuideReply} from '../services/yuki-api/guide-followup.mjs';
import {createHandler,modelRequest,selectKnowledge} from '../services/yuki-api/worker.mjs';
import {completionRequest} from '../services/yuki-api/reply-completion.mjs';
const pages=['en','ja'].flatMap(lang=>{
 const p=lang==='ja'?'/ja':'';
 return [['/','Home'],['/projects/','Projects'],['/projects/reap.html','Project Reap'],['/essays/','Essays'],['/resume.html','Resume']].map(([path,title])=>({id:lang+path,lang,url:p+path,title,summary:'Secret early teaser must not appear.',text:'Secret early teaser must not appear.',sections:[{id:'s1',title:'Gameplay',anchor:'gameplay',text:'Defeating five enemies fills the Flow meter.'}]}));
});
const site={owner:'Lloyd',bio:{en:'Developer',ja:'開発者'},pages};
const store=()=>{const map=new Map();return {getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};};

test('three real stops survive reloads, omit Finally and never add artificial navigation',()=>{
 for(const lang of ['en','ja']){
  const p=lang==='ja'?'/ja':'',options={lang},storage=store();let j=new GuideJourney(storage,()=>1000);
  const target={url:p+'/projects/reap.html'};j.start(target.url,p+'/');
  assert.equal(guideStepsRemaining(target,p+'/',pages,options),3);
  for(const [i,path] of [p+'/',p+'/projects/',target.url].entries()){
   const step=planGuideStep(target,path,pages,options),progress=j.progress(step,pages,options);
   assert.deepEqual(progress,{stepIndex:i+1,stepCount:3});Object.assign(step,progress);
   assert.equal(guideStage(step),['intro','directions','arrival'][i]);
   assert.doesNotMatch(guideCopy(step,{lang}),/Finally|最後に/);
   assert(j.claimStep(step));j=new GuideJourney(storage,()=>1100);
   assert(!j.claimStep(step));assert.deepEqual(j.progress(step,pages,options),progress);
  }
 }
});

test('starting on the list is a two-stop journey with an introduction; same-page targets explain immediately',()=>{
 const target={url:'/projects/reap.html#gameplay'},j=new GuideJourney(store(),()=>1000);j.start(target.url,'/projects/');
 const step=planGuideStep(target,'/projects/',pages);Object.assign(step,j.progress(step,pages));
 assert.deepEqual([step.stepIndex,step.stepCount,guideStage(step)],[1,2,'intro']);
 assert.match(guideCopy(step),/explore Gameplay together/);
 assert.equal(guideStepsRemaining(target,'/projects/reap.html',pages),1);
 assert.equal(guideStepsRemaining({url:'/missing'},'/',pages),0);
 assert.equal(guideStepsRemaining({url:'/resume.html'},'/',pages),2);
});

test('language changes do not count the same navigation stop twice',()=>{
 const j=new GuideJourney(store(),()=>1000);j.start('/projects/reap.html','/');
 assert(j.claimStep({kind:'nav',url:'/projects/'}));
 assert(!j.claimStep({kind:'nav',url:'/ja/projects/'}));
 assert.deepEqual(j.progress(planGuideStep({url:'/ja/projects/reap.html'},'/ja/',pages,{lang:'ja'}),pages,{lang:'ja'}),{stepIndex:1,stepCount:3});
});

test('a real detour can make four steps; only the actual final step then uses Finally',()=>{
 const j=new GuideJourney(store(),()=>1000),target={url:'/projects/reap.html'};j.start(target.url,'/');
 j.claimStep(planGuideStep(target,'/',pages));j.expect('/projects/','/');
 assert.equal(j.enter('/essays/'),'detour');
 const next=planGuideStep(target,'/essays/',pages);Object.assign(next,j.progress(next,pages));
 assert.deepEqual([next.stepIndex,next.stepCount],[2,4]);assert.match(guideCopy(next),/^Next, click the Projects header tab\.$/);j.claimStep(next);
 const then=planGuideStep(target,'/projects/',pages);Object.assign(then,j.progress(then,pages));
 assert.match(guideCopy(then),/^Then, click/);assert.doesNotMatch(guideCopy(then),/Finally/);j.claimStep(then);
 const last=planGuideStep(target,target.url,pages);Object.assign(last,j.progress(last,pages));
 assert.deepEqual([last.stepIndex,last.stepCount],[4,4]);assert.match(guideCopy(last),/^Finally, we’ve reached/);
 assert.match(guideCopy(last,{lang:'ja'}),/^最後に、/);
});

test('intermediate directions are grammatical exact actions without any subject explanation',()=>{
 for(const lang of ['en','ja']){
  const p=lang==='ja'?'/ja':'',event={kind:'link',url:p+'/projects/reap.html',targetUrl:p+'/projects/reap.html#gameplay',stepIndex:2,stepCount:3};
  const action=guideNextAction(event,site,lang);
  assert.equal(action,lang==='ja'?'次は、指している「Project Reap」のリンクをクリックしてね。':'Next, click the link for Project Reap, where I’m pointing.');
  assert(guideReplyMatches(action,event,pages,lang),'target section need not be repeated in the page-link direction');
  assert(!guideReplyMatches(action+' This platformer is set in Japan.',event,pages,lang));
  assert.equal(finishGuideReply({text:'Unwanted project explanation.'},event,site,lang).text,action);
  const input={lang,page:p+'/projects/',guideEvent:event,history:[]};input.guideInstructions=guideFollowupInstructions(event,site,lang,input.page);
  const req=modelRequest(input,selectKnowledge(site,input));
  assert(!JSON.stringify(req).includes('Secret early teaser'));assert(!JSON.stringify(req).includes('five enemies'));
 }
});

test('progress is bounded and consistent; legacy clients never get an assumed Finally',()=>{
 const event={kind:'arrive',url:'/resume.html'};
 for(const values of [{stepIndex:0,stepCount:3},{stepIndex:1,stepCount:3},{stepIndex:4,stepCount:3},{stepIndex:1},{stepIndex:'3',stepCount:3},{stepIndex:101,stepCount:101}])assert.throws(()=>cleanGuideEvent({...event,...values}));
 assert.throws(()=>cleanGuideEvent({kind:'nav',url:'/resume.html',stepIndex:2,stepCount:2}));
 for(const stepCount of [1,2,3]){
  const step=cleanGuideEvent({...event,stepIndex:stepCount,stepCount});
  assert.equal(guideArrivalText('Finally, we’re here at Resume!',step),'We’re here at Resume!');
  assert.equal(guideArrivalText('最後に、ここが履歴書だよ！',step,'ja'),'ここが履歴書だよ！');
 }
 assert.equal(guideArrivalText('We’re here at Resume!',event),'We’re here at Resume!');
 assert.equal(guideArrivalText('iPhone is the title here.',event),'iPhone is the title here.');
 assert.equal(guideArrivalText('Finally, we’re here!',{...event,stepIndex:4,stepCount:4}),'Finally, we’re here!');
});

test('intro quality repairs preserve the route-only prompt rather than expanding into a project review',()=>{
 const event={kind:'nav',url:'/projects/',targetUrl:'/projects/reap.html',stepIndex:1,stepCount:3};
 const input={lang:'en',page:'/',guideEvent:event,history:[]};input.guideInstructions=guideFollowupInstructions(event,site,'en','/');
 const knowledge=selectKnowledge(site,input),req=modelRequest(input,knowledge),reply={text:'Lets go to Project Reap',sources:[],storyTopics:[]};
 const repair=completionRequest(req,reply,knowledge,{},'en',['unfinished']);
 assert.equal(repair.yukiTask,'guide-intro');assert.match(JSON.stringify(repair.messages),/NO subject facts, summary, teaser/);
 assert(!JSON.stringify(repair.messages).includes('Secret early teaser'));assert.deepEqual(repair.response_format.json_schema.required,['text']);
});

test('real handler validates middle stops and returns exact directions without calling AI or web search',async()=>{
 for(const lang of ['en','ja']){
  const p=lang==='ja'?'/ja':'',origin='https://lsanderson1.github.io';let model=0;
  const handler=createHandler(async url=>new Response(JSON.stringify(url.includes('siteverify')?{success:true,hostname:'lsanderson1.github.io',action:'yuki-chat'}:site)));
  const env={SITE_ORIGIN:origin,CHAT_ENABLED:'true',FREE_PLAN_CONFIRMED:'true',TURNSTILE_SECRET:'test',IP_HASH_SECRET:'test-only-'.repeat(6),QUOTA:{idFromName:x=>x,get:()=>({fetch:async()=>new Response(null,{status:204})})},AI:{run:async()=>{model++;throw Error('Middle stops must not call AI');}}};
  const event={kind:'link',url:p+'/projects/reap.html',targetUrl:p+'/projects/reap.html#gameplay',stepIndex:2,stepCount:3};
  const req=new Request('https://api.invalid/chat',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','CF-Connecting-IP':'192.0.2.1'},body:JSON.stringify({message:'Continue guiding',history:[],lang,page:p+'/projects/',token:'test-token',guideEvent:event})});
  const response=await handler(req,env),reply=await response.json();assert.equal(response.status,200);assert.equal(model,0);assert.equal(reply.text,guideNextAction(event,site,lang));assert.equal(reply.destination,'none');
 }
});
