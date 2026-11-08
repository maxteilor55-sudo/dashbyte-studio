#!/usr/bin/env python3
"""Build an entirely offline single-file Arsenal preview from its REG.RU ZIP."""
import base64
import html
import json
import mimetypes
import re
from pathlib import Path
from zipfile import ZipFile

ROOT=Path(__file__).resolve().parent.parent
ARCHIVE=ROOT/'arsenal-upload.zip'
OUTPUT=ROOT/'arsenal-preview.html'
PAGES=['index.html','navesy.html','garazhi.html','lestnicy.html',
       'ograzhdeniya.html','terrasy.html','vhodnye-gruppy.html',
       'svarka.html','arsenal-privacy.html']

with ZipFile(ARCHIVE) as z:
    filenames=set(z.namelist())
    assert set(PAGES)<=filenames, 'Required pages are missing'
    cache={}
    def embed_resource(link):
        name=link.split('?',1)[0].split('#',1)[0].removeprefix('./')
        if name not in filenames or not name.startswith('assets/'):
            return None
        if name not in cache:
            mime,_=mimetypes.guess_type(name)
            mime=mime or 'application/octet-stream'
            cache[name]='data:'+mime+';base64,'+base64.b64encode(z.read(name)).decode('ascii')
        return cache[name]
    def embed_page(filename):
        source=z.read(filename).decode('utf-8')
        # Analytics should never run from a local visual-only preview.
        source=re.sub(r'<script\b[^>]*\bsrc=["\'][^"\']*arsenal-compliance\.js[^>]*>\s*</script>',
                      '',source,flags=re.I)
        def link_style(m):
            tag=m.group(0)
            if not re.search(r'\brel=["\']stylesheet["\']',tag,re.I):
                return tag
            item=re.search(r'\bhref=["\']([^"\']+)["\']',tag,re.I)
            if not item:return tag
            name=item.group(1).split('?',1)[0].removeprefix('./')
            if name in filenames and name.endswith('.css'):
                return '<style>'+z.read(name).decode('utf-8')+'</style>'
            return tag
        source=re.sub(r'<link\b[^>]*>',link_style,source,flags=re.I)
        def inline_js(m):
            tag=m.group(0)
            found=re.search(r'\bsrc=["\']([^"\']+)["\']',tag,re.I)
            if not found:return tag
            name=found.group(1).split('?',1)[0].removeprefix('./')
            if name in filenames and name.endswith('.js'):
                if name.endswith('arsenal-compliance.js'):return ''
                return '<script>'+z.read(name).decode('utf-8')+'</script>'
            return tag
        source=re.sub(r'<script\b[^>]*>\s*</script>',inline_js,source,flags=re.I)
        def attr(m):
            uri=m.group('url')
            return m.group('left')+(embed_resource(uri) or uri)+m.group('right')
        source=re.sub(r'(?P<left>\b(?:src|poster|href)=["\'])(?P<url>(?:\./)?assets/[^"\']+)(?P<right>["\'])',
                      attr,source,flags=re.I)
        def css(m):
            uri=m.group(1)
            return 'url("'+(embed_resource(uri) or uri)+'")'
        source=re.sub(r'url\(\s*["\']?((?:\./)?assets/[^\)"\']+)["\']?\s*\)',
                      css,source,flags=re.I)
        # Local preview should not create real leads.
        stopper="""<script>
        document.addEventListener('submit',function(e){
         if(e.target&&e.target.id==='contact-form'){
          e.preventDefault();e.stopImmediatePropagation();
          alert('Локальный предпросмотр: отправка заявки отключена. На рабочем сайте проверьте форму отдельно.');
         }
        },true);
        </script>"""
        assert '</head>' in source
        source=source.replace('</head>',stopper+'</head>',1)
        return source
    pages={name:embed_page(name) for name in PAGES}

payload=json.dumps(pages,ensure_ascii=False,separators=(',',':')).replace('</','<\\/')
wrapper=r'''<!doctype html><html lang="ru"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Арсенал — локальный просмотр сайта</title>
<style>
html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#15110f}
#site{border:0;width:100%;height:100%;height:100dvh;display:block;background:#15110f}
</style></head><body>
<iframe id="site" title="Арсенал — предпросмотр"></iframe>
<noscript>Откройте HTML в Chrome или Firefox с включённым JavaScript.</noscript>
<script id="page-data" type="application/json">__PAGES__</script>
<script>
(()=>{
const pages=JSON.parse(document.getElementById('page-data').textContent);
const frame=document.getElementById('site');
function navigate(page,anchor,push){
 if(!Object.prototype.hasOwnProperty.call(pages,page))return;
 frame.onload=()=>{
   try{
     const doc=frame.contentDocument;
     doc.addEventListener('click',event=>{
       const link=event.target.closest('a[href]');
       if(!link)return;
       const href=link.getAttribute('href')||'';
       if(/^(?:tel:|mailto:|https?:|data:)/i.test(href))return;
       const plain=href.split(/[?#]/)[0].replace(/^\.\//,'');
       const hash=href.includes('#')?href.split('#').pop():'';
       const target=plain&&plain!=='.'?plain:'index.html';
       if(Object.prototype.hasOwnProperty.call(pages,target)){
         event.preventDefault();
         navigate(target,hash,true);
       }
     },true);
     if(anchor){
       requestAnimationFrame(()=>{
         const el=doc.getElementById(anchor);
         if(el)el.scrollIntoView({block:'start'});
       });
     }
   }catch(e){console.warn('Navigation:',e);}
 };
 frame.srcdoc=pages[page];
 if(push)try{history.pushState({page,anchor},'', '#preview='+encodeURIComponent(page)+(anchor?'&anchor='+encodeURIComponent(anchor):''));}catch(e){}
}
window.addEventListener('popstate',e=>{
 let state=e.state||{page:'index.html',anchor:''};
 navigate(state.page||'index.html',state.anchor||'',false);
});
navigate('index.html','',false);
})();
</script>
</body></html>'''.replace('__PAGES__',payload)
OUTPUT.write_text(wrapper,encoding='utf-8')
assert 'data:image/' in wrapper
assert all('"'+p+'"' in wrapper for p in PAGES)
print('OFFLINE_PREVIEW_OK',OUTPUT.name,OUTPUT.stat().st_size,'bytes',
      len(PAGES),'pages',len(cache),'inlined assets')
