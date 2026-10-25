import {jokeRequestContext,cleanJokePlan,cleanJokeRecords} from '../../assets/yuki/runtime/joke-memory.mjs';
import {randomUnit} from './random-facts.mjs';

// Writing directions, NOT canned jokes or a source of factual claims. Replies
// are generated afresh and must still pass the same saved-punchline checks.
const subjects=[
 ['everyday technology','身近なテクノロジー'],['books and language','本や言葉'],['travel and maps','旅や地図'],
 ['music','音楽'],['cooking','料理'],['old inventions','昔の発明'],['art and making things','絵やものづくり'],
 ['weather','天気'],['space exploration','宇宙探検'],['games','ゲーム'],['gardening','園芸'],
 ['clocks and time','時計や時間'],['animals','動物'],['school supplies','文房具'],['clothes','服'],
 ['sports','スポーツ'],['museums','博物館'],['shopping','買い物'],['transport','乗り物'],['photography','写真'],
 ['architecture','建築'],['robots','ロボット'],['archaeology','考古学'],['theatre','演劇'],['ocean voyages','船の旅'],
 ['mathematics','数学'],['postal deliveries','郵便'],['tiny everyday inconveniences','日常の小さな不便'],['puzzles','パズル'],
 ['languages and translation','言語と翻訳'],['camping','キャンプ'],['film making','映画づくり'],['libraries','図書館'],
 ['pottery','陶芸'],['dance','ダンス'],['baking','お菓子づくり'],['instruments','楽器'],['furniture','家具'],
 ['astronaut training','宇宙飛行士の訓練'],['fashion design','服のデザイン'],['board games','ボードゲーム'],
 ['restoring antiques','骨董品の修復'],['scientific instruments','科学の道具'],['messy workbenches','散らかった作業台']
];
const styles=[
 ['a compact classic setup and punchline, with no added story','長い物語にせず、短い前振りとオチで決まるジョーク'],
 ['a short question-and-answer joke or a natural, immediately understandable pun','短い問いと答えのジョーク、または自然な読みで伝わるダジャレ'],
 ['a brief dialogue with a harmless misunderstanding','短い会話で起きる、かわいい勘違い'],
 ['a playful observation about an everyday situation','身近な場面の、少しおかしなところを見つける話'],
 ['a miniature comic story of 3–6 sentences, ending in an understandable reversal','3〜6文の小話で、最後に筋の通った意外なオチをつける'],
 ['a tiny fictional scene whose reasonable plan backfires in a harmless, funny way','ちょっとした計画が、かわいく裏目に出る短い小話']
];
const mechanisms=[
 ['literal-meaning','taking an ordinary instruction literally','普通の指示を文字どおりに受け取る'],
 ['role-reversal','a believable reversal of who is helping whom','助ける側と助けられる側が入れ替わる'],
 ['over-preparation','preparing so carefully that the small preparation becomes the problem','準備を頑張りすぎて、その準備が小さな困りごとになる'],
 ['unexpected-priority','a sensible character caring about an unexpected small detail','まともな登場人物が、意外な小さな点を大切にする'],
 ['double-meaning','two real meanings of one ordinary word','実在する言葉の二つの意味'],
 ['understatement','a wonderfully small response to a harmless oversized effort','大げさな努力に対する、かわいく控えめな反応'],
 ['self-defeating-shortcut','a time-saving shortcut creating extra work','手間を省く工夫が、かえって仕事を増やす'],
 ['rule-exception','a clearly established rule meeting an amusing but logical exception','はっきりしたルールに、筋の通る面白い例外が現れる'],
 ['scale-mismatch','a harmless mismatch between an ambition and an everyday obstacle','大きな目標と身近な小さな障害のずれ'],
 ['callback','a small setup detail returning with a new meaning at the payoff','前振りの細部が、オチで別の意味を持って戻る']
];
const subjectId=pair=>pair[0].replaceAll(' ','-');
const styleIds=['classic','question-answer','dialogue','observation','mini-story','comic-scene'];
export function jokePlanHint(plan,language='en'){
 const column=language==='ja'?1:0;
 return {subject:(subjects.find(p=>subjectId(p)===plan.subject)??subjects[0])[column],format:styles[Math.max(0,styleIds.indexOf(plan.style))][column],angle:(mechanisms.find(p=>p[0]===plan.mechanism)??mechanisms[0])[column+1]};
}
const pick=(a,r)=>a[Math.min(a.length-1,Math.max(0,Math.floor(r()*a.length)))];
function fresh(items,seen,id,random){const unused=items.filter(v=>!seen.includes(id(v)));return pick(unused.length?unused:items,random);}
export function chooseJokePlan(input,random=randomUnit){
 const records=cleanJokeRecords(input.variety?.jokeRecords).flatMap(r=>r.plan?[r.plan]:[]);
 return {subject:subjectId(fresh(subjects,records.slice(-12).map(r=>r.subject),subjectId,random)),style:fresh(styleIds,records.slice(-2).map(r=>r.style),v=>v,random),mechanism:fresh(mechanisms,records.slice(-4).map(r=>r.mechanism),v=>v[0],random)[0]};
}
export function jokeDirection(input,random=randomUnit){
 if(!jokeRequestContext(input))return '';
 const ja=(input.replyLanguage??input.lang)==='ja',column=ja?1:0;
 const plan=cleanJokePlan(input.jokePlan)??chooseJokePlan(input,random);
 const subject=(subjects.find(p=>subjectId(p)===plan.subject)??subjects[0])[column],style=styles[Math.max(0,styleIds.indexOf(plan.style))][column];
 const mechanism=(mechanisms.find(p=>p[0]===plan.mechanism)??mechanisms[0])[column+1];
 const direction=ja?`笑いの仕組みのヒント：${mechanism}。この話題や仕組みは発想の出発点だけで、固定の筋書きでも選べる話題の上限でもない。無理に組み合わせず、筋の通った別の発想も使える。\n`:`COMIC ANGLE: ${mechanism}. This is optional inspiration, not a plot template or a closed subject catalogue. Invent a fresh premise; if the combination feels forced, use a different coherent angle.\n`;
 return ja
  ?direction+`今回だけの話題のきっかけ：指定がなければ「${subject}」、形は「${style}」。普通のジョーク、ダジャレ、会話劇、小話を混ぜて、毎回物語ばかりにしない。短いジョークを物語へ無理に引き伸ばさない。小話ならこの場面から考えて、毎回森の動物の話に戻らない。ダジャレは無理に合わせず、言葉を勝手に変形しない。これは固定のネタ集ではない。相手が指定した話題や形式（なぞなぞなど）を最優先し、「もう一つ」なら直近の依頼の話題も引き継ぐ。過去と同じ冒頭（「あるところに、とっても」など）や同じ感想を繰り返さない。過去のネタと同じ前振り・オチなら別のネタを選ぶ。ゆきの実体験として語らず、架空の登場人物の話と、わたしの短い感想を分ける。`
  :direction+`FRESH WRITING DIRECTION: For an open joke request, THIS turn's format is ${style}; a possible subject is ${subject}. Keep the mix of classic jokes, puns, brief dialogue and playful miniature stories—do not turn every request into a story or expand a compact punchline into an anecdote. In a story, make the setting important to the plot; don't substitute a forest-animal mix-up. For a pun/riddle the subject is only inspiration; do not force wordplay into the setting. Any requested topic or form (such as a riddle) takes priority, including a topic inherited by "another one". These are writing directions, not a joke inventory. Quietly consider two genuinely different premises and deliver ONLY the stronger coherent joke, not alternatives or your review. Reject any setup/payoff already present in prior answers, even with new nouns. Tell anecdotes about imaginary third-party characters, never as something you saw or did. Vary your opening and reaction; don't keep saying "A little animal named" or "I thought that was". Keep your little personal reaction relevant and fresh.`;
}
