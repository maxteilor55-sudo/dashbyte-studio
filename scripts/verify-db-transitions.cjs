const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
 const base='http://127.0.0.1:8765/';
 const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const issues=[];page.on('pageerror',e=>issues.push(e.message));
 await page.route('**/*',r=>r.request().url().startsWith(base)?r.continue():r.abort());
 async function open(path){await page.goto(base+path,{waitUntil:'domcontentloaded',timeout:90000})}
 async function exit(selector,expected){
   await page.locator(selector).first().click();
   await page.waitForFunction(()=>document.documentElement.classList.contains('db-route-leaving'),{timeout:5000});
   const start=await page.evaluate(()=>({
      veil:!!document.getElementById('db-route-veil'),
      leaving:document.documentElement.classList.contains('db-route-leaving'),
      opacity:getComputedStyle(document.getElementById('db-route-veil')).opacity
   }));
   if(!start.veil||!start.leaving)throw Error('No transition after '+selector+': '+JSON.stringify(start));
   await page.waitForURL(u=>u.pathname.endsWith(expected),{timeout:20000});
   await page.locator('#db-route-veil').waitFor({state:'attached',timeout:20000});
   return start;
 }
 await open('');
 const initial=await page.evaluate(()=>({
  loaded:!!window.DashByteTransitions,
  cards:[...document.querySelectorAll('.projects > a.project')].length,
  note:document.querySelector('.project.arthur p')?.textContent
 }));
 if(!initial.loaded||initial.cards!==4||!initial.note.includes('PIN-кодом'))
  throw Error('Overview transition or privacy note missing: '+JSON.stringify(initial));
 // This card must open an existing PIN dialog without leaving the page.
 await page.locator('[data-open-pin="green-collection"]').click();
 const pin=await page.evaluate(()=>({modal:!document.getElementById('greenPinModal').hidden,leaving:document.documentElement.classList.contains('db-route-leaving')}));
 if(!pin.modal||pin.leaving)throw Error('Green Collection PIN was bypassed: '+JSON.stringify(pin));
 await page.locator('.gc-pin-close').click();
 const toAuto=await exit('.project.arthur','/arthur.html');
 const auto=await page.evaluate(()=>({note:document.querySelector('.note')?.textContent,title:document.title}));
 if(!auto.note.includes('PIN-кодом'))throw Error('Auto preview PIN option missing');
 const back=await exit('a.back','/'); 
 const perm=await exit('.project.perm-vl','/perm-vl.html');
 const returnHome=await exit('a[href="./index.html"]','/index.html');
 await page.goto(base+'privacy.html',{waitUntil:'domcontentloaded'});
 const privacyLoaded=await page.evaluate(()=>!!window.DashByteTransitions);
 if(!privacyLoaded)throw Error('Privacy page transition missing');
 // All actual pages reference shared assets precisely once.
 const filenames=['index.html','showroom.html','arsenal.html','dashbyte.html','green-collection.html','arthur.html','perm-vl.html','privacy.html','arsenal-privacy.html','showcase.html'];
 const missing=[];
 for(const name of filenames){
    const response=await page.request.get(base+name);
    const content=await response.text();
    if(!response.ok()||content.split('db-route-transition.js?v=1').length!==2||
       content.split('db-route-transition.css?v=1').length!==2)missing.push(name);
 }
 if(missing.length)throw Error('Missing route asset references: '+missing.join(','));
 if(issues.length)throw Error('JavaScript errors: '+issues.join(' | '));
 console.log('ROUTE_TRANSITIONS_PASS '+JSON.stringify({initial,pin,auto,
  navigation:['dashboard→autocervice','autocervice→dashboard','dashboard→PERM-VL','PERM-VL→dashboard'],
  checkedPages:filenames.length,exitSamples:[toAuto,back,perm,returnHome]}));
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
