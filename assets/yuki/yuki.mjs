import {Companion} from './runtime/companion.mjs';
import {projectFrame} from './runtime/projection.mjs';
import {IdleRenderer} from './runtime/idle-renderer.mjs';
import {takeoffMs,landingMs,contactPhases} from './runtime/timing.mjs';
import {airClips} from './runtime/air-reactions.mjs';
import {emotionPlayback,applyReplyCue} from './runtime/reply-cues.mjs';
import {SiteGuide,elementPerch} from './runtime/site-guide.mjs';
import {validReply,safeSitePath,readSession,chatUnavailable} from './protocol.mjs?v=2';

const root=document.querySelector('#yuki-companion');
if(root)start().catch(()=>{root.textContent='';}); // Portfolio remains usable on failure.
async function start(){
 const ja=document.documentElement.lang==='ja',base=root.dataset.base||'',assets=new URL(root.dataset.assets,location.href);
 const tr=(en,jp)=>ja?jp:en,$=s=>root.querySelector(s),media=matchMedia('(prefers-reduced-motion: reduce)');
 let saved={};try{saved=readSession(sessionStorage);}catch{}
 let messages=saved.messages??[],companion,guide,renderer,clips,bodyHeight=155,last=0,loading=0,busy=false,pendingCue=null,controller,token='',widget=null;
 let hidden=saved.hidden??false,paused=saved.paused??false,roam=saved.roam??false,open=false,ready=false;
 const paths={projects:'/projects/',essays:'/essays/',unreal:'/unreal-journey/',resume:'/resume.html'};
 const names={projects:'Projects',essays:'Essays',unreal:'Unreal Journey',resume:'Resume'};
 const endpoint=(()=>{try{const u=new URL(root.dataset.endpoint);return u.protocol==='https:'?u.href:'';}catch{return '';}})();
 const online=Boolean(endpoint&&root.dataset.siteKey);
 root.innerHTML=`<div class="yuki-pet" aria-hidden="true" hidden><img alt="" draggable="false"><canvas hidden></canvas><span class="yuki-bubble" hidden></span></div>
 <button class="yuki-hit" hidden aria-label="${tr('Wake Yuki and chat','ゆきを起こして話す')}"></button>
 <button class="yuki-launcher" aria-expanded="false" aria-controls="yuki-panel"><span>ゆき</span><span>${tr('A little company','小さな案内役')}</span><span class="yuki-dot"></span></button>
 <section class="yuki-panel" id="yuki-panel" role="dialog" aria-modal="false" aria-labelledby="yuki-title" hidden>
 <header class="yuki-heading"><div><h2 id="yuki-title">ゆき <small>Yuki</small></h2><small>${tr('Your little portfolio companion','ポートフォリオの小さな案内役')}</small></div><button class="yuki-close" aria-label="${tr('Close chat','チャットを閉じる')}">×</button></header>
 <div class="yuki-log" role="log" aria-live="polite" aria-label="${tr('Conversation','会話')}"></div><p class="yuki-status" role="status"></p>
 <div class="yuki-guide">${Object.keys(paths).map(k=>`<button data-guide="${k}">${names[k]} ↗</button>`).join('')}</div>
 <form class="yuki-form"><label class="yuki-privacy">${tr('Ask about Yuki or the portfolio.','ゆきや作品について聞いてみてください。')}</label><textarea maxlength="1000" rows="2" aria-label="${tr('Message Yuki','ゆきへのメッセージ')}" placeholder="${tr('What would you like to explore?','何を見てみたいですか？')}" ${online?'':'disabled'}></textarea><button type="submit" ${online?'':'disabled'}>${tr('Send','送信')}</button>
 <div class="yuki-privacy"><label><input type="checkbox" class="yuki-consent" ${online?'':'disabled'}>${tr('Send my message and recent chat to Cloudflare Workers AI and load Cloudflare’s bot check. Please don’t share sensitive information.','メッセージと直近の会話をCloudflare Workers AIに送信し、Cloudflareのボット認証を読み込みます。個人情報・機密情報は入力しないでください。')}</label><span>${tr('Free AI chat has usage limits. This tab remembers recent messages for 30 minutes. Clear them below.','無料AIチャットには利用上限があります。直近の会話はこのタブ内で30分間保持されます。下のボタンで消去できます。')}</span></div><div class="yuki-verification"></div></form>
 <div class="yuki-settings"><button data-action="roam"></button><button data-action="pause"></button><button data-action="hide"></button><button data-action="clear">${tr('Clear chat','会話を消去')}</button></div></section>`;
 const status=text=>{$('.yuki-status').textContent=text;};
 const offline=chatUnavailable('not-connected',ja?'ja':'en');
 const welcome=tr("Hi, I’m Yuki! A sleepy little dragon who loves exploring Lloyd’s work with you.",'こんにちは、ゆきです！ロイドの作品をご案内する、ちょっと眠たがりな小さなドラゴンです。');
 function drawMessages(){const log=$('.yuki-log');log.replaceChildren();if(!messages.length)addMessage('assistant',welcome,false);else for(const m of messages)addMessage(m.role,m.text,false);}
 function addMessage(role,text,remember=true,sources=[]){
  if(remember){messages.push({role,text});messages=messages.slice(-12);}
  const p=document.createElement('p');p.className='yuki-message';p.dataset.role=role;const label=document.createElement('strong');label.textContent=role==='user'?tr('YOU','あなた'):'ゆき';p.append(label,document.createTextNode(text));
  if(sources.length){const links=document.createElement('span');links.className='yuki-sources';for(const s of sources){const url=safeSitePath(s.url,base);if(!url)continue;const a=document.createElement('a');a.href=url;a.textContent=s.title;links.append(a);}p.append(links);}
  $('.yuki-log').append(p);$('.yuki-log').scrollTop=$('.yuki-log').scrollHeight;if(remember)save();
 }
 function save(){try{const r=companion?.rover;sessionStorage.setItem('yuki-session-v1',JSON.stringify({savedAt:Date.now(),awake:companion?companion.lifecycle.state!=='sleep':saved.awake,hidden,paused,roam,messages,x:r?r.foot.x/innerWidth:saved.x,y:r?r.foot.y/innerHeight:saved.y}));}catch{}}
 function settingLabels(){for(const [k,text] of Object.entries({roam:roam?tr('Stay nearby','ここで休む'):tr('Explore','お散歩'),pause:paused?tr('Resume','再開'):tr('Pause','一時停止'),hide:hidden?tr('Show Yuki','ゆきを表示'):tr('Hide Yuki','ゆきを隠す')}))$(`[data-action="${k}"]`).textContent=text;}
 drawMessages();status(online?tr('Ready when you are.','いつでもどうぞ。'):offline);settingLabels();
 function panel(value){open=value;$('.yuki-panel').hidden=!value;$('.yuki-launcher').setAttribute('aria-expanded',String(value));if(value){if(hidden){hidden=false;sync();}wake();if(companion){companion.rover.setWander(false);}if(online)$('textarea').focus();else $('.yuki-close').focus();}else{$('.yuki-launcher').focus();if(companion)companion.rover.setWander(roam);}measure();save();}
 $('.yuki-launcher').onclick=()=>panel(!open);$('.yuki-close').onclick=()=>panel(false);$('.yuki-hit').onclick=()=>panel(true);
 root.addEventListener('keydown',e=>{if(e.key==='Escape'&&open){e.preventDefault();panel(false);}});
 const images=new Map(),loaded=new Map(),used=new Map();
 async function ensure(keys){
  loading++;
  try{await Promise.all([...new Set(keys)].map(key=>{used.set(key,performance.now());if(loaded.has(key))return loaded.get(key);const info=clips[key];if(!info)throw Error('Missing clip');
   const promise=(async()=>{for(let i=0;i<info.frames.length;i+=4)await Promise.all(info.frames.slice(i,i+4).map(async f=>{let p=images.get(f.file);if(!p){p=(async()=>{const im=new Image();im.src=new URL(f.file,assets).href;await im.decode();return im;})();images.set(f.file,p);p.catch(()=>images.delete(f.file));}f.image=await p;}));})();
   loaded.set(key,promise);promise.catch(()=>loaded.delete(key));return promise;}));}
  finally{loading--;}
 }
 const travel=['rest','takeoff','landing','flight','flightHover','flightLeft','flightRight','pointLeft','pointRight'];
 async function prepareTravel(){await ensure([...travel,'wake','bedtime','crash']);companion.lifecycle.crashChance=.02;companion.lifecycle.inactivityMs=90000;}
 async function wake(){if(!ready)return;try{await ensure(['wake','bedtime']);companion.lifecycle.inactivityMs=90000;companion.lifecycle.wake();companion.lifecycle.activity();save();}catch{status(tr('Some animation artwork could not load. Please try again.','アニメーションを読み込めませんでした。もう一度お試しください。'));}}
 const elements=Object.entries(paths).map(([id,path])=>({id,name:names[id],el:document.querySelector(id==='projects'?'#projects, .fp-project-list':id==='essays'?'#essays, .fp-essay-list':id==='unreal'?'#unreal-journey, .fp-timeline':'.fp-resume-head')})).filter(d=>d.el);
 function measure(){bodyHeight=innerWidth<700?112:155;const margin=Math.min(innerWidth*.25,bodyHeight*.75),bottom=innerHeight-82;
  const leftY=open&&innerWidth<600?Math.max(bodyHeight+22,$('.yuki-panel').getBoundingClientRect().top-14):bottom;
  const p=[{id:'home',name:'Nearby',x:margin,y:leftY},{id:'right',name:'Right side',x:innerWidth-margin,y:bottom},{id:'high',name:'High perch',x:innerWidth-margin,y:Math.max(bodyHeight+80,innerHeight*.42)}];
  if(saved.awake&&Number.isFinite(saved.x))p.push({id:'last-position',name:'Last resting place',x:Math.max(margin,Math.min(innerWidth-margin,saved.x*innerWidth)),y:Math.max(bodyHeight+22,Math.min(bottom,saved.y*innerHeight)),autonomous:false});
  for(const d of elements)p.push(elementPerch(d.el.getBoundingClientRect(),{...d,width:innerWidth,height:innerHeight,bodyHeight}));
  if(open){const box=$('.yuki-panel').getBoundingClientRect(),clearance=bodyHeight*.9+12;
   for(const perch of p)if(perch.x+clearance>box.left&&perch.x-clearance<box.right&&perch.y>box.top&&perch.y-bodyHeight<box.bottom){
    if(box.left>clearance*2+12)perch.x=box.left-clearance-12;
    else perch.y=Math.max(bodyHeight+22,box.top-14);
   }
  }
  companion?.rover.setPerches(p);return p;
 }
 function sync(){if(companion){companion.rover.hidden=hidden;companion.rover.playing=!paused;companion.setLessMotion(media.matches);}settingLabels();save();render();}
 for(const b of root.querySelectorAll('[data-action]'))b.onclick=async()=>{const a=b.dataset.action;if(a==='clear'){controller?.abort();reactionVersion++;messages=[];drawMessages();status(online?tr('Conversation cleared.','会話を消去しました。'):offline);pendingCue=null;}
  if(a==='hide'){hidden=!hidden;if(hidden){controller?.abort();reactionVersion++;pendingCue=null;}}if(a==='pause')paused=!paused;
  if(a==='roam'&&ready){b.disabled=true;try{await prepareTravel();await wake();roam=!roam;companion.rover.setWander(roam);}catch{status(tr('Flight artwork is unavailable. Please retry.','飛行アニメーションを読み込めませんでした。'));}finally{b.disabled=false;}}
  sync();};
 for(const b of root.querySelectorAll('[data-guide]'))b.onclick=async()=>{
  const id=b.dataset.guide,d=elements.find(d=>d.id===id);if(!d){await wake();save();location.assign(base+(ja?'/ja':'')+paths[id]);return;}
  b.disabled=true;try{status(tr('Getting ready to show you…','ご案内の準備中です…'));await prepareTravel();await wake();paused=false;hidden=false;roam=false;sync();panel(false);guide.request(id);}catch{status(tr('I couldn’t load the flight. The section is still available below.','飛行を読み込めませんでした。目的の項目は下にあります。'));d.el.scrollIntoView({block:'start'});}finally{b.disabled=false;}
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
  if(widget===null)widget=window.turnstile.render($('.yuki-verification'),{sitekey:root.dataset.siteKey,action:'yuki-chat',callback:v=>{token=v;},'expired-callback':()=>{token='';},'error-callback':()=>{token='';}});
 }
 $('.yuki-consent').onchange=()=>{if($('.yuki-consent').checked)verification().catch(()=>status(tr('Verification could not load. Please retry.','認証を読み込めませんでした。もう一度お試しください。')));else{controller?.abort();reactionVersion++;pendingCue=null;status(tr('Chat consent withdrawn. You can still use the guide buttons.','送信への同意を取り消しました。案内ボタンは引き続き使えます。'));token='';if(widget!==null){window.turnstile.remove(widget);widget=null;}}};
 $('.yuki-form').onsubmit=async e=>{
  e.preventDefault();if(!online||busy)return;const text=$('textarea').value.trim();if(!text)return;
  if(!$('.yuki-consent').checked){status(tr('Please allow sending your message first.','送信への同意を確認してください。'));return;}
  if(!token){status(tr('Please complete the verification first.','先に認証を完了してください。'));await verification().catch(()=>{});return;}
  const history=messages.slice(-6).map(m=>({role:m.role,content:m.text}));addMessage('user',text);$('textarea').value='';busy=true;$('button[type=submit]').disabled=true;controller=new AbortController();const timer=setTimeout(()=>{status(tr('Yuki took too long to answer. Please try again.','回答が時間内に届きませんでした。もう一度お試しください。'));controller.abort();},45000);
  try{await wake();status(tr('Yuki is thinking…','ゆきが考えています…'));react({text:'…',emotion:'thoughtful',gesture:'none'}).catch(()=>{});
   const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:text,history,lang:ja?'ja':'en',page:location.pathname,token}),signal:controller.signal,credentials:'omit'});
   if(!response.ok){const detail=await response.json().catch(()=>({}));throw Object.assign(Error(response.status===429?'limit':response.status===403?'verification':'request'),{reference:detail.reference});}
   const cue=validReply(await response.json());if(controller.signal.aborted)return;addMessage('assistant',cue.text,true,cue.sources);
   if(paths[cue.destination]){const button=document.createElement('button');button.textContent=tr('Show me: ','案内して：')+names[cue.destination];button.onclick=()=>$(`[data-guide="${cue.destination}"]`).click();$('.yuki-log').lastElementChild.append(button);}
   status(tr('AI can make mistakes. Check the linked portfolio pages.','AIは誤ることがあります。リンク先の作品ページもご確認ください。'));react(cue).catch(()=>{});
  }catch(error){if(!controller.signal.aborted)status(chatUnavailable(error.message,ja?'ja':'en',error.reference));reactionVersion++;pendingCue=null;}
  finally{clearTimeout(timer);busy=false;$('button[type=submit]').disabled=false;token='';if(widget!==null)window.turnstile.reset(widget);save();}
 };
 function render(){if(!companion)return;const r=companion.rover,life=companion.lifecycle,p=projectFrame(companion,clips,bodyHeight);if(!p.frame?.image)return;
  const pet=$('.yuki-pet'),img=pet.querySelector('img'),canvas=pet.querySelector('canvas');pet.hidden=hidden;if(img.src!==p.frame.image.src)img.src=p.frame.image.src;
  const breathing=!life.locked&&r.graph.state==='rest'&&!p.isGreeting&&!p.isEmotion&&!p.isAttention&&!media.matches&&companion.idle.amount>0;
  const drawn=breathing&&renderer?.draw(p.frame.image,companion.idle.pose,p.info.width*p.scale);canvas.hidden=!drawn;img.style.visibility=drawn?'hidden':'visible';
  Object.assign(pet.style,{width:p.info.width*p.scale+'px',height:p.info.height*p.scale+'px',transform:`translate3d(${p.x}px,${p.y}px,0)`});
  const box=p.frame.bounds??[210,170,515,615],hit=$('.yuki-hit');hit.hidden=hidden||paused;Object.assign(hit.style,{left:p.x+box[0]*p.scale+'px',top:p.y+box[1]*p.scale+'px',width:(box[2]-box[0])*p.scale+'px',height:(box[3]-box[1])*p.scale+'px'});
  hit.setAttribute('aria-label',life.state==='sleep'?tr('Wake Yuki and chat','ゆきを起こして話す'):tr('Chat with Yuki','ゆきと話す'));
  const bubble=$('.yuki-bubble'),b=life.bubble;bubble.hidden=!b||hidden;if(b){const [nx,ny]=p.frame.nose,rad=(media.matches?12:b.radius)*p.scale;Object.assign(bubble.style,{left:nx*p.scale-1.8*rad+'px',top:ny*p.scale-.4*rad+'px',width:2*rad+'px',height:2*rad+'px'});}
  Object.assign(pet.dataset,{state:r.graph.state,lifecycle:life.state,breathing:String(Boolean(drawn)),art:p.frame.file,emotion:companion.emotion.kind??'neutral'});
 }
 let lastTrim=0;
 function trimArt(){
  if(loading||pendingCue||busy)return;
  const keep=new Set(['rest','sleep','wake','bedtime',companion.emotion.kind]);
  if(companion.greeting.active||companion.greeting.requested)keep.add('greeting');
  if(companion.lifecycle.locked)keep.add(companion.lifecycle.state);
  if(roam||guide.active||companion.rover.graph.state!=='rest')for(const k of [...travel,'crash'])keep.add(k);
  if(companion.airReaction){keep.add(companion.airReaction.key);keep.add(companion.airReaction.transitionKey??'hoverTransition');}
  let count=[...loaded.keys()].reduce((n,k)=>n+clips[k].frames.length,0);
  for(const k of [...loaded.keys()].sort((a,b)=>(used.get(a)||0)-(used.get(b)||0))){if(count<=180)break;if(keep.has(k))continue;count-=clips[k].frames.length;loaded.delete(k);for(const f of clips[k].frames)delete f.image;}
  const referenced=new Set(Object.values(clips).flatMap(c=>c.frames.filter(f=>f.image).map(f=>f.file)));
  for(const file of images.keys())if(!referenced.has(file))images.delete(file);
 }
 function tick(t){const dt=Math.min(64,Math.max(0,t-last));last=t;if(companion&&!document.hidden){if(open||busy)companion.lifecycle.activity();companion.update(dt);guide.update();
   if(pendingCue&&performance.now()>pendingCue.expires)pendingCue=null;
   if(pendingCue&&applyReplyCue(companion,pendingCue).animationAccepted)pendingCue=null;render();if(t-lastTrim>5000){trimArt();lastTrim=t;}}requestAnimationFrame(tick);}
 try{
  const res=await fetch(new URL('manifest.json',assets));if(!res.ok)throw Error('manifest');({clips}=await res.json());await ensure(['sleep','rest']);
  const timing={rest:clips.rest.frames.map(f=>f.durationMs),flight:clips.flight.frames.map(f=>f.durationMs??60),takeoff:takeoffMs,landing:landingMs};
  companion=new Companion(timing,measure(),{motion:contactPhases,idle:{},lifecycle:{clips,startAsleep:!saved.awake,inactivityMs:Infinity,crashChance:0},greeting:clips.greeting.playback,emotions:{...emotionPlayback(clips),pointLeft:clips.pointLeft.playback,pointRight:clips.pointRight.playback},airClips});
  if(saved.awake&&Number.isFinite(saved.x)){companion.rover.at='last-position';companion.rover.wanted='last-position';companion.rover.position={...companion.rover.point('last-position')};}
  companion.rover.setArrivalStyle('auto');try{renderer=new IdleRenderer($('.yuki-pet canvas'));}catch{}
  guide=new SiteGuide(companion,{destinations:elements,reveal:id=>{elements.find(d=>d.id===id).el.scrollIntoView({block:'center',behavior:'instant'});measure();},arrive:id=>status(tr(`Here we are: ${names[id]}.`,`こちらが${names[id]}です。`))});ready=true;sync();last=performance.now();requestAnimationFrame(tick);
  if(saved.awake||open)await wake();if(roam){await prepareTravel();companion.rover.setWander(true);}
 }catch{status(tr('Yuki’s artwork could not load. The website and links still work.','ゆきの画像を読み込めませんでした。サイトとリンクは利用できます。'));}
 for(const name of ['pointerdown','keydown','wheel','touchstart'])addEventListener(name,()=>companion?.lifecycle.activity(),{passive:true,capture:true});
 media.addEventListener('change',sync);addEventListener('resize',measure);let scrollFrame=0;addEventListener('scroll',()=>{if(!scrollFrame)scrollFrame=requestAnimationFrame(()=>{scrollFrame=0;measure();});},{passive:true});addEventListener('pagehide',save);
 document.addEventListener('visibilitychange',()=>{last=performance.now();if(document.hidden)save();});
}
