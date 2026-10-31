/* DashByte cookie notice: scope exclusively to the studio page.
   Consent for contact-form submission is separate and must not inherit cookie choice.
   Technical storage only; no analytics or ad scripts enabled by either button. */
(function(){
 'use strict';
 const key='db-cookie-choice-v1';
 const maxAge=180*24*60*60*1000;
 const sitePath=new URL('./privacy.html',location.href);
 function oldChoice(){
   try{const v=JSON.parse(localStorage.getItem(key)||'null');if(v&&['accepted','necessary'].includes(v.kind)&&Date.now()-v.at<maxAge)return v.kind}catch(e){}
   return null;
 }
 function store(kind){
   try{localStorage.setItem(key,JSON.stringify({kind,at:Date.now(),version:1}))}catch(e){}
 }
 function start(){
   if(document.getElementById('db-cookie-banner'))return;
   const banner=document.createElement('aside');banner.id='db-cookie-banner';banner.setAttribute('role','region');banner.setAttribute('aria-label','Информация о cookies и конфиденциальности');banner.hidden=Boolean(oldChoice());
   const top=document.createElement('div');top.className='db-cookie-top';top.innerHTML='<span class="db-cookie-symbol" aria-hidden="true">◌</span>Приватность в DashByte';
   const p=document.createElement('p');p.textContent='Используем локальное хранение, чтобы запоминать настройки сайта и ваш выбор. Форма заявки отправляет данные только после вашего отдельного согласия. Подробности — в политике конфиденциальности.';
   const row=document.createElement('div');row.className='db-cookie-actions';
   const accept=document.createElement('button');accept.className='db-cookie-accept';accept.type='button';accept.textContent='Принять';
   const minimal=document.createElement('button');minimal.className='db-cookie-minimal';minimal.type='button';minimal.textContent='Только необходимые';
   const more=document.createElement('a');more.className='db-cookie-details';more.textContent='Прочитать условия ↗';more.href=sitePath.pathname+'#cookies';
   // Preserve native Telegram context only for navigation. Never send launch hash in forms.
   // Policy anchors must stay valid also inside Telegram's WebView.
   function close(kind){store(kind);banner.hidden=true;}
   accept.addEventListener('click',()=>close('accepted'));minimal.addEventListener('click',()=>close('necessary'));
   row.append(accept,minimal,more);banner.append(top,p,row);document.body.append(banner);
   const footer=document.createElement('div');footer.id='db-legal-page-footer';footer.setAttribute('aria-label','Правовая информация');
   const policy=document.createElement('a');policy.href=sitePath.pathname;policy.textContent='Политика конфиденциальности';
   const terms=document.createElement('a');terms.href=sitePath.pathname+'#projects';terms.textContent='Условия просмотра проектов';
   const reopen=document.createElement('a');reopen.id='db-cookie-reopen';reopen.href='#';reopen.textContent='Настройки cookies';
   reopen.addEventListener('click',e=>{e.preventDefault();banner.hidden=false;accept.focus()});
   footer.append(policy,terms,reopen);document.body.append(footer);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();