import {cleanVariety,cleanStoryTopics,cleanFactTopic} from './runtime/reply-variety.mjs?v=9';
import {cleanMessages} from './runtime/conversation-language.mjs?v=8';
import {cleanReplyBeats} from './runtime/reply-beats.mjs';
import {cleanAssistantText} from './runtime/reply-text.mjs?v=2';
export {cleanAssistantText} from './runtime/reply-text.mjs?v=2';
export const emotions=['neutral','confused','delighted','thoughtful','surprised','shy','proud','reassuring','amused'];
export const destinations=['none','projects','essays','unreal','resume','garden'];
export function chatUnavailable(reason,lang='en',reference='',limit=''){
 const ja=lang==='ja';
 if(reason==='preview')return ja?'ここはローカルプレビューだよ。AIでのお話は公開サイトでできるんだ。ここでも動いたり、作品を案内したりできるよ！':'This is a local preview. We can chat with AI on the published website; I can still move around and guide you to projects here!';
 if(reason==='not-connected')return ja?'無料AIチャットはまだつながっていないんだ。下のボタンからなら、作品を案内できるよ！':'My free AI chat isn’t connected yet. I can still show you around using the buttons below!';
 if(reason==='limit'&&limit==='site-day')return ja?'今日はサイト全体のAI利用枠を使い切っちゃった。日本時間の午前9時にリセットされるよ。':'The site’s shared daily AI allowance is used up. It resets at 00:00 UTC (9 a.m. in Japan).';
 if(reason==='limit'&&limit==='visitor-day')return ja?'今日はあなたのAI利用枠を使い切っちゃった。サイト全体の上限とは別で、日本時間の午前9時にリセットされるよ。':'Your daily AI allowance is used up—not necessarily the whole site’s. It resets at 00:00 UTC (9 a.m. in Japan).';
 if(reason==='limit'&&limit==='visitor-minute')return ja?'少し急いでお話ししすぎたみたい。1分ほど待ってから、また送ってね。':'We’ve sent a few requests close together. Give me about a minute, then try again!';
 if(reason==='limit')return ja?'無料チャットの上限に達しちゃった。少し時間をおいて、また試してね。下のボタンからの案内はまだできるよ！':'We’ve reached the free chat limit. Let’s try again later—I can still guide you with the buttons below!';
 if(reason==='verification')return ja?'認証の期限が切れたか、うまく確認できなかったみたい。下の認証をもう一度済ませてから送ってね。案内ボタンはそのまま使えるよ。':'The security check expired or couldn’t be confirmed. Could you complete it below again before sending? My guide buttons still work.';
 const detail=/^YUKI_(CONFIG|INPUT|VERIFY|VISITOR|QUOTA|KNOWLEDGE|MODEL(?:_TIMEOUT|_CAPACITY)?|REPLY|VARIETY)$/.test(reference)?` (${reference})`:'';
 if(reference==='YUKI_MODEL_TIMEOUT')return (ja?'返事を考えている間に、待ち時間の上限に達しちゃった。AIチャットがオフになったわけじゃないよ。少し待って、もう一度送ってみてね。':'My reply took too long to arrive this time—AI chat hasn’t been switched off. Give me a moment, then try sending again.')+detail;
 if(reference==='YUKI_MODEL_CAPACITY')return (ja?'今はAIサービスが混み合っていて、返事が届かなかったよ。少し待って、もう一度送ってみてね。':'The AI service is busy, so my reply couldn’t get through this time. Give me a moment, then try sending again.')+detail;
 if(reference==='YUKI_MODEL')return (ja?'今回はAIサービスから返事が届かなかったよ。チャットがオフという意味ではないから、少し待ってもう一度送ってみてね。':'The AI service couldn’t return my reply this time. That doesn’t mean chat is switched off—please try again in a moment.')+detail;
 if(['YUKI_REPLY','YUKI_VARIETY'].includes(reference))return (ja?'今回の返事は、そのまま見せられる形にまとまらなかったよ。もう一度送ってくれる？':'I couldn’t get that reply into a clear, reliable form this time. Could you try sending again?')+detail;
 return (ja?'今はAIチャットがつながらなくて、回答が届いていないんだ。下のボタンからなら、作品を案内できるよ。':'My AI chat isn’t available right now, so no AI answer came through. I can still show you around using the buttons below.')+detail;
}
export function validReply(value){
 if(!value)throw Error('Invalid reply');
 const text=cleanAssistantText(value.text);if(text.length>3000)throw Error('Invalid reply');
 // Serialized duplicate sentences must not leave stale animation indices.
 const beats=text===value.text.trim()?cleanReplyBeats(value.beats,text):[];
 const factTopic=cleanFactTopic(value.factTopic),joke=value.joke===true;
 return {text,emotion:emotions.includes(value.emotion)?value.emotion:'neutral',gesture:['none','wave','talkOpen','talkExplain'].includes(value.gesture)?value.gesture:'none',destination:destinations.includes(value.destination)?value.destination:'none',sources:Array.isArray(value.sources)?value.sources.filter(s=>s&&typeof s.title==='string'&&typeof s.url==='string').slice(0,3):[],storyTopics:cleanStoryTopics(value.storyTopics),...(factTopic?{factTopic}:{}),...(joke?{joke:true}:{}),...(value.fact===true?{fact:true}:{}),...(beats.length?{beats}:{}),...(['used','limit','unavailable'].includes(value.searchStatus)?{searchStatus:value.searchStatus}:{}),...(value.notice===true&&['disabled','limit','ai-limit','no-results','answer','planning','provider','provider-limit','timeout'].includes(value.searchIssue)?{notice:true,searchIssue:value.searchIssue}:{})};
}
export function safeSitePath(value,base=''){
 if(typeof value!=='string'||!value.startsWith('/')||value.startsWith('//')||/[\\\u0000-\u0020]/.test(value)||value.includes('%'))return null;
 const url=new URL(value,'https://portfolio.invalid');
 if(url.origin!=='https://portfolio.invalid'||(base&&!url.pathname.startsWith(base+'/')))return null;
 return url.pathname+url.hash;
}
export function readSession(storage,now=Date.now(),language){
 try{const s=JSON.parse(storage.getItem('yuki-session-v1'));if(!s||!Number.isFinite(s.savedAt)||now-s.savedAt>1800000||s.savedAt>now)return {};
  // Preserve immutable original wording and cache translations per message.
  // A language change is presentation, not a request to forget the visitor.
  s.messages=cleanMessages(s.messages,s.language);
  s.language=language||(['en','ja'].includes(s.language)?s.language:undefined);
  return {language:s.language,awake:s.awake===true,chatOpen:s.chatOpen===true,hidden:s.hidden===true,paused:s.paused===true,roam:s.roam===true,mobilityVersion:s.mobilityVersion===2?2:1,x:Number.isFinite(s.x)?Math.max(.1,Math.min(.9,s.x)):.2,y:Number.isFinite(s.y)?Math.max(.25,Math.min(.9,s.y)):.8,variety:cleanVariety(s.variety),messages:Array.isArray(s.messages)?s.messages.filter(m=>['user','assistant'].includes(m.role)&&typeof m.text==='string'&&m.text.length<=(m.role==='assistant'?3000:1000)).slice(-12):[]};
 }catch{return {};}
}
