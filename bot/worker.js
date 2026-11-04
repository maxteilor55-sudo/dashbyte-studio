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
  if (command === '/myid') {
    return telegram(env,'sendMessage',{
      chat_id,text:'Твой личный Telegram chat ID: <code>'+chat_id+'</code>\nДобавь его как секрет TELEGRAM_OWNER_CHAT_ID в Cloudflare Worker.',
      parse_mode:'HTML'
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

/* Website leads: signed Telegram Mini App requests -> owner private Telegram chat.
 * This is NEVER callable directly from the browser with a bot token.
 * The bot token and owner ID live only in Cloudflare secret environment.
 */
const LEAD_ORIGIN='https://maxteilor55-sudo.github.io';
const SERVICE_OPTIONS=new Set(['Создание сайта','Логотип','Айдентика и дизайн','Реклама и продвижение','Видео и контент','Другое']);
function leadHeaders(origin){
  return {
    'Content-Type':'application/json; charset=utf-8',
    'Cache-Control':'no-store',
    'Vary':'Origin',
    ...(origin===LEAD_ORIGIN?{'Access-Control-Allow-Origin':LEAD_ORIGIN,
      'Access-Control-Allow-Methods':'POST, OPTIONS',
      'Access-Control-Allow-Headers':'Content-Type',
      'Access-Control-Max-Age':'600'}:{})
  };
}
function leadJson(origin,status,payload){
  return new Response(JSON.stringify(payload),{status,headers:leadHeaders(origin)});
}
function clean(value,max){
  return String(value??'').replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g,'').trim().slice(0,max);
}
async function verifiedTelegramUser(token,raw){
  if(!token||typeof raw!=='string'||raw.length<35||raw.length>4096)return null;
  const params=new URLSearchParams(raw),provided=params.get('hash');
  if(!provided||!/^[a-f0-9]{64}$/i.test(provided))return null;
  const auth=Number(params.get('auth_date'));
  const now=Math.floor(Date.now()/1000);
  if(!Number.isInteger(auth)||auth>now+120||now-auth>86400)return null;
  const fields=[...params.entries()]
    .filter(([k])=>k!=='hash'&&k!=='signature')
    .sort(([a],[b])=>a.localeCompare(b))
    .map(([k,v])=>k+'='+v).join('\n');
  const encoder=new TextEncoder();
  const secret=await crypto.subtle.importKey('raw',encoder.encode('WebAppData'),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const bytes=await crypto.subtle.sign('HMAC',secret,encoder.encode(token));
  const signingKey=await crypto.subtle.importKey('raw',bytes,{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const digest=await crypto.subtle.sign('HMAC',signingKey,encoder.encode(fields));
  const actual=new Uint8Array(digest);
  const expected=Uint8Array.from(provided.match(/../g),x=>parseInt(x,16));
  let mismatch=0;
  for(let i=0;i<actual.length;i++)mismatch|=actual[i]^expected[i];
  if(mismatch!==0)return null;
  try{
    const user=JSON.parse(params.get('user')||'null');
    if(!user||!Number.isSafeInteger(user.id)||user.id<1)return null;
    return {id:user.id,name:clean(user.first_name,70),username:clean(user.username,45)};
  }catch(e){return null}
}
async function handleLead(request,env){
  const origin=request.headers.get('Origin')||'';
  if(request.method==='OPTIONS'){
    if(origin!==LEAD_ORIGIN)return leadJson(origin,403,{ok:false});
    return new Response(null,{status:204,headers:leadHeaders(origin)});
  }
  if(request.method!=='POST')return leadJson(origin,405,{ok:false});
  if(origin!==LEAD_ORIGIN)return leadJson(origin,403,{ok:false,error:'origin'});
  if(!String(request.headers.get('content-type')||'').startsWith('application/json'))
    return leadJson(origin,415,{ok:false,error:'content_type'});
  if(Number(request.headers.get('content-length')||0)>8500)return leadJson(origin,413,{ok:false});
  if(!env.TELEGRAM_BOT_TOKEN||!env.TELEGRAM_OWNER_CHAT_ID)
    return leadJson(origin,503,{ok:false,error:'not_configured'});
  let data;
  try{
    const raw=await request.text();
    if(raw.length>8500)return leadJson(origin,413,{ok:false});
    data=JSON.parse(raw);
  }catch(e){return leadJson(origin,400,{ok:false,error:'invalid_json'})}
  if(!data||typeof data!=='object'||Array.isArray(data))return leadJson(origin,400,{ok:false});
  // Telegram signs WebApp.initData using the bot token. A fabricated client
  // request cannot reach sendMessage without a valid, unexpired signature.
  const visitor=await verifiedTelegramUser(env.TELEGRAM_BOT_TOKEN,data.initData);
  if(!visitor)return leadJson(origin,401,{ok:false,error:'telegram_auth'});
  if(clean(data.website,200))return leadJson(origin,200,{ok:true});
  if(env.LEAD_RATE_LIMITER){
    const limit=await env.LEAD_RATE_LIMITER.limit({key:String(visitor.id)});
    if(!limit.success)return leadJson(origin,429,{ok:false,error:'rate_limited'});
  }
  const name=clean(data.name,80),company=clean(data.company,120),
        contact=clean(data.contact,160),message=clean(data.message,1500),
        service=clean(data.service,80);
  if(data.privacy!==true||!name||!contact||!SERVICE_OPTIONS.has(service))
    return leadJson(origin,400,{ok:false,error:'validation'});
  const chatId=String(env.TELEGRAM_OWNER_CHAT_ID).trim();
  if(!/^\d{5,20}$/.test(chatId))return leadJson(origin,503,{ok:false,error:'owner_chat_id'});
  const telegramContact=visitor.username?'@'+visitor.username:'без username';
  const text=[
    '🔴 НОВАЯ ЗАЯВКА · DASHBYTE',
    '',
    '👤 Имя: '+name,
    '🏢 Компания: '+(company||'не указана'),
    '🧩 Услуга: '+service,
    '📞 Контакт: '+contact,
    '📝 Описание: '+(message||'Не указано'),
    '',
    '✈️ Telegram: '+telegramContact,
    '🆔 User ID: '+visitor.id,
    '🔐 Согласие на обработку данных: получено через форму',
    '🌐 Источник: DashByte Bot / проекты'
  ].join('\n');
  try{
    await telegram(env,'sendMessage',{chat_id:chatId,text,disable_web_page_preview:true});
    return leadJson(origin,200,{ok:true});
  }catch(err){
    console.error('Lead delivery failed without secrets:',String(err).replaceAll(env.TELEGRAM_BOT_TOKEN,'[REDACTED]'));
    return leadJson(origin,502,{ok:false,error:'delivery_failed'});
  }
}
export default {
  async fetch(request,env) {
    const url=new URL(request.url);
    if (request.method==='GET' && (url.pathname==='/' || url.pathname==='/health')) {
      return new Response('DashByte Telegram bot: OK',{status:200});
    }
    if(url.pathname==='/api/lead')return handleLead(request,env);
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
