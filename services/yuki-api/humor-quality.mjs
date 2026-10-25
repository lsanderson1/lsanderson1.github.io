// Narrow observable failures, not a claim to measure whether a joke is funny.
// Only used for humor tasks; ordinary corrections/explanations remain valid.
export function humorQualityIssues(text,core){
 const prose=String(text).replace(/「[^」]*」|『[^』]*』|“[^”]*”|"[^"\n]*"/gu,' ');
 const selfReview=/\bI (?:mixed up|forgot|messed up) (?:the |that |my )?(?:joke|punchline)|\b(?:that|this|my) (?:joke|pun|punchline) (?:doesn't|does not|didn't|did not) (?:work|make sense)|(?:ちょっと|今のは|今のジョークは|今の冗談は)(?:失敗しちゃった|失敗だった|変だった)|(?:オチ|冗談|ジョーク)(?:を|が)[^。！？]{0,15}(?:間違え|うまく言えなかった|意味不明)/iu.test(prose);
 const unsafeFood=/(?:絵の具|接着剤|洗剤)[^。！？]{0,55}(?:入れ|混ぜ|食べ|飲ん)|\b(?:paint|glue|detergent)\b[^.!?]{0,70}\b(?:soup|eat|drank|drink)\b/iu.test(String(text));
 const admittedBroken=/\b(?:too weak|unnatural|does not (?:work|make sense)|doesn't (?:work|make sense)|invented meaning|not a real (?:word|meaning)|better logic|wait, better)\b|(?:音|響き|意味)(?:が|は)(?:似ていない|通じない)|意味が通らない|無理がある/iu.test([core?.premise,core?.payoff].filter(Boolean).join(' '));
 const markup=/<\/?(?:br|p|div|span)\b/iu.test(String(text));
 return [...(selfReview||admittedBroken?['humor-logic']:[]),...(unsafeFood?['humor-harmlessness']:[]),...(markup?['humor-markup']:[])];
}
