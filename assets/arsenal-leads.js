/* Arsenal: optional, secure Telegram lead delivery via Cloudflare Worker.
 * The public page contains NO bot token or Telegram recipient ID.
 * With no endpoint/sitekey configured the original manual form is untouched.
 */
(() => {
  'use strict';
  const init = async () => {
    const form = document.getElementById('contact-form');
    const endpoint = String(window.ARSENAL_LEADS_ENDPOINT || '').trim();
    const sitekey = String(window.ARSENAL_TURNSTILE_SITEKEY || '').trim();
    if (!form || !endpoint || !sitekey) return;
    let url;
    try {
      url = new URL(endpoint);
      if (url.protocol !== 'https:' || url.pathname !== '/api/arsenal-lead') return;
    } catch (_) { return; }

    const submit = form.querySelector('button[type="submit"]');
    const status = document.getElementById('form-result');
    if (!submit || !status) return;

    const consent = document.createElement('label');
    consent.className = 'ars-leads-consent';
    const consentInput = document.createElement('input');
    consentInput.type = 'checkbox';
    consentInput.required = true;
    consentInput.name = 'privacy';
    const consentText = document.createElement('span');
    consentText.append('Даю согласие на обработку персональных данных для ответа на заявку. Ознакомлен(а) с ');
    const policy = document.createElement('a');
    policy.href = './arsenal-privacy.html';
    policy.target = '_blank';
    policy.rel = 'noopener noreferrer';
    policy.textContent = 'политикой конфиденциальности';
    consentText.append(policy, '.');
    consent.append(consentInput, consentText);

    // Hidden honeypot for basic automated form fillers.
    const trap = document.createElement('div');
    trap.className = 'ars-leads-trap';
    trap.setAttribute('aria-hidden', 'true');
    const hp = document.createElement('input');
    hp.name = 'website';
    hp.type = 'text';
    hp.tabIndex = -1;
    hp.autocomplete = 'off';
    trap.append(hp);

    const challenge = document.createElement('div');
    challenge.className = 'ars-leads-turnstile';
    const start = Date.now();
    let captcha = '', widgetId = null, busy = false;

    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    const loaded = new Promise((resolve, reject) => {
      script.addEventListener('load', resolve, {once:true});
      script.addEventListener('error', reject, {once:true});
    });
    document.head.append(script);
    try {
      await loaded;
      if (!window.turnstile) return;
      form.insertBefore(consent, submit);
      form.insertBefore(trap, submit);
      form.insertBefore(challenge, submit);
      widgetId = window.turnstile.render(challenge, {
        sitekey, action:'arsenal_contact', theme:'dark',
        callback(token) { captcha = token; },
        'expired-callback'() { captcha = ''; },
        'error-callback'() { captcha = ''; }
      });
    } catch (_) {
      consent.remove(); trap.remove(); challenge.remove();
      return; // Existing manual form still works if challenge is blocked.
    }

    submit.firstChild.textContent = 'Отправить заявку ';
    const disclaimer = form.querySelector('.form-disclaimer');
    if (disclaimer) disclaimer.textContent =
      'Заявка будет передана ООО «ТД АРСЕНАЛ» через защищённый обработчик и Telegram-бот DashByte.';

    function setStatus(message, error, copyText) {
      status.replaceChildren();
      const p = document.createElement('div');
      p.textContent = message;
      status.append(p);
      status.classList.add('visible');
      status.setAttribute('role', error ? 'alert' : 'status');
      if (copyText) {
        const copy = document.createElement('button');
        copy.type = 'button';
        copy.textContent = 'Скопировать заявку';
        copy.addEventListener('click', async () => {
          try {
            await navigator.clipboard.writeText(copyText);
            copy.textContent = 'Скопировано ✓';
          } catch (_) { copy.textContent = 'Не удалось скопировать'; }
        });
        status.append(copy);
      }
    }
    const resetCaptcha = () => {
      captcha = '';
      try { if(widgetId!==null) window.turnstile.reset(widgetId); } catch (_) {}
    };
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      event.stopImmediatePropagation(); // Don't run legacy manual submit handler.
      if (busy || !form.reportValidity()) return;
      if (!captcha) {
        setStatus('Подтвердите проверку защиты от спама перед отправкой.', true);
        return;
      }
      const name = document.getElementById('client-name').value.trim();
      const phone = document.getElementById('client-phone').value.trim();
      const service = document.getElementById('product-type').value;
      const details = document.getElementById('client-details').value.trim();
      const copyText = 'Заявка с сайта «Арсенал»\nИмя: ' + name + '\nТелефон: ' + phone +
        '\nУслуга: ' + service + '\nПожелания: ' + (details || 'Не указаны');
      busy = true;
      submit.disabled = true;
      setStatus('Отправляем заявку…', false);
      try {
        const response = await fetch(url.href, {
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify({
            name, phone, service, details, website:hp.value,
            privacy:consentInput.checked, turnstile:captcha, started:start
          })
        });
        const answer = await response.json();
        if (!response.ok || answer?.ok!==true) throw new Error('delivery_failed');
        setStatus('Заявка отправлена! Менеджер «Арсенала» получил уведомление в Telegram.', false);
        form.reset();
      } catch (_) {
        setStatus('Не удалось подтвердить доставку заявки. Свяжитесь с нами по телефону или скопируйте текст заявки.', true, copyText);
      } finally {
        busy = false;
        submit.disabled = false;
        resetCaptcha();
      }
    }, true);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true});
  else init();
})();
