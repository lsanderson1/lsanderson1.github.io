const ease=(a,b,v)=>{const t=Math.max(0,Math.min(1,(v-a)/(b-a)));return t*t*(3-2*t);};
// Native 700px artwork coordinates. Head/glasses are one rigid translation;
// everything at and below y=574 is fixed. No recoloring or anatomical repaint.
export function deformIdlePoint(x,y,p){
 const {amount=0,breath=0,sway=0,tail=0,arm=0}=p;
 if(amount===0||y>=574)return [x,y];
 const upper=1-ease(500,575,y);
 let dx=2.6*sway*upper,dy=-4*breath;
 if(y>390){
  const shoulder=ease(390,430,y)*(1-ease(430,566,y));
  dy=(-4*upper-5*shoulder)*breath;
  const belly=ease(390,428,y)*(1-ease(510,559,y));
  dx+=6*breath*((x-350)/45)*Math.exp(-(((x-350)/68)**2))*belly;
  // Rounded paws and folded wings follow the chest, without cut-out seams.
  const arms=Math.exp(-(((y-479)/53)**2))*(Math.exp(-(((x-268)/29)**2))+Math.exp(-(((x-438)/29)**2)));
  const follow=.65*breath+.35*arm;
  dx+=Math.sign(x-350)*3.8*follow*arms;dy-=2*arm*arms;
  const wings=Math.exp(-(((y-443)/49)**2))*(Math.exp(-(((x-230)/20)**2))+Math.exp(-(((x-479)/20)**2)));
  dx+=Math.sign(x-350)*2.2*arm*wings;dy-=1.3*arm*wings;
 }
 // Only the outer tail travels appreciably; the pelvis/root stay settled.
 const tailWeight=ease(456,505,x)*ease(477,501,y);
 dy+=8*tail*tailWeight;dx+=1.6*tail*tailWeight;
 const planted=1-ease(520,574,y);
 return [x+amount*dx*planted,y+amount*dy*planted];
}
