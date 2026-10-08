import {waterGlisten,addGardenWaterSurfaces} from './water-light.mjs?v=3';
// Every interactive object uses the illustration's coordinates. These are
// authored effects and story snippets, not generated art or extra AI calls.
export const gardenDiscoveries={
 lantern:{box:[1266,215,89,150],at:[1310,304],kind:'mote',label:['Brighten the Lantern','ランタンを明るくする']},
 books:{box:[1228,468,125,76],at:[1288,502],kind:'page',label:['Read a Tiny Garden Story','庭の小さなお話を読む']},
 crane:{box:[777,645,82,70],at:[817,681],kind:'star',label:['Make a Wish With the Paper Crane','紙の鶴に願いをこめる']},
 pebble:{box:[729,688,73,48],at:[768,710],kind:'mote',label:['Discover the Wishing Pebble','願いの小石を調べる']},
 nest:{box:[143,693,288,144],at:[285,750],kind:'leaf',label:['Fluff Yuki’s Leaf Nest','ゆきの巣をふわふわにする']},
 sky:{box:[338,42,327,292],at:[520,165],kind:'comet',label:['Send a Little Sky Wish','空に小さな願いを届ける']},
 castle:{box:[806,0,355,326],at:[1000,150],kind:'star',label:['Wake the Castle’s Magic','お城の魔法を呼び起こす']},
 'blossoms-west':{box:[0,0,330,236],at:[195,123],kind:'petal',label:['Brush the Left Cherry Blossoms','左の桜にそっと触れる']},
 'blossoms-east':{box:[1173,0,363,244],at:[1320,118],kind:'petal',label:['Brush the Right Cherry Blossoms','右の桜にそっと触れる']},
 flowers:{box:[1254,704,282,267],at:[1360,825],kind:'butterfly',label:['Invite the Garden Butterflies','庭のちょうちょを呼ぶ']},
 waterfall:{box:[1164,243,62,174],at:[1193,314],kind:'mist',label:['Feel the Waterfall Mist','滝のしぶきを感じる']}
};
const stories={
 lantern:[['A little brighter! That’s my “one more page before bed” light.','ちょっと明るくなった！『あと一ページだけ』の灯りだよ。'],['Soft and cosy again. Even a brave little dragon likes a night-light.','やさしい灯りに戻ったね。勇敢なドラゴンだって、夜の灯りは好きなんだ。']],
 books:[['Today’s tiny story: a dragon packed a library… and forgot to leave room for herself. A bigger basket next time!','今日の小さなお話。図書館をかごに詰めたドラゴン、自分の席を忘れちゃった！次は大きなかごにしよう。'],['This page says adventures begin with a question. Mine usually begin with “where’s my bookmark?”','冒険はひとつの質問から始まるんだって。わたしはだいたい「しおり、どこ？」から！'],['A cloud once borrowed a book. It brought it back a little misty, but right on time.','雲が本を借りたんだって。返ってきた本はちょっとしっとり。でも、ちゃんと約束の日だったよ。'],['One day, my flying library will have a shelf for every lovely question. And a very small snack shelf.','いつか空飛ぶ図書館に、すてきな質問を集めた棚を作りたいな。おやつの棚もちょこっとね。']],
 crane:[['A wish for my paper friend! Let’s give it something kind to carry.','紙のお友だちにお願い！やさしい願いを運んでもらおう。'],['The crane was my very first guiding adventure. I still ask where it wants to go.','初めて案内したのは、この鶴だったんだ。今でも、行き先をちゃんと聞くよ。'],['I wished for a smooth landing. The crane is being very patient with me.','上手に着地できますように。鶴は気長に見守ってくれてるよ。']],
 pebble:[['Not every treasure needs to glitter. This one keeps my book from flying away!','きらきらしてなくても宝物。この小石は、本が飛んでいくのを止めてくれるんだ！'],['A pocket-sized mountain. Well… a dragon-pocket-sized mountain.','ポケットに入る山だね。わたしのポケットだと、ちょっと大きいかな。'],['This is my thinking pebble. It’s very good at listening.','考えごとをするときの相棒だよ。聞き上手な小石なんだ。']],
 nest:[['A little fluff here, a leaf tucked there… perfect room for a sleepy tail.','ここをふわっと、あっちの葉っぱを少し。眠たいしっぽの場所もできた！'],['Nest inspection complete. Officially cosy. Extremely nap-worthy.','巣の点検、おしまい。ぽかぽか、ふわふわ。お昼寝にぴったり！'],['Thank you for tidying my leaves. I’ll try not to roll right out of them.','葉っぱを整えてくれてありがとう。ごろごろしすぎて、はみ出さないようにしなきゃ。']],
 sky:[['Off goes a little wish. Mine has books, warm lanterns, and plenty of wing room.','小さな願い、飛んでいけー。わたしの夢には、本と灯りと、羽を広げる場所がいっぱい。'],['That island looks just big enough for a reading picnic. Shall we dream up a route?','あの島、読書ピクニックによさそう。行き方を想像してみようか？'],['The sky has so much room for things we haven’t thought of yet.','まだ思いついてない夢も、あの空になら入りそうだね。']],
 castle:[['A little dragon magic for the towers! Nothing too loud—the clouds might be napping.','塔に、小さなドラゴンの魔法！静かにね。雲がお昼寝してるかもしれないから。'],['I imagine a library behind those windows. With stairs sized for very short legs.','あの窓の向こうが図書館だったらいいな。短い足でも登れる階段つきで！'],['The castle caught your sparkle. I think it likes having visitors.','お城にきらきらが届いたよ。お客さんが来て、うれしいのかも。']],
 blossoms:[['Petal shower! I caught… oh. That one caught my nose.','花びらのシャワー！つかまえた……あれ、鼻にくっついちゃった。'],['A tiny breeze, a whole little dance. The trees know how to celebrate.','そよ風ひとつで、みんな踊り出した！桜って、お祝い上手だね。'],['The blossoms are lending us confetti. We should say thank you.','桜が紙吹雪を貸してくれたみたい。ありがとう、って言っておこう。']],
 flowers:[['Hello, fluttery neighbours! Your landings are much neater than mine.','こんにちは、ひらひらのお隣さん！みんな、わたしより着地が上手だね。'],['Let’s let them choose their own flowers. A good guide leaves room for exploring.','どのお花に行くかは、ちょうちょに任せよう。寄り道も大事だもんね。'],['Those little wings make flying look so easy. I’m taking notes!','小さな羽で、すいすい飛んでる。よーし、観察して覚えよう！']],
 waterfall:[['A cool little mist! That’s the garden taking a big, sparkly breath.','ひんやり、きらきら！お庭が大きく深呼吸してるみたい。'],['The waterfall keeps going while I nap. Very dedicated. I should thank it later.','わたしがお昼寝してる間も、滝は流れてるんだね。あとで、ありがとうって言おう。'],['It looks like a ribbon the sky forgot to tie. A very splashy ribbon.','空が結び忘れたリボンみたい。しぶきがいっぱいのリボンだね。']]
};
export class GardenDiscoveries{
 constructor(){this.turns=new Map();this.lantern=false;}
 activate(id,ja=false){
  const target=gardenDiscoveries[id];if(!target)return null;
  const key=id.startsWith('blossoms-')?'blossoms':id,lines=stories[key],turn=this.turns.get(key)??0;
  this.turns.set(key,turn+1);if(id==='lantern')this.lantern=!this.lantern;
  return {target,text:lines[turn%lines.length][ja?1:0],lantern:this.lantern};
 }
}
export class GardenParticles{
 constructor(random=Math.random){this.random=random;this.items=[];this.serial=0;}
 burst(kind,at,count=12){
  for(let i=0;i<count;i++){
   const angle=this.random()*Math.PI*2,speed=24+this.random()*50;
   this.items.push({id:++this.serial,kind,x:at[0]+(this.random()-.5)*20,y:at[1]+(this.random()-.5)*14,age:0,life:kind==='petal'||kind==='butterfly'?6500:3600,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,phase:this.random()*6.28,size:kind==='butterfly'?2.3+this.random()*.9:2+this.random()*3});
  }
  this.items=this.items.slice(-90);
 }
 update(dt,active=true){if(!active)return;const step=Math.max(0,Math.min(64,dt));for(const p of this.items)p.age+=step;this.items=this.items.filter(p=>p.age<p.life);}
 clear(){this.items=[];}
}
export function particlePose(p){
 const t=p.age/1000,progress=p.age/p.life,fall=p.kind==='petal'||p.kind==='leaf';
 const x=p.x+p.vx*t*.48+Math.sin(t*2+p.phase)*8,y=p.y+(fall?24*t:p.kind==='butterfly'?-15*t:p.vy*t*.2-18*t);
 return {x,y,opacity:Math.sin(Math.PI*Math.min(1,progress))*Math.min(1,progress*8),rotation:fall?t*45+p.phase*30:Math.sin(t*2+p.phase)*12};
}
const NS='http://www.w3.org/2000/svg';
function el(doc,name,attrs={}){const n=doc.createElementNS(NS,name);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,String(v));return n;}
// Traced against petal-nook.png (1536 x 1024). Separate visible sections keep
// moving water behind the painted bridge, balustrade and flowering shrubs.
export const gardenWaterfalls=[
 {id:'island',top:191,bottom:289,opacity:.36,speed:2.6,width:1.1,
  glints:[[433,216,.5],[431,257,.45]],
  outline:'M428 191 Q433 190 438 192 L437 218 L435 246 L435 270 Q435 282 432 289 L427 289 Q430 275 429 253 L428 220Z',
  threads:['M430 191 C432 219 429 252 430 289','M434 191 C433 223 433 261 431 289','M437 193 C436 224 434 260 433 289']},
 {id:'castle-left',top:332,bottom:456,opacity:.44,speed:1.9,width:1.6,
  glints:[[867,354,.7],[872,374,.65],[847,432,.5]],
  outline:'M876 332 L881 332 Q879 353 880 385 L851 385 Q853 363 858 347 Q864 336 876 332Z M846 411 L853 411 Q855 419 859 427 L856 443 Q849 449 839 451 L833 451 Q838 431 846 411Z',
  threads:['M866 337 C856 352 861 373 850 408 S836 439 837 456','M870 335 C862 352 867 374 856 409 S845 441 845 456','M875 333 C869 354 873 377 862 411 S853 442 852 456','M879 332 C875 353 878 374 870 407 S859 439 859 456']},
 {id:'castle-right',top:259,bottom:361,opacity:.38,speed:2.1,width:1.5,
  glints:[[1198,284,.7],[1204,319,.6]],
  outline:'M1186 259 Q1198 259 1210 264 Q1217 280 1217 301 L1218 323 L1223 361 L1216 351 L1208 344 L1202 339 L1195 340 L1187 331 L1183 332 Q1189 309 1187 290Z',
  threads:['M1189 260 C1195 285 1185 309 1188 344','M1195 261 C1202 285 1190 316 1196 349','M1201 262 C1209 287 1199 320 1206 355','M1207 264 C1215 290 1208 324 1217 361']}
];
function addWaterfalls(doc,svg,defs){
 for(const spec of gardenWaterfalls){
  const clipId=`yg-fall-clip-${spec.id}`,fadeId=`yg-fall-fade-${spec.id}`;
  const clip=el(doc,'clipPath',{id:clipId,clipPathUnits:'userSpaceOnUse'});clip.append(el(doc,'path',{d:spec.outline}));defs.append(clip);
  const fade=el(doc,'linearGradient',{id:fadeId,gradientUnits:'userSpaceOnUse',x1:0,y1:spec.top,x2:0,y2:spec.bottom});
  for(const [offset,opacity] of [[0,0],[.08,.8],[.65,.7],[1,0]])fade.append(el(doc,'stop',{offset,'stop-color':'#e7fbff','stop-opacity':opacity}));defs.append(fade);
  const group=el(doc,'g',{'data-waterfall':spec.id,'clip-path':`url(#${clipId})`,opacity:spec.opacity});
  for(const [i,d] of spec.threads.entries())group.append(el(doc,'path',{class:'yg-distant-fall',d,stroke:`url(#${fadeId})`,'stroke-width':spec.width,style:`--delay:${-i*.61}s;--duration:${spec.speed+i*.17}s`}));
  group.append(waterGlisten(doc,spec.glints));
  svg.append(group);
 }
}
const shapes={petal:'M-3 0 Q0 -4 5 -1 Q2 5 -3 0',leaf:'M-4 0 Q0 -5 5 0 Q0 5 -4 0',page:'M-4 -5 Q0 -7 4 -4 L4 5 Q0 2 -4 4Z',star:'M0 -4 L1 -1 4 0 1 1 0 4 -1 1 -4 0 -1 -1Z',comet:'M-15 3 Q-5 3 0 0 M0 -4 L1 -1 4 0 1 1 0 4 -1 1 -4 0 -1 -1Z',butterfly:'M0 0 C-12 -13 -15 4 -3 5 Q-7 11 0 7 M0 0 C12 -13 15 4 3 5 Q7 11 0 7'};
export class GardenWorldLife{
 constructor(scene,{ja=false,feedback=()=>{},onNest=()=>{}}={}){
  Object.assign(this,{scene,ja,feedback,onNest});this.doc=scene.ownerDocument;this.view=this.doc.defaultView;this.model=new GardenDiscoveries();this.particles=new GardenParticles();this.nodes=new Map();this.buttons=new Map();this.last=0;this.brushAt=-Infinity;
  this.media=this.view.matchMedia('(prefers-reduced-motion: reduce)');
  this.svg=el(this.doc,'svg',{class:'yg-world-magic',viewBox:'0 0 1536 1024','aria-hidden':'true',focusable:'false'});
  const defs=el(this.doc,'defs'),glow=el(this.doc,'radialGradient',{id:'yg-warm-light'});glow.append(el(this.doc,'stop',{offset:'0','stop-color':'#fff6bd','stop-opacity':'.8'}));glow.append(el(this.doc,'stop',{offset:'1','stop-color':'#ffe389','stop-opacity':'0'}));defs.append(glow);this.svg.append(defs);
  this.lamp=el(this.doc,'ellipse',{class:'yg-lamp-aura',cx:1310,cy:304,rx:58,ry:78,fill:'url(#yg-warm-light)'});this.svg.append(this.lamp);
  const rays=el(this.doc,'g',{class:'yg-sun-rays',fill:'#fff7c6'});for(const [end,width] of [[430,48],[610,60],[750,23]])rays.append(el(this.doc,'path',{d:`M175 73 L${end} 485 L${end+width} 490Z`}));this.svg.append(rays);
  for(const [i,p] of [[420,200,135,16],[730,98,118,15],[673,312,100,9]].entries())this.svg.append(el(this.doc,'ellipse',{class:'yg-cloud-drift',cx:p[0],cy:p[1],rx:p[2],ry:p[3],style:`--delay:${-i*11}s`}));
  addWaterfalls(this.doc,this.svg,defs);
  addGardenWaterSurfaces(this.doc,this.svg,defs);
  this.effects=el(this.doc,'g');this.svg.append(this.effects);scene.append(this.svg);
  this.targets=this.doc.createElement('div');this.targets.className='yg-discoveries';scene.append(this.targets);
  for(const [id,spec] of Object.entries(gardenDiscoveries)){
   const b=this.doc.createElement('button');b.type='button';b.className='yg-discovery';b.dataset.discovery=id;b.setAttribute('aria-label',spec.label[ja?1:0]);b.title=spec.label[ja?1:0];
   const [x,y,w,h]=spec.box;Object.assign(b.style,{left:`${x/1536*100}%`,top:`${y/1024*100}%`,width:`${w/1536*100}%`,height:`${h/1024*100}%`});
   if(id==='lantern')b.setAttribute('aria-pressed','false');
   b.addEventListener('click',()=>this.activate(id));
   if(id.startsWith('blossoms-')||id==='flowers')b.addEventListener('pointermove',e=>{
    if(e.pointerType==='touch'||!this.active()||performance.now()-this.brushAt<1400)return;
    this.brushAt=performance.now();const r=scene.getBoundingClientRect();this.particles.burst(spec.kind,[(e.clientX-r.left)*1536/r.width,(e.clientY-r.top)*1024/r.height],id==='flowers'?1:4);
   },{passive:true});
   this.targets.append(b);this.buttons.set(id,b);
  }
  // A cropped-away landmark must not steal keyboard focus and scroll the scene.
  if(this.view.IntersectionObserver){this.observer=new this.view.IntersectionObserver(entries=>{for(const e of entries)e.target.tabIndex=e.intersectionRatio>=.35?0:-1;},{root:scene.parentElement,threshold:[0,.35]});for(const b of this.buttons.values())this.observer.observe(b);}
  this.onReduced=()=>{if(this.media.matches){this.particles.clear();this.render();}};this.media.addEventListener('change',this.onReduced);
  this.frame=now=>{const dt=this.last?now-this.last:0;this.last=now;if(this.active()){this.particles.update(dt);this.render();}this.raf=this.view.requestAnimationFrame(this.frame);};this.raf=this.view.requestAnimationFrame(this.frame);
 }
 active(){return !this.media.matches&&!this.doc.hidden&&this.scene.dataset.paused!=='true'&&this.scene.dataset.offscreen!=='true'&&this.doc.body.dataset.gardenPaused!=='true';}
 activate(id){
  const result=this.model.activate(id,this.ja);if(!result)return false;
  if(id==='lantern'){this.lamp.dataset.bright=String(result.lantern);this.buttons.get(id).setAttribute('aria-pressed',String(result.lantern));}
  if(this.active())this.particles.burst(result.target.kind,result.target.at,id==='flowers'?5:id.startsWith('blossoms-')?22:id==='sky'?5:12);
  this.feedback(result.text);if(id==='nest')this.onNest();return true;
 }
 breeze(){
  if(this.active())for(const id of ['blossoms-west','blossoms-east','flowers']){const p=gardenDiscoveries[id];this.particles.burst(p.kind,p.at,id==='flowers'?4:24);}
  const result=this.model.activate('blossoms-east',this.ja);this.feedback(result.text);
 }
 reveal(value){this.scene.dataset.discoveries=String(value);}
 render(){
  const live=new Set(this.particles.items.map(p=>p.id));for(const [id,n] of this.nodes)if(!live.has(id)){n.remove();this.nodes.delete(id);}
  for(const p of this.particles.items){
   let n=this.nodes.get(p.id);if(!n){n=el(this.doc,'g',{class:`yg-spark yg-spark-${p.kind}`});const shape=el(this.doc,shapes[p.kind]?'path':'circle',shapes[p.kind]?{d:shapes[p.kind]}:{r:p.kind==='mist'?8:2});n.append(shape);this.effects.append(n);this.nodes.set(p.id,n);}
   const v=particlePose(p);n.setAttribute('transform',`translate(${v.x.toFixed(2)} ${v.y.toFixed(2)}) rotate(${v.rotation.toFixed(1)}) scale(${(p.size/3).toFixed(2)})`);n.setAttribute('opacity',(v.opacity*(p.kind==='mist'?.3:.9)).toFixed(3));
  }
 }
 destroy(){this.view.cancelAnimationFrame(this.raf);this.media.removeEventListener('change',this.onReduced);this.observer?.disconnect();this.svg.remove();this.targets.remove();}
}
