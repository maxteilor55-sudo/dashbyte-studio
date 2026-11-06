#!/usr/bin/env python3
"""Build a ready-to-upload standalone Arsenal web hosting archive."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED, ZipInfo
import re
import io
import base64
import hashlib
import importlib.util

import cairosvg
from PIL import Image

root = Path(__file__).resolve().parent.parent
source = root / "arsenal.html"
assert source.is_file(), "arsenal.html not found"
from upgrade_arsenal import patch
html = patch(source.read_text(encoding="utf-8"))
# SEO is assembled only in the deployable REG.RU site, not the client demo.
seo_spec = importlib.util.spec_from_file_location("arsenal_seo", root / "scripts/arsenal-seo.py")
seo = importlib.util.module_from_spec(seo_spec)
seo_spec.loader.exec_module(seo)
html = seo.patch_homepage(html)
service_pages = seo.service_files()
# This keeps the manual form unchanged until the Cloudflare endpoint and public
# Turnstile sitekey are configured in assets/arsenal-leads-config.js on REG.RU.
html = html.replace("</head>", (
    '<link rel="stylesheet" href="./assets/arsenal-leads.css?v=20261105a">\n'
    '<script defer src="./assets/arsenal-leads-config.js?v=20261106c"></script>\n'
    '<script defer src="./assets/arsenal-leads.js?v=20261105a"></script>\n'
    '</head>'
), 1)


assert "<html" in html.lower() and "</html>" in html.lower()
assert len(html) > 1_000_000, "Refusing to package truncated client site"

# Keep only assets actually referenced by Arsenal (including its linked CSS/JS),
# plus small Arsenal-specific graphics and shared DashByte navigation assets.
asset_dir = root / "assets"
files = [p for p in asset_dir.rglob("*") if p.is_file()]
chosen = set()
seed = {"arsenal-showcase-v1.css", "arsenal-showcase-v1.js",
        "db-glass-up.css", "db-glass-up.js", "DashByte_DB_Official_Vector.svg",
        "arsenal-compliance.css", "arsenal-compliance.js", "arsenal-favicon.svg"}
for p in files:
    if p.name.startswith("arsenal-") or p.name in seed:
        chosen.add(p)

scanned = {source}
queue = [source]
while queue:
    source_path = queue.pop()
    body = source_path.read_text(encoding="utf-8", errors="ignore")
    for p in files:
        rel = p.relative_to(root).as_posix()
        if rel in body and p not in chosen:
            chosen.add(p)
        if rel in body and p.suffix.lower() in {".css", ".js"} and p not in scanned:
            scanned.add(p)
            queue.append(p)

# Add explicit, versioned favicon links to the deployed HTML to invalidate stale browser/Telegram caches.
favicon_links = (
    '<link rel="icon" type="image/x-icon" href="./favicon.ico?v=2" sizes="any">\n'
    '<link rel="icon" type="image/svg+xml" href="./assets/arsenal-favicon.svg?v=2">\n'
    '<link rel="apple-touch-icon" href="./apple-touch-icon.png?v=2">\n'
)
assert "</head>" in html.lower(), "Cannot place favicon metadata without head"
if "arsenal-favicon.svg" not in html:
    html = re.sub(r"</head>", lambda m: favicon_links + m.group(0), html, count=1, flags=re.I)
icon_source = (root / "assets/arsenal-favicon.svg").read_bytes()
icon_png = Image.open(io.BytesIO(cairosvg.svg2png(bytestring=icon_source, output_width=512, output_height=512))).convert("RGBA")
ico_bytes = io.BytesIO()
icon_png.save(ico_bytes, format="ICO", sizes=[(16,16),(32,32),(48,48),(64,64),(128,128),(256,256)])
apple_bytes = io.BytesIO()
icon_png.resize((180,180), Image.Resampling.LANCZOS).save(apple_bytes, format="PNG")

# Remove bulky inline photo data from the critical HTML document.
# Store images as content-addressed assets so below-the-fold images load lazily
# and cached photos are reused across visits. Pixels stay unchanged.
inline_assets = {}
photo_mimes = {"image/png":"png", "image/jpeg":"jpg", "image/jpg":"jpg",
               "image/webp":"webp", "image/gif":"gif", "image/avif":"avif"}
inline_pattern = re.compile(r"data:image/(?:png|jpeg|jpg|webp|gif|avif);base64,[A-Za-z0-9+/=]+", re.I)
def move_photo(match):
    uri=match.group(0)
    mime,encoded=uri.split(",",1)
    kind=mime.split(";")[0].lower().removeprefix("data:")
    suffix=photo_mimes.get(kind)
    if not suffix:return uri
    try:
        payload=base64.b64decode(encoded,validate=True)
    except Exception:
        return uri
    if len(payload)<2048:return uri
    filename="assets/arsenal-photo-"+hashlib.sha256(payload).hexdigest()[:16]+"."+suffix
    inline_assets[filename]=payload
    return "./"+filename
original_html_size=len(html.encode("utf-8"))
html=inline_pattern.sub(move_photo,html)

# Apply native lazy-loading in markup BEFORE the browser parses the page.
# Doing it after DOMContentLoaded is too late: eager image fetches already start.
# The critical hero uses a separate image with fetchpriority=high and stays eager.
def optimize_photo_img(match):
    tag=match.group(0)
    if "arsenal-photo-" not in tag or 'fetchpriority="high"' in tag.lower():
        return tag
    additions=[]
    if 'loading=' not in tag.lower():
        additions.append('loading="lazy"')
    if 'decoding=' not in tag.lower():
        additions.append('decoding="async"')
    if not additions:
        return tag
    ending='/>' if tag.endswith('/>') else '>'
    return tag[:-len(ending)]+' '+' '.join(additions)+ending
html=re.sub(r'<img\b[^>]*>',optimize_photo_img,html,flags=re.I|re.S)
if inline_pattern.search(source.read_text(encoding="utf-8")) and not inline_assets:
    raise RuntimeError("Failed to externalize inline photos")
print("HTML_OPTIMIZATION",original_html_size,"TO",len(html.encode("utf-8")),
      "INLINE_PHOTOS_EXTERNALIZED",len(inline_assets),
      "PHOTO_PAYLOAD_BYTES",sum(map(len,inline_assets.values())))

# Full HTML is the document root on REG.RU; not the chooser at GitHub Pages.
archive = root / "arsenal-upload.zip"
instructions = """
АРСЕНАЛ — файл для размещения на хостинге REG.RU
1. ispmanager → Менеджер файлов → www → navesy59.ru
2. Сохраните резервную копию действующего сайта (включая формы, скрипты и .htaccess).
   Проверьте, что текущая форма заявок работает: исходная версия из репозитория
   демонстрационная и не отправляет заявки автоматически.
3. Загрузите сюда arsenal-upload.zip и распакуйте архив в ТЕКУЩЕЙ папке.
   ПОДТВЕРДИТЕ замену старого index.html, если уже установлен сайт.
4. Убедитесь, что index.html, assets, .htaccess, robots.txt и sitemap.xml
   лежат непосредственно в www/navesy59.ru. Страницы услуг *.html — там же.
5. DNS менять не нужно, если navesy59.ru уже работает на REG.RU.
   Проверьте HTTPS, www-редирект, главную и страницы услуг.
6. Сразу проверьте favicon.ico, arsenal-privacy.html и ссылку в футере на DashByte-бота.
7. Не оставляйте публично доступные ZIP, backup HTML и служебные txt.
8. Пакет содержит интеграцию заявок с DashByte Telegram-ботом.
   Публичный URL Worker и публичный sitekey Turnstile УЖЕ внесены в
   assets/arsenal-leads-config.js — изменять файл вручную не требуется.
   В Cloudflare должны быть настроены ARSENAL_CHAT_ID, TELEGRAM_BOT_TOKEN
   и ARSENAL_TURNSTILE_SECRET; Александру нужно сначала запустить бота.
   НИКОГДА не добавляйте токены, приватный secret key или Telegram ID в HTML.
   Проверьте отправку ТЕСТОВОЙ заявки после распаковки.
   Метрика и Директ этим пакетом не подключаются.
9. Согласуйте с владельцем юрадрес, указанный по реестровым справочникам.
10. Добавьте sitemap.xml в Яндекс Вебмастер и отправьте страницы на переобход.
11. ZIP заменяет index.html и статику: сначала обязательно сделайте бэкап.
ИСТОЧНИК: опубликованный arsenal.html из репозитория DashByte.
""".lstrip()
def add_public_file(z, name, data):
    info=ZipInfo(name)
    info.create_system=3
    info.external_attr=0o100644 << 16
    info.compress_type=ZIP_DEFLATED
    z.writestr(info, data)

with ZipFile(archive, "w", compression=ZIP_DEFLATED, compresslevel=6) as z:
    add_public_file(z, "index.html", html)
    add_public_file(z, "favicon.ico", ico_bytes.getvalue())
    add_public_file(z, "apple-touch-icon.png", apple_bytes.getvalue())
    z.write(root / 'arsenal-privacy.html', 'arsenal-privacy.html')
    add_public_file(z, 'robots.txt', seo.robots())
    add_public_file(z, 'sitemap.xml', seo.sitemap())
    add_public_file(z, '.htaccess', seo.htaccess())
    for filename, page_html in service_pages.items():
        add_public_file(z, filename, page_html)
    for filename,content in sorted(inline_assets.items()):
        add_public_file(z, filename, content)
    for p in sorted(chosen):
        z.write(p, p.relative_to(root).as_posix())

print("ARCHIVE",archive.name,"BYTES",archive.stat().st_size)
print("FILES",len(chosen)+7+len(inline_assets)+len(service_pages))
print("SEO_SERVICE_PAGES",len(service_pages))
assert len(service_pages) >= 6
for p in sorted(chosen):
    print("INCLUDED",p.relative_to(root).as_posix(),p.stat().st_size)
missing=[]
for match in re.finditer(r"""(?:src|href|poster)\s*=\s*["']((?:\./)?assets/[^"'?#]+)""",html,re.I):
    name=match.group(1).removeprefix("./")
    if not (root/name).is_file() and name not in inline_assets:
        missing.append(name)
if missing:
    print("WARNING: missing local assets:",sorted(set(missing))[:20])
