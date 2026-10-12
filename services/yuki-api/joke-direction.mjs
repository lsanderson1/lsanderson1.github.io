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
 ['a brief dialogue with a harmless misunderstanding','短い会話で起きる、かわいい勘違い'],
 ['a clear setup and a surprising but logically connected payoff','前振りと、意外だけれど筋の通ったオチ'],
 ['a playful observation about an everyday situation','身近な場面の、少しおかしなところを見つける話'],
 ['a small imaginative situation with an understandable reversal','想像上の小さな場面から、納得できる意外な結末へ']
];
const pick=(a,r)=>a[Math.min(a.length-1,Math.max(0,Math.floor(r()*a.length)))];
export function jokeDirection(input,random=randomUnit){
 if(discoveryKind(input.message,input.history)!=='joke')return '';
 const ja=(input.replyLanguage??input.lang)==='ja',column=ja?1:0;
 const subject=pick(subjects,random)[column],style=pick(styles,random)[column];
 return ja
  ?`今回だけの話題のきっかけ：指定がなければ「${subject}」、形は「${style}」も候補。ただし、この案に無理に合わせない。筋の通る既知の冗談を優先し、言葉を勝手に変形して新しいダジャレを作らない。これは固定のネタ集ではない。相手が指定した話題や形式（なぞなぞなど）を最優先し、「もう一つ」なら直近の依頼の話題も引き継ぐ。過去のネタと同じ前振り・オチなら別のネタを選ぶ。ゆきの実体験として語らず、架空の登場人物の話と、わたしの短い感想を分ける。`
  :`FRESH WRITING DIRECTION: If the visitor left the topic open, consider ${subject}, using ${style}. This is optional inspiration, not a mandatory theme or a joke inventory. A coherent recognizable joke takes priority over inventing strained wordplay. Any requested topic or form (such as a riddle) takes priority, including a topic inherited by "another one". Quietly consider two genuinely different premises and deliver ONLY the stronger coherent joke, not alternatives or your review. Reject any setup/payoff already present in prior answers, even with new nouns. Tell anecdotes about imaginary third-party characters, never as something you saw or did. Keep your little personal reaction relevant and fresh.`;
}
