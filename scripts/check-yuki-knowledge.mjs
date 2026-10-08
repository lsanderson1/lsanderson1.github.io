// Run after the Jekyll build. Checks only generated public files; no AI calls.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {retrieveKnowledge} from '../services/yuki-api/knowledge.mjs';
import {portraitAnswer} from '../services/yuki-api/page-awareness.mjs';
import {safeSitePath} from '../assets/yuki/protocol.mjs';
const site=path.resolve(process.argv[2]??'_site');
const raw=fs.readFileSync(path.join(site,'assets/yuki/knowledge.json'),'utf8'),k=JSON.parse(raw);
assert.equal(k.version,2);assert(Buffer.byteLength(raw)<2000000);assert(k.pages.length>=34);
let sections=0,images=0;
for(const p of k.pages){
 assert(safeSitePath(p.url));assert(['en','ja'].includes(p.lang));
 const message=p.lang==='ja'?'ここってどんなところ？':"What's here?";
 const input={page:p.url,lang:p.lang,message,history:[{role:'user',content:'How does your HoverBlink.update work?'}],context:{section:p.sections[0]?.id,lastGuide:{page:'/resume.html',section:'s0'}}};
 const awareness=retrieveKnowledge(k,input);
 assert.equal(awareness.view.scope,p.url);assert(awareness.pages.length);
 assert(awareness.pages.every(s=>s.url.split('#')[0]===p.url));assert.equal(awareness.makingOf,null);
 if(/^\/(ja\/)?yuki\/$/.test(p.url))for(const id of ['nest','pond','lookout','books','treasures']){
  const s=p.sections.find(s=>s.anchor==='garden-'+id);assert(s,id);
  const detail=retrieveKnowledge(k,{...input,context:{section:s.id,gardenSpot:id}});
  assert.equal(detail.view.gardenSpot.id,id);assert(detail.pages.some(s=>s.id===detail.view.gardenSpot.sourceId));
  assert(s.text.length>70,'Garden landmarks need useful role/interaction evidence, not only a title');
 }
 const file=path.join(site,p.url.endsWith('/')?p.url+'index.html':p.url);
 assert(file.startsWith(site+path.sep));const html=fs.readFileSync(file,'utf8');
 const seen=new Set();
 for(const s of p.sections){
  assert(!seen.has(s.id),`${p.url}: duplicate context ${s.id}`);seen.add(s.id);
  assert(html.includes(`data-yuki-section="${s.id}"`),`${p.url}: missing ${s.id}`);
  assert(html.includes(`id="${s.anchor}"`)||html.includes(`id='${s.anchor}'`),`${p.url}: missing anchor ${s.anchor}`);
  assert(s.title&&typeof s.text==='string');sections++;if(s.kind==='image')images++;
  // Every published picture, not just the landing portrait, must survive the
  // exact page/viewport reference and arrive as evidence for an answer.
  if(s.kind==='image'){
   const selected=retrieveKnowledge(k,{page:p.url,lang:p.lang,message:p.lang==='ja'?'この画像を説明して':'Explain this picture',history:[],context:{section:s.id,images:[s.id]}});
   assert.equal(selected.view.visual.images[0]?.sourceId,`${p.id}::${s.id}`);
   assert(selected.pages.some(entry=>entry.id===`${p.id}::${s.id}`&&entry.text.includes(s.title)));
   assert(selected.pages.every(entry=>entry.url.split('#')[0]===p.url),'Picture context must not leak unrelated pages');
  }
 }
 assert(!p.text.includes('yuki-chat-consent-v1'));assert(!p.text.includes('document.querySelector'));
 for(const s of p.sections.filter(s=>s.kind!=='image')){
  const selected=retrieveKnowledge(k,{page:p.url,lang:p.lang,message:p.lang==='ja'?'この項目を説明して':'Explain this section',history:[{role:'user',content:'Tell me about Yuki'}],context:{section:s.id}});
  assert(selected.pages.every(entry=>entry.url.split('#')[0]===p.url));
  assert(selected.pages.some(entry=>entry.id===`${p.id}::${s.id}`));
 }
}
for(const lang of ['en','ja']){
 const home=k.pages.find(p=>p.url===(lang==='ja'?'/ja/':'/'));
 const portrait=home.sections.find(s=>s.kind==='image'&&s.title.includes(k.owner));assert(portrait,'Home portrait explicitly identifies the owner');
 const identity=retrieveKnowledge(k,{page:lang==='ja'?'/ja/resume.html':'/resume.html',lang,message:lang==='ja'?'ホームページの写真の人は誰？':'Who is in the picture on the landing page?',history:[{role:'user',content:'Tell me about Yuki'}],context:{section:'s0'}});
 assert.equal(identity.view.visual.images[0].sourceId,`${home.id}::${portrait.id}`);assert(identity.pages[0].text.includes(k.owner));
 const directInput={page:home.url,lang,message:lang==='ja'?'この写真は誰？':'Who is this picture of',history:[],context:{section:'s0',images:[portrait.id]}};
 assert(portraitAnswer(directInput,retrieveKnowledge(k,directInput)).text.includes(k.owner));
 const url=(lang==='ja'?'/ja':'')+'/unreal-journey/project-1-interactable-museum.html';
 const museum=k.pages.find(p=>p.url===url);assert(museum);
 assert(museum.text.includes('Project01.exe')); // Layout-provided download help.
 const section=museum.sections.find(s=>s.title===(lang==='ja'?'実装したもの':'What I Built'));assert(section);
 const answer=retrieveKnowledge(k,{page:url,lang,message:lang==='ja'?'この項目を説明して':'Explain this section',history:[],context:{section:section.id}});
 assert(answer.pages.some(p=>p.text.includes('BPI_Interactable')));
 assert(answer.pages.some(p=>p.url===url+'#'+section.anchor));
 const image=museum.sections.find(s=>s.kind==='image');assert(image);
 const picture=retrieveKnowledge(k,{page:url,lang,message:'Explain what you showed me',history:[],context:{lastGuide:{page:url,section:image.id}}});
 assert(picture.pages.some(p=>p.url===url+'#'+image.anchor));
 const resume=k.pages.find(p=>p.url===(lang==='ja'?'/ja':'')+'/resume.html');assert(resume.text.includes('Blender'));
}
console.log(`Verified ${k.pages.length} public pages, ${sections} section/image targets (${images} images), EN/JA grounding and exact source anchors. Index: ${Buffer.byteLength(raw)} bytes.`);
