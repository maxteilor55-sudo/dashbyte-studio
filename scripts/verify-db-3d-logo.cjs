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
  await page.goto(base+'showroom.html?db3dtest=1',{waitUntil:'domcontentloaded',timeout:60000});
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
    geometryVersion:stage.dataset.geometryVersion,
    meshFaces:Number(stage.dataset.meshFaces),
    material:stage.dataset.material,
    cameraMode:stage.dataset.cameraMode,
    projection:stage.dataset.projection,
    previewGlass:getComputedStyle(object).backdropFilter||getComputedStyle(object).webkitBackdropFilter,
    previewBorderWidth:getComputedStyle(object).borderTopWidth,
    stageBorderWidth:getComputedStyle(stage).borderTopWidth,
    logoHeight:Math.round(object.getBoundingClientRect().height),
    motion:stage.dataset.motion,
    glassCards:cards.map(card=>({name:card.classList[1],blur:getComputedStyle(card).backdropFilter||getComputedStyle(card).webkitBackdropFilter,border:getComputedStyle(card).borderColor})),
    rotation:stage.dataset.rotation,
    touchAction:getComputedStyle(object).touchAction,


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
   assert.equal(state.meshParts,3,'The official DB artwork consists of exactly three rigid vector pieces');
   assert.equal(state.faceSource,'original-vector-triangles','Front and reverse must use true SVG triangles, not raster alpha planes');
   assert.equal(state.geometryVersion,'authentic-vector-solid-v1','Must use the new exact vector solid');
   assert.equal(state.meshFaces,502,'Exact official DB silhouette should have 502 front triangles');
   assert.equal(state.material,'arsenal-liquid-glass-webgl-v1','Frosted liquid glass WebGL shader is required');
   assert.equal(state.cameraMode,'fixed-scale-no-auto-fit','Zooming/auto fit during rotation is forbidden');
   assert.equal(state.projection,'orthographic','Projection must never vary the model scale with rotation or depth');
   assert.equal(state.rotation,'two-axis-free','Full two-axis 3D rotation must be enabled');
   
   
   assert(state.canvasPixels[0]>0&&state.canvasPixels[1]>0,'No WebGL drawing surface');
   assert(state.logoHeight>=110,'3D logo needs the enlarged, unframed viewport');
  }else assert.equal(state.renderer,'fallback','No-WebGL fallback must be visible');
  assert.equal(state.glassCards.length,4,'All four projects must use frosted glass');
  for(const card of state.glassCards)assert(card.blur.includes('blur('),'Card must genuinely blur backdrop: '+card.name);
  assert.equal(state.previewBorderWidth,'0px','Unframed 3D logo must have no visible border');
  assert.equal(state.stageBorderWidth,'0px','Remove the wrapper shape around the text and logo');
  assert.equal(state.previewGlass,'none','3D logo must not sit inside a glass window');
  assert.equal(state.motion,'intro-spin-then-gentle-auto','Landing animation and gentle auto-orbit required');
  if(isMobile){
   assert(Math.max(...state.cardBottoms)<=state.viewport+3,'Four cards must remain above fold');
   assert.equal(state.touchAction,'none','Vertical touch gestures must reach the 3D model instead of scrolling the page');
  }
  return {page,failures};
 }
 async function checkVisualPoses(page){
  const shots=[['front',0,0],['angled',0.46,-0.15],['side',Math.PI/2,0],['back',Math.PI,0],['top',0,Math.PI/2],['bottom',0,-Math.PI/2],['diagonal',1.1,-.9]];
  for(const [name,yaw,pitch] of shots){
   const captured=await page.evaluate(([y,p])=>{
    if(!window.__db3dTestPose?.(y,p))return {ok:false};
    const canvas=document.querySelector('.db3d-canvas');
    const w=canvas.width,h=canvas.height;
    const scratch=document.createElement('canvas');scratch.width=w;scratch.height=h;
    const c=scratch.getContext('2d',{willReadFrequently:true});
    c.clearRect(0,0,w,h);c.drawImage(canvas,0,0);
    const rgba=c.getImageData(0,0,w,h).data;
    let count=0,minX=w,minY=h,maxX=-1,maxY=-1;
    for(let j=0;j<h;j++)for(let i=0;i<w;i++){
     if(rgba[(j*w+i)*4+3]<45)continue;
     count++;minX=Math.min(minX,i);minY=Math.min(minY,j);
     maxX=Math.max(maxX,i);maxY=Math.max(maxY,j);
    }
    const composite=document.createElement('canvas');composite.width=240;composite.height=150;
    const ctx=composite.getContext('2d');
    ctx.fillStyle='#20131f';ctx.fillRect(0,0,240,150);
    ctx.drawImage(canvas,0,0,240,150);
    return {ok:true,bounds:[minX,minY,maxX,maxY],count,w,h,preview:composite.toDataURL('image/png').split(',')[1]};
   },[yaw,pitch]);
   assert(captured.ok,'Missing visual test renderer control');
   assert(captured.count>120,'Logo vanished at '+name+' rotation');
   const [x1,y1,x2,y2]=captured.bounds;
   assert(x1>=2&&y1>=2&&x2<captured.w-2&&y2<captured.h-2,
     'Logo clipped in '+name+' position: '+JSON.stringify(captured.bounds)+' / '+captured.w+'x'+captured.h);
   console.log('DB3D_VISUAL '+name+' '+JSON.stringify({bounds:captured.bounds,pixels:captured.count,size:[captured.w,captured.h]}));
   if(process.env.DB3D_SCREENSHOTS==='1')console.log('DB3D_PREVIEW_'+name+':'+captured.preview);
  }
 }
 try{
  const mobile=await pageFor({width:390,height:844},true);
  if(process.env.DB3D_SCREENSHOTS==='1'){
   const jpeg=await mobile.page.screenshot({type:'jpeg',quality:55,scale:'css'});
   console.log('DB_LIQUID_GLASS_MOBILE_JPEG:'+jpeg.toString('base64'));
  }
  if(await mobile.page.locator('#db3dStage').getAttribute('data-renderer')==='webgl')await checkVisualPoses(mobile.page);
  const beforeTouch=await mobile.page.evaluate(()=>{
   const s=document.querySelector('#db3dStage');
   return {yaw:Number(s.dataset.poseYaw),pitch:Number(s.dataset.posePitch)};
  });
  await mobile.page.evaluate(()=>{
   const v=document.getElementById('db3dViewport');
   for(const [type,x,y] of [['pointerdown',150,400],['pointermove',500,750],['pointerup',500,750]]){
    v.dispatchEvent(new PointerEvent(type,{bubbles:true,pointerId:1,pointerType:'touch',button:0,clientX:x,clientY:y}));
   }
  });
  await mobile.page.waitForTimeout(750);
  const afterTouch=await mobile.page.evaluate(()=>{
   const s=document.querySelector('#db3dStage');
   return {yaw:Number(s.dataset.poseYaw),pitch:Number(s.dataset.posePitch)};
  });
  assert.equal(await mobile.page.locator('#db3dStage').getAttribute('data-interacted'),'true','Touch movement must rotate logo');
  const rotatedYaw=Math.abs(afterTouch.yaw-beforeTouch.yaw);
  const rotatedPitch=Math.abs(afterTouch.pitch-beforeTouch.pitch);
  console.log('MOBILE_FREE_3D '+JSON.stringify({beforeTouch,afterTouch,rotatedYaw,rotatedPitch}));
  assert(Number.isFinite(rotatedYaw)&&rotatedYaw>3.1,'Touch horizontal orbit did not exceed 180 degrees');
  assert(Number.isFinite(rotatedPitch)&&rotatedPitch>3.1,'Touch vertical orbit did not exceed 180 degrees');
  assert.equal(mobile.failures.length,0,'Mobile JS errors: '+mobile.failures.join('; '));
  await mobile.page.close();

  const desktop=await pageFor({width:1440,height:900},false);
  const rect=await desktop.page.locator('#db3dViewport').boundingBox();
  await desktop.page.mouse.move(rect.x+rect.width*.4,rect.y+rect.height*.45);
  await desktop.page.mouse.down();
  await desktop.page.mouse.move(rect.x+rect.width*.75,rect.y+rect.height*.82,{steps:6});
  await desktop.page.mouse.up();
  assert.equal(await desktop.page.locator('#db3dStage').getAttribute('data-interacted'),'true','Mouse movement must rotate logo');
  await desktop.page.waitForTimeout(350);
  const desktopPose=await desktop.page.evaluate(()=>({yaw:Number(document.querySelector('#db3dStage').dataset.poseYaw),pitch:Number(document.querySelector('#db3dStage').dataset.posePitch)}));
  assert(Math.abs(desktopPose.yaw-.14)>.25&&Math.abs(desktopPose.pitch+.08)>.25,'Mouse drag must rotate BOTH axes');
  await desktop.page.locator('#db3dViewport').focus();
  await desktop.page.keyboard.press('ArrowLeft');
  assert.equal(desktop.failures.length,0,'Desktop JS errors: '+desktop.failures.join('; '));
  await desktop.page.close();
  console.log('PASS: original DB, fixed camera scale, liquid glass viewer and four blurred project cards, full mobile/desktop 3D rotation.');
 }finally{await browser.close()}
})().catch(err=>{console.error(err);process.exit(1)});
