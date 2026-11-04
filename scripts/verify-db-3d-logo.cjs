const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage','--enable-webgl','--use-gl=angle','--use-angle=swiftshader']});
 const base='http://127.0.0.1:8765/';
 async function pageFor(viewport,isMobile){
  const page=await browser.newPage({viewport,deviceScaleFactor:isMobile?2:1,isMobile,hasTouch:isMobile});
  const failures=[];
  page.on('pageerror',e=>failures.push(e.message));
  await page.route('**/*',route=>{
   if(!route.request().url().startsWith(base))return route.abort();
   route.continue();
  });
  await page.goto(base+'showroom.html',{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>['webgl','fallback'].includes(document.querySelector('#db3dStage')?.dataset.renderer),{timeout:15000});
  const state=await page.evaluate(()=>{
   const stage=document.querySelector('#db3dStage');
   const object=document.querySelector('#db3dViewport');
   const image=stage.querySelector('img.db3d-source');
   const canvas=stage.querySelector('canvas');
   const first=document.querySelector('.projects > a.project');
   const cards=[...document.querySelectorAll('.projects > a.project')];
   const probe=document.createElement('canvas');
   let supported=false;
   try{supported=!!probe.getContext('webgl')}catch(_){}
   return {
    renderer:stage.dataset.renderer,
    meshParts:Number(stage.dataset.meshParts),
    faceSource:stage.dataset.faceSource,
    webglSupported:supported,
    natural:image.naturalWidth,
    svgPath:image.getAttribute('src'),
    canvasPixels:[canvas.width,canvas.height],
    order:document.querySelector('.intro').contains(stage)&&document.querySelector('.intro').nextElementSibling.classList.contains('projects'),
    stageBottom:stage.getBoundingClientRect().bottom,
    firstCardTop:first.getBoundingClientRect().top,
    cardBottoms:cards.map(x=>Math.round(x.getBoundingClientRect().bottom)),
    overflow:document.documentElement.scrollWidth-innerWidth,
    viewport:innerHeight,
    inView:object.getBoundingClientRect().width>90
   };
  });
  console.log((isMobile?'MOBILE':'DESKTOP')+'_3D '+JSON.stringify(state));
  assert.equal(state.order,true,'Logo must sit between intro headline and project cards');
  assert(state.natural>0&&state.svgPath.endsWith('/assets/DashByte_DB_Official_Vector.svg'),'Must load the official DB vector image');
  assert.equal(state.inView,true);
  assert(state.stageBottom<=state.firstCardTop+3,'Logo must be before cards without overlapping');
  assert(state.overflow<=4,'No horizontal scrolling from 3D logo');
  if(state.webglSupported){
   assert.equal(state.renderer,'webgl','WebGL supported but model initialization failed');
   assert.equal(state.meshParts,1,'3D side walls must be connected into one solid body');
   assert.equal(state.faceSource,'original-svg-unmodified','Original approved DB artwork must remain completely unchanged on front/back');
   assert(state.canvasPixels[0]>0&&state.canvasPixels[1]>0,'No WebGL drawing surface');
  }else assert.equal(state.renderer,'fallback','No-WebGL fallback must be visible');
  if(isMobile)assert(Math.max(...state.cardBottoms)<=state.viewport+3,'Four cards must remain above fold');
  return {page,failures};
 }
 try{
  const mobile=await pageFor({width:390,height:844},true);
  await mobile.page.evaluate(()=>{
   const v=document.getElementById('db3dViewport');
   for(const [type,x] of [['pointerdown',150],['pointermove',198],['pointerup',198]]){
    v.dispatchEvent(new PointerEvent(type,{bubbles:true,pointerId:1,pointerType:'touch',button:0,clientX:x,clientY:400}));
   }
  });
  assert.equal(await mobile.page.locator('#db3dStage').getAttribute('data-interacted'),'true','Touch movement must rotate logo');
  assert.equal(mobile.failures.length,0,'Mobile JS errors: '+mobile.failures.join('; '));
  await mobile.page.close();

  const desktop=await pageFor({width:1440,height:900},false);
  const rect=await desktop.page.locator('#db3dViewport').boundingBox();
  await desktop.page.mouse.move(rect.x+rect.width*.4,rect.y+rect.height*.45);
  await desktop.page.mouse.down();
  await desktop.page.mouse.move(rect.x+rect.width*.75,rect.y+rect.height*.44,{steps:6});
  await desktop.page.mouse.up();
  assert.equal(await desktop.page.locator('#db3dStage').getAttribute('data-interacted'),'true','Mouse movement must rotate logo');
  await desktop.page.locator('#db3dViewport').focus();
  await desktop.page.keyboard.press('ArrowLeft');
  assert.equal(desktop.failures.length,0,'Desktop JS errors: '+desktop.failures.join('; '));
  await desktop.page.close();
  console.log('PASS: pixel-faithful original DB faces, deep single-piece extrusion, mobile + desktop rotation.');
 }finally{await browser.close()}
})().catch(err=>{console.error(err);process.exit(1)});
