/* DashByte TRUE FROST: Gaussian-blurred moving-video pixels under each glass card.
   A single video decode, four low-resolution canvas samples, capped at ~2.4 fps.
   CSS backdrop-filter fallback remains when canvas or video cannot be sampled. */
(function(){
 'use strict';
 const film=document.getElementById('showroom-film');
 const cards=[...document.querySelectorAll('.page > .projects > a.project')];
 if(!film||!cards.length)return;
 const lenses=[];
 for(const card of cards){
  const canvas=document.createElement('canvas');
  canvas.className='db-frost-canvas';
  canvas.setAttribute('aria-hidden','true');
  card.insertBefore(canvas,card.firstChild);
  const context=canvas.getContext('2d',{alpha:true,desynchronized:true});
  if(context)lenses.push({card,canvas,context});
  else canvas.remove();
 }
 if(!lenses.length)return;
 let last=0,request=0;
 const quality=.44;
 const pad=48;
 function positionFactor(css,axis){
  const words=css.trim().split(/\s+/);
  const word=words[axis]|| (axis===0?'50%':'50%');
  if(word==='center')return .5;
  if(word==='left'||word==='top')return 0;
  if(word==='right'||word==='bottom')return 1;
  if(word.endsWith('%'))return Math.max(0,Math.min(1,parseFloat(word)/100));
  return .5;
 }
 function paint(){
  if(film.readyState<2||!film.videoWidth||!film.videoHeight)return;
  const filmBox=film.getBoundingClientRect();
  if(filmBox.width<1||filmBox.height<1)return;
  const scale=Math.max(filmBox.width/film.videoWidth,filmBox.height/film.videoHeight);
  const shownW=film.videoWidth*scale,shownH=film.videoHeight*scale;
  const css=getComputedStyle(film);
  const position=css.objectPosition||'50% 50%';
  const left=(filmBox.width-shownW)*positionFactor(position,0);
  const top=(filmBox.height-shownH)*positionFactor(position,1);
  for(const lens of lenses){
   const cardBox=lens.card.getBoundingClientRect();
   if(cardBox.bottom<0||cardBox.top>innerHeight+180)continue;
   const w=Math.max(1,Math.round(cardBox.width*quality));
   const h=Math.max(1,Math.round(cardBox.height*quality));
   if(lens.canvas.width!==w||lens.canvas.height!==h){
    lens.canvas.width=w;lens.canvas.height=h;
   }
   const ctx=lens.context;
   const x=(cardBox.left-filmBox.left-left-pad)/scale;
   const y=(cardBox.top-filmBox.top-top-pad)/scale;
   const sw=(cardBox.width+pad*2)/scale;
   const sh=(cardBox.height+pad*2)/scale;
   const dx=-pad*quality,dy=-pad*quality;
   try{
    ctx.clearRect(0,0,w,h);
    // Gaussian blur runs as a GPU-composited CSS filter on the canvas.
    // 2D canvas filtering large live video frames stalls Android and headless Chrome.
    // Clamp to the decoded frame; drawImage can then use an overscanned crop.
    const sx=Math.max(0,x),sy=Math.max(0,y);
    const ex=Math.min(film.videoWidth,x+sw),ey=Math.min(film.videoHeight,y+sh);
    if(ex<=sx||ey<=sy)continue;
    const factor=(cardBox.width+pad*2)*quality/sw;
    ctx.drawImage(film,sx,sy,ex-sx,ey-sy,
      dx+(sx-x)*factor,dy+(sy-y)*factor,(ex-sx)*factor,(ey-sy)*factor);
    lens.card.dataset.liveFrost='on';
   }catch(error){
    lens.card.dataset.liveFrost='off';
    lens.canvas.style.display='none';
    // Native backdrop-filter remains in the pane as the fallback.
   }
  }
 }
 function tick(time){
  request=0;
  if(!document.hidden&&time-last>=420){last=time;paint()}
  request=requestAnimationFrame(tick);
 }
 // Start after DOMContentLoaded, so drawing cannot block the navigation event.
 const run=()=>setTimeout(()=>{request=requestAnimationFrame(tick)},650);
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
 window.addEventListener('resize',()=>{last=0},{passive:true});
})();