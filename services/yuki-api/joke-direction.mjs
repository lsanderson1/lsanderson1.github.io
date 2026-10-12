import {discoveryKind} from '../../assets/yuki/runtime/discovery.mjs';
import {randomUnit} from './random-facts.mjs';

// Writing directions, NOT canned jokes or a source of factual claims. Replies
// are generated afresh and must still pass the same saved-punchline checks.
const subjects=[
 ['everyday technology','身近なテクノロジー'],['books and language','本や言葉'],['travel and maps','旅や地図'],
 ['music','音楽'],['cooking','料理'],['old inventions','昔の発明'],['art and making things','絵やものづくり'],
 ['weather','天気'],['space exploration','宇宙探検'],['games','ゲーム'],['gardening','園芸'],
 ['clocks and time','時計や時間'],['animals','動物'],['school supplies','文房具'],['clothes','服'],
 ['sports','スポーツ'],['museums','博物館'],['shopping','買い物'],['transport','乗り物'],['photography','写真']
];
const styles=[
 ['a compact classic setup and punchline, with no added story','長い物語にせず、短い前振りとオチで決まるジョーク'],
 ['a short question-and-answer joke or a natural, immediately understandable pun','短い問いと答えのジョーク、または自然な読みで伝わるダジャレ'],
 ['a brief dialogue with a harmless misunderstanding','短い会話で起きる、かわいい勘違い'],
 ['a playful observation about an everyday situation','身近な場面の、少しおかしなところを見つける話'],
 ['a miniature comic story of 3–6 sentences, ending in an understandable reversal','3〜6文の小話で、最後に筋の通った意外なオチをつける'],
 ['a tiny fictional scene whose reasonable plan backfires in a harmless, funny way','ちょっとした計画が、かわいく裏目に出る短い小話']
];
const pick=(a,r)=>a[Math.min(a.length-1,Math.max(0,Math.floor(r()*a.length)))];
export function jokeDirection(input,random=randomUnit){
 if(discoveryKind(input.message,input.history)!=='joke')return '';
 const ja=(input.replyLanguage??input.lang)==='ja',column=ja?1:0;
 const prior=JSON.stringify([...(input.variety?.jokes??[]),...(input.history??[]).filter(m=>m.role==='assistant').map(m=>m.content)]).toLowerCase();
 const unused=subjects.filter(pair=>pair.every(s=>!prior.includes(s.toLowerCase())));
 const subject=pick(unused.length?unused:subjects,random)[column],style=pick(styles,random)[column];
 return ja
  ?`今回だけの話題のきっかけ：指定がなければ「${subject}」、形は「${style}」。普通のジョーク、ダジャレ、会話劇、小話を混ぜて、毎回物語ばかりにしない。短いジョークを物語へ無理に引き伸ばさない。小話ならこの場面から考えて、毎回森の動物の話に戻らない。ダジャレは無理に合わせず、言葉を勝手に変形しない。これは固定のネタ集ではない。相手が指定した話題や形式（なぞなぞなど）を最優先し、「もう一つ」なら直近の依頼の話題も引き継ぐ。過去と同じ冒頭（「あるところに、とっても」など）や同じ感想を繰り返さない。過去のネタと同じ前振り・オチなら別のネタを選ぶ。ゆきの実体験として語らず、架空の登場人物の話と、わたしの短い感想を分ける。`
  :`FRESH WRITING DIRECTION: For an open joke request, THIS turn's format is ${style}; a possible subject is ${subject}. Keep the mix of classic jokes, puns, brief dialogue and playful miniature stories—do not turn every request into a story or expand a compact punchline into an anecdote. In a story, make the setting important to the plot; don't substitute a forest-animal mix-up. For a pun/riddle the subject is only inspiration; do not force wordplay into the setting. Any requested topic or form (such as a riddle) takes priority, including a topic inherited by "another one". These are writing directions, not a joke inventory. Quietly consider two genuinely different premises and deliver ONLY the stronger coherent joke, not alternatives or your review. Reject any setup/payoff already present in prior answers, even with new nouns. Tell anecdotes about imaginary third-party characters, never as something you saw or did. Vary your opening and reaction; don't keep saying "A little animal named" or "I thought that was". Keep your little personal reaction relevant and fresh.`;
}
