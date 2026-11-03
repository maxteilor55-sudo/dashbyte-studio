#!/usr/bin/env python3
"""Build a ready-to-upload standalone Arsenal web hosting archive."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED, ZipInfo
import re
import io
import base64
import hashlib

import cairosvg
from PIL import Image

root = Path(__file__).resolve().parent.parent
source = root / "arsenal.html"
assert source.is_file(), "arsenal.html not found"
from upgrade_arsenal import patch
html = patch(source.read_text(encoding="utf-8"))
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
2. Сохраните резервную копию существующего index.html, затем удалите шаблонный файл.
3. Загрузите сюда arsenal-upload.zip и распакуйте архив в ТЕКУЩЕЙ папке.
   ПОДТВЕРДИТЕ замену старого index.html, если уже установлен сайт.
4. Убедитесь, что index.html и папка assets лежат непосредственно в www/navesy59.ru.
5. Проверьте сайт на тестовом адресе, прежде чем менять DNS у Webnames.
6. Сразу проверьте favicon.ico, arsenal-privacy.html и ссылку в футере на DashByte-бота.
7. Не оставляйте публично доступные ZIP, backup HTML и служебные txt.
8. Форма пока демонстрационная — для реальной доставки заявок нужен отдельный обработчик.
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
    add_public_file(z, 'robots.txt', 'User-agent: *\nAllow: /\nSitemap: https://navesy59.ru/sitemap.xml\n')
    add_public_file(z, 'sitemap.xml', '<?xml version="1.0" encoding="UTF-8"?>\n'
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
      '<url><loc>https://navesy59.ru/</loc></url>'
      '<url><loc>https://navesy59.ru/arsenal-privacy.html</loc></url>'
      '</urlset>\n')
    for filename,content in sorted(inline_assets.items()):
        add_public_file(z, filename, content)
    for p in sorted(chosen):
        z.write(p, p.relative_to(root).as_posix())

print("ARCHIVE",archive.name,"BYTES",archive.stat().st_size)
print("FILES",len(chosen)+6+len(inline_assets))
for p in sorted(chosen):
    print("INCLUDED",p.relative_to(root).as_posix(),p.stat().st_size)
missing=[]
for match in re.finditer(r"""(?:src|href|poster)\s*=\s*["']((?:\./)?assets/[^"'?#]+)""",html,re.I):
    name=match.group(1).removeprefix("./")
    if not (root/name).is_file() and name not in inline_assets:
        missing.append(name)
if missing:
    print("WARNING: missing local assets:",sorted(set(missing))[:20])
