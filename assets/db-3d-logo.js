/* Official DashByte DB: real vector-extruded metal. Exact three SVG paths; true triangulated faces and smooth side polygons, no raster masking. */
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
  'varying vec3 vNormal;varying vec2 vUV;',
  'void main(){',
  'float cy=cos(uYaw),sy=sin(uYaw),cx=cos(uPitch),sx=sin(uPitch);',
  'vec3 p=vec3(aPosition.x*cy+aPosition.z*sy,aPosition.y,-aPosition.x*sy+aPosition.z*cy);',
  'p=vec3(p.x,p.y*cx-p.z*sx,p.y*sx+p.z*cx);',
  'vec3 n=vec3(aNormal.x*cy+aNormal.z*sy,aNormal.y,-aNormal.x*sy+aNormal.z*cy);',
  'n=vec3(n.x,n.y*cx-n.z*sx,n.y*sx+n.z*cx);',
  'vNormal=normalize(n);vUV=aUV;',
  'float perspective=3.8/(3.8-p.z);',
  'gl_Position=vec4(p.x*1.34*perspective/uRatio,p.y*1.34*perspective,-p.z*.29,1.0);',
  '}'
 ].join('\n');
 const fragmentSource=[
  'precision highp float;varying vec3 vNormal;varying vec2 vUV;',
  'void main(){',
  'vec3 n=normalize(vNormal);',
  'float key=max(dot(n,normalize(vec3(-.35,.73,.62))),0.0);',
  'float fill=max(dot(n,normalize(vec3(.87,.07,.48))),0.0);',
  'float spec=pow(max(dot(n,normalize(vec3(-.25,.61,.76))),0.0),30.0);',
  'float face=abs(n.z);',
  'float light=clamp(.33+.48*key+.24*fill,0.0,1.0);',
  'vec3 silver=mix(vec3(.36,.30,.36),vec3(.98,.91,.96),light);',
  'silver+=spec*vec3(.22,.17,.21);',
  'vec3 edge=mix(vec3(.25,.20,.27),vec3(.74,.58,.67),clamp(.27+.52*key+.17*fill,0.0,1.0));',
  'edge+=spec*vec3(.11,.10,.12);',
  'vec3 metal=mix(edge,silver,smoothstep(.3,.8,face));',
  'float brush=.008*sin(vUV.y*138.0+vUV.x*4.0);',
  'gl_FragColor=vec4(min(metal+vec3(brush),vec3(1.0)),1.0);',
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
 async function makeGeometry(){
  // The approved SVG has three real polygon paths: the detail bar, D and B.
  // Build EXACT vector triangles, not blurred PNG alpha or per-pixel strips.
  const response=await fetch(source.currentSrc||source.src,{cache:'force-cache'});
  if(!response.ok)throw Error('Cannot load the official SVG geometry');
  const xml=await response.text();
  const d=xml.match(/\sd="([^"]+)"/)?.[1];
  if(!d)throw Error('Official DB vector path missing');
  const groups=[...d.matchAll(/M\s*([^Z]+)Z/g)].map(m=>{
    return [...m[1].matchAll(/(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)/g)]
      .map(pair=>[Number(pair[1]),Number(pair[2])]);
  });
  if(groups.length!==3||groups.some(points=>points.length<10))throw Error('Official DB geometry has changed');
  function triangulate(coords){
    const p=coords.map(([x,y])=>[x,-y]);
    const orient=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
    const signed=p.reduce((sum,a,i)=>{const b=p[(i+1)%p.length];return sum+a[0]*b[1]-b[0]*a[1]},0);
    const ids=Array.from({length:p.length},(_,i)=>i);
    if(signed<0)ids.reverse();
    const output=[];
    while(ids.length>3){
      let cut=-1;
      for(let k=0;k<ids.length;k++){
        const a=ids[(k+ids.length-1)%ids.length],b=ids[k],c=ids[(k+1)%ids.length];
        if(orient(p[a],p[b],p[c])<=1e-5)continue;
        let blocked=false;
        for(const id of ids){
          if(id===a||id===b||id===c)continue;
          const q=p[id];
          if(orient(p[a],p[b],q)>=-1e-7&&orient(p[b],p[c],q)>=-1e-7&&orient(p[c],p[a],q)>=-1e-7){
            blocked=true;break;
          }
        }
        if(blocked)continue;
        cut=k;output.push(a,b,c);break;
      }
      if(cut<0)throw Error('Official DB path cannot be triangulated');
      ids.splice(cut,1);
    }
    output.push(...ids);
    return output;
  }
  const values=[],X=.8,Y=X*522/762,Z=.118;
  const point=(q,z)=>[2*X*(q[0]/762-.5),2*Y*(.5-q[1]/522),z];
  function put(p,n){values.push(p[0],p[1],p[2],n[0],n[1],n[2],p[0],p[1])}
  function triangle(a,b,c,n){put(a,n);put(b,n);put(c,n)}
  let faceTriangles=0;
  for(const coords of groups){
    const indices=triangulate(coords);
    faceTriangles+=indices.length/3;
    for(let i=0;i<indices.length;i+=3){
      const a=point(coords[indices[i]],Z),b=point(coords[indices[i+1]],Z),c=point(coords[indices[i+2]],Z);
      const cross=(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
      if(cross>0){
        triangle(a,b,c,[0,0,1]);
        triangle([a[0],a[1],-Z],[c[0],c[1],-Z],[b[0],b[1],-Z],[0,0,-1]);
      }else{
        triangle(a,c,b,[0,0,1]);
        triangle([a[0],a[1],-Z],[b[0],b[1],-Z],[c[0],c[1],-Z],[0,0,-1]);
      }
    }
    // True, continuous side polygons along each original vector segment.
    let ring=coords.map(q=>point(q,Z));
    const signed=ring.reduce((sum,a,i)=>{const b=ring[(i+1)%ring.length];return sum+a[0]*b[1]-b[0]*a[1]},0);
    if(signed<0)ring=ring.reverse();
    const normals=ring.map((p,i)=>{
      const a=ring[(i+ring.length-1)%ring.length],b=ring[(i+1)%ring.length];
      const dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy)||1;
      return [dy/length,-dx/length,0];
    });
    for(let i=0;i<ring.length;i++){
      const j=(i+1)%ring.length,A=ring[i],B=ring[j],nA=normals[i],nB=normals[j];
      const a=[A[0],A[1],Z],b=[B[0],B[1],Z];
      const a2=[A[0],A[1],-Z],b2=[B[0],B[1],-Z];
      put(a,nA);put(a2,nA);put(b2,nB);
      put(a,nA);put(b2,nB);put(b,nB);
    }
  }
  if(faceTriangles!==502)throw Error('DB vector triangulation must preserve all 502 faces');
  return {vertices:new Float32Array(values),pieces:groups.length,faces:faceTriangles};
 }
 async function setup(){
  const mesh=await makeGeometry();
  const next=canvas.getContext('webgl',{alpha:true,antialias:true,powerPreference:'low-power',
     premultipliedAlpha:false,preserveDrawingBuffer:true});
  if(!next)throw Error('WebGL is not supported');
  gl=next;
  const vs=compile(gl.VERTEX_SHADER,vertexSource);
  const fs=compile(gl.FRAGMENT_SHADER,fragmentSource);
  program=gl.createProgram();gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
  gl.deleteShader(vs);gl.deleteShader(fs);gl.useProgram(program);
  locPos=gl.getAttribLocation(program,'aPosition');
  locNorm=gl.getAttribLocation(program,'aNormal');
  locUV=gl.getAttribLocation(program,'aUV');
  uYaw=gl.getUniformLocation(program,'uYaw');
  uPitch=gl.getUniformLocation(program,'uPitch');
  uRatio=gl.getUniformLocation(program,'uRatio');
  buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
  gl.bufferData(gl.ARRAY_BUFFER,mesh.vertices,gl.STATIC_DRAW);
  for(const [index,size,offset] of [[locPos,3,0],[locNorm,3,12],[locUV,2,24]]){
    if(index<0)continue;
    gl.enableVertexAttribArray(index);
    gl.vertexAttribPointer(index,size,gl.FLOAT,false,32,offset);
  }
  sideCount=mesh.vertices.length/8;
  stage.dataset.meshParts=String(mesh.pieces);
  stage.dataset.meshFaces=String(mesh.faces);
  stage.dataset.faceSource='original-vector-triangles';
  stage.dataset.geometryVersion='authentic-vector-solid-v1';
  gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LESS);
  gl.enable(gl.CULL_FACE);gl.cullFace(gl.BACK);gl.disable(gl.BLEND);
  resize();draw();stage.dataset.renderer='webgl';start();
 }
 function draw(){
  if(!gl||!program)return;
  resize();gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  gl.useProgram(program);
  gl.uniform1f(uYaw,yaw);gl.uniform1f(uPitch,pitch);
  gl.uniform1f(uRatio,Math.max(.7,canvas.width/canvas.height));
  gl.drawArrays(gl.TRIANGLES,0,sideCount);
 }
 function start(){if(!gl||!active||document.hidden||raf)return;lastFrame=0;raf=requestAnimationFrame(frame)}
 function frame(t){
  raf=0;if(!active||document.hidden)return;
  const dt=Math.min(48,Math.max(0,lastFrame?t-lastFrame:16));lastFrame=t;
  if(!dragging){
   if(!reduced.matches&&t-lastManual>1250){
    // Gentle showroom motion stays almost face-on so the original DB mark
    // remains legible instead of turning into a side-on abstract sculpture.
    const desired=.12+Math.sin(t*.00028)*.16;
    const nearest=desired+Math.round((targetYaw-desired)/(Math.PI*2))*Math.PI*2;
    targetYaw+=(nearest-targetYaw)*Math.min(.019,dt*.00045);
   }
   targetYaw+=inertiaYaw*dt;targetPitch+=inertiaPitch*dt;
   // A physical showroom turntable, not a full flip that shows a blank slab.
   targetYaw=Math.max(-.54,Math.min(.54,targetYaw));
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
  setup().catch(err=>{console.error('DashByte 3D vector model',err);stage.dataset.renderer='fallback';gl=null})
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
  targetYaw=Math.max(-.54,Math.min(.54,targetYaw+dx*.008));
  targetPitch=Math.max(-.38,Math.min(.38,targetPitch+dy*.005));
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
  if(e.key==='ArrowLeft')targetYaw=Math.max(-.54,targetYaw-.15);
  if(e.key==='ArrowRight')targetYaw=Math.min(.54,targetYaw+.15);
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
