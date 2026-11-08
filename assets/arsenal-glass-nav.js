/* Shared glass navigation and back-to-top on all Arsenal subpages. */
(function(){
 'use strict';
 var header=document.querySelector('.ars-glass-header');
 var toggle=document.getElementById('ars-glass-menu-toggle');
 var menu=document.getElementById('ars-glass-mobile-menu');
 var up=document.getElementById('ars-back-to-top');
 if(!header||!toggle||!menu)return;
 function setOpen(isOpen){
  menu.hidden=!isOpen;
  toggle.setAttribute('aria-expanded',String(isOpen));
  toggle.setAttribute('aria-label',isOpen?'Закрыть меню':'Открыть меню');
 }
 setOpen(false);
 toggle.addEventListener('click',function(){setOpen(menu.hidden)});
 menu.querySelectorAll('a').forEach(function(link){
   link.addEventListener('click',function(){setOpen(false)});
 });
 document.addEventListener('click',function(event){
   if(!menu.hidden&&!menu.contains(event.target)&&!toggle.contains(event.target))setOpen(false);
 });
 document.addEventListener('keydown',function(event){
   if(event.key==='Escape'&&!menu.hidden){setOpen(false);toggle.focus()}
 });
 var small=window.matchMedia('(max-width:950px)');
 function checkViewport(){if(!small.matches)setOpen(false)}
 if(small.addEventListener)small.addEventListener('change',checkViewport);
 else window.addEventListener('resize',checkViewport,{passive:true});
 var ticking=false;
 function refresh(){
  header.classList.toggle('is-scrolled',window.scrollY>32);
  if(up){
   var visible=window.scrollY>260;
   up.classList.toggle('is-visible',visible);
   up.tabIndex=visible?0:-1;
  }
  ticking=false;
 }
 window.addEventListener('scroll',function(){
  if(!ticking){ticking=true;requestAnimationFrame(refresh)}
 },{passive:true});
 refresh();
})();