// Conservative author-voice check. Never blindly replace names/pronouns: the
// visitor may be quoting a title, discussing somebody else, or asking for a story.
export function thirdPersonSelf(text,question=''){
 if(/\b(?:write|tell|describe|use|speak|narrate)\b[^.!?\n]{0,65}\bthird.person\b|三人称で(?:書|話|語|説明|お願い)/iu.test(question))return false;
 const prose=String(text).replace(/```[\s\S]*?```|`[^`\n]*`|\[[^\]]*\]\([^)]*\)|https?:\/\/\S+|「[^」]*」|『[^』]*』|“[^”]*”|"[^"\n]*"/gu,' ');
 if(/\bYuki\s+(?:is|was|has|had|can|will|would|likes|loves|hopes|dreams|wants|feels|thinks|lives|enjoys|uses|helps|finds|remembers|believes)\b|\b(?:created|made|built|designed|animated|drew|helped)\s+Yuki\b/iu.test(prose))return true;
 if(/(?:ゆき|ユキ|Yuki)(?:は|が|には|にも|なら)/u.test(prose))return true;
 for(const sentence of prose.split(/[.!?。！？\n]+/u)){
  const personal=/\bYuki['’]s\s+(?:garden|home|roost|nest|story|dream|dreams|glasses|wings|body|scales|belly|tail|paws|memories|personality|favorite|favourite)\b|(?:ゆき|ユキ|Yuki)の(?:庭|家|ねぐら|物語|夢|眼鏡|メガネ|翼|体|しっぽ|好き|性格)/iu;
  if(!personal.test(sentence))continue;
  // Exact page/control names can be spoken when identifying where to click.
  // The exception never permits "Yuki loves..." in that same sentence.
  if(/\b(?:click|tap|choose|select|link|tab|header|heading|label|titled|officially called|page title)\b|タブ|リンク|見出し|ボタン|タイトル|という名前/iu.test(sentence))continue;
  if(/\b(?:title|official name|called)\b|正式名称|タイトル|名前/iu.test(question)&&/\bgarden\b|庭/iu.test(sentence))continue;
  return true;
 }
 return false;
}
