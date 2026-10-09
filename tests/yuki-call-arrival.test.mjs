import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {CallDialogue} from '../assets/yuki/runtime/call-dialogue.mjs';
import {ConversationMoments} from '../assets/yuki/runtime/conversation-moments.mjs';
import {localizeGreetingMessages} from '../assets/yuki/runtime/visitor-personality.mjs';
import {messageRecord,translatedText,applyTranslations} from '../assets/yuki/runtime/conversation-language.mjs';
import {cleanAssistantText} from '../assets/yuki/protocol.mjs';
import {unfinishedReply,unfinishedNotice} from '../assets/yuki/runtime/reply-completion.mjs';
import {rememberReply} from '../assets/yuki/runtime/reply-variety.mjs';

const source=readFileSync(new URL('../assets/yuki/yuki.mjs',import.meta.url),'utf8');
const momentCode=source.slice(source.indexOf(' function hideMoment(){'),source.indexOf(' function readingContext(){'));
const renderer=source.slice(source.indexOf(' function drawMessages(){'),source.indexOf(' function save(){'));
const arrival=source.slice(source.indexOf(' function announceCalledArrival(){'),source.indexOf(' async function callYuki('));
const store=()=>{const values=new Map();return {getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)};};

test('garden calls use varied bilingual home greetings across reloads, without generic portfolio copy',()=>{
 for(const lang of ['en','ja']){
  const storage=store(),seen=new Set();
  for(let i=0;i<96;i++){
   const line=new CallDialogue(storage,()=>0).next('A localized garden title',lang,{home:true});
   assert.match(line,lang==='ja'?/おうち|お庭/:/home|my.*garden/i);
   assert(!line.includes('A localized garden title'));assert(!seen.has(line));seen.add(line);
  }
  assert.match(new CallDialogue(storage,()=>0).next('Resume',lang),/Resume/,'other page calls remain page-specific');
 }
});

function fixture(ja=false){
 const storage=store(),elements=new Map(),panels=[];
 const make=()=>({children:[],dataset:{},hidden:false,textContent:'',append(...items){this.children.push(...items);},replaceChildren(...items){this.children=items;},cloneNode(){return {...this,children:[...this.children]};}});
 const $=key=>{if(!elements.has(key))elements.set(key,make());return elements.get(key);};
 const previous=messageRecord('assistant',ja?'この作品ではゲームの操作を試せるよ。':'This project explores game interactions.',ja?'ja':'en');
 const context={$,document:{createElement:make,createTextNode:t=>t},messages:[previous],ja,conversationLanguage:ja?'ja':'en',
  momentKind:'',moments:new ConversationMoments(storage,()=>0),callDialogue:new CallDialogue(storage,()=>0),announceCall:true,
  gardenScene:{},journey:{active:false},busy:false,hidden:false,online:false,base:'',location:{pathname:ja?'/ja/yuki/':'/yuki/'},root:{dataset:{pageTitle:'Garden'}},
  readPageTitle:()=>ja?'ゆきのお庭':'Yuki’s Garden',tr:(en,jp)=>ja?jp:en,panel:(...args)=>panels.push(args),status:text=>{$('.yuki-status').textContent=text;},save:()=>{},translationUI:()=>{},
  localizeGreetingMessages,messageRecord,translatedText,cleanAssistantText,unfinishedReply,unfinishedNotice,rememberReply,variety:{},
  conversationMemory:{turns:[{question:'What is your dream?',answer:'A little library.'}]}
 };
 vm.createContext(context);vm.runInContext(momentCode+renderer+arrival,context);context.drawMessages();context.status('The previous flight has finished.');
 return {context,$,panels};
}

test('arrival shows only the home greeting while preserving prior transcript and memory in EN/JA',()=>{
 for(const ja of [false,true]){
  const {context:c,$,panels}=fixture(ja),saved=JSON.stringify(c.messages),memory=JSON.stringify(c.conversationMemory);
  assert.equal($('.yuki-speech').hidden,false);
  c.announceCalledArrival();
  assert.equal($('.yuki-aside').hidden,false);assert.equal($('.yuki-speech').hidden,true);
  assert.equal($('.yuki-status').textContent,'','the completed flight does not add another greeting');
  assert.match($('.yuki-aside').textContent,ja?/お庭/:/Home again/);
  assert.equal($('.yuki-log').children.length,1);assert.equal($('.yuki-speech').children.length,1,'old speech is hidden, not deleted');
  assert.equal(JSON.stringify(c.messages),saved);assert.equal(JSON.stringify(c.conversationMemory),memory);
  assert.equal(panels.length,1);assert.equal(panels[0][1].translate,false);
  c.announceCalledArrival();assert.equal(panels.length,1,'arrival callback cannot repeat a greeting');
 }
});

test('history redraw and translation completion cannot redisplay the old reply beneath an arrival greeting',()=>{
 const {context:c,$}=fixture();c.announceCalledArrival();const greeting=$('.yuki-aside').textContent;
 c.conversationLanguage='ja';applyTranslations(c.messages,[{id:c.messages[0].id,text:'この作品ではゲームの操作を試せるよ。'}],'ja');c.drawMessages();
 assert.equal($('.yuki-speech').hidden,true);assert.equal($('.yuki-aside').textContent,greeting);
 assert.equal($('.yuki-log').children.length,1);assert.equal($('.yuki-log').children[0].children[1],'この作品ではゲームの操作を試せるよ。');
 c.addMessage('assistant','I love having a friend visit my little garden!');
 assert.equal($('.yuki-aside').hidden,true);assert.equal($('.yuki-speech').hidden,false);assert.equal(c.momentKind,'');
 assert.equal($('.yuki-speech').children[0].children[1],'I love having a friend visit my little garden!');
 assert.equal(c.messages.length,2,'new reply replaces visible speech but appends history');
});

test('non-garden calls retain their page context and busy/guided arrivals do not add a competing greeting',()=>{
 const f=fixture();f.context.gardenScene=null;f.context.readPageTitle=()=> 'Resume';f.context.announceCalledArrival();assert.match(f.$('.yuki-aside').textContent,/Resume/);
 for(const patch of [{busy:true},{journey:{active:true}},{announceCall:false}]){
  const {context:c,$,panels}=fixture();Object.assign(c,patch);c.announceCalledArrival();
  assert.equal(panels.length,0);assert.equal($('.yuki-speech').hidden,false);assert.equal(c.momentKind,'');
 }
});

test('clear/refresh/leave asides also keep one current message without erasing the conversation',()=>{
 for(const kind of ['clear','refresh','leave']){
  const {context:c,$}=fixture();c.showMoment(kind);c.drawMessages();
  assert.equal($('.yuki-aside').hidden,false);assert.equal($('.yuki-speech').hidden,true);assert.equal(c.messages.length,1);
  c.hideMoment();assert.equal($('.yuki-aside').hidden,true);assert.equal($('.yuki-speech').hidden,false);
 }
});
