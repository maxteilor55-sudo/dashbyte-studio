/* DashByte signature — preserve every pixel of the user's original PNG-traced
   APPROVED SVG on both faces. The sidewalls are thin, subtle and follow
   the actual contour instead of turning the mark into a thick white slab. */
(function(){
 'use strict';
 const stage=document.getElementById('db3dStage');
 if(!stage)return;
 const viewport=stage.querySelector('.db3d-viewport');
 const canvas=stage.querySelector('.db3d-canvas');
 const source=stage.querySelector('.db3d-source');
 const reduced=window.matchMedia('(prefers-reduced-motion:reduce)');
 let gl=null,program=null,buffer=null,texture=null,sideStart=0,sideCount=0;
 let uYaw,uPitch,uRatio,uMode,uTex,locPos,locNorm,locUV;
 let active=true,raf=0,lastFrame=0,dragging=false,lastX=0,lastY=0;
 let yaw=.14,pitch=-.08,targetYaw=.14,targetPitch=-.08,inertiaYaw=0,inertiaPitch=0,lastManual=0;

 const vertexSource=[
  'attribute vec3 aPosition;attribute vec3 aNormal;attribute vec2 aUV;',
  'uniform float uYaw;uniform float uPitch;uniform float uRatio;',
  'varying vec2 vUV;varying vec3 vNormal;',
  'void main(){',
  'float cy=cos(uYaw),sy=sin(uYaw),cx=cos(uPitch),sx=sin(uPitch);',
  'vec3 p=vec3(aPosition.x*cy+aPosition.z*sy,aPosition.y,-aPosition.x*sy+aPosition.z*cy);',
  'p=vec3(p.x,p.y*cx-p.z*sx,p.y*sx+p.z*cx);',
  'vec3 n=vec3(aNormal.x*cy+aNormal.z*sy,aNormal.y,-aNormal.x*sy+aNormal.z*cy);',
  'n=vec3(n.x,n.y*cx-n.z*sx,n.y*sx+n.z*cx);',
  'vNormal=normalize(n);vUV=aUV;',
  'float perspective=3.6/(3.6-p.z);',
  'gl_Position=vec4(p.x*1.26*perspective/uRatio,p.y*1.26*perspective,-p.z*.23,1.0);',
  '}'
 ].join('\n');
 const fragmentSource=[
  'precision mediump float;varying vec2 vUV;varying vec3 vNormal;',
  'uniform sampler2D uTex;uniform float uMode;',
  'void main(){',
  'vec3 n=normalize(vNormal);',
  'float key=max(dot(n,normalize(vec3(-.39,.78,.56))),0.0);',
  'float fill=max(dot(n,normalize(vec3(.74,-.1,.66))),0.0);',
  'float glint=pow(max(dot(n,normalize(vec3(.18,.58,.8))),0.0),18.0);',
  'if(uMode<.5){',
  'float a=texture2D(uTex,vUV).a;',
  'if(a<.07)discard;',
  'float stripe=.025*sin(vUV.x*25.0+vUV.y*2.5);',
  'float light=clamp(.26+.47*key+.21*fill+stripe,0.0,1.0);',
  'vec3 metal=mix(vec3(.31,.30,.35),vec3(.92,.88,.93),light);',
  'metal+=vec3(.21,.16,.21)*glint;',
  'metal=mix(metal,vec3(.99,.38,.57),pow(1.0-abs(n.z),3.0)*.24);',
  'gl_FragColor=vec4(min(metal,vec3(1.0)),a);',
  '}else{',
  'float light=clamp(.35+.47*key+.19*fill,0.0,1.0);',
  'vec3 edge=mix(vec3(.27,.23,.28),vec3(.72,.64,.70),light);',
  'edge+=glint*vec3(.19,.12,.14);',
  'gl_FragColor=vec4(min(edge,vec3(1.0)),1.0);',
  '}',
  '}'
 ].join('\n');

 function compile(type,code){
  const shader=gl.createShader(type);
  gl.shaderSource(shader,code);gl.compileShader(shader);
  if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(shader));
  return shader;
 }
 function resize(){
  if(!gl)return;
  const dpr=Math.min(window.devicePixelRatio||1,1.8);
  const w=Math.max(1,Math.round(viewport.clientWidth*dpr));
  const h=Math.max(1,Math.round(viewport.clientHeight*dpr));
  if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;gl.viewport(0,0,w,h)}
 }
 function makeGeometry(image){
  // Weld the thin decorative strokes of the official vector into ONE solid
  // extrusion. The previous implementation extruded every SVG slit separately,
  // producing dozens of floating ribs when the monogram was turned sideways.
  const W=384,H=264,N=W*H;
  const mask=document.createElement('canvas');
  mask.width=W;mask.height=H;
  const ctx=mask.getContext('2d',{willReadFrequently:true});
  if(!ctx)throw Error('2D context unavailable');
  ctx.clearRect(0,0,W,H);ctx.drawImage(image,0,0,W,H);
  const pixels=ctx.getImageData(0,0,W,H).data;
  const original=new Uint8Array(N);
  for(let k=0;k<N;k++)original[k]=pixels[k*4+3]>112?1:0;

  function morph(input,r,expand){
   const output=new Uint8Array(N);
   for(let y=0;y<H;y++)for(let x=0;x<W;x++){
    let value=expand?0:1;
    search:for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){
     if(dx*dx+dy*dy>r*r)continue;
     const xx=x+dx,yy=y+dy;
     if(xx<0||xx>=W||yy<0||yy>=H)continue;
     const occupied=input[yy*W+xx]===1;
     if(expand?occupied:!occupied){value=expand?1:0;break search}
    }
    output[y*W+x]=value;
   }
   return output;
  }
  // Rounded morphological closing seals hairline gaps without changing the
  // approved outer DB silhouette into a rectangular plaque.
  const solid=morph(morph(original,2,true),2,false);
  const queue=new Int32Array(N);
  const eachNeighbor=(k,visit)=>{
   const x=k%W,y=(k/W)|0;
   if(x>0)visit(k-1);if(x<W-1)visit(k+1);
   if(y>0)visit(k-W);if(y<H-1)visit(k+W);
  };

  // Clear tiny internal pinholes. Retain the large, intentional letter counters.
  const seen=new Uint8Array(N);
  for(let seed=0;seed<N;seed++){
   if(solid[seed]||seen[seed])continue;
   let head=0,tail=1,touchesEdge=false;
   queue[0]=seed;seen[seed]=1;
   while(head<tail){
    const k=queue[head++],x=k%W,y=(k/W)|0;
    if(!x||!y||x===W-1||y===H-1)touchesEdge=true;
    eachNeighbor(k,n=>{if(!solid[n]&&!seen[n]){seen[n]=1;queue[tail++]=n}});
   }
   if(!touchesEdge&&tail<260)for(let q=0;q<tail;q++)solid[queue[q]]=1;
  }

  function components(){
   const marked=new Uint8Array(N),groups=[];
   for(let seed=0;seed<N;seed++){
    if(!solid[seed]||marked[seed])continue;
    let head=0,tail=1;queue[0]=seed;marked[seed]=1;
    while(head<tail){
     const k=queue[head++];
     eachNeighbor(k,n=>{if(solid[n]&&!marked[n]){marked[n]=1;queue[tail++]=n}});
    }
    groups.push(Array.from(queue.subarray(0,tail)));
   }
   return groups.sort((a,b)=>b.length-a.length);
  }
  // On unusual browsers/resolutions, still guarantee a single connected body:
  // weld any residual islands to the main metal mass by the shortest bridge.
  const islands=components();
  if(!islands.length)throw Error('Empty DB silhouette');
  if(islands.length>1){
   const joined=new Uint8Array(N);
   for(const k of islands[0])joined[k]=1;
   for(let groupIndex=1;groupIndex<islands.length;groupIndex++){
    const group=islands[groupIndex],visited=new Uint8Array(N);
    const previous=new Int32Array(N);previous.fill(-1);
    let head=0,tail=0,hit=-1;
    for(const k of group){queue[tail++]=k;visited[k]=1}
    while(head<tail&&hit<0){
     const k=queue[head++];
     if(joined[k]){hit=k;break}
     eachNeighbor(k,n=>{if(!visited[n]){visited[n]=1;previous[n]=k;queue[tail++]=n}});
    }
    if(hit<0)throw Error('Cannot weld DB geometry');
    for(let k=hit;k>=0;k=previous[k]){
     const x=k%W,y=(k/W)|0;
     for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
      const xx=x+dx,yy=y+dy;
      if(xx>=0&&xx<W&&yy>=0&&yy<H)solid[yy*W+xx]=joined[yy*W+xx]=1;
     }
    }
    for(const k of group)joined[k]=1;
   }
  }

  // CRITICAL: Side walls can have a welded silhouette, but the visible faces
  // must be the exact, untouched approved artwork. NEVER draw the closed mask
  // onto the front/back texture or the thin branded cuts disappear.
  const textureCanvas=document.createElement('canvas');
  textureCanvas.width=1024;textureCanvas.height=702;
  const tc=textureCanvas.getContext('2d');
  if(!tc)throw Error('Texture canvas unavailable');
  tc.imageSmoothingEnabled=true;
  tc.clearRect(0,0,1024,702);
  tc.drawImage(image,0,0,1024,702);

  const aspect=762/522,X=.80,Y=X/aspect,Z=.115; // precise front outline, modest solid-metal depth
  const posX=i=>((i/W)*2-1)*X,posY=j=>(1-(j/H)*2)*Y;
  const data=[];
  function put(x,y,z,nx,ny,nz,u,v){data.push(x,y,z,nx,ny,nz,u,v)}
  function tri(a,b,c,n){
   for(const p of [a,b,c])put(p[0],p[1],p[2],n[0],n[1],n[2],p[3]||0,p[4]||0);
  }
  function plane(z,front){
   const tl=[-X,Y,z,front?0:1,1],tr=[X,Y,z,front?1:0,1],br=[X,-Y,z,front?1:0,0],bl=[-X,-Y,z,front?0:1,0];
   if(front){tri(tl,bl,br,[0,0,1]);tri(tl,br,tr,[0,0,1])}
   else{tri(tl,br,bl,[0,0,-1]);tri(tl,tr,br,[0,0,-1])}
  }
  plane(Z,true);plane(-Z,false);
  const wallStart=data.length/8;
  const opaque=(i,j)=>i>=0&&j>=0&&i<W&&j<H&&solid[j*W+i]===1;
  function wall(i1,j1,i2,j2,nx,ny){
    const a=[posX(i1),posY(j1),Z],b=[posX(i2),posY(j2),Z];
    const c=[posX(i2),posY(j2),-Z],d=[posX(i1),posY(j1),-Z];
    tri(a,b,c,[nx,ny,0]);tri(a,c,d,[nx,ny,0]);
  }
  for(let j=0;j<H;j++)for(let i=0;i<W;i++){
   if(!opaque(i,j))continue;
   if(!opaque(i,j-1))wall(i,j,i+1,j,0,1);
   if(!opaque(i,j+1))wall(i+1,j+1,i,j+1,0,-1);
   if(!opaque(i-1,j))wall(i,j+1,i,j,-1,0);
   if(!opaque(i+1,j))wall(i+1,j,i+1,j+1,1,0);
  }
  return {vertices:new Float32Array(data),start:wallStart,count:data.length/8-wallStart,
          textureCanvas: textureCanvas,parts:components().length};
 }
 function setup(){
  gl=canvas.getContext('webgl',{alpha:true,antialias:true,powerPreference:'low-power',premultipliedAlpha:false,preserveDrawingBuffer:true});
  if(!gl)throw Error('WebGL is not supported');
  const vs=compile(gl.VERTEX_SHADER,vertexSource);
  const fs=compile(gl.FRAGMENT_SHADER,fragmentSource);
  program=gl.createProgram();gl.attachShader(program,vs);gl.attachShader(program,fs);
  gl.linkProgram(program);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
  gl.deleteShader(vs);gl.deleteShader(fs);
  gl.useProgram(program);
  locPos=gl.getAttribLocation(program,'aPosition');
  locNorm=gl.getAttribLocation(program,'aNormal');
  locUV=gl.getAttribLocation(program,'aUV');
  uYaw=gl.getUniformLocation(program,'uYaw');
  uPitch=gl.getUniformLocation(program,'uPitch');
  uRatio=gl.getUniformLocation(program,'uRatio');
  uMode=gl.getUniformLocation(program,'uMode');
  uTex=gl.getUniformLocation(program,'uTex');
  const mesh=makeGeometry(source);
  sideStart=mesh.start;sideCount=mesh.count;
  stage.dataset.meshParts=String(mesh.parts);
  stage.dataset.faceSource='original-svg-unmodified';
  stage.dataset.geometryVersion='contour-v4-slim';
  buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
  gl.bufferData(gl.ARRAY_BUFFER,mesh.vertices,gl.STATIC_DRAW);
  const stride=8*4;
  for(const [index,size,offset] of [[locPos,3,0],[locNorm,3,12],[locUV,2,24]]){
   if(index<0)continue;
   gl.enableVertexAttribArray(index);
   gl.vertexAttribPointer(index,size,gl.FLOAT,false,stride,offset);
  }
  // Higher-resolution alpha texture on visible front and back surfaces.
  const imgCanvas=mesh.textureCanvas;
  texture=gl.createTexture();gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,imgCanvas);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  gl.uniform1i(uTex,0);
  gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);
  gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
  gl.enable(gl.CULL_FACE);gl.cullFace(gl.BACK);
  resize();draw();
  stage.dataset.renderer='webgl';
  start();
 }
 function draw(){
  if(!gl)return;
  resize();gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  gl.useProgram(program);
  gl.uniform1f(uYaw,yaw);gl.uniform1f(uPitch,pitch);
  gl.uniform1f(uRatio,Math.max(.7,canvas.width/canvas.height));
  gl.uniform1f(uMode,1);gl.drawArrays(gl.TRIANGLES,sideStart,sideCount);
  gl.uniform1f(uMode,0);gl.drawArrays(gl.TRIANGLES,0,12);
 }
 function start(){if(!gl||!active||document.hidden||raf)return;lastFrame=0;raf=requestAnimationFrame(frame)}
 function frame(t){
  raf=0;if(!active||document.hidden)return;
  const dt=Math.min(48,Math.max(0,lastFrame?t-lastFrame:16));lastFrame=t;
  if(!dragging){
   if(!reduced.matches&&t-lastManual>1250){
    // Gentle showroom motion stays almost face-on so the original DB mark
    // remains legible instead of turning into a side-on abstract sculpture.
    const desired=.14+Math.sin(t*.00030)*.16;
    const nearest=desired+Math.round((targetYaw-desired)/(Math.PI*2))*Math.PI*2;
    targetYaw+=(nearest-targetYaw)*Math.min(.019,dt*.00045);
   }
   targetYaw+=inertiaYaw*dt;targetPitch+=inertiaPitch*dt;
   targetPitch=Math.max(-.38,Math.min(.38,targetPitch));
   const drag=Math.pow(.88,dt/16);
   inertiaYaw*=drag;inertiaPitch*=drag;
  }
  const e=1-Math.exp(-dt/104);
  yaw+=(targetYaw-yaw)*e;pitch+=(targetPitch-pitch)*e;
  draw();
  if(!reduced.matches||dragging||Math.abs(targetYaw-yaw)>.001||Math.abs(targetPitch-pitch)>.001||Math.abs(inertiaYaw)>.00001)
   raf=requestAnimationFrame(frame);
 }
 function init(){
  if(!source.naturalWidth){stage.dataset.renderer='fallback';return}
  try{setup()}catch(err){stage.dataset.renderer='fallback';gl=null}
 }
 if(source.complete)init();else{
  source.addEventListener('load',init,{once:true});
  source.addEventListener('error',()=>{stage.dataset.renderer='fallback'},{once:true});
 }
 viewport.addEventListener('pointerdown',e=>{
  if(e.button!==0)return;
  dragging=true;lastX=e.clientX;lastY=e.clientY;
  inertiaYaw=0;inertiaPitch=0;lastManual=performance.now();
  try{viewport.setPointerCapture(e.pointerId)}catch(_){}
  viewport.focus({preventScroll:true});start();
 });
 viewport.addEventListener('pointermove',e=>{
  if(!dragging)return;
  const dx=e.clientX-lastX,dy=e.clientY-lastY;
  lastX=e.clientX;lastY=e.clientY;
  targetYaw+=dx*.009;targetPitch=Math.max(-.38,Math.min(.38,targetPitch+dy*.005));
  inertiaYaw=Math.max(-.008,Math.min(.008,dx*.00018));
  inertiaPitch=Math.max(-.003,Math.min(.003,dy*.00007));
  lastManual=performance.now();stage.dataset.interacted='true';
  start();
 });
 const release=()=>{dragging=false;lastManual=performance.now();start()};
 viewport.addEventListener('pointerup',release);
 viewport.addEventListener('pointercancel',release);
 viewport.addEventListener('lostpointercapture',release);
 viewport.addEventListener('keydown',e=>{
  if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home'].includes(e.key))return;
  e.preventDefault();stage.dataset.interacted='true';
  if(e.key==='Home'){targetYaw=.14;targetPitch=-.08}
  if(e.key==='ArrowLeft')targetYaw-=.2;
  if(e.key==='ArrowRight')targetYaw+=.2;
  if(e.key==='ArrowUp')targetPitch=Math.max(-.38,targetPitch-.12);
  if(e.key==='ArrowDown')targetPitch=Math.min(.38,targetPitch+.12);
  lastManual=performance.now();start();
 });
 if('IntersectionObserver' in window){
  const observer=new IntersectionObserver(entries=>{
   active=entries[0].isIntersecting;
   if(active)start();else{cancelAnimationFrame(raf);raf=0}
  },{threshold:.02});
  observer.observe(stage);
 }
 document.addEventListener('visibilitychange',()=>{
  if(document.hidden){cancelAnimationFrame(raf);raf=0}
  else start();
 });
 if('ResizeObserver' in window)new ResizeObserver(()=>{if(gl){resize();draw();start()}}).observe(viewport);
 else window.addEventListener('resize',()=>{if(gl){resize();draw();start()}},{passive:true});
 // Visual-regression-only pose setter: available exclusively with ?db3dtest=1.
 // Production visitor interaction and animation are otherwise untouched.
 if(new URLSearchParams(location.search).has('db3dtest')){
  window.__db3dTestPose=function(nextYaw,nextPitch){
   if(!gl||!Number.isFinite(nextYaw)||!Number.isFinite(nextPitch))return false;
   yaw=targetYaw=nextYaw;pitch=targetPitch=nextPitch;
   inertiaYaw=0;inertiaPitch=0;lastManual=performance.now();
   draw();return true;
  };
 }
 reduced.addEventListener?.('change',start);
 canvas.addEventListener('webglcontextlost',e=>{
  e.preventDefault();cancelAnimationFrame(raf);raf=0;gl=null;stage.dataset.renderer='fallback';
 },false);
 canvas.addEventListener('webglcontextrestored',()=>{if(source.naturalWidth)init()},false);
})();
