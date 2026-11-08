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
# Cache-bust consent text for existing browsers (including mobile Telegram).
old_consent_asset = 'arsenal-compliance.js?v=20261107w'
new_consent_asset = 'arsenal-compliance.js?v=20261107x'
assert old_consent_asset in html
html = html.replace(old_consent_asset, new_consent_asset)
# The old inline "copy your application" listener MUST be removed in the
# standalone REG.RU build. Leaving it in place caused demo submissions to run.
legacy_start = "const form=document.getElementById('contact-form'),result=document.getElementById('form-result');let applicationText='';"
legacy_end = "const float=document.getElementById('float-cta');"
assert html.count(legacy_start)==1 and legacy_end in html, "Unexpected legacy form markup"
start=html.index(legacy_start)
end=html.index(legacy_end,start)
html=html[:start]+"// Arsenal contact form handled by embedded production Telegram integration.\n      "+html[end:]
assert "applicationText=" not in html, "Old demo form handler was not removed"

# Never submit a fallback GET with personal data if JavaScript is disabled.
old_form='<form id="contact-form">'
assert html.count(old_form)==1
html=html.replace(old_form,'<form id="contact-form" action="#" method="post" onsubmit="return false">',1)
html=html.replace('Сформировать заявку <span class="arrow">↗</span>',
                  'Отправить заявку <span class="arrow">↗</span>',1)
old_disclaimer=("Демонстрационный режим: заявка создаётся только на вашем устройстве "
                "и не отправляется автоматически. Для обращения используйте телефон.")
assert old_disclaimer in html
html=html.replace(old_disclaimer,("Заявка отправляется через защищённую форму. "
                    "Если отправка недоступна, позвоните по указанному номеру."),1)

# Embed the whole tiny form client code in index.html. Previously the external
# asset sometimes failed to initialize (stale cache/404/Turnstile delay), so the
# demo handler silently took over. Inline code is part of the audited HTML ZIP.
form_css=(root/"assets/arsenal-leads.css").read_text(encoding="utf-8")
form_config=(root/"assets/arsenal-leads-config.js").read_text(encoding="utf-8")
form_js=(root/"assets/arsenal-leads.js").read_text(encoding="utf-8")
assert "</script" not in (form_config+form_js).lower()
assert "</style" not in form_css.lower()
html=html.replace("</head>",'<style id="arsenal-leads-inline-styles">\n'+form_css+'\n</style>\n</head>',1)
html=html.replace("</body>",'<script id="arsenal-leads-inline-app">\n'+form_config+'\n'+form_js+'\n</script>\n</body>',1)
assert "Демонстрационный режим" not in html
assert 'id="arsenal-leads-inline-app"' in html

# Remove only provisional marketing copy from the published REG.RU build.
# Keep all navigation, gallery images, MAX/telephone links and the live lead form.
provisional_copy = {
    '<div class="ars-showcase__demo"><strong>ДЕМО</strong><span>Места и годы указаны для примера. Точные данные уточняются.</span></div>': '',
    '<p class="ars-contact-footnote">Ссылка MAX открывает группу. Для прямой переписки добавим личные ссылки Telegram и MAX после подтверждения контактов.</p>': '',
    '<span class="ars-showcase__image-label" id="ars-showcase-kind">ПРОЕКТЫ / ДЕМО</span>':
        '<span class="ars-showcase__image-label" id="ars-showcase-kind">МЕТАЛЛОКОНСТРУКЦИИ</span>',
    '<div class="ars-showcase__meta"><span id="ars-showcase-place">Пермь · пример места</span><span id="ars-showcase-year">2026</span></div>':
        '<div class="ars-showcase__meta" style="display:none"><span id="ars-showcase-place"></span><span id="ars-showcase-year"></span></div>',
    'Можно подготовить текст заявки и связаться с нами по телефону ':
        'Оставьте заявку — мы свяжемся с вами. Или позвоните по телефону '
}
for old, new in provisional_copy.items():
    assert html.count(old) == 1, "Unexpected published Arsenal text: " + old[:80]
    html = html.replace(old, new, 1)
assert 'ars-contact-actions' in html and 'href="tel:+79082400998"' in html
assert 'https://max.ru/join/' in html and 'id="contact-form"' in html


# RELEASE 2026-11-07 r2: captions for every gallery image. Verified locations/
# dates come from matched MAX photos. Images without confirmed locations use
# factual photographic descriptions instead of invented addresses/years.
from html import escape as escape_gallery_text
gallery_locations = {
    4: ("Пермский край, д. Ежи", "Ноябрь 2025 г.", "2025-11"),
    5: ("Пермский край, д. Гари", "Декабрь 2025 г.", "2025-12"),
    6: ("Пермь, м/р Железнодорожный", "Август 2025 г.", "2025-08"),
    7: ("Пермь, м/р Железнодорожный", "Август 2025 г.", "2025-08"),
    8: ("Пермь, м/р Ива", "Май 2025 г.", "2025-05"),
    12: ("Пермский край, Верхняя Курья", "Декабрь 2025 г.", "2025-12"),
    13: ("Пермский край, Верхняя Курья", "Декабрь 2025 г.", "2025-12"),
    23: ("Пермь, м/р Акуловский", "Декабрь 2025 г.", "2025-12"),
    24: ("Пермь, м/р Акуловский", "Декабрь 2025 г.", "2025-12"),
    27: ("Пермский край, д. Гари", "Декабрь 2025 г.", "2025-12"),
    28: ("Пермский край, д. Гари", "Декабрь 2025 г.", "2025-12"),
    29: ("Пермский край, д. Гари", "Декабрь 2025 г.", "2025-12"),
    30: ("Пермский край, д. Гари", "Декабрь 2025 г.", "2025-12"),
    33: ("Пермь, м/р Ива", "Май 2025 г.", "2025-05"),
}
gallery_details = {
    1: "Металлический гараж · секционные ворота и входная дверь",
    2: "Гараж · внешний вид со стороны въезда",
    3: "Гараж · боковой фасад и входной проём",
    9: "Несущий металлокаркас на бетонном основании",
    10: "Арочный автомобильный навес с готовой кровлей",
    11: "Арочные металлические фермы и кровельное покрытие",
    14: "Навес с металлическими опорами у въезда",
    15: "Прямой навес на стальных стойках",
    16: "Отделка карниза и конструкция навеса",
    17: "Навес на фермах над хозяйственной постройкой",
    18: "Монтаж несущих стоек и продольных балок",
    19: "Металлические балки навеса · вид изнутри",
    20: "Соединения балок и стоек каркаса",
    21: "Холодный гараж с открытым навесом",
    22: "Боковая металлическая облицовка гаража",
    25: "Арочный навес с поликарбонатной кровлей",
    26: "Навес с прямой кровлей и стальными опорами",
    31: "Залитое бетонное основание под металлоконструкцию",
    32: "Армирование основания перед заливкой",
}
gallery_count = 0
def enrich_gallery_photo(match):
    global gallery_count
    gallery_count += 1
    card = match.group(0)
    closure = "</h3></div></article>"
    assert card.count(closure) == 1, "Unexpected gallery markup at card %d" % gallery_count
    if gallery_count in gallery_locations:
        location, date, machine_date = gallery_locations[gallery_count]
        stamp = ('<div class="ars-gallery-geo">'
                 '<span class="ars-gallery-place">' + escape_gallery_text(location) + '</span>'
                 '<time datetime="' + machine_date + '">' + escape_gallery_text(date) + '</time>'
                 '</div>')
    else:
        assert gallery_count in gallery_details, "Missing photo caption #%d" % gallery_count
        stamp = ('<div class="ars-gallery-geo">'
                 '<span class="ars-gallery-detail">' + escape_gallery_text(gallery_details[gallery_count]) + '</span>'
                 '</div>')
    return card.replace(closure, "</h3>" + stamp + "</div></article>", 1)
html = re.sub(r'<article class="project"[\s\S]*?</article>', enrich_gallery_photo, html)
assert gallery_count == 33, "Refusing to change gallery with unexpected ordering"
assert len(gallery_locations) == 14 and len(gallery_details) == 19
assert set(gallery_locations).isdisjoint(gallery_details)
assert sorted(list(gallery_locations) + list(gallery_details)) == list(range(1, 34))
assert html.count('class="ars-gallery-geo"') == gallery_count
# SEO cards use verified photo captions from the existing gallery.
html = seo.patch_homepage(html)
assert html.count('class="service-card') == 11
assert 'class="ars-seo-card"' not in html
assert all('href="./' + p['file'] + '"' in html for p in seo.PAGES)

# Two photographic cards per row, including on mobile. Existing lightbox,
# filters, assets and all contact-form event handlers remain untouched.
gallery_style = """<style id="arsenal-gallery-20261107">
#gallery-grid.gallery-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:clamp(9px,1.5vw,20px)}
#gallery-grid .project{min-width:0;border-radius:18px;overflow:hidden;background:linear-gradient(150deg,#302721,#211a17 78%);border:1px solid rgba(225,197,165,.2)}
#gallery-grid .project .project-visual{aspect-ratio:1.12}
#gallery-grid .project-meta{padding:14px 15px 17px}
#gallery-grid .project-meta>span{font-size:10px;letter-spacing:.075em}
#gallery-grid .project-meta h3{font-size:clamp(13px,1.35vw,18px);line-height:1.35;letter-spacing:-.012em;margin-top:5px;overflow-wrap:anywhere}
#gallery-grid .ars-gallery-geo{display:grid;gap:5px;margin-top:11px;padding-top:11px;border-top:1px solid rgba(231,206,173,.16);font-size:12px;line-height:1.45;color:#e3d4c3}
#gallery-grid .ars-gallery-detail{font-size:11px;line-height:1.45;color:#e3d4c3}
#gallery-grid .ars-gallery-place::before{content:"⌖";margin-right:6px;color:#d9ab7a}
#gallery-grid .ars-gallery-geo time{color:#c49c74;font-weight:650;font-size:11px}
@media(max-width:600px){
 #gallery-grid.gallery-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}
 #gallery-grid .project{border-radius:14px}
 #gallery-grid .project .project-visual{aspect-ratio:1.04}
 #gallery-grid .project-meta{padding:10px 10px 13px}
 #gallery-grid .project-meta>span{font-size:9px;letter-spacing:.03em}
 #gallery-grid .project-meta h3{font-size:12px;line-height:1.3}
 #gallery-grid .ars-gallery-geo{font-size:10px;gap:4px;margin-top:9px;padding-top:9px}
 #gallery-grid .ars-gallery-geo time{font-size:10px}
 #gallery-grid .ars-gallery-detail{font-size:10px;line-height:1.42}
}
</style>"""
assert html.count("</head>") == 1
html = html.replace("</head>", gallery_style + "\n</head>", 1)


# Mobile-friendly, two-column service cards (NOT just the separate photo gallery).
# Override the earlier mobile \`.service-grid{grid-template-columns:1fr}\` rule
# without touching gallery filtering, navigation, scripts or external pages.
service_style = """<style id="arsenal-services-grid-2up-20261107">
#services .service-grid{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:clamp(10px,1.6vw,18px)!important;align-items:stretch}
#services .service-grid>.service-card,#services .service-grid>.service-card.wide{grid-column:auto!important;min-width:0}
@media(max-width:680px){
 #services .wrap{padding-left:clamp(12px,3.8vw,20px);padding-right:clamp(12px,3.8vw,20px)}
 #services .service-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:10px!important}
 #services .service-grid>.service-card,#services .service-grid>.service-card.wide{min-height:255px!important;padding:14px 10px 13px!important;border-radius:16px!important;grid-column:auto!important;display:flex;flex-direction:column;justify-content:flex-end}
 #services .service-card .num{top:9px!important;left:9px!important;max-width:calc(100% - 46px);padding:6px 7px!important;font-size:8.5px!important;line-height:1.25;letter-spacing:.015em!important;border-radius:12px!important;overflow-wrap:anywhere;white-space:normal}
 #services .service-card .circle{top:9px!important;right:9px!important;width:29px!important;height:29px!important;border-radius:10px!important;font-size:16px!important}
 #services .service-card h3{font-size:clamp(14px,3.8vw,18px)!important;line-height:1.13!important;letter-spacing:-.035em!important;margin:0 0 8px!important;overflow-wrap:anywhere;hyphens:auto}
 #services .service-card p{font-size:clamp(10px,2.7vw,12px)!important;line-height:1.38!important;max-width:100%;overflow-wrap:anywhere}
}
@media(max-width:359px){
 #services .service-grid>.service-card,#services .service-grid>.service-card.wide{min-height:272px!important;padding:12px 8px!important}
 #services .service-card .num{font-size:8px!important}
 #services .service-card h3{font-size:13px!important}
 #services .service-card p{font-size:10px!important}
}
</style>"""
assert html.count("</head>")==1
html = html.replace("</head>", service_style + "\n</head>", 1)

# Force the actual shipping DOM grid to two columns as well, independently of
# browser cache or earlier mobile CSS in the original long-lived stylesheet.
# Both declarations carry !important and every card (including 'wide') has an
# explicit grid-column override. The service links and content are unchanged.
grid_original = '<div class="service-grid">'
grid_published = (
    '<div class="service-grid" data-arsenal-grid="2up-r2" '
    'style="display:grid!important;'
    'grid-template-columns:repeat(2,minmax(0,1fr))!important;'
    'gap:10px!important;align-items:stretch!important">'
)
assert html.count(grid_original) == 1, "Service grid count changed"
html = html.replace(grid_original, grid_published, 1)
assert html.count('class="service-card') == 11
html = re.sub(
    r'<a class="service-card([^"]*)"',
    lambda m: '<a class="service-card' + m.group(1) +
        '" style="grid-column:auto!important;min-width:0!important"',
    html
)
assert html.count('style="grid-column:auto!important;min-width:0!important"') == 11
assert html.count("</head>") == 1
html = html.replace(
    "</head>",
    '<meta name="arsenal-release" content="services-2up-captions-20261107-r2">\n</head>',
    1
)


# The carousel currently has sample *unverified* location/year values.
# Hide them until the owner provides real captions, without changing pictures,
# motion, carousel controls, or any other page behavior.
def published_showcase_js():
    js = (root / "assets/arsenal-showcase-v1.js").read_text(encoding="utf-8")
    js, count = re.subn(r"place:'[^']*',year:'20[0-9]{2}',", "place:'',year:'',", js)
    assert count == 6, f"Expected exactly 6 unverified case captions, got {count}"
    old_alt = "layer.alt='Пример карточки: '+item.title+'. '+label;"
    assert old_alt in js
    js = js.replace(old_alt, "layer.alt='Фотография конструкции: '+item.title;", 1)
    old_announce = "announce.textContent=item.title+'. '+item.place+'. '+item.year+'. Демонстрационные данные.';"
    assert old_announce in js
    js = js.replace(old_announce, "announce.textContent=item.title;", 1)
    old_sticker = (
        "if(!approved){\n"
        "  const sticker=document.createElement('span');sticker.className='ars-demo-label';sticker.textContent='Фото для примера';\n"
        "  card.appendChild(sticker);\n"
        " }"
    )
    assert old_sticker in js
    js = js.replace(old_sticker, "", 1)
    assert "Демонстрационные данные" not in js and "Фото для примера" not in js
    return js


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
# Build seven service galleries from the same cacheable images as the homepage.
service_pages = seo.service_files(html)
assert len(service_pages) == 7
assert all('href="./#contacts">Написать ↗</a>' in page for page in service_pages.values())
assert all('href="tel:+79082400998">Позвонить ↗</a>' in page for page in service_pages.values())
assert all('id="ars-glass-menu-toggle"' in page and 'id="ars-back-to-top"' in page for page in service_pages.values())
assert all('class="panel service-gallery"' in page for page in service_pages.values())
assert all('arsenal-photo-' in page or 'arsenal-fences-client.avif' in page for page in service_pages.values())

# The SEO pages must work even if REG.RU has a stale / missing assets folder.
# Inline the CSS before </head> and the JS after all HTML, so menus & SVGs
# can never appear as naked links / huge black icons on an updated page.
glass_css = (root / "assets/arsenal-glass-nav.css").read_text(encoding="utf-8")
glass_js = (root / "assets/arsenal-glass-nav.js").read_text(encoding="utf-8")
assert glass_css.count("{") == glass_css.count("}"), "Broken braces in shared nav stylesheet"
assert ".ars-glass-brand__mark{" in glass_css
assert ".ars-back-to-top svg{" in glass_css
assert ".ars-shared-footer .footer-studio{" in glass_css

def inline_shared_ui(page: str) -> str:
    css_link = '<link rel="stylesheet" href="./assets/arsenal-glass-nav.css?v=20261108a">'
    js_link = '<script defer src="./assets/arsenal-glass-nav.js?v=20261108a"></script>'
    if page.count(css_link) != 1 or page.count(js_link) != 1:
        raise RuntimeError("Missing or duplicated shared nav assets")
    page = page.replace(css_link,
                        '<style id="arsenal-shared-ui-critical">' + glass_css + '</style>', 1)
    page = page.replace(js_link, '', 1)
    page = page.replace('</body>',
                        '<script id="arsenal-shared-ui-script">' + glass_js + '</script></body>',1)
    assert page.count('id="arsenal-shared-ui-critical"') == 1
    assert page.count('id="arsenal-shared-ui-script"') == 1
    assert page.count('class="footer db-forge-footer ars-shared-footer"') == 1
    assert page.count('class="ars-back-to-top"') == 1
    return page

service_pages = {path: inline_shared_ui(page) for path, page in service_pages.items()}


# Release layout: cover -> approved 11 service cards -> trust -> approach ->
# consultation form. Photo catalogues are retained only on dedicated SEO pages.
# They must be assembled BEFORE removing the original gallery because the
# verified photograph provenance lives there in the source.
html, n_carousel = re.subn(
    r'\s*<!-- DEMO SHOWCASE:[\s\S]*?-->\s*<section class="ars-showcase"[\s\S]*?</section>',
    '\n', html, count=1)
assert n_carousel == 1, "Cannot safely locate duplicate showcase block"
html, n_gallery = re.subn(
    r'\s*<section class="gallery section" id="projects">[\s\S]*?</section>(?=\s*<div aria-hidden="true" class="lens-seam lens-seam-v10")',
    '\n', html, count=1)
assert n_gallery == 1, "Cannot safely locate duplicated home gallery"
# Remove decorative separator that referred to the deleted gallery.
html = html.replace(
    '<div aria-hidden="true" class="lens-seam lens-seam-v10"><span class="seam-line"></span><span class="seam-word">НАШИ РАБОТЫ</span><span class="seam-line"></span></div>',
    '', 1)
# Old standalone photo viewer has no purpose without the gallery.
html, n_lightbox = re.subn(
    r'<div aria-label="Просмотр фотографии" aria-modal="true" class="lightbox"[\s\S]*?</button></div>(?=\s*<script>)',
    '', html, count=1)
assert n_lightbox == 1, "Cannot safely remove obsolete gallery lightbox"
# Remove the old gallery filtering/zoom event handlers so the app initializer
# still runs (previously it would throw on absent #show-more / #gallery-grid).
html, n_gallery_handlers = re.subn(
    r"      const tabs=\[\.\.\.document\.querySelectorAll\('\.tab'\)\][\s\S]*?(?=// Arsenal contact form handled by embedded production Telegram integration\.)",
    '', html, count=1)
assert n_gallery_handlers == 1, "Cannot safely detach legacy gallery handlers"
html, n_gallery_animation = re.subn(
    r"\s*/\* Gallery filter: short, tactile bloom, including after 'show more'\. \*/[\s\S]*?(?=\s*document\.getElementById\('year'\)\.textContent)",
    '\n', html, count=1)
assert n_gallery_animation == 1, "Cannot safely detach gallery reveal handlers"
# Bottom dock remains a true three-way navigation without a dead "Works" link.
html = html.replace(
    "const activeSections=['services','projects','contacts'].map(id=>document.getElementById(id));",
    "const activeSections=['services','approach','contacts'].map(id=>document.getElementById(id));", 1)
html = html.replace('data-dock="projects" href="#projects"',
                    'data-dock="approach" href="#approach"', 1)
html = html.replace('<span>Работы</span></a>', '<span>О нас</span></a>', 1)
# Delete the now-duplicate 'Наши работы' item from both desktop and
# mobile menu. Keep the approved cover layout and all contact CTAs.
assert html.count('<a href="#projects">Наши работы</a>') == 2
html = html.replace('<a href="#projects">Наши работы</a>', '', 2)
html = html.replace('href="#projects">Смотреть работы',
                    'href="#services">Посмотреть услуги', 1)
# The other former gallery anchors refer to the service overview instead.
html = html.replace('href="#projects"', 'href="#services"')
# Remove unused showcase stylesheet/script tags but do NOT touch service
# photography: the approved cards now include those images statically.
html = re.sub(r'<link\b[^>]*arsenal-showcase-v1\.css[^>]*>', '', html, count=1)
html = re.sub(r'<script\b[^>]*arsenal-showcase-v1\.js[^>]*></script>', '', html, count=1)
# "О нас" is the compact dock label; its target is the real approach section.
assert 'data-dock="approach" href="#approach"' in html
assert html.index('class="hero"') < html.index('id="services"') < html.index('class="ars-trust"')
assert 'id="ars-showcase"' not in html and 'id="projects"' not in html
assert 'class="ars-seo-card"' not in html and 'id="ars-seo-title"' not in html
assert 'id="contact-form"' in html and 'id="arsenal-leads-inline-app"' in html
assert html.count('class="service-card') == 11
assert html.count('href="./navesy.html"') >= 2
for page_name in seo.PAGES:
    assert 'href="./' + page_name['file'] + '"' in html
assert "getElementById('show-more')" not in html
assert "getElementById('gallery-grid')" not in html
# Reclaim images used only by the now-deleted homepage gallery; keep all
# images referenced by the homepage's cards or the seven SEO galleries.
referenced = html + ''.join(service_pages.values())
inline_assets = {name: data for name, data in inline_assets.items()
                 if ('./' + name) in referenced or ('"' + name) in referenced}


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
   В обновлении старый демонстрационный обработчик формы удалён.
   Защита Turnstile и код доставки теперь встроены в index.html, чтобы
   форма не зависела от загрузки отдельного JS-файла.
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
   Яндекс.Метрика №109304299 и Вебвизор активируются только после\n   нового согласия пользователя (баннер v3). Данные полей формы маскируются.
   Для цели по реальным заявкам в кабинете Метрики необходимо создать
   «Целевое событие» с идентификатором arsenal_lead_delivered.
   Яндекс.Директ этим архивом НЕ запускается.
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
    add_public_file(z, 'arsenal-privacy.html', inline_shared_ui(seo.decorate_privacy((root / 'arsenal-privacy.html').read_text(encoding='utf-8'), html)))
    add_public_file(z, 'robots.txt', seo.robots())
    add_public_file(z, 'sitemap.xml', seo.sitemap())
    add_public_file(z, '.htaccess', seo.htaccess())
    for filename, page_html in service_pages.items():
        add_public_file(z, filename, page_html)
    for filename,content in sorted(inline_assets.items()):
        add_public_file(z, filename, content)
    for p in sorted(chosen):
        rel = p.relative_to(root).as_posix()
        if rel == "assets/arsenal-showcase-v1.js":
            add_public_file(z, rel, published_showcase_js())
        else:
            z.write(p, rel)

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
