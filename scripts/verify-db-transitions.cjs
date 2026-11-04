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
   await page.waitForTimeout(80);
   const visual=await page.evaluate(()=>({
     opacity:Number(getComputedStyle(document.getElementById('db-route-veil')).opacity),
     blur:getComputedStyle(document.getElementById('db-route-veil')).backdropFilter
   }));
   if(visual.opacity<.10||!visual.blur.includes('blur(5px)'))
     throw Error('Blur is not visually active after '+selector+': '+JSON.stringify(visual));
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
 const returnHome=await exit('#db-projects-shortcut','/index.html');
 await open('arsenal.html');
 const arsenalNav=await page.evaluate(()=>{
   const button=document.getElementById('db-projects-shortcut');
   const header=document.querySelector('header.site-header');
   const rect=button?.getBoundingClientRect(),head=header?.getBoundingClientRect();
   return {button:!!button,href:button?.getAttribute('href'),separate:!!button&&!button.closest('header,nav,#mobile-menu,.mobile-menu'),
      belowHeader:!!rect&&!!head&&rect.top>=head.bottom-3,
      visible:!!rect&&rect.width>90&&getComputedStyle(button).display!=='none',
      oldMenu:!!document.querySelector('#db-arsenal-bot-mobile-return:not([aria-hidden="true"])')};
 });
 if(!arsenalNav.button||!arsenalNav.separate||!arsenalNav.belowHeader||!arsenalNav.visible||arsenalNav.oldMenu)
   throw Error('Arsenal separate project-return missing or still inside menu: '+JSON.stringify(arsenalNav));
 const toggle=await page.evaluate(()=>{
   const all=[...document.querySelectorAll('button')];
   const btn=all.find(b=>/menu|меню|гамбургер|hamburger/i.test([b.id,b.className,b.getAttribute('aria-label'),b.getAttribute('aria-controls')].join(' ')) && getComputedStyle(b).display!=='none');
   if(btn)btn.click();
   return !!btn;
 });
 if(!toggle||await page.locator('#db-projects-shortcut').count()!==1)
   throw Error('Arsenal menu toggling removed independent shortcut');
 await exit('#db-projects-shortcut','/index.html');
 // The Green Collection page is intentionally PIN-gated. Simulate a valid
 // authorized dashboard session before checking its internal menu.
 await page.evaluate(()=>sessionStorage.setItem('db_gc_authorized_at',String(Date.now())));
 await open('green-collection.html');
 const greenBack=await page.evaluate(()=>({
   authorized:document.documentElement.classList.contains('gc-authorized'),
   button:!!document.getElementById('db-projects-shortcut'),
   separate:!document.getElementById('db-projects-shortcut')?.closest('nav,header'),
   oldMenuVisible:[...document.querySelectorAll('.gc-projects-link')].some(el=>getComputedStyle(el).display!=='none')
 }));
 if(!greenBack.authorized||!greenBack.button||!greenBack.separate||greenBack.oldMenuVisible)
   throw Error('Green Collection standalone project-return missing: '+JSON.stringify(greenBack));
 await open('dashbyte.html');
 const studioBack=await page.evaluate(()=>({
   shortcut:!!document.getElementById('db-projects-shortcut'),
   separate:!document.getElementById('db-projects-shortcut')?.closest('nav,header,aside'),
   oldVisible:!!document.getElementById('db-chooser-return')&&getComputedStyle(document.getElementById('db-chooser-return')).display!=='none'
 }));
 if(!studioBack.shortcut||!studioBack.separate||studioBack.oldVisible)
   throw Error('DashByte studio independent return missing: '+JSON.stringify(studioBack));
 await open('privacy.html');
 const privacyLoaded=await page.evaluate(()=>!!window.DashByteTransitions);
 if(!privacyLoaded)throw Error('Privacy page transition missing');
 // All actual pages reference shared assets precisely once.
 const filenames=['index.html','showroom.html','arsenal.html','dashbyte.html','green-collection.html','arthur.html','perm-vl.html','privacy.html','arsenal-privacy.html','showcase.html'];
 const missing=[];
 for(const name of filenames){
    const response=await page.request.get(base+name);
    const content=await response.text();
    if(!response.ok()||(content.match(/db-route-transition\.js\?v=\d+/g)||[]).length!==1||
       (content.match(/db-route-transition\.css\?v=\d+/g)||[]).length!==1)missing.push(name);
 }
 if(missing.length)throw Error('Missing route asset references: '+missing.join(','));
 if(issues.length)throw Error('JavaScript errors: '+issues.join(' | '));
 console.log('ROUTE_TRANSITIONS_PASS '+JSON.stringify({initial,pin,auto,
  navigation:['dashboard→autocervice','autocervice→dashboard','dashboard→PERM-VL','PERM-VL→dashboard'],
  checkedPages:filenames.length,arsenalNav,greenBack,studioBack,exitSamples:[toAuto,back,perm,returnHome]}));
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
