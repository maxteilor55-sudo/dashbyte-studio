/* DashByte Liquid Route v2 • predictable navigation in Telegram WebView. */
(function(){
 'use strict';
 if(window.DashByteTransitions)return;
 var root=document.documentElement;
 var veil=null,leaving=false,timer=0;
 var reduced=!!(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches);
 var wait=reduced?0:195;
 var FLAG='db_route_opened_at_v2';
 function mount(){
   if(veil&&veil.isConnected)return;
   if(!document.body)return;
   veil=document.getElementById('db-route-veil');
   if(!veil){
     veil=document.createElement('div');
     veil.id='db-route-veil';veil.setAttribute('aria-hidden','true');
     document.body.appendChild(veil);
   }
 }
 function reset(){
   leaving=false;
   if(timer){clearTimeout(timer);timer=0}
   root.classList.remove('db-route-leaving','db-route-entering');
 }
 function arrive(persisted){
   reset();mount();
   if(reduced)return;
   var timestamp=0;
   try{
     timestamp=Number(sessionStorage.getItem(FLAG)||0);
     sessionStorage.removeItem(FLAG);
   }catch(e){}
   // No entry blur on first app launch or deep links: avoid flicker on cold start.
   if(!persisted && !(timestamp>0&&Date.now()-timestamp<12000))return;
   root.classList.add('db-route-entering');
   window.setTimeout(function(){root.classList.remove('db-route-entering')},300);
 }
 function local(dest){
   return dest.origin===location.origin && /(?:\/|\.html)$/i.test(dest.pathname);
 }
 function go(raw,replace){
   var dest;
   try{dest=new URL(String(raw),location.href)}catch(e){return false}
   if(!local(dest))return false;
   if(!dest.hash&&/tgWebApp(?:Version|Data|Platform|StartParam)/i.test(location.hash))dest.hash=location.hash;
   if(dest.href===location.href)return false;
   if(!replace && /\/dashbyte\.html$/i.test(dest.pathname) && !dest.searchParams.has('fresh'))dest.searchParams.set('fresh',String(Date.now()));
   if(leaving)return true;
   leaving=true;mount();root.classList.remove('db-route-entering');
   try{sessionStorage.setItem(FLAG,String(Date.now()))}catch(e){}
   root.classList.add('db-route-leaving');
   timer=window.setTimeout(function(){
     if(replace)location.replace(dest.href);else location.assign(dest.href);
   },wait);
   return true;
 }
 window.DashByteTransitions={go:go,reset:reset};
 function eligible(anchor,event){
   if(!anchor||event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return false;
   if(anchor.hasAttribute('download')||anchor.hasAttribute('data-no-route-transition'))return false;
   if(anchor.target&&anchor.target!=='_self')return false;
   if(anchor.matches('[data-open-pin]'))return false;
   var raw=anchor.getAttribute('href');
   if(!raw||raw[0]==='#'||/^(?:mailto:|tel:|javascript:|data:|blob:)/i.test(raw))return false;
   var u;try{u=new URL(raw,location.href)}catch(e){return false}
   if(!local(u))return false;
   if(u.pathname===location.pathname && u.search===location.search)return false;
   return true;
 }
 // Arsenal is served from GitHub Pages inside DashByte Bot, but its standalone
 // production site lives on REG.RU. Do NOT add the project shortcut to navesy59.ru.
 function installArsenalReturn(){
   if(!/\/arsenal\.html$/i.test(location.pathname))return;
   if(/^(?:www\.)?navesy59\.ru$/i.test(location.hostname))return;
   var menu=document.getElementById('mobile-menu')||document.querySelector('.site-header .mobile-menu, .mobile-menu');
   if(menu&&!document.getElementById('db-arsenal-bot-mobile-return')){
     var back=document.createElement('a');
     back.id='db-arsenal-bot-mobile-return';
     back.href='./';back.textContent='← К выбору проектов';
     back.setAttribute('aria-label','Вернуться к списку проектов DashByte');
     menu.prepend(back);
   }
   var desktop=document.querySelector('.site-header .nav-links');
   if(desktop&&!document.getElementById('db-arsenal-bot-desktop-return')){
     var a=document.createElement('a');a.id='db-arsenal-bot-desktop-return';
     a.href='./';a.textContent='← К проектам';
     desktop.prepend(a);
   }
 }
 document.addEventListener('click',function(e){
   var node=e.target;
   var a=node&&node.closest?node.closest('a[href]'):null;
   if(!eligible(a,e))return;
   e.preventDefault();e.stopImmediatePropagation();
   go(a.href,false);
 },true);
 function ready(){mount();installArsenalReturn()}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});
 else ready();
 window.addEventListener('pageshow',function(e){ready();arrive(!!e.persisted)});
 window.addEventListener('pagehide',function(){if(timer){clearTimeout(timer);timer=0}});
})();
