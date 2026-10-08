import guide from './making-guide.json' with {type:'json'};
import blocks from './making-verified.json' with {type:'json'};

const tokens=text=>[...new Set((text.toLowerCase().match(/[a-z0-9_+#-]{3,}|[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]{2}/gu)??[]))].filter(w=>!['the','and','you','your','how','what','does','this','that','about','with','from','explain','have','for'].includes(w));
const hints={drawings:'art drawings appearance 3d design 絵 体型 制作',images:'webp pixels packaging lossless load images 画像 読み込み 画質',movement:'flight takeoff landing movement proportions scale fly 飛行 離陸 着地 移動 比率', 'little-motions':'breathing breath blink idle sleep bubble expressions tail まばたき 呼吸 表情 睡眠 しっぽ',navigation:'point pointing navigate guidance sections projects destination 指さし 案内 ページ 着地点','conversation':'ai workers cloudflare model qwen evidence answers 質問 返答 根拠 会話','memory-language':'memory translations japanese language recall 記憶 翻訳 日本語','garden-testing':'garden camera pan background tests viewport nest 庭 背景 画面 テスト 巣'};
export function makingKnowledge(input){
 const message=input.message??'',history=(input.history??[]).filter(m=>m.role==='user').slice(-2).map(m=>m.content).join(' ');
 const askedSource=blocks.some(b=>message.includes(b.symbol)||message.includes(b.source.file));
 const own=/\b(?:you|your|yuki)\b|ゆき|君|あなた|この庭/i.test(message);
 const technical=/\b(?:made|build|built|work|code|function|system|animation|breath|blink|sleep|memory|translat|camera|pan|webp|implement|develop|drawing|appearance|prepar|load|movement|point|section|making)\w*|仕組み|作|コード|処理|動|機能|記憶|翻訳|呼吸|まばたき|背景|庭/i.test(message);
 const followup=/^(?:and |why|how|what about|tell me more|explain more|それ|どう|なぜ|もっと|なんで)/i.test(message.trim())&&/\byou[r]?\b|yuki|ゆき|君/i.test(history);
 if(!askedSource&&!(own&&technical)&&!followup)return null;
 const query=tokens(message),prior=tokens(history),score=text=>{const v=text.toLowerCase();return query.reduce((n,w)=>n+(v.includes(w)?3:0),0)+prior.reduce((n,w)=>n+(v.includes(w)?.3:0),0);};
 const ranked=guide.chapters.map(c=>({c,score:score(hints[c.id]+' '+JSON.stringify(c))})).sort((a,b)=>b.score-a.score);
 const selected=ranked.slice(0,2).map(x=>x.c),topicIds=selected.map(c=>c.id);
 const selectedBlocks=blocks.map(b=>({b,score:score(b.symbol+' '+b.explanation+' '+JSON.stringify(b.title))+(topicIds.includes(b.topic)?4:0)+(message.includes(b.symbol)||message.includes(b.source.file)?100:0)})).sort((a,b)=>b.score-a.score).slice(0,4).map(({b})=>b);
 return {scope:'Curated notes on this implementation, bundled with this backend version. Not a live source-code inspection, complete development history, or proof that the currently deployed frontend matches this version. Code excerpts are not included.',notes:selected.map(c=>({topic:c.id,title:c[input.lang].title,overview:c[input.lang].intro,steps:c[input.lang].steps})),blocks:selectedBlocks};
}
