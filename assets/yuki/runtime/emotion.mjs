import {Greeting} from './greeting.mjs';
// A complete-character expression clip, never facial or limb compositing.
export class Emotion {
 constructor(clips={}){this.clips=clips;this.reset();}
 reset(){this.kind=null;this.clip=null;}
 request(kind){
  if(this.active||this.requested||!Object.hasOwn(this.clips,kind))return false;
  this.clip=new Greeting(this.clips[kind]);this.kind=kind;return this.clip.request();
 }
 update(ms,options={}){
  if(!Number.isFinite(ms)||ms<0||ms>1000)throw new Error('Invalid emotion delta');
  if(!this.clip)return false;
  const finished=this.clip.update(ms,options);
  if(finished||(!this.clip.active&&!this.clip.requested))this.reset();
  return finished;
 }
 get active(){return this.clip?.active??false;}
 get requested(){return this.clip?.requested??false;}
 get frame(){return this.clip?.frame??null;}
}
