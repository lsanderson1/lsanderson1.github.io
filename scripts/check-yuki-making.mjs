// Check private implementation evidence and the non-scrolling public garden.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {makingKnowledge} from '../services/yuki-api/making-knowledge.mjs';
const k=JSON.parse(fs.readFileSync('_site/assets/yuki/knowledge.json','utf8'));
const guide=JSON.parse(fs.readFileSync('services/yuki-api/making-guide.json','utf8'));
for(const p of ['_site/assets/yuki/source-index.json','_site/yuki/code','_site/ja/yuki/code','_site/assets/yuki/home/workshop.json','_site/assets/yuki/home/workbench.mjs','_site/docs/yuki-source-archive','_site/_data/yuki_making.json','_site/services/yuki-api/making-guide.json'])assert(!fs.existsSync(p),'Retired/private content published: '+p);
assert(!k.sourceCatalog);assert(!k.pages.some(p=>p.kind==='source'||/\/yuki\/code\//.test(p.url)));
for(const lang of ['en','ja']){
 const prefix=lang==='ja'?'/ja':'',url=prefix+'/yuki/',p=k.pages.find(p=>p.url===url),html=fs.readFileSync('_site'+url+'index.html','utf8');assert(p);
 assert.doesNotMatch(html,/<pre\b|source-index\.json|\/yuki\/code\/|data-code-results|yg-intro|yg-making|yg-fieldguide|class="fp-footer"/);
 assert.match(html,/class="fp-nav"/);assert.match(html,/data-home-dialogue/);
 for(const c of guide.chapters){
  assert(!html.includes(c[lang].intro),'Explanation panel remains');
  const input={message:(lang==='ja'?'ゆきの仕組み：':'Yuki, ')+c[lang].question,lang,page:prefix+'/resume.html',history:[]};
  assert(makingKnowledge(input).notes.some(n=>n.topic===c.id),'Missing '+lang+' '+c.id);
 }
}
execFileSync(process.execPath,['scripts/build-yuki-making-notes.mjs'],{stdio:'inherit'});
console.log('Verified scene-only EN/JA gardens, retained shared header/thoughts, 8 backend-only topics, and absence of old source publication.');
