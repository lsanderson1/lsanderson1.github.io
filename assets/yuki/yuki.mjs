import {Companion} from './runtime/companion.mjs?v=2';
import {projectFrame} from './runtime/projection.mjs';
import {IdleRenderer} from './runtime/idle-renderer.mjs';
import {takeoffMs,landingMs,contactPhases} from './runtime/timing.mjs';
import {airClips} from './runtime/air-reactions.mjs';
import {emotionPlayback,applyReplyCue} from './runtime/reply-cues.mjs';
import {SiteGuide} from './runtime/site-guide.mjs?v=5';
import {pageLayout,bubblePlacement,bubbleHeightLimit,pointerTarget} from './runtime/page-layout.mjs?v=9';
import {localizedPages,localizePath,findPageTarget,pendingGuide,targetRect,curateDestinations} from './runtime/page-targets.mjs?v=9';
import {PageObstacles,visibleSpot,guideSpot,clampFoot,fits,atFoot} from './runtime/clear-space.mjs?v=5';
import {GuideJourney,guideTarget as checkedGuideTarget,isGuideRequest,resolveGuideRequest,planGuideStep,findGuideElement,guideCopy} from './runtime/guide-journey.mjs?v=1';
import {PageMotion,pageProjection,inViewport,prepareCall,containPageRover} from './runtime/page-motion.mjs?v=7';
import {CallPerches} from './runtime/call-perches.mjs?v=7';
import {VisitorPersonality,conversationOpening,localizeGreetingMessages,replySequence,cueArtwork} from './runtime/visitor-personality.mjs?v=9';
import {ChatAvailability,ChatPermission,ChatSession,ChatVerification,chatEnvironment,chatEnabledKey,searchConsentKey} from './runtime/chat-access.mjs?v=3';
import {ConversationMemory} from './runtime/conversation-memory.mjs?v=1';
import {messageRecord,translatedText,translationBatch,checkedTranslations,applyTranslations} from './runtime/conversation-language.mjs';
import {ReadingMemory,readPageTitle,readingDetail,readPageDisplaySection,readPageSection,guideReference,followUpReference} from './runtime/reading-context.mjs?v=3';
import {validReply,readSession,chatUnavailable} from './protocol.mjs?v=9';
import {safeWebURL} from './runtime/web-sources.mjs?v=1';
import {cleanVariety,rememberReply,packChatRequest} from './runtime/reply-variety.mjs?v=2';

const root=document.querySelector('#yuki-companion');
if(root)start().catch(()=>{root.textContent='';}); // Portfolio remains usable on failure.
async function start(){
 const ja=document.documentElement.lang==='ja',base=root.dataset.base||'',assets=new URL(root.dataset.assets,location.href);
 const tr=(en,jp)=>ja?jp:en,$=s=>root.querySelector(s),media=matchMedia('(prefers-reduced-motion: reduce)');
 let saved={};try{saved=readSession(sessionStorage,Date.now(),ja?'ja':'en');}catch{}
 let readingStorage;try{readingStorage=sessionStorage;}catch{}const readingMemory=new ReadingMemory(readingStorage);
 const conversationMemory=new ConversationMemory(readingStorage,ja?'ja':'en'),chatSession=new ChatSession(readingStorage);
 let lastFlop=0;try{const stamp=Number(readingStorage?.getItem('yuki-last-flop-v1'));if(Number.isFinite(stamp)&&stamp>0&&stamp<=Date.now())lastFlop=stamp;}catch{}
 const flopRemaining=()=>{try{const stamp=Number(readingStorage?.getItem('yuki-last-flop-v1'));if(Number.isFinite(stamp)&&stamp>0&&stamp<=Date.now())lastFlop=Math.max(lastFlop,stamp);}catch{}return Math.max(0,300000-(Date.now()-lastFlop));};
 const rememberFlop=()=>{lastFlop=Date.now();try{readingStorage?.setItem('yuki-last-flop-v1',String(lastFlop));}catch{}};
 let journey=new GuideJourney(readingStorage),journeySerial=0,journeyStep=null,markedTarget=null,knowledgeReady;
 let visitorStorage;try{visitorStorage=localStorage;}catch{}const personality=new VisitorPersonality(visitorStorage);
 let messages=saved.messages??[],variety=cleanVariety(saved.variety),companion,guide,renderer,clips,bodyHeight=155,last=0,loading=0,busy=false,translationFailed=false,pendingCue=null,controller;
 let hidden=saved.hidden??false,paused=saved.paused??false,roam=saved.mobilityVersion===2?saved.roam:true,open=false,ready=false,onScreen=true,calling=false,callLoading=false;
 const viewportLayout=()=>pageLayout(document.documentElement.clientWidth||innerWidth,innerHeight);
 let layout=viewportLayout(),shownFoot=layout.home,motion,guideTarget=null,highlightUntil=0,knowledge=[];
 const obstacleReader=new PageObstacles(document,root);
 const callPerches=new CallPerches();
 let obstacles=[],clear=true,lastMeasure=-Infinity,guideScrollUntil=0,headerBottom=0;
 const measureHeader=()=>headerBottom=Math.max(0,document.querySelector('.fp-nav')?.getBoundingClientRect().bottom??0);
 const paths={projects:'/projects/',essays:'/essays/',unreal:'/unreal-journey/',resume:'/resume.html'};
 const names={projects:'Projects',essays:'Essays',unreal:'Unreal Journey',resume:'Resume'};
 const endpoint=(()=>{try{const u=new URL(root.dataset.endpoint);return u.protocol==='https:'?u.href:'';}catch{return '';}})();
 const access=chatEnvironment({origin:location.origin,siteOrigin:root.dataset.siteOrigin,endpoint,siteKey:root.dataset.siteKey});
 const online=access.available,permission=new ChatAvailability(visitorStorage);
 const searchPermission=new ChatPermission(visitorStorage,searchConsentKey);
 root.innerHTML=`<div class="yuki-pet" aria-hidden="true" hidden><img alt="" draggable="false"><canvas hidden></canvas><span class="yuki-bubble" hidden></span></div>
 <button class="yuki-hit" hidden aria-controls="yuki-panel" aria-expanded="false" aria-label="${tr('Wake Yuki and chat','ゆきを起こして話す')}"></button>
 <svg class="yuki-guide-line" aria-hidden="true" hidden><path></path><circle r="5"></circle></svg><div class="yuki-target-ring" hidden></div>
 <button class="yuki-launcher" hidden aria-controls="yuki-panel">${tr('Call Yuki','ゆきを呼ぶ')}</button>
 <section class="yuki-panel" id="yuki-panel" role="dialog" aria-modal="false" aria-labelledby="yuki-title" hidden>
 <div class="yuki-panel-inner"><header class="yuki-heading"><h2 id="yuki-title">ゆき <span class="yuki-beta">BETA</span><small>${tr('Your little guide','小さな案内役')}</small></h2><button class="yuki-menu" aria-expanded="false" aria-controls="yuki-more" aria-label="${tr('Guide, history and settings','案内・履歴・設定')}">⋯</button><button class="yuki-close" aria-label="${tr('Close chat','チャットを閉じる')}">×</button></header>
 <div class="yuki-speech" role="log" aria-live="polite" aria-atomic="true" aria-label="${tr('Yuki says','ゆきの返事')}"></div><p class="yuki-status" role="status"></p><button class="yuki-translate" type="button" hidden>${tr('Retry translation','翻訳を再試行')}</button>
 <p class="yuki-reading"><span class="yuki-page"></span><span class="yuki-view"></span><button class="yuki-explain" type="button" hidden>${tr('Explain what you showed me','案内したところを説明して')}</button></p>
 <div class="yuki-route-actions" hidden></div>
 <form class="yuki-form"><textarea maxlength="1000" rows="1" aria-label="${tr('Message Yuki','ゆきへのメッセージ')}" placeholder="${tr('Talk to Yuki…','ゆきに話しかける…')}"></textarea><button type="submit">${tr('Send','送信')}</button>
 <details class="yuki-setup"><summary></summary><div class="yuki-privacy"><p>${tr('Talking to Yuki sends your message, recent and relevant older chat, and the current page/guide context to Cloudflare Workers AI. Opening an empty or already-translated conversation does not send anything. After a language switch, earlier messages may be sent for translation as explained below. Please don’t share sensitive information.','ゆきへの送信時に、メッセージ・直近と関連する過去の会話・現在のページや案内先をCloudflare Workers AIへ送ります。会話が空か翻訳済みの場合、開くだけでは送信しません。言語を切り替えた後は、下記の説明のとおり過去の会話を翻訳のために送る場合があります。個人情報・機密情報は入力しないでください。')}</p><p>${tr('Requested guided routes can also generate an AI follow-up at each stop. Free usage limits still apply. A verified chat pass lasts up to two hours in this tab; the security check appears only when needed.','依頼した道案内では、各地点でAIが続きの質問を作る場合があります。無料利用上限があります。認証済みチャットはこのタブで最大2時間有効で、必要なときだけセキュリティ認証が表示されます。')}</p><p>${tr('Yuki recalls up to 40 earlier exchanges in this tab for up to 24 hours after the last exchange. This is not permanent memory or a server-side profile. Clear chat & memory below removes it.','このタブでは最大40件の過去のやり取りを、最後の会話から最大24時間まで記憶します。永久的な記憶やサーバー上のプロフィールではありません。下の「会話と記憶を消去」で削除できます。')}</p></div></details>
 <div class="yuki-check"><p class="yuki-verification-status" role="status"></p><div class="yuki-verification"></div><button class="yuki-retry" type="button" hidden>${tr('Retry verification','認証をやり直す')}</button><button class="yuki-cancel" type="button" hidden>${tr('Cancel sending','送信をキャンセル')}</button></div></form>
 <p class="yuki-preview" hidden><a class="yuki-live-link" target="_blank" rel="noopener noreferrer">${tr('Open this page on the live website ↗','公開サイトの同じページを開く ↗')}</a></p>
 <div class="yuki-more" id="yuki-more" hidden>
 <input class="yuki-search" type="search" aria-label="${tr('Find a page or section','ページや項目を探す')}" placeholder="${tr('Search projects and highlights…','作品や見どころを探す…')}"><div class="yuki-destinations"></div>
 <details class="yuki-history"><summary>${tr('Conversation history','会話の履歴')}</summary><div class="yuki-log" aria-label="${tr('Conversation','会話')}"></div></details>
 <div class="yuki-settings"><button class="yuki-ai-toggle" type="button"></button><button data-action="roam"></button><button data-action="pause"></button><button data-action="hide"></button><button data-action="clear">${tr('Clear chat & memory','会話と記憶を消去')}</button></div></div></div></section>`;
 const varietyNote=document.createElement('p');varietyNote.textContent=tr('To reduce repetition, this tab also keeps Yuki’s discussed story topics, recent reply openings and similarity fingerprints with the chat. They are sent with your next message, cleared with Clear chat, and use the same session expiry. A near-duplicate answer may use one extra AI rewrite within the same free usage limits.','繰り返しを減らすため、ゆきが話した物語の項目、直近の返事の書き出し、類似度を確認するためのデータも会話と同じタブに保存し、次のメッセージと一緒に送信します。「会話を消去」で削除され、保持期限も会話と同じです。よく似た回答は、同じ無料利用上限の範囲内で一度だけAIが書き直す場合があります。');$('.yuki-privacy').append(varietyNote);
 const languageNote=document.createElement('p');languageNote.textContent=tr('Switching languages keeps our conversation and memory. Earlier messages are automatically translated through Cloudflare into the new page language, within the same free limits. The original wording and translations stay in this tab and are reused between pages and when switching back. An active guided route also continues in the new language.','言語を切り替えても会話と記憶は引き継ぎます。同じ無料上限の範囲で、過去のメッセージをCloudflareで新しいページの言語に自動翻訳します。原文と翻訳はこのタブに保存し、ページの移動や言語を戻したときに再利用します。案内中の行き先も引き継ぎます。');$('.yuki-privacy').append(languageNote);
 const searchLabel=document.createElement('label'),searchBox=document.createElement('input');searchBox.type='checkbox';searchBox.className='yuki-search-consent';searchBox.disabled=!online;
 searchLabel.append(searchBox,document.createTextNode(tr('Optional: let Yuki send a short public-topic query to Tavily when an answer needs web information. This adds another provider; your full chat is not sent to Tavily. Do not include private or sensitive information. Remember this choice; you can turn it off here anytime. Search has shared free limits, and normal chat works without it.','任意：ウェブ情報が必要な回答では、ゆきが短い公開トピックの検索語をTavilyに送信することを許可します。送信先が追加されますが、会話全体はTavilyに送りません。個人情報・機密情報は入力しないでください。この設定を記憶し、ここでいつでも解除できます。検索には共有の無料上限があります。通常の会話は検索なしでも利用できます。')));$('.yuki-privacy').append(searchLabel);
 const status=text=>{$('.yuki-status').textContent=text;};
 function readingContext(){measureHeader();return {section:readPageSection(document,innerHeight,headerBottom)?.id??'',lastGuide:readingMemory.get()};}
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
  if(remember){messages.push({...messageRecord(role,text,ja?'ja':'en'),...(sources.length?{sources}:{}),...(Number.isInteger(greetingId)?{greetingId}:{})});messages=messages.slice(-12);if(role==='assistant')variety=rememberReply(variety,text,storyTopics);}
  const p=document.createElement('p');p.className='yuki-message';p.dataset.role=role;const label=document.createElement('strong');label.textContent=role==='user'?tr('YOU','あなた'):'ゆき';p.append(label,document.createTextNode(text??(online?tr('Switching this message to English…','このメッセージを日本語に切り替えています…'):tr('Your conversation is saved. Automatic translation is available on the live site.','会話は保存されています。自動翻訳は公開サイトで利用できます。'))));
  const history=p.cloneNode(true);$('.yuki-log').append(history);$('.yuki-log').scrollTop=$('.yuki-log').scrollHeight;
  if(role==='assistant'){
   if(sources.length){const links=document.createElement('span');links.className='yuki-sources';for(const s of sources){
    const external=safeWebURL(s.url);
    if(external){const a=document.createElement('a');a.href=external;a.target='_blank';a.rel='noopener noreferrer';a.textContent=s.title+' ↗';a.setAttribute('aria-label',tr('Web source (opens a new tab): ','ウェブ出典（新しいタブ）：')+s.title);links.append(a);continue;}
    const url=localizePath(s.url,knowledge,ja?'ja':'en',base);if(!url)continue;const a=document.createElement('a');a.href=url;a.textContent=s.title;a.onclick=e=>{if(e.button===0&&!e.ctrlKey&&!e.metaKey&&!e.shiftKey&&!e.altKey){if(new URL(url,location.href).pathname===location.pathname){e.preventDefault();void visit(url,s.title);}else{try{sessionStorage.setItem('yuki-guide-v1',JSON.stringify({url,at:Date.now()}));}catch{}}}};const show=document.createElement('button');show.textContent=tr('Show me','案内して');show.setAttribute('aria-label',tr('Show me: ','案内して：')+s.title);show.onclick=()=>visit(url,s.title);links.append(a,show);}p.append(links);}
   $('.yuki-speech').replaceChildren(p);$('.yuki-speech').scrollTop=0;
  }if(remember){translationUI();save();}
 }
 function save(){try{const r=companion?.rover;sessionStorage.setItem('yuki-session-v1',JSON.stringify({savedAt:Date.now(),language:ja?'ja':'en',mobilityVersion:2,awake:companion?companion.lifecycle.state!=='sleep':saved.awake,hidden,paused,roam,messages,variety,x:r?r.foot.x/innerWidth:saved.x,y:r?r.foot.y/innerHeight:saved.y}));}catch{}}
 function settingLabels(){for(const [k,text] of Object.entries({roam:roam?tr('Occasional flights: on','たまにお散歩：オン'):tr('Occasional flights: off','たまにお散歩：オフ'),pause:paused?tr('Resume','再開'):tr('Pause','一時停止'),hide:hidden?tr('Show Yuki','ゆきを表示'):tr('Hide Yuki','ゆきを隠す')}))$(`[data-action="${k}"]`).textContent=text;}
 drawMessages();status(online?tr('Ready when you are.','いつでもどうぞ。'):offline);settingLabels();
 function panel(value,{restoreFocus=true}={}){open=value;$('.yuki-panel').hidden=!value;$('.yuki-hit').setAttribute('aria-expanded',String(value));motion?.defer();
  if(value){if(hidden){hidden=false;sync();}wake();updateReading();$('.yuki-close').focus({preventScroll:true});queueMicrotask(()=>{if(open)void translateConversation();});}
  else {if(busy){controller?.abort();status(tr('Sending cancelled.','送信をキャンセルしました。'));}verification.stop();}
  if(!value&&restoreFocus){const returnFocus=!hidden?$('.yuki-hit'):$('.yuki-launcher');if(!returnFocus.hidden)returnFocus.focus({preventScroll:true});}placeBubble();save();}
 async function openConversation(){
  if(!ready||open)return;panel(true);
  const cue=conversationOpening(messages,personality,ja?'ja':'en');if(!cue){void translateConversation();return;}
  addMessage('assistant',cue.text,true,[],[],cue.greetingId);
  await react(cue,{firstMeeting:cue.firstMeeting}).catch(()=>{});
 }
 function toggleConversation(){if(open)panel(false);else void openConversation();}
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
 async function prepareTravel(){await ensure([...travel,'wake','bedtime','crash']);companion.lifecycle.crashChance=.08;companion.lifecycle.inactivityMs=90000;if(motion)motion.prepared=true;}
 async function wake(){if(!ready)return;try{await ensure(['wake','bedtime']);companion.lifecycle.inactivityMs=90000;companion.lifecycle.wake();companion.lifecycle.activity();save();}catch{status(tr('Some animation artwork could not load. Please try again.','アニメーションを読み込めませんでした。もう一度お試しください。'));}}
 const elements=Object.entries(paths).map(([id,path])=>({id,name:names[id],el:document.querySelector(id==='projects'?'#projects, .fp-project-list':id==='essays'?'#essays, .fp-essay-list':id==='unreal'?'#unreal-journey, .fp-timeline':'.fp-resume-head')})).filter(d=>d.el);
 function measure(){
  layout=viewportLayout();bodyHeight=layout.bodyHeight;
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
  panel.hidden=!onScreen||hidden;if(panel.hidden)return;
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
  const target=chooseLandingSpot();
  return {...target,y:target.y+scrollY};
 }
 async function callYuki(){
  if(!ready||calling||callLoading)return;const button=$('.yuki-launcher');callLoading=true;button.disabled=true;
  stopJourney();
  try{await prepareTravel();await wake();hidden=false;paused=false;guide.reset();guideTarget=null;highlightUntil=0;sync();
   const extent=restingExtent(),target=chooseLandingSpot();
   prepareCall(companion.rover,extent,layout,scrollY);calling=true;motion.travel({...target,y:target.y+scrollY});
   status(tr('Coming! Just a little flap…','いま行くね！ぱたぱたっ…'));
  }catch{calling=false;status(tr('I couldn’t load my flight. Please try again.','飛ぶ準備ができなかったの。もう一度呼んでね。'));}finally{callLoading=false;button.disabled=calling;}
 }
 function sync(){measure();if(companion){companion.rover.hidden=hidden;companion.rover.playing=!paused;companion.setLessMotion(media.matches);}settingLabels();save();render();}

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
  try{await prepareTravel();await wake();
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
 for(const b of root.querySelectorAll('[data-action]'))b.onclick=async()=>{const a=b.dataset.action;if(a==='clear'){stopJourney();controller?.abort();reactionVersion++;messages=[];variety=cleanVariety();conversationMemory.clear();chatSession.clear();readingMemory.clear();updateReading();drawMessages();status(online?tr('Conversation cleared.','会話を消去しました。'):offline);pendingCue=null;}
  if(a==='hide'){hidden=!hidden;if(hidden){stopJourney();calling=false;controller?.abort();reactionVersion++;pendingCue=null;panel(false);}}if(a==='pause')paused=!paused;
  if(a==='roam'&&ready){b.disabled=true;try{await prepareTravel();roam=!roam;motion.defer();}catch{status(tr('Flight artwork is unavailable. Please retry.','飛行アニメーションを読み込めませんでした。'));}finally{b.disabled=false;}}
  sync();};
 async function guideDestination(id){
  if(!paths[id])return;
  await visit(base+(ja?'/ja':'')+paths[id],names[id]);
 }
 function clearRouteMarker(){markedTarget?.classList.remove('yuki-route-target');markedTarget=null;}
 function stopJourney(){if(controller?.guideEvent)controller.abort();journeySerial++;journey.clear();journeyStep=null;clearRouteMarker();guide?.reset();guideTarget=null;highlightUntil=0;$('.yuki-route-actions').replaceChildren();$('.yuki-route-actions').hidden=true;}
 function cancelJourney(){stopJourney();addMessage('assistant',tr('Okay! Little map tucked away. What caught your eye here?','はーい、小さな地図をしまうね。ここでは何が気になった？'));status(tr('Explore at your own pace.','好きなペースで見てみよう！'));}
 function routeButtons(items){const box=$('.yuki-route-actions');box.replaceChildren();box.hidden=!items.length;for(const [label,action] of items){const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=action;box.append(b);}placeBubble();}
 function routeOptions(targets){routeButtons(targets.filter(Boolean).map(t=>[t.title,()=>beginJourney(t)]));}
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
   const a=document.createElement('a');a.href=target.url;a.textContent=target.title;$('.yuki-speech').lastElementChild.append(a);routeButtons([[tr('Stop leading','案内を終了'),cancelJourney]]);return;}
  journeyStep=step;journey.expect(step.kind==='arrive'?target.url:step.url,location.pathname);
  routeButtons([[tr('Stop leading','案内を終了'),cancelJourney]]);
  await showElement({id:'journey-'+journeySerial+'-'+step.kind,name:step.title,el,url:step.url,journeySerial});
 }
 function journeyArrived(d){
  if(!journey.active||d.journeySerial!==journeySerial||!journeyStep)return;
  const step=journeyStep;
  panel(true);void speakGuideFollowup(step);
  status(tr('Guided route · click the highlighted link yourself.','道案内中・光っているリンクをクリックしてね。'));
  highlightUntil=Infinity;
  if(step.kind==='arrive'){
   journey.clear();status(tr('You’ve arrived. What would you like to explore?','到着したよ。どこから見てみようか？'));
   const page=knowledge.find(p=>p.url===step.url.split('#')[0]);
   const sections=(page?.sections??[]).filter(s=>s.id!=='s0'&&s.kind!=='image'&&s.anchor&&s.anchor!==step.url.split('#')[1]).slice(0,2);
   routeButtons([[tr('Explain this','ここを説明して'),()=>{if(online)$('.yuki-explain').click();else status(offline);}],...sections.map(s=>[s.title,()=>beginJourney(checkedGuideTarget(page.url+'#'+s.anchor,knowledge,ja?'ja':'en',base))]),[tr('All done','案内ありがとう'),()=>{stopJourney();panel(false);}]]);
  }else routeButtons([[tr('Point again','もう一度指して'),()=>leadJourney()],[tr('Stop leading','案内を終了'),cancelJourney]]);
 }
 async function resumeJourney(){
  if(!journey.active)return;
  const target=checkedGuideTarget(journey.state.target,knowledge,ja?'ja':'en',base);
  if(!target){stopJourney();return;}
  const result=journey.enter(location.pathname,base);
  if(result==='detour'){
   panel(true);void speakGuideFollowup({...target,kind:'detour'});
   routeButtons([[tr('Continue guiding','案内を続けて'),()=>leadJourney()],[tr('Explore here instead','ここを見てみる'),cancelJourney]]);return;
  }
  await leadJourney();
 }
 function speakGuideFollowup(step){
  const fallback=()=>addMessage('assistant',guideCopy(step,{lang:ja?'ja':'en',detour:step.kind==='detour'}));
  if(!online||!permission.allowed||busy){fallback();return;}
  return runChat(tr('Offer a contextual follow-up for this guided stop.','この案内地点に合った続きの質問をしてください。'),{kind:step.kind,url:step.url},fallback);
 }
 let reactionVersion=0;
 let talkTurn=0;
 async function react(cue,{firstMeeting=false,thinking=false}={}){const version=++reactionVersion;pendingCue=null;
  const sequence=thinking?[cue]:replySequence(cue,{firstMeeting,talk:talkTurn++%2?'talkExplain':'talkOpen'});
  await ensure(sequence.flatMap(c=>{const key=cueArtwork(c),air=airClips[key];return [key,...(air?[air.key,air.transitionKey??'hoverTransition']:[])];}));
  if(version===reactionVersion)pendingCue={sequence,expires:performance.now()+60000};
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
  if(journey.active&&/^(?:stop(?: guiding| leading)?|cancel(?: guide)?|案内をやめて|案内を終了)[.!。！]?$/i.test(text)){addMessage('user',text);$('textarea').value='';stopJourney();addMessage('assistant',tr('Okay! I’ll put my little map away. We can explore at your pace.','はーい、小さな地図をしまうね。好きなペースで見てみよう！'));return;}
  if(journey.active&&/^(?:continue(?: guiding| leading)?|resume(?: guide)?|案内を続けて|続けて)[.!。！]?$/i.test(text)){addMessage('user',text);$('textarea').value='';await leadJourney();return;}
  const requested=resolveGuideRequest(text,knowledge,location.pathname,{lang:ja?'ja':'en',base});
  if(requested?.target){addMessage('user',text);$('textarea').value='';await beginJourney(requested.target);return;}
  if(requested?.choices?.length){addMessage('user',text);$('textarea').value='';addMessage('assistant',tr('A few places match! Which one shall my little wings lead you to?','いくつか見つかったよ！どこへ案内しようか？'));routeOptions(requested.choices);return;}
  if(!online||busy){status(offline);if(requested){addMessage('user',text);$('textarea').value='';addMessage('assistant',tr('Which page did you mean? Try a project title or choose a section below. I can lead you without AI; open the live site for explanations.','どのページかな？作品名を教えるか、下から選んでね。AIなしでも案内できるよ。詳しいお話は公開サイトでできるよ。'));routeOptions(Object.values(paths).map(path=>checkedGuideTarget(base+(ja?'/ja':'')+path,knowledge,ja?'ja':'en',base)));}return;}
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
   status(tr('Yuki is thinking…','ゆきが考えています…'));react({text:'…',emotion:'thoughtful',gesture:'none'},{thinking:true}).catch(()=>{});
   const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:packChatRequest({message:text,history,lang:ja?'ja':'en',page:location.pathname,context,...(pass?{pass}:{token}),variety,memory:conversationMemory.recall(text,history),...(guideEvent?{guideEvent}:{}),webSearch:!guideEvent&&searchPermission.allowed}),signal:requestController.signal,credentials:'omit'});
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
   if(!guideEvent&&paths[cue.destination]&&!cue.sources.length){const button=document.createElement('button');button.textContent=tr('Show me: ','案内して：')+names[cue.destination];button.onclick=async()=>{button.disabled=true;try{await guideDestination(cue.destination);}finally{button.disabled=false;}};$('.yuki-speech').lastElementChild.append(button);}
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
  let p=projectFrame(companion,clips,bodyHeight);if(!p.frame?.image)return;
  containPageRover(r,restingExtent(),layout);p=pageProjection(projectFrame(companion,clips,bodyHeight),scrollY);
  shownFoot={...p.foot};
  const occupied=atFoot(shownFoot,poseExtent(p)),b=life.bubble;
  if(b){const [nx,ny]=p.frame.nose,rad=(media.matches?12:b.radius)*p.scale;occupied.left=Math.min(occupied.left,p.x+nx*p.scale-1.8*rad);occupied.top=Math.min(occupied.top,p.y+ny*p.scale-.4*rad);occupied.right=Math.max(occupied.right,p.x+nx*p.scale+.2*rad);occupied.bottom=Math.max(occupied.bottom,p.y+ny*p.scale+1.6*rad);}
  clear=fits(occupied,obstacles,layout);
  onScreen=inViewport(occupied,layout)&&occupied.bottom>headerBottom;
  // Content avoidance picks the destination, never toggles frame visibility.
  // Both dimensions use the same scale; no crowd-dependent compression.
  const pet=$('.yuki-pet'),img=pet.querySelector('img'),canvas=pet.querySelector('canvas');pet.hidden=hidden;if(img.src!==p.frame.image.src)img.src=p.frame.image.src;
  const breathing=!life.locked&&r.graph.state==='rest'&&!p.isGreeting&&!p.isEmotion&&!p.isAttention&&!media.matches&&companion.idle.amount>0;
  const drawn=breathing&&renderer?.draw(p.frame.image,companion.idle.pose,p.info.width*p.scale);canvas.hidden=!drawn;img.style.visibility=drawn?'hidden':'visible';
  Object.assign(pet.style,{width:p.info.width*p.scale+'px',height:p.info.height*p.scale+'px',transform:`translate3d(${p.x}px,${p.y}px,0)`});
  const box=p.frame.pixelBounds??[210,170,515,615],hit=$('.yuki-hit');hit.hidden=hidden;Object.assign(hit.style,{left:p.x+box[0]*p.scale+'px',top:p.y+box[1]*p.scale+'px',width:(box[2]-box[0])*p.scale+'px',height:(box[3]-box[1])*p.scale+'px'});
  hit.title=tr('Yuki · BETA','ゆき · BETA');
  hit.setAttribute('aria-label',open?tr('Hide chat with Yuki','ゆきとのチャットを隠す'):life.state==='sleep'?tr('Wake Yuki and chat','ゆきを起こして話す'):tr('Chat with Yuki','ゆきと話す'));
  const bubble=$('.yuki-bubble');bubble.hidden=!b||hidden;if(b){const [nx,ny]=p.frame.nose,rad=(media.matches?12:b.radius)*p.scale;Object.assign(bubble.style,{left:nx*p.scale-1.8*rad+'px',top:ny*p.scale-.4*rad+'px',width:2*rad+'px',height:2*rad+'px'});}
  Object.assign(pet.dataset,{state:r.graph.state,lifecycle:life.state,greeting:String(Boolean(p.isGreeting)),breathing:String(Boolean(drawn)),art:p.frame.file,emotion:companion.emotion.kind??'neutral',clear:String(clear),bounds:JSON.stringify(occupied)});
  const launcher=$('.yuki-launcher');
  launcher.textContent=hidden?tr('Show Yuki','ゆきを表示'):calling?tr('Flying over…','そっちに飛んでるよ…'):tr('Call Yuki','ゆきを呼ぶ');launcher.disabled=calling||callLoading;
  launcher.hidden=open&&onScreen&&!hidden;
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
 function tick(t){const dt=Math.min(64,Math.max(0,t-last));last=t;if(companion&&!document.hidden){if((open&&onScreen)||busy||journey.active)companion.lifecycle.activity();
   if(t-lastMeasure>200){measureHeader();obstacles=obstacleReader.read(layout.width,layout.height);lastMeasure=t;}
   motion.update(dt,{hidden,paused,guiding:guide.active||journey.active,open,roam,target:chooseMovementTarget,visible:onScreen,reacting:Boolean(pendingCue)});companion.update(dt);guide.update();
   if(calling&&companion.rover.graph.state==='rest'&&companion.rover.at===companion.rover.wanted&&!companion.lifecycle.locked){calling=false;status(tr('Here I am! Phew, little wings.','着いたよ！ふぅ、小さな羽、がんばった。'));}
   if(pendingCue&&performance.now()>pendingCue.expires)pendingCue=null;
   if(pendingCue&&onScreen){const cue=pendingCue.sequence[0];
    if(media.matches){if(cue.firstMeeting)personality.markMet();pendingCue=null;}
    else if(applyReplyCue(companion,cue).animationAccepted){if(cue.firstMeeting)personality.markMet();pendingCue.sequence.shift();if(!pendingCue.sequence.length)pendingCue=null;}
   }render();if(t-lastTrim>5000){trimArt();lastTrim=t;}}requestAnimationFrame(tick);}
 try{
  const res=await fetch(new URL('manifest.json',assets));if(!res.ok)throw Error('manifest');({clips}=await res.json());await ensure(['sleep','rest']);
  await knowledgeReady;if(journey.active&&!checkedGuideTarget(journey.state.target,knowledge,ja?'ja':'en',base))journey.clear();
  const timing={rest:clips.rest.frames.map(f=>f.durationMs),flight:clips.flight.frames.map(f=>f.durationMs??60),takeoff:takeoffMs,landing:landingMs};
  companion=new Companion(timing,measure(),{motion:contactPhases,idle:{},lifecycle:{clips,startAsleep:!saved.awake&&!journey.active,inactivityMs:Infinity,crashChance:0,crashCooldownRemainingMs:flopRemaining(),onCrash:rememberFlop},greeting:clips.greeting.playback,emotions:{...emotionPlayback(clips),pointLeft:clips.pointLeft.playback,pointRight:clips.pointRight.playback},airClips});
  motion=new PageMotion(companion);
  companion.rover.setArrivalStyle('land');try{renderer=new IdleRenderer($('.yuki-pet canvas'));}catch{}
  guide=new SiteGuide(companion,{destinations:elements,reveal:revealTarget,direction:id=>{const d=guide.destinations.get(id);return pointerTarget(targetRect(d.el),shownFoot).kind;},arrive:id=>{const d=guide.destinations.get(id);readingMemory.set(guideReference(d.el,location.pathname,d.url));if(open)updateReading();highlightUntil=performance.now()+10000;motion.defer();status(tr(`Ta-da! Here’s ${d.name}.`,`じゃーん！${d.name}だよ。`));if(d.journeySerial!==undefined)journeyArrived(d);}});
  obstacles=obstacleReader.read(layout.width,layout.height);
  const carriedPosition=journey.position(layout);
  const initial=carriedPosition?clampFoot(carriedPosition,restingExtent(),layout):visibleSpot(restingExtent(),obstacles,layout,layout.home);
  companion.rover.position={...initial,y:initial.y+scrollY};upsert({id:'home',...initial,y:initial.y+scrollY});
  ready=true;sync();last=performance.now();requestAnimationFrame(tick);
  if(saved.awake||open||journey.active)await wake();prepareTravel().then(()=>companion.attention.setTracking(!media.matches)).catch(()=>status(tr('Some flight drawings could not load. Please reload to retry.','飛行画像を読み込めませんでした。再読み込みしてください。')));
  if(journey.active)await resumeJourney();
  let requested;try{requested=pendingGuide(sessionStorage.getItem('yuki-guide-v1'),location.pathname);sessionStorage.removeItem('yuki-guide-v1');}catch{}
  if(requested&&!journey.active){const target=checkedGuideTarget(requested,knowledge,ja?'ja':'en',base);if(target)await beginJourney(target);}
  if(online&&permission.allowed&&translationBatch(messages,ja?'ja':'en').length){if(!chatSession.get())panel(true);void translateConversation();}
 }catch{status(tr('Yuki’s artwork could not load. The website and links still work.','ゆきの画像を読み込めませんでした。サイトとリンクは利用できます。'));}
 for(const name of ['pointerdown','keydown','wheel','touchstart'])addEventListener(name,()=>companion?.lifecycle.activity(),{passive:true,capture:true});
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
 addEventListener('pageshow',e=>{if(e.persisted){const restored=readSession(readingStorage,Date.now(),ja?'ja':'en');messages=restored.messages??[];variety=cleanVariety(restored.variety);conversationMemory.reload();drawMessages();save();permission.reload();permissionUI();if(!permission.allowed)withdrawPermission();if(companion)companion.lifecycle.lastCrash=companion.lifecycle.clock+flopRemaining()-companion.lifecycle.crashCooldownMs;journey=new GuideJourney(readingStorage);clearRouteMarker();if(journey.active)void resumeJourney();else stopJourney();}});
 document.addEventListener('visibilitychange',()=>{last=performance.now();if(document.hidden){save();verification.stop();}});
}
