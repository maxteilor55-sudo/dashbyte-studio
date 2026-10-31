/* DashByte live contact form: progressive fallback (native POST) + AJAX.
   Intercepts only #brief; no passwords or SMTP keys are shipped in the page. */
(function(){
  'use strict';
  const TARGET='https://formsubmit.co/ajax/maxteilor55@gmail.com';
  const form=document.getElementById('brief');
  if(!form)return;
  const status=document.getElementById('form-status');
  const submit=form.querySelector('button[type="submit"]');
  if(!submit||!status)return;
  const originalButton=submit.innerHTML;
  const publicPage=location.origin+location.pathname;
  const pageField=form.querySelector('[name="_url"]');
  if(pageField)pageField.value=publicPage;
  let pending=false;
  const field=id=>String(document.getElementById(id)?.value||'').trim();
  const show=(message,state)=>{
    status.textContent=message;
    status.dataset.state=state;
  };
  const setPending=busy=>{
    pending=busy;
    submit.disabled=busy;
    form.setAttribute('aria-busy',String(busy));
    submit.innerHTML=busy?'Отправляю заявку…':originalButton;
  };
  form.addEventListener('input',()=>{
    if(status.dataset.state==='error')show('Заявка придёт мне на почту. Использую контакт только для ответа на ваше обращение.','idle');
  });
  form.addEventListener('submit',async function(event){
    event.preventDefault();
    event.stopImmediatePropagation();
    if(pending)return;
    if(!form.reportValidity())return;
    const name=field('name'),contact=field('contact-info'),service=field('service');
    const message=field('message');
    if(!name||!contact){
      show('Укажи имя и контакт, чтобы я мог ответить.','error');return;
    }
    if(String(form.querySelector('[name="_honey"]')?.value||'').trim())return;
    const payload={
      name:name,
      contact:contact,
      service:service,
      message:message||'Не указано',
      _subject:'Новая заявка с сайта DashByte',
      _template:'table',
      _honey:'',
      page_url:publicPage,
      _url:publicPage
    };
    // Reply-To is useful only for a valid email, never for a Telegram handle or phone.
    if(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact))payload.email=contact;
    setPending(true);
    show('Отправляю заявку…','loading');
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),18000);
    try{
      const response=await fetch(TARGET,{
        method:'POST',
        mode:'cors',
        headers:{'Content-Type':'application/json','Accept':'application/json'},
        body:JSON.stringify(payload),
        signal:controller.signal
      });
      let result=null;
      try{result=await response.json()}catch(e){}
      if(!response.ok||!result||!(result.success===true||result.success==='true')){
        throw Error('form backend rejected submission');
      }
      show('Заявка отправлена! Спасибо, скоро свяжусь с вами.','success');
      form.reset();
    }catch(error){
      show('Не удалось отправить заявку. Проверь интернет и попробуй ещё раз или напиши мне в Telegram.','error');
    }finally{
      clearTimeout(timeout);
      setPending(false);
    }
  });
})();