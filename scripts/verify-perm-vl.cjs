const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
 const base='http://127.0.0.1:8765/';
 for (const viewport of [{width:390,height:844,isMobile:true,hasTouch:true},{width:1440,height:900}]){
  const page=await browser.newPage({viewport:{width:viewport.width,height:viewport.height},isMobile:!!viewport.isMobile,hasTouch:!!viewport.hasTouch,acceptDownloads:true});
  const issues=[];page.on('pageerror',e=>issues.push(e.message));
  await page.route('**/*',r=>r.request().url().startsWith(base)?r.continue():r.abort());
  await page.goto(base+'perm-vl.html',{waitUntil:'domcontentloaded',timeout:90000});
  const content=await page.evaluate(()=>({title:document.title,heading:document.querySelector('h1')?.textContent,sections:['story','technology','roadmap','download'].every(id=>!!document.getElementById(id)),overflow:document.documentElement.scrollWidth-innerWidth}));
  if(!content.title.includes('PERM')||!content.heading.includes('PERM')||!content.sections||content.overflow>2)throw Error('Game page layout/content: '+JSON.stringify(content));
  await page.locator('[data-play]').first().click();
  const player=await page.locator('#player').evaluate(e=>({hidden:e.hidden,display:getComputedStyle(e).display,frame:e.querySelector('iframe')?.getAttribute('src')}));
  if(player.hidden||player.display==='none'||!player.frame.includes('perm-vl-alpha'))throw Error('Embedded browser game did not open: '+JSON.stringify(player));
  await page.locator('#playerClose').click();
  if(!(await page.locator('#player').evaluate(e=>e.hidden)))throw Error('Game overlay did not close');
  const home=await browser.newPage({viewport:{width:viewport.width,height:viewport.height},isMobile:!!viewport.isMobile,hasTouch:!!viewport.hasTouch});
  await home.route('**/*',r=>r.request().url().startsWith(base)?r.continue():r.abort());
  await home.goto(base,{waitUntil:'domcontentloaded',timeout:90000});
  const card=await home.evaluate(()=>{
    const x=document.querySelector('.project.perm-vl');
    const badges=[...document.querySelectorAll('.projects > a.project .project-progress')];
    return {exists:!!x,href:x?.getAttribute('href'),values:badges.map(b=>b.getAttribute('data-progress')),ring:x&&getComputedStyle(x.querySelector('.project-progress')).getPropertyValue('--progress-angle').trim()};
  });
  if(!card.exists||card.href!=='./perm-vl.html'||card.values.join(',')!=='95,56,10'||card.ring!=='36deg')throw Error('Three-card progress regression: '+JSON.stringify(card));
  if(issues.length)throw Error('Page JavaScript error: '+issues.join('; '));
  console.log('PERM_VL_SMOKE '+JSON.stringify({viewport,content,card,player}));
  await page.close();await home.close();
 }
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
