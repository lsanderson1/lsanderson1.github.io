import test from 'node:test';
import assert from 'node:assert/strict';
import {asksCurrentPage,pageEvidenceInstruction} from '../services/yuki-api/page-awareness.mjs';
import {retrieveKnowledge,validateContext} from '../services/yuki-api/knowledge.mjs';
import {modelRequest} from '../services/yuki-api/worker.mjs';
import {readGardenSpot} from '../assets/yuki/runtime/reading-context.mjs';

const requests={en:["What's this?",'whats this','What is this all about?','Where are we?','What’s here?','Tell me about this place','Explain this.','What page am I on?','What is the page I am on about?','What are we looking at here?'],ja:['これ何？','これって何？','これはなに？','ここってどんなところ？','このページについて教えて','今開いてるページは？','いま見ているのは何？','ここを説明して']};
const spots=['nest','pond','lookout','books','treasures'];
const history=[{role:'user',content:'Tell me how your HoverBlink.update works'},{role:'assistant',content:'Earlier we discussed animation code.'}];
const page=(url,lang)=>({id:url,lang,url,title:url.includes('yuki')?(lang==='ja'?'ゆきの庭':'Yuki’s Garden'):'Current Project',summary:'Current published description',text:'Current published description',sections:[{id:'s0',title:'Overview',text:'Current overview.'},...spots.map((id,i)=>({id:'s'+(i+1),anchor:'garden-'+id,kind:'garden',title:id,text:'Published garden landmark: '+id})),{id:'i0',kind:'image',title:'Garden illustration',text:'Published description: a garden with a nest and pond.'}]});
const catalog={owner:'Lloyd',bio:{en:'Owner',ja:'制作者'},pages:['en','ja'].flatMap(lang=>['/yuki/','/project.html','/resume.html'].map(url=>page((lang==='ja'?'/ja':'')+url,lang)))};

test('natural current-page questions use the live page, not stale history or the last guide',()=>{
 for(const [lang,questions] of Object.entries(requests))for(const message of questions)for(const path of ['/yuki/','/project.html']){
  assert(asksCurrentPage(message),message);
  const url=(lang==='ja'?'/ja':'')+path;
  const input={lang,page:url,message,history,context:{section:'s0',lastGuide:{page:'/resume.html',section:'s0'}},memory:[{user:'Old question',assistant:'Old answer'}]};
  const k=retrieveKnowledge(catalog,input);
  assert.equal(k.view.scope,url,message);assert.equal(k.view.localQuestion,true);assert.equal(k.view.lastGuided,null);
  assert(k.pages.every(p=>p.url.split('#')[0]===url));assert.equal(k.makingOf,null);
  const r=modelRequest(input,k);
  assert.deepEqual(r.response_format.json_schema.properties.destination.enum,['none']);
  assert(!r.messages.some(m=>m.content===history[1].content));
  assert(!r.messages[0].content.includes('Old answer'));
  assert.match(r.messages.at(-2).content,/LIVE VIEW PRIORITY/);
 }
});
test('explicit other pages and actual conversational follow-ups keep their intended topics',()=>{
 for(const message of ['What did you mean earlier?','Explain what you just said','What was that thing you mentioned?','Tell me more about your dream','さっきの話を説明して','前に言ったことは何？'])assert(!asksCurrentPage(message),message);
 const k=retrieveKnowledge(catalog,{lang:'en',page:'/yuki/',message:'What is on the Resume page?',context:{section:'s0'},history});
 assert.equal(k.view.scope,'/resume.html');assert(!k.view.localQuestion);
 const followup=retrieveKnowledge(catalog,{lang:'en',page:'/yuki/',message:'How does it work?',history,context:{section:'s0'}});
 assert(followup.makingOf);assert(!followup.view.localQuestion);
});
test('each verified garden perch gets its own evidence, but stale or invented spots do not',()=>{
 for(const lang of ['en','ja'])for(const id of spots){
  const path=(lang==='ja'?'/ja':'')+'/yuki/';
  const input={lang,page:path,message:lang==='ja'?'これ何？':"What's this?",history,context:validateContext({section:'i0',gardenSpot:id})};
  const k=retrieveKnowledge(catalog,input);
  assert.equal(k.view.gardenSpot.id,id);assert(k.pages.some(p=>p.id===k.view.gardenSpot.sourceId));
  assert(pageEvidenceInstruction(k).includes('"gardenSpot":{"id":"'+id+'"'));
 }
 for(const [path,id] of [['/resume.html','pond'],['/yuki/','unknown']]){
  const k=retrieveKnowledge(catalog,{lang:'en',page:path,message:"What's this?",history,context:{gardenSpot:id}});
  assert.equal(k.view.gardenSpot,undefined);
 }
 const k=retrieveKnowledge(catalog,{lang:'en',page:'/yuki/',message:"What's this?",history,context:{section:'i0'}});
 assert.equal(k.view.gardenSpot,undefined);assert.match(pageEvidenceInstruction(k),/ask which object/);
});
test('garden position hint disappears if its landmark is panned offscreen or hidden',()=>{
 let r={left:300,right:340,top:200,bottom:240},hidden=false;
 const el={dataset:{yukiSection:'s2'},getClientRects:()=>[1],getBoundingClientRect:()=>r,closest:s=>s==='.yg-world'?{getBoundingClientRect:()=>({left:0,right:390,top:64,bottom:700})}:hidden?{}:null};
 const doc={documentElement:{clientWidth:390},getElementById:id=>id==='garden-pond'?el:null};
 assert.deepEqual(readGardenSpot(doc,'pond',700,64),{id:'pond',section:'s2'});
 for(const rect of [{left:-100,right:-50,top:200,bottom:240},{left:300,right:340,top:20,bottom:60},{left:300,right:340,top:710,bottom:750}]){r=rect;assert.equal(readGardenSpot(doc,'pond',700,64),null);}
 r={left:300,right:340,top:200,bottom:240};hidden=true;assert.equal(readGardenSpot(doc,'pond',700,64),null);
 assert.equal(readGardenSpot(doc,null,700,64),null);assert.equal(readGardenSpot(doc,'books',700,64),null);
});
