// Consent is separate from conversation history. Never persist bot-check tokens.
export const chatConsentKey='yuki-chat-consent-v1';
export class ChatPermission {
 constructor(storage){this.storage=storage;this.reload();}
 reload(){try{this.allowed=this.storage?.getItem(chatConsentKey)==='granted';}catch{this.allowed=false;}return this.allowed;}
 set(value){this.allowed=value===true;try{
  if(!this.storage)return false;
  if(this.allowed)this.storage.setItem(chatConsentKey,'granted');else this.storage.removeItem(chatConsentKey);
  return true;
 }catch{return false;}}
}

export function chatEnvironment({origin,siteOrigin,endpoint,siteKey}){
 let liveOrigin='';
 try{const site=new URL(siteOrigin);if(site.protocol==='https:'&&!site.username&&!site.password&&site.pathname==='/'&&!site.search&&!site.hash)liveOrigin=site.origin;}catch{}
 try{const api=new URL(endpoint);if(!liveOrigin||!siteKey||api.protocol!=='https:'||api.username||api.password)throw Error();}
 catch{return {available:false,reason:'not-connected',liveOrigin};}
 return {available:origin===liveOrigin,reason:origin===liveOrigin?'':'preview',liveOrigin};
}

function abortable(promise,signal){
 if(!signal)return promise;
 return new Promise((resolve,reject)=>{
  const abort=()=>{signal.removeEventListener('abort',abort);reject(Error('cancelled'));};
  promise.then(value=>{signal.removeEventListener('abort',abort);resolve(value);},error=>{signal.removeEventListener('abort',abort);reject(error);});
  if(signal.aborted){abort();return;}
  signal.addEventListener('abort',abort,{once:true});
 });
}

// A single in-memory, single-use token. The Worker still validates every token.
// load() and the Turnstile API are injected so tests never contact Cloudflare.
export class ChatVerification {
 constructor({load,element,siteKey,language='en',onState=()=>{},now=Date.now}){
  Object.assign(this,{load,element,siteKey,language,onState,now});
  this.active=false;this.epoch=0;this.widget=null;this.token='';this.state='off';
 }
 change(state){this.state=state;this.onState(state);}
 fail(reason='verification'){this.token='';this.finish(Error(reason));}
 finish(error,token){const waiter=this.waiter;if(!waiter)return;this.waiter=null;waiter.cleanup();if(error)waiter.reject(error);else waiter.resolve(token);}
 accept(token){
  if(typeof token!=='string'||!token||token.length>2048){this.fail();this.change('error');return;}
  this.token=token;this.issued=this.now();this.change('ready');
  if(this.waiter){this.token='';this.finish(null,token);}
 }
 async start(){
  if(this.starting)return this.starting;
  if(this.active&&this.widget!==null)return;
  this.active=true;const epoch=++this.epoch;this.change('loading');
  const current=()=>this.active&&this.epoch===epoch;
  const guard=fn=>(...args)=>{if(current())return fn(...args);};
  const attempt=(async()=>{
   try{
    const api=await this.load();if(!current())throw Error('cancelled');this.api=api;this.change('checking');
    this.widget=api.render(this.element,{
     sitekey:this.siteKey,action:'yuki-chat',size:'compact',language:this.language,
     appearance:'interaction-only',execution:'render',retry:'auto',
     'refresh-expired':'auto','refresh-timeout':'auto','response-field':false,
     callback:guard(token=>this.accept(token)),
     'before-interactive-callback':guard(()=>this.change('interactive')),
     'after-interactive-callback':guard(()=>{if(!this.token)this.change('checking');}),
     'expired-callback':guard(()=>{this.token='';this.change('checking');}),
     'timeout-callback':guard(()=>{this.token='';this.change('checking');}),
     'error-callback':guard(()=>{this.fail();this.change('error');}),
     'unsupported-callback':guard(()=>{this.fail();this.change('unsupported');})
    });
   }catch(error){if(current()){this.active=false;this.fail();this.change('error');}throw error;}
  })();
  this.starting=attempt;
  try{await attempt;}finally{if(this.starting===attempt)this.starting=null;}
 }
 async takeToken(signal){
  if(signal?.aborted)throw Error('cancelled');
  await abortable(this.start(),signal);
  if(signal?.aborted||!this.active)throw Error('cancelled');
  if(this.token&&this.now()-this.issued>=0&&this.now()-this.issued<270000){const token=this.token;this.token='';return token;}
  if(this.token||this.state==='error')this.refresh();
  if(this.state==='unsupported'||this.state==='error')throw Error('verification');
  if(this.token){const token=this.token;this.token='';return token;}
  if(this.waiter)throw Error('verification-busy');
  return new Promise((resolve,reject)=>{
   const abort=()=>this.finish(Error('cancelled'));
   const timer=setTimeout(()=>this.finish(Error('verification')),60000);
   this.waiter={resolve,reject,cleanup:()=>{clearTimeout(timer);signal?.removeEventListener('abort',abort);}};
   signal?.addEventListener('abort',abort,{once:true});
  });
 }
 refresh(){
  this.token='';if(!this.active||this.widget===null)return;
  this.change('checking');try{this.api.reset(this.widget);}catch{this.fail();this.change('error');}
 }
 stop(){
  this.active=false;this.epoch++;this.starting=null;this.token='';this.finish(Error('cancelled'));
  if(this.widget!==null){try{this.api.remove(this.widget);}catch{}this.widget=null;}
  this.change('off');
 }
}
