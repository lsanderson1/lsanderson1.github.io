export const emotions=['neutral','confused','delighted','thoughtful','surprised','shy','proud','reassuring','amused'];
export const destinations=['none','projects','essays','unreal','resume'];
export function chatUnavailable(reason,lang='en',reference=''){
 const ja=lang==='ja';
 if(reason==='not-connected')return ja?'無料AIチャットはまだ接続されていません。下のボタンから作品をご案内できます。':'Free AI chat is not connected yet. I can still show you around using the buttons below.';
 if(reason==='limit')return ja?'無料チャットの利用上限に達しました。時間をおいてお試しください。下の案内ボタンは引き続き使えます。':'The free chat limit has been reached. Please try again later; the guide buttons below still work.';
 if(reason==='verification')return ja?'認証の有効期限が切れたか、認証できませんでした。下の認証をもう一度完了してから送信してください。案内ボタンは引き続き使えます。':'Verification expired or could not be confirmed. Please complete the check below again before sending. The guide buttons still work.';
 const detail=/^YUKI_(CONFIG|INPUT|VERIFY|VISITOR|QUOTA|KNOWLEDGE|MODEL|REPLY)$/.test(reference)?` (${reference})`:'';
 return (ja?'現在AIチャットを利用できません。AIからの回答はありませんが、下のボタンから作品をご案内できます。':'AI chat is unavailable right now. No AI answer was received, but I can still show you around using the buttons below.')+detail;
}
export function validReply(value){
 if(!value||typeof value.text!=='string'||!value.text.trim()||value.text.length>1000)throw Error('Invalid reply');
 return {text:value.text.trim(),emotion:emotions.includes(value.emotion)?value.emotion:'neutral',gesture:['none','wave','talkOpen','talkExplain'].includes(value.gesture)?value.gesture:'none',destination:destinations.includes(value.destination)?value.destination:'none',sources:Array.isArray(value.sources)?value.sources.filter(s=>s&&typeof s.title==='string'&&typeof s.url==='string').slice(0,3):[]};
}
export function safeSitePath(value,base=''){
 if(typeof value!=='string'||!value.startsWith('/')||value.startsWith('//')||/[\\\u0000-\u0020]/.test(value)||value.includes('%'))return null;
 const url=new URL(value,'https://portfolio.invalid');
 if(url.origin!=='https://portfolio.invalid'||(base&&!url.pathname.startsWith(base+'/')))return null;
 return url.pathname+url.hash;
}
export function readSession(storage,now=Date.now()){
 try{const s=JSON.parse(storage.getItem('yuki-session-v1'));if(!s||!Number.isFinite(s.savedAt)||now-s.savedAt>1800000||s.savedAt>now)return {};
  return {awake:s.awake===true,hidden:s.hidden===true,paused:s.paused===true,roam:s.roam===true,mobilityVersion:s.mobilityVersion===2?2:1,x:Number.isFinite(s.x)?Math.max(.1,Math.min(.9,s.x)):.2,y:Number.isFinite(s.y)?Math.max(.25,Math.min(.9,s.y)):.8,messages:Array.isArray(s.messages)?s.messages.filter(m=>['user','assistant'].includes(m.role)&&typeof m.text==='string'&&m.text.length<=1000).slice(-12):[]};
 }catch{return {};}
}
