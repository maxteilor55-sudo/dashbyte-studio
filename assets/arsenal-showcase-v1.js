
/* Arsenal demo of case carousel and illustration photos, using existing gallery images only. */
(()=>{
'use strict';
const gallery=Array.from(document.querySelectorAll('#gallery-grid .project'));
const section=document.getElementById('ars-showcase');
const stage=document.getElementById('ars-showcase-frame');
if(!section||!stage||!gallery.length)return;
const cases=[
 {source:12,title:'Навес',place:'Пермь · Свердловский район',year:'2026',kind:'МЕТАЛЛОКОНСТРУКЦИИ'},
 {source:0,title:'Гараж',place:'Пермь · Индустриальный район',year:'2025',kind:'ГАРАЖИ'},
 {source:9,title:'Арочный навес',place:'Пермский край · Краснокамск',year:'2026',kind:'НАВЕСЫ'},
 {source:23,title:'Входная группа',place:'Пермь · Мотовилихинский район',year:'2024',kind:'ВХОДНЫЕ ГРУППЫ'},
 {source:13,title:'Навес',place:'Пермский край · Пермский округ',year:'2025',kind:'НАВЕСЫ'},
 {source:8,title:'Металлокаркас',place:'Пермь · Орджоникидзевский район',year:'2026',kind:'КАРКАСЫ'}
].map(item=>({...item,img:gallery[item.source]?.querySelector('.project-visual img')})).filter(item=>item.img);
if(!cases.length)return;
const layers=[...stage.querySelectorAll('.ars-showcase__img')];
const title=section.querySelector('#ars-showcase-title');
const place=section.querySelector('#ars-showcase-place');
const year=section.querySelector('#ars-showcase-year');
const kind=section.querySelector('#ars-showcase-kind');
const count=section.querySelector('#ars-showcase-count');
const announce=section.querySelector('#ars-showcase-announce');
const dots=section.querySelector('#ars-showcase-dots');
const prev=section.querySelector('#ars-showcase-prev');
const next=section.querySelector('#ars-showcase-next');
const label='Пример оформления. География и даты условные.';
let current=-1,front=1,visible=false,pausedUntil=0;
const prefersReduced=window.matchMedia('(prefers-reduced-motion: reduce)');
const makeDot=(i)=>{
 const b=document.createElement('button');b.type='button';b.className='ars-showcase__dot';
 b.setAttribute('aria-label','Показать объект '+(i+1)+' из '+cases.length);
 b.addEventListener('click',()=>change(i,true));dots.appendChild(b);return b;
};
const dotButtons=cases.map((_,i)=>makeDot(i));
function change(n,manual){
 const newIndex=(n+cases.length)%cases.length;
 if(newIndex===current)return;
 const item=cases[newIndex];
 const newFront=1-front;
 const layer=layers[newFront];
 layer.src=item.img.getAttribute('src')||item.img.src;
 layer.alt='Пример карточки: '+item.title+'. '+label;
 layer.classList.add('is-visible');
 layers[front].classList.remove('is-visible');
 front=newFront;current=newIndex;
 title.textContent=item.title;place.textContent=item.place;
 year.textContent=item.year;kind.textContent=item.kind;
 count.textContent=String(current+1).padStart(2,'0')+' / '+String(cases.length).padStart(2,'0');
 dotButtons.forEach((b,i)=>b.setAttribute('aria-current',i===current?'true':'false'));
 if(manual){pausedUntil=Date.now()+11000;announce.textContent=item.title+'. '+item.place+'. '+item.year+'. Демонстрационные данные.';}
}
change(0,false);
prev.addEventListener('click',()=>change(current-1,true));
next.addEventListener('click',()=>change(current+1,true));
let startX=0,startY=0;
stage.addEventListener('touchstart',e=>{if(e.touches.length!==1)return;startX=e.touches[0].clientX;startY=e.touches[0].clientY},{passive:true});
stage.addEventListener('touchend',e=>{if(!e.changedTouches.length)return;const dx=e.changedTouches[0].clientX-startX,dy=e.changedTouches[0].clientY-startY;if(Math.abs(dx)>46&&Math.abs(dx)>Math.abs(dy)*1.35)change(current+(dx<0?1:-1),true)},{passive:true});
section.addEventListener('pointerenter',()=>{pausedUntil=Date.now()+7000},{passive:true});
section.addEventListener('focusin',()=>{pausedUntil=Date.now()+9000});
if('IntersectionObserver' in window){new IntersectionObserver(entries=>{visible=entries.some(x=>x.isIntersecting)},{threshold:.16}).observe(section);}else visible=true;
window.setInterval(()=>{if(!visible||document.hidden||prefersReduced.matches||Date.now()<pausedUntil)return;change(current+1,false)},6800);
/* Existing gallery photos are temporary visual samples for categories without supplied project photos. */
const representative={terrace:17,rail:23,stairs:22,welding:8};
const clientPhotos={
  fence:{src:'assets/arsenal-fences-client.avif',alt:'Реальные металлические ограждения и заборы у жилого дома',position:'center 49%'},
  fire:{src:'assets/arsenal-fire-stairs-client.avif',alt:'Наружная металлическая пожарная лестница с площадкой и ограждением',position:'center 50%'},
  garage:{src:'assets/arsenal-garage-client.avif',alt:'Гараж с облицовкой под дерево и тёмными секционными воротами',position:'center 48%'}
};
document.querySelectorAll('[data-ars-sample]').forEach(card=>{
 const kind=card.dataset.arsSample;
 const approved=clientPhotos[kind];
 const origin=gallery[representative[kind]]?.querySelector('.project-visual img');
 if(!approved&&!origin)return;
 const oldCardImage=card.querySelector('img');if(oldCardImage)oldCardImage.remove();
 const img=document.createElement('img');
 img.src=approved?.src||(origin.getAttribute('src')||origin.src);
 img.alt=approved?.alt||'Пример иллюстрации к услуге — фотография из действующей галереи';
 img.loading='lazy';img.decoding='async';
 if(approved){img.style.objectPosition=approved.position;img.onerror=()=>{img.onerror=null;if(origin)img.src=origin.getAttribute('src')||origin.src;};}
 card.insertBefore(img,card.firstChild);
 card.classList.add('ars-photo-card');card.classList.remove('ars-text-card');
 const oldGlyph=card.querySelector('.ars-card-glyph');if(oldGlyph)oldGlyph.remove();
 if(!approved){
  const sticker=document.createElement('span');sticker.className='ars-demo-label';sticker.textContent='Фото для примера';
  card.appendChild(sticker);
 }
});
})();
