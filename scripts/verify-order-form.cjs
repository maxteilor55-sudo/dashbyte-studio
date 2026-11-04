const {chromium}=require('playwright');
(async()=>{
  const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
  const sizes=[{width:360,height:760},{width:390,height:844},{width:1440,height:900}];
  for(const size of sizes){
    const page=await browser.newPage({viewport:size,isMobile:size.width<600,hasTouch:size.width<600});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1:8765/')?r.continue():r.abort());
    await page.goto('http://127.0.0.1:8765/showroom.html',{waitUntil:'domcontentloaded',timeout:90000});
    await page.locator('#dbOpenBrief').waitFor();
    const first=await page.evaluate(()=>{
      const cards=[...document.querySelectorAll('.projects>a.project')];
      const button=document.getElementById('dbOpenBrief');
      const stage=document.querySelector('.studio-stage');
      return {cards:cards.length,
        buttonTop:Math.round(button.getBoundingClientRect().top),
        lastCardBottom:Math.round(cards[cards.length-1].getBoundingClientRect().bottom),
        stageTop:Math.round(stage.getBoundingClientRect().top),
        overflow:document.documentElement.scrollWidth-innerWidth,
        hasModal:!!document.getElementById('dbBriefModal'),
        scripts:!!document.querySelector('script[src*="db-brief-form.js"]')};
    });
    if(first.cards!==4||!first.hasModal||!first.scripts||first.overflow>4||first.buttonTop<first.lastCardBottom-5||first.stageTop<first.buttonTop)
      throw Error('CTA placement: '+JSON.stringify({size,first}));
    await page.locator('#dbOpenBrief').click();
    await page.locator('#dbBriefModal.is-open').waitFor({timeout:9000});
    // Measure after the 340ms entrance transform has settled.
    await page.waitForTimeout(440);
    const modal=await page.evaluate(()=>{
      const dlg=document.querySelector('.db-brief-modal'),r=dlg.getBoundingClientRect();
      return {top:r.top,bottom:r.bottom,windowHeight:innerHeight,width:r.width,
        scrollHeight:dlg.scrollHeight,clientHeight:dlg.clientHeight,
        hidden:document.getElementById('dbBriefModal').hidden,
        locked:document.body.classList.contains('db-brief-locked')};
    });
    if(modal.hidden||!modal.locked||modal.top<5||modal.bottom>size.height+3||modal.width>size.width+3)
      throw Error('Modal clipping: '+JSON.stringify({size,modal}));
    await page.locator('#dbBriefName').fill('Покупатель тест');
    await page.locator('#dbBriefCompany').fill('Тест ООО');
    await page.locator('#dbBriefContact').fill('@testbuyer');
    await page.locator('#dbBriefMessage').fill('Нужен сайт и логотип');
    await page.locator('.db-brief-service-picker label').filter({hasText:'Логотип'}).click();
    await page.locator('[name="privacy"]').check();
    await page.locator('.db-brief-submit[type="submit"]').click();
    const after=await page.evaluate(()=>({
      fallback:!document.getElementById('dbBriefAlternative').hidden,
      success:!document.getElementById('dbBriefSuccess').hidden,
      message:document.getElementById('dbBriefStatus').textContent,
      selected:document.querySelector('input[name="service"]:checked').value
    }));
    if(!after.fallback||after.success||after.selected!=='Логотип')
      throw Error('Unsafe success or missing manual fallback: '+JSON.stringify({size,after}));
    await page.locator('.db-brief-close').click();
    await page.waitForFunction(()=>document.getElementById('dbBriefModal').hidden,{timeout:3000});
    if(errors.length)throw Error('JS errors: '+errors.join(' ; '));
    console.log('ORDER_MODAL_PASS '+JSON.stringify({size,first,modal,after}));
    await page.close();
  }
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
