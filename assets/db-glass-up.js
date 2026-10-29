/* DashByte Universal Liquid Glass · v1. One control; reveal on upward scroll. */
(function(){
 'use strict';
 if(window.__dashbyteUniversalUpInstalled)return;
 window.__dashbyteUniversalUpInstalled=true;
 function init(){
  if(document.getElementById('db-glass-up'))return;
  const root=document.documentElement;
  root.classList.toggle('db-glass-up-light',/green-collection\.html$/i.test(location.pathname));
  function removeOldButtons(){
   // Old per-page footer controls are no longer part of navigation.
   ['db-arsenal-footer-up','gc-footer-up','db-chooser-footer-up','gc-back-to-top'].forEach(function(id){
    const node=document.getElementById(id);if(node)node.remove();
   });
   document.querySelectorAll('footer a,footer button').forEach(function(el){
    const txt=(el.textContent||'').replace(/\s+/g,' ').trim();
    const name=(el.getAttribute('aria-label')||'').trim();
    if((/^(?:↑\s*)?НАВЕРХ\b/i.test(txt)||/^BACK TO TOP\b/i.test(txt)||
        /^(?:вернуться )?наверх\b/i.test(name)||/^(?:вернуться )?к началу страницы\b/i.test(name)) &&
       !el.closest('#db-glass-up'))el.remove();
   });
  }
  removeOldButtons();
  window.addEventListener('load',removeOldButtons,{once:true});
  // Observe only footer: legacy sites may render their old button after load.
  document.querySelectorAll('footer').forEach(function(footer){
   const ob=new MutationObserver(function(){removeOldButtons()});
   ob.observe(footer,{childList:true,subtree:true});
  });
  const button=document.createElement('button');
  button.id='db-glass-up';button.type='button';
  button.setAttribute('aria-label','Наверх — к началу страницы');
  button.setAttribute('title','Наверх');
  button.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20V5m-7 7 7-7 7 7"/></svg>';
  document.body.appendChild(button);
  const getY=function(){return Math.max(0,window.scrollY||root.scrollTop||0)};
  let previous=getY(),upDistance=0,downDistance=0,pending=false;
  function conceal(){button.classList.remove('is-visible')}
  function check(){
   pending=false;
   const y=getY(),dy=y-previous;
   previous=y;
   if(y<150){upDistance=0;downDistance=0;conceal();return}
   if(dy< -1){
    upDistance+=-dy;downDistance=0;
    // A deliberate upward gesture after scrolling through some content.
    if(upDistance>=13)button.classList.add('is-visible');
   }else if(dy>1){
    downDistance+=dy;upDistance=0;
    if(downDistance>=35)conceal();
   }
  }
  function onScroll(){
   if(pending)return;pending=true;requestAnimationFrame(check);
  }
  button.addEventListener('click',function(){
   conceal();upDistance=0;downDistance=0;
   const reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
   window.scrollTo({top:0,behavior:reduce?'auto':'smooth'});
  });
  window.addEventListener('scroll',onScroll,{passive:true});
  window.addEventListener('pageshow',function(){previous=getY();upDistance=0;downDistance=0;conceal()});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
})();
