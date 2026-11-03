#!/usr/bin/env python3
"""Build a ready-to-upload standalone Arsenal web hosting archive."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import re
import io

import cairosvg
from PIL import Image

root = Path(__file__).resolve().parent.parent
source = root / "arsenal.html"
assert source.is_file(), "arsenal.html not found"
html = source.read_text(encoding="utf-8")
assert "<html" in html.lower() and "</html>" in html.lower()
assert len(html) > 1_000_000, "Refusing to package truncated client site"

# Keep only assets actually referenced by Arsenal (including its linked CSS/JS),
# plus small Arsenal-specific graphics and shared DashByte navigation assets.
asset_dir = root / "assets"
files = [p for p in asset_dir.rglob("*") if p.is_file()]
chosen = set()
seed = {"arsenal-showcase-v1.css", "arsenal-showcase-v1.js",
        "db-glass-up.css", "db-glass-up.js", "DashByte_DB_Official_Vector.svg"}
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
favicon_links = (\n    '<link rel="icon" type="image/x-icon" href="./favicon.ico?v=2" sizes="any">\\n'\n    '<link rel="icon" type="image/svg+xml" href="./assets/arsenal-favicon.svg?v=2">\\n'\n    '<link rel="apple-touch-icon" href="./apple-touch-icon.png?v=2">\\n'\n)\nassert "</head>" in html.lower(), "Cannot place favicon metadata without head"\nif "arsenal-favicon.svg" not in html:\n    html = re.sub(r"</head>", favicon_links + "</head>", html, count=1, flags=re.I)\nicon_source = (root / "assets/arsenal-favicon.svg").read_bytes()\nicon_png = Image.open(io.BytesIO(cairosvg.svg2png(bytestring=icon_source, output_width=512, output_height=512))).convert("RGBA")\nico_bytes = io.BytesIO()\nicon_png.save(ico_bytes, format="ICO", sizes=[(16,16),(32,32),(48,48),(64,64),(128,128),(256,256)])\napple_bytes = io.BytesIO()\nicon_png.resize((180,180), Image.Resampling.LANCZOS).save(apple_bytes, format="PNG")\n\n# Full HTML is the document root on REG.RU; not the chooser at GitHub Pages.
archive = root / "arsenal-upload.zip"
instructions = """
АРСЕНАЛ — файл для размещения на хостинге REG.RU
1. ispmanager → Менеджер файлов → www → navesy59.ru
2. Сохраните резервную копию существующего index.html, затем удалите шаблонный файл.
3. Загрузите сюда arsenal-upload.zip и распакуйте архив в ТЕКУЩЕЙ папке.
4. Убедитесь, что index.html и папка assets лежат непосредственно в www/navesy59.ru.
5. Проверьте сайт на тестовом адресе, прежде чем менять DNS у Webnames.
6. После переноса подключите SSL, формы, контакты и настройте редиректы.
ИСТОЧНИК: опубликованный arsenal.html из репозитория DashByte.
""".lstrip()
with ZipFile(archive, "w", compression=ZIP_DEFLATED, compresslevel=6) as z:
    z.writestr("index.html", html)
    z.writestr("favicon.ico", ico_bytes.getvalue())
    z.writestr("apple-touch-icon.png", apple_bytes.getvalue())
    for p in sorted(chosen):
        z.write(p, p.relative_to(root).as_posix())
    z.writestr("ИНСТРУКЦИЯ.txt", instructions)

print("ARCHIVE",archive.name,"BYTES",archive.stat().st_size)
print("FILES",len(chosen)+4)
for p in sorted(chosen):
    print("INCLUDED",p.relative_to(root).as_posix(),p.stat().st_size)
missing=[]
for match in re.finditer(r"""(?:src|href|poster)\s*=\s*["']((?:\./)?assets/[^"'?#]+)""",html,re.I):
    name=match.group(1).removeprefix("./")
    if not (root/name).is_file():
        missing.append(name)
if missing:
    print("WARNING: missing local assets:",sorted(set(missing))[:20])
