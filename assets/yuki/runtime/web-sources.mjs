// Links are displayed, never fetched by the browser or used as guide targets.
export function safeWebURL(value){
 if(typeof value!=='string'||value.length>2000||/[\s\\\u0000-\u001f\u007f]/.test(value))return null;
 try{
  const u=new URL(value),host=u.hostname.toLowerCase();
  if(u.protocol!=='https:'||u.username||u.password||u.port||!host.includes('.')||host.endsWith('.')||host.includes(':')||/^[\d.]+$/.test(host)||/(?:^|\.)(?:localhost|local|internal|invalid|test|example|onion)$/.test(host))return null;
  if(/[?&](?:token|key|api_key|password|secret|code|auth)=/i.test(u.search))return null;
  u.hash='';return u.href;
 }catch{return null;}
}
