#!/usr/bin/env python3
"""Idempotent production-safe upgrades for independent Arsenal website.
Run after build-showroom.py, or import patch() from the REG.RU packager.
Never change the client's original navigation, project images or interactions.
"""
import re
from pathlib import Path

BOT = "https://t.me/DashByteStudioBot"
HEAD = '''<!-- ARSENAL: actual public domain metadata and icons -->
<link rel="canonical" href="https://navesy59.ru/">
<link rel="icon" href="./favicon.ico?v=20261103b" sizes="any" type="image/x-icon">
<link rel="icon" href="./assets/arsenal-favicon.svg?v=20261103b" type="image/svg+xml">
<link rel="apple-touch-icon" href="./apple-touch-icon.png?v=20261103b" sizes="180x180">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Арсенал">
<meta property="og:locale" content="ru_RU">
<meta property="og:url" content="https://navesy59.ru/">
<meta property="og:title" content="Арсенал — Навесы, гаражи и металлоконструкции в Перми">
<meta property="og:description" content="Изготовление и монтаж навесов, гаражей, лестниц, ограждений и металлоконструкций в Перми и Пермском крае.">
<meta property="og:image" content="https://navesy59.ru/assets/arsenal-frame-updated-20261030.webp">
<meta name="twitter:card" content="summary_large_image">
<link rel="stylesheet" href="./assets/arsenal-compliance.css?v=20261103b">
<script defer src="./assets/arsenal-compliance.js?v=20261103b"></script>
'''
FOOTER = '''<nav class="ars-legal-links" aria-label="Правовые документы">
<a href="./arsenal-privacy.html">Политика конфиденциальности</a>
<a href="./arsenal-privacy.html#cookies">Cookies и настройки</a>
</nav>'''

def patch(html: str) -> str:
    if len(html)<1_000_000 or '<html' not in html.lower():
        raise RuntimeError('Refusing to modify incomplete Arsenal HTML')
    # Remove obsolete GitHub chooser navigation on *both* mobile and desktop.
    for rx in [
        r'<style\s+id="db-arsenal-choice-return-style">.*?</style>\s*<script\s+id="db-arsenal-choice-return-init">.*?</script>',
        r'<style\s+id="db-arsenal-navigation-finish-style">.*?</style>\s*<script\s+id="db-arsenal-navigation-finish">.*?</script>',
    ]:
        html=re.sub(rx, '', html, flags=re.S|re.I)
    # Other templates or styles could reinsert this item; the runtime guard also removes it.
    # Replace the broken relative local studio page with the actual Telegram bot.
    pattern=r'(<a\s+id="db-arsenal-studio-link"[^>]*?)>'
    def link(m):
        tag=m.group(1)
        tag=re.sub(r'\s+href="[^"]*"', '', tag)
        tag=re.sub(r'\s+aria-label="[^"]*"', '', tag)
        tag=re.sub(r'\s+target="[^"]*"', '', tag)
        tag=re.sub(r'\s+rel="[^"]*"', '', tag)
        return tag + ' href="'+BOT+'" target="_blank" rel="noopener noreferrer" aria-label="Открыть Telegram-бот студии DashByte">'
    html,n=re.subn(pattern,link,html,count=1,flags=re.I)
    if n!=1:raise RuntimeError('Cannot identify the DashByte footer link')
    if 'ars-legal-links' not in html:
        html,n=re.subn(r'(<footer\b[^>]*>.*?)(</footer>)',lambda m:m.group(1)+FOOTER+m.group(2),html,count=1,flags=re.S|re.I)
        if n!=1:raise RuntimeError('Cannot find Arsenal footer to add legal links')
    # All deployment metadata is inserted in one idempotent block.
    html=re.sub(r'<!-- ARSENAL: actual public domain metadata and icons -->.*?<script defer src="\./assets/arsenal-compliance\.js\?v=[^"]+"></script>\s*','',html,flags=re.S|re.I)
    # The older favicon insertion from package-arsenal.py is replaced, not duplicated.
    html=re.sub(r'<link\s+rel="(?:icon|apple-touch-icon)"[^>]*(?:arsenal-favicon|favicon\.ico|apple-touch-icon)[^>]*>\s*','',html,flags=re.I)
    html,n=re.subn(r'</head\s*>',lambda m:HEAD+m.group(0),html,count=1,flags=re.I)
    if n!=1:raise RuntimeError('Cannot attach Arsenal favicon and meta tags')
    assert BOT in html
    assert 'К выбору проектов' not in html and 'К проектам' not in html
    return html

if __name__=='__main__':
    root=Path(__file__).resolve().parent.parent
    path=root/'arsenal.html'
    old=path.read_text(encoding='utf-8')
    new=patch(old)
    if old!=new:path.write_text(new,encoding='utf-8')
    print('ARSENAL_UPGRADE_PASS',len(new),'bot',BOT,'legal',new.count('arsenal-privacy.html'))
