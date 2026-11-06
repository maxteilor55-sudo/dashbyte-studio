/* Arsenal contact form v2 — production only, no bot credentials in browser.
 * The REG.RU packager embeds this script into index.html.
 * Never silently revert to "copy your application" demo mode.
 * Success means the Worker received Telegram sendMessage confirmation.
 */
(() => {
  'use strict';
  function init() {
    const form = document.getElementById('contact-form');
    const status = document.getElementById('form-result');
    if (!form || !status || form.dataset.arsenalLeadsMounted === '1') return;
    form.dataset.arsenalLeadsMounted = '1';

    const submit = form.querySelector('button[type="submit"]');
    if (!submit) return;
    const arrow = submit.querySelector('.arrow');
    submit.textContent = 'Отправить заявку ';
    if (arrow) submit.appendChild(arrow);
    status.replaceChildren();
    status.classList.remove('visible');
    status.setAttribute('aria-live','polite');

    const endpoint = String(window.ARSENAL_LEADS_ENDPOINT || '').trim();
    const sitekey = String(window.ARSENAL_TURNSTILE_SITEKEY || '').trim();
    const url = (() => {
      try {
        const parsed = new URL(endpoint);
        return parsed.protocol === 'https:' &&
          parsed.pathname === '/api/arsenal-lead' ? parsed.href : '';
      } catch (_) { return ''; }
    })();

    const consent = document.createElement('label');
    consent.className = 'ars-leads-consent';
    const consentInput = document.createElement('input');
    consentInput.type = 'checkbox';
    consentInput.required = true;
    consentInput.name = 'privacy';
    const consentText = document.createElement('span');
    consentText.append('Согласен(на) на обработку персональных данных для ответа на заявку. Ознакомлен(а) с ');
    const policy = document.createElement('a');
    policy.href = './arsenal-privacy.html';
    policy.target = '_blank';
    policy.rel = 'noopener noreferrer';
    policy.textContent = 'политикой конфиденциальности';
    consentText.append(policy, '.');
    consent.append(consentInput, consentText);

    const trap = document.createElement('div');
    trap.className = 'ars-leads-trap';
    trap.setAttribute('aria-hidden','true');
    const hp = document.createElement('input');
    hp.type = 'text';
    hp.name = 'website';
    hp.autocomplete = 'off';
    hp.tabIndex = -1;
    trap.append(hp);

    const challenge = document.createElement('div');
    challenge.className = 'ars-leads-turnstile';
    challenge.setAttribute('aria-label','Проверка защиты от спама');
    const challengeState = document.createElement('div');
    challengeState.className = 'ars-leads-hint';
    challengeState.textContent = 'Загружаем защиту от спама…';

    form.insertBefore(consent, submit);
    form.insertBefore(trap, submit);
    form.insertBefore(challenge, submit);
    form.insertBefore(challengeState, submit);
    const disclaimer = form.querySelector('.form-disclaimer');
    if (disclaimer) disclaimer.textContent =
      'Заявка передаётся в Telegram ответственному менеджеру ООО «ТД АРСЕНАЛ» после проверки защиты от спама.';

    let captcha = '';
    let widgetId = null;
    let widgetReady = false;
    let busy = false;
    let formStartedAt = Date.now();
    form.addEventListener('focusin', () => {
      if (Date.now()-formStartedAt>45*60*1000) formStartedAt=Date.now();
    });

    function show(kind, title, description) {
      status.replaceChildren();
      status.className = 'form-result visible ars-leads-result ars-leads-' + kind;
      status.setAttribute('role',kind==='error'?'alert':'status');
      const emblem=document.createElement('span');
      emblem.className='ars-leads-emblem';
      emblem.setAttribute('aria-hidden','true');
      emblem.textContent=kind==='success'?'✓':kind==='sending'?'◌':'!';
      const content=document.createElement('div');
      content.className='ars-leads-result-copy';
      const heading=document.createElement('strong');
      heading.textContent=title;
      const detail=document.createElement('p');
      detail.textContent=description;
      content.append(heading,detail);
      status.append(emblem,content);
    }

    // Register immediately: never wait for an external script before taking
    // responsibility for the button. The demo handler must never run.
    form.addEventListener('submit', async event => {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (busy || !form.reportValidity()) return;
      if (!url || !sitekey) {
        show('error','Отправка пока не настроена',
          'Свяжитесь с менеджером по телефону +7 (908) 240-09-98.');
        return;
      }
      if (!widgetReady) {
        show('error','Проверка защиты ещё загружается',
          'Подождите немного и попробуйте снова. Если не помогает, обновите страницу.');
        return;
      }
      if (!captcha) {
        show('error','Подтвердите защиту от спама',
          'Дождитесь завершения проверки Cloudflare и попробуйте ещё раз.');
        return;
      }

      const name = document.getElementById('client-name')?.value.trim() || '';
      const phone = document.getElementById('client-phone')?.value.trim() || '';
      const service = document.getElementById('product-type')?.value || '';
      const details = document.getElementById('client-details')?.value.trim() || '';
      if (!name || !phone) {
        show('error','Не хватает данных','Введите ваше имя и номер телефона.');
        return;
      }
      busy = true;
      submit.disabled = true;
      const buttonLabel=submit.firstChild;
      if (buttonLabel) buttonLabel.textContent = 'Отправляем… ';
      show('sending','Отправляем заявку','Передаём информацию менеджеру «Арсенала» в Telegram.');

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(),22000);
      try {
        const response = await fetch(url,{
          method:'POST',
          headers:{'Content-Type':'application/json'},
          cache:'no-store',
          signal:controller.signal,
          body:JSON.stringify({
            name, phone, service, details, website:hp.value,
            privacy:consentInput.checked, turnstile:captcha,
            started:formStartedAt
          })
        });
        const payload = await response.json();
        if (!response.ok || payload?.ok!==true || hp.value) {
          throw new Error(payload?.error || 'delivery_failed');
        }
        show('success','Заявка передана в Telegram!',
          'Telegram подтвердил приём сообщения для менеджера «Арсенала». Ожидайте связи по указанному номеру.');
        form.reset();
        formStartedAt=Date.now();
      } catch (_) {
        show('error','Не удалось отправить заявку',
          'Доставка не подтверждена. Проверьте интернет и повторите попытку. Можно также позвонить: +7 (908) 240-09-98.');
      } finally {
        clearTimeout(timer);
        busy=false;
        submit.disabled=false;
        if (buttonLabel) buttonLabel.textContent='Отправить заявку ';
        captcha='';
        try { if(widgetId!==null) window.turnstile?.reset(widgetId); } catch (_) {}
      }
    },true);

    if (!url || !sitekey) {
      widgetReady=false;
      challengeState.textContent='Отправка временно недоступна: форма не настроена.';
      return;
    }

    function loadTurnstile() {
      if (window.turnstile?.render) {
        mountTurnstile();
        return;
      }
      const script=document.createElement('script');
      script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async=true;
      script.addEventListener('load',mountTurnstile,{once:true});
      script.addEventListener('error',()=>{
        widgetReady=false;
        challengeState.textContent='Не удалось загрузить проверку Cloudflare. Проверьте соединение или обновите страницу.';
      },{once:true});
      document.head.appendChild(script);
    }
    function mountTurnstile() {
      try {
        if (!window.turnstile?.render) throw new Error('Turnstile unavailable');
        widgetId=window.turnstile.render(challenge,{
          sitekey, action:'arsenal_contact', theme:'dark',
          callback(token) {
            captcha=String(token||'');
            challengeState.textContent=captcha?'Защита пройдена — можно отправлять заявку.':'Ожидаем проверку Cloudflare…';
          },
          'expired-callback'() {
            captcha='';
            challengeState.textContent='Проверка устарела. Пройдите её ещё раз.';
          },
          'error-callback'() {
            captcha='';
            challengeState.textContent='Проверка Cloudflare не удалась. Обновите страницу и повторите попытку.';
          }
        });
        widgetReady = widgetId !== undefined && widgetId !== null;
        if (!widgetReady) throw new Error('Cannot render Turnstile');
        challengeState.textContent='Пройдите проверку Cloudflare, если она появится.';
      } catch (_) {
        widgetReady=false;
        challengeState.textContent='Ошибка загрузки защиты формы. Обновите страницу и попробуйте снова.';
      }
    }
    loadTurnstile();
  }
  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
