/* Independent Arsenal site. No analytics, ad or tracking installed by this script.
   Stores only the visitor's local cookie-notice choice. */
(()=>{'use strict';
const storageKey='arsenal-cookie-choice-v1',expiry=180*864e5;
const ready=()=>{
  // Defensive: remove obsolete chooser shortcuts if another release includes them.
  for(const id of ['db-arsenal-chooser-link','db-arsenal-desktop-return']){
    document.getElementById(id)?.remove();
  }
  if(document.getElementById('ars-cookie-banner'))return;
  let previous=null;
  try{previous=JSON.parse(localStorage.getItem(storageKey)||'null')}catch(_){}
  const saved=previous && ['accepted','necessary'].includes(previous.choice) && Number.isFinite(previous.time) && Date.now()-previous.time<expiry;
  const notice=document.createElement('aside');
  notice.id='ars-cookie-banner';notice.setAttribute('aria-label','Использование cookies и локальных данных');notice.setAttribute('role','region');
  const heading=document.createElement('div');heading.className='ars-cookie-head';
  const emblem=document.createElement('span');emblem.textContent='А';emblem.setAttribute('aria-hidden','true');
  heading.append(emblem,document.createTextNode('Приватность и cookies'));
  const p=document.createElement('p');p.textContent='Используем необходимые настройки браузера для работы сайта и запоминания вашего выбора. Рекламные cookies не подключены. Подробнее — в политике конфиденциальности.';
  const buttons=document.createElement('div');buttons.className='ars-cookie-row';
  const yes=document.createElement('button');yes.type='button';yes.className='ars-cookie-yes';yes.textContent='Принять';
  const only=document.createElement('button');only.type='button';only.className='ars-cookie-only';only.textContent='Только необходимые';
  const link=document.createElement('a');link.className='ars-cookie-more';link.href='./arsenal-privacy.html#cookies';link.textContent='Прочитать условия ↗';
  function choose(choice){try{localStorage.setItem(storageKey,JSON.stringify({choice,time:Date.now()}))}catch(_){ }notice.hidden=true;}
  yes.addEventListener('click',()=>choose('accepted'));only.addEventListener('click',()=>choose('necessary'));
  buttons.append(yes,only,link);notice.append(heading,p,buttons);document.body.append(notice);
  notice.hidden=!!saved;
  const reopen=document.querySelector('.ars-legal-links a[href$="#cookies"]');
  if(reopen)reopen.setAttribute('aria-label','Прочитать политику cookies');
  // Optimize decoding and deferred fetching of below-the-fold gallery images,
  // without changing the hero or the approved animation logic.
  document.querySelectorAll('#gallery-grid img,.service-card img').forEach(img=>{
    if(!img.hasAttribute('loading'))img.loading='lazy';
    img.decoding='async';
  });
};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
})();
