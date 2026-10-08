// Resolve references against the published catalog, never against client text
// or guessed image identities. This scales to newly indexed project pages.
const canonical=path=>path.replace(/^\/ja(?=\/)/,'').replace(/\/index\.html$/,'/');
const normalize=text=>text.toLowerCase().replace(/[’']/g,"'").replace(/\s+/g,' ').trim();
export function questionPage(pages,message){
 const q=normalize(message);
 const aliases=[
  ['/',/\b(?:landing page|home ?page|front page)\b|\b(?:on|from) (?:the )?(?:home|landing)\b|トップページ|ホームページ|ホームの(?:写真|画像)/],
  ['/resume.html',/\b(?:resume|résumé|cv)\b|履歴書|レジュメ/],
  ['/projects/',/\bprojects\s+(?:page|tab|section)\b|作品一覧|プロジェクト一覧/],
  ['/essays/',/\bessays\s+(?:page|tab|section)\b|エッセイ一覧/],
  ['/unreal-journey/',/\bunreal journey\b|開発記録(?:のページ|ページ)/],
  ['/yuki/',/\byuki'?s? garden\b|ゆきの庭/]
 ];
 // Full specific project/essay titles win over a broad category mention.
 const titles=pages.filter(p=>normalize(p.title).length>=4&&q.includes(normalize(p.title)))
  .sort((a,b)=>b.title.length-a.title.length);
 if(titles.length&&!(titles.length>1&&titles[0].title.length===titles[1].title.length))return titles[0];
 const paths=aliases.filter(([,re])=>re.test(q)).map(([path])=>path);
 return paths.length===1?pages.find(p=>canonical(p.url)===paths[0])??null:null;
}
export function questionImages(pages,input,current,lastGuided,mentioned){
 const q=normalize(input.message);
 const asksImage=/\b(?:picture|photo(?:graph)?|portrait|headshot|image|screenshot|illustration|diagram)s?\b|画像|写真|肖像|イラスト|図解|この人|あの人/.test(q)||/\bwho (?:is|was) (?:this|that|the person)\b/.test(q);
 if(!asksImage)return null;
 const refersGuide=/\b(?:you (?:just )?showed|you pointed|just shown)\b|さっき(?:見せ|案内)|指さし/.test(q);
 const route=mentioned?.url??(refersGuide?lastGuided?.page:null)??current?.page;
 const page=pages.find(p=>p.url===route);if(!page)return null;
 const all=page.sections.filter(s=>s.kind==='image');
 const visible=new Set(!mentioned&&page.url===current?.page?input.context?.images??[]:[]);
 const selected=refersGuide&&!mentioned&&lastGuided?.kind==='image'?lastGuided:!mentioned?current:null;
 let images=all,basis='page-images';
 if(selected?.kind==='image'&&selected.page===page.url){images=all.filter(s=>s.id===selected.section);basis='reading-image';}
 else if(visible.size){images=all.filter(s=>visible.has(s.id));basis='visible-images';}
 // A named description (e.g. "overhead room") can disambiguate a whole page.
 // Generic picture/person words never manufacture an identity.
 const words=(q.match(/[a-z0-9]{3,}/g)||[]).filter(w=>!['the','this','that','picture','photo','image','who','person','page','what','show','does','look','like','landing','home'].includes(w));
 const score=s=>(normalize(s.title).length>=4&&q.includes(normalize(s.title))?100:0)+words.filter(w=>normalize(s.title).includes(w)).length;
 const ranked=all.map(s=>({s,n:score(s)})).sort((a,b)=>b.n-a.n);
 if(ranked[0]?.n>0&&ranked[0].n>(ranked[1]?.n??0)){images=[ranked[0].s];basis='named-description';}
 else if(/\b(?:who|portrait|headshot|profile)\b|誰|だれ|プロフィール|肖像/.test(q)){
  const portraits=images.filter(s=>/portrait|headshot|profile (?:photo|picture)|プロフィール|肖像|顔写真/i.test(s.title));
  if(portraits.length===1){images=portraits;basis='published-portrait-description';}
 }
 return {page:page.url,title:page.title,basis,ambiguous:images.length!==1,total:images.length,images:images.slice(0,4).map(s=>({section:s.id,title:s.title,sourceId:`${page.id}::${s.id}`}))};
}
