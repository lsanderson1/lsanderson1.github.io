// Bounded conversation routing, not a semantic classifier or factual evidence.
// Never infer a referent from Yuki's perch or an unrelated remembered answer.
import {explanationKind,referencedExchange} from '../../assets/yuki/runtime/discovery.mjs';
const clean=value=>String(value??'').normalize('NFKC').replace(/[’]/gu,"'").trim();
const previousAnswers=input=>[...(input.history??[]).filter(m=>m.role==='assistant').map(m=>m.content),...(input.memory??[]).map(m=>m.answer)].filter(v=>typeof v==='string');
const generic=/^(?:(?:a|an|the)\s+)?(?:it|this|that|they|those|these|he|she|his|her|their|my|your|something|anything|one|thing|place|person|tool|term|word|idea|concept|method|example|reason|difference|sea|ocean|river|lake|mountain|desert|book|project|section|page)(?:\s|$)|^(?:それ|これ|あれ|その|この|あの|そこ|ここ|どれ|何|なに|理由|具体例|例えば|仕組み|違い|例|彼女|彼|本人)/iu;

// An explicit, already-mentioned name needs no old factual paragraph to answer
// an identity question. Names come from the actual exchange, not an allowlist.
export function explicitFollowupSubject(message,answers=[]){
 const q=clean(message).replace(/^(?:okay|ok|then|and|so)[,\s]+|^(?:じゃあ|それなら)[、\s]*/iu,'');
 let subject=q.match(/^(?:what(?:'s| is| are)|who(?:'s| is| was)|where(?:'s| is| are)|tell me about|define|explain)\s+(.+?)(?:[?.!]|$)/iu)?.[1];
 if(subject)subject=subject.replace(/\s+(?:used for|located|again|please)$/iu,'').replace(/^(?:a|an|the)\s+/iu,'');
 else subject=q.match(/^(.{1,90}?)(?:って(?:何|なに)|とは(?:何|なに|[？?]|$)|は(?:どこ|誰|だれ)|について(?:教えて|説明して)|を説明して)/u)?.[1];
 subject=subject?.replace(/^[「『“"']|[」』”"']$/gu,'').trim()??'';
 if(subject.length<2||subject.length>90||generic.test(subject)||/\b(?:why|how|when|compare|than|between|and|or|your|my|their|more)\b|どう|なぜ|より|比べ|比較|わたし|あなた|ゆきの/iu.test(subject))return '';
 // Require the whole phrase, not a substring such as "Java" in "JavaScript".
 const match=s=>/^[\x20-\x7e]+$/u.test(subject)?new RegExp('(?<![a-z0-9])'+subject.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'(?![a-z0-9])','iu').test(s):s.includes(subject);
 return answers.some(match)?subject:'';
}

export function followupIntent(message){
 const q=clean(message);
 if(/\b(?:i meant|not what|that's (?:wrong|incorrect)|that is (?:wrong|incorrect)|correct that|you misunderstood)\b|そうじゃなく|違うよ|間違|訂正|じゃなくて/iu.test(q))return 'correction';
 if(/\b(?:compare|comparison|difference|different|versus|vs\.?|better than|similar to)\b|違い|違う|比べ|比較|どっち|どちら/u.test(q.toLowerCase()))return 'comparison';
 if(/\b(?:is that true|is it true|how do you know|evidence|sources?|verify|check that|proof)\b|本当|ほんと|出典|根拠|確かめ|確実|どうしてわかる/iu.test(q))return 'evidence';
 if(/\b(?:simpler|simply|simple terms|easier|plain language|don't understand|do not understand)\b|わかりやす|分かりやす|かみくだ|噛み砕|簡単に|よくわから/iu.test(q))return 'simplify';
 if(/\b(?:examples?|demonstrat|illustrat)|例えば|たとえば|具体例|例は|例を/iu.test(q))return 'example';
 if(/\b(?:why|how come|reason)\b|なぜ|どうして|なんで|理由/iu.test(q))return 'reason';
 if(/\b(?:your (?:thought|opinion)|do you (?:think|like|feel)|what about you)\b|どう思|どう感じ|好きな理由|気に入|どこが好き/iu.test(q))return 'opinion';
 if(/\b(?:coming along|getting on with|making progress|any progress|how (?:is|are) (?:it|that|things|they|you) going)\b|順調|進み具合|進捗|その後どう|どこまで進|うまくいって/iu.test(q))return 'progress';
 if(/\b(?:how|mechanism|process|work|works)\b|どうやって|どのように|仕組み|しくみ|手順/iu.test(q))return 'mechanism';
 if(/\b(?:more|expand|elaborate|detail|details|continue|go on|tell me about)\b|もっと|詳し|くわし|続きを|続きは|もう少し|掘り下げ/iu.test(q))return 'expand';
 if(/\b(?:what|where|who|which)\b|何|なに|どこ|誰|だれ|どれ|って/iu.test(q))return 'identity';
 return 'continuation';
}

export function refersToEarlier(message){
 return /\b(?:compare|comparison|difference|different|first|earlier|previous(?:ly)?|before|other one|back to|remember|again)\b|比べ|比較|違い|違う|どっち|どちら|最初|前の|さっき|覚えて|もう一度|戻って/iu.test(message);
}

export function followupHistory(input){
 const supplied=input.history??[],at=supplied.findLastIndex(m=>m.role==='assistant');
 const reference=referencedExchange(input.message,supplied);
 if(reference.length&&!/\b(?:first|compare|between)\b|最初|比較|比べ/iu.test(input.message))return reference;
 if(refersToEarlier(input.message))return supplied;
 if(at<0)return [];
 const user=supplied.slice(0,at).findLast(m=>m.role==='user');
 return [...(user?[user]:[]),supplied[at]];
}

export function hasFollowupContext(input){return previousAnswers(input).length>0;}

// A bare explanation request after a visible reply refers to that reply, not
// automatically to the page behind the bubble. Explicit page/section/image
// wording still wins. This is a routing hint; the model interprets the full
// question and asks if multiple referents remain plausible.
export function referencesReplyExplanation(input){
 const q=clean(input.message);
 if(/\b(?:page|section|heading|paragraph|picture|photo|image|screen|website|site|place|garden|here)\b|ページ|項目|見出し|段落|写真|画像|画面|サイト|場所|庭|ここ|この部分/iu.test(q))return false;
 if(explanationKind(q))return true;
 if(!(input.history??[]).some(m=>m.role==='assistant'&&m.content?.trim()))return false;
 if(/\bwhat (?:does|did) (?:this|that|it) mean\b|\b(?:what you (?:just |previously )?said|your (?:last|previous) (?:message|answer|reply))\b|(?:これ|それ)(?:は|って)?どういう意味/iu.test(q))return true;
 if(/\b(?:explain|clarify|unpack|elaborate on|expand on|break down|help me understand|walk me through)\s+(?:(?:this|that|it)(?:\s+(?:fun(?:ny)?\s+)?(?:joke|story|fact|answer|reply|explanation|example|point))?|your (?:(?:last|previous) )?(?:answer|reply|explanation|message))(?=\s*(?:[.!?]|$)|\s+(?:again|more|further|please|in|for|a|to|because|so)\b)/iu.test(q))return true;
 if(/\b(?:this|that)\s+(?:joke|story|fact|answer|reply|explanation|example|point)\b/iu.test(q)&&/\b(?:mean|means|about|why|how|explain|understand)\b/iu.test(q))return true;
 return /(?:これ|それ|さっきの返事|今の説明|(?:この|その)(?:答え|説明|冗談|ジョーク|豆知識|雑学|話|例)).{0,35}(?:説明|詳し|くわし|わかりやす|分かりやす|噛み砕|かみくだ|どういう意味|どういうこと)/u.test(q);
}

export function asksConversationFollowup(input){
 const q=clean(input.message);
 if(referencesReplyExplanation(input))return true;
 if(/^(?:(?:okay|ok|and|so|then|please)[,\s]+)*(?:(?:can|could|would) you )?(?:tell me|explain|say)(?: a (?:little|bit))? more(?: (?:about (?:that|it)|please))?[,\s]*(?:please)?[.!?]*$/iu.test(q))return true;
 if(/^(?:sources?|evidence|proof|例|理由|仕組み|出典|根拠|証拠)(?:は|を教えて)?\s*[.!?。！？]*$/iu.test(q)||['correction','progress'].includes(followupIntent(q)))return true;
 if(/\b(?:it|its|that|those|these|they|them|their|this|he|she|him|her|his|hers)\b|\b(?:the) (?:tool|term|word|method|technique|mechanism|person|idea|concept|reason|difference|example)\b|それ|その|そこ|あれ|あの|あそこ|彼女|彼|本人|この(?:海|道具|言葉|方法|仕組み|人|考え|作品|例)/iu.test(q))return true;
 if(explicitFollowupSubject(q,previousAnswers(input)))return true;
 // Elliptical questions in both languages, including zero-subject Japanese.
 // A self-contained new question such as "Why is the sky blue?" stays new.
 return /^(?:(?:okay|ok|and|so|then|but|please)[,\s]+)*(?:(?:why|how|how come|really|when|where|who|which one)|(?:an? |for )?examples?|(?:could|can|would) you (?:give (?:me )?an example|elaborate|explain more|explain further)|(?:tell me |explain |say |a little |a bit )?(?:more|more please)|(?:go (?:on|deeper)|continue|elaborate|simpler|in simpler terms)|(?:what(?:'s| is) the (?:difference|reason|meaning)))\s*[.!?]*$|^(?:じゃあ|それなら|でも|うん|なるほど)?[、\s]*(?:なぜ|どうして|なんで|どうやって|どんなふうに|どこ|誰|だれ|本当|ほんと|具体例(?:は|を(?:教えて|見せて))?|例(?:は|を(?:教えて|見せて))|例えば|たとえば|(?:もっと|もう少し|もうちょっと)?(?:詳しく|くわしく|簡単に|わかりやすく|分かりやすく)?(?:教えて|説明して|聞かせて)|もっと|続きを(?:教えて|聞かせて)|続きは|どういう意味|どんな意味|違い(?:は|を教えて))\s*[。！？?]*$/iu.test(q);
}

export const followupTasks=Object.freeze({
 progress:'Respond to the progress/status of the relevant activity, not a technical definition or a replay of the previous milestone. For your fictional practice, give a warm present reflection or next goal without inventing completed offscreen events. If actual progress is unknown, say so. Do not repeat the visitor question you already asked.',
 evidence:'Explain what actually supports the previous claim. Earlier AI text is not evidence. Use supplied verified sources or the permitted lookup when needed; do not invent a source, claim to have checked without results, or merely insist the old answer is true. Correct errors and distinguish uncertainty.',
 identity:'Identify the requested person, place, tool, word or concept first, then explain that subject itself. Do not reopen the older topic that merely mentioned it.',
 mechanism:'Explain HOW the just-mentioned process works: its relevant stages or cause-and-effect, then a concrete example if helpful. Add the next layer instead of repeating the overview.',
 reason:'Answer WHY with the actual reason and its connection to the previous statement. Do not mistake a reason question for a definition or an invitation to repeat the whole answer.',
 example:'Give a concrete example of the concept just discussed, and connect the details back to how it works. Do not only define it again. Mark hypothetical examples clearly.',
 comparison:'Compare the specifically requested subjects or alternatives on useful dimensions. Keep enough earlier context to identify both. Do not drop either side or substitute an unrelated project.',
 expand:'Continue the same thread with new useful substance, a mechanism, supported detail or example. A brief connection is enough; do not replay the earlier paragraph.',
 simplify:'Explain the same meaning with simpler wording and a helpful example, preserving facts and uncertainty. Do not replace it with a new subject or a cute but inaccurate analogy.',
 opinion:'Give a warm, specific first-person character reaction and explain what sparks your curiosity. Distinguish imagined wishes from real experience, new canon or evidence.',
 correction:'Address the visitor’s correction directly. Re-evaluate the disputed point rather than defending or copying the old answer, and state uncertainty where necessary.',
 continuation:'Answer the current conversational intent naturally using only the relevant prior detail. Do not restart the previous topic or introduce unrelated lore.'
});
