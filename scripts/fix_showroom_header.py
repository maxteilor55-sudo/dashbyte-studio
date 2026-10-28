from pathlib import Path

source = Path('index.html')
html = source.read_text(encoding='utf-8')
marker = '<!-- DASHBYTE SHOWROOM TELEGRAM HEADER 2.4 -->'
assert 'id="topbar"' in html and 'db-header-visible' in html
if marker in html:
    raise SystemExit('Already installed; skipping')
patch = '''<!-- DASHBYTE SHOWROOM TELEGRAM HEADER 2.4 -->
<style id="db-showroom-safe-menu">
/* A native, iframe-specific fix; normal DashByte pages retain their original styling. */
html.db-showroom-stage #topbar {
  position:fixed!important;
  top:var(--db-showroom-menu-top,164px)!important;
  left:50%!important;right:auto!important;bottom:auto!important;
  width:calc(100% - 28px)!important;max-width:1120px!important;
  margin:0!important;
  transform:translateX(-50%)!important;
  -webkit-transform:translateX(-50%)!important;
  translate:none!important;
  animation:none!important;-webkit-animation:none!important;
  transition:opacity .42s ease,visibility .42s!important;
  will-change:opacity!important;
}
html.db-showroom-stage:not(.db-header-visible) #topbar {
  translate:none!important;opacity:0!important;visibility:hidden!important;
  filter:none!important;pointer-events:none!important;
}
html.db-showroom-stage.db-header-visible #topbar {
  translate:none!important;opacity:1!important;visibility:visible!important;
  filter:none!important;pointer-events:auto!important;
}
html.db-showroom-stage #menu-sheet {
  top:calc(var(--db-showroom-menu-top,164px) + 118px)!important;
  max-height:calc(100dvh - var(--db-showroom-menu-top,164px) - 130px)!important;
}
@media(prefers-reduced-motion:reduce) {
  html.db-showroom-stage #topbar{transition:none!important}
}
</style>
<script id="db-showroom-safe-menu-init">
(function(){
  if(window.name!=='dashbyte-showroom-stage')return;
  var root=document.documentElement;
  root.classList.add('db-showroom-stage');
  window.addEventListener('message',function(event){
    if(event.source!==window.parent || event.origin!==location.origin)return;
    var data=event.data;
    if(!data || data.type!=='dashbyte-showroom-safearea')return;
    var px=Number(data.top);
    if(Number.isFinite(px)){
      root.style.setProperty('--db-showroom-menu-top',Math.max(148,Math.min(320,px))+'px');
    }
  });
})();
</script>
'''
assert html.count('</head>') == 1
new_html = html.replace('</head>', patch + '</head>', 1)
source.write_text(new_html, encoding='utf-8')
print(f'Patched {source}: {len(html)} -> {len(new_html)} characters')
