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
 // One standalone return to the showroom on every project page.
 // The old links stay in the DOM for existing page scripts, but disappear
 // visually from the native glass header and mobile drawer.
 function installProjectReturn(){
   var page=location.pathname.split('/').pop().toLowerCase();
   if(!/^(?:dashbyte|arsenal|green-collection|perm-vl|arthur|showcase|privacy|arsenal-privacy)\.html$/.test(page))return;
   // Never overlay the independent client's production Arsenal website.
   if((page==='arsenal.html'||page==='arsenal-privacy.html')&&/^(?:www\.)?navesy59\.ru$/i.test(location.hostname))return;
   var button=document.getElementById('db-projects-shortcut');
   var oldLinks=document.querySelectorAll(
     '#db-arsenal-bot-mobile-return,#db-arsenal-bot-desktop-return,'+
     '.gc-projects-link,header a[href],nav a[href],#mobile-menu a[href],.mobile-menu a[href],.nav-links a[href]'
   );
   oldLinks.forEach(function(a){
     if(a.id==='db-projects-shortcut')return;
     var words=((a.textContent||'')+' '+(a.getAttribute('aria-label')||'')).trim();
     if(!/\b(?:к\s+(?:выбору\s+)?проектам|все\s+проекты|вернуться\s+к\s+проектам|к\s+выбору\s+проектов)\b/i.test(words))return;
     var u;try{u=new URL(a.getAttribute('href')||'',location.href)}catch(e){return}
     if(u.origin!==location.origin||!/\/(?:index\.html)?$/i.test(u.pathname))return;
     a.style.setProperty('display','none','important');
     a.setAttribute('aria-hidden','true');
     a.setAttribute('data-db-projects-retired','true');
     a.tabIndex=-1;
   });
   if(!button){
     button=document.createElement('a');
     button.id='db-projects-shortcut';
     button.classList.add('db-project-return');
     button.href='./index.html';
     button.setAttribute('aria-label','Вернуться к проектам DashByte');
     button.innerHTML='<span class="db-project-return-icon" aria-hidden="true">←</span><span>Вернуться к проектам</span>';
     document.body.appendChild(button);
   }
   document.documentElement.setAttribute('data-db-project-page',page.replace('.html',''));
   button.classList.toggle('db-project-return-light',page==='green-collection.html');
   button.classList.toggle('db-project-return-bronze',page==='arsenal.html');
   button.classList.toggle('db-project-return-rail',page==='perm-vl.html');
   var header=document.querySelector('#topbar,.site-header,header.nav,nav[aria-label="Навигация"],header.topbar,.topbar,.shell > .top,header');
   if(!header){
     button.classList.remove('db-project-return-inline');
     button.style.setProperty('--db-project-top','112px');
     return;
   }
   var css=getComputedStyle(header);
   var fixed=css.position==='fixed'||css.position==='sticky';
   if(!fixed){
     button.classList.add('db-project-return-inline');
     header.insertAdjacentElement('afterend',button);
     return;
   }
   button.classList.remove('db-project-return-inline');
   if(button.parentElement!==document.body)document.body.appendChild(button);
   function layout(){
     var s=getComputedStyle(header);
     var rect=header.getBoundingClientRect();
     var top=parseFloat(s.top);
     // Ignore animation transforms: the button stays visible even while the
     // main glass menu fades or slides away on first paint.
     var headerBottom=Number.isFinite(top)?top+header.offsetHeight:rect.bottom;
     var tg=window.Telegram&&window.Telegram.WebApp;
     var safe=0;
     if(tg&&tg.platform&&tg.platform!=='unknown'){
       safe=Math.max(Number(tg.safeAreaInset&&tg.safeAreaInset.top)||0,
                     Number(tg.contentSafeAreaInset&&tg.contentSafeAreaInset.top)||0);
     }
     var y=Math.max(headerBottom+10,safe+58,18);
     // If the hamburger expands, keep the independent return BELOW the entire
     // flyout. Do not cover the client's normal menu entries.
     var flyout=document.querySelector('#mobile-menu,.mobile-menu,.mobile-dropdown');
     if(flyout&&(flyout.classList.contains('open')||flyout.classList.contains('is-open'))){
       var flyoutBottom=flyout.getBoundingClientRect().bottom;
       if(flyoutBottom>headerBottom)y=Math.max(y,flyoutBottom+10);
     }
     button.style.setProperty('--db-project-top',Math.round(y)+'px');
     button.style.setProperty('--db-project-left',Math.max(12,Math.round(rect.left+4))+'px');
   }
   layout();
   if(!button.dataset.dbLayoutBound){
     button.dataset.dbLayoutBound='true';
     window.addEventListener('resize',layout,{passive:true});
     window.addEventListener('orientationchange',layout,{passive:true});
     window.addEventListener('load',layout,{once:true});
     if(document.fonts&&document.fonts.ready)document.fonts.ready.then(layout);
     var flyout=document.querySelector('#mobile-menu,.mobile-menu,.mobile-dropdown');
     if(flyout){
       flyout.addEventListener('transitionend',layout);
       if(window.MutationObserver){
         var observer=new MutationObserver(layout);
         observer.observe(flyout,{attributes:true,attributeFilter:['class','aria-expanded','aria-hidden','style']});
       }
     }
     var tg=window.Telegram&&window.Telegram.WebApp;
     if(tg&&tg.onEvent){
       tg.onEvent('safeAreaChanged',layout);
       tg.onEvent('contentSafeAreaChanged',layout);
       tg.onEvent('viewportChanged',layout);
     }
   }
 }
 document.addEventListener('click',function(e){
   var node=e.target;
   var a=node&&node.closest?node.closest('a[href]'):null;
   if(!eligible(a,e))return;
   e.preventDefault();e.stopImmediatePropagation();
   go(a.href,false);
 },true);
 function ready(){mount();installProjectReturn()}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});
 else ready();
 window.addEventListener('pageshow',function(e){ready();arrive(!!e.persisted)});
 window.addEventListener('pagehide',function(){if(timer){clearTimeout(timer);timer=0}});
})();
