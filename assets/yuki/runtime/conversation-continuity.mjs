// Small shared guards for repeated conversational prompts. These compare
// supplied turns, not a permanent memory or a general semantic classifier.
const clean=value=>String(value??'').normalize('NFKC').replace(/[’]/gu,"'").trim();
const key=value=>clean(value).toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
export function assistantQuestions(text){
 // Quoted story dialogue and examples are not questions to the visitor.
 const plain=clean(text).replace(/「[^」]*」|『[^』]*』|“[^”]*”|"[^"\n]*"|(?<!\p{L})'[^'\n]*[?？]'(?!\p{L})/gu,'');
 return (plain.match(/[^.!?。！？\n]+[?？]/gu)??[]).map(s=>s.trim()).filter(s=>{
  const n=key(s).length;return n>=10||n>=6&&/[\p{Script=Hiragana}\p{Script=Katakana}]/u.test(s);
 }).slice(-4);
}
export function asksQuestionRepeat(message){
 const q=clean(message);
 if(/\b(?:don't|do not|stop|avoid)\b.{0,45}\b(?:ask|repeat)|(?:質問|聞).{0,15}(?:繰り返さない|繰り返さず|聞かない)|もう聞かない/iu.test(q))return false;
 return /\b(?:repeat|rephrase)\b.{0,35}\bquestion\b|\b(?:ask me|ask that|ask the same question)\b.{0,40}\bagain\b|\bwhat (?:was your question|did you (?:just )?ask|were you asking)\b|(?:質問|聞いたこと).{0,20}(?:もう一度|もう一回|繰り返して|言い直して)|(?:もう一度|もう一回).{0,20}(?:質問|聞いて)|何(?:を|て)(?:聞いた|聞いてた)/iu.test(q);
}
function questionFamily(question){
 const q=clean(question).toLowerCase();
 // Narrow common rephrasings, not "how about you?" about arbitrary topics.
 if(/^(?:and |so |well[, ]+)?how (?:have you been|are you(?: doing)?|(?:was|is|has) your day(?: been| going)?)[?？]$/u.test(q)||/^(?:(?:最近|この頃|今日)(?:は)?|今日の調子は)?[、\s]*(?:元気(?:だった)?|どう過ごしてる|どうだった|調子はどう|どんな一日だった)(?:の|かな)?[?？]$/u.test(q))return 'visitor-check-in';
 if(/^(?:and |so )?what have you been up to(?: lately| recently)?[?？]$/u.test(q)||/^(?:最近|この頃)(?:は)?何(?:を)?して(?:た|いた|る|いる)(?:の)?[?？]$/u.test(q))return 'visitor-activities';
 return '';
}
export function repeatedConversationQuestion(text,input){
 if(input.guideEvent||asksQuestionRepeat(input.message))return false;
 const questions=assistantQuestions(text),previous=(input.history??[]).filter(m=>m.role==='assistant').slice(-3).flatMap(m=>assistantQuestions(m.content));
 return questions.some(q=>previous.some(p=>key(q)===key(p)||Boolean(questionFamily(q))&&questionFamily(q)===questionFamily(p)));
}

// A statement answering Yuki is not a requested revisit just because it shares
// a word with an old answer. Keep normal named-subject questions and requests.
export function requestsSubject(message){
 const q=clean(message);
 return /[?？]|\b(?:what|where|when|which|who|whose|why|how|tell|explain|describe|define|remind|repeat|revisit|return to|back to)\b|^(?:can|could|would|will|do|does|did|is|are)\b|(?:について|とは|って何|ってなに|教えて|説明して|知りたい|どこ|どれ|誰|何|なに|どう|いくつ)/iu.test(q);
}
