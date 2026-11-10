/* Arsenal cookie preferences and optional Yandex.Metrika analytics.
 * Counter ID 109304299 belongs to navesy59.ru (Навесы2026).
 * Existing v1 consent was only for essential browser settings; do not reuse
 * it as consent for a new analytics provider.
 * No visitor name, phone, or form message is passed to Yandex.
 */
(()=>{'use strict';
const storageKey='arsenal-cookie-choice-v3',expiry=180*864e5;
const counterId=109304299,goalId='arsenal_lead_delivered';
const phoneGoalId='arsenal_phone_click';
function readChoice(){
  try{
    const value=JSON.parse(localStorage.getItem(storageKey)||'null');
    if(value&&['accepted','necessary'].includes(value.choice)&&
       Number.isFinite(value.time)&&Date.now()-value.time<expiry)return value.choice;
  }catch(_){}
  return null;
}
function enableAnalytics(){
  if(window.__arsenalMetrikaStarted||readChoice()!=='accepted')return;
  window.__arsenalMetrikaStarted=true;
  if(typeof window.ym!=='function'){
    window.ym=function(){(window.ym.a=window.ym.a||[]).push(arguments);};
    window.ym.l=Date.now();
  }
  const tag=document.createElement('script');
  tag.async=true;
  tag.src='https://mc.yandex.ru/metrika/tag.js';
  tag.referrerPolicy='strict-origin-when-cross-origin';
  document.head.appendChild(tag);
  window.ym(counterId,'init',{
    clickmap:true,trackLinks:true,accurateTrackBounce:true,
    webvisor:true,sendTitle:true
  });
}
window.arsenalReportLeadSuccess=function(){
  if(readChoice()!=='accepted'||!window.__arsenalMetrikaStarted||
     typeof window.ym!=='function')return false;
  try{window.ym(counterId,'reachGoal',goalId);return true;}
  catch(_){return false;}
};
// Only register contact intent after the visitor permitted optional analytics.
 // A telephone-link click is not a confirmed answered call; do not use it as
 // the same conversion goal as a delivered Telegram form submission.
 document.addEventListener('click',event=>{
   const link=event.target?.closest?.('a[href^="tel:"]');
   if(!link||readChoice()!=='accepted'||!window.__arsenalMetrikaStarted
      ||typeof window.ym!=='function')return;
   try{window.ym(counterId,'reachGoal',phoneGoalId);}catch(_){}
 },{passive:true});
const ready=()=>{
  // Before loading Webvisor, mask all form inputs including contact details.
  document.querySelectorAll('#contact-form input,#contact-form textarea,#contact-form select').forEach(field=>{
    field.classList.add('ym-disable-keys');
  });
  // Defensive: remove obsolete chooser shortcuts.
  for(const id of ['db-arsenal-chooser-link','db-arsenal-desktop-return'])
    document.getElementById(id)?.remove();
  // The "accepted" choice may be saved on a previous page.
  if(readChoice()==='accepted')enableAnalytics();
  if(document.getElementById('ars-cookie-banner'))return;
  const notice=document.createElement('aside');
  notice.id='ars-cookie-banner';
  notice.setAttribute('aria-label','Согласие на cookies и аналитику');
  notice.setAttribute('role','region');
  const heading=document.createElement('div');heading.className='ars-cookie-head';
  const emblem=document.createElement('span');emblem.textContent='А';emblem.setAttribute('aria-hidden','true');
  heading.append(emblem,document.createTextNode('Приватность и cookies'));
  const p=document.createElement('p');
  p.textContent='С вашего согласия Яндекс.Метрика собирает статистику и записывает взаимодействия со страницами (Вебвизор, карты скроллинга и аналитика форм). Содержимое полей заявок скрыто от записи. Без согласия необязательная аналитика выключена. Подробнее — в политике конфиденциальности.';
  const buttons=document.createElement('div');buttons.className='ars-cookie-row';
  const yes=document.createElement('button');
  yes.type='button';yes.className='ars-cookie-yes';yes.textContent='Разрешить аналитику';
  const only=document.createElement('button');
  only.type='button';only.className='ars-cookie-only';only.textContent='Только необходимые';
  const link=document.createElement('a');link.className='ars-cookie-more';
  link.href='./arsenal-privacy.html#cookies';link.textContent='Прочитать условия ↗';
  function choose(choice){
    try{localStorage.setItem(storageKey,JSON.stringify({choice,time:Date.now()}));}
    catch(_){}
    notice.hidden=true;
    if(choice==='accepted')enableAnalytics();
  }
  yes.addEventListener('click',()=>choose('accepted'));
  only.addEventListener('click',()=>choose('necessary'));
  buttons.append(yes,only,link);
  notice.append(heading,p,buttons);
  document.body.appendChild(notice);
  notice.hidden=!!readChoice();

  // From policy page / footer allow user to request the choice dialog again.
  window.arsenalOpenCookieOptions=()=>{
    notice.hidden=false;
    notice.querySelector('button')?.focus();
  };

  const studio=document.getElementById('db-arsenal-studio-link');
  studio?.addEventListener('click',event=>{
    const webApp=window.Telegram?.WebApp;
    if(typeof webApp?.openTelegramLink==='function'){
      event.preventDefault();
      webApp.openTelegramLink('https://t.me/DashByteStudioBot');
    }
  });
  document.querySelectorAll('#gallery-grid img,.service-card img').forEach(img=>{
    if(!img.hasAttribute('loading'))img.loading='lazy';
    img.decoding='async';
  });
};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});
else ready();
})();
