import test from 'node:test';
import assert from 'node:assert/strict';
import {portfolioExplanationInstructions} from '../services/yuki-api/portfolio-explanations.mjs';
import {modelRequest} from '../services/yuki-api/worker.mjs';
import {retrieveKnowledge} from '../services/yuki-api/knowledge.mjs';
import {sectionExplanation} from '../assets/yuki/runtime/reading-context.mjs';
import {guideFollowupInstructions} from '../services/yuki-api/guide-followup.mjs';

const pages=['en','ja'].flatMap(lang=>{
 const prefix=lang==='ja'?'/ja':'';
 return [{id:lang+'reap',lang,url:prefix+'/projects/ProjectReap.html',title:'Project Reap',summary:'A team-built platformer.',text:'A team-built platformer.',sections:[
  {id:'s1',title:'Gameplay',anchor:'gameplay',text:'Defeating five enemies fills the Flow meter. Once activated, Flow moves the player between defeated targets until no enemies remain in sight.'},
  {id:'s2',title:'Links',anchor:'links',text:'The demo is on the project website.'}
 ]},{id:lang+'essay',lang,url:prefix+'/essays/codingstandards.html',title:'Coding Standards',text:'An essay about ESLint.',sections:[]}];
});
const catalog={owner:'Lloyd',bio:{en:'Developer',ja:'開発者'},pages};

test('portfolio depth and attribution apply to regular, page and arrival replies, not navigation teasers',()=>{
 for(const lang of ['en','ja']){
  const page=(lang==='ja'?'/ja':'')+'/projects/ProjectReap.html';
  for(const message of ['How does Flow work in Project Reap?','Explain this section in more detail.']){
   const input={message,lang,page,history:[],context:{section:'s1'}};
   const req=modelRequest(input,retrieveKnowledge(catalog,input));
   assert(req.messages[0].content.includes(portfolioExplanationInstructions));
   assert.match(req.messages[0].content,/Preserve team credit/);
   assert.match(req.messages[0].content,/not his motivation/);
   assert.match(req.messages[0].content,/develop the requested new layer/);
   assert.equal(req.max_tokens,1900);
  }
  for(const kind of ['arrive','link']){
   const guideEvent={kind,url:page,targetUrl:page},input={message:'Continue the guide',lang,page,history:[],guideEvent};
   input.guideInstructions=guideFollowupInstructions(guideEvent,catalog,lang);
   const req=modelRequest(input,retrieveKnowledge(catalog,input));
   assert.equal(req.messages[0].content.includes(portfolioExplanationInstructions),kind==='arrive');
   if(kind==='arrive')assert(JSON.stringify(req.messages).includes('five enemies'));
  }
 }
});

test('explain-here is bound to the displayed section, not stale guidance, in both languages',()=>{
 for(const lang of ['en','ja']){
  const p=lang==='ja'?'/ja':'',target=sectionExplanation({id:'s1',title:'Gameplay'},{lang});
  assert.equal(target.section,'s1');
  const input={message:target.text,lang,page:p+'/projects/ProjectReap.html',history:[{role:'assistant',content:'An old essay explanation.'}],context:{section:target.section,lastGuide:{page:p+'/essays/codingstandards.html',section:'s0'}}};
  const k=retrieveKnowledge(catalog,input);
  assert.equal(k.view.localQuestion,true);assert.equal(k.view.current.section,'s1');assert.equal(k.view.lastGuided,null);assert.equal(Boolean(k.view.wholePage),false);
  assert(k.pages.every(p=>p.url.includes('ProjectReap')));
  assert(!JSON.stringify(modelRequest(input,k)).includes('An old essay explanation.'));
 }
 for(const section of [null,{}, {id:'bad',title:'Hidden control'}])assert.equal(sectionExplanation(section),null);
 assert.equal(sectionExplanation({id:'s1',title:'Roost'},{garden:true}),null);
});
