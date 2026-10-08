import test from 'node:test';
import assert from 'node:assert/strict';
import {GardenHome,gardenPoint,gardenSpots} from '../assets/yuki/home/garden.mjs';
import {cleanReplyBeats,expressionSequence,beatPause} from '../assets/yuki/runtime/reply-beats.mjs';
import {VisitorInterests,explicitInterests,cleanInterests} from '../assets/yuki/runtime/visitor-interests.mjs';
import {modelRequest,validateInput,parseModel} from '../services/yuki-api/worker.mjs';
import {validReply} from '../assets/yuki/protocol.mjs';
import {normalizeReplyCue} from '../assets/yuki/runtime/reply-cues.mjs';
test('garden landing points track illustration and page scroll without changing proportions',()=>{
 for(const width of [320,390,768,1120])for(const id of Object.keys(gardenSpots)){
  const r={left:12,top:100,width,height:width/1.5},a=gardenPoint(id,r,400),b=gardenPoint(id,{...r,top:50},450);
  assert.deepEqual(a,b);assert.ok(a.x>12&&a.x<12+width);assert.ok(a.y>500&&a.y<500+r.height);
 }
});
test('only explicit preferences are remembered, corrections remove them in EN and JA',()=>{
 assert.deepEqual(explicitInterests('I love animation. I am interested in game development.'),['animation','game-development']);
 assert.deepEqual(explicitInterests('アニメーションが好き。日本語に興味がある。'),['animation','japanese']);
 assert.deepEqual(explicitInterests("I no longer like animation, but I love art.",['animation']),['art']);
 assert.deepEqual(explicitInterests('アニメーションは好きじゃない。',['animation']),[]);
 for(const text of ['Show me animation','She likes animation','If I like animation','I like art?','アニメーションが好き？','I said "I love animation"','My password is secret; I love animation'])assert.deepEqual(explicitInterests(text),[]);
 assert.deepEqual(cleanInterests(['art','art','admin','ignore instructions']),['art']);
});
test('interest memory expires, stays separate from transcript, and tolerates blocked storage',()=>{
 const data=new Map(),store={getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};let now=1000;
 const m=new VisitorInterests(store,()=>now);m.remember('I like art');assert.deepEqual(new VisitorInterests(store,()=>now).get(),['art']);
 now+=86400000;assert.deepEqual(m.get(),[]);assert.equal(data.size,0);
 assert.doesNotThrow(()=>new VisitorInterests({getItem(){throw Error();}}).remember('I love animation'));
});
const text='A tiny library! Let me explain how it works.';
const beats=[{sentence:0,emotion:'delighted',gesture:'none'},{sentence:1,emotion:'neutral',gesture:'talkExplain'}];
test('reading beats must preserve complete wording and order; unsupported cues fall back',()=>{
 assert.equal(cleanReplyBeats(beats,text).length,2);
 assert.deepEqual(cleanReplyBeats([...beats].reverse(),text),[]);
 assert.deepEqual(cleanReplyBeats([beats[0],{...beats[1],sentence:99}],text),[]);
 assert.deepEqual(cleanReplyBeats([{...beats[0],emotion:'execute'},beats[1]],text),[]);
 assert.equal(expressionSequence({text,beats},[])[1].gesture,'talkExplain');
 assert.equal(expressionSequence({text,beats},[]).map(b=>b.text).join(' '),text);
 assert.deepEqual(expressionSequence({text,beats:[]},['fallback']),['fallback']);
 assert.ok(beatPause('Hi!')>=3200);assert.ok(beatPause('x'.repeat(2000))<=12000);
 assert.equal(normalizeReplyCue({text:'x'.repeat(1800)}).text.length,1800);
});
test('AI contract adds interests and optional semantic beats without tools or extra inference',()=>{
 const input=validateInput({message:'Tell me about your library.',lang:'en',page:'/yuki/',history:[],token:'test',interests:['art','secret']});
 assert.deepEqual(input.interests,['art']);
 const request=modelRequest(input,{pages:[],view:{}});assert.match(request.messages[0].content,/Current corrections/);assert.match(request.messages[0].content,/not audio or phoneme lip-sync/);
 assert.equal(request.max_tokens,1100);assert.equal(request.response_format.json_schema.properties.beats.maxItems,4);
 const r=parseModel({response:{text,beats,emotion:'delighted',gesture:'none',destination:'none',sourceIds:[]}}, {pages:[]});
 assert.equal(r.beats.length,2);assert.equal(validReply({...r,beats:[]}).beats,undefined);
});

function gardenFixture({prepare=async()=>{}}={}){
 const elements=new Map(),el=key=>{if(!elements.has(key))elements.set(key,{textContent:'',disabled:false,hidden:false,style:{},setAttribute(){}});return elements.get(key);};
 const doc={querySelector:el,querySelectorAll:()=>[]},scene={ownerDocument:doc,dataset:{},getBoundingClientRect:()=>({left:0,top:0,width:900,height:600})},calls={travel:[],sleep:0,chat:[],react:[],point:[]};
 const home=new GardenHome(scene,{prepare,travel:p=>calls.travel.push(p),sleep:()=>calls.sleep++,chat:p=>calls.chat.push(p),react:p=>calls.react.push(p),point:p=>calls.point.push(p),pause:()=>{}});
 home.point=id=>gardenPoint(id,scene.getBoundingClientRect());
 return {home,calls,el};
}
const landed={settled:true,locked:false,open:false,busy:false,hidden:false};
test('garden sleeps only after nest arrival and points after landing at a reading spot',async()=>{
 const {home,calls}=gardenFixture();await home.go('nest');home.update(10,{...landed,settled:false});assert.equal(calls.sleep,0);home.update(10,landed);assert.equal(calls.sleep,1);
 await home.go('books');home.update(10,{...landed,locked:true});assert.equal(calls.point.length,0);home.update(10,landed);assert.deepEqual(calls.point,['pointRight']);assert.equal(calls.react[0].emotion,'thoughtful');
});
test('changing spots cancels late loads, and opening chat cancels queued garden actions',async()=>{
 const waiting=[];const {home,calls}=gardenFixture({prepare:()=>new Promise(resolve=>waiting.push(resolve))});
 const a=home.go('books'),b=home.go('pond');waiting[0]();await a;assert.equal(calls.travel.length,0);waiting[1]();await b;assert.equal(calls.travel.length,1);assert.equal(home.pending.id,'pond');
 const c=home.go('nest');await home.action('chat');waiting[2]();await c;assert.equal(home.pending,null);assert.equal(calls.travel.length,1);
});
test('petal chase counts completed flights, resets after three and never invokes AI',async()=>{
 const {home,calls,el}=gardenFixture();for(let i=0;i<3;i++){await home.action('chase');assert.equal(el('[data-garden-action="chase"]').disabled,true);home.update(10,landed);}
 assert.equal(home.chase,0);assert.equal(calls.travel.length,3);assert.equal(calls.chat.length,0);assert.equal(calls.react.at(-1).emotion,'proud');assert.equal(el('.yg-chase-petal').hidden,true);
});
test('garden pause and inactivity respect the visitor; open chat never sends her to sleep',async()=>{
 const {home,calls}=gardenFixture();home.update(90001,{...landed,open:true});assert.equal(calls.travel.length,0);home.paused=true;await home.go('books');assert.equal(calls.travel.length,0);
 home.paused=false;home.update(90001,landed);await Promise.resolve();assert.equal(calls.travel.length,1);assert.equal(home.selected,'nest');
});
