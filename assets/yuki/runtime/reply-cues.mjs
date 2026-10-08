import {calmTalkPlayback} from './talk-timing.mjs';
// A future AI can supply these semantic cues with its reply. No keyword guessing,
// external requests, HTML execution, audio, or lip-sync is performed here.
export const replyExamples={
 talkOpen:{text:"There are a few things to explore here. I can tell you about them.",emotion:'neutral',gesture:'talkOpen'},
 talkExplain:{text:"This section introduces the project and how it was made.",emotion:'neutral',gesture:'talkExplain'},
 greeting:{text:"Hi! I'm Yuki. I'm really happy you're here!",emotion:'delighted',gesture:'wave'},
 amused:{text:"Hehe! That gave me a little giggle. I like exploring with you.",emotion:'amused',gesture:'none'},
 confused:{text:"Hmm? I'm not quite sure what you mean. Could you tell me a little more?",emotion:'confused',gesture:'none'},
 delighted:{text:"You found one of my favorites! I'd love to show you around.",emotion:'delighted',gesture:'none'},
 thoughtful:{text:"Let me think… there's more than one way to approach that. Let's work it out together.",emotion:'thoughtful',gesture:'none'},
 surprised:{text:"Oh! I wasn't expecting that. Tell me more!",emotion:'surprised',gesture:'none'},
 shy:{text:"You really think so? Hehe… thank you. That means a lot to me.",emotion:'shy',gesture:'none'},
 proud:{text:"I did it! That took a little practice. Want to see what I learned?",emotion:'proud',gesture:'none'},
 reassuring:{text:"It's okay. We can take it one little step at a time. I'm here with you.",emotion:'reassuring',gesture:'none'}
};
export const emotionKinds=['confused','delighted','thoughtful','surprised','shy','proud','reassuring','amused'];
export const talkKinds=['talkOpen','talkExplain'];
export const emotionStatus={confused:'Hmm? A puzzled little shrug.',delighted:'A happy little smile.',thoughtful:'A paw to her chin… thinking it through.',surprised:'Oh! That caught her by surprise.',shy:'A bashful little thank you.',proud:'A little chest puff. She did it!',reassuring:'A paw to her heart, a gentle offer of help.',pointLeft:'This way…',pointRight:'Over here…'};
emotionStatus.talkOpen='Open little palms, sharing a thought.';
emotionStatus.talkExplain='A little presenting paw, then a point to explain.';
emotionStatus.amused='Hehe! A playful little giggle.';
export const emotionPlayback=clips=>Object.fromEntries([...emotionKinds,...talkKinds].filter(kind=>clips[kind]).map(kind=>[kind,calmTalkPlayback[kind]??clips[kind].playback]));
export function normalizeReplyCue(value){
 if(!value||typeof value!=='object'||Array.isArray(value)||typeof value.text!=='string')throw new Error('Invalid reply cue');
 const text=value.text.trim();if(!text||text.length>2000)throw new Error('Invalid reply text');
 const emotion=['neutral',...emotionKinds].includes(value.emotion)?value.emotion:'neutral';
 // Current wave artwork is explicitly happy. Incompatible cues remain expressions.
 const gesture=value.gesture==='wave'&&emotion==='delighted'?'wave':emotion==='neutral'&&talkKinds.includes(value.gesture)?value.gesture:'none';
 return {text,emotion,gesture};
}
export function applyReplyCue(companion,value){
 const cue=normalizeReplyCue(value);
 const animationAccepted=cue.gesture==='wave'?companion.greet():talkKinds.includes(cue.gesture)?companion.express(cue.gesture):cue.emotion==='neutral'?false:companion.express(cue.emotion);
 // The caller can defer a cue if busy. Never cut off an active drawing sequence.
 return {...cue,animationAccepted};
}
