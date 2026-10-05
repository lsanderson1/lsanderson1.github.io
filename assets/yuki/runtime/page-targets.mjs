import {safeSitePath} from '../protocol.mjs';

// Resolve only published URLs and real document elements. AI cannot supply CSS,
// scripts, external navigation, or arbitrary coordinates.
export function localizedPages(pages,lang,base=''){
 return (Array.isArray(pages)?pages:[]).filter(p=>p?.lang===lang&&typeof p.title==='string'&&safeSitePath(p.url,base)).map(p=>({title:p.title,url:safeSitePath(p.url,base)}));
}
export function localizePath(path,pages,lang,base=''){
 const safe=safeSitePath(path,base);if(!safe)return null;
 const u=new URL(safe,'https://portfolio.invalid'),bare=u.pathname.slice(base.length).replace(/^\/ja(?=\/)/,'');
 const counterpart=pages.find(p=>p?.lang===lang&&safeSitePath(p.url,base)&&p.url.split('#')[0].slice(base.length).replace(/^\/ja(?=\/)/,'')===bare);
 return counterpart?safeSitePath(counterpart.url+u.hash,base):safe;
}
export function findPageTarget(doc,path,currentPath){
 const u=new URL(path,'https://portfolio.invalid');
 if(u.pathname===currentPath){
  if(u.hash){const el=doc.getElementById(u.hash.slice(1));if(el)return el;}
  return doc.querySelector('main h1, .fp-resume-head h1, h1');
 }
 const links=[...doc.querySelectorAll('a[href]')].filter(a=>!a.closest('#yuki-companion'));
 const link=links.find(a=>{try{return new URL(a.href).pathname===u.pathname;}catch{return false;}});
 // Prefer a card to a duplicate navigation link, and its real title to artwork.
 const cardLink=links.find(a=>{try{return new URL(a.href).pathname===u.pathname&&a.closest('article');}catch{return false;}});
 if(cardLink){const card=cardLink.closest('article');return card.querySelector('h2, h3')??cardLink;}
 return link??null;
}
export function pendingGuide(value,currentPath,now=Date.now()){
 try{const p=JSON.parse(value);if(!p||!safeSitePath(p.url)||!Number.isFinite(p.at)||now-p.at>30000||p.at>now)return null;
 return new URL(p.url,'https://portfolio.invalid').pathname===currentPath?p.url:null;
 }catch{return null;}
}
