import test from 'node:test';
import assert from 'node:assert/strict';
import {rememberFact,cleanVariety,needsFreshText,packChatRequest} from '../assets/yuki/runtime/reply-variety.mjs';
import {recentAnswers} from '../services/yuki-api/reply-variety.mjs';
import {chooseFreshTopic} from '../services/yuki-api/random-facts.mjs';
import {parseModel} from '../services/yuki-api/worker.mjs';
import {validReply,readSession} from '../assets/yuki/protocol.mjs';

test('facts survive unrelated exchanges and reject early reworded EN/JA repeats',()=>{
 for(const [old,next,message] of [
  ['Octopuses have three hearts. Two pump blood to their gills.','An octopus has 3 hearts! I imagine a tiny orchestra keeping time.','Tell me another fact'],
  ['タコには心臓が三つあるんだ。','三つの心臓を持つタコ！小さな体の中で役割を分けているんだね。','別の豆知識を教えて'],
  ['Venus takes 243 Earth days to rotate once.','Venus takes 243 Earth days to rotate once. I would need a very patient clock!','Tell me a new fact about space']
 ]){
  let variety=rememberFact({},old);for(let i=0;i<10;i++)variety=rememberFact(variety,'An unrelated historical discovery example numbered '+i+'.');
  assert(needsFreshText(next,{message,history:[],memory:[],variety}),next);
  assert(recentAnswers({message,history:[],variety}).includes(old));
  assert(!needsFreshText('A sundial indicates the time using the position of a shadow cast by its gnomon.',{message,history:[],variety}));
  assert(!needsFreshText(old,{message:'Repeat your last answer word for word.',history:[],variety}));
 }
});

test('retained facts exclude already-described random subjects even without an old topic ID',()=>{
 const page=(id,title)=>({pageid:id,ns:0,title,extract:'A published introductory description that is long enough to seed public subject discovery. It is only a search topic and not evidence for the final fact.'});
 const data={query:{pages:[page(1,'Octopus'),page(2,'Sundial')]}};
 const input={variety:rememberFact({},'An octopus has three hearts.'),history:[]};
 assert.equal(chooseFreshTopic(data,input,()=>0).title,'Sundial');
});

test('fact records are bounded, survive language navigation and fit the existing request ceiling',()=>{
 let variety={};for(let i=0;i<30;i++)variety=rememberFact(variety,i+'資料の例'.repeat(400));
 assert.equal(variety.facts.length,24);assert(variety.facts.every(t=>t.length<=1200));
 assert.equal(cleanVariety({facts:['tiny',null,{},'x'.repeat(1300)]}).facts,undefined);
 const saved=JSON.stringify({savedAt:Date.now(),variety,messages:[]});
 for(const lang of ['en','ja'])assert.deepEqual(readSession({getItem:()=>saved},Date.now(),lang).variety.facts,variety.facts);
 const input={message:'もっと別の豆知識を教えて。',lang:'ja',page:'/ja/',token:'t'.repeat(1500),history:[{role:'user',content:'別のことも教えて。'}],variety};
 const before=JSON.stringify(input),packed=packChatRequest(input);
 assert(Buffer.byteLength(packed)<=14000);assert.equal(JSON.stringify(input),before);assert.equal(JSON.parse(packed).variety.facts.at(-1),variety.facts.at(-1));
});

test('only the server marks sourced delivered facts, not untrusted model metadata',()=>{
 const reply={text:'A complete answer.',emotion:'neutral',gesture:'none',destination:'none',sourceIds:[],fact:true};
 assert.equal(parseModel({response:reply},{pages:[]}).fact,undefined);
 assert.equal(validReply({...reply,fact:true}).fact,true);
});
