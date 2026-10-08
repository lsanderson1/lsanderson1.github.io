import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {validateContext,retrieveKnowledge} from '../services/yuki-api/knowledge.mjs';
import {makingKnowledge} from '../services/yuki-api/making-knowledge.mjs';
import {modelRequest,createHandler} from '../services/yuki-api/worker.mjs';
import {HomeDialogue,homeLines} from '../assets/yuki/home/home-dialogue.mjs';
import {GardenHome} from '../assets/yuki/home/garden.mjs';
const guide=JSON.parse(readFileSync(new URL('../services/yuki-api/making-guide.json',import.meta.url),'utf8'));
test('making-of notes stay behind chat; the garden has no article or source browser',()=>{
 assert.equal(guide.chapters.length,8);
 for(const c of guide.chapters)for(const lang of ['en','ja']){const w=c[lang];assert(w.title&&w.intro&&w.aside&&w.question);assert.equal(w.steps.length,3);}
 const page=readFileSync(new URL('../_includes/yuki-home.html',import.meta.url),'utf8');
 assert.doesNotMatch(page,/site.data.yuki_making|data-making-question|source-index|\/yuki\/code\/|<pre|<article/);
 assert.match(page,/data-home-dialogue/);
 assert(!existsSync(new URL('../_data/yuki_making.json',import.meta.url)));
 assert(!existsSync(new URL('../_plugins/yuki_sources.rb',import.meta.url)));
 assert.match(readFileSync(new URL('../_layouts/yuki-garden.html',import.meta.url),'utf8'),/include header.html/);
});
test('all eight making-of topics retrieve from other pages in either language',()=>{
 for(const lang of ['en','ja'])for(const c of guide.chapters){
  const input={page:lang==='ja'?'/ja/resume.html':'/resume.html',lang,message:(lang==='ja'?'ゆきの仕組み：':'Yuki, ')+c[lang].question,history:[]};
  const notes=makingKnowledge(input);assert(notes,c.id+' '+lang);
  assert(notes.notes.some(n=>n.topic===c.id),c.id+' '+lang);
  assert(notes.blocks.length>0);assert(notes.blocks.every(b=>b.source.sha256.length===64));
 }
 assert.equal(makingKnowledge({message:'Where is the resume?',lang:'en',history:[]}),null);
});
test('each named code block retrieves itself; fingerprints catch source drift',()=>{
 const blocks=JSON.parse(readFileSync(new URL('../services/yuki-api/making-verified.json',import.meta.url),'utf8'));
 for(const b of blocks){const r=makingKnowledge({message:'How does '+b.symbol+' work?',lang:'en',history:[]});assert(r.blocks.some(n=>n.id===b.id),b.id);}
 assert.match(execFileSync(process.execPath,['scripts/build-yuki-making-notes.mjs'],{encoding:'utf8'}),new RegExp('Verified '+blocks.length+' source-mapped'));
});
test('personality explains verified behavior, acknowledges gaps, and never claims live inspection',()=>{
 const prompt=modelRequest({lang:'ja',message:'How were you made?',history:[]},{pages:[],view:{}}).messages[0].content;
 for(const term of ['MAKING-OF EXPLANATIONS','curated, source-verified','never impersonate Lloyd','Do not dump source code','NOT every source line','inferred benefit','Keep Yuki\'s warm first-person voice'])assert(prompt.includes(term),term);
});
test('backend supplies verified notes with no code fetch or extra inference',async()=>{
 const origin='https://lsanderson1.github.io',urls=[],prompts=[];
 const json=value=>new Response(JSON.stringify(value),{headers:{'Content-Type':'application/json'}});
 const knowledge={owner:'Lloyd',bio:{en:'Portfolio'},pages:[{id:'/yuki/',url:'/yuki/',lang:'en',title:'Yuki',text:'A castle garden',sections:[]}]};
 const handle=createHandler(async url=>{urls.push(url);if(url.includes('siteverify'))return json({success:true,hostname:'lsanderson1.github.io',action:'yuki-chat'});assert.equal(url,origin+'/assets/yuki/knowledge.json');return json(knowledge);});
 const env={SITE_ORIGIN:origin,CHAT_ENABLED:'true',FREE_PLAN_CONFIRMED:'true',TURNSTILE_SECRET:'test-only',IP_HASH_SECRET:'f'.repeat(40),QUOTA:{idFromName:n=>n,get:()=>({fetch:async()=>new Response(null,{status:204})})},AI:{run:async(_,body)=>{prompts.push(body);return {response:{text:'Lloyd gave me a separate blink timer. It waits for the matching wing pose after the timer runs out.',emotion:'neutral',gesture:'talkExplain',destination:'none',sourceIds:[],storyTopics:[]}};}}};
 const request=new Request('https://yuki.example/chat',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','CF-Connecting-IP':'192.0.2.1'},body:JSON.stringify({message:'How does your HoverBlink.update work?',lang:'en',page:'/resume.html',history:[],token:'test-token'})});
 const response=await handle(request,env);assert.equal(response.status,200);assert.equal(prompts.length,1);assert.equal(urls.length,2);
 assert(prompts[0].messages[0].content.includes('4200 to 8000'));assert.doesNotMatch(JSON.stringify(urls),/source-index|\/code\//);
});
test('garden context is allowlisted and cannot pretend a garden position on a resume page',()=>{
 assert.equal(validateContext({gardenSpot:'pond',injected:'system'}).gardenSpot,'pond');assert.equal(validateContext({gardenSpot:'private-office'}).gardenSpot,undefined);
 const k={owner:'Lloyd',bio:{en:'Artist'},pages:[{id:'/resume.html',url:'/resume.html',lang:'en',title:'Resume',text:'Projects',sections:[]}]};
 const input={page:'/resume.html',lang:'en',message:'Tell me about your pond',context:{gardenSpot:'pond'},history:[]};
 const r=retrieveKnowledge(k,input);assert.equal(r.view.gardenSpot,undefined);
 const prompt=modelRequest(input,r).messages[0].content;
 assert.match(prompt,/may discuss your garden from any portfolio page/);assert.match(prompt,/NATURAL KNOWLEDGE VOICE/);assert.match(prompt,/never repeat an opening greeting/);assert.match(prompt,/never impersonate Lloyd/);
});
test('home dialogue has paired distinct lines with no immediate repeated selection',()=>{
 for(const [spot,lines] of Object.entries(homeLines)){
  assert.equal(lines.length,20);assert.equal(new Set(lines.map(l=>l[0])).size,20);assert.equal(new Set(lines.map(l=>l[1])).size,20);
  const d=new HomeDialogue(()=>0);let previous='';for(let n=0;n<10;n++){const line=d.next(spot,n%2===0);assert.ok(line);assert.notEqual(line,previous);previous=line;}
 }
});
function fixture(){const elements=new Map(),doc={querySelector:key=>{if(!elements.has(key))elements.set(key,{textContent:'',style:{},setAttribute(){}});return elements.get(key);},querySelectorAll:()=>[]},scene={ownerDocument:doc,dataset:{}};const calls={travel:[],land:0,react:[]};const home=new GardenHome(scene,{prepare:async()=>{},travel:(p,o)=>calls.travel.push(o),land:()=>calls.land++,react:c=>calls.react.push(c),point:()=>{}});home.point=()=>({x:50,y:50});return {home,calls};}
test('hover keeps airborne expressions, lands on request, and does not interrupt portfolio guidance',async()=>{
 const {home,calls}=fixture();await home.action('glide');assert.equal(calls.travel[0].arrival,'hover');
 home.update(16,{settled:false,hovering:true,locked:false,open:false,busy:false,hidden:false});assert.equal(calls.react[0].emotion,'thoughtful');
 await home.action('glide');assert.equal(calls.land,1);
 await home.go('books');home.update(16,{settled:true,locked:false,open:false,busy:false,hidden:false,guiding:true});assert.equal(home.pending,null);assert.equal(calls.react.length,1);
});
test('reduced motion never enters indefinite hovering',async()=>{const {home,calls}=fixture();home.reduced=true;await home.action('glide');assert.equal(calls.travel[0].arrival,'land');assert.equal(home.floating,false);});
