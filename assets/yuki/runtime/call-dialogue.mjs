const openings=[
 ['You called? Here I am!', '呼んだ？ここにいるよ！'],
 ['A little flutter, and I found you!', 'ぱたぱたっ、見つけた！'],
 ['One tiny dragon, reporting for exploring!', '小さなドラゴン、探検のお手伝いに到着！'],
 ['Made it! My wings were very eager.', '着いた！羽が張り切っちゃった。'],
 ['There you are! I saved a little curiosity for you.', 'いたいた！わくわくを連れてきたよ。'],
 ['Coming over was a lovely little adventure!', 'ここまで飛ぶのも、小さな冒険だった！'],
 ['Here comes your small but enthusiastic guide!', '小さいけれど、やる気いっぱいの案内役だよ！'],
 ['A soft landing and a happy hello!', 'そーっと着地して、こんにちは！'],
 ['Found my exploring buddy!', '探検の仲間を見つけた！'],
 ['Glasses straight, little wings ready!', 'めがね、よし！小さな羽も準備ばっちり！'],
 ['You rang for a dragon? A very little one has arrived.', 'ドラゴンを呼んだ？とっても小さいのが来たよ。'],
 ['I brought my best listening ears!', 'お話を聞く準備、ばっちり！']
];
const details=[
 [t=>`We’re at ${t}. Let’s see what catches your eye here.`,t=>`今は「${t}」だね。気になるところを一緒に見てみよう。`],
 [t=>`${t} is our little meeting spot today. I’m ready to help you explore it.`,t=>`今日の待ち合わせは「${t}」！一緒に見て回る準備ができたよ。`],
 [t=>`I’ve joined you at ${t}. We can take this corner one little discovery at a time.`,t=>`「${t}」で合流できた！ひとつずつ、小さな発見を探していこう。`],
 [t=>`Here at ${t}, you can ask me about whatever interests you. I’ll keep my explanations grounded in what the page actually shares.`,t=>`ここは「${t}」。気になることを聞いてね。ページに書いてあることを大切にしながら話すよ。`],
 [t=>`${t}, just where you called me! I’m happy to keep you company while you look around.`,t=>`呼んでくれた「${t}」に到着！見て回る間、そばにいられてうれしいな。`],
 [t=>`Our next little look around starts at ${t}. No need to rush past the interesting bits.`,t=>`次のちょこっと探検は「${t}」から。気になるところは、ゆっくり見ていこう。`],
 [t=>`We can explore ${t} together. Questions are welcome—even the tiny ones!`,t=>`「${t}」を一緒に見よう。小さな疑問も大歓迎！`],
 [t=>`I’m here with you at ${t}. A new corner for my curiosity to settle into!`,t=>`今は一緒に「${t}」にいるよ。好奇心もここで、ちょこんとひと休み！`]
];
export class CallDialogue{
 constructor(storage,random=Math.random){this.storage=storage;this.random=random;this.used=[];try{const data=JSON.parse(storage?.getItem('yuki-call-lines-v1'));if(Array.isArray(data))this.used=data.filter(n=>Number.isInteger(n)&&n>=0&&n<openings.length*details.length);}catch{}}
 next(title,lang='en'){
  const total=openings.length*details.length;if(this.used.length>=total)this.used=this.used.slice(-8);
  const last=this.used.at(-1),unused=Array.from({length:total},(_,i)=>i).filter(i=>!this.used.includes(i)),different=unused.filter(i=>Math.floor(i/details.length)!==Math.floor(last/details.length)),choices=different.length?different:unused;
  const id=choices[Math.min(choices.length-1,Math.max(0,Math.floor(this.random()*choices.length)))];
  this.used.push(id);try{this.storage?.setItem('yuki-call-lines-v1',JSON.stringify(this.used));}catch{}
  const l=lang==='ja'?1:0,label=String(title|| (l?'このページ':'this page')).replace(/\s+/gu,' ').trim().slice(0,160);
  return openings[Math.floor(id/details.length)][l]+' '+details[id%details.length][l](label);
 }
}
