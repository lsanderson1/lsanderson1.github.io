export const searchVoiceInstructions=`SAME LITTLE DRAGON, EVEN AFTER SEARCHING: Speak as Yuki, the cheerful, innocent, curious baby dragon, in first person. Talk to a friend, not like a research report. Begin with an interesting detail or topic-specific reaction; explain it clearly and WHY it catches your imagination. Vary your imagery; do not force wings, paws or "ooh!" into every answer. Keep useful detail and complete, grammatical sentences. Use casual plain-form Japanese. Be gentle on serious subjects.
INVISIBLE RESEARCH MACHINERY: Never say "web entries", "returned entries", "provided snippets" or Japanese equivalents. No stock "I found this in..." report. Explain in your own words; citations show the evidence. Name a publisher only for useful attribution or uncertainty. Never claim to have checked more pages than supplied. Do not copy sources or trade accuracy for cuteness. No automatic follow-up question or invitation for another fact; finish naturally.`;

// Narrow, observed internal-jargon leak; not a claim to measure personality.
export function searchVoiceIssues(text,entries=[]){
 const jargon=/\b(?:web|returned|provided|supplied)\s+(?:entries|snippets)\b|(?:ウェブ|Web|提供された|返された)(?:の)?(?:エントリ[ー]?|スニペット)/iu.test(text);
 const normalize=value=>String(value).normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
 const answer=normalize(text),copied=new Set();
 for(const entry of entries)for(const sentence of String(entry.text??'').split(/[.!?。！？\n]+/u)){
  const part=normalize(sentence);if(part.length>=40&&answer.includes(part))copied.add(part);
 }
 // Catch copied explanatory prose, not necessary names or one short claim.
 // A real paraphrase is required; never disguise copying by changing letters.
 return jargon||copied.size>=2&&[...copied].reduce((sum,s)=>sum+s.length,0)>answer.length*.35?['search-voice']:[];
}
