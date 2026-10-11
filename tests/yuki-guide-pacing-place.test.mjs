import test from 'node:test';
import assert from 'node:assert/strict';
import {isHomeVisitRequest,resolveGuideRequest,planGuideStep} from '../assets/yuki/runtime/guide-journey.mjs';
import {isDiscoveryRequest} from '../assets/yuki/runtime/discovery-guide.mjs';
import {guidePacing,guideFollowupInstructions} from '../services/yuki-api/guide-followup.mjs';
import {asksPageOverview,asksCurrentPage,pageEvidenceInstruction} from '../services/yuki-api/page-awareness.mjs';
import {retrieveKnowledge} from '../services/yuki-api/knowledge.mjs';
import {modelRequest} from '../services/yuki-api/worker.mjs';

const spots=['nest','pond','lookout','books','treasures'];
const pages=['en','ja'].flatMap(lang=>{
 const prefix=lang==='ja'?'/ja':'';
 return [['/','Home'],['/projects/','Projects'],['/projects/example.html','Example Project'],['/yuki/','Yuki’s Garden']].map(([path,title])=>({
  id:lang+path,url:prefix+path,lang,title,summary:'Published overview for '+title,text:'Published overview for '+title,
  sections:path==='/yuki/'?spots.map((spot,i)=>({id:'s'+(i+1),anchor:'garden-'+spot,kind:'garden',title:spot,text:'Verified landmark '+spot})):[{id:'s1',anchor:'details',title:'Details',text:'The example has a checkpoint system.'}]
 }));
});
const catalog={owner:'Lloyd',bio:{en:'Developer',ja:'開発者'},pages};

test('natural home invitations start the correct localized garden journey from other pages',()=>{
 const messages=["I'd love to see where you live",'Could you show us your home?','Can we take a look at your place?',"Let's drop by your garden",'I want to see your little home','Show me something interesting in your garden','Take us back home','おうちを見せて','君の庭に行こう','ゆきが住んでるところに連れてって','あなたの家に遊びに行きたい'];
 for(const lang of ['en','ja'])for(const message of messages){
  const prefix=lang==='ja'?'/ja':'';
  assert(isHomeVisitRequest(message),message);assert(!isDiscoveryRequest(message),message);
  const found=resolveGuideRequest(message,pages,prefix+'/projects/example.html',{lang});
  assert.equal(found.target.url,prefix+'/yuki/',message);
  assert.equal(planGuideStep(found.target,prefix+'/projects/example.html',pages,{lang}).url,prefix+'/yuki/');
 }
 for(const q of ['Tell me about your garden','I like your home','Do not show me your home','おうちには行きたくない','Take me to the landing page'])assert(!isHomeVisitRequest(q),q);
 assert.equal(resolveGuideRequest('Take me to the home page',pages,'/yuki/').target.url,'/');
 assert(isDiscoveryRequest('Show me a random project'));
});

test('journeys reserve a teaser for the penultimate stop and a full explanation for arrival',()=>{
 for(const lang of ['en','ja']){
  const p=lang==='ja'?'/ja':'',target=p+'/projects/example.html';
  for(const [kind,url,from,pacing,marker] of [
   ['nav',p+'/projects/',p+'/','directions','EARLY NAVIGATION'],
   ['link',target,p+'/projects/','preview','PENULTIMATE STOP'],
   ['arrive',target,target,'arrival','Automatically give the full explanation NOW']
  ]){
   const guideEvent={kind,url,targetUrl:target,discovery:true},input={lang,page:from,guideEvent,history:[]};
   assert.equal(guidePacing(guideEvent),pacing);
   input.guideInstructions=guideFollowupInstructions(guideEvent,catalog,lang,from);
   assert(input.guideInstructions.includes(marker));
   const request=modelRequest(input,retrieveKnowledge(catalog,input));
   assert.equal(request.response_format.json_schema.properties.text.maxLength,pacing==='arrival'?2300:pacing==='preview'?420:240);
   if(pacing==='directions')assert(!JSON.stringify(request.messages).includes('Published overview for Example Project'));
   if(pacing==='arrival')assert(JSON.stringify(request.messages).includes('checkpoint system'));
  }
  const direct={kind:'nav',url:p+'/yuki/',targetUrl:p+'/yuki/'};
  assert.equal(guidePacing(direct),'preview');
 }
});

test('natural whole-place questions explain the whole garden regardless of the current perch',()=>{
 const requests=['What is this place?',"What's around here?","What's here?",'What can we explore around here?','Where are we?','Tell me about this area','Could you explain this place to me?',"What's all this about?",'What kind of place is this?','Tell me more about here','この場所について教えて','ここってどんなところ？','ここは何？','庭全体について教えて'];
 for(const lang of ['en','ja'])for(const message of requests)for(const spot of spots){
  assert(asksPageOverview(message),message);assert(asksCurrentPage(message),message);
  const page=(lang==='ja'?'/ja':'')+'/yuki/';
  const input={lang,page,message,history:[{role:'assistant',content:'Stale project description.'}],context:{section:'s2',gardenSpot:spot,lastGuide:{page:'/projects/example.html',section:'s1'}}};
  const k=retrieveKnowledge(catalog,input);
  assert.equal(k.view.wholePage,true);assert.equal(k.view.gardenSpot,undefined);assert.equal(k.view.current.kind,'page');
  assert.equal(k.view.lastGuided,null);assert.equal(k.makingOf,null);
  for(const id of spots)assert(k.pages.some(p=>p.text==='Verified landmark '+id));
  assert.match(pageEvidenceInstruction(k),/WHOLE-PLACE QUESTION/);
  assert.match(pageEvidenceInstruction(k),/whole place must remain the main topic/);
  assert.match(pageEvidenceInstruction(k),/do not.*force a spotlight every time/);
  const request=modelRequest(input,k);assert(!JSON.stringify(request.messages).includes('Stale project description.'));
  assert.equal(request.response_format.json_schema.properties.sourceIds.maxItems,3,'Provider schema must respect the parser citation limit even for six-landmark overviews');
  assert.match(JSON.stringify(request.messages),/spotlight.*optional and must not take over/);
 }
 for(const q of ["What's this pond?",'Explain this section','Tell me about this picture','What did you mean earlier?','この池について教えて','さっきの場所は何？'])assert(!asksPageOverview(q),q);
 const k=retrieveKnowledge(catalog,{lang:'en',page:'/yuki/',message:"What's this?",context:{gardenSpot:'pond',section:'s2'},history:[]});
 assert(!k.view.wholePage);assert.equal(k.view.gardenSpot.id,'pond');
});
