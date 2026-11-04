/* DashByte Liquid Route • local document transitions (no router dependency). */
(function(){
 'use strict';
 if(window.DashByteTransitions)return;
 var root=document.documentElement;
 var veil=null,leaving=false,nextTimeout=0;
 var reduced=!!(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches);
 var delay=reduced?0:320;
 function mount(){
   if(veil&&veil.isConnected)return;
   if(!document.body)return;
   veil=document.getElementById('db-route-veil');
   if(!veil){
     veil=document.createElement('div');
     veil.id='db-route-veil';
     veil.setAttribute('aria-hidden','true');
     document.body.appendChild(veil);
   }
 }
 function reset(){
   leaving=false;
   if(nextTimeout){clearTimeout(nextTimeout);nextTimeout=0}
   root.classList.remove('db-route-leaving','db-route-entering');
 }
 function arrive(){
   reset();mount();
   if(reduced)return;
   // New page and BFCache history restores both get a soft, reverse blur.
   root.classList.add('db-route-entering');
   window.setTimeout(function(){root.classList.remove('db-route-entering')},480);
 }
 function local(dest){
   if(dest.origin!==location.origin)return false;
   var path=dest.pathname;
   return /(?:\/|\.html)$/i.test(path);
 }
 function go(raw,replace){
   var dest;
   try{dest=new URL(String(raw),location.href)}catch(e){return false}
   if(!local(dest))return false;
   // Preserve native Telegram launch data when switching documents.
   if(!dest.hash&&/tgWebApp(?:Version|Data|Platform|StartParam)/i.test(location.hash)){
     dest.hash=location.hash;
   }
   if(dest.pathname===location.pathname && dest.search===location.search && dest.hash===location.hash)return false;
   if(!replace && /\/dashbyte\.html$/i.test(dest.pathname) && !dest.searchParams.has('fresh')){
     dest.searchParams.set('fresh',String(Date.now()));
   }
   if(leaving)return true;
   leaving=true;mount();root.classList.remove('db-route-entering');
   // Start the exit on a real frame, then navigate. Reduced-motion users skip delay.
   window.requestAnimationFrame(function(){
     root.classList.add('db-route-leaving');
     nextTimeout=window.setTimeout(function(){
       if(replace)location.replace(dest.href);
       else location.assign(dest.href);
     },delay);
   });
   return true;
 }
 window.DashByteTransitions={go:go,reset:reset};
 function eligible(anchor,event){
   if(!anchor||event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return false;
   if(anchor.hasAttribute('download')||anchor.hasAttribute('data-no-route-transition'))return false;
   if(anchor.target&&anchor.target!=='_self')return false;
   // PIN click must open its existing modal, not navigate.
   if(anchor.matches('[data-open-pin]'))return false;
   var raw=anchor.getAttribute('href');
   if(!raw||raw[0]==='#'||/^(?:mailto:|tel:|javascript:|data:|blob:)/i.test(raw))return false;
   var url;
   try{url=new URL(raw,location.href)}catch(e){return false}
   if(!local(url))return false;
   if(url.pathname===location.pathname && (!url.hash||url.hash[0]==='#'&&url.search===location.search))return false;
   return true;
 }
 // Capture before page-specific navigation handlers; continue to honor ordinary buttons,
 // anchors and the Green Collection PIN modal. Also handles dynamically created back links.
 document.addEventListener('click',function(e){
   var target=e.target;
   var a=target&&target.closest?target.closest('a[href]'):null;
   if(!eligible(a,e))return;
   e.preventDefault();
   e.stopImmediatePropagation();
   go(a.href,false);
 },true);
 window.addEventListener('pageshow',function(){arrive()});
 document.addEventListener('DOMContentLoaded',arrive,{once:true});
 window.addEventListener('pagehide',function(){if(nextTimeout){clearTimeout(nextTimeout);nextTimeout=0}});
})();
