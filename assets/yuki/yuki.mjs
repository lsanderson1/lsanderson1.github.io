import {Companion} from './runtime/companion.mjs?v=2';
import {projectFrame} from './runtime/projection.mjs';
import {IdleRenderer} from './runtime/idle-renderer.mjs';
import {takeoffMs,landingMs,contactPhases} from './runtime/timing.mjs';
import {airClips} from './runtime/air-reactions.mjs';
import {emotionPlayback,applyReplyCue} from './runtime/reply-cues.mjs?v=3';
import {SiteGuide} from './runtime/site-guide.mjs?v=6';
import {pageLayout,bubblePlacement,bubbleHeightLimit,pointerTarget} from './runtime/page-layout.mjs?v=9';
import {localizedPages,localizePath,findPageTarget,pendingGuide,targetRect,curateDestinations} from './runtime/page-targets.mjs?v=9';
import {PageObstacles,visibleSpot,guideSpot,clampFoot,fits,atFoot} from './runtime/clear-space.mjs?v=5';
import {GuideJourney,GuideDialogue,guideTarget as checkedGuideTarget,isGuideRequest,resolveGuideRequest,guideChoice,planGuideStep,findGuideElement} from './runtime/guide-journey.mjs?v=3';
import {PageMotion,pageProjection,inViewport,containPageRover,prepareCall} from './runtime/page-motion.mjs?v=8';
import {CallPerches} from './runtime/call-perches.mjs?v=7';
import {VisitorPersonality,conversationOpening,localizeGreetingMessages,replySequence,cueArtwork} from './runtime/visitor-personality.mjs?v=9';
import {ChatAvailability,ChatPermission,ChatSession,ChatVerification,chatEnvironment,chatEnabledKey,searchConsentKey} from './runtime/chat-access.mjs?v=3';
import {ConversationMemory} from './runtime/conversation-memory.mjs?v=1';
import {VisitorInterests} from './runtime/visitor-interests.mjs';
import {expressionSequence} from './runtime/reply-beats.mjs';
import {GardenHome} from './home/garden.mjs?v=3';
import {YukiLocation,capturePose,restorePose,poseArtwork,locationLabel,locationPage,portalSection,travelPortalSection} from './home/location.mjs?v=2';
import {summonTiming,summonPhase,callFlightDuration,catchInFlight} from './home/summon.mjs';
import {ConversationMoments,shouldWelcomeOnRefresh,isLeavingLink} from './runtime/conversation-moments.mjs?v=1';
import {messageRecord,translatedText,translationBatch,checkedTranslations,applyTranslations} from './runtime/conversation-language.mjs?v=4';
import {ReadingMemory,readPageTitle,readingDetail,readPageDisplaySection,readPageSection,readPageImages,guideReference,followUpReference} from './runtime/reading-context.mjs?v=4';
import {validReply,readSession,chatUnavailable,cleanAssistantText} from './protocol.mjs?v=14';
import {safeWebURL} from './runtime/web-sources.mjs?v=1';
import {cleanVariety,rememberReply,packChatRequest} from './runtime/reply-variety.mjs?v=3';

const root=document.querySelector('#yuki-companion');
if(root)start().catch(()=>{root.textContent='';}); // Portfolio remains usable on failure.
async function start(){
 const ja=document.documentElement.lang==='ja',base=root.dataset.base||'',assets=new URL(root.dataset.assets,location.href);
 const tr=(en,jp)=>ja?jp:en,$=s=>root.querySelector(s),media=matchMedia('(prefers-reduced-motion: reduce)');
 let saved={};try{saved=readSession(sessionStorage,Date.now(),ja?'ja':'en');}catch{}
 let readingStorage;try{readingStorage=sessionStorage;}catch{}const readingMemory=new ReadingMemory(readingStorage);
 const conversationMemory=new ConversationMemory(readingStorage,ja?'ja':'en'),chatSession=new ChatSession(readingStorage);
 const interests=new VisitorInterests(readingStorage),gardenScene=document.querySelector('[data-yuki-garden]');let garden=null,gardenRect=null;
 const presence=new YukiLocation(readingStorage,{base});presence.transit();presence.settleAway(location.pathname);
 let resident=presence.here(location.pathname),portalTrip=null,portalAfterglow=null,lastLocationSave=0;
 const moments=new ConversationMoments(readingStorage);let momentKind='';
 let lastFlop=0;try{const stamp=Number(readingStorage?.getItem('yuki-last-flop-v1'));if(Number.isFinite(stamp)&&stamp>0&&stamp<=Date.now())lastFlop=stamp;}catch{}
 const flopRemaining=()=>{try{const stamp=Number(readingStorage?.getItem('yuki-last-flop-v1'));if(Number.isFinite(stamp)&&stamp>0&&stamp<=Date.now())lastFlop=Math.max(lastFlop,stamp);}catch{}return Math.max(0,300000-(Date.now()-lastFlop));};
 const rememberFlop=()=>{lastFlop=Date.now();try{readingStorage?.setItem('yuki-last-flop-v1',String(lastFlop));}catch{}};
 let journey=new GuideJourney(readingStorage),journeySerial=0,journeyStep=null,markedTarget=null,knowledgeReady,guideChoices=[];
 const guideDialogue=new GuideDialogue(readingStorage);
 let visitorStorage;try{visitorStorage=localStorage;}catch{}const personality=new VisitorPersonality(visitorStorage);
 let messages=saved.messages??[],variety=cleanVariety(saved.variety),companion,guide,renderer,clips,bodyHeight=155,last=0,loading=0,busy=false,translationFailed=false,pendingCue=null,controller;
 let hidden=saved.hidden??false,paused=saved.paused??false,roam=saved.mobilityVersion===2?saved.roam:true,open=false,ready=false,onScreen=true,calling=false,callLoading=false;
 const viewportLayout=()=>pageLayout(document.documentElement.clientWidth||innerWidth,innerHeight);
 let layout=viewportLayout(),shownFoot=layout.home,motion,guideTarget=null,highlightUntil=0,knowledge=[];
 const obstacleReader=new PageObstacles(document,root);
 const callPerches=new CallPerches();
 let obstacles=[],clear=true,lastMeasure=-Infinity,guideScrollUntil=0,headerBottom=0;
 const measureHeader=()=>headerBottom=Math.max(0,document.querySelector('.fp-nav')?.getBoundingClientRect().bottom??0);
 const paths={projects:'/projects/',essays:'/essays/',unreal:'/unreal-journey/',resume:'/resume.html',garden:'/yuki/'};
 const names={projects:'Projects',essays:'Essays',unreal:'Unreal Journey',resume:'Resume',garden:tr('Yuki’s Garden','ゆきの庭')};
 const endpoint=(()=>{try{const u=new URL(root.dataset.endpoint);return u.protocol==='https:'?u.href:'';}catch{return '';}})();
 const access=chatEnvironment({origin:location.origin,siteOrigin:root.dataset.siteOrigin,endpoint,siteKey:root.dataset.siteKey});
 const online=access.available,permission=new ChatAvailability(visitorStorage);
 const searchPermission=new ChatPermission(visitorStorage,searchConsentKey);
 root.innerHTML=`<div class="yuki-pet" aria-hidden="true" hidden><img alt="" draggable="false"><canvas hidden></canvas><span class="yuki-bubble" hidden></span></div>
 <button class="yuki-hit" hidden aria-controls="yuki-panel" aria-expanded="false" aria-label="${tr('Wake Yuki and chat','ゆきを起こして話す')}"></button>
 <svg class="yuki-guide-line" aria-hidden="true" hidden><path></path><circle r="5"></circle></svg><div class="yuki-target-ring" hidden></div>
 <button class="yuki-launcher" hidden aria-controls="yuki-panel" aria-describedby="yuki-location">${tr('Call Yuki','ゆきを呼ぶ')}</button><span class="yuki-location" id="yuki-location" role="status"></span>
 <section class="yuki-panel" id="yuki-panel" role="dialog" aria-modal="false" aria-labelledby="yuki-title" hidden>
 <div class="yuki-panel-inner"><header class="yuki-heading"><h2 id="yuki-title">ゆき <span class="yuki-beta">BETA</span><small>${tr('Small Dragon, Big Dreams','小さな案内役')}</small></h2><button class="yuki-menu" aria-expanded="false" aria-controls="yuki-more" aria-label="${tr('Guide, history and settings','案内・履歴・設定')}">⋯</button><button class="yuki-close" aria-label="${tr('Close chat','チャットを閉じる')}">×</button></header>
 <p class="yuki-aside" role="status" hidden></p><div class="yuki-speech" role="log" aria-live="polite" aria-atomic="true" aria-label="${tr('Yuki says','ゆきの返事')}"></div><p class="yuki-status" role="status"></p><button class="yuki-translate" type="button" hidden>${tr('Retry translation','翻訳を再試行')}</button>
 <p class="yuki-reading"><span class="yuki-page"></span><span class="yuki-view"></span><button class="yuki-explain" type="button" hidden>${tr('Explain what you showed me','案内したところを説明して')}</button></p>
 <form class="yuki-form"><textarea maxlength="1000" rows="1" aria-label="${tr('Message Yuki','ゆきへのメッセージ')}" placeholder="${tr('Talk to Yuki…','ゆきに話しかける…')}"></textarea><button type="submit">${tr('Send','送信')}</button>
 <details class="yuki-setup"><summary></summary><div class="yuki-privacy"><p>${tr('Talking to Yuki sends your message, recent and relevant older chat, and the current page/guide context to Cloudflare Workers AI. Opening an empty or already-translated conversation does not send anything. After a language switch, earlier messages may be sent for translation as explained below. Please don’t share sensitive information.','ゆきへの送信時に、メッセージ・直近と関連する過去の会話・現在のページや案内先をCloudflare Workers AIへ送ります。会話が空か翻訳済みの場合、開くだけでは送信しません。言語を切り替えた後は、下記の説明のとおり過去の会話を翻訳のために送る場合があります。個人情報・機密情報は入力しないでください。')}</p><p>${tr('Requested guided routes can also generate an AI follow-up at each stop. Free usage limits still apply. A verified chat pass lasts up to two hours in this tab; the security check appears only when needed.','依頼した道案内では、各地点でAIが続きの質問を作る場合があります。無料利用上限があります。認証済みチャットはこのタブで最大2時間有効で、必要なときだけセキュリティ認証が表示されます。')}</p><p>${tr('Yuki recalls up to 40 earlier exchanges in this tab for up to 24 hours after the last exchange. This is not permanent memory or a server-side profile. Clear chat only removes the visible conversation; these memories stay until they expire or this tab’s session data is removed.','このタブでは最大40件の過去のやり取りを、最後の会話から最大24時間まで記憶します。永久的な記憶やサーバー上のプロフィールではありません。「チャットを消去」では表示中の会話だけを消し、記憶は期限切れやこのタブのセッションデータの削除まで保持します。')}</p></div></details>
 <div class="yuki-check"><p class="yuki-verification-status" role="status"></p><div class="yuki-verification"></div><button class="yuki-retry" type="button" hidden>${tr('Retry verification','認証をやり直す')}</button><button class="yuki-cancel" type="button" hidden>${tr('Cancel sending','送信をキャンセル')}</button></div></form>
 <p class="yuki-preview" hidden><a class="yuki-live-link" target="_blank" rel="noopener noreferrer">${tr('Open this page on the live website ↗','公開サイトの同じページを開く ↗')}</a></p>
 <div class="yuki-more" id="yuki-more" hidden>
 <input class="yuki-search" type="search" aria-label="${tr('Find a page or section','ページや項目を探す')}" placeholder="${tr('Search projects and highlights…','作品や見どころを探す…')}"><div class="yuki-destinations"></div>
 <details class="yuki-history"><summary>${tr('Conversation history','会話の履歴')}</summary><div class="yuki-log" aria-label="${tr('Conversation','会話')}"></div></details>
 <div class="yuki-settings"><button class="yuki-ai-toggle" type="button"></button><button data-action="roam"></button><button data-action="pause"></button><button data-action="hide"></button><button data-action="clear">${tr('Clear chat','チャットを消去')}</button></div></div></div></section>`;
 const varietyNote=document.createElement('p');varietyNote.textContent=tr('To reduce repetition, this tab also keeps Yuki’s discussed story topics, recent reply openings and similarity fingerprints. They are sent with your next message and kept when you clear the chat, with the existing 30-minute session expiry. A near-duplicate answer may use one extra AI rewrite within the same free usage limits.','繰り返しを減らすため、ゆきが話した物語の項目、直近の返事の書き出し、類似度を確認するためのデータも同じタブに保存し、次のメッセージと一緒に送信します。チャットを消去しても保持し、従来どおりセッションは30分で期限切れになります。よく似た回答は、同じ無料利用上限の範囲内で一度だけAIが書き直す場合があります。');$('.yuki-privacy').append(varietyNote);
 const languageNote=document.createElement('p');languageNote.textContent=tr('Switching languages keeps our conversation and memory. Earlier messages are automatically translated through Cloudflare into the new page language, within the same free limits. The original wording and translations stay in this tab and are reused between pages and when switching back. An active guided route also continues in the new language.','言語を切り替えても会話と記憶は引き継ぎます。同じ無料上限の範囲で、過去のメッセージをCloudflareで新しいページの言語に自動翻訳します。原文と翻訳はこのタブに保存し、ページの移動や言語を戻したときに再利用します。案内中の行き先も引き継ぎます。');$('.yuki-privacy').append(languageNote);
 const interestNote=document.createElement('p');interestNote.textContent=tr('Explicitly stated interests in six public topics (animation, game development, art, Yuki’s story, making Yuki, Japanese) can also be remembered in this tab for up to 24 hours. No interests are inferred from browsing. Current corrections take priority. These topic labels accompany your next chat request; Clear chat keeps them.','明確に伝えた興味（アニメーション、ゲーム開発、絵、ゆきの物語、ゆきの制作、日本語）も、このタブで最大24時間保持できます。閲覧行動から推測はしません。新しい訂正を優先し、次の会話の送信時にトピック名を添えます。チャットを消去しても保持します。');$('.yuki-privacy').append(interestNote);
 const searchLabel=document.createElement('label'),searchBox=document.createElement('input');searchBox.type='checkbox';searchBox.className='yuki-search-consent';searchBox.disabled=!online;
 searchLabel.append(searchBox,document.createTextNode(tr('Optional: let Yuki send a short public-topic query to Tavily when an answer needs web information. This adds another provider; your full chat is not sent to Tavily. Do not include private or sensitive information. Remember this choice; you can turn it off here anytime. Search has shared free limits, and normal chat works without it.','任意：ウェブ情報が必要な回答では、ゆきが短い公開トピックの検索語をTavilyに送信することを許可します。送信先が追加されますが、会話全体はTavilyに送りません。個人情報・機密情報は入力しないでください。この設定を記憶し、ここでいつでも解除できます。検索には共有の無料上限があります。通常の会話は検索なしでも利用できます。')));$('.yuki-privacy').append(searchLabel);
 const status=text=>{$('.yuki-status').textContent=text;};
 function hideMoment(){momentKind='';$('.yuki-aside').hidden=true;$('.yuki-aside').textContent='';}
 function showMoment(kind,{reveal=false}={}){momentKind=kind;$('.yuki-aside').textContent=moments.next(kind,ja?'ja':'en');$('.yuki-aside').hidden=false;
  // A local aside never creates a chat turn, spends AI quota or steals focus.
  if(reveal&&!hidden&&!busy&&!journey.active)panel(true,{focus:false,translate:false});
 }
 function readingContext(){measureHeader();const viewed=readPageSection(document,innerHeight,headerBottom),r=companion?.rover;const spot=garden&&!journey.active&&!garden.pending&&(r?.graph.state==='rest'||r?.isHovering)?garden.spotAt(r.position):null;const selected=spot&&viewed?.kind==='image'?document.getElementById('garden-'+spot)?.dataset.yukiSection:null;return {section:selected??viewed?.id??'',images:readPageImages(document,innerHeight,headerBottom),lastGuide:readingMemory.get(),...(spot?{gardenSpot:spot}:{})};}
 function updateReading(){
  measureHeader();
  const title=readPageTitle(document,{path:location.pathname,base,title:root.dataset.pageTitle,lang:ja?'ja':'en'});
  const section=readPageDisplaySection(document,{path:location.pathname,base,lang:ja?'ja':'en',height:innerHeight,header:headerBottom});
  $('.yuki-page').textContent=tr('On this page: ','現在のページ：')+title;
  const detail=readingDetail(section,title,ja?'ja':'en');
  $('.yuki-view').textContent=detail?tr('In view: ','表示中：')+detail:'';
  $('.yuki-explain').hidden=!readingMemory.get();$('.yuki-explain').disabled=busy||!online;
 }
 $('.yuki-explain').onclick=()=>{if(!online||busy||!readingMemory.get())return;if($('textarea').value.trim()){status(tr('Send or clear your draft first; I’ll keep it here for you.','入力中のメッセージを先に送るか消してね。今の文章はそのまま残しておくよ。'));$('textarea').focus();return;}$('textarea').value=tr('Please explain what you just showed me in more detail. How does it relate to this project?','さっき案内してくれたところを、もう少し詳しく説明して。この作品とどう関係しているの？');$('.yuki-form').requestSubmit();};
 const offline=chatUnavailable(access.reason||'not-connected',ja?'ja':'en');
 if(access.reason==='preview'&&access.liveOrigin){$('.yuki-live-link').href=new URL(location.pathname,access.liveOrigin).href;$('.yuki-preview').hidden=false;}
 function permissionUI(){
  $('.yuki-ai-toggle').textContent=permission.allowed?tr('Turn AI off','AIをオフにする'):tr('Turn AI on','AIをオンにする');
  searchBox.checked=online&&searchPermission.allowed;
  $('.yuki-setup summary').textContent=!online?tr('AI chat · Privacy','AIチャット・プライバシー'):permission.allowed?tr('AI chat on · Privacy','AIチャット：オン・設定'):tr('AI chat off · Settings','AIチャット：オフ・設定');
  translationUI();
 }
 permissionUI();
 function translationUI(){$('.yuki-translate').hidden=!translationFailed||!online||busy||!translationBatch(messages,ja?'ja':'en').length;$('.yuki-translate').disabled=!permission.allowed;}
 function drawMessages(){
  const lang=ja?'ja':'en',greetings=localizeGreetingMessages(messages,lang);
  messages.forEach((m,i)=>{if(greetings[i]!==m){m.greetingId=greetings[i].greetingId;m.translations={...m.translations,[lang]:greetings[i].text};}});
  const log=$('.yuki-log');log.replaceChildren();$('.yuki-speech').replaceChildren();
  for(const m of messages)addMessage(m.role,translatedText(m,lang),false,m.sources??[],[],m.greetingId);
  translationUI();
 }
 function addMessage(role,text,remember=true,sources=[],storyTopics=[],greetingId){
  // Also protects previously saved replies and cached language variants without
  // erasing the conversation or changing the visitor's own quoted examples.
  if(role==='assistant'&&text!=null){try{text=cleanAssistantText(text);}catch{text=tr('Oops, that reply got tangled up. Could you ask me again?','あれっ、返事がこんがらがっちゃった。もう一度聞いてくれる？');}}
  if(remember)hideMoment();
  if(remember){messages.push({...messageRecord(role,text,ja?'ja':'en'),...(sources.length?{sources}:{}),...(Number.isInteger(greetingId)?{greetingId}:{})});messages=messages.slice(-12);if(role==='assistant')variety=rememberReply(variety,text,storyTopics);}
  const p=document.createElement('p');p.className='yuki-message';p.dataset.role=role;const label=document.createElement('strong');label.textContent=role==='user'?tr('YOU','あなた'):'ゆき';p.append(label,document.createTextNode(text??(online?tr('Switching this message to English…','このメッセージを日本語に切り替えています…'):tr('Your conversation is saved. Automatic translation is available on the live site.','会話は保存されています。自動翻訳は公開サイトで利用できます。'))));
  const history=p.cloneNode(true);$('.yuki-log').append(history);$('.yuki-log').scrollTop=$('.yuki-log').scrollHeight;
  if(role==='assistant'){
   if(sources.length){const links=document.createElement('span');links.className='yuki-sources';for(const s of sources){
    const external=safeWebURL(s.url);
    if(external){const a=document.createElement('a');a.href=external;a.target='_blank';a.rel='noopener noreferrer';a.textContent=s.title+' ↗';a.setAttribute('aria-label',tr('Web source (opens a new tab): ','ウェブ出典（新しいタブ）：')+s.title);links.append(a);continue;}
    const url=localizePath(s.url,knowledge,ja?'ja':'en',base);if(!url)continue;const a=document.createElement('a');a.href=url;a.textContent=s.title;a.onclick=e=>{if(e.button===0&&!e.ctrlKey&&!e.metaKey&&!e.shiftKey&&!e.altKey){if(new URL(url,location.href).pathname===location.pathname){e.preventDefault();void visit(url,s.title);}else{try{sessionStorage.setItem('yuki-guide-v1',JSON.stringify({url,at:Date.now()}));}catch{}}}};links.append(a);}p.append(links);}
   $('.yuki-speech').replaceChildren(p);$('.yuki-speech').scrollTop=0;
  }if(remember){translationUI();save();}
 }
 function save(){rememberLocation();try{const r=companion?.rover;sessionStorage.setItem('yuki-session-v1',JSON.stringify({savedAt:Date.now(),language:ja?'ja':'en',mobilityVersion:2,awake:companion?companion.lifecycle.state!=='sleep':saved.awake,chatOpen:open,hidden,paused,roam,messages,variety,x:r?r.foot.x/innerWidth:saved.x,y:r?r.foot.y/innerHeight:saved.y}));}catch{}}
 function settingLabels(){for(const [k,text] of Object.entries({roam:roam?tr('Occasional flights: on','たまにお散歩：オン'):tr('Occasional flights: off','たまにお散歩：オフ'),pause:paused?tr('Resume','再開'):tr('Pause','一時停止'),hide:hidden?tr('Show Yuki','ゆきを表示'):tr('Hide Yuki','ゆきを隠す')}))$(`[data-action="${k}"]`).textContent=text;}
 drawMessages();status(online?tr('Ready when you are.','いつでもどうぞ。'):offline);settingLabels();
 function panel(value,{restoreFocus=true,focus=true,translate=true}={}){open=value;$('.yuki-panel').hidden=!value;$('.yuki-hit').setAttribute('aria-expanded',String(value));motion?.defer();
  if(value){if(hidden){hidden=false;sync();}wake();updateReading();if(focus)$('.yuki-close').focus({preventScroll:true});if(translate)queueMicrotask(()=>{if(open)void translateConversation();});}
  else {if(busy){controller?.abort();status(tr('Sending cancelled.','送信をキャンセルしました。'));}verification.stop();}
  if(!value&&restoreFocus){const returnFocus=!hidden?$('.yuki-hit'):$('.yuki-launcher');if(!returnFocus.hidden)returnFocus.focus({preventScroll:true});}placeBubble();save();}
 async function openConversation(){
  if(!ready||open)return;if(!resident)await callYuki();if(!resident)return;panel(true);
  conversationMemory.expire();
  const cue=momentKind||conversationMemory.turns.length?null:conversationOpening(messages,personality,ja?'ja':'en',{home:Boolean(gardenScene)});if(!cue){void translateConversation();return;}
  addMessage('assistant',cue.text,true,[],[],cue.greetingId);
  await react(cue,{firstMeeting:cue.firstMeeting}).catch(()=>{});
 }
 function toggleConversation(){if(catchTravel())return;if(open)panel(false);else void openConversation();}
 $('.yuki-translate').onclick=()=>translateConversation();
 $('.yuki-launcher').onclick=()=>callYuki();$('.yuki-close').onclick=()=>panel(false);$('.yuki-hit').onclick=toggleConversation;
 $('.yuki-menu').onclick=()=>{const more=$('.yuki-more');more.hidden=!more.hidden;$('.yuki-menu').setAttribute('aria-expanded',String(!more.hidden));placeBubble();};
 $('textarea').oninput=()=>{const field=$('textarea');field.style.height='42px';field.style.height=Math.min(90,field.scrollHeight)+'px';placeBubble();};
 $('textarea').onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();$('.yuki-form').requestSubmit();}};
 new ResizeObserver(()=>placeBubble()).observe($('.yuki-panel-inner'));
 root.addEventListener('keydown',e=>{if(e.key==='Escape'&&open){e.preventDefault();panel(false);}});
 const images=new Map(),loaded=new Map(),used=new Map(),pixelBounds=new WeakMap();
 const boundsCanvas=document.createElement('canvas'),boundsContext=boundsCanvas.getContext('2d',{willReadFrequently:true});
 function artworkBounds(im){
  if(pixelBounds.has(im))return pixelBounds.get(im);
  boundsCanvas.width=im.naturalWidth;boundsCanvas.height=im.naturalHeight;boundsContext.drawImage(im,0,0);
  const {width:w,height:h}=boundsCanvas,data=boundsContext.getImageData(0,0,w,h).data;
  let left=w,top=h,right=0,bottom=0;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(data[(y*w+x)*4+3]){left=Math.min(left,x);right=Math.max(right,x+1);top=Math.min(top,y);bottom=Math.max(bottom,y+1);}
  const bounds=[left,top,right,bottom];pixelBounds.set(im,bounds);return bounds;
 }
 async function ensure(keys){
  loading++;
  try{await Promise.all([...new Set(keys)].map(key=>{used.set(key,performance.now());if(loaded.has(key))return loaded.get(key);const info=clips[key];if(!info)throw Error('Missing clip');
   const promise=(async()=>{for(let i=0;i<info.frames.length;i+=4)await Promise.all(info.frames.slice(i,i+4).map(async f=>{let p=images.get(f.file);if(!p){p=(async()=>{const im=new Image();im.src=new URL(f.file,assets).href;await im.decode();return im;})();images.set(f.file,p);p.catch(()=>images.delete(f.file));}f.image=await p;f.pixelBounds=artworkBounds(f.image);}));})();
   loaded.set(key,promise);promise.catch(()=>loaded.delete(key));return promise;}));}
  finally{loading--;}
 }
 const travel=['rest','takeoff','landing','flight','flightHover','flightLeft','flightRight','pointLeft','pointRight','attention'];
 async function prepareTravel(){await ensure([...travel,'wake','bedtime','crash']);companion.lifecycle.crashChance=.08;companion.lifecycle.inactivityMs=gardenScene?Infinity:90000;if(motion)motion.prepared=true;}
 async function wake(){if(!ready||!resident)return;try{await ensure(['wake','bedtime']);companion.lifecycle.inactivityMs=gardenScene?Infinity:90000;companion.lifecycle.wake();companion.lifecycle.activity();save();}catch{status(tr('Some animation artwork could not load. Please try again.','アニメーションを読み込めませんでした。もう一度お試しください。'));}}
 const elements=Object.entries(paths).map(([id,path])=>({id,name:names[id],el:document.querySelector(id==='garden'?'#garden-lookout':id==='projects'?'#projects, .fp-project-list':id==='essays'?'#essays, .fp-essay-list':id==='unreal'?'#unreal-journey, .fp-timeline':'.fp-resume-head')})).filter(d=>d.el);
 function measure(){
  layout=viewportLayout();bodyHeight=garden?garden.height:layout.bodyHeight;
  measureHeader();
  obstacles=obstacleReader.read(layout.width,layout.height);
  const p=[{id:'home',...layout.home},{id:'nearby',...layout.alternate}];
  placeBubble();return p;
 }
 function poseExtent(p){
  const b=p.frame.pixelBounds??[0,0,p.info.width,p.info.height];
  return {left:(b[0]-p.info.width/2)*p.scale-5,right:(b[2]-p.info.width/2)*p.scale+5,top:(b[1]-p.anchor)*p.scale-8,bottom:(b[3]-p.anchor)*p.scale+5};
 }
 function restingExtent(){
  // Room for head, paws, tail and subtle idle breathing, not just the torso.
  const extent={left:-bodyHeight*.63,right:bodyHeight*.63,top:-bodyHeight*1.05,bottom:8};
  if(companion){const p=projectFrame(companion,clips,bodyHeight),e=poseExtent(p);for(const k of ['left','top'])extent[k]=Math.min(extent[k],e[k]);for(const k of ['right','bottom'])extent[k]=Math.max(extent[k],e[k]);}
  return extent;
 }
 function upsert(point){const r=companion.rover,i=r.points.findIndex(p=>p.id===point.id);if(i<0)r.points.push(point);else r.points[i]=point;}
 function placeBubble(){if(!open)return;const panel=$('.yuki-panel'),vv=window.visualViewport;
  panel.hidden=!resident||!onScreen||hidden;if(panel.hidden)return;
  const viewTop=vv?.offsetTop??0,offset=Math.max(viewTop,headerBottom),height=Math.max(100,(vv?.height??innerHeight)-(offset-viewTop));
  panel.style.setProperty('--yuki-bubble-max',bubbleHeightLimit(shownFoot,{...layout,height},offset)+'px');
  const pos=bubblePlacement(shownFoot,{...layout,height},panel.offsetWidth,panel.offsetHeight,offset);
  Object.assign(panel.style,{left:pos.left+'px',top:pos.top+'px'});panel.style.setProperty('--yuki-tail',pos.tail+'px');panel.dataset.below=String(pos.below);
 }
 function chooseLandingSpot(){
  const buttonBox=$('.yuki-launcher').getBoundingClientRect();
  const avoid=buttonBox.width?[...obstacles,buttonBox]:obstacles;
  return callPerches.choose(restingExtent(),avoid,layout,shownFoot);
 }
 function chooseMovementTarget(){
  if(garden&&!journey.active)return garden.point(['pond','lookout','books','treasures'][Math.floor(Math.random()*4)]);
  const target=chooseLandingSpot();
  return {...target,y:target.y+scrollY};
 }
 async function callYuki({keepJourney=false,destinationPoint=null}={}){
  // A reload during guided arrival resumes the existing timed entrance.
  if(keepJourney&&calling&&portalTrip?.kind==='incoming')return new Promise(resolve=>{const done=portalTrip.resolve;portalTrip.resolve=()=>{done?.();resolve();};});
  if(garden&&resident&&!journey.active&&!portalTrip)return garden.action('fly');
  if(!ready||calling||callLoading)return;const button=$('.yuki-launcher');callLoading=true;button.disabled=true;
  if(!keepJourney)stopJourney();
  try{await prepareTravel();hidden=false;paused=false;portalAfterglow=null;portal.hidden=true;guide.reset();guideTarget=null;highlightUntil=0;
   if(!resident){
    const origin={...presence.state},target=destinationPoint??(garden?garden.point(garden.selected):chooseMovementTarget());
    calling=true;sync();
    const timing=summonTiming(origin,clips,{reduced:media.matches});
    status(tr('Coming! Let me fly over from my little spot. Watch for a little dragon sparkle!','今いる場所から飛んでいくね！ドラゴンのきらきらを目印に待ってて！'));
    const destination={page:locationPage(location.pathname,base),title:readPageTitle(document,{path:location.pathname,base,title:root.dataset.pageTitle,lang:ja?'ja':'en'}),garden:Boolean(garden),spot:garden?.selected??null,position:locationMap(target)};
    const end=portalPoint(),arrivalMs=callFlightDuration(end,target)+landingMs.reduce((a,b)=>a+b,0)+1000;
    const transfer=presence.beginTransfer(destination,timing,arrivalMs);
    await new Promise(resolve=>{portalTrip={kind:'incoming',phase:'waiting',age:0,wait:timing.total,timing,target,resolve,origin,transfer};});return;
   }
   await wake();sync();
   const spot=chooseLandingSpot(),target={...spot,y:spot.y+scrollY};
   calling=true;motion.travel(target,{duration:callFlightDuration(companion.rover.foot,target)});
   status(tr('Coming! Just a little flap…','いま行くね！ぱたぱたっ…'));
  }catch{calling=false;status(tr('I couldn’t load my flight. Please try again.','飛ぶ準備ができなかったの。もう一度呼んでね。'));}finally{callLoading=false;button.disabled=calling;}
 }
 function sync(){measure();if(gardenScene){document.body.dataset.gardenPaused=String(paused);gardenScene.dataset.paused=String(paused);if(garden){garden.paused=paused;garden.reduced=media.matches;}const b=document.querySelector('[data-garden-action="motion"]');if(b){b.setAttribute('aria-pressed',String(paused));b.textContent=paused?tr('Resume Garden','庭の動きを再開'):tr('Pause Garden','庭の動きを止める');}}if(companion){companion.rover.hidden=hidden||!resident;companion.rover.playing=!paused;companion.setLessMotion(media.matches);}settingLabels();save();render();}

 function locationMap(p,inverse=false){
  if(gardenScene&&!journey.active){const b=gardenScene.getBoundingClientRect();return inverse?{x:b.left+p.x*b.width,y:b.top+scrollY+p.y*b.height}:{x:(p.x-b.left)/b.width,y:(p.y-b.top-scrollY)/b.height};}
  return inverse?{x:p.x*layout.width,y:p.y}:{x:p.x/layout.width,y:p.y};
 }
 function rememberLocation(){
  if(!ready||!companion||!resident||portalTrip?.phase==='waiting')return;
  const c=companion,r=c.rover,statusName=portalTrip?.kind==='returning'?'returning':c.lifecycle.locked?c.lifecycle.state:r.isHovering?'hover':r.graph.state;
  const a=headerAnchor(portalSection(locationPage(location.pathname,base)))?.getBoundingClientRect();
  const departureDistance=a?Math.hypot(r.foot.x-(a.left+a.width/2),r.foot.y-(a.bottom+scrollY)):500;
  presence.record({page:location.pathname,title:readPageTitle(document,{path:location.pathname,base,title:root.dataset.pageTitle,lang:ja?'ja':'en'}),garden:Boolean(garden&&!journey.active),spot:garden?.spotAt(r.position),position:locationMap(r.position),status:statusName,pose:capturePose(c,p=>locationMap(p)),departureDistance});
 }
 const portal=document.createElement('div');portal.className='yuki-magic';portal.setAttribute('aria-hidden','true');portal.hidden=true;
 const seal=document.createElement('img');seal.src=new URL('home/dragon-magic.svg',assets).href;seal.alt='';portal.append(seal);
 for(let n=0;n<12;n++){const spark=document.createElement('i');spark.style.setProperty('--n',n);spark.style.setProperty('--drift',(n%2?-1:1)*(18+(n*17)%42)+'px');portal.append(spark);}document.body.append(portal);
 function headerAnchor(section){return [...document.querySelectorAll('.fp-nav a[href]')].find(a=>locationPage(new URL(a.href,location.href).pathname,base)===section)??document.querySelector('.fp-brand');}
 function portalPoint(fixedSection){
  const section=fixedSection??travelPortalSection(portalTrip,presence.state.page);
  const anchor=headerAnchor(section);
  const nav=anchor?.closest('nav');if(nav){const n=nav.getBoundingClientRect(),a=anchor.getBoundingClientRect();if(a.left<n.left||a.right>n.right)nav.scrollLeft+=a.left-(n.left+(n.width-a.width)/2);}
  const b=anchor?.getBoundingClientRect();portal.dataset.source=section;
  const x=Math.max(45,Math.min(layout.width-45,b?b.left+b.width/2:layout.width/2)),y=Math.max(12,b?.bottom??headerBottom);
  Object.assign(portal.style,{left:x+'px',top:y+'px'});return {x,y:y+bodyHeight*.30+scrollY};
 }
 function placeAt(point,{flying=false}={}){
  const c=companion,r=c.rover;c.lifecycle.neutralize();c.idle?.reset();c.lifecycle.enter('awake');r.graph.reset();r.route=null;
  r.points=[{id:'portal-start',...point}];r.at=r.wanted='portal-start';r.position={...point};
  if(flying&&!media.matches){r.graph.enter('flight',6);r.graph.desired='flight';r.position.y+=48;}
 }
 function replayTravel(ms){for(let remaining=Math.min(30000,Math.max(0,ms));remaining>0;remaining-=100)companion.update(Math.min(100,remaining));}
 function continueTransfer(){
  const step=presence.transit();if(!step){resident=presence.here(location.pathname);if(resident){placeAt(locationMap(presence.state.position,true));companion.lifecycle.enter(presence.state.status==='sleep'?'sleep':'awake');}return false;}const t=step.transfer,current=locationPage(location.pathname,base);
  portal.hidden=true;portalAfterglow=null;portalTrip=null;calling=false;resident=presence.here(location.pathname);
  if(step.leg==='departing'&&current===t.origin.page){
   if(!restorePose(companion,t.origin.pose,clips,p=>locationMap(p,true))){placeAt(locationMap(t.origin.position,true));companion.lifecycle.enter(t.origin.status==='sleep'?'sleep':'awake');}
   companion.rover.hidden=false;companion.lifecycle.neutralize();companion.idle?.reset();companion.lifecycle.wake();companion.lifecycle.crashChance=0;
   portalTrip={kind:'departing',phase:'flying',age:step.age,origin:t.origin,transfer:t};calling=true;
   motion.travel(portalPoint(),{duration:t.timing.flight});replayTravel(step.age);return true;
  }
  if(current!==t.target.page)return true;
  const target=locationMap(t.target.position,true);calling=true;
  portalTrip={kind:'incoming',phase:step.leg==='departing'?'waiting':'flying',age:step.age,wait:t.timing.total,timing:t.timing,target,origin:t.origin,transfer:t};
  if(step.leg==='incoming'){resident=true;companion.rover.hidden=false;placeAt(portalPoint(),{flying:true});motion.travel(target,{duration:callFlightDuration(companion.rover.foot,target)});replayTravel(step.age);}
  return true;
 }
 function catchTravel(){
  if(!ready||!resident||(!portalTrip&&(companion.rover.isHovering||companion.rover.graph.state==='rest'&&companion.rover.at===companion.rover.wanted)))return false;
  const trip=portalTrip;portalTrip=null;portalAfterglow=null;portal.hidden=true;calling=false;callLoading=false;
  presence.cancelTransfer();garden?.cancel();stopJourney();pendingCue=null;reactionVersion++;catchInFlight(companion);motion.defer();
  rememberLocation();trip?.resolve?.();status(tr('Oh! You caught me. I’ll stay right here with you.','あっ、呼び止めてくれたんだね！ここで一緒にいるよ。'));render();return true;
 }
 async function returnToGarden(){
  if(portalTrip||!resident||garden||open||busy||journey.active)return;
  portalAfterglow=null;portal.hidden=true;portalTrip={kind:'returning',phase:'preparing',age:0};calling=true;
  try{await prepareTravel();await wake();companion.lifecycle.crashChance=0;pendingCue=null;reactionVersion++;guide.reset();guideTarget=null;
   const end=portalPoint();motion.travel(end,{duration:callFlightDuration(companion.rover.foot,end)});portalTrip.phase='flying';rememberLocation();
  }catch{portalTrip=null;calling=false;}
 }
 function showExitSeal(){
  // The drawing is gone before the signature appears. Keep a separate visual
  // afterglow so completing the journey cannot hide the seal immediately.
  $('.yuki-pet').hidden=true;$('.yuki-hit').hidden=true;
  portalAfterglow={section:portal.dataset.source,age:0};portal.hidden=media.matches;
 }
 function updatePortal(dt){
  if(paused||hidden){portal.hidden=true;return;}
  if(portalAfterglow){portalAfterglow.age+=dt;portalPoint(portalAfterglow.section);portal.hidden=media.matches||portalAfterglow.age>=2400;if(portalAfterglow.age>=2400)portalAfterglow=null;}
  if(!portalTrip)return;const trip=portalTrip,r=companion.rover;
  trip.age=trip.transfer?Math.max(0,Date.now()-trip.transfer.startedAt-(trip.phase==='flying'&&trip.kind==='incoming'?trip.transfer.timing.total:0)):trip.age+dt;
  if(trip.kind==='departing'){
   portalPoint();portal.hidden=true;
   if(trip.age>=trip.transfer.timing.total){presence.transit();resident=false;r.hidden=true;showExitSeal();portalTrip=null;calling=false;}
   return;
  }
  if(trip.phase==='waiting'&&trip.age>=trip.wait){
   resident=true;companion.rover.hidden=false;placeAt(portalPoint(),{flying:true});trip.phase='flying';trip.age=0;portal.hidden=media.matches;
   motion.travel(trip.target,{duration:callFlightDuration(r.foot,trip.target)});rememberLocation();
  }
  if(trip.phase!=='flying')return;
  const end=trip.kind==='returning'?portalPoint():trip.target;
  // The header is sticky. Keep the exit attached when a visitor scrolls.
  if(trip.kind==='returning'){const p=r.point(r.wanted);if(Math.hypot(p.x-end.x,p.y-end.y)>3){p.x=end.x;p.y=end.y;if(r.graph.state==='flight')r.beginRoute();}portal.hidden=true;}
  else {portalPoint();portal.hidden=media.matches||trip.age>2400;}
  const settled=r.graph.state==='rest'&&r.at===r.wanted&&!companion.lifecycle.locked;
  const entered=trip.kind==='returning'&&(settled||Math.hypot(r.foot.x-end.x,r.foot.y-end.y)<20);
  if(entered){presence.home();resident=false;r.hidden=true;showExitSeal();portalTrip=null;calling=false;}
  else if(trip.kind==='incoming'&&settled){portal.hidden=true;portalTrip=null;calling=false;presence.cancelTransfer();companion.lifecycle.activity();rememberLocation();trip.resolve?.();status(tr('There you are! A little dragon magic… and lots of flapping!','見つけた！ドラゴンの魔法をちょっぴりと、たくさんのぱたぱたで到着！'));}
 }

 const sections=[...document.querySelectorAll('main [data-yuki-section]:not(h1), .fp-resume-grid h2, .fp-build-card h2, .fp-build-guide > h2, [data-yuki-interest]')].map((el,i)=>({id:'interest-'+i,name:(el.getAttribute('alt')||el.textContent).trim(),el}));
 const categoryUrls=new Set(Object.values(paths).map(path=>base+(ja?'/ja':'')+path));
 function destinationList(){
  const q=$('.yuki-search').value.trim().toLocaleLowerCase(),list=$('.yuki-destinations');list.replaceChildren();
  const items=[...sections.map(s=>({title:s.name,local:true,action:()=>showElement(s)})),...localizedPages(knowledge,ja?'ja':'en',base).filter(p=>!categoryUrls.has(p.url.split('#')[0])).map(p=>{const el=findPageTarget(document,p.url,location.pathname),entry=knowledge.find(k=>k.url===p.url);return {...p,summary:entry?.summary,featured:Boolean(el?.closest('article.fp-feature')),local:Boolean(el?.closest('article:not(.fp-project-reader)')),action:()=>visit(p.url,p.title)};})];
  for(const item of curateDestinations(items,q,location.pathname)){const b=document.createElement('button');b.textContent=item.title;b.onclick=item.action;list.append(b);}
  if(!list.childElementCount)list.textContent=tr('No matching page or section.','一致するページ・項目がありません。');
 }
 $('.yuki-search').oninput=destinationList;destinationList();
 knowledgeReady=fetch(new URL('knowledge.json',assets)).then(r=>r.ok?r.json():Promise.reject()).then(k=>{knowledge=Array.isArray(k.pages)?k.pages:[];destinationList();if(open)updateReading();return knowledge;}).catch(()=>[]);
 async function visit(path,title){
  await knowledgeReady;
  const target=checkedGuideTarget(path,knowledge,ja?'ja':'en',base);if(target){await beginJourney(target);return;}
  status(tr('I couldn’t confirm that destination in the published page map. Please choose a listed page.','公開ページの地図で行き先を確認できなかったの。一覧から選んでね。'));
 }
 async function showElement(d){
  if(!ready)return;if(d.journeySerial===undefined)stopJourney();status(tr('I’ll show you…','ご案内します…'));
  for(let parent=d.el.parentElement;parent;parent=parent.parentElement)if(parent.tagName==='DETAILS')parent.open=true;
  try{if(!resident||portalTrip?.kind==='incoming'){
    // The normal summon entrance uses her true previous page's header tab.
    // Fly straight to the guided perch, not a random stop followed by a hop.
    d.el.scrollIntoView({block:'center',inline:'nearest',behavior:'instant'});measure();
    const spot=guideSpot(targetRect(d.el),restingExtent(),obstacleReader.read(layout.width,layout.height),layout,bodyHeight);
    await callYuki({keepJourney:d.journeySerial!==undefined,destinationPoint:{...spot,y:spot.y+scrollY}});
   }await prepareTravel();await wake();
   if(d.journeySerial!==undefined&&d.journeySerial!==journeySerial)return;
   paused=false;hidden=false;sync();
   calling=false;reactionVersion++;pendingCue=null;guide.destinations.set(d.id,d);panel(false,{restoreFocus:false});document.activeElement?.blur();guide.request(d.id);
  }catch{if(d.journeySerial!==undefined&&d.journeySerial!==journeySerial)return;d.el.scrollIntoView({block:'center'});readingMemory.set(guideReference(d.el,location.pathname,d.url));if(d.journeySerial!==undefined){clearRouteMarker();markedTarget=d.el;markedTarget.classList.add('yuki-route-target');journeyArrived(d);}if(open)updateReading();status(tr('The item is highlighted; my flight could not load. You can still click the link.','こちらの項目を光らせたよ。飛行画像は読み込めなかったけれど、リンクはクリックできるよ。'));}
 }
 function revealTarget(id){
  const d=guide.destinations.get(id);if(!d?.el?.isConnected)return;
  if(markedTarget)markedTarget.classList.remove('yuki-route-target');markedTarget=null;
  if(d.journeySerial!==undefined){markedTarget=d.el;markedTarget.classList.add('yuki-route-target');}
  const card=d.el.closest('.fp-feature');if(card)card.dispatchEvent(new CustomEvent('yuki:reveal-card',{bubbles:true}));
  guideScrollUntil=performance.now()+400;
  d.el.scrollIntoView({block:'center',inline:'nearest',behavior:'instant'});
  const rect=targetRect(d.el);guideTarget=d;highlightUntil=Infinity;
  obstacles=obstacleReader.read(layout.width,layout.height);
  const target=guideSpot(rect,restingExtent(),obstacles,layout,bodyHeight);
  const r=companion.rover;prepareCall(r,restingExtent(),layout,scrollY);upsert({id,...target,y:target.y+scrollY,autonomous:false});r.setArrivalStyle('land');
 }
 function drawPointer(){
  const svg=$('.yuki-guide-line'),ring=$('.yuki-target-ring'),el=guideTarget?.el;
  const show=!hidden&&(!open||guideTarget?.journeySerial!==undefined)&&el?.isConnected&&performance.now()<highlightUntil;
  root.dataset.guiding=String(Boolean(show));svg.hidden=!show;ring.hidden=!show;if(!show)return;
  const rect=targetRect(el);if(rect.bottom<0||rect.top>layout.readingHeight||rect.right<0||rect.left>layout.readingWidth){svg.hidden=ring.hidden=true;return;}
  const start={x:shownFoot.x,y:shownFoot.y-bodyHeight*.52},end=pointerTarget(rect,start);
  const steps=Math.max(1,Math.ceil(Math.hypot(end.x-start.x,end.y-start.y)/4));
  // Hide the leader if its straight route crosses other writing. The outline
  // still identifies the exact requested element without drawing over words.
  for(let i=1;i<steps;i++){const x=start.x+(end.x-start.x)*i/steps,y=start.y+(end.y-start.y)*i/steps;
   if(obstacles.some(r=>!(r.left<=rect.left&&r.right>=rect.right&&r.top<=rect.top&&r.bottom>=rect.bottom)&&x>r.left-2&&x<r.right+2&&y>r.top-2&&y<r.bottom+2)){svg.hidden=true;break;}}
  svg.querySelector('path').setAttribute('d',`M ${start.x} ${start.y} L ${end.x} ${end.y}`);
  svg.querySelector('circle').setAttribute('cx',end.x);svg.querySelector('circle').setAttribute('cy',end.y);
  Object.assign(ring.style,{left:rect.left-4+'px',top:rect.top-4+'px',width:rect.width+8+'px',height:rect.height+8+'px'});
 }
 function clearConversation(){
  stopJourney();controller?.abort();verification.stop();reactionVersion++;pendingCue=null;
  // Clear the transcript, not recall, reading context, repetition memory or pass.
  // Aborted requests cannot put a late answer/translation back into the bubble.
  messages=[];translationFailed=false;updateReading();drawMessages();
  showMoment('clear');$('.yuki-more').hidden=true;$('.yuki-menu').setAttribute('aria-expanded','false');
  $('.yuki-panel-inner').scrollTop=0;$('textarea').focus({preventScroll:true});
  status(tr('Chat cleared. Conversation memory kept.','チャットを消去しました。会話の記憶は保持しています。'));save();
 }
 for(const b of root.querySelectorAll('[data-action]'))b.onclick=async()=>{const a=b.dataset.action;if(a==='clear')clearConversation();
  if(a==='hide'){hidden=!hidden;if(hidden){stopJourney();calling=false;controller?.abort();reactionVersion++;pendingCue=null;panel(false);}}if(a==='pause')paused=!paused;
  if(a==='roam'&&ready){b.disabled=true;try{await prepareTravel();roam=!roam;motion.defer();}catch{status(tr('Flight artwork is unavailable. Please retry.','飛行アニメーションを読み込めませんでした。'));}finally{b.disabled=false;}}
  sync();};
 function clearRouteMarker(){markedTarget?.classList.remove('yuki-route-target');markedTarget=null;}
 function stopJourney(){if(controller?.guideEvent)controller.abort();journeySerial++;journey.clear();journeyStep=null;guideChoices=[];clearRouteMarker();guide?.reset();guideTarget=null;highlightUntil=0;}
 function cancelJourney(){stopJourney();addMessage('assistant',tr('Okay! Little map tucked away. What caught your eye here?','はーい、小さな地図をしまうね。ここでは何が気になった？'));status(tr('Explore at your own pace.','好きなペースで見てみよう！'));}
 function routeOptions(targets){
  guideChoices=targets.filter(Boolean).slice(0,4);
  const titles=guideChoices.map((t,i)=>`${i+1}. ${ja?'「'+t.title+'」':t.title}`).join('\n');
  addMessage('assistant',tr('Which place shall we explore? Tell me its name or number, and I’ll lead the way.','どこへ行こうか？名前か番号を教えてくれたら、そのまま案内するよ。')+'\n'+titles);
 }
 async function beginJourney(target){
  const checked=checkedGuideTarget(target?.url,knowledge,ja?'ja':'en',base);if(!checked)return;
  stopJourney();journey.start(checked.url,location.pathname);await leadJourney();
 }
 async function leadJourney(){
  if(!journey.active||!ready)return;
  const target=checkedGuideTarget(journey.state.target,knowledge,ja?'ja':'en',base);
  const step=planGuideStep(target,location.pathname,knowledge,{lang:ja?'ja':'en',base});
  if(!step){stopJourney();return;}
  const el=findGuideElement(document,step);
  if(!el){panel(true);addMessage('assistant',tr('I found the page in my map, but not its clickable link here. I won’t point at the wrong thing. You can open the exact page below.','地図にはあるけれど、このページに案内できるリンクが見つからないの。違うところは指さないよ。下のリンクから正しいページを開けるよ。'));
   const a=document.createElement('a');a.href=target.url;a.textContent=target.title;$('.yuki-speech').lastElementChild.append(a);return;}
  if(garden&&gardenScene.contains(el)){
   const b=gardenScene.getBoundingClientRect(),r=el.getBoundingClientRect();
   garden.camera.revealPoint({x:((r.left+r.right)/2-b.left)/b.width,y:((r.top+r.bottom)/2-b.top)/b.height});gardenRect=null;
  }
  journeyStep=step;journey.expect(step.kind==='arrive'?target.url:step.url,location.pathname);
  await showElement({id:'journey-'+journeySerial+'-'+step.kind,name:step.title,el,url:step.url,journeySerial});
 }
 function journeyArrived(d){
  if(!journey.active||d.journeySerial!==journeySerial||!journeyStep)return;
  const step=journeyStep;
  panel(true);void speakGuideFollowup(step);
  status(tr('Guided route · click the highlighted link yourself.','道案内中・光っているリンクをクリックしてね。'));
  highlightUntil=Infinity;
  if(step.kind==='arrive'){
   journey.clear();status(tr(`Arrived · ${step.title}`,`到着・「${step.title}」`));
  }
 }
 async function resumeJourney(){
  if(!journey.active)return;
  const target=checkedGuideTarget(journey.state.target,knowledge,ja?'ja':'en',base);
  if(!target){stopJourney();return;}
  const result=journey.enter(location.pathname,base);
  if(result==='detour'){
   if(!resident)await callYuki({keepJourney:true});
   panel(true);void speakGuideFollowup({...target,kind:'detour'});
   return;
  }
  await leadJourney();
 }
 function speakGuideFollowup(step){
  const fallback=()=>addMessage('assistant',guideDialogue.copy(step,{lang:ja?'ja':'en',detour:step.kind==='detour'}));
  if(!online||!permission.allowed||busy){fallback();return;}
  return runChat(tr('Offer a contextual follow-up for this guided stop.','この案内地点に合った続きの質問をしてください。'),{kind:step.kind,url:step.url,targetUrl:step.target?.url??step.url},fallback);
 }
 let reactionVersion=0;
 let talkTurn=0;
 async function react(cue,{firstMeeting=false,thinking=false}={}){const version=++reactionVersion;pendingCue=null;
  const fallback=thinking?[cue]:replySequence(cue,{firstMeeting,talk:talkTurn++%2?'talkExplain':'talkOpen'});
  const sequence=thinking||firstMeeting?fallback:expressionSequence(cue,fallback);
  await ensure(sequence.flatMap(c=>{const key=cueArtwork(c),air=airClips[key];return [key,...(air?[air.key,air.transitionKey??'hoverTransition']:[])];}));
  if(version===reactionVersion)pendingCue={sequence,notBefore:0,expires:performance.now()+120000};
 }
 let verificationScript;
 function loadVerification(){
  if(window.turnstile?.render)return Promise.resolve(window.turnstile);
  if(!verificationScript){
   verificationScript=new Promise((resolve,reject)=>{
    const script=document.createElement('script');script.id='yuki-turnstile-script';script.async=true;script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    const fail=()=>{clearTimeout(timer);script.remove();reject(Error('verification'));};
    const timer=setTimeout(fail,15000);
    script.onload=()=>{clearTimeout(timer);if(window.turnstile?.render)resolve(window.turnstile);else fail();};script.onerror=fail;document.head.append(script);
   });
   verificationScript.catch(()=>{verificationScript=null;});
  }
  return verificationScript;
 }
 const verification=new ChatVerification({load:loadVerification,element:$('.yuki-verification'),siteKey:root.dataset.siteKey,language:ja?'ja':'en',onState:state=>{
  const text={loading:tr('Preparing the security check…','認証の準備中…'),checking:tr('Checking automatically…','自動で認証中…'),interactive:tr('Please complete the security check below.','下の認証を完了してください。'),error:tr('The security check could not connect. Retry, or check your connection or blocker settings.','認証に接続できませんでした。再試行するか、通信・ブロック設定をご確認ください。'),unsupported:tr('This browser could not complete verification. Try an up-to-date browser.','このブラウザーでは認証できませんでした。最新のブラウザーをお試しください。')}[state]??'';
  $('.yuki-verification-status').textContent=text;$('.yuki-retry').hidden=!['error','unsupported'].includes(state);placeBubble();
 }});
 function prepareVerification(){if(online&&permission.allowed&&open&&!document.hidden&&!chatSession.get())verification.start().catch(()=>{});}
 function withdrawPermission(){controller?.abort();verification.stop();reactionVersion++;pendingCue=null;status(tr('AI chat is off. Project guidance still works.','AIチャットをオフにしました。作品案内は引き続き使えます。'));}
 $('.yuki-ai-toggle').onclick=()=>{permission.set(!permission.allowed);permissionUI();if(!permission.allowed){chatSession.clear();withdrawPermission();}else status(tr('I’m ready! What would you like to explore?','準備できたよ！何を見てみようか？'));};
 $('.yuki-retry').onclick=()=>{verification.stop();prepareVerification();};
 searchBox.onchange=()=>{if(!online)return;const remembered=searchPermission.set(searchBox.checked);if(!searchPermission.allowed&&busy)controller?.abort();status(searchPermission.allowed?tr('Optional web search allowed. Yuki only searches when useful.','必要なときだけウェブ検索を使えます。'):tr('Web search is off. Normal AI chat still works.','ウェブ検索はオフです。通常のAIチャットは使えます。'));if(!remembered)status(tr('Your browser could not save this choice; it applies only to this page.','この設定を保存できませんでした。このページ内でのみ有効です。'));};
 $('.yuki-cancel').onclick=()=>{controller?.abort();verification.stop();status(tr('Sending cancelled.','送信をキャンセルしました。'));};
 addEventListener('storage',e=>{if(e.storageArea!==visitorStorage||![chatEnabledKey,searchConsentKey,null].includes(e.key))return;const wasSearch=searchPermission.allowed;permission.reload();searchPermission.reload();permissionUI();if(wasSearch&&!searchPermission.allowed&&busy)controller?.abort();if(!permission.allowed)withdrawPermission();});
 $('.yuki-form').onsubmit=async e=>{
  e.preventDefault();if(busy||!ready)return;const text=$('textarea').value.trim();if(!text)return;
  if((journey.active||journeyStep||guideChoices.length)&&/^(?:stop(?: guiding| leading)?|cancel(?: guide)?|all done|explore here(?: instead)?|案内をやめて|案内を終了|ここを見てみる)[.!。！]?$/i.test(text)){addMessage('user',text);$('textarea').value='';cancelJourney();return;}
  if(journey.active&&(/^(?:continue(?: guiding| leading)?|resume(?: guide)?|point again|案内を続けて|続けて|もう一度指して)[.!。！]?$/i.test(text)||journey.state.paused&&/^(?:yes(?: please)?|sure|はい|うん|お願い)[.!。！]?$/i.test(text))){addMessage('user',text);$('textarea').value='';await leadJourney();return;}
  const chosen=guideChoice(text,guideChoices);guideChoices=[];
  if(chosen){addMessage('user',text);$('textarea').value='';await beginJourney(chosen);return;}
  const requested=resolveGuideRequest(text,knowledge,location.pathname,{lang:ja?'ja':'en',base});
  if(requested?.target){addMessage('user',text);$('textarea').value='';await beginJourney(requested.target);return;}
  if(requested?.choices?.length){addMessage('user',text);$('textarea').value='';routeOptions(requested.choices);return;}
  if(!online||busy){status(offline);if(requested){addMessage('user',text);$('textarea').value='';addMessage('assistant',tr('Which page did you mean? Tell me its project title or section name, and I’ll lead you there.','どのページかな？作品名や項目の名前を教えてくれたら、案内するね。'));}return;}
  if(!permission.allowed){status(tr('AI chat is off. You can turn it on in the menu.','AIチャットはオフです。メニューでオンにできます。'));return;}
  await runChat(text);
 };
 async function runChat(text,guideEvent=null,fallback=()=>{}){
  if(busy||!online||!permission.allowed)return;
  const routeVersion=journeySerial;
  busy=true;translationUI();$('button[type=submit]').disabled=true;$('textarea').readOnly=true;$('.yuki-cancel').hidden=false;
  const context=readingContext();updateReading();
  const requestController=new AbortController();controller=requestController;requestController.guideEvent=guideEvent;let timer,tokenUsed=false,deferredGuide=null;
  const current=()=>!requestController.signal.aborted&&permission.allowed&&(!guideEvent||routeVersion===journeySerial);
  try{
   status(tr('Preparing your message…','メッセージを送る準備中…'));
   const pass=chatSession.get(),token=pass?'':await verification.takeToken(requestController.signal);
   tokenUsed=!pass;
   timer=setTimeout(()=>{status(tr('Yuki took too long to answer. Please try again.','回答が時間内に届きませんでした。もう一度お試しください。'));requestController.abort();},45000);
   await wake();if(requestController.signal.aborted||!permission.allowed)throw Error('cancelled');
   const history=messages.slice(-6).map(m=>({role:m.role,content:m.text}));if(!guideEvent){addMessage('user',text);$('textarea').value='';}
   if(!guideEvent)interests.remember(text);
   status(tr('Yuki is thinking…','ゆきが考えています…'));react({text:'…',emotion:'thoughtful',gesture:'none'},{thinking:true}).catch(()=>{});
   const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:packChatRequest({message:text,history,lang:ja?'ja':'en',page:location.pathname,context,...(pass?{pass}:{token}),variety,memory:conversationMemory.recall(text,history),interests:interests.get(),...(guideEvent?{guideEvent}:{}),webSearch:!guideEvent&&searchPermission.allowed}),signal:requestController.signal,credentials:'omit'});
   const result=await response.json().catch(()=>({}));if(!current())return;
   if(result.chatSession)chatSession.set(result.chatSession);
   if(!response.ok){if(response.status===403)chatSession.clear();throw Object.assign(Error(response.status===429?'limit':response.status===403?'verification':'request'),{reference:result.reference});}
   const cue=validReply(result);
   if(!guideEvent){const followUp=followUpReference(cue,context.lastGuide,knowledge);if(followUp)readingMemory.set(followUp);else readingMemory.clear();conversationMemory.remember(text,cue.text);}
   addMessage('assistant',cue.text,true,cue.sources,cue.storyTopics);
   if(!guideEvent&&isGuideRequest(text)){
    const targets=cue.sources.map(s=>checkedGuideTarget(s.url,knowledge,ja?'ja':'en',base)).filter(Boolean);
    const unique=[...new Map(targets.map(t=>[t.url,t])).values()];
    if(unique.length===1)deferredGuide=unique[0];
    else if(unique.length>1)routeOptions(unique);
    else if(paths[cue.destination])deferredGuide=checkedGuideTarget(base+(ja?'/ja':'')+paths[cue.destination],knowledge,ja?'ja':'en',base);
   }
   status(cue.searchStatus==='limit'?tr('The free search limit was reached; no live web information was verified.','無料検索の上限に達したため、最新のウェブ情報は確認できませんでした。'):cue.searchStatus==='unavailable'?tr('Web lookup was unavailable; no live web information was verified.','ウェブ検索を利用できず、最新の情報は確認できませんでした。'):tr('AI can make mistakes. Check the linked sources.','AIは誤ることがあります。リンク先の出典もご確認ください。'));react(cue).catch(()=>{});
  }catch(error){if(current()&&guideEvent)fallback();if(!requestController.signal.aborted)status(error.message==='cancelled'?tr('Sending cancelled.','送信をキャンセルしました。'):chatUnavailable(error.message,ja?'ja':'en',error.reference));reactionVersion++;pendingCue=null;}
  finally{clearTimeout(timer);busy=false;translationUI();updateReading();$('button[type=submit]').disabled=false;$('textarea').readOnly=false;$('.yuki-cancel').hidden=true;if(chatSession.get())verification.stop();else if(tokenUsed)verification.stop();save();}
  if(deferredGuide&&!requestController.signal.aborted)await beginJourney(deferredGuide);
  if(open&&!requestController.signal.aborted)void translateConversation();
 }
 async function translateConversation(){
  const language=ja?'ja':'en';
  if(busy||!online||!permission.allowed||!translationBatch(messages,language).length)return;
  busy=true;translationFailed=false;translationUI();$('button[type=submit]').disabled=true;$('textarea').readOnly=true;$('.yuki-cancel').hidden=false;
  const requestController=new AbortController();controller=requestController;let timer,tokenUsed=false;
  const current=()=>!requestController.signal.aborted&&permission.allowed;
  try{
   status(tr('Translating our conversation, keeping your original messages…','原文を残したまま、会話を翻訳しています…'));
   // Each bounded batch uses the ordinary protected endpoint and shared quota.
   // No retry loop on errors, no new conversation turns, no change to the draft.
   for(let count=0;count<12;count++){
    const batch=translationBatch(messages,language);if(!batch.length)break;
    const pass=chatSession.get(),token=pass?'':await verification.takeToken(requestController.signal);tokenUsed=tokenUsed||!pass;
    if(!current())return;
    timer=setTimeout(()=>{translationFailed=true;status(tr('Translation took too long. Your conversation is saved; you can try again.','翻訳に時間がかかっています。会話は保存されています。もう一度試せます。'));requestController.abort();},45000);
    const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:packChatRequest({message:'Translate the existing conversation without adding a reply.',history:[],lang:language,page:location.pathname,...(pass?{pass}:{token}),translation:batch,webSearch:false}),signal:requestController.signal,credentials:'omit'});
    const result=await response.json().catch(()=>({}));clearTimeout(timer);if(!current())return;
    if(result.chatSession)chatSession.set(result.chatSession);
    if(!response.ok){if(response.status===403)chatSession.clear();throw Error(response.status===429?'limit':response.status===403?'verification':'translation');}
    const translated=checkedTranslations(result.translations,batch);
    applyTranslations(messages,translated,language);drawMessages();save();
    if(!chatSession.get())verification.stop();
   }
   status(tr('Same conversation, now in English.','同じ会話を日本語で表示しています。'));
  }catch(error){
   if(current()){translationFailed=true;status(error.message==='limit'?tr('The free translation allowance is temporarily full. Your conversation is saved; try again later.','無料利用上限に達しました。会話は保存されています。時間をおいて翻訳を試してください。'):error.message==='verification'?chatUnavailable('verification',language):tr('Translation is temporarily unavailable. Your conversation is saved and hasn’t been cleared.','現在は翻訳を利用できません。会話は保存され、消去されていません。'));}
  }finally{
   clearTimeout(timer);busy=false;translationUI();$('button[type=submit]').disabled=false;$('textarea').readOnly=false;$('.yuki-cancel').hidden=true;if(chatSession.get()||tokenUsed)verification.stop();save();
  }
 }
 function render(){if(!companion)return;const r=companion.rover,life=companion.lifecycle;
  if(garden){
   garden.setPresence(resident&&!hidden&&!portalTrip);
   // Exploration must keep working during summoning and guided flights too.
   // Only automatic tracking pauses; all scene-space route points still move
   // with the camera, including an arrival that has not started yet.
   garden.fitView(resident&&!journey.active&&!portalTrip?r.position:null);
   const rect=gardenScene.getBoundingClientRect(),next={left:rect.left,top:rect.top+scrollY,width:rect.width,height:rect.height};
   if(gardenRect&&['left','top','width','height'].some(k=>Math.abs(next[k]-gardenRect[k])>.000001)){
    const remap=p=>{p.x=next.left+(p.x-gardenRect.left)*next.width/gardenRect.width;p.y=next.top+(p.y-gardenRect.top)*next.height/gardenRect.height;};
    for(const point of new Set([r.position,...r.points,...(r.route?[r.route.start,r.route.end]:[]),...(portalTrip?.target?[portalTrip.target]:[])]))remap(point);bodyHeight=garden.height;
   }gardenRect=next;
  }
  let p=projectFrame(companion,clips,bodyHeight);if(!p.frame?.image)return;
  if(!garden||journey.active)containPageRover(r,restingExtent(),layout);p=pageProjection(projectFrame(companion,clips,bodyHeight),scrollY);
  shownFoot={...p.foot};
  const occupied=atFoot(shownFoot,poseExtent(p)),b=life.bubble;
  if(b){const [nx,ny]=p.frame.nose,rad=(media.matches?12:b.radius)*p.scale;occupied.left=Math.min(occupied.left,p.x+nx*p.scale-1.8*rad);occupied.top=Math.min(occupied.top,p.y+ny*p.scale-.4*rad);occupied.right=Math.max(occupied.right,p.x+nx*p.scale+.2*rad);occupied.bottom=Math.max(occupied.bottom,p.y+ny*p.scale+1.6*rad);}
  clear=fits(occupied,obstacles,layout);
  onScreen=inViewport(occupied,layout)&&occupied.bottom>headerBottom;
  // Content avoidance picks the destination, never toggles frame visibility.
  // Both dimensions use the same scale; no crowd-dependent compression.
  const pet=$('.yuki-pet'),img=pet.querySelector('img'),canvas=pet.querySelector('canvas');pet.hidden=hidden||!resident;if(img.src!==p.frame.image.src)img.src=p.frame.image.src;
  pet.style.opacity=portalTrip?.phase==='flying'&&!media.matches?String(portalTrip.kind==='incoming'?Math.min(1,portalTrip.age/300):Math.min(1,Math.hypot(r.foot.x-portalPoint().x,r.foot.y-portalPoint().y)/65)):'1';
  const breathing=!life.locked&&r.graph.state==='rest'&&!p.isGreeting&&!p.isEmotion&&!p.isAttention&&!media.matches&&companion.idle.amount>0;
  const drawn=breathing&&renderer?.draw(p.frame.image,companion.idle.pose,p.info.width*p.scale);canvas.hidden=!drawn;img.style.visibility=drawn?'hidden':'visible';
  Object.assign(pet.style,{width:p.info.width*p.scale+'px',height:p.info.height*p.scale+'px',transform:`translate3d(${p.x}px,${p.y}px,0)`});
  const box=p.frame.pixelBounds??[210,170,515,615],hit=$('.yuki-hit'),hitTop=Math.max(headerBottom+4,p.y+box[1]*p.scale),hitBottom=Math.min(innerHeight,p.y+box[3]*p.scale);
  hit.hidden=hidden||!resident||hitBottom-hitTop<24||Number(pet.style.opacity)<.5;Object.assign(hit.style,{left:p.x+box[0]*p.scale+'px',top:hitTop+'px',width:(box[2]-box[0])*p.scale+'px',height:Math.max(0,hitBottom-hitTop)+'px'});
  hit.title=tr('Yuki · BETA','ゆき · BETA');
  hit.setAttribute('aria-label',calling||r.graph.state!=='rest'&&!r.isHovering?tr('Stop Yuki here','ここでゆきを呼び止める'):open?tr('Hide chat with Yuki','ゆきとのチャットを隠す'):life.state==='sleep'?tr('Wake Yuki and chat','ゆきを起こして話す'):tr('Chat with Yuki','ゆきと話す'));
  const bubble=$('.yuki-bubble');bubble.hidden=!b||hidden;if(b){const [nx,ny]=p.frame.nose,rad=(media.matches?12:b.radius)*p.scale;Object.assign(bubble.style,{left:nx*p.scale-1.8*rad+'px',top:ny*p.scale-.4*rad+'px',width:2*rad+'px',height:2*rad+'px'});}
  Object.assign(pet.dataset,{state:r.graph.state,lifecycle:life.state,greeting:String(Boolean(p.isGreeting)),breathing:String(Boolean(drawn)),art:p.frame.file,emotion:companion.emotion.kind??'neutral',clear:String(clear),bounds:JSON.stringify(occupied),foot:JSON.stringify(p.foot)});
  const launcher=$('.yuki-launcher');
  const departurePhase=portalTrip?.phase==='waiting'?summonPhase(portalTrip.age,portalTrip.timing):null;
  launcher.textContent=hidden?tr('Show Yuki','ゆきを表示'):portalTrip?.kind==='returning'?tr('Heading Home…','おうちへ帰るよ…'):departurePhase==='waking'?tr('Waking Yuki…','ゆきが起きてるよ…'):departurePhase==='taking-off'?tr('Stretching Her Wings…','羽を広げてるよ…'):calling?tr('Flying over…','そっちに飛んでるよ…'):tr('Call Yuki','ゆきを呼ぶ');launcher.disabled=calling||callLoading;
  launcher.hidden=resident&&open&&onScreen&&!hidden;
  const label=locationLabel(presence.state,ja),note=$('.yuki-location');note.hidden=resident&&!portalTrip;note.textContent=label;launcher.title=label;
  root.dataset.location=presence.state.page;root.dataset.presence=resident?(portalTrip?.kind??'here'):'away';root.dataset.locationState=presence.state.status;root.dataset.travelPhase=departurePhase??portalTrip?.phase??'';
  placeBubble();drawPointer();
 }
 let lastTrim=0;
 function trimArt(){
  if(loading||pendingCue||busy)return;
  const keep=new Set(['rest','sleep','wake','bedtime',companion.emotion.kind]);
  if(companion.greeting.active||companion.greeting.requested)keep.add('greeting');
  if(companion.lifecycle.locked)keep.add(companion.lifecycle.state);
  if(motion?.prepared||guide.active||companion.rover.graph.state!=='rest')for(const k of [...travel,'crash'])keep.add(k);
  if(companion.airReaction){keep.add(companion.airReaction.key);keep.add(companion.airReaction.transitionKey??'hoverTransition');}
  let count=[...loaded.keys()].reduce((n,k)=>n+clips[k].frames.length,0);
  for(const k of [...loaded.keys()].sort((a,b)=>(used.get(a)||0)-(used.get(b)||0))){if(count<=180)break;if(keep.has(k))continue;count-=clips[k].frames.length;loaded.delete(k);for(const f of clips[k].frames)delete f.image;}
  const referenced=new Set(Object.values(clips).flatMap(c=>c.frames.filter(f=>f.image).map(f=>f.file)));
  for(const file of images.keys())if(!referenced.has(file))images.delete(file);
 }
 function tick(t){const dt=Math.min(64,Math.max(0,t-last));last=t;if(companion&&!document.hidden){if(resident&&((open&&onScreen)||busy||journey.active||portalTrip))companion.lifecycle.activity();
   if(t-lastMeasure>200){measureHeader();obstacles=obstacleReader.read(layout.width,layout.height);lastMeasure=t;}
   updatePortal(dt);
   motion.update(dt,{hidden:hidden||!resident,paused,guiding:guide.active||journey.active||Boolean(portalTrip),open,roam,target:chooseMovementTarget,visible:onScreen,reacting:Boolean(pendingCue)});companion.update(dt);if(resident)guide.update();
   if(calling&&!portalTrip&&companion.rover.graph.state==='rest'&&companion.rover.at===companion.rover.wanted&&!companion.lifecycle.locked){calling=false;status(tr('Here I am! Phew, little wings.','着いたよ！ふぅ、小さな羽、がんばった。'));}
   if(pendingCue&&performance.now()>pendingCue.expires)pendingCue=null;
   if(pendingCue&&resident&&!portalTrip&&onScreen&&t>=pendingCue.notBefore){const cue=pendingCue.sequence[0];
    if(media.matches){if(cue.firstMeeting)personality.markMet();pendingCue=null;}
    else if(applyReplyCue(companion,cue).animationAccepted){if(cue.firstMeeting)personality.markMet();pendingCue.notBefore=t+(cue.pauseMs??0);pendingCue.sequence.shift();if(!pendingCue.sequence.length)pendingCue=null;}
   }
   garden?.update(dt,{settled:companion.rover.graph.state==='rest'&&companion.rover.at===companion.rover.wanted&&!companion.emotion.active&&!companion.greeting.active,hovering:companion.rover.isHovering&&companion.rover.hoverClock>600,locked:companion.lifecycle.locked,open,busy,hidden:hidden||!resident||!onScreen||paused||Boolean(portalTrip),guiding:guide.active||journey.active});
   if(t-lastLocationSave>750){rememberLocation();if(!resident&&!portalTrip){presence.transit();presence.settleAway(location.pathname);}lastLocationSave=t;}
   if(resident&&!paused&&!hidden&&!portalTrip&&presence.shouldReturn)void returnToGarden();
   render();if(t-lastTrim>5000){trimArt();lastTrim=t;}}requestAnimationFrame(tick);}
 try{
  const res=await fetch(new URL('manifest.json',assets));if(!res.ok)throw Error('manifest');({clips}=await res.json());await ensure(['sleep','rest']);
  await knowledgeReady;if(journey.active&&!checkedGuideTarget(journey.state.target,knowledge,ja?'ja':'en',base))journey.clear();
  const timing={rest:clips.rest.frames.map(f=>f.durationMs),flight:clips.flight.frames.map(f=>f.durationMs??60),takeoff:takeoffMs,landing:landingMs};
  resident=presence.here(location.pathname);
  companion=new Companion(timing,measure(),{motion:contactPhases,idle:{},lifecycle:{clips,startAsleep:Boolean(presence.state.status==='sleep'&&!journey.active),inactivityMs:Infinity,crashChance:0,crashCooldownRemainingMs:flopRemaining(),onCrash:rememberFlop},greeting:clips.greeting.playback,emotions:{...emotionPlayback(clips),pointLeft:clips.pointLeft.playback,pointRight:clips.pointRight.playback},airClips});
  motion=new PageMotion(companion);
  if(gardenScene){garden=new GardenHome(gardenScene,{
   prepare:async()=>{stopJourney();if(open)panel(false,{restoreFocus:false});pendingCue=null;reactionVersion++;if(!resident)await callYuki();await prepareTravel();await wake();hidden=false;paused=false;sync();},
   travel:(point,options)=>motion.travel(point,options),land:()=>companion.rover.setArrivalStyle('land'),point:kind=>companion.express(kind),react:cue=>react(cue).catch(()=>{}),sleep:()=>{if(media.matches){companion.lifecycle.neutralize();companion.lifecycle.enter('sleep');}else companion.lifecycle.requestSleep();},
   pause:value=>{paused=value;sync();},chat:async prompt=>{await openConversation();if(prompt){if($('textarea').value.trim()){status(tr('Your draft is still here. Send or clear it before choosing a new question.','入力中の文章は残してあるよ。新しい質問の前に送るか消してね。'));return;}$('textarea').value=prompt;$('textarea').focus({preventScroll:true});}}
  },{ja,reduced:media.matches,storage:readingStorage});if(presence.state.garden&&presence.state.spot){garden.story(presence.state.spot);garden.remark();}measure();}
  companion.rover.setArrivalStyle('land');try{renderer=new IdleRenderer($('.yuki-pet canvas'));}catch{}
  guide=new SiteGuide(companion,{destinations:elements,reveal:revealTarget,direction:id=>{const d=guide.destinations.get(id);return pointerTarget(targetRect(d.el),shownFoot).kind;},arrive:id=>{const d=guide.destinations.get(id);readingMemory.set(guideReference(d.el,location.pathname,d.url));if(open)updateReading();highlightUntil=performance.now()+10000;motion.defer();status(tr(`Ta-da! Here’s ${d.name}.`,`じゃーん！${d.name}だよ。`));if(d.journeySerial!==undefined)journeyArrived(d);}});
  obstacles=obstacleReader.read(layout.width,layout.height);
  const carriedPosition=resident?journey.position(layout):null;
  const gp=resident&&presence.here(location.pathname)?locationMap(presence.state.position,true):garden?.point('nest');const initial=carriedPosition?clampFoot(carriedPosition,restingExtent(),layout):gp?{x:gp.x,y:gp.y-scrollY}:visibleSpot(restingExtent(),obstacles,layout,layout.home);
  companion.rover.position={...initial,y:initial.y+scrollY};upsert({id:'home',...initial,y:initial.y+scrollY});
  if(resident&&presence.here(location.pathname)&&presence.state.pose&&!journey.active){await ensure(poseArtwork(presence.state.pose,clips));restorePose(companion,presence.state.pose,clips,p=>locationMap(p,true));if(garden){garden.floating=companion.rover.arrivalStyle==='hover';const dest=garden.spotAt(companion.rover.point(companion.rover.wanted));if(dest)garden.story(dest);}}
  if(presence.transfer){await ensure([...travel,'wake','bedtime','crash',...poseArtwork(presence.transfer.origin.pose,clips)]);continueTransfer();}
  else if(resident&&presence.state.status==='returning'&&!garden){portalTrip={kind:'returning',phase:'flying',age:0};calling=true;}
  else if(garden&&resident&&companion.rover.wanted!==companion.rover.at){const id=garden.spotAt(companion.rover.point(companion.rover.wanted));if(id)garden.pending={id,sleep:id==='nest',hover:companion.rover.arrivalStyle==='hover'};}
  ready=true;sync();last=performance.now();requestAnimationFrame(tick);
  if(resident&&shouldWelcomeOnRefresh(performance.getEntriesByType('navigation')[0]?.type,saved,journey.active))showMoment('refresh',{reveal:saved.chatOpen===true});
  if(open||journey.active)await wake();prepareTravel().then(()=>companion.attention.setTracking(!media.matches)).catch(()=>status(tr('Some flight drawings could not load. Please reload to retry.','飛行画像を読み込めませんでした。再読み込みしてください。')));
  if(journey.active)await resumeJourney();
  let requested;try{requested=pendingGuide(sessionStorage.getItem('yuki-guide-v1'),location.pathname);sessionStorage.removeItem('yuki-guide-v1');}catch{}
  if(requested&&!journey.active){const target=checkedGuideTarget(requested,knowledge,ja?'ja':'en',base);if(target)await beginJourney(target);}
  if(online&&permission.allowed&&translationBatch(messages,ja?'ja':'en').length){if(!chatSession.get())panel(true);void translateConversation();}
 }catch{status(tr('Yuki’s artwork could not load. The website and links still work.','ゆきの画像を読み込めませんでした。サイトとリンクは利用できます。'));}
 for(const name of ['pointerdown','keydown','wheel','touchstart'])addEventListener(name,()=>{if(resident&&!portalTrip)companion?.lifecycle.activity();if(garden&&resident)garden.inactive=0;},{passive:true,capture:true});
 document.addEventListener('yuki:question',event=>{const text=event.detail?.text;if(garden&&typeof text==='string'&&text.length<=1000){garden.cancel();void garden.api.chat(text);}});
 addEventListener('pointermove',e=>{if(ready&&onScreen&&!open&&e.pointerType!=='touch'&&Math.abs(e.clientY-shownFoot.y)<bodyHeight*2)companion.pointer(e.clientX);},{passive:true});
 media.addEventListener('change',sync);addEventListener('resize',()=>{measure();lastMeasure=-Infinity;if(open)updateReading();});
 let readingFrame=0;
 function scheduleReading(){if(open&&!readingFrame)readingFrame=requestAnimationFrame(()=>{readingFrame=0;updateReading();});}
 addEventListener('scroll',scheduleReading,{passive:true,capture:true});
 const main=document.querySelector('main');
 if(main){new ResizeObserver(scheduleReading).observe(main);main.addEventListener('transitionend',scheduleReading);new MutationObserver(scheduleReading).observe(main,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['hidden','aria-hidden']});}
 const featureTrack=document.querySelector('[data-feature-track]');if(featureTrack)new MutationObserver(scheduleReading).observe(featureTrack,{attributes:true,attributeFilter:['style']});
 addEventListener('scroll',()=>{if(!ready)return;lastMeasure=-Infinity;if(performance.now()<guideScrollUntil)return;
  // A visitor changing the view takes priority over a stale guided route.
  if(guideTarget){guide.reset();guideTarget=null;highlightUntil=0;clearRouteMarker();}
  motion.scroll();},{passive:true});
 window.visualViewport?.addEventListener('resize',placeBubble);window.visualViewport?.addEventListener('scroll',placeBubble);
 addEventListener('pagehide',()=>{save();if(journey.active&&companion)journey.depart({x:companion.rover.foot.x,y:companion.rover.foot.y-scrollY},layout);controller?.abort();verification.stop();});
 async function restoreLocation(){
  portalTrip=null;portalAfterglow=null;portal.hidden=true;calling=false;callLoading=false;companion.rover.hidden=true;
  presence.reload();presence.transit();presence.settleAway(location.pathname);resident=presence.here(location.pathname);
  if(presence.transfer){await ensure([...travel,'wake','bedtime','crash',...poseArtwork(presence.transfer.origin.pose,clips)]);continueTransfer();sync();return;}
  if(resident&&!journey.active){const s=presence.state;await ensure(poseArtwork(s.pose,clips));
   if(!restorePose(companion,s.pose,clips,p=>locationMap(p,true))){placeAt(locationMap(s.position,true));companion.lifecycle.enter(s.status==='sleep'?'sleep':'awake');}
   if(s.status==='returning'&&!garden){portalTrip={kind:'returning',phase:'flying',age:0};calling=true;}
  }sync();
 }
 addEventListener('pageshow',async e=>{if(momentKind==='leave')hideMoment();if(e.persisted){
  // Never let a cached page save its stale local copy over the newer location.
  resident=false;const restored=readSession(readingStorage,Date.now(),ja?'ja':'en');messages=restored.messages??[];variety=cleanVariety(restored.variety);conversationMemory.reload();drawMessages();permission.reload();permissionUI();if(!permission.allowed)withdrawPermission();if(companion)companion.lifecycle.lastCrash=companion.lifecycle.clock+flopRemaining()-companion.lifecycle.crashCooldownMs;journey=new GuideJourney(readingStorage);clearRouteMarker();if(ready)await restoreLocation();if(journey.active)void resumeJourney();else stopJourney();save();}});
 document.addEventListener('click',event=>{
  const link=event.target?.closest?.('a[href]');
  if(!link||!ready||hidden||busy||journey.active||!onScreen||!isLeavingLink(link.href,location.href,{button:event.button,defaultPrevented:event.defaultPrevented,download:link.hasAttribute('download'),altKey:event.altKey,ctrlKey:event.ctrlKey,metaKey:event.metaKey,shiftKey:event.shiftKey}))return;
  showMoment('leave',{reveal:true}); // Never prevent, delay or replace navigation.
 },{passive:true});
 document.addEventListener('visibilitychange',()=>{last=performance.now();if(document.hidden){save();verification.stop();}else if(momentKind==='leave')hideMoment();});
}
