import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ChatPermission,ChatVerification,chatEnvironment,chatConsentKey} from '../assets/yuki/runtime/chat-access.mjs';
import {chatUnavailable} from '../assets/yuki/protocol.mjs';

const origin='https://lsanderson1.github.io';
const config={origin,siteOrigin:origin,endpoint:'https://yuki.example/chat',siteKey:'public-test-key'};
const storage=()=>{const values=new Map();return {values,getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};};
const flush=()=>new Promise(resolve=>setImmediate(resolve));
function fixture({load,now}={}){
 const states=[],calls={loads:0,renders:[],resets:[],removes:[]};
 const api={render:(el,options)=>{calls.renders.push({el,options});return calls.renders.length-1;},reset:id=>calls.resets.push(id),remove:id=>calls.removes.push(id)};
 const v=new ChatVerification({load:async()=>{calls.loads++;return load?load(api):api;},element:{id:'check'},siteKey:'public-test-key',language:'ja',onState:s=>states.push(s),now});
 return {v,calls,states,api,get options(){return calls.renders.at(-1).options;}};
}
test('permission is opt-in and only the consent flag survives pages, languages and visits',()=>{
 const s=storage(),en=new ChatPermission(s);assert.equal(en.allowed,false);
 assert.equal(en.set(true),true);assert.equal(new ChatPermission(s).allowed,true);
 assert.deepEqual([...s.values],[[chatConsentKey,'granted']]);
 const ja=new ChatPermission(s);ja.set(false);assert.equal(en.reload(),false);assert.equal(new ChatPermission(s).allowed,false);assert.equal(s.values.size,0);
});
test('malformed permission never grants consent, and blocked storage still supports page-only permission',()=>{
 const s=storage();for(const value of ['true','false','1','{"allowed":true}','GRANTED']){s.setItem(chatConsentKey,value);assert.equal(new ChatPermission(s).allowed,false);}
 const p=new ChatPermission({getItem(){throw Error();},setItem(){throw Error();},removeItem(){throw Error();}});
 assert.equal(p.allowed,false);assert.equal(p.set(true),false);assert.equal(p.allowed,true);assert.equal(p.set(false),false);assert.equal(p.allowed,false);
 assert.equal(new ChatPermission().set(true),false);
});
test('only configured live origin exposes chat; preview never gets a production bypass',()=>{
 assert.deepEqual(chatEnvironment(config),{available:true,reason:'',liveOrigin:origin});
 for(const other of ['http://127.0.0.1:4175','http://localhost:4175','https://lsanderson1.github.io.evil.invalid','https://other.example',origin+':444','null']){
  assert.deepEqual(chatEnvironment({...config,origin:other}),{available:false,reason:'preview',liveOrigin:origin});
 }
 for(const patch of [{siteKey:''},{endpoint:'http://yuki.example/chat'},{endpoint:'https://secret@yuki.example/chat'},{siteOrigin:''},{siteOrigin:'http://localhost'},{siteOrigin:origin+'/unexpected'},{siteOrigin:origin+'?redirect=x'}])assert.equal(chatEnvironment({...config,...patch}).reason,'not-connected');
 for(const lang of ['en','ja'])assert.match(chatUnavailable('preview',lang),lang==='en'?/local preview.*published website/:/ローカルプレビュー.*公開サイト/);
});
test('verification does nothing until explicitly started and retains real challenge safeguards',async()=>{
 const f=fixture();assert.equal(f.calls.loads,0);assert.equal(f.v.state,'off');
 await Promise.all([f.v.start(),f.v.start()]);assert.equal(f.calls.loads,1);assert.equal(f.calls.renders.length,1);
 const p=f.options;assert.equal(p.appearance,'interaction-only');assert.equal(p.execution,'render');assert.equal(p.action,'yuki-chat');assert.equal(p.size,'compact');assert.equal(p.language,'ja');assert.equal(p['refresh-expired'],'auto');assert.equal(p['refresh-timeout'],'auto');assert.equal(p.retry,'auto');assert.equal(p['response-field'],false);
 assert.equal(f.v.state,'checking');f.v.stop();assert.deepEqual(f.calls.removes,[0]);
});
test('a submitted draft waits for verification, consumes one token and cannot reuse it',async()=>{
 const f=fixture();await f.v.start();let resolved=false;
 const first=f.v.takeToken().then(t=>{resolved=true;return t;});await flush();assert.equal(resolved,false);
 f.options['before-interactive-callback']();assert.equal(f.v.state,'interactive');assert.equal(resolved,false);
 f.options.callback('first');assert.equal(await first,'first');assert.equal(f.v.token,'');
 f.v.refresh();assert.deepEqual(f.calls.resets,[0]);
 const second=f.v.takeToken();await flush();f.options.callback('second');assert.equal(await second,'second');f.v.stop();
});
test('tokens near expiry are refreshed, and expired callbacks discard the old token',async()=>{
 let clock=100;const f=fixture({now:()=>clock});await f.v.start();f.options.callback('old');clock+=270001;
 const pending=f.v.takeToken();await flush();assert.deepEqual(f.calls.resets,[0]);assert.equal(f.v.token,'');
 f.options.callback('fresh');assert.equal(await pending,'fresh');
 f.options.callback('expired');f.options['expired-callback']();assert.equal(f.v.token,'');assert.equal(f.v.state,'checking');f.v.stop();
});
test('revoking permission during script loading prevents a widget and ignores late completion',async()=>{
 let finishLoad;const f=fixture({load:api=>new Promise(resolve=>{finishLoad=()=>resolve(api);})});
 const start=f.v.start();f.v.stop();finishLoad();await assert.rejects(start,/cancelled/);assert.equal(f.calls.renders.length,0);assert.equal(f.v.state,'off');
});
test('closing or revoking cancels a queued draft and stale callbacks cannot restore a token',async()=>{
 const f=fixture();await f.v.start();const old=f.options;
 const pending=f.v.takeToken();await flush();f.v.stop();await assert.rejects(pending,/cancelled/);
 old.callback('late');old['before-interactive-callback']();assert.equal(f.v.state,'off');assert.equal(f.v.token,'');
 await f.v.start();old.callback('still-stale');assert.equal(f.v.token,'');f.options.callback('new');assert.equal(await f.v.takeToken(),'new');f.v.stop();
});
test('cancel works immediately even while the script is still loading',async()=>{
 let finishLoad;const f=fixture({load:api=>new Promise(resolve=>{finishLoad=()=>resolve(api);})}),controller=new AbortController();
 const pending=f.v.takeToken(controller.signal);controller.abort();await assert.rejects(pending,/cancelled/);
 f.v.stop();finishLoad();await flush();assert.equal(f.calls.renders.length,0);
});

test('an already-cancelled send never loads verification',async()=>{
 const f=fixture(),controller=new AbortController();controller.abort();
 await assert.rejects(f.v.takeToken(controller.signal),/cancelled/);assert.equal(f.calls.loads,0);
});

test('reset failures fail closed and synchronous refresh callbacks are not lost',async()=>{
 let clock=100;const f=fixture({now:()=>clock});await f.v.start();f.options.callback('old');clock+=270001;
 f.api.reset=()=>{throw Error('unavailable');};await assert.rejects(f.v.takeToken(),/verification/);assert.equal(f.v.token,'');
 f.api.reset=()=>f.options.callback('new');assert.equal(await f.v.takeToken(),'new');assert.equal(f.v.token,'');f.v.stop();
});
test('cancel and duplicate submit cannot create a second queued message',async()=>{
 const f=fixture(),controller=new AbortController();await f.v.start();const first=f.v.takeToken(controller.signal);await flush();
 await assert.rejects(f.v.takeToken(),/verification-busy/);controller.abort();await assert.rejects(first,/cancelled/);
 f.options.callback('late-but-valid');assert.equal(f.v.waiter,null);assert.equal(await f.v.takeToken(),'late-but-valid');f.v.stop();
});
test('loader failure allows a deliberate retry without persisting anything',async()=>{
 let failed=true;const f=fixture({load:api=>{if(failed)throw Error('offline');return api;}});
 await assert.rejects(f.v.start(),/offline/);assert.equal(f.v.state,'error');assert.equal(f.v.active,false);
 failed=false;await f.v.start();f.options.callback('ok');assert.equal(await f.v.takeToken(),'ok');f.v.stop();
});
test('challenge errors reject pending sends; recovery never itself submits a message',async()=>{
 const f=fixture();await f.v.start();const pending=f.v.takeToken();await flush();f.options['error-callback']();await assert.rejects(pending,/verification/);
 assert.equal(f.v.state,'error');assert.equal(f.v.waiter,null);f.options.callback('recovered');assert.equal(f.v.state,'ready');assert.equal(f.v.waiter,null);f.v.stop();
});
test('unsupported browser and invalid tokens fail closed',async()=>{
 const f=fixture();await f.v.start();f.options['unsupported-callback']();await assert.rejects(f.v.takeToken(),/verification/);
 for(const token of ['',null,'x'.repeat(2049)]){f.options.callback(token);assert.equal(f.v.state,'error');assert.equal(f.v.token,'');}f.v.stop();
});
test('UI wiring gates every submit on permission and verification, with no automatic AI retry',()=>{
 const ui=readFileSync(new URL('../assets/yuki/yuki.mjs',import.meta.url),'utf8');
 const include=readFileSync(new URL('../_includes/yuki.html',import.meta.url),'utf8');
 assert.match(include,/data-site-origin/);assert.match(ui,/if\(!online\|\|busy\)\{status\(offline\)/);assert.match(ui,/if\(!permission.allowed\)/);
 assert(ui.indexOf('if(!online||busy)')<ui.indexOf('await verification.takeToken'));
 assert.match(ui,/await verification.takeToken\(requestController.signal\)/);assert.match(ui,/signal.aborted\|\|!permission.allowed/);
 assert.match(ui,/if\(online&&permission.allowed&&open&&!document.hidden\)/);assert.match(ui,/addEventListener\('storage'/);
 assert.match(ui,/requestController.abort\(\)/);assert.equal((ui.match(/fetch\(endpoint/g)||[]).length,1);
 assert.match(ui,/Cancel sending/);assert.match(ui,/access.reason==='preview'/);assert.match(ui,/offline=chatUnavailable\(access.reason/);
});
