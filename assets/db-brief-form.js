/* DashByte order request · interface + secure worker transport.
   No Telegram token or owner chat id belongs in this public script. */
(function(){
 'use strict';
 const overlay=document.getElementById('dbBriefModal');
 const open=document.getElementById('dbOpenBrief');
 if(!overlay||!open)return;
 const closeButton=overlay.querySelector('[data-db-brief-close]');
 const form=overlay.querySelector('#dbBriefForm');
 const status=overlay.querySelector('#dbBriefStatus');
 const submit=form.querySelector('[type="submit"]');
 const success=overlay.querySelector('#dbBriefSuccess');
 const alternative=overlay.querySelector('#dbBriefAlternative');
 const copyButton=overlay.querySelector('#dbBriefCopy');
 const telegramLink=overlay.querySelector('#dbBriefTelegram');
 const initialButton=submit.innerHTML;
 let active=false,submitting=false,previousFocus=null,closeTimer=0,latestDraft='';
 const tg=()=>window.Telegram&&window.Telegram.WebApp;
 const escapeLine=s=>String(s||'').trim().slice(0,1400);
 const pick=(name)=>escapeLine(form.elements.namedItem(name)?.value||'');
 const feedback=(message,kind='idle')=>{status.textContent=message;status.dataset.state=kind};
 const getMessage=()=>[
   '🟥 ЗАЯВКА НА УСЛУГИ DASHBYTE',
   '',
   'Имя: '+pick('name'),
   'Компания: '+(pick('company')||'Не указана'),
   'Услуга: '+pick('service'),
   'Контакт: '+pick('contact'),
   'Задача: '+(pick('message')||'Уточнить при общении'),
 ].join('\n');
 function openModal(){
   if(active)return;active=true;previousFocus=document.activeElement;
   overlay.hidden=false;overlay.setAttribute('aria-hidden','false');
   document.body.classList.add('db-brief-locked');
   requestAnimationFrame(()=>{overlay.classList.add('is-open');setTimeout(()=>form.elements.namedItem('name')?.focus({preventScroll:true}),165)});
   try{tg()?.HapticFeedback?.impactOccurred('light')}catch(e){}
 }
 function closeModal(){
   if(!active||submitting)return;
   active=false;overlay.classList.remove('is-open');overlay.setAttribute('aria-hidden','true');
   document.body.classList.remove('db-brief-locked');
   clearTimeout(closeTimer);
   closeTimer=setTimeout(()=>{if(!active)overlay.hidden=true},310);
   if(previousFocus?.focus)previousFocus.focus({preventScroll:true});
 }
 open.addEventListener('click',openModal);
 overlay.querySelectorAll('[data-db-brief-close]').forEach(el=>el.addEventListener('click',closeModal));
 document.addEventListener('keydown',e=>{
   if(!active)return;
   if(e.key==='Escape'){e.preventDefault();closeModal();return}
   if(e.key==='Tab'){
     const focusable=[...overlay.querySelectorAll('input:not([type="hidden"]):not([tabindex="-1"]),textarea,button:not([disabled]),a[href]')].filter(x=>x.getClientRects().length>0&&!x.closest('[hidden]'));
     if(!focusable.length)return;
     const first=focusable[0],last=focusable[focusable.length-1];
     if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}
     else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
   }
 });
 async function copyDraft(){
   try{
     if(navigator.clipboard&&window.isSecureContext)await navigator.clipboard.writeText(latestDraft);
     else{
       const temp=document.createElement('textarea');temp.value=latestDraft;temp.style.position='fixed';temp.style.opacity='0';
       document.body.appendChild(temp);temp.select();const ok=document.execCommand('copy');temp.remove();if(!ok)throw Error('copy failed');
     }
     feedback('Текст скопирован. Открой Telegram, вставь сообщение и отправь его.','idle');
     return true;
   }catch(e){feedback('Не получилось скопировать автоматически. Можно выделить и скопировать текст вручную.','error');return false}
 }
 copyButton.addEventListener('click',copyDraft);
 telegramLink.addEventListener('click',async e=>{
   // Telegram handles opening; never mark request as sent by simply opening a chat.
   await copyDraft();
   const url='https://t.me/Reelog';
   if(tg()?.openTelegramLink){e.preventDefault();try{tg().openTelegramLink(url)}catch(err){window.open(url,'_blank','noopener')}}
 });
 form.addEventListener('input',()=>{if(status.dataset.state==='error')feedback('Опиши задачу — мы свяжемся с тобой для уточнения деталей.')});
 form.addEventListener('submit',async e=>{
   e.preventDefault();
   if(submitting||!form.reportValidity())return;
   if(!form.elements.namedItem('privacy')?.checked){
     feedback('Для отправки необходимо согласие на обработку данных.','error');return;
   }
   if(pick('website'))return;
   const data={name:pick('name'),company:pick('company'),service:pick('service'),contact:pick('contact'),message:pick('message'),privacy:true,website:''};
   if(!data.name||!data.contact||!data.service){feedback('Укажи имя, услугу и способ связи.','error');return}
   latestDraft=getMessage();
   alternative.hidden=true;
   const endpoint=String(window.DASHBYTE_LEADS_ENDPOINT||'').trim();
   const initData=tg()?.initData||'';
   if(!endpoint||!initData){
     alternative.hidden=false;
     feedback(!endpoint?'Автоматическая отправка пока настраивается. Отправь подготовленное сообщение через Telegram.':'Для автоматической отправки открой форму внутри DashByte Bot. Или напиши напрямую в Telegram.','error');
     return;
   }
   // Refuse insecure or untrusted submission endpoints; never send initData to third parties.
   let safeEndpoint;
   try{
     safeEndpoint=new URL(endpoint,location.href);
     if(safeEndpoint.protocol!=='https:'||!/^\/api\/lead$/.test(safeEndpoint.pathname)||!safeEndpoint.hostname.endsWith('.workers.dev'))throw Error('unsafe endpoint');
   }catch(error){alternative.hidden=false;feedback('Отправка пока недоступна. Напиши нам напрямую в Telegram.','error');return}
   submitting=true;submit.disabled=true;submit.textContent='Отправляем заявку…';
   feedback('Отправляем заявку в Telegram…');
   const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),16000);
   try{
     const res=await fetch(safeEndpoint.href,{method:'POST',mode:'cors',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify({...data,initData}),signal:controller.signal});
     let json=null;try{json=await res.json()}catch(e){}
     if(!res.ok||!json||json.ok!==true)throw Error('Delivery unconfirmed: '+res.status);
     form.reset();success.hidden=false;form.hidden=true;
     feedback('Заявка доставлена в Telegram.','success');
     try{tg()?.HapticFeedback?.notificationOccurred('success')}catch(e){}
   }catch(error){
     alternative.hidden=false;
     feedback('Не удалось подтвердить доставку. Заявка не отмечена как отправленная — свяжись с нами напрямую в Telegram.','error');
   }finally{
     clearTimeout(timeout);submitting=false;submit.disabled=false;submit.innerHTML=initialButton;
   }
 });
 // Returning to the screen allows reusing the form without a page reload.
 overlay.querySelector('#dbBriefAgain').addEventListener('click',()=>{
   success.hidden=true;form.hidden=false;alternative.hidden=true;feedback('Расскажи, что нужно твоему бизнесу.');
   form.elements.namedItem('name')?.focus({preventScroll:true});
 });
})();
