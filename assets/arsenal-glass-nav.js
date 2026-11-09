/* ARSENAL: one menu controller for home, all services and privacy. */
(function(){
 'use strict';
 var header=document.querySelector('header.site-header');
 var button=document.getElementById('menu-toggle');
 var flyout=document.getElementById('mobile-menu');
 var up=document.getElementById('ars-back-to-top');
 if(!header||!button||!flyout)return;
 function position(){
  var box=header.getBoundingClientRect();
  flyout.style.setProperty('--menu-left',Math.max(8,box.left)+'px');
  flyout.style.setProperty('--menu-width',Math.min(window.innerWidth-16,box.width)+'px');
  flyout.style.setProperty('--menu-top',(box.bottom+8)+'px');
 }
 function setOpen(open){
  flyout.classList.toggle('open',!!open);
  button.setAttribute('aria-expanded',String(!!open));
  button.setAttribute('aria-label',open?'Закрыть меню':'Открыть меню');
  button.textContent=open?'×':'☰';
  if(open)position();
 }
 button.addEventListener('click',function(){setOpen(!flyout.classList.contains('open'));});
 flyout.querySelectorAll('a').forEach(function(a){a.addEventListener('click',function(){setOpen(false);});});
 document.addEventListener('keydown',function(e){if(e.key==='Escape'&&flyout.classList.contains('open')){setOpen(false);button.focus();}});
 function resized(){if(window.innerWidth>1020)setOpen(false);else if(flyout.classList.contains('open'))position();}
 window.addEventListener('resize',resized,{passive:true});
 window.addEventListener('orientationchange',resized,{passive:true});
 window.addEventListener('scroll',function(){
  if(flyout.classList.contains('open'))position();
  header.classList.toggle('is-scrolled',window.scrollY>30);
  if(up){var visible=window.scrollY>260;up.classList.toggle('is-visible',visible);up.tabIndex=visible?0:-1;}
 },{passive:true});
 setOpen(false);if(up)up.tabIndex=-1;
})();
