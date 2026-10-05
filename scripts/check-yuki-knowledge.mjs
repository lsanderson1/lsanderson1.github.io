// Run after the Jekyll build. Checks only generated public files; no AI calls.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {retrieveKnowledge} from '../services/yuki-api/knowledge.mjs';
import {safeSitePath} from '../assets/yuki/protocol.mjs';
const site=path.resolve(process.argv[2]??'_site');
const raw=fs.readFileSync(path.join(site,'assets/yuki/knowledge.json'),'utf8'),k=JSON.parse(raw);
assert.equal(k.version,2);assert(Buffer.byteLength(raw)<2000000);assert(k.pages.length>=34);
let sections=0,images=0;
for(const p of k.pages){
 assert(safeSitePath(p.url));assert(['en','ja'].includes(p.lang));
 const file=path.join(site,p.url.endsWith('/')?p.url+'index.html':p.url);
 assert(file.startsWith(site+path.sep));const html=fs.readFileSync(file,'utf8');
 const seen=new Set();
 for(const s of p.sections){
  assert(!seen.has(s.id),`${p.url}: duplicate context ${s.id}`);seen.add(s.id);
  assert(html.includes(`data-yuki-section="${s.id}"`),`${p.url}: missing ${s.id}`);
  assert(html.includes(`id="${s.anchor}"`)||html.includes(`id='${s.anchor}'`),`${p.url}: missing anchor ${s.anchor}`);
  assert(s.title&&typeof s.text==='string');sections++;if(s.kind==='image')images++;
 }
 assert(!p.text.includes('yuki-chat-consent-v1'));assert(!p.text.includes('document.querySelector'));
}
for(const lang of ['en','ja']){
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
