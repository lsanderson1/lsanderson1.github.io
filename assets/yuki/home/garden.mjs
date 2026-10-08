// All perches share the illustration's coordinates. The viewport crops the
// picture and pans with Yuki; her feet and travel path are remapped together.
import {HomeDialogue} from './home-dialogue.mjs';
import {attachAmbience} from './ambience.mjs';
import {GardenCamera,attachGardenExplorer} from './camera.mjs?v=2';
import {GardenPond} from './pond.mjs';
import {GardenWorldLife} from './world-life.mjs';
export const gardenSpots={nest:{x:.20,y:.775},pond:{x:.35,y:.655},lookout:{x:.53,y:.48},books:{x:.745,y:.635},treasures:{x:.67,y:.80}};
export function gardenPoint(id,rect,scroll=0){const p=gardenSpots[id]??gardenSpots.nest;return {x:rect.left+p.x*rect.width,y:rect.top+scroll+p.y*rect.height};}
const tales={
 nest:{en:['THE LEAF NEST','An adventure needs a nap, too.','Soft leaves? Check. Room for my tail? Check. One tiny nap before a very important adventure… zzz. Tap me when you’re ready to explore!','Why do you curl up in your nest?'],ja:['葉っぱの巣','冒険にも、お昼寝にも。','ふわふわの葉っぱ、よし。しっぽの場所、よし。あとは……すやぁ。起きたら、一緒に庭を探検しようね！','巣ではどんなふうに過ごしているの？'],emotion:'neutral'},
 pond:{en:['THE LILY POND','A very important reflection.','There’s a little dragon in the water! Oh. That’s me. I like watching the ripples here—much easier than trying to catch every falling petal. Shall we sit for a moment?','Tell me a little story about the pond in your garden.'],ja:['スイレンの池','水面に、小さなドラゴン。','あっ、池にもドラゴン！……わたしだった。花びらを全部追いかけるのは大変だけど、波紋を眺めるのは得意。ちょっと一緒に座ろうか。','庭の池にまつわるお話を聞かせて。'],emotion:'amused'},
 lookout:{en:['THE SKY LOOKOUT','Someday, a flying library.','See all that sky? Someday I’d love a tiny flying library, with warm lanterns and petal bookmarks. English signs, Japanese signs… and very gentle landings. That last bit still needs practice!','Tell me more about your dream of a flying library.'],ja:['空の見晴らし台','いつか、空飛ぶ図書館を。','あの広い空に、小さな図書館を飛ばしたいんだ。あたたかい灯りと、花びらのしおり。日本語と英語の案内も！着地はそーっと……そこはまだ練習中。','空飛ぶ図書館の夢について、もっと聞かせて。'],emotion:'delighted'},
 books:{en:['THE READING NOOK','A small corner for big questions.','The Lantern Keeper taught me to look carefully and ask when I’m not sure. These books remind me of that. I can help you explore this portfolio, too—one little question at a time. What are you curious about?','How did the Lantern Keeper help you become a guide?'],ja:['読書のコーナー','大きな疑問も、少しずつ。','よく見て、わからなかったら聞く。灯りの番人が教えてくれた、大切なこと。本を開くと、いつも思い出すんだ。このサイトの案内も任せてね。何が気になる？','灯りの番人には、案内役としてどんなことを教わったの？'],emotion:'thoughtful'},
 treasures:{en:['LITTLE TREASURES','Not all treasure has to sparkle.','A smooth pebble, a paper crane, and a notebook full of questions. A pebble can hold a page open! My first guiding adventure involved a paper crane; it taught me to ask where someone wants to go before flapping off.','Tell me about your paper-crane guiding adventure.'],ja:['小さな宝物','きらきらしてなくても、宝物。','つるつるの小石、紙の鶴、疑問を集めたノート。小石は本のページを押さえるのにぴったり！初めての案内は紙の鶴が相手だったんだ。飛び出す前に、行き先を聞くのが大事だってわかったよ。','紙の鶴を案内したときのお話を聞かせて。'],emotion:'proud'}
};
export class GardenHome{
 constructor(scene,api,{ja=false,reduced=false,storage}={}){
  Object.assign(this,{scene,api,ja,reduced,selected:'nest',pending:null,serial:0,inactive:0,paused:false,expression:0});
  this.doc=scene.ownerDocument;this.state=this.doc.querySelector('.yg-garden-state');
  this.dialogue=new HomeDialogue(Math.random,storage);this.chatClock=0;this.floating=false;
  if(scene.parentElement?.getBoundingClientRect){this.camera=new GardenCamera(scene);this.fitView();this.detachExplorer=attachGardenExplorer(scene,this.camera);}
  if(this.doc.body){
   attachAmbience(scene);this.pond=new GardenPond(scene,{ja,feedback:text=>this.discovery(text)});
   this.worldLife=new GardenWorldLife(scene,{ja,feedback:text=>this.discovery(text),onNest:()=>{void this.go('nest');}});
  }
  const closeMenu=()=>{const menu=this.doc.querySelector('.yg-menu');if(menu?.open){menu.open=false;menu.querySelector('summary').focus({preventScroll:true});}};
  for(const b of this.doc.querySelectorAll('[data-garden-spot]'))b.addEventListener('click',()=>{closeMenu();void this.go(b.dataset.gardenSpot);});
  for(const b of this.doc.querySelectorAll('[data-garden-action]'))b.addEventListener('click',()=>{closeMenu();void this.action(b.dataset.gardenAction,b);});
  this.doc.querySelector('.yg-menu')?.addEventListener?.('keydown',e=>{if(e.key==='Escape')closeMenu();});
  this.say(ja?'すやすや…。場所を選んで、庭を探検してね。':'A little nap in the sunshine. Pick a place to explore.');
  this.remark();
 }
 fitView(position){this.camera?.update(position,{reduced:this.reduced});}
 setPresence(present){const thought=this.doc.querySelector('.yg-thought');if(thought&&thought.hidden===present)thought.hidden=!present;}
 get height(){return Math.max(90,Math.min(165,(this.scene.parentElement??this.scene).getBoundingClientRect().width*.155));}
 point(id=this.selected){return gardenPoint(id,this.scene.getBoundingClientRect(),window.scrollY);}
 spotAt(position){if(!position)return null;return Object.keys(gardenSpots).find(id=>{const p=this.point(id);return Math.hypot(position.x-p.x,position.y-p.y)<18;})??null;}
 say(text){this.state.textContent=text;}
 discovery(text){this.inactive=0;this.chatClock=0;this.say(text);const line=this.doc.querySelector('[data-home-dialogue]');if(line)line.textContent=this.ja?`「${text.replaceAll('「','『').replaceAll('」','』')}」`:`“${text}”`;}
 remark(){const line=this.doc.querySelector('[data-home-dialogue]');if(line){const text=this.dialogue.next(this.selected,this.ja);line.textContent=this.ja?`「${text}」`:`“${text}”`;}this.chatClock=0;}
 cancel(){this.serial++;this.pending=null;this.doc.querySelector('[data-garden-action="chase"]').disabled=false;this.doc.querySelector('.yg-chase-petal').hidden=true;}
 story(id){this.selected=id;for(const b of this.doc.querySelectorAll('[data-garden-spot]'))b.setAttribute('aria-pressed',String(b.dataset.gardenSpot===id));}
 async go(id,{sleep=id==='nest',emotion=null,hover=false}={}){
  if(this.paused){this.say(this.ja?'「庭の動きを再開」で、また一緒に遊ぼう！':'Resume the garden when you’re ready to play again!');return;}
  if(!gardenSpots[id])return;const serial=++this.serial;this.pending=null;this.inactive=0;
  this.doc.querySelector('[data-garden-action="chase"]').disabled=false;this.doc.querySelector('.yg-chase-petal').hidden=true;
  this.camera?.follow();this.story(id);this.say(this.ja?'羽の準備中…':'Getting my little wings ready…');
  try{await this.api.prepare();if(serial!==this.serial)return false;this.floating=hover&&!this.reduced;this.api.travel(this.point(id),{arrival:this.floating?'hover':'land'});this.pending={id,sleep,emotion,hover:this.floating};this.say(this.ja?'そっちへ、ぱたぱたっ！':'A little flap… coming over!');return true;}
  catch{if(serial===this.serial)this.say(this.ja?'飛行画像を読み込めなかったよ。もう一度試してね。':'My flight artwork couldn’t load. Please try that spot again.');}
 }
 async action(action,button){
  this.inactive=0;
  if(action==='motion'){this.paused=!this.paused;this.scene.dataset.paused=String(this.paused);button.setAttribute('aria-pressed',String(this.paused));button.textContent=this.paused?(this.ja?'庭の動きを再開':'Resume Garden'):(this.ja?'庭の動きを止める':'Pause Garden');this.api.pause(this.paused);return;}
  if(action==='chat'){this.cancel();this.api.chat();return;}
  if(action==='home-line'){this.remark();return;}
  if(action==='breeze'){this.worldLife?.breeze();return;}
  if(action==='discover'){const show=this.scene.dataset.discoveries!=='true';this.worldLife?.reveal(show);button.setAttribute('aria-pressed',String(show));this.say(this.ja?'光る場所をタップしてみて。桜や花は、マウスでそっとなぞっても遊べるよ。':'Tap the glowing places. You can also brush the blossoms and flowers with your pointer.');return;}
  if(action==='pond-play'){
   const moved=await this.go('pond',{sleep:false});if(moved&&this.pending)this.pending.splash=true;return;
  }
  if(action==='glide'){
   if(this.floating){this.floating=false;this.api.land?.();this.say(this.ja?'羽をそっとたたんで、着地するね。':'A soft landing, then a little wing rest.');return;}
   return this.go('lookout',{sleep:false,hover:true,emotion:'thoughtful'});
  }
  if(action==='ask'||action==='making'){
   const prompt=action==='making'?(this.ja?'このサイトのゆきの絵、アニメーション、AIがどう作られているか詳しく教えて。':'Explain how your artwork, animation and AI work on this website, using the making-of information.'):tales[this.selected][this.ja?'ja':'en'][3];
   this.cancel();this.api.chat(prompt);return;
  }
  if(action==='fly'){const ids=['lookout','pond','books','treasures'].filter(id=>id!==this.selected);return this.go(ids[Math.floor(Math.random()*ids.length)],{sleep:false});}
  if(action==='chase'){
   const b=this.doc.querySelector('[data-garden-action="chase"]');
   if(this.paused){this.say(this.ja?'先に庭の動きを再開してね。':'Resume the garden first, then we can play!');return;}
   const next=(this.chase??0)+1;
   const ids=['lookout','pond','books'];
   b.textContent=this.ja?`花びらを追いかける ${next}/3`:`Chase Petals ${next}/3`;
   const moved=await this.go(ids[(next-1)%3],{sleep:false,emotion:next===3?'proud':'delighted'});
   if(moved&&this.pending){this.pending.chase=next;b.disabled=true;const petal=this.doc.querySelector('.yg-chase-petal'),p=gardenSpots[this.pending.id];petal.hidden=false;petal.style.left=p.x*100+'%';petal.style.top=p.y*100-10+'%';}else b.disabled=false;
   return;
  }
  if(action==='expression')return this.go('treasures',{sleep:false,emotion:['delighted','shy','thoughtful','amused'][this.expression++%4]});
 }
 update(dt,{settled,hovering=false,locked,open,busy,hidden,guiding=false}){
  if(this.paused||hidden)return;
  const glide=this.doc.querySelector('[data-garden-action="glide"]');if(glide)glide.textContent=this.floating?(this.ja?'そっと着地':'Land Softly'):(this.ja?'空でひと休み':'Float & Daydream');
  if(guiding){this.pending=null;this.inactive=0;return;}
  if(open||busy)this.inactive=0;else this.inactive+=dt;
  // Sleeping still gets quiet dream-thoughts; previously the locked sleep pose
  // stopped this timer, making most of the pool appear to be missing.
  if(!open&&!busy&&!this.pending&&settled){this.chatClock+=dt;if(this.chatClock>25000)this.remark();}
  if(this.pending&&(settled||this.pending.hover&&hovering)&&!locked){const p=this.pending;this.pending=null;this.remark();
   if(p.splash)this.pond?.play();
   if(p.chase){this.chase=p.chase;this.doc.querySelector('.yg-chase-petal').hidden=true;const b=this.doc.querySelector('[data-garden-action="chase"]');b.disabled=false;if(this.chase===3){this.chase=0;b.textContent=this.ja?'もう一度、花びらを追う':'Chase Petals Again';this.say(this.ja?'3枚追いかけた！ふぅ、ちょっと休憩！':'Three petals followed! Phew. These little wings earned a rest.');}else this.say(this.ja?'追いついた！次の花びらはどこかな？':'Caught up! Where will the next petal go?');this.api.react({text:this.state.textContent,emotion:p.emotion,gesture:'none'});return;}
   if(p.sleep&&!open){this.api.sleep();this.say(this.ja?'ふわふわの巣で、すやすや…。':'Curled up in my leaf nest… zzz.');}
   else{const t=tales[p.id];if(p.id!=='nest'&&!p.hover)this.api.point(p.id==='books'?'pointRight':'pointLeft');this.api.react({text:t[this.ja?'ja':'en'][2],emotion:p.emotion??t.emotion,gesture:'talkOpen'});this.say(p.hover?(this.ja?'ぱたぱたしながら、夢の図書館を考え中。':'Little wingbeats, big library dreams. Choose “Land Softly” when you like.'):(this.ja?'着いたよ！気になることがあったら、わたしに聞いてね。':'Here we are! Tap me to ask about this little corner.'));}
  }
  if(!locked&&!open&&!busy&&!this.pending&&settled&&this.inactive>90000){this.inactive=0;void this.go('nest');}
 }
}
