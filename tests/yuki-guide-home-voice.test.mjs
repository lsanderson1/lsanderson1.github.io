import test from 'node:test';
import assert from 'node:assert/strict';
import {guideCopy,guideReplyMatches,guideSpokenTitle,planGuideStep} from '../assets/yuki/runtime/guide-journey.mjs';
import {guideFollowupInstructions,finishGuideReply} from '../services/yuki-api/guide-followup.mjs';
import {createHandler,modelRequest,selectKnowledge,runModel} from '../services/yuki-api/worker.mjs';
import {completionRequest} from '../services/yuki-api/reply-completion.mjs';
import {rewriteRequest} from '../services/yuki-api/reply-variety.mjs';

const pages=['en','ja'].flatMap(lang=>{
 const p=lang==='ja'?'/ja':'';
 return [{id:lang+'home',lang,url:p+'/',title:'Home',text:'Lloyd’s portfolio.'},
  {id:lang+'garden',lang,url:p+'/yuki/',title:lang==='ja'?'ゆきの庭':'Yuki’s Garden',summary:'Yuki’s home has a dragon roost and a pond.',text:'Yuki sleeps on her cushion.',sections:[
   {id:'s1',anchor:'garden-nest',title:lang==='ja'?'ドラゴンのねぐら':'Dragon Roost',text:'Yuki’s roost has a wing-shaped rim and a scale-pattern cushion. Lloyd made the website.'},
   {id:'s2',anchor:'garden-pond',title:lang==='ja'?'スイレンの池':'Lily Pond',text:'There are ripples on the pond.'}]}];
});
const site={owner:'Lloyd',bio:{en:'Developer',ja:'開発者'},pages};
const prefix=lang=>lang==='ja'?'/ja':'';

test('every local home introduction, detour and arrival uses first-person ownership without changing navigation labels',()=>{
 for(const lang of ['en','ja'])for(const anchor of ['', '#garden-nest']){
  const p=prefix(lang),target={url:p+'/yuki/'+anchor};
  const nav=planGuideStep(target,p+'/',pages,{lang}),arrival=planGuideStep(target,p+'/yuki/',pages,{lang});
  for(const step of [nav,arrival,{...nav,kind:'detour'}])for(let variant=0;variant<8;variant++){
   const original=JSON.stringify(step),text=guideCopy(step,{lang,variant,detour:step.kind==='detour'});
   assert.match(text,lang==='ja'?(anchor?/わたしのねぐら/:/わたしの庭/):(anchor?/my roost/:/my garden/));
   assert.doesNotMatch(text,/Yuki[’']s|ゆきの庭|her garden|she sleeps/);
   if(step.kind==='nav')assert.match(text,lang==='ja'?/ヘッダーの「Yuki」/:/Click the Yuki header tab/);
   assert.equal(JSON.stringify(step),original,'speaking must not rename the actual link');
  }
 }
 assert.equal(guideSpokenTitle({url:'/projects/reap.html',title:'Project Reap'}),'Project Reap');
 assert.equal(guideSpokenTitle({url:'/ja/yuki/#garden-pond',title:'スイレンの池'},{lang:'ja'}),'スイレンの池');
});

test('home guard rejects third-person page titles, quotations and later self-reference, but allows actual click labels and other characters',()=>{
 for(const lang of ['en','ja']){
  const p=prefix(lang),event={kind:'arrive',url:p+'/yuki/'};
  const good=lang==='ja'?'ここがわたしの庭！わたしのねぐらにはふかふかのクッションがあるよ。':'Welcome to my garden! My roost has a soft cushion.';
  assert(guideReplyMatches(good,event,pages,lang));
  for(const bad of lang==='ja'?['ここは「ゆきの庭」だよ。','ここがわたしの庭！ゆきはここで眠るよ。','わたしの庭へようこそ！彼女のねぐらはふかふか。']:["Welcome to Yuki’s Garden!","Welcome to ‘Yuki’s Garden’!",'Welcome to "Yuki’s Garden"!',"Welcome to my garden! She sleeps here.","This is my garden, with her cozy dragon roost."]){
   assert(!guideReplyMatches(bad,event,pages,lang),bad);
  }
  assert(guideReplyMatches(lang==='ja'?good+'ロイドがこのサイトを作ったんだ。':good+' Lloyd built the website. The other dragons flap their wings.',event,pages,lang));
  const intro={kind:'nav',url:p+'/yuki/',targetUrl:p+'/yuki/',stepIndex:1,stepCount:2};
  assert(guideReplyMatches(finishGuideReply({text:good},intro,site,lang).text,intro,pages,lang));
  const link={kind:'link',url:p+'/yuki/',targetUrl:p+'/yuki/',stepIndex:1,stepCount:2};
  assert(guideReplyMatches(finishGuideReply({text:good},link,site,lang).text,link,pages,lang),'only the exact app-owned click label may say Yuki’s Garden');
  const roost={kind:'arrive',url:p+'/yuki/#garden-nest'};
  assert(guideReplyMatches(lang==='ja'?'ここがわたしのねぐらだよ！':'Here is my roost!',roost,pages,lang));
  const middle={...intro,stepIndex:2,stepCount:3};
  assert(guideReplyMatches(finishGuideReply({text:'discarded'},middle,site,lang).text,middle,pages,lang));
 }
});

test('AI route prompts and both repair paths preserve personal ownership, detail, voice and author attribution',()=>{
 for(const lang of ['en','ja'])for(const kind of ['nav','arrive'])for(const anchor of ['', '#garden-nest']){
  const p=prefix(lang),target=p+'/yuki/'+anchor,event={kind,url:kind==='nav'?p+'/yuki/':target,targetUrl:target};
  const input={message:'Guide me home',lang,page:kind==='nav'?p+'/':p+'/yuki/',guideEvent:event,history:[]};
  input.guideInstructions=guideFollowupInstructions(event,site,lang,input.page);
  assert.match(input.guideInstructions,/spokenName/);assert.doesNotMatch(input.guideInstructions,/First-person experiences in this description belong to Lloyd/);
  const knowledge=selectKnowledge(site,input),request=modelRequest(input,knowledge),reply={text:'Yuki lives here.',sources:[],storyTopics:[]};
  for(const r of [request,rewriteRequest(request,reply,input)]){
   const prompt=JSON.stringify(r.messages);
   assert.match(prompt,/HOME SPEAKER PERSPECTIVE/);assert.match(prompt,/Throughout the whole reply/);assert.match(prompt,/Lloyd still created the website/);
   assert.match(prompt,/cheerful innocent personality/);
   if(kind==='arrive')assert.match(prompt,/6–8 connected sentences/);
  }
  const repair=completionRequest(request,reply,knowledge,{},lang,['guide-target','self-narration']);
  assert.equal(repair.yukiTask,lang==='ja'?'guide-voice-ja':request.yukiTask);assert.equal(repair.max_tokens,request.max_tokens);
  const repairPrompt=JSON.stringify(repair.messages);
  assert.match(repairPrompt,lang==='ja'?/全文を見直し、最後まで同じ話し手/:/FIRST-PERSON GUIDE/);
  assert.match(repairPrompt,lang==='ja'?/6〜8文程度の説明を保ち/:/At arrival preserve the grounded explanation/);
  assert.match(repairPrompt,lang==='ja'?/サイトを作ったのはロイド/:/other people's ownership stay unchanged/);
 }
});

test('actual handler repairs third-person home guidance once; a second bad answer is withheld',async()=>{
 for(const lang of ['en','ja'])for(const kind of ['nav','arrive'])for(const repairSucceeds of [true,false]){
  const p=prefix(lang),origin='https://lsanderson1.github.io';let calls=0;
  const event={kind,url:p+'/yuki/',targetUrl:p+'/yuki/',stepIndex:kind==='nav'?1:2,stepCount:2};
  const bad=lang==='ja'?'「ゆきの庭」に着いたよ。ゆきはここで眠るんだ。':'This is “Yuki’s Garden”. She sleeps on her cozy cushion.';
  const good=lang==='ja'?(kind==='nav'?'わたしの庭へ案内するね！':'ここがわたしの庭！わたしのねぐらには、うろこ模様のクッションがあるよ。一緒にのんびりできてうれしい！'):(kind==='nav'?'Come explore my garden with me!':'Welcome to my garden! My roost has a scale-pattern cushion. I’m happy we can take a little rest together!');
  const handler=createHandler(async url=>new Response(JSON.stringify(url.includes('siteverify')?{success:true,hostname:'lsanderson1.github.io',action:'yuki-chat'}:site)));
  const env={SITE_ORIGIN:origin,CHAT_ENABLED:'true',FREE_PLAN_CONFIRMED:'true',TURNSTILE_SECRET:'test',IP_HASH_SECRET:'test'.repeat(12),QUOTA:{idFromName:x=>x,get:()=>({fetch:async()=>new Response(null,{status:204})})},AI:{run:async(name,body)=>{
   calls++;const text=calls===1||!repairSucceeds?bad:good;
   const schema=body.response_format.json_schema.schema??body.response_format.json_schema;
   return {response:schema.required.length===1?{text}:{text,emotion:'delighted',gesture:'talkExplain',destination:'none',sourceIds:[],storyTopics:[]}};
  }}};
  const request=new Request('https://api.invalid/chat',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','CF-Connecting-IP':'192.0.2.1'},body:JSON.stringify({message:'Guide me home',lang,page:kind==='nav'?p+'/':p+'/yuki/',guideEvent:event,history:[],token:'test'})});
  const response=await handler(request,env),reply=await response.json();
  assert.equal(calls,2);
  if(repairSucceeds){assert.equal(response.status,200,JSON.stringify(reply));assert.equal(reply.text,finishGuideReply({text:good},event,site,lang).text);}
  else {assert.equal(response.status,502);assert.equal(reply.text,undefined);}
 }
});

test('Japanese home voice repair reuses the established translation model without another inference',async()=>{
 const calls=[],ai={run:async(model,body)=>{calls.push({model,body});return {response:{text:'わたしの庭へようこそ！'}};}};
 const schema={type:'object',properties:{text:{type:'string'}},required:['text']};
 await runModel(ai,{yukiTask:'guide-voice-ja',messages:[{role:'user',content:'draft\n/no_think'}],max_tokens:1100,response_format:{type:'json_schema',json_schema:schema}});
 assert.equal(calls.length,1);assert.match(calls[0].model,/gemma/);
 assert.equal(calls[0].body.yukiTask,undefined);assert.deepEqual(calls[0].body.response_format.json_schema.schema,schema);
 assert.equal(calls[0].body.max_tokens,1100);
});
