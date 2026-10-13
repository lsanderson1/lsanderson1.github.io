// Conservative author-voice check. Never blindly replace names/pronouns: the
// visitor may be quoting a title, discussing somebody else, or asking for a story.
export function thirdPersonSelf(text,question=''){
 if(/\b(?:write|tell|describe|use|speak|narrate)\b[^.!?\n]{0,65}\bthird.person\b|三人称で(?:書|話|語|説明|お願い)/iu.test(question))return false;
 // Quotation marks alone do not turn narration into a cited title. Preserve
 // attributed dialogue and code, but inspect decorative quotes and link labels.
 const prose=String(text).replace(/```[\s\S]*?```|`[^`\n]*`/gu,' ')
  .replace(/\[([^\]]*)\]\([^)]*\)/gu,'$1').replace(/https?:\/\/\S+/gu,' ')
  .replace(/\b(?:said|says|asked|asks|wrote|writes|reads?|quote[ds]?)\s*[:,]?\s*(?:“[^”]*”|"[^"\n]*")|「[^」]*」\s*(?:と|って)(?:(?:友達|ロイド|Lloyd|相手|彼女|彼|先生)が)?(?:言|話|書|聞|尋)/giu,' ')
  .replace(/[「」『』“”"‘’]/gu,c=>c==='’'?"'":'');
 if(/\bYuki\s+(?:(?:really|also|always|sometimes|often|still|just)\s+)*(?:is|was|has|had|can|will|would|likes|loves|hopes|dreams|wants|feels|thinks|lives|enjoys|uses|helps|finds|remembers|believes|learns|sleeps|keeps|collects|wears|flies|rests|wakes|reads|explores|speaks|answers|guides|explains|knows|tries|gets|does|grew|started|learned|became|looks|seems)\b|\b(?:created|made|built|designed|animated|drew|helped|gave|taught)\s+Yuki\b/iu.test(prose))return true;
 if(/(?:ゆき|ユキ|Yuki)(?:は|が|には|にも|なら|って(?:いう|いった)|という(?:子|ドラゴン))/u.test(prose))return true;
 for(const sentence of prose.split(/[.!?。！？\n]+/u)){
  const personal=/\bYuki['’]s\s+(?:garden|home|roost|nest|story|dreams?|glasses|wings|body|scales|belly|tail|paws|memories|personality|favou?rite|voice|feelings|thoughts|hopes|treasures|friends|creator|animations|abilities|answers|curiosity)\b|(?:ゆき|ユキ|Yuki)の(?:庭|家|ねぐら|物語|夢|眼鏡|メガネ|翼|体|しっぽ|好き|性格|気持ち|思い|声|宝物|友達|動き|仕組み|返事)/iu;
  if(!personal.test(sentence))continue;
  // Exact page/control names can be spoken when identifying where to click.
  // The exception never permits "Yuki loves..." in that same sentence.
  if(/\b(?:click|tap|choose|select|tab|heading|label|titled|officially called|page title)\b|タブ|リンク|見出し|ボタン|タイトル|という名前/iu.test(sentence)&&!/\b(?:she|her|hers)\b|彼女/iu.test(sentence))continue;
  if(/\b(?:title|official name|called)\b|正式名称|タイトル|名前/iu.test(question)&&/\bgarden\b|庭/iu.test(sentence))continue;
  return true;
 }
 // Do not treat every she/her about another person or story character as me.
 // This narrow check catches a switch immediately after self-identification.
 if(/\b(?:I(?:'m| am) Yuki|my name is Yuki)\b|わたしは(?:ゆき|ユキ)/iu.test(prose)&&/(?:^|[.!?。！？]\s*)\s*(?:She\s+(?:lives|dreams|loves|wears|helps)|Her\s+(?:garden|home|dream|glasses)|彼女の(?:庭|夢|眼鏡))/iu.test(prose))return true;
 return false;
}
