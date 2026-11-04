/* Official DashByte DB — WebGL 1 silhouette extrusion, no CDN or external assets.
   Uses the approved SVG as an alpha mask for front/back and builds matching walls.
   Works with mouse, touch and keyboard. Stops drawing when out of view. */
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
 let yaw=.25,pitch=-.13,targetYaw=.25,targetPitch=-.13,inertiaYaw=0,inertiaPitch=0,lastManual=0;

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
  'float perspective=2.8/(2.8-p.z);',
  'gl_Position=vec4(p.x*1.52*perspective/uRatio,p.y*1.52*perspective,-p.z*.23,1.0);',
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
  'float stripe=.09*sin(vUV.x*16.0+vUV.y*4.2);',
  'float light=clamp(.38+.48*key+.18*fill+stripe,0.0,1.0);',
  'vec3 metal=mix(vec3(.41,.38,.44),vec3(.99,.94,.98),light);',
  'metal+=vec3(.27,.20,.25)*glint;',
  'metal=mix(metal,vec3(.99,.38,.57),pow(1.0-abs(n.z),3.0)*.24);',
  'gl_FragColor=vec4(min(metal,vec3(1.0)),a);',
  '}else{',
  'float light=clamp(.35+.47*key+.19*fill,0.0,1.0);',
  'vec3 edge=mix(vec3(.21,.095,.16),vec3(.77,.44,.54),light);',
  'edge+=glint*vec3(.24,.12,.17);',
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
  const W=196,H=134;
  const mask=document.createElement('canvas');
  mask.width=W;mask.height=H;
  const ctx=mask.getContext('2d',{willReadFrequently:true});
  if(!ctx)throw Error('2D context unavailable');
  ctx.clearRect(0,0,W,H);ctx.drawImage(image,0,0,W,H);
  const pixels=ctx.getImageData(0,0,W,H).data;
  const opaque=(i,j)=>i>=0&&j>=0&&i<W&&j<H&&pixels[(j*W+i)*4+3]>92;
  const aspect=762/522,X=.80,Y=X/aspect,Z=.125;
  const posX=i=>((i/W)*2-1)*X, posY=j=>(1-(j/H)*2)*Y;
  const data=[];
  function put(x,y,z,nx,ny,nz,u,v){data.push(x,y,z,nx,ny,nz,u,v)}
  function tri(a,b,c,n){
   for(const p of [a,b,c])put(p[0],p[1],p[2],n[0],n[1],n[2],p[3]||0,p[4]||0);
  }
  // Full textured planes: the SVG alpha makes interior holes transparent.
  function plane(z,nz){
   const tl=[-X,Y,z,0,1],tr=[X,Y,z,1,1],br=[X,-Y,z,1,0],bl=[-X,-Y,z,0,0];
   tri(tl,bl,br,[0,0,nz]);tri(tl,br,tr,[0,0,nz]);
  }
  plane(Z,1);plane(-Z,-1);
  const wallStart=data.length/8;
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
  return {vertices:new Float32Array(data),start:wallStart,count:data.length/8-wallStart};
 }
 function setup(){
  gl=canvas.getContext('webgl',{alpha:true,antialias:true,powerPreference:'low-power',premultipliedAlpha:false});
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
  buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
  gl.bufferData(gl.ARRAY_BUFFER,mesh.vertices,gl.STATIC_DRAW);
  const stride=8*4;
  for(const [index,size,offset] of [[locPos,3,0],[locNorm,3,12],[locUV,2,24]]){
   if(index<0)continue;
   gl.enableVertexAttribArray(index);
   gl.vertexAttribPointer(index,size,gl.FLOAT,false,stride,offset);
  }
  // Higher-resolution alpha texture on visible front and back surfaces.
  const imgCanvas=document.createElement('canvas');imgCanvas.width=512;imgCanvas.height=350;
  const ctx=imgCanvas.getContext('2d');ctx.drawImage(source,0,0,512,350);
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
  gl.disable(gl.CULL_FACE);
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
   if(!reduced.matches&&t-lastManual>1250)targetYaw+=dt*.000071;
   targetYaw+=inertiaYaw*dt;targetPitch+=inertiaPitch*dt;
   targetPitch=Math.max(-.57,Math.min(.57,targetPitch));
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
  targetYaw+=dx*.014;targetPitch=Math.max(-.57,Math.min(.57,targetPitch+dy*.008));
  inertiaYaw=Math.max(-.012,Math.min(.012,dx*.00029));
  inertiaPitch=Math.max(-.005,Math.min(.005,dy*.00012));
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
  if(e.key==='Home'){targetYaw=.25;targetPitch=-.13}
  if(e.key==='ArrowLeft')targetYaw-=.2;
  if(e.key==='ArrowRight')targetYaw+=.2;
  if(e.key==='ArrowUp')targetPitch=Math.max(-.57,targetPitch-.12);
  if(e.key==='ArrowDown')targetPitch=Math.min(.57,targetPitch+.12);
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
 reduced.addEventListener?.('change',start);
 canvas.addEventListener('webglcontextlost',e=>{
  e.preventDefault();cancelAnimationFrame(raf);raf=0;gl=null;stage.dataset.renderer='fallback';
 },false);
 canvas.addEventListener('webglcontextrestored',()=>{if(source.naturalWidth)init()},false);
})();
