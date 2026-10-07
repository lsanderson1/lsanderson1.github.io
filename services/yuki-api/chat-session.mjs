// A verified chat pass, not a reusable Turnstile token. Fixed two-hour expiry,
// scoped to this site and the Cloudflare-provided network address. No PII in it.
export const sessionLifetimeMs=7200000;
const bytes=new TextEncoder();
const keyFor=secret=>crypto.subtle.importKey('raw',bytes.encode('yuki-chat-session-v1:'+secret),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);
const hex=data=>[...new Uint8Array(data)].map(n=>n.toString(16).padStart(2,'0')).join('');
const payload=(expires,origin,ip)=>JSON.stringify(['yuki-chat-v1',expires,origin,ip]);
export async function issueChatSession(secret,origin,ip,now=Date.now()){
 const expires=now+sessionLifetimeMs;
 return {pass:`${expires}.${hex(await crypto.subtle.sign('HMAC',await keyFor(secret),bytes.encode(payload(expires,origin,ip))))}`,expires};
}
export async function verifyChatSession(pass,secret,origin,ip,now=Date.now()){
 if(typeof pass!=='string'||!/^\d{13}\.[a-f0-9]{64}$/.test(pass))return false;
 const [stamp,signature]=pass.split('.'),expires=Number(stamp);
 if(expires<=now||expires>now+sessionLifetimeMs)return false;
 return crypto.subtle.verify('HMAC',await keyFor(secret),Uint8Array.from(signature.match(/../g),h=>parseInt(h,16)),bytes.encode(payload(expires,origin,ip)));
}
