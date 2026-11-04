import assert from 'node:assert/strict';
import test from 'node:test';
import bot from './worker.js';

const env={TELEGRAM_BOT_TOKEN:'fake-token',TELEGRAM_WEBHOOK_SECRET:'test-telegram-secret'};

test('healthy worker endpoint',async()=>{
  const r=await bot.fetch(new Request('https://example.workers.dev/health'),env);
  assert.equal(r.status,200);
});

test('rejects unauthenticated Telegram webhook',async()=>{
  const r=await bot.fetch(new Request('https://example.workers.dev/webhook',{method:'POST',body:'{}'}),env);
  assert.equal(r.status,401);
});

test('/start responds with welcome and an inline Mini App launch button',async()=>{
  const realFetch=globalThis.fetch;
  const requests=[];
  globalThis.fetch=async(url,opts)=>{
    requests.push({url:String(url),payload:JSON.parse(opts.body)});
    return new Response(JSON.stringify({ok:true,result:{message_id:1}}),{status:200,headers:{'content-type':'application/json'}});
  };
  try {
    const update={update_id:123,message:{message_id:456,text:'/start',chat:{id:42,type:'private'}}};
    const r=await bot.fetch(new Request('https://example.workers.dev/webhook',{
      method:'POST',
      headers:{'X-Telegram-Bot-Api-Secret-Token':env.TELEGRAM_WEBHOOK_SECRET,'content-type':'application/json'},
      body:JSON.stringify(update)
    }),env);
    assert.equal(r.status,200);
    assert.equal(requests.length,1);
    const payload=requests[0].payload;
    assert.match(payload.text,/DashByte/);
    assert.match(payload.text,/Арсенал/);
    assert.equal(payload.chat_id,42);
    assert.equal(payload.reply_markup.inline_keyboard[0][0].web_app.url,'https://maxteilor55-sudo.github.io/dashbyte-studio/');
    assert.equal(payload.reply_markup.inline_keyboard[1][0].url,'https://t.me/Reelog');
  }finally{
    globalThis.fetch=realFetch;
  }
});


test('lead endpoint rejects arbitrary websites and unsigned Telegram clients',async()=>{
 const url='https://example.workers.dev/api/lead';
 const payload={name:'Олег',company:'Пример',service:'Создание сайта',contact:'@sample',message:'Нужен сайт',privacy:true,website:'',initData:'fake'};
 const bad=await bot.fetch(new Request(url,{method:'POST',headers:{Origin:'https://evil.test','content-type':'application/json'},body:JSON.stringify(payload)}),
 {...env,TELEGRAM_OWNER_CHAT_ID:'12345678'});
 assert.equal(bad.status,403);
 const missing=await bot.fetch(new Request(url,{method:'POST',headers:{Origin:'https://maxteilor55-sudo.github.io','content-type':'application/json'},body:JSON.stringify(payload)}),
 {...env,TELEGRAM_OWNER_CHAT_ID:'12345678'});
 assert.equal(missing.status,401);
 const preflight=await bot.fetch(new Request(url,{method:'OPTIONS',headers:{Origin:'https://maxteilor55-sudo.github.io'}}),env);
 assert.equal(preflight.status,204);
 assert.equal(preflight.headers.get('Access-Control-Allow-Origin'),'https://maxteilor55-sudo.github.io');
});
test('valid Telegram Mini App request reaches ONLY private owner chat after signed verification',async()=>{
 const {createHmac}=await import('node:crypto');
 const now=Math.floor(Date.now()/1000);
 const params=new URLSearchParams();
 params.set('auth_date',String(now));
 params.set('user',JSON.stringify({id:99887,first_name:'Павел',username:'testbuyer'}));
 const plain=[...params.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>k+'='+v).join('\n');
 const secret=createHmac('sha256','WebAppData').update(env.TELEGRAM_BOT_TOKEN).digest();
 params.set('hash',createHmac('sha256',secret).update(plain).digest('hex'));
 const lead={name:'Павел',company:'Тест',service:'Создание сайта',contact:'@testbuyer',message:'Нужен лендинг',privacy:true,website:'',initData:params.toString()};
 const real=globalThis.fetch;const deliveries=[];
 globalThis.fetch=async(url,opts)=>{
   deliveries.push({url:String(url),payload:JSON.parse(opts.body)});
   return new Response(JSON.stringify({ok:true,result:{message_id:77}}),{status:200,headers:{'content-type':'application/json'}});
 };
 try{
   const res=await bot.fetch(new Request('https://example.workers.dev/api/lead',{method:'POST',headers:{Origin:'https://maxteilor55-sudo.github.io','content-type':'application/json'},body:JSON.stringify(lead)}),
   {...env,TELEGRAM_OWNER_CHAT_ID:'123456789'});
   assert.equal(res.status,200);
   assert.equal((await res.json()).ok,true);
   assert.equal(deliveries.length,1);
   assert.equal(deliveries[0].payload.chat_id,'123456789');
   assert.match(deliveries[0].payload.text,/Нужен лендинг/);
   assert.match(deliveries[0].payload.text,/@testbuyer/);
 }finally{globalThis.fetch=real}
});
test('/myid replies with private chat identifier',async()=>{
 const real=globalThis.fetch;const sent=[];
 globalThis.fetch=async(url,opts)=>{
   sent.push(JSON.parse(opts.body));
   return new Response(JSON.stringify({ok:true,result:{message_id:3}}),{status:200});
 };
 try{
   const update={message:{chat:{id:765432,type:'private'},text:'/myid'}};
   const res=await bot.fetch(new Request('https://example.workers.dev/webhook',{method:'POST',headers:{'content-type':'application/json','X-Telegram-Bot-Api-Secret-Token':env.TELEGRAM_WEBHOOK_SECRET},body:JSON.stringify(update)}),env);
   assert.equal(res.status,200);
   assert.match(sent[0].text,/765432/);
 }finally{globalThis.fetch=real}
});
