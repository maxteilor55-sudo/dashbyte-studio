"""Open Graph and social card metadata for the REG.RU Arsenal release.

The image URL is an absolute HTTPS URL: Telegram, MAX and social crawlers
do not resolve relative paths reliably. Preserve canonical and original SEO
metadata; replace ONLY existing og:* / twitter:* meta to avoid duplicates.
"""
from html import escape
import re

SITE = "https://navesy59.ru"
IMAGE = SITE + "/assets/arsenal-social-share.jpg?v=20261109social1"

def apply(doc: str, *, title: str, description: str, url: str) -> str:
    assert doc.count("</head>") == 1, "The page has no unique HTML head"
    assert url.startswith(SITE + "/"), "Invalid Arsenal public page URL"

    def remove_social_tag(match):
        tag = match.group(0)
        if re.search(r'\b(?:name|property)\s*=\s*["\'](?:og:|twitter:)', tag,
                     flags=re.I):
            return ""
        return tag

    doc = re.sub(r"<meta\b[^>]*>", remove_social_tag, doc, flags=re.I | re.S)
    title = escape(title, quote=True)
    description = escape(description, quote=True)
    url = escape(url, quote=True)
    image = escape(IMAGE, quote=True)
    og = f"""
<meta property="og:type" content="website">
<meta property="og:locale" content="ru_RU">
<meta property="og:site_name" content="АРСЕНАЛ">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{description}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{image}">
<meta property="og:image:secure_url" content="{image}">
<meta property="og:image:type" content="image/jpeg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="АРСЕНАЛ — металл, форма, характер. Изготовление металлоконструкций в Перми.">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{title}">
<meta name="twitter:description" content="{description}">
<meta name="twitter:image" content="{image}">
<meta name="twitter:image:alt" content="АРСЕНАЛ — навесы, гаражи и металлоконструкции в Перми">
"""
    doc = doc.replace("</head>", og + "\n</head>", 1)
    assert doc.count('property="og:image"') == 1
    assert doc.count('name="twitter:card"') == 1
    return doc
