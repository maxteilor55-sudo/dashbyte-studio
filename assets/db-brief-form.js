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
 const draftArea=overlay.querySelector('#dbBriefDraft');
 const telegramLink=overlay.querySelector('#dbBriefTelegram');
 let initialButton=submit.innerHTML;
 if(!window.DASHBYTE_LEADS_ENDPOINT){
   const label=submit.querySelector('span');
   if(label)label.textContent='ПОДГОТОВИТЬ ЗАЯВКУ';
   initialButton=submit.innerHTML;
   status.textContent='После заполнения подготовим сообщение для отправки в Telegram.';
 }
 let active=false,submitting=false,previousFocus=null,closeTimer=0,latestDraft='';
 const tg=()=>window.Telegram&&window.Telegram.WebApp;
 const escapeLine=s=>String(s||'').trim().slice(0,1400);
 const pick=(name)=>escapeLine(form.elements.namedItem(name)?.value||'');
 const selectedServices=()=>[...form.querySelectorAll('input[name="services"]:checked')].map(el=>el.value);
 const serviceCount=overlay.querySelector('#dbBriefSelectedCount');
 const updateServiceCount=()=>{
   const count=selectedServices().length;
   serviceCount.textContent=count?'Выбрано: '+count:'Не выбрано';
 };
 const feedback=(message,kind='idle')=>{status.textContent=message;status.dataset.state=kind};
 const explainApiError=(status,code)=>{
   if(status===401)return 'Telegram не подтвердил запуск (401). Открой мини-приложение через DashByteStudioBot и проверь, что в Cloudflare указан токен именно этого бота.';
   if(status===502)return 'Telegram не смог доставить заявку владельцу (502). Открой личный чат с DashByteStudioBot, нажми «Запустить» и проверь свой chat ID в Cloudflare.';
   if(status===503&&code==='owner_chat_id')return 'Неверный TELEGRAM_OWNER_CHAT_ID в Cloudflare (503): нужен числовой ID личного чата.';
   if(status===503)return 'В Cloudflare не хватает настроек (503). Проверь TELEGRAM_BOT_TOKEN и TELEGRAM_OWNER_CHAT_ID.';
   if(status===429)return 'Слишком много попыток отправки (429). Попробуй позже.';
   if(status===403)return 'Сервер не разрешил адрес приложения (403). Нужна проверка настроек Worker.';
   if(status===400)return 'Сервер отклонил данные заявки (400).';
   if(status===404||status===405)return 'Сервер не нашёл обработчик /api/lead (код '+status+').';
   return 'Сервер не подтвердил отправку (код '+status+'). Проверь журнал Cloudflare Worker.';
 };
 const getMessage=()=>[
   '🟥 ЗАЯВКА НА УСЛУГИ DASHBYTE',
   '',
   'Имя: '+pick('name'),
   'Компания: '+(pick('company')||'Не указана'),
   'Услуги: '+(selectedServices().join(', ')||'Не выбраны'),
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
   // Prevent navigation BEFORE awaiting clipboard; otherwise Android can switch
   // to Telegram before the draft text was successfully copied.
   e.preventDefault();
   const copied=await copyDraft();
   if(!copied)return;
   const url='https://t.me/Reelog';
   try{
     if(tg()?.openTelegramLink)tg().openTelegramLink(url);
     else location.assign(url);
   }catch(err){location.assign(url)}
   // Opening a chat is NOT proof of sending a lead.
 });
 form.addEventListener('input',()=>{if(status.dataset.state==='error')feedback('Опиши задачу — мы свяжемся с тобой для уточнения деталей.')});
 form.querySelectorAll('input[name="services"]').forEach(input=>input.addEventListener('change',()=>{
   updateServiceCount();
   try{tg()?.HapticFeedback?.selectionChanged()}catch(e){}
 }));
 updateServiceCount();
 form.addEventListener('submit',async e=>{
   e.preventDefault();
   if(submitting||!form.reportValidity())return;
   if(!form.elements.namedItem('privacy')?.checked){
     feedback('Для отправки необходимо согласие на обработку данных.','error');return;
   }
   if(pick('website'))return;
   const services=selectedServices();
   if(!services.length){
     feedback('Выбери хотя бы одну услугу — можно отметить сразу несколько.','error');
     form.querySelector('.db-brief-service-picker input')?.focus({preventScroll:true});
     return;
   }
   // Compatible with the already deployed Worker: first item as the validated
   // service, complete selection in the message sent to the Telegram owner.
   const summary='Выбранные услуги ('+services.length+'): '+services.join(', ');
   const description=pick('message');
   const details=description?('\n\nОписание: '+description):'';
   const data={name:pick('name'),company:pick('company'),service:services[0],contact:pick('contact'),message:(summary+details).slice(0,1500),privacy:true,website:''};
   if(!data.name||!data.contact){feedback('Укажи имя и способ связи.','error');return}
   latestDraft=getMessage();
   if(draftArea)draftArea.value=latestDraft;
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
     if(!res.ok||!json||json.ok!==true){
       const failure=new Error(explainApiError(res.status,json&&typeof json.error==='string'?json.error:''));
       failure.isDeliveryResponse=true;
       throw failure;
     }
     form.reset();updateServiceCount();success.hidden=false;form.hidden=true;
     feedback('Заявка доставлена в Telegram.','success');
     try{tg()?.HapticFeedback?.notificationOccurred('success')}catch(e){}
   }catch(error){
     alternative.hidden=false;
     const explanation=error?.isDeliveryResponse?error.message:
       error?.name==='AbortError'?
       'Сервер не ответил за 16 секунд. Проверь соединение и повтори попытку.':
       'Не удалось связаться с Cloudflare Worker. Проверь интернет и попробуй ещё раз.';
     feedback(explanation+' Заявка не отмечена как отправленная.','error');
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
