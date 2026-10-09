import test from 'node:test';
import assert from 'node:assert/strict';
import {DiscoveryGuide,isDiscoveryRequest,discoveryExcerpt} from '../assets/yuki/runtime/discovery-guide.mjs';
import {GuideJourney,planGuideStep,findGuideElement} from '../assets/yuki/runtime/guide-journey.mjs';
import {CallDialogue} from '../assets/yuki/runtime/call-dialogue.mjs';
import {cleanGuideEvent,guideFollowupInstructions} from '../services/yuki-api/guide-followup.mjs';
import {modelRequest} from '../services/yuki-api/worker.mjs';
import {readFileSync} from 'node:fs';
const store=()=>{const values=new Map();return {getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};};
const pages=['en','ja'].flatMap(lang=>{const p=lang==='ja'?'/ja':'';return [
 {id:'home-'+lang,lang,url:p+'/',title:lang==='ja'?'ホーム':'Home',text:'Published portfolio home.'},
 {id:'projects-'+lang,lang,url:p+'/projects/',title:'Projects',text:'Published projects.'},
 {id:'museum-'+lang,lang,url:p+'/projects/museum.html',title:'Museum',text:'An interaction prototype.',sections:[{id:'s1',anchor:'interaction',title:'Interaction',text:'A button opens a panel.'},{id:'i1',anchor:'gallery',kind:'image',title:'Gallery screenshot',text:'A published screenshot of the gallery.'}]},
 {id:'garden-'+lang,lang,url:p+'/yuki/',title:'Yuki’s Garden',text:'A sunny storybook home.'}
 ];});

test('natural discovery requests need no exact phrase but facts, jokes, negatives and ordinary questions stay chat',()=>{
 for(const message of ['Surprise me!','Yuki, surprise me','Show me something interesting','Take me to a random place on the site','What is worth a look here?','You choose where we go','Pick a project for me','Recommend a page to explore','Show me your favorite picture','Anything cool to see on your site?','ランダムに作品を見せて','おすすめのページに案内して','何か面白いところに連れていって','サイトから何でも選んで','おまかせ！'])assert(isDiscoveryRequest(message),message);
 for(const message of ['Tell me a random fact','Surprise me with a joke','Tell me a story','How does the garden work?','Do not show me something random','Where is Resume?','日本語の豆知識を教えて','面白い冗談を聞かせて','おすすめのページでも案内しないで','What did you choose for lunch?'])assert(!isDiscoveryRequest(message),message);
});

test('picks valid localized catalog targets, varies across reload and handles stale/malicious entries',()=>{
 for(const lang of ['en','ja']){
  const storage=store(),chosen=[];
  for(let i=0;i<5;i++){
   const guide=new DiscoveryGuide(storage,()=>.45),target=guide.pick([...pages,{lang,url:'https://evil.invalid',title:'Bad',text:'Bad'}],lang==='ja'?'/ja/':'/',{lang});
   assert(target);assert.equal(target.url.startsWith('/ja/'),lang==='ja');assert(!chosen.includes(target.url));chosen.push(target.url);
  }
  assert.equal(new DiscoveryGuide(storage).pick([], '/', {lang}),null);
 }
});

test('a discovery route persists across the existing header → project → exact image journey',()=>{
 const storage=store(),j=new GuideJourney(storage,()=>1000),target='/projects/museum.html#gallery';
 j.start(target,'/',{discovery:true});let step=planGuideStep({url:target},'/',pages);assert.equal(step.kind,'nav');assert.equal(step.url,'/projects/');j.expect(step.url,'/');
 const next=new GuideJourney(storage,()=>1100);assert.equal(next.state.discovery,true);assert.equal(next.enter('/projects/'),'continue');step=planGuideStep({url:target},'/projects/',pages);assert.equal(step.kind,'link');next.expect(step.url,'/projects/');
 const arrived=new GuideJourney(storage,()=>1200);assert.equal(arrived.enter('/projects/museum.html'),'arrived');step=planGuideStep({url:target},'/projects/museum.html',pages);assert.equal(step.kind,'arrive');assert.equal(step.url,target);
 const exact={id:'gallery'};assert.equal(findGuideElement({getElementById:id=>id==='gallery'?exact:null},step),exact);
 const event=cleanGuideEvent({kind:'arrive',url:target,discovery:true}),prompt=guideFollowupInstructions(event,{pages},'en','/projects/museum.html');
 assert.match(prompt,/DISCOVERY ARRIVAL/);assert.match(prompt,/Gallery screenshot/);assert.match(prompt,/published screenshot/);assert.match(prompt,/Automatically give the full explanation NOW/);
 assert.equal(modelRequest({message:'Explain your pick.',history:[],lang:'en',guideEvent:event,guideInstructions:prompt},{pages:[]}).max_tokens,1100);
 assert.throws(()=>guideFollowupInstructions({...event,url:'/invented.html'},{pages},'en','/'));
});

test('mixed project or essay requests choose either category and fallback excerpts finish sentences',()=>{
 const catalog=[...pages,{id:'essay',lang:'en',url:'/essays/learning.html',title:'Learning',text:'A reflection on learning.'}];
 const picked=new DiscoveryGuide(store(),()=>.999).pick(catalog,'/',{request:'Pick a project or essay',lang:'en'});
 assert.equal(picked.url,'/essays/learning.html');
 assert.equal(discoveryExcerpt('First complete sentence. Another long sentence which should not be chopped.',30),'First complete sentence.');
 assert.equal(discoveryExcerpt('Too long without any sentence boundary at all',15),'');
 assert.equal(discoveryExcerpt('小さな池があるよ。葉っぱが水に浮いている。',12),'小さな池があるよ。');
});

test('call lines have 96 nonrepeating combinations per language, include current page and survive reload',()=>{
 for(const lang of ['en','ja']){
  const storage=store(),seen=new Set();
  for(let i=0;i<96;i++){const line=new CallDialogue(storage,()=>0).next('Museum',lang);assert.match(line,/Museum/);assert(!seen.has(line));seen.add(line);}
  for(let i=0;i<12;i++)assert(new CallDialogue(storage,()=>0).next('Resume',lang).includes('Resume'));
 }
});

test('actual UI routes discovery immediately and only announces a manual call after arrival',()=>{
 const source=readFileSync(new URL('../assets/yuki/yuki.mjs',import.meta.url),'utf8');
 assert.match(source,/beginJourney\(target,\{discovery:true\}\)/);assert.match(source,/journey\.state\?\.discovery===true/);
 assert.match(source,/onclick=\(\)=>callYuki\(\{announce:true\}\)/);
 assert.match(source,/if\(!announceCall\)return;announceCall=false;if\(journey.active\|\|busy\)return/);
 assert.match(source,/trip.kind==='incoming'&&settled[\s\S]*announceCalledArrival/);
 assert.match(source,/announceCall=announce&&!keepJourney&&!resident/);
});
