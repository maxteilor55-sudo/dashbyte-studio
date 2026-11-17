(()=>{
'use strict';
const $=id=>document.getElementById(id), cfg=window.ART_AVTO_CONFIG||{};
if(/github\.io$/i.test(location.hostname)||new URLSearchParams(location.search).has('showroom'))document.body.classList.add('on-showroom');
const pre=$('preloader'), loadBar=$('load-bar'), loadNum=$('load-num');
if(pre){let p=0;const t=setInterval(()=>{p=Math.min(100,p+18);if(loadBar)loadBar.style.width=p+'%';if(loadNum)loadNum.textContent=String(p).padStart(2,'0')+'%';if(p===100){clearInterval(t);setTimeout(()=>pre.classList.add('hide'),170)}},55);addEventListener('pageshow',()=>setTimeout(()=>pre.classList.add('hide'),900),{once:true})}
const menu=$('menu-button'),nav=$('nav-links'),scrim=$('nav-scrim');
const setMenu=open=>{if(!menu||!nav)return;const was=nav.classList.contains('open');nav.classList.toggle('open',open);document.body.classList.toggle('menu-open',open);menu.setAttribute('aria-expanded',String(open));menu.setAttribute('aria-label',open?'Закрыть меню':'Открыть меню');menu.querySelector('.menu-label').textContent=open?'ЗАКРЫТЬ':'МЕНЮ';if(open&&!was)nav.querySelector('a')?.focus();else if(!open&&was)menu.focus({preventScroll:true})};
if(menu&&nav){menu.addEventListener('click',()=>setMenu(!nav.classList.contains('open')));nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>setMenu(false)));scrim?.addEventListener('click',()=>setMenu(false));addEventListener('keydown',e=>{if(e.key==='Escape'&&nav.classList.contains('open'))setMenu(false)});}
if($('year'))$('year').textContent=String(new Date().getFullYear());
const up=$('totop');if(up){const fn=()=>up.classList.toggle('show',scrollY>650);addEventListener('scroll',fn,{passive:true});fn()}
// ART-AVTO KINETIC MOTION v10 — triggers when elements actually enter the viewport.
// The previous 2.2-second global reveal timeout prevented offscreen animations from being seen.
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
const motionElements=[];
const motionGroups=[
 ['.hero-meta > span, .hero-overline, .hero-title, .hero-copy-bottom > p, .hero-copy-bottom .cta-circle, .hero-frame, .hero-bottom > *, .backstudio','rise'],
 ['.section-intro .section-counter, .section-intro h2, .section-intro > p, .contact-head > *, .faq-layout > div:first-child > *','rise'],
 ['.case-cell, .step-item, .gallery-card, .service-row, .faq-list details, .footer-grid > div','alternate'],
 ['.how-foot, .gallery-legal, .section-closer, .form-panel, .footer-brand, .footer-bottom, .ticker','lift'],
 ['.form-panel .form-label, .form-panel h3, .form-panel .field, .form-panel .agree, .form-panel .form-submit, .form-panel .form-explain, .mobile-cta > a','soft']
];
function registerMotion(){
 const set=new Set();
 motionGroups.forEach(([selectors,type])=>{
   document.querySelectorAll(selectors).forEach(el=>{
     if(set.has(el)||el.closest('.menu-panel,.lightbox,.cookie'))return;
     set.add(el);el.classList.add('motion-item');
     if(type==='alternate'){
       const peers=[...el.parentElement.children].filter(x=>x.matches('.case-cell,.step-item,.gallery-card,.service-row,.faq-list details,.footer-grid > div'));
       const n=peers.indexOf(el);el.dataset.enter=n%2===0?'left':'right';
       el.style.setProperty('--motion-order',String(Math.max(0,n)));
     } else el.dataset.enter=type;
     motionElements.push(el);
   });
 });
 // Animate individual words, without changing the visual markup, line breaks, or accessible text.
 document.querySelectorAll('.hero-title,.section-intro h2,.contact-head h2,.faq-layout h2,.case-cell h3,.step-item h3,.service-row h3,.form-panel h3').forEach(title=>{
   const textNodes=[];
   const walker=document.createTreeWalker(title,NodeFilter.SHOW_TEXT);
   while(walker.nextNode())if(/\S/.test(walker.currentNode.textContent))textNodes.push(walker.currentNode);
   let n=0;
   textNodes.forEach(node=>{
     const frag=document.createDocumentFragment();
     (node.textContent.match(/\s+|\S+/g)||[]).forEach(chunk=>{
       if(/^\s+$/.test(chunk)){frag.appendChild(document.createTextNode(chunk));return;}
       const word=document.createElement('span');word.className='kinetic-word';word.textContent=chunk;
       word.style.setProperty('--word-order',String(n++));frag.appendChild(word);
     });
     node.replaceWith(frag);
   });
   title.classList.add('kinetic-title');
 });
}
// Bidirectional MIRROR REVEAL v11. An element is reset only AFTER fully exiting
// the viewport, then plays again on re-entry (both scroll directions).
if(!reducedMotion&&'IntersectionObserver' in window){
 registerMotion();
 const activeMotion=new Set();
 let lastMotionY=window.scrollY;
 let scrollDirection='down';
 let motionScrollScheduled=false;
 const viewBuffer=36;
 function applyScrollDirection(){
   const current=window.scrollY;
   if(Math.abs(current-lastMotionY)>1.5){
     scrollDirection=current<lastMotionY?'up':'down';
     lastMotionY=current;
   }
 }
 function resetOffscreenElements(){
   motionScrollScheduled=false;
   applyScrollDirection();
   // Never hide text that is partially visible: no visible flashing on reverse scroll.
   for(const el of activeMotion){
     const r=el.getBoundingClientRect();
     if(r.bottom < -viewBuffer || r.top > window.innerHeight+viewBuffer){
       el.classList.remove('motion-in');
       activeMotion.delete(el);
     }
   }
 }
 function onMotionScroll(){
   if(motionScrollScheduled)return;
   motionScrollScheduled=true;
   requestAnimationFrame(resetOffscreenElements);
 }
 function revealAgain(el){
   if(el.classList.contains('motion-in'))return;
   const up=scrollDirection==='up';
   el.dataset.motionDir=scrollDirection;
   const order=Number(el.dataset.motionOrder||0);
   const total=Math.max(1,Number(el.dataset.motionTotal||1));
   el.style.setProperty('--motion-delay',Math.min(Math.max(0,up?(total-1-order):order)*58,300)+'ms');
   el.querySelectorAll('.kinetic-word').forEach(word=>{
     word.style.setProperty('--word-current-order',up?word.dataset.reverseOrder:word.dataset.forwardOrder);
   });
   if(el.classList.contains('kinetic-title'))el.querySelectorAll('.kinetic-word').forEach(word=>{
     word.style.setProperty('--word-current-order',up?word.dataset.reverseOrder:word.dataset.forwardOrder);
   });
   el.classList.add('motion-in');
   activeMotion.add(el);
 }
 // Mirror the word stagger as well as the card direction.
 document.querySelectorAll('.kinetic-title').forEach(title=>{
   const words=[...title.querySelectorAll('.kinetic-word')];
   words.forEach((word,i)=>{
     word.dataset.forwardOrder=String(i);
     word.dataset.reverseOrder=String(words.length-1-i);
   });
 });
 motionElements.forEach(el=>{
   const siblings=[...el.parentElement.children].filter(n=>n.classList.contains('motion-item'));
   const index=siblings.indexOf(el);
   el.dataset.motionOrder=String(Math.max(0,index));
   el.dataset.motionTotal=String(Math.max(1,siblings.length));
 });
 addEventListener('scroll',onMotionScroll,{passive:true});
 addEventListener('resize',onMotionScroll,{passive:true});
 requestAnimationFrame(()=>requestAnimationFrame(()=>{
   document.documentElement.classList.add('motion-enhanced');
   const observer=new IntersectionObserver(entries=>{
     applyScrollDirection();
     for(const entry of entries){
       if(entry.isIntersecting)revealAgain(entry.target);
     }
   },{root:null,rootMargin:'0px 0px -4% 0px',threshold:.06});
   motionElements.forEach(el=>observer.observe(el));
   // If the browser delays IntersectionObserver during initial paint,
   // release ONLY first-viewport elements, never the whole page.
   setTimeout(()=>motionElements.filter(el=>{
     const r=el.getBoundingClientRect();
     return r.top<innerHeight*.78 && r.bottom>0 && !el.classList.contains('motion-in');
   }).forEach(revealAgain),1400);
 }));
}
// Scroll-reading indicator, updates in one requestAnimationFrame per browser frame.
const progress=document.createElement('div');progress.id='read-progress';progress.setAttribute('aria-hidden','true');
document.body.appendChild(progress);
let progressScheduled=false;
function renderProgress(){const distance=Math.max(document.documentElement.scrollHeight-innerHeight,1);progress.style.transform=`scaleX(${Math.min(1,Math.max(0,scrollY/distance))})`;progressScheduled=false;}
function scheduleProgress(){if(!progressScheduled){progressScheduled=true;requestAnimationFrame(renderProgress)}}
addEventListener('scroll',scheduleProgress,{passive:true});addEventListener('resize',scheduleProgress,{passive:true});scheduleProgress();
// Soft focus trail on glass surfaces; only when a precise pointer is present.
if(!reducedMotion&&matchMedia('(hover:hover) and (pointer:fine)').matches){
 document.querySelectorAll('.case-cell,.step-item,.service-row,.gallery-card,.form-panel,.menu-toggle').forEach(el=>{
   let queued=false,px=50,py=50;
   el.addEventListener('pointermove',ev=>{
     const r=el.getBoundingClientRect();px=((ev.clientX-r.left)/Math.max(r.width,1)*100).toFixed(1);py=((ev.clientY-r.top)/Math.max(r.height,1)*100).toFixed(1);
     if(queued)return;queued=true;requestAnimationFrame(()=>{el.style.setProperty('--glint-x',px+'%');el.style.setProperty('--glint-y',py+'%');queued=false});
   },{passive:true});
 });
}
// Gallery: one photo per car, keyboard and accessible close.
const cards=[...document.querySelectorAll('.gallery-card')],light=$('lightbox');
if(cards.length&&light){let index=0,origin=null;const img=$('lightbox-img'),caption=$('lightbox-caption');function open(i){index=(i+cards.length)%cards.length;origin=origin||document.activeElement;const thumb=cards[index].querySelector('img');img.src=thumb.currentSrc||thumb.src;img.alt=thumb.alt;caption.textContent=cards[index].querySelector('span')?.innerText?.replace(/\n/g,' · ')||thumb.alt;light.classList.add('open');light.setAttribute('aria-hidden','false');document.body.style.overflow='hidden';$('lightbox-close')?.focus()}function close(){light.classList.remove('open');light.setAttribute('aria-hidden','true');document.body.style.overflow='';img.removeAttribute('src');(origin||cards[index])?.focus();origin=null}cards.forEach((c,i)=>c.addEventListener('click',()=>open(i)));$('lightbox-close')?.addEventListener('click',close);$('lightbox-prev')?.addEventListener('click',()=>open(index-1));$('lightbox-next')?.addEventListener('click',()=>open(index+1));light.addEventListener('click',e=>{if(e.target===light)close()});addEventListener('keydown',e=>{if(!light.classList.contains('open'))return;if(e.key==='Escape')close();if(e.key==='ArrowLeft')open(index-1);if(e.key==='ArrowRight')open(index+1)})}
// Safe lead handling: no unconfigured fictitious auto-send.
const form=$('estimate-form');if(form){const submit=$('submit-btn'),explain=$('form-explain'),status=$('form-status');if(cfg.requestEndpoint){submit.innerHTML='ОТПРАВИТЬ ЗАЯВКУ <span>↗</span>';if(explain)explain.textContent='Обращение будет отправлено по защищённому соединению.'}form.addEventListener('submit',async e=>{e.preventDefault();status.textContent='';const tel=$('phone').value.trim();if(!form.checkValidity()||tel.replace(/\D/g,'').length<7){status.textContent='Проверьте обязательные поля и согласие на обработку данных.';form.reportValidity();return}const data=Object.fromEntries(new FormData(form));delete data.agree;data.source='ART-AVTO / website';if(cfg.requestEndpoint){submit.disabled=true;status.textContent='Отправляем заявку…';try{const endpoint=new URL(cfg.requestEndpoint);if(endpoint.protocol!=='https:')throw Error('HTTPS required');const resp=await fetch(endpoint.toString(),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});if(!resp.ok)throw Error('Failed');status.textContent='Заявка отправлена. Мы свяжемся с вами.';form.reset()}catch{status.textContent='Не удалось отправить автоматически. Позвоните или напишите по почте.'}finally{submit.disabled=false}return}const lines=['Заявка на выкуп автомобиля — ART-AVTO','',`Имя: ${data.name||'—'}`,`Телефон: ${tel}`,`Марка и модель: ${data.car||'—'}`,`Год: ${data.year||'—'}`,`Состояние: ${data.condition||'—'}`,`Описание: ${data.description||'—'}`];const url='mailto:aa89519532200@gmail.com?subject='+encodeURIComponent('Заявка на выкуп автомобиля — ART-AVTO')+'&body='+encodeURIComponent(lines.join('\n'));status.textContent='Открываем почтовую программу. Не забудьте нажать «Отправить» в письме.';location.href=url})}
function initMetrika(id){if(!/^\d+$/.test(String(id)))return;window.ym=window.ym||function(){(window.ym.a=window.ym.a||[]).push(arguments)};window.ym.l=Date.now();const script=document.createElement('script');script.async=true;script.src='https://mc.yandex.ru/metrika/tag.js';document.head.appendChild(script);window.ym(Number(id),'init',{clickmap:true,trackLinks:true,accurateTrackBounce:true,webvisor:false})}
const metrika=cfg.yandexMetrikaId,cookie=$('cookie');if(cookie&&metrika){try{if(localStorage.getItem('artavto_analytics_consent')==='yes')initMetrika(metrika);else cookie.classList.add('show')}catch{cookie.classList.add('show')}const yes=$('cookie-yes');yes?.addEventListener('click',()=>{try{localStorage.setItem('artavto_analytics_consent','yes')}catch{}cookie.classList.remove('show');initMetrika(metrika)})}
})();
