/**
 * DashByte Studio Telegram bot — Cloudflare Worker
 * Public code only. Never commit bot tokens.
 *
 * Cloudflare environment secrets:
 *   TELEGRAM_BOT_TOKEN — token from @BotFather
 *   TELEGRAM_WEBHOOK_SECRET — random 32+ char secret (Telegram header check)
 *
 * Register webhook using:
 *   https://api.telegram.org/bot<TOKEN>/setWebhook
 * with the public Worker URL + /webhook and secret_token.
 */
const APP_URL = 'https://maxteilor55-sudo.github.io/dashbyte-studio/';
const CONTACT_URL = 'https://t.me/Reelog';
const BRAND = 'DashByte';

const WELCOME =
  '<b>Привет! Добро пожаловать в DashByte.</b> 👋\n\n' +
  'Создаём сайты, айдентику, графику и видеоконтент, которые помогают бизнесу выделяться.\n\n' +
  'В нашем мини-приложении сейчас представлен проект <b>«Арсенал»</b> — ' +
  'посмотри услуги и примеры работ прямо в Telegram.\n\n' +
  'Нажми кнопку ниже, чтобы открыть сайт.';

const HELP =
  '<b>DashByte — цифровая студия.</b>\n\n' +
  '🌐 /site — открыть наш Mini App\n' +
  '💬 /contact — связаться со студией\n' +
  'ℹ️ /help — помощь\n' +
  '🏠 /start — вернуться в начало';

function appKeyboard() {
  return {inline_keyboard: [
    [{text:'🌐 Открыть приложение', web_app:{url:APP_URL}}],
    [{text:'💬 Написать в студию', url:CONTACT_URL}],
  ]};
}

async function telegram(env, method, payload) {
  if (!env.TELEGRAM_BOT_TOKEN) throw new Error('Missing TELEGRAM_BOT_TOKEN secret');
  const response = await fetch(
    'https://api.telegram.org/bot' + env.TELEGRAM_BOT_TOKEN + '/' + method,
    {
      method:'POST',
      headers:{'content-type':'application/json'},
      body:JSON.stringify(payload),
    }
  );
  const result = await response.json();
  if (!response.ok || !result.ok)
    throw new Error('Telegram API ' + method + ': ' + (result.description || response.status));
  return result.result;
}

async function handleMessage(env, message) {
  if (!message?.chat || message.chat.type !== 'private') return;
  const chat_id = message.chat.id;
  const command = (message.text || '').trim().split(/\s+/)[0].toLowerCase().split('@')[0];
  if (command === '/start' || command === '/site' || command === '/app') {
    return telegram(env,'sendMessage',{
      chat_id,text:WELCOME,parse_mode:'HTML',
      disable_web_page_preview:true,reply_markup:appKeyboard()
    });
  }
  if (command === '/help') {
    return telegram(env,'sendMessage',{
      chat_id,text:HELP,parse_mode:'HTML',
      reply_markup:appKeyboard()
    });
  }
  if (command === '/contact') {
    return telegram(env,'sendMessage',{
      chat_id,
      text:'Напиши нам — обсудим сайт, дизайн или контент. 👇',
      reply_markup:{inline_keyboard:[[{text:'💬 Связаться с DashByte',url:CONTACT_URL}]]}
    });
  }
  // Help new visitors who send a greeting without a slash command.
  return telegram(env,'sendMessage',{
    chat_id,
    text:'Привет! Я бот студии DashByte. Открывай наше приложение — покажем, что умеем. 👇',
    reply_markup:appKeyboard()
  });
}

export default {
  async fetch(request,env) {
    const url=new URL(request.url);
    if (request.method==='GET' && (url.pathname==='/' || url.pathname==='/health')) {
      return new Response('DashByte Telegram bot: OK',{status:200});
    }
    if (url.pathname!=='/webhook' || request.method!=='POST') {
      return new Response('Not found',{status:404});
    }
    const secret=request.headers.get('X-Telegram-Bot-Api-Secret-Token');
    if (!env.TELEGRAM_WEBHOOK_SECRET || secret!==env.TELEGRAM_WEBHOOK_SECRET) {
      return new Response('Unauthorized',{status:401});
    }
    let update;
    try { update=await request.json(); }
    catch { return new Response('Bad JSON',{status:400}); }
    try {
      if (update.message) await handleMessage(env,update.message);
      return new Response('OK',{status:200});
    } catch (error) {
      console.error('Bot update failed:',String(error).replaceAll(env.TELEGRAM_BOT_TOKEN || '***','[REDACTED]'));
      return new Response('Temporary error',{status:502});
    }
  }
};
