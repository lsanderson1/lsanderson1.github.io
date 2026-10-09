import test from 'node:test';
import assert from 'node:assert/strict';
import {replyLanguage,wrongReplyLanguage,repeatedPassage,replyQualityIssues,formalJapaneseVoice} from '../assets/yuki/runtime/reply-quality.mjs';
import {messageRecord,cleanMessages,conversationHistory,applyTranslations,translatedText,translationBatch} from '../assets/yuki/runtime/conversation-language.mjs';
import {validateInput,modelRequest,selectKnowledge} from '../services/yuki-api/worker.mjs';
import {parseTranslations,translationRequest} from '../services/yuki-api/conversation-translation.mjs';
import {voiceInstructions,replyContract} from '../services/yuki-api/personality.mjs';

const en='A tiny flying library is my dream. I imagine comfortable little perches where everyone can enjoy a book.';
const ja='小さな空飛ぶ図書館が夢なんだ。誰でも本を楽しめるように、座り心地のいい場所も用意したい！';
const input={message:'Tell me a fun fact and what you like about it.',lang:'en',page:'/',history:[{role:'assistant',content:ja}],memory:[{question:'日本語で話して',answer:ja}],token:'fixture'};

test('newest message chooses either language on either page, never old preferences',()=>{
 for(const page of ['en','ja']){
  for(const message of ['What is a fun fact?', 'Tell me a joke', 'more', 'Please reply in English.', '英語で説明して', '英語で'])assert.equal(replyLanguage(message,page),'en',message);
  for(const message of ['面白い話を教えて', 'Blenderの仕組みを知りたい', 'もっと', '日本語で', 'Can you answer in Japanese?'])assert.equal(replyLanguage(message,page),'ja',message);
  for(const message of ['Blender','123','🐉'])assert.equal(replyLanguage(message,page),page);
 }
 assert.equal(replyLanguage('What does 「日本語で話して」 mean?','ja'),'en','quoted language requests do not control the reply');
 const english=validateInput(input);assert.equal(english.replyLanguage,'en');assert.equal(english.history[0].content,ja);
 const japanese=validateInput({...input,message:'楽しい豆知識を教えて'});assert.equal(japanese.replyLanguage,'ja');assert.equal(japanese.lang,'en','page evidence language stays independent');
 assert.equal(validateInput({...input,lang:'ja',message:'Tell me about your dream'}).replyLanguage,'en');
 assert.equal(validateInput({...input,lang:'ja',guideEvent:{kind:'arrive',url:'/ja/'}}).replyLanguage,'ja','automatic guide events use page language');
});

test('same-page opt-in language does not lose current page evidence or pollute source selection',()=>{
 const site={owner:'Lloyd',bio:{en:'Developer',ja:'開発者'},pages:[{id:'garden-en',lang:'en',url:'/yuki/',title:'Yuki’s Garden',text:'A sunny castle garden.',sections:[]}]};
 const request=validateInput({...input,page:'/yuki/',message:'このページは何？'}),knowledge=selectKnowledge(site,request);
 assert.equal(knowledge.view.current.page,'/yuki/');assert.equal(knowledge.pages[0].title,'Yuki’s Garden');
 const prompt=modelRequest(request,knowledge);assert.match(prompt.messages.at(-2).content,/THIS reply is Japanese/);assert.match(prompt.messages[0].content,/Answer in Japanese/);
});

test('language guard accepts quoted terms and code, detects mixed/wrong narration',()=>{
 assert(wrongReplyLanguage(ja,'en'));assert(wrongReplyLanguage(en,'ja'));
 assert(!wrongReplyLanguage(ja,'ja'));assert(!wrongReplyLanguage(en,'en'));
 for(const text of ['Yuki means 「雪」, or snow. That little word belongs to her story.', 'The phrase “私は日本語で話したいです” means the speaker wants to use Japanese.', 'Here is the example:\n```js\nconst label = "日本語の説明をここに書いてみよう";\n```'])assert(!wrongReplyLanguage(text,'en'));
 assert(!wrongReplyLanguage('Cloudflare Workers AIとBlenderは別の役割を持っているんだ。','ja'));
 assert(wrongReplyLanguage(en+' '+ja,'en'));
 assert.deepEqual(replyQualityIssues(en+' '+en,'en'),['repetition']);
 assert.deepEqual(replyQualityIssues(en+' '+en,'en',{allowRepetition:true}),[]);
});

test('substantial internal loops are detected without stripping emphasis, quotations or code',()=>{
 for(const text of [en+' '+en,ja+' '+ja,`${en}\n\nAnother complete observation.\n\n${en}`])assert(repeatedPassage(text),text);
 for(const text of ['Very, very tiny paws. Very, very tiny paws.',en,`The two examples are “${en}” and “${en}”.`, `An example:\n\x60\x60\x60\n${en}\n${en}\n\x60\x60\x60`])assert(!repeatedPassage(text),text);
});

test('Japanese voice review notices stiff narration and repeated cute suffixes, not quoted speech',()=>{
 assert(formalJapaneseVoice('ここは私の庭です。池のそばで本を読みます。'));
 assert(formalJapaneseVoice('ここが庭なの。本が好きなの。葉っぱに座るの。'));
 assert(!formalJapaneseVoice('小さな本でも、知らない世界へ連れていってくれるんだ。想像するとわくわくする！'));
 assert(!formalJapaneseVoice('「ここは庭です。池のそばで本を読みます。」という文を訳したよ。'));
 assert(repeatedPassage('でも、それよりもっと面白いのは、ここにたくさんの魚がいること。'+'でも、それよりもっと面白いのは、空にいろんな鳥がいること。'+'でも、それよりもっと面白いのは、池にきれいな花が咲くこと。'+'でも、それよりもっと面白いのは、庭に大きな木があること。'));
});

test('history uses the displayed translation and preserves originals, missing translations and size limits',()=>{
 const m=messageRecord('assistant',ja,'ja');applyTranslations([m],[{id:m.id,text:en}],'en');
 assert.equal(conversationHistory([m],'en')[0].content,en);assert.equal(m.text,ja);
 assert.equal(conversationHistory([m],'ja')[0].content,ja);
 m.translations.en='x'.repeat(4000);assert.equal(conversationHistory([m],'en')[0].content,ja,'no truncation of oversized translated turns');
 const wrong=cleanMessages([{...messageRecord('assistant',ja,'en')}])[0];
 assert.equal(wrong.language,'ja');assert.equal(wrong.text,ja);assert.equal(translatedText(wrong,'en'),null);assert.equal(translationBatch([wrong],'en').length,1);
 applyTranslations([wrong],[{id:wrong.id,text:en}],'en');assert.equal(translatedText(wrong,'en'),en);assert.equal(wrong.text,ja);
});

test('translation rejects wrong language and copied passages atomically without new answers',()=>{
 const items=[{id:'a',role:'assistant',text:ja}];
 for(const text of [ja,en+' '+en])assert.throws(()=>parseTranslations({response:{translations:[{id:'a',text}]}},items,'en'));
 assert.equal(parseTranslations({response:{translations:[{id:'a',text:en}]}},items,'en')[0].text,en);
 for(const language of ['en','ja'])assert.match(translationRequest(items,language).messages[0].content,/NOT a new answer/);
});

test('joyful innocent voice and optional questions are reinforced after history in every answer path',()=>{
 for(const language of ['en','ja']){
  const request={...input,lang:language,replyLanguage:language};
  for(const knowledge of [{pages:[]},{pages:[],view:{localQuestion:true,current:{page:'/',title:'Home'}}}]){
   const prompt=modelRequest(request,knowledge);
   assert(prompt.messages[0].content.includes(voiceInstructions(language)));
   assert(prompt.messages.at(-2).content.includes(replyContract(language)));
   assert.match(prompt.messages.at(-2).content,/normally a statement/);
   assert.equal(prompt.max_tokens,1900);
  }
  assert.match(voiceInstructions(language),/happy, innocent, cheerful, playful and joyful/);
  assert.match(voiceInstructions(language),/not dismissing|does not mean dismissing/);
 }
});
