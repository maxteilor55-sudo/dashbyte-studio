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
