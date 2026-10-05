import {Companion} from './runtime/companion.mjs';
import {projectFrame} from './runtime/projection.mjs';
import {IdleRenderer} from './runtime/idle-renderer.mjs';
import {takeoffMs,landingMs,contactPhases} from './runtime/timing.mjs';
import {airClips} from './runtime/air-reactions.mjs';
import {emotionPlayback,applyReplyCue} from './runtime/reply-cues.mjs';
import {SiteGuide} from './runtime/site-guide.mjs?v=5';
import {pageLayout,bubblePlacement,pointerTarget} from './runtime/page-layout.mjs?v=5';
import {localizedPages,localizePath,findPageTarget,pendingGuide,targetRect} from './runtime/page-targets.mjs?v=5';
import {PageObstacles,visibleSpot,guideSpot,fits,atFoot} from './runtime/clear-space.mjs?v=5';
import {PageMotion,containRover} from './runtime/page-motion.mjs?v=5';
import {validReply,readSession,chatUnavailable} from './protocol.mjs?v=3';

const root=document.querySelector('#yuki-companion');
if(root)start().catch(()=>{root.textContent='';}); // Portfolio remains usable on failure.
async function start(){
 const ja=document.documentElement.lang==='ja',base=root.dataset.base||'',assets=new URL(root.dataset.assets,location.href);
 const tr=(en,jp)=>ja?jp:en,$=s=>root.querySelector(s),media=matchMedia('(prefers-reduced-motion: reduce)');
 let saved={};try{saved=readSession(sessionStorage);}catch{}
 let messages=saved.messages??[],companion,guide,renderer,clips,bodyHeight=155,last=0,loading=0,busy=false,pendingCue=null,controller,token='',widget=null;
 let hidden=saved.hidden??false,paused=saved.paused??false,roam=saved.mobilityVersion===2?saved.roam:true,open=false,ready=false;
 const viewportLayout=()=>pageLayout(document.documentElement.clientWidth||innerWidth,innerHeight);
 let layout=viewportLayout(),shownFoot=layout.home,motion,guideTarget=null,highlightUntil=0,knowledge=[];
 const obstacleReader=new PageObstacles(document,root);
 let obstacles=[],clear=true,lastMeasure=-Infinity,movementTarget=layout.home,guideScrollUntil=0;
 const paths={projects:'/projects/',essays:'/essays/',unreal:'/unreal-journey/',resume:'/resume.html'};
 const names={projects:'Projects',essays:'Essays',unreal:'Unreal Journey',resume:'Resume'};
 const endpoint=(()=>{try{const u=new URL(root.dataset.endpoint);return u.protocol==='https:'?u.href:'';}catch{return '';}})();
 const online=Boolean(endpoint&&root.dataset.siteKey);
 root.innerHTML=`<div class="yuki-pet" aria-hidden="true" hidden><img alt="" draggable="false"><canvas hidden></canvas><span class="yuki-bubble" hidden></span></div>
 <button class="yuki-hit" hidden aria-label="${tr('Wake Yuki and chat','ゆきを起こして話す')}"></button>
 <svg class="yuki-guide-line" aria-hidden="true" hidden><path></path><circle r="5"></circle></svg><div class="yuki-target-ring" hidden></div>
 <button class="yuki-launcher" hidden aria-expanded="false" aria-controls="yuki-panel" aria-label="${tr('Wake Yuki and chat','ゆきを起こして話す')}"><span>ゆき</span><span>${tr('Tap to wake & chat','タップして起こす')}</span></button>
 <section class="yuki-panel" id="yuki-panel" role="dialog" aria-modal="false" aria-labelledby="yuki-title" hidden>
 <div class="yuki-panel-inner"><header class="yuki-heading"><h2 id="yuki-title">ゆき <span class="yuki-beta">BETA</span><small>${tr('Your little guide','小さな案内役')}</small></h2><button class="yuki-menu" aria-expanded="false" aria-controls="yuki-more" aria-label="${tr('Guide, history and settings','案内・履歴・設定')}">⋯</button><button class="yuki-close" aria-label="${tr('Close chat','チャットを閉じる')}">×</button></header>
 <div class="yuki-speech" role="log" aria-live="polite" aria-atomic="true" aria-label="${tr('Yuki says','ゆきの返事')}"></div><p class="yuki-status" role="status"></p>
 <form class="yuki-form"><textarea maxlength="1000" rows="1" aria-label="${tr('Message Yuki','ゆきへのメッセージ')}" placeholder="${tr('Talk to Yuki…','ゆきに話しかける…')}" ${online?'':'disabled'}></textarea><button type="submit" ${online?'':'disabled'}>${tr('Send','送信')}</button>
 <details class="yuki-setup"><summary>${tr('Enable AI chat · Privacy','AIチャットの利用設定')}</summary><div class="yuki-privacy"><label><input type="checkbox" class="yuki-consent" ${online?'':'disabled'}>${tr('Send my message and recent chat to Cloudflare Workers AI and load Cloudflare’s bot check. Please don’t share sensitive information.','メッセージと直近の会話をCloudflare Workers AIに送信し、Cloudflareのボット認証を読み込みます。個人情報・機密情報は入力しないでください。')}</label><span>${tr('Free AI has usage limits. Recent messages stay in this tab for 30 minutes. Clear them in the menu.','無料AIには利用上限があります。会話はこのタブ内で30分間保持され、メニューから消去できます。')}</span></div><div class="yuki-verification"></div></details></form>
 <div class="yuki-more" id="yuki-more" hidden><div class="yuki-guide">${Object.keys(paths).map(k=>`<button data-guide="${k}">${names[k]} ↗</button>`).join('')}</div>
 <input class="yuki-search" type="search" aria-label="${tr('Find a page or section','ページや項目を探す')}" placeholder="${tr('Find a project, page or section…','作品・ページ・項目を探す…')}"><div class="yuki-destinations"></div>
 <details class="yuki-history"><summary>${tr('Conversation history','会話の履歴')}</summary><div class="yuki-log" aria-label="${tr('Conversation','会話')}"></div></details>
 <div class="yuki-settings"><button data-action="roam"></button><button data-action="pause"></button><button data-action="hide"></button><button data-action="clear">${tr('Clear chat','会話を消去')}</button></div></div></div></section>`;
 const status=text=>{$('.yuki-status').textContent=text;};
 const offline=chatUnavailable('not-connected',ja?'ja':'en');
 const welcome=tr("Hi, I’m Yuki! A sleepy little dragon who loves exploring Lloyd’s work with you.",'こんにちは、ゆきです！ロイドの作品をご案内する、ちょっと眠たがりな小さなドラゴンです。');
 function drawMessages(){const log=$('.yuki-log');log.replaceChildren();$('.yuki-speech').replaceChildren();if(!messages.length)addMessage('assistant',welcome,false);else for(const m of messages)addMessage(m.role,m.text,false);}
 function addMessage(role,text,remember=true,sources=[]){
  if(remember){messages.push({role,text});messages=messages.slice(-12);}
  const p=document.createElement('p');p.className='yuki-message';p.dataset.role=role;const label=document.createElement('strong');label.textContent=role==='user'?tr('YOU','あなた'):'ゆき';p.append(label,document.createTextNode(text));
  $('.yuki-log').append(p.cloneNode(true));$('.yuki-log').scrollTop=$('.yuki-log').scrollHeight;
  if(role==='assistant'){
   if(sources.length){const links=document.createElement('span');links.className='yuki-sources';for(const s of sources){const url=localizePath(s.url,knowledge,ja?'ja':'en',base);if(!url)continue;const a=document.createElement('a');a.href=url;a.textContent=s.title;const show=document.createElement('button');show.textContent=tr('Show me','案内して');show.setAttribute('aria-label',tr('Show me: ','案内して：')+s.title);show.onclick=()=>visit(url,s.title);links.append(a,show);}p.append(links);}
   $('.yuki-speech').replaceChildren(p);$('.yuki-speech').scrollTop=0;
  }if(remember)save();
 }
 function save(){try{const r=companion?.rover;sessionStorage.setItem('yuki-session-v1',JSON.stringify({savedAt:Date.now(),mobilityVersion:2,awake:companion?companion.lifecycle.state!=='sleep':saved.awake,hidden,paused,roam,messages,x:r?r.foot.x/innerWidth:saved.x,y:r?r.foot.y/innerHeight:saved.y}));}catch{}}
 function settingLabels(){for(const [k,text] of Object.entries({roam:roam?tr('Stay nearby','ここで休む'):tr('Explore','お散歩'),pause:paused?tr('Resume','再開'):tr('Pause','一時停止'),hide:hidden?tr('Show Yuki','ゆきを表示'):tr('Hide Yuki','ゆきを隠す')}))$(`[data-action="${k}"]`).textContent=text;}
 drawMessages();status(online?tr('Ready when you are.','いつでもどうぞ。'):offline);settingLabels();
 function panel(value,{restoreFocus=true}={}){open=value;$('.yuki-panel').hidden=!value;$('.yuki-launcher').setAttribute('aria-expanded',String(value));
  if(value){if(hidden){hidden=false;sync();}wake();$('.yuki-close').focus({preventScroll:true});}
  else if(restoreFocus){const returnFocus=!hidden?$('.yuki-hit'):$('.yuki-launcher');if(!returnFocus.hidden)returnFocus.focus({preventScroll:true});}placeBubble();save();}
 $('.yuki-launcher').onclick=()=>panel(!open);$('.yuki-close').onclick=()=>panel(false);$('.yuki-hit').onclick=()=>panel(true);
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
 const travel=['rest','takeoff','landing','flight','flightHover','flightLeft','flightRight','pointLeft','pointRight'];
 async function prepareTravel(){await ensure([...travel,'wake','bedtime','crash']);companion.lifecycle.crashChance=.02;companion.lifecycle.inactivityMs=90000;if(motion)motion.prepared=true;}
 async function wake(){if(!ready)return;try{await ensure(['wake','bedtime']);companion.lifecycle.inactivityMs=90000;companion.lifecycle.wake();companion.lifecycle.activity();save();}catch{status(tr('Some animation artwork could not load. Please try again.','アニメーションを読み込めませんでした。もう一度お試しください。'));}}
 const elements=Object.entries(paths).map(([id,path])=>({id,name:names[id],el:document.querySelector(id==='projects'?'#projects, .fp-project-list':id==='essays'?'#essays, .fp-essay-list':id==='unreal'?'#unreal-journey, .fp-timeline':'.fp-resume-head')})).filter(d=>d.el);
 function measure(){
  layout=viewportLayout();bodyHeight=layout.bodyHeight;
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
  const height=vv?.height??innerHeight,offset=vv?.offsetTop??0;
  panel.style.setProperty('--yuki-bubble-max',Math.max(100,height-24)+'px');
  const pos=bubblePlacement(shownFoot,{...layout,height},panel.offsetWidth,panel.offsetHeight,offset);
  Object.assign(panel.style,{left:pos.left+'px',top:pos.top+'px'});panel.style.setProperty('--yuki-tail',pos.tail+'px');panel.dataset.below=String(pos.below);
 }
 function chooseMovementTarget(){
  const opposite=shownFoot.x>layout.width/2?layout.alternate:layout.home;
  const preferred=motion?.scrolling?{x:shownFoot.x,y:layout.height*.76}:opposite;
  return visibleSpot(restingExtent(),obstacles,layout,preferred);
 }
 function sync(){measure();if(companion){companion.rover.hidden=hidden;companion.rover.playing=!paused;companion.setLessMotion(media.matches);}settingLabels();save();render();}

 const sections=[...document.querySelectorAll('main h1, main h2, main h3')].filter(el=>el.textContent.trim()).map((el,i)=>({id:'section-'+i,name:el.textContent.trim(),el}));
 function destinationList(){
  const q=$('.yuki-search').value.trim().toLocaleLowerCase(),list=$('.yuki-destinations');list.replaceChildren();
  const items=[...sections.map(s=>({title:s.name,action:()=>showElement(s)})),...localizedPages(knowledge,ja?'ja':'en',base).map(p=>({...p,action:()=>visit(p.url,p.title)}))];
  const seen=new Set();for(const item of items){if(!item.title.toLocaleLowerCase().includes(q)||seen.has(item.title))continue;seen.add(item.title);const b=document.createElement('button');b.textContent=item.title;b.onclick=item.action;list.append(b);}
  if(!list.childElementCount)list.textContent=tr('No matching page or section.','一致するページ・項目がありません。');
 }
 $('.yuki-search').oninput=destinationList;destinationList();
 async function visit(path,title){
  const url=localizePath(path,knowledge,ja?'ja':'en',base);if(!url)return;
  const el=findPageTarget(document,url,location.pathname);
  // Navigation links aren't a substitute for a project's actual page/card.
  if(el&&!el.closest('.fp-nav')){await showElement({id:'page-'+url,name:title,el});return;}
  try{sessionStorage.setItem('yuki-guide-v1',JSON.stringify({url,at:Date.now()}));}catch{}
  save();location.assign(url);
 }
 async function showElement(d){
  if(!ready)return;status(tr('I’ll show you…','ご案内します…'));
  try{await prepareTravel();await wake();paused=false;hidden=false;sync();
   guide.destinations.set(d.id,d);panel(false,{restoreFocus:false});document.activeElement?.blur();guide.request(d.id);
  }catch{d.el.scrollIntoView({block:'center'});status(tr('The item is here; my flight could not load.','こちらの項目です。飛行アニメーションを読み込めませんでした。'));}
 }
 function revealTarget(id){
  const d=guide.destinations.get(id);if(!d?.el?.isConnected)return;
  const card=d.el.closest('.fp-feature');if(card)card.dispatchEvent(new CustomEvent('yuki:reveal-card',{bubbles:true}));
  guideScrollUntil=performance.now()+400;
  d.el.scrollIntoView({block:'center',inline:'nearest',behavior:'instant'});
  const rect=targetRect(d.el);guideTarget=d;highlightUntil=Infinity;
  obstacles=obstacleReader.read(layout.width,layout.height);
  const target=guideSpot(rect,restingExtent(),obstacles,layout,bodyHeight);
  const r=companion.rover;upsert({id,...target,autonomous:false});r.setArrivalStyle('land');
 }
 function drawPointer(){
  const svg=$('.yuki-guide-line'),ring=$('.yuki-target-ring'),el=guideTarget?.el;
  const show=!hidden&&!open&&el?.isConnected&&performance.now()<highlightUntil;
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
 for(const b of root.querySelectorAll('[data-action]'))b.onclick=async()=>{const a=b.dataset.action;if(a==='clear'){controller?.abort();reactionVersion++;messages=[];drawMessages();status(online?tr('Conversation cleared.','会話を消去しました。'):offline);pendingCue=null;}
  if(a==='hide'){hidden=!hidden;if(hidden){controller?.abort();reactionVersion++;pendingCue=null;panel(false);}}if(a==='pause')paused=!paused;
  if(a==='roam'&&ready){b.disabled=true;try{await prepareTravel();await wake();roam=!roam;if(roam)motion.nextRoam=motion.clock;}catch{status(tr('Flight artwork is unavailable. Please retry.','飛行アニメーションを読み込めませんでした。'));}finally{b.disabled=false;}}
  sync();};
 for(const b of root.querySelectorAll('[data-guide]'))b.onclick=async()=>{
  const id=b.dataset.guide,d=elements.find(d=>d.id===id);b.disabled=true;
  try{if(d)await showElement({...d,el:d.el.querySelector('h1,h2,h3')??d.el});else await visit(base+(ja?'/ja':'')+paths[id],names[id]);}finally{b.disabled=false;}
 };
 let reactionVersion=0;
 async function react(cue){const version=++reactionVersion;if(cue.emotion==='neutral'&&cue.gesture==='none')cue={...cue,gesture:'talkExplain'};
  const key=cue.gesture==='wave'?'greeting':cue.emotion!=='neutral'?cue.emotion:cue.gesture==='talkOpen'?'talkOpen':'talkExplain';
  const air=airClips[key];await ensure([key,...(air?[air.key,air.transitionKey??'hoverTransition']:[])]);if(version===reactionVersion)pendingCue={...cue,expires:performance.now()+15000};
 }
 let verificationScript;
 async function verification(){
  if(!online||!$('.yuki-consent').checked)return;
  if(!window.turnstile){if(!verificationScript)verificationScript=new Promise((resolve,reject)=>{const script=document.createElement('script');script.id='yuki-turnstile-script';script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';script.onload=resolve;script.onerror=()=>{script.remove();verificationScript=null;reject(Error('Verification unavailable'));};document.head.append(script);});await verificationScript;}
  if(!$('.yuki-consent').checked)return;
  if(widget===null)widget=window.turnstile.render($('.yuki-verification'),{sitekey:root.dataset.siteKey,action:'yuki-chat',size:'flexible',callback:v=>{token=v;$('.yuki-setup').open=false;status(tr('Ready when you are.','いつでもどうぞ。'));},'expired-callback':()=>{token='';},'error-callback':()=>{token='';$('.yuki-setup').open=true;}});
 }
 $('.yuki-consent').onchange=()=>{if($('.yuki-consent').checked)verification().catch(()=>status(tr('Verification could not load. Please retry.','認証を読み込めませんでした。もう一度お試しください。')));else{controller?.abort();reactionVersion++;pendingCue=null;status(tr('Chat consent withdrawn. You can still use the guide buttons.','送信への同意を取り消しました。案内ボタンは引き続き使えます。'));token='';if(widget!==null){window.turnstile.remove(widget);widget=null;}}};
 $('.yuki-form').onsubmit=async e=>{
  e.preventDefault();if(!online||busy)return;const text=$('textarea').value.trim();if(!text)return;
  if(!$('.yuki-consent').checked){$('.yuki-setup').open=true;status(tr('Please allow sending your message first.','送信への同意を確認してください。'));$('.yuki-consent').focus();return;}
  if(!token){$('.yuki-setup').open=true;status(tr('Please complete the verification first.','先に認証を完了してください。'));await verification().catch(()=>{});return;}
  const history=messages.slice(-6).map(m=>({role:m.role,content:m.text}));addMessage('user',text);$('textarea').value='';busy=true;$('button[type=submit]').disabled=true;controller=new AbortController();const timer=setTimeout(()=>{status(tr('Yuki took too long to answer. Please try again.','回答が時間内に届きませんでした。もう一度お試しください。'));controller.abort();},45000);
  try{await wake();status(tr('Yuki is thinking…','ゆきが考えています…'));react({text:'…',emotion:'thoughtful',gesture:'none'}).catch(()=>{});
   const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:text,history,lang:ja?'ja':'en',page:location.pathname,token}),signal:controller.signal,credentials:'omit'});
   if(!response.ok){const detail=await response.json().catch(()=>({}));throw Object.assign(Error(response.status===429?'limit':response.status===403?'verification':'request'),{reference:detail.reference});}
   const cue=validReply(await response.json());if(controller.signal.aborted)return;addMessage('assistant',cue.text,true,cue.sources);
   if(paths[cue.destination]&&!cue.sources.length){const button=document.createElement('button');button.textContent=tr('Show me: ','案内して：')+names[cue.destination];button.onclick=()=>$(`[data-guide="${cue.destination}"]`).click();$('.yuki-speech').lastElementChild.append(button);}
   status(tr('AI can make mistakes. Check the linked portfolio pages.','AIは誤ることがあります。リンク先の作品ページもご確認ください。'));react(cue).catch(()=>{});
  }catch(error){if(!controller.signal.aborted)status(chatUnavailable(error.message,ja?'ja':'en',error.reference));reactionVersion++;pendingCue=null;}
  finally{clearTimeout(timer);busy=false;$('button[type=submit]').disabled=false;token='';if(widget!==null)window.turnstile.reset(widget);save();}
 };
 function render(){if(!companion)return;const r=companion.rover,life=companion.lifecycle;
  let p=projectFrame(companion,clips,bodyHeight);if(!p.frame?.image)return;
  containRover(r,restingExtent(),layout);p=projectFrame(companion,clips,bodyHeight);
  shownFoot={...p.foot};
  const occupied=atFoot(shownFoot,poseExtent(p)),b=life.bubble;
  if(b){const [nx,ny]=p.frame.nose,rad=(media.matches?12:b.radius)*p.scale;occupied.left=Math.min(occupied.left,p.x+nx*p.scale-1.8*rad);occupied.top=Math.min(occupied.top,p.y+ny*p.scale-.4*rad);occupied.right=Math.max(occupied.right,p.x+nx*p.scale+.2*rad);occupied.bottom=Math.max(occupied.bottom,p.y+ny*p.scale+1.6*rad);}
  clear=fits(occupied,obstacles,layout);
  // Content avoidance picks the destination, never toggles frame visibility.
  // Both dimensions use the same scale; no crowd-dependent compression.
  const pet=$('.yuki-pet'),img=pet.querySelector('img'),canvas=pet.querySelector('canvas');pet.hidden=hidden;if(img.src!==p.frame.image.src)img.src=p.frame.image.src;
  const breathing=!life.locked&&r.graph.state==='rest'&&!p.isGreeting&&!p.isEmotion&&!p.isAttention&&!media.matches&&companion.idle.amount>0;
  const drawn=breathing&&renderer?.draw(p.frame.image,companion.idle.pose,p.info.width*p.scale);canvas.hidden=!drawn;img.style.visibility=drawn?'hidden':'visible';
  Object.assign(pet.style,{width:p.info.width*p.scale+'px',height:p.info.height*p.scale+'px',transform:`translate3d(${p.x}px,${p.y}px,0)`});
  const box=p.frame.pixelBounds??[210,170,515,615],hit=$('.yuki-hit');hit.hidden=hidden;Object.assign(hit.style,{left:p.x+box[0]*p.scale+'px',top:p.y+box[1]*p.scale+'px',width:(box[2]-box[0])*p.scale+'px',height:(box[3]-box[1])*p.scale+'px'});
  hit.title=tr('Yuki · BETA','ゆき · BETA');
  hit.setAttribute('aria-label',life.state==='sleep'?tr('Wake Yuki and chat','ゆきを起こして話す'):tr('Chat with Yuki','ゆきと話す'));
  const bubble=$('.yuki-bubble');bubble.hidden=!b||hidden;if(b){const [nx,ny]=p.frame.nose,rad=(media.matches?12:b.radius)*p.scale;Object.assign(bubble.style,{left:nx*p.scale-1.8*rad+'px',top:ny*p.scale-.4*rad+'px',width:2*rad+'px',height:2*rad+'px'});}
  Object.assign(pet.dataset,{state:r.graph.state,lifecycle:life.state,breathing:String(Boolean(drawn)),art:p.frame.file,emotion:companion.emotion.kind??'neutral',clear:String(clear),bounds:JSON.stringify(occupied)});
  $('.yuki-launcher span:last-child').textContent=hidden?tr('Show Yuki','ゆきを表示'):life.state==='sleep'?tr('Tap to wake & chat','タップして起こす'):tr('Talk to Yuki','ゆきと話す');
  const launcher=$('.yuki-launcher');
  launcher.setAttribute('aria-label',hidden?tr('Show Yuki','ゆきを表示'):tr('Chat with Yuki','ゆきと話す'));
  launcher.hidden=!hidden||open;Object.assign(launcher.style,{left:layout.width-50+'px',top:layout.height-50+'px'});
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
 function tick(t){const dt=Math.min(64,Math.max(0,t-last));last=t;if(companion&&!document.hidden){if(open||busy)companion.lifecycle.activity();
   if(t-lastMeasure>200){obstacles=obstacleReader.read(layout.width,layout.height);movementTarget=chooseMovementTarget();lastMeasure=t;}
   const canImprove=fits(atFoot(movementTarget,restingExtent()),obstacles,layout);
   motion.update(dt,{hidden,paused,guiding:guide.active,open,roam,target:movementTarget,currentClear:clear||!canImprove});companion.update(dt);guide.update();
   if(pendingCue&&performance.now()>pendingCue.expires)pendingCue=null;
   if(pendingCue&&applyReplyCue(companion,pendingCue).animationAccepted)pendingCue=null;render();if(t-lastTrim>5000){trimArt();lastTrim=t;}}requestAnimationFrame(tick);}
 try{
  const res=await fetch(new URL('manifest.json',assets));if(!res.ok)throw Error('manifest');({clips}=await res.json());await ensure(['sleep','rest']);
  const timing={rest:clips.rest.frames.map(f=>f.durationMs),flight:clips.flight.frames.map(f=>f.durationMs??60),takeoff:takeoffMs,landing:landingMs};
  companion=new Companion(timing,measure(),{motion:contactPhases,idle:{},lifecycle:{clips,startAsleep:!saved.awake,inactivityMs:Infinity,crashChance:0},greeting:clips.greeting.playback,emotions:{...emotionPlayback(clips),pointLeft:clips.pointLeft.playback,pointRight:clips.pointRight.playback},airClips});
  motion=new PageMotion(companion);
  companion.rover.setArrivalStyle('land');try{renderer=new IdleRenderer($('.yuki-pet canvas'));}catch{}
  guide=new SiteGuide(companion,{destinations:elements,reveal:revealTarget,direction:id=>{const d=guide.destinations.get(id);return pointerTarget(targetRect(d.el),shownFoot).kind;},arrive:id=>{highlightUntil=performance.now()+10000;motion.nextRoam=motion.clock+18000;status(tr(`Here we are: ${guide.destinations.get(id).name}.`,`こちらが${guide.destinations.get(id).name}です。`));}});
  obstacles=obstacleReader.read(layout.width,layout.height);
  const initial=visibleSpot(restingExtent(),obstacles,layout,layout.home);
  companion.rover.position={...initial};upsert({id:'home',...initial});
  ready=true;sync();last=performance.now();requestAnimationFrame(tick);
  if(saved.awake||open)await wake();prepareTravel().catch(()=>status(tr('Some flight drawings could not load. Please reload to retry.','飛行画像を読み込めませんでした。再読み込みしてください。')));
  fetch(new URL('knowledge.json',assets)).then(r=>r.ok?r.json():Promise.reject()).then(k=>{knowledge=Array.isArray(k.pages)?k.pages:[];destinationList();}).catch(()=>{});
  let requested;try{requested=pendingGuide(sessionStorage.getItem('yuki-guide-v1'),location.pathname);sessionStorage.removeItem('yuki-guide-v1');}catch{}
  if(requested){const el=findPageTarget(document,requested,location.pathname);if(el)await showElement({id:'requested-page',name:el.textContent.trim(),el});}
 }catch{status(tr('Yuki’s artwork could not load. The website and links still work.','ゆきの画像を読み込めませんでした。サイトとリンクは利用できます。'));}
 for(const name of ['pointerdown','keydown','wheel','touchstart'])addEventListener(name,()=>companion?.lifecycle.activity(),{passive:true,capture:true});
 media.addEventListener('change',sync);addEventListener('resize',()=>{measure();lastMeasure=-Infinity;});
 addEventListener('scroll',()=>{if(!ready)return;lastMeasure=-Infinity;if(performance.now()<guideScrollUntil)return;
  // A visitor changing the view takes priority over a stale guided route.
  if(guideTarget){guide.reset();guideTarget=null;highlightUntil=0;}
  motion.scroll();},{passive:true});
 window.visualViewport?.addEventListener('resize',placeBubble);window.visualViewport?.addEventListener('scroll',placeBubble);
 addEventListener('pagehide',save);
 document.addEventListener('visibilitychange',()=>{last=performance.now();if(document.hidden)save();});
}
