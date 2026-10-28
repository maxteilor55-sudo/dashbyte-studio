#!/usr/bin/env python3
"""Publish a new selection screen with two *independent* sites.

DashByte source is pinned to the approved v9.6 Initial release.
No nested iframes; Telegram web-app launch data is forwarded by the chooser.
This leaves the published standalone Arsenal site's header intact.
"""
from pathlib import Path
import subprocess
import re

ROOT=Path(__file__).resolve().parent.parent
CANONICAL="57f21d6bb23c4f446da95a2819a5beade1ffa6df"
studio=subprocess.run(
    ["git","show",CANONICAL+":index.html"],cwd=ROOT,
    stdout=subprocess.PIPE,stderr=subprocess.PIPE,check=True
).stdout.decode("utf-8")
if len(studio)<9_000_000 or not all(x in studio for x in
       ['id="topbar"','db-header-visible','</html>']):
    raise RuntimeError("Not the complete approved DashByte v9.6 release")

# Direct page; title, media, original portfolio and hero remain intact.
# Header alignment uses the same Telegram content-safe-area anchor as Arsenal.
db_extension=r"""
<style id="db-direct-showroom-v2">
/* Same spatial anchor as the stable Arsenal native Mini App header.
   Old DashByte: html:not(.db-header-visible) #topbar moved the capsule
   by translate(-100% - 84px), making it pass THROUGH Telegram controls.
   Position NEVER moves now. Visibility fades on that fixed anchor. */
html.db-direct-showroom #topbar,
html.db-direct-showroom.db-telegram-miniapp #topbar,
html.db-direct-showroom.db-telegram-miniapp:not(.db-showroom-stage) #topbar,
html.db-direct-showroom:not(.db-header-visible) #topbar,
html.db-direct-showroom.db-header-visible #topbar{
  position:fixed!important;
  top:var(--db-native-header-top,88px)!important;
  left:50%!important;right:auto!important;bottom:auto!important;
  transform:translateX(-50%)!important;
  -webkit-transform:translateX(-50%)!important;
  translate:none!important;
  -webkit-translate:none!important;
  animation:none!important;
  transition:opacity .36s ease,filter .36s ease!important;
  will-change:opacity!important;
  border-radius:30px!important;
}
html.db-direct-showroom:not(.db-header-visible) #topbar{
  opacity:0!important;
  filter:blur(7px)!important;
  pointer-events:none!important;
}
html.db-direct-showroom.db-header-visible #topbar{
  opacity:1!important;
  filter:none!important;
  pointer-events:auto!important;
}
html.db-direct-showroom #menu-sheet,
html.db-direct-showroom.db-telegram-miniapp:not(.db-showroom-stage) #menu-sheet{
  top:calc(var(--db-native-header-top,88px) + 114px)!important;
  max-height:calc(100dvh - var(--db-native-header-top,88px) - 128px)!important;
}
@media (prefers-reduced-motion:reduce){
  html.db-direct-showroom #topbar{transition:none!important;filter:none!important}
}
.db-showroom-choice-back{
  display:block!important;margin:10px!important;padding:13px 16px!important;
  border:1px solid rgba(255,255,255,.25)!important;border-radius:15px!important;
  background:rgba(255,255,255,.085)!important;color:white!important;
  font-weight:750!important;font-size:14px!important;text-decoration:none!important;
}
</style>
<script id="db-direct-showroom-start">
(function(){
  const tg=window.Telegram&&window.Telegram.WebApp;
  const root=document.documentElement;
  root.classList.add('db-direct-showroom');
  function pos(){
    const a=tg&&tg.safeAreaInset||{},c=tg&&tg.contentSafeAreaInset||{};
    const safe=Math.max(Number(a.top)||0,Number(c.top)||0);
    const top=tg?Math.max(82,safe+8):18;
    root.style.setProperty('--db-native-header-top',top+'px');
    // Arsenal pins the actual DOM element, not just a CSS custom property.
    // Do the same here; disable the inherited offscreen translate animation
    // even if Telegram sends another viewport/safe-area event mid-scroll.
    const bar=document.getElementById('topbar');
    if(bar){
      bar.style.setProperty('top',top+'px','important');
      bar.style.setProperty('translate','none','important');
      bar.style.setProperty('animation','none','important');
      bar.style.setProperty('transition','opacity .36s ease,filter .36s ease','important');
    }
  }
  try{
    if(tg){
      tg.ready();tg.expand();
      if(tg.isVersionAtLeast&&tg.isVersionAtLeast('8.0')&&tg.requestFullscreen&&!tg.isFullscreen)tg.requestFullscreen();
      ['safeAreaChanged','contentSafeAreaChanged','fullscreenChanged','viewportChanged'].forEach(
        function(e){if(tg.onEvent)tg.onEvent(e,pos)}
      );
      if(tg.BackButton&&tg.BackButton.hide)tg.BackButton.hide();
    }
  }catch(e){}
  pos();
  function addBack(){
    const menu=document.getElementById('menu-sheet');
    if(!menu||document.getElementById('db-chooser-return'))return;
    const link=document.createElement('a');
    link.id='db-chooser-return';
    link.className='db-showroom-choice-back';
    link.textContent='← К выбору проектов';
    link.href='./';
    link.addEventListener('click',function(e){
      if(location.hash.indexOf('tgWebApp')!==-1){
        e.preventDefault();const dest=new URL('./',location.href);dest.hash=location.hash;
        location.assign(dest.href);
      }
    });
    menu.prepend(link);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){pos();addBack()});
  else {pos();addBack()}
})();
</script>
"""
studio,n=re.subn(r'</head\s*>',lambda m:db_extension+"\n"+m.group(0),
                 studio,count=1,flags=re.I)
if n!=1:raise RuntimeError("No HEAD boundary in studio release")
# Preserve pixels and scripts, only remove inherited whitespace at line ends.
studio=re.sub(r'[ ]+(?=$)', '', studio,flags=re.M)
(ROOT/"dashbyte.html").write_text(studio,encoding='utf-8')

showroom=(ROOT/"showroom.html").read_text(encoding='utf-8')
if showroom.count('data-project="arsenal"')!=1 or showroom.count('data-project="dashbyte"')!=1:
    raise RuntimeError("Chooser must have exactly two project links")
if "./arsenal.html" not in showroom or "./dashbyte.html" not in showroom:
    raise RuntimeError("Chooser has invalid project routes")
(ROOT/"index.html").write_text(showroom,encoding="utf-8")

# Do not modify Arsenal layout: add exactly one unobtrusive first menu item,
# visible only when the native hamburger is opened.
ars_path=ROOT/"arsenal.html"
ars=ars_path.read_text(encoding="utf-8")
if len(ars)<1_000_000 or "site-header" not in ars:
    raise RuntimeError("Published Arsenal site is incomplete")
marker='id="db-arsenal-choice-return-init"'
if marker not in ars:
    addition=r"""
<style id="db-arsenal-choice-return-style">
#db-arsenal-chooser-link{
  display:block!important;padding:13px 16px!important;
  margin:5px 0!important;border-radius:13px!important;
  border:1px solid rgba(255,255,255,.24)!important;
  background:rgba(255,255,255,.10)!important;
  color:#f4e9e0!important;font-weight:800!important;
  font-size:14px!important;text-decoration:none!important;
}
</style>
<script id="db-arsenal-choice-return-init">
(function(){
 function install(){
   const menu=document.getElementById('mobile-menu')||document.querySelector('.mobile-menu');
   if(!menu||document.getElementById('db-arsenal-chooser-link'))return;
   const a=document.createElement('a');
   a.id='db-arsenal-chooser-link';
   a.href='./';a.textContent='← К выбору проектов';
   a.addEventListener('click',function(e){
     if(location.hash.indexOf('tgWebApp')!==-1){
       e.preventDefault();
       const dest=new URL('./',location.href);dest.hash=location.hash;
       location.assign(dest.href);
     }
   });
   menu.prepend(a);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);
 else install();
})();
</script>
"""
    ars,n=re.subn(r'</head\s*>',lambda m:addition+"\n"+m.group(0),ars,count=1,flags=re.I)
    if n!=1:raise RuntimeError("Cannot inject Arsenal hamburger choice link")
    ars_path.write_text(ars,encoding="utf-8")

# Older BotFather configuration still points here on some devices.
legacy=ROOT/"DashByte_Showroom_v2_0.html"
legacy.write_text("""<!doctype html><html lang="ru"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>DashByte — Digital Showroom</title><script>
(function(){var u=new URL('./',location.href);u.hash=location.hash;location.replace(u.href)})();
</script><noscript><meta http-equiv="refresh" content="0;url=./"></noscript>
</head><body style="background:#0b0a0d;color:white;font-family:system-ui">
<a href="./">Открыть шоурум DashByte</a></body></html>""",encoding="utf-8")
print("Built two independent sites.",
      "chooser:",len(showroom),"DashByte:",len(studio),"Arsenal:",len(ars))
