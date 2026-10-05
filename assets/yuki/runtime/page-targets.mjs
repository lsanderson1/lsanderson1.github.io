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
  if(u.hash){const el=doc.getElementById(u.hash.slice(1));if(el)return el.hasAttribute?.('data-yuki-anchor')?el.parentElement:el;return null;}
  return doc.querySelector('main h1, .fp-resume-head h1, h1');
 }
 // A section/picture source on another page must navigate to that exact page,
 // not stop at a card that merely links to it.
 if(u.hash)return null;
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

export function targetRect(el){
 const outer=el.getBoundingClientRect(),range=el.ownerDocument.createRange();range.selectNodeContents(el);
 const rects=[...range.getClientRects()].filter(r=>r.width>0&&r.height>0);
 if(!rects.length)return outer;
 // Heading blocks often fill an entire row. Point at the actual title ink,
 // not the unrelated empty space at the opposite end of that block.
 const box={left:Math.max(outer.left,Math.min(...rects.map(r=>r.left))),right:Math.min(outer.right,Math.max(...rects.map(r=>r.right))),top:Math.max(outer.top,Math.min(...rects.map(r=>r.top))),bottom:Math.min(outer.bottom,Math.max(...rects.map(r=>r.bottom)))};
 return {...box,width:box.right-box.left,height:box.bottom-box.top};
}

// Short, relevant menu; the full published index is searchable, not dumped.
export function curateDestinations(items,query='',currentPath='/'){
 const q=query.trim().toLocaleLowerCase(),tokens=q.split(/\s+/).filter(Boolean);
 const category=path=>/\/unreal-journey\//.test(path)?'unreal':/\/projects\//.test(path)?'project':/\/essays\//.test(path)?'essay':'resume';
 const current=category(currentPath),onHome=/^(\/ja)?\/$/.test(currentPath);
 const seen=new Set();
 return items.map((item,i)=>{const title=item.title.replace(/\s+/g,' ').trim(),text=(title+' '+(item.summary??'')+' '+(item.keywords??'')).toLocaleLowerCase();
  const relevant=item.local||(!onHome&&category(item.url??'')===current)||item.featured;
  const score=(item.local?50:0)+(item.featured?20:0)+(title.toLocaleLowerCase().includes(q)&&q?100:0);
  return {...item,title,score,i,relevant,match:tokens.every(t=>text.includes(t))};
 }).filter(item=>item.title&&item.match&&(q||item.relevant)).sort((a,b)=>b.score-a.score||a.i-b.i).filter(item=>{
  const id=item.title.toLocaleLowerCase();if(seen.has(id))return false;seen.add(id);return true;
 }).slice(0,q?12:8);
}
