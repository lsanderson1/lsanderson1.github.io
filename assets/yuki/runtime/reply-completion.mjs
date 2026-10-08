// A conservative format check, not proof of grammatical/factual completeness.
// Never manufacture an ending by appending punctuation or cutting off a clause.
export function unfinishedReply(text){
 if(typeof text!=='string'||!text.trim())return true;
 const value=text.trim(),fences=value.match(/^\s*```/gm)||[];
 if(fences.length%2)return true;
 if(fences.length&&/```\s*$/.test(value))return false;
 if(/^[{\[]/.test(value)){try{JSON.parse(value);return false;}catch{}}
 const tail=value.replace(/(?:\s*[\p{Extended_Pictographic}\uFE0F\u200D])+$/gu,'').trim();
 if(/[.!?。！？…]["'”’」』）)\]}*_]*$/u.test(tail))return false;
 // Catch the observed "... combining technologies to create a" even in a
 // short response. Quoted terms, headings and compact labels remain valid.
 if(tail.split(/\s+/).length>=4&&/\b(?:a|an|the|to|of|with|and|or|because|including|such as|for example)$/iu.test(tail))return true;
 if(/[,;:、，；：—–(\[{\-]$/u.test(tail))return true;
 if(tail.length>30&&/(?:することで|という|だけでなく|例えば|たとえば|そして)$/u.test(tail))return true;
 const lastLine=tail.split('\n').at(-1);
 if(/^\s*(?:[-*+] |\d+[.)] )\S/u.test(lastLine))return false;
 // Long generated prose should end a sentence. Short natural responses and
 // labels need not contain punctuation; closed code examples are handled above.
 return tail.length>160;
}

export function unfinishedNotice(language='en'){
 return language==='ja'?'あれっ、最後まで答えをまとめられなかったみたい。途中の説明で誤解させたくないから、もう一度聞いてくれる？':'Oops, I couldn’t finish that answer properly. I don’t want to leave you with half an explanation—could you ask me again?';
}
