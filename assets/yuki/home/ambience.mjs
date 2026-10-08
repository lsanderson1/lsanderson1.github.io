// Decorative motion never changes the image's landing-point geometry.
export function attachAmbience(scene){
 const doc=scene.ownerDocument;
 const visibility=()=>{doc.body.dataset.gardenHidden=String(doc.hidden);};visibility();doc.addEventListener('visibilitychange',visibility);
 const observer=typeof IntersectionObserver==='function'?new IntersectionObserver(entries=>{scene.dataset.offscreen=String(!entries[0].isIntersecting);},{rootMargin:'100px'}):null;
 observer?.observe(scene);
 return ()=>{observer?.disconnect();doc.removeEventListener('visibilitychange',visibility);};
}
