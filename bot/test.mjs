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


test('modern Telegram initData with signature passes HMAC, and modified signature is rejected',async()=>{
 const {createHmac}=await import('node:crypto');
 const now=Math.floor(Date.now()/1000);
 const params=new URLSearchParams();
 params.set('auth_date',String(now));
 params.set('user',JSON.stringify({id:998877,first_name:'Тест',username:'testbuyer'}));
 params.set('signature','telegram-third-party-signature-example');
 const dataCheckString=[...params.entries()]
   .sort(([a],[b])=>a.localeCompare(b))
   .map(([key,value])=>key+'='+value).join('\n');
 const derivedKey=createHmac('sha256','WebAppData').update(env.TELEGRAM_BOT_TOKEN).digest();
 params.set('hash',createHmac('sha256',derivedKey).update(dataCheckString).digest('hex'));
 const body={name:'Тест',company:'Мастерская',service:'Создание сайта',
   contact:'@testbuyer',message:'Выбранные услуги (2): Создание сайта, Логотип',
   privacy:true,website:'',initData:params.toString()};
 const url='https://example.workers.dev/api/lead';
 const headers={Origin:'https://maxteilor55-sudo.github.io','content-type':'application/json'};
 const envWithOwner={...env,TELEGRAM_OWNER_CHAT_ID:'123456789'};
 const originalFetch=globalThis.fetch;let count=0;
 globalThis.fetch=async(url,options)=>{
   count++;
   const payload=JSON.parse(options.body);
   assert.equal(payload.chat_id,'123456789');
   assert.match(payload.text,/Создание сайта, Логотип/);
   return new Response(JSON.stringify({ok:true,result:{message_id:5}}),{status:200,headers:{'content-type':'application/json'}});
 };
 try{
   const good=await bot.fetch(new Request(url,{method:'POST',headers,body:JSON.stringify(body)}),envWithOwner);
   assert.equal(good.status,200,'current Telegram initData must validate with signature field');
   assert.equal((await good.json()).ok,true);
   assert.equal(count,1);
   params.set('signature','changed-signature');
   const badBody={...body,initData:params.toString()};
   const bad=await bot.fetch(new Request(url,{method:'POST',headers,body:JSON.stringify(badBody)}),envWithOwner);
   assert.equal(bad.status,401,'modified signature must invalidate the HMAC');
   assert.equal(count,1,'invalid data must not send a Telegram message');
 }finally{globalThis.fetch=originalFetch}
});


test('Arsenal endpoint: rejects foreign origins and missing server configuration',async()=>{
  const url='https://example.workers.dev/api/arsenal-lead';
  const body=JSON.stringify({name:'Иван',phone:'+7 999 123-45-67',service:'Навес для автомобиля',details:'',privacy:true,turnstile:'token',started:Date.now()-8000});
  const bad=await bot.fetch(new Request(url,{method:'POST',headers:{Origin:'https://evil.test','Content-Type':'application/json'},body}),env);
  assert.equal(bad.status,403);
  const missing=await bot.fetch(new Request(url,{method:'POST',headers:{Origin:'https://navesy59.ru','Content-Type':'application/json'},body}),env);
  assert.equal(missing.status,503);
  const options=await bot.fetch(new Request(url,{method:'OPTIONS',headers:{Origin:'https://navesy59.ru'}}),env);
  assert.equal(options.status,204);
  assert.equal(options.headers.get('Access-Control-Allow-Origin'),'https://navesy59.ru');
});

test('Arsenal endpoint: delivers only to client chat after Turnstile hostname/action verification',async()=>{
  const real=globalThis.fetch;
  const urls=[],messages=[];
  const apiEnv={...env,ARSENAL_CHAT_ID:'123456789',ARSENAL_TURNSTILE_SECRET:'unit-test-secret'};
  globalThis.fetch=async(url,opts)=>{
    urls.push(String(url));
    if(String(url).includes('siteverify')){
      const body=new URLSearchParams(opts.body);
      assert.equal(body.get('secret'),'unit-test-secret');
      return new Response(JSON.stringify({success:true,hostname:'navesy59.ru',action:'arsenal_contact'}),{status:200});
    }
    messages.push(JSON.parse(opts.body));
    return new Response(JSON.stringify({ok:true,result:{message_id:101}}),{status:200});
  };
  try {
    const body={name:'Иван',phone:'+7 999 123-45-67',service:'Навес для автомобиля',
      details:'Навес 6×4',privacy:true,turnstile:'valid-token',started:Date.now()-10000,website:''};
    const result=await bot.fetch(new Request('https://example.workers.dev/api/arsenal-lead',{
      method:'POST',headers:{Origin:'https://navesy59.ru','Content-Type':'application/json'},
      body:JSON.stringify(body)}),apiEnv);
    assert.equal(result.status,200);
    assert.equal((await result.json()).ok,true);
    assert.equal(messages.length,1);
    assert.equal(messages[0].chat_id,'123456789');
    assert.match(messages[0].text,/АРСЕНАЛ/);
    assert.match(messages[0].text,/Навес 6×4/);
    assert.equal(urls.length,2);
  }finally {globalThis.fetch=real}
});

test('Arsenal endpoint: rejects invalid challenge without notifying client',async()=>{
  const real=globalThis.fetch;
  let delivered=0;
  const apiEnv={...env,ARSENAL_CHAT_ID:'123456789',ARSENAL_TURNSTILE_SECRET:'unit-test-secret'};
  globalThis.fetch=async(url,opts)=>{
    if(String(url).includes('siteverify'))
      return new Response(JSON.stringify({success:true,hostname:'evil.test',action:'arsenal_contact'}),{status:200});
    delivered++;
    return new Response(JSON.stringify({ok:true,result:{}}),{status:200});
  };
  try {
    const payload={name:'Иван',phone:'+7 999 123-45-67',service:'Гараж из сэндвич-панелей',
      details:'',privacy:true,turnstile:'bad-token',website:'',started:Date.now()-10000};
    const result=await bot.fetch(new Request('https://example.workers.dev/api/arsenal-lead',{
      method:'POST',headers:{Origin:'https://navesy59.ru','Content-Type':'application/json'},
      body:JSON.stringify(payload)}),apiEnv);
    assert.equal(result.status,403);
    assert.equal(delivered,0);
  }finally {globalThis.fetch=real}
});

test('Arsenal endpoint: cannot redirect messages to DashByte owner via client payload',async()=>{
  const real=globalThis.fetch;
  const sent=[];
  const apiEnv={...env,ARSENAL_CHAT_ID:'123456789',TELEGRAM_OWNER_CHAT_ID:'333444555',ARSENAL_TURNSTILE_SECRET:'unit-test-secret'};
  globalThis.fetch=async(url,opts)=>{
    if(String(url).includes('siteverify'))
      return new Response(JSON.stringify({success:true,hostname:'navesy59.ru',action:'arsenal_contact'}),{status:200});
    sent.push(JSON.parse(opts.body));
    return new Response(JSON.stringify({ok:true,result:{message_id:1}}),{status:200});
  };
  try{
    const data={name:'Тест',phone:'+7 999 111-22-33',service:'Другое',
      details:'Запрос',privacy:true,website:'',turnstile:'token',started:Date.now()-10000,
      chat_id:'333444555'};
    const res=await bot.fetch(new Request('https://example.workers.dev/api/arsenal-lead',{
      method:'POST',headers:{Origin:'https://navesy59.ru','Content-Type':'application/json'},
      body:JSON.stringify(data)}),apiEnv);
    assert.equal(res.status,200);
    assert.deepEqual(sent.map(x=>x.chat_id),['123456789']);
  }finally{globalThis.fetch=real}
});
