#!/usr/bin/env python3
"""Human-first SEO for the independent, production REG.RU Arsenal package.

No invented prices, customer reviews, awards, years of experience or guarantees.
This module deliberately operates only on the *packaged* HTML, leaving the
original approved visual source untouched.
"""
from datetime import date
from html import escape
from pathlib import Path
import json
import re

BASE = "https://navesy59.ru"
BRAND = "Арсенал"
COMPANY = 'ООО «ТД АРСЕНАЛ»'
EMAIL = "2863637@gmail.com"
PHONE = "+7 (908) 240-09-98"
TEL = "+79082400998"
ADDRESS = "614025, Пермский край, г. Пермь, ул. Героев Хасана, д. 68, офис 8"

PAGES = [
    {
      "file": "navesy.html", "name": "Навесы", "heading": "Навесы на заказ в Перми",
      "title": "Навесы для автомобилей и дома на заказ в Перми | Арсенал",
      "description": "Изготовление и монтаж металлических навесов в Перми и Пермском крае: для автомобилей, дома и хозяйственных зон. Расчёт по параметрам объекта.",
      "lead": "Металлический навес помогает организовать защищённую зону для автомобиля, прохода к дому или хозяйственных задач. Конструкция подбирается под размеры площадки, способ примыкания и условия установки.",
      "points": [
          ("Для автомобиля", "Разбираем размещение одной или нескольких машин, удобный въезд и высоту под конкретный транспорт."),
          ("Односкатные и арочные", "Форма крыши зависит от архитектуры участка, желаемого вида и характеристик пролёта."),
          ("Пристроенные и отдельно стоящие", "Учитываем место опор, доступ к зданию, водоотведение и расположение существующих коммуникаций."),
          ("Навесы с хозблоком", "Можно обсудить совмещение укрытия и зоны хранения в рамках одного проекта.")
      ],
      "details": "Для предварительного расчёта полезны ширина, длина и высота, фото места установки, населённый пункт, назначение навеса и предпочтения по кровле. После уточнения исходных данных можно согласовать конструктивное решение и смету.",
      "faq": [
          ("Какой навес выбрать: арочный или односкатный?", "Выбор зависит от габаритов, дизайна участка, предполагаемой нагрузки и способа отвода воды. Окончательное решение принимают после оценки проекта."),
          ("Можно ли сделать навес по индивидуальным размерам?", "Да, параметры и конфигурацию обсуждают применительно к месту установки и требованиям заказчика.")
      ]
    },
    {
      "file": "garazhi.html", "name": "Гаражи", "heading": "Металлические гаражи в Перми",
      "title": "Гаражи из сэндвич-панелей и металлокаркаса в Перми | Арсенал",
      "description": "Металлические гаражи и гаражи из сэндвич-панелей в Перми: каркас, варианты обшивки, проёмов и ворот. Обсуждение проекта и расчёт стоимости.",
      "lead": "Гараж проектируют исходя из размеров машины, требований к хранению и особенностей участка. Важны ширина ворот, внутренние габариты, удобство движения и выбранный тип ограждающих конструкций.",
      "points": [
          ("Гаражи из сэндвич-панелей", "Вариант со стеновыми панелями для объектов, где нужны определённые характеристики ограждения."),
          ("Каркасные металлические гаражи", "Металлокаркас служит основой конструкции; наружную отделку выбирают под задачу и бюджет."),
          ("Холодные варианты", "Для задач без постоянного отопления обсуждают конструкцию и состав ограждений с учётом эксплуатации."),
          ("Ворота и входная дверь", "Планируем проёмы с учётом размеров транспорта и расположения гаража.")
      ],
      "details": "На старте пригодятся размеры автомобиля, желаемые внешние габариты гаража, фотографии участка, информация об основании, тип ворот и населённый пункт. Для корректной сметы уточняются материалы и условия монтажа.",
      "faq": [
          ("Чем отличаются гараж из сэндвич-панелей и холодный металлический?", "Основное различие связано с конструкцией и теплоизоляционными характеристиками ограждения. Конкретный состав определяется задачей."),
          ("Можно ли предусмотреть отдельную входную дверь?", "Да, размещение двери и ворот учитывают при согласовании проекта.")
      ]
    },
    {
      "file": "lestnicy.html", "name": "Лестницы", "heading": "Металлические лестницы в Перми",
      "title": "Металлические и пожарные лестницы в Перми | Арсенал",
      "description": "Изготовление металлических лестниц, наружных лестничных конструкций и ограждений в Перми. Подбор решения по размерам и назначению.",
      "lead": "Металлическая лестница должна быть удобной в использовании и подходить к условиям объекта. Перед изготовлением важно согласовать высоту подъёма, геометрию, площадки, ограждения и особенности крепления.",
      "points": [
          ("Наружные лестницы", "Рассматриваем доступ к входам, хозяйственным помещениям и наружным уровням здания."),
          ("Лестничные каркасы", "Металлическая основа подбирается под геометрию площадки и будущую отделку."),
          ("Пожарные лестницы", "Такие решения требуют учёта профильных требований, проектной документации и применимых норм безопасности."),
          ("Перила и ограждения", "Обсуждаем совместное изготовление лестничной конструкции и защитных элементов.")
      ],
      "details": "Для обсуждения укажите назначение лестницы, высоту между уровнями, размеры доступного пространства, фотографии объекта и сведения об основании для крепления. Без этих данных не стоит обещать точную стоимость или сроки.",
      "faq": [
          ("Можно ли изготовить лестницу для улицы?", "Да, при проектировании учитываются условия эксплуатации, размеры и необходимость защитного покрытия."),
          ("Делаете ли пожарные лестницы?", "Этот вид металлоконструкций заявлен в перечне работ. Соответствие конкретного решения обязательным требованиям проверяется на стадии проекта.")
      ]
    },
    {
      "file": "ograzhdeniya.html", "name": "Ограждения и заборы", "heading": "Металлические ограждения и заборы",
      "title": "Металлические ограждения и заборы в Перми | Арсенал",
      "description": "Изготовление металлических ограждений, заборов и перил в Перми и Пермском крае. Индивидуальные размеры, конструкция и условия установки.",
      "lead": "Ограждение должно отвечать назначению территории: обозначать границу, обеспечивать безопасность проходов или завершать архитектуру объекта. Выбор зависит от места монтажа и требований к внешнему виду.",
      "points": [
          ("Заборы и секции", "Уточняем общую длину, высоту, тип секций и условия размещения стоек."),
          ("Ограждения территории", "Подбираем решения для частных участков, хозяйственных и других объектов."),
          ("Перила и поручни", "Для лестниц и площадок важны удобство, высота, крепления и условия эксплуатации."),
          ("Нестандартные секции", "Можно обсудить индивидуальные габариты и рисунок металлоконструкции.")
      ],
      "details": "Для предварительного расчёта пригодятся длина и высота ограждения, фото участка, описание основания, желаемый внешний вид, схема размещения и адрес монтажа. Окончательные параметры уточняются при согласовании.",
      "faq": [
          ("Можно ли заказать ограждение по своим размерам?", "Да, размеры и расположение элементов определяются индивидуально."),
          ("От чего зависит стоимость?", "От длины, высоты, сложности секций, металлоёмкости, покрытия и условий монтажа.")
      ]
    },
    {
      "file": "terrasy.html", "name": "Террасы", "heading": "Металлокаркасы террас в Перми",
      "title": "Металлические террасы и каркасы в Перми | Арсенал",
      "description": "Металлические каркасы террас и навесы для зон отдыха в Перми и Пермском крае. Проект под размеры участка и особенности дома.",
      "lead": "Терраса соединяет дом и участок, поэтому важны не только внешний вид, но и организация прохода, уровень настила, размещение опор и защита зоны отдыха от осадков.",
      "points": [
          ("Каркасы террас", "Обсуждаем металлическую основу, размеры и точки опирания."),
          ("Навесы над террасами", "Подбираем расположение кровли, уклон и связь с существующим фасадом."),
          ("Примыкание к дому", "Учитываем особенности здания, водоотвод и доступ к дверным проёмам."),
          ("Перила и дополнительные элементы", "Можно согласовать ограждения как часть общего проекта.")
      ],
      "details": "Укажите желаемые размеры, высоту относительно земли, фото фасада и участка, назначение террасы, необходимость навеса и населённый пункт. Состав конструкций определяется после обсуждения технических условий.",
      "faq": [
          ("Можно ли сделать каркас для террасы у существующего дома?", "Такая возможность зависит от места установки и особенностей опирания. Решение требует проверки исходных условий."),
          ("Обязательно ли делать навес?", "Нет. Каркас и навес обсуждаются отдельно, исходя из способа использования площадки.")
      ]
    },
    {
      "file": "vhodnye-gruppy.html", "name": "Входные группы", "heading": "Входные группы и козырьки",
      "title": "Металлические входные группы и козырьки в Перми | Арсенал",
      "description": "Металлические входные группы, козырьки над крыльцом и лестничные элементы в Перми. Изготовление по параметрам объекта и монтаж.",
      "lead": "Входная группа объединяет функциональные элементы у входа в здание: площадку, ступени, ограждения и козырёк. Конкретный набор определяется условиями объекта.",
      "points": [
          ("Козырьки над входом", "Рассматриваем размеры, крепление, отвод воды и сочетаемость с фасадом."),
          ("Металлические лестничные элементы", "Для входных ступеней и площадок важны высота и организация движения."),
          ("Перила и поручни", "Уточняем расположение опор, форму и требования к безопасности."),
          ("Комплексное оформление", "Можно обсудить несколько металлических элементов входной зоны в едином стиле.")
      ],
      "details": "Для обсуждения проекта полезны фотографии входа, размеры проёма, высота цоколя, предполагаемый вылет козырька, ограничения по креплению и населённый пункт.",
      "faq": [
          ("Можно ли установить козырёк на готовое здание?", "Возможность зависит от характеристик стены и выбранной схемы крепления."),
          ("Можно ли совместить козырёк с перилами?", "Да, элементы можно рассмотреть в одном проекте, если это соответствует условиям объекта.")
      ]
    },
    {
      "file": "svarka.html", "name": "Сварочные работы", "heading": "Сварочные работы и металлокаркасы",
      "title": "Сварочные работы и металлоконструкции в Перми | Арсенал",
      "description": "Сварочные работы, изготовление металлических каркасов и конструкций под заказ в Перми. Уточнение задачи, габаритов и условий монтажа.",
      "lead": "Сварочные работы часто становятся частью изготовления каркасов, навесов, лестниц и других металлоконструкций. Для оценки задачи важно понимать назначение изделия, размеры и условия установки.",
      "points": [
          ("Металлические каркасы", "Конструкции для навесов, гаражей и других объектов, входящих в перечень работ."),
          ("Соединение элементов", "Состав и технология соединений зависят от конструкции и требований к изделию."),
          ("Индивидуальные конструкции", "Обсуждаем нестандартные размеры и конфигурации по эскизу или описанию задачи."),
          ("Монтаж готовых элементов", "Уточняем место работ, точки крепления и доступность площадки.")
      ],
      "details": "Для расчёта отправьте чертёж или фото аналогичного изделия, размеры, предполагаемые материалы, сведения о нагрузках (если известны) и место выполнения работ. Технические решения уточняются до начала изготовления.",
      "faq": [
          ("Можно ли обратиться с эскизом?", "Да, эскиз или фотография с размерами помогут начать обсуждение."),
          ("Есть ли фиксированная цена на все сварочные работы?", "Нет, стоимость зависит от объёма, сложности, материалов и условий.")
      ]
    }
]

def _json(data):
    return json.dumps(data, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")

def _org():
    return {
        "@type": "Organization",
        "name": COMPANY, "legalName": "Общество с ограниченной ответственностью «ТД АРСЕНАЛ»",
        "url": BASE + "/", "telephone": TEL, "email": EMAIL,
        "taxID": "5904362275",
        "address": {"@type": "PostalAddress", "streetAddress": "ул. Героев Хасана, д. 68, офис 8",
                    "addressLocality": "Пермь", "addressRegion": "Пермский край",
                    "postalCode": "614025", "addressCountry": "RU"},
        "areaServed": [{"@type": "Place", "name": "Пермь"},
                       {"@type": "AdministrativeArea", "name": "Пермский край"}]
    }


# Reuse photographs already displayed on the Arsenal website. All numbers are
# one-based positions in the original 33-photo gallery.
PHOTO_SELECTIONS = {
    "navesy.html": [12, 13, 10, 25, 8, 33],
    "garazhi.html": [5, 4, 21, 27, 1, 29],
    "lestnicy.html": [23, 24, "fire"],
    "ograzhdeniya.html": ["fence", 23, 24],
    "terrasy.html": [8, 33, 17],
    "vhodnye-gruppy.html": [24, 23, 6, 7],
    "svarka.html": [9, 18, 19, 20],
}
EXTRA_PHOTOS = {
    "fire": {"src": "./assets/arsenal-fire-stairs-client.avif",
             "alt": "Наружная металлическая пожарная лестница с площадкой и ограждением",
             "label": "Наружная пожарная лестница", "place": "", "date": ""},
    "fence": {"src": "./assets/arsenal-fences-client.avif",
              "alt": "Металлические ограждения и заборы рядом с жилым домом",
              "label": "Металлические ограждения и заборы", "place": "", "date": ""},
}
def _photo_catalog(html: str) -> list:
    """Extract the existing gallery's pictures and verified MAX captions."""
    projects = re.findall(r'<article class="project"[\s\S]*?</article>', html)
    if len(projects) != 33:
        raise RuntimeError(f"Unexpected gallery photo count: {len(projects)}")
    items = []
    for number, card in enumerate(projects, 1):
        img = re.search(r'<img\b[^>]*\bsrc="([^"]+)"', card)
        title = re.search(r'\bdata-title="([^"]+)"', card)
        alt = re.search(r'\bdata-alt="([^"]+)"', card)
        place = re.search(r'<span class="ars-gallery-place">([^<]+)</span>', card)
        date = re.search(r'<time\b[^>]*>([^<]+)</time>', card)
        if not img or not title or not alt:
            raise RuntimeError(f"Missing media information on project {number}")
        items.append({"src": img.group(1), "label": title.group(1),
                      "alt": alt.group(1), "place": place.group(1) if place else "",
                      "date": date.group(1) if date else ""})
    return items

def _media_for(p: dict, catalog: list) -> list:
    return [dict(EXTRA_PHOTOS[k]) if isinstance(k, str) else dict(catalog[k-1])
            for k in PHOTO_SELECTIONS[p["file"]]]

def _media_caption(item: dict) -> str:
    if item["place"] and item["date"]:
        return item["place"] + " · " + item["date"]
    return item["label"]

def patch_homepage(html: str) -> str:
    if len(html) < 1_000_000 or "</head>" not in html or "</main>" not in html:
        raise RuntimeError("Refusing to SEO-patch incomplete client HTML")
    title = "Навесы, гаражи и металлоконструкции в Перми — Арсенал"
    desc = ("Изготовление и монтаж металлических навесов, гаражей из сэндвич-панелей, "
            "лестниц, ограждений и террас в Перми и Пермском крае. Примеры работ и расчёт.")
    html, n_title = re.subn(r"<title>.*?</title>", "<title>" + escape(title) + "</title>",
                            html, count=1, flags=re.I | re.S)
    if n_title != 1:
        raise RuntimeError("Missing title")
    # Existing template puts the description before the large style block.
    html, n_desc = re.subn(r'<meta\s+content="[^"]*"\s+name="description"\s*/?>',
                           '<meta name="description" content="' + escape(desc, quote=True) + '">',
                           html, count=1, flags=re.I)
    if n_desc != 1:
        raise RuntimeError("Missing original home description")
    seo = {
      "@context": "https://schema.org",
      "@graph": [
        {"@type": "WebSite", "name": "Арсенал — металлоконструкции", "url": BASE + "/",
         "inLanguage": "ru-RU", "publisher": {"@id": BASE + "/#organization"}},
        {"@id": BASE + "/#organization", **_org()},
      ]
    }
    head = (
      '\n<!-- Arsenal SEO: original content and verified organization data -->\n'
      '<meta name="robots" content="index,follow,max-image-preview:large">\n'
      '<meta name="keywords" content="навесы Пермь, гаражи из сэндвич-панелей Пермь, '
      'металлоконструкции Пермь, изготовление лестниц, ограждения, заборы, '
      'террасы, входные группы, сварочные работы">\n'
      '<script type="application/ld+json">' + _json(seo) + '</script>\n'
    )
    html = html.replace("</head>", head + "</head>", 1)
    # The approved 11 photographic cards in "КОНСТРУКЦИИ, КОТОРЫЕ РАБОТАЮТ"
    # are the ONLY service entry point on the home page. No second SEO
    # catalogue, no duplicate carousel. Several variants share a deeper page.
    catalog = _photo_catalog(html)
    destinations = [
        "navesy.html", "garazhi.html", "navesy.html",
        "vhodnye-gruppy.html", "svarka.html", "terrasy.html",
        "ograzhdeniya.html", "ograzhdeniya.html",
        "lestnicy.html", "lestnicy.html", "svarka.html",
    ]
    sample_photos = {
        "garage": EXTRA_PHOTOS.get("garage", {
            "src": "./assets/arsenal-garage-client.avif",
            "alt": "Гараж с облицовкой под дерево и тёмными воротами"}),
        "terrace": catalog[7],   # Navес near a house, related terrace roof example
        "fence": EXTRA_PHOTOS["fence"],
        "rail": catalog[23],     # Entrance stairs and steel handrails
        "stairs": catalog[22],   # Actual metal staircase and landing
        "fire": EXTRA_PHOTOS["fire"],
        "welding": catalog[8],   # Welded steel frame
    }
    card_number = 0

    def service_card(match):
        nonlocal card_number
        card_number += 1
        if card_number > len(destinations):
            raise RuntimeError("Unexpected number of Arsenal service cards")
        card = match.group(0)
        card, count = re.subn(r'href="(?:#projects|#contacts)"',
                              'href="./' + destinations[card_number-1] + '"',
                              card, count=1)
        if count != 1:
            raise RuntimeError(f"Missing original link on service card {card_number}")
        card = re.sub(r'\sdata-filter-target="[^"]+"', '', card, count=1)
        sample_match = re.search(r'\sdata-ars-sample="([^"]+)"', card)
        if sample_match:
            kind = sample_match.group(1)
            photo = sample_photos[kind]
            card = card.replace(sample_match.group(0), "", 1)
            new_image = ('<img src="' + escape(photo["src"], quote=True) +
                         '" alt="' + escape(photo["alt"], quote=True) +
                         '" loading="lazy" decoding="async">')
            image = re.search(r'<img\b[^>]*>', card, flags=re.S)
            if image:
                card = card[:image.start()] + new_image + card[image.end():]
            else:
                first_tag_end = card.index(">")
                card = card[:first_tag_end+1] + new_image + card[first_tag_end+1:]
            card = re.sub(r'<span class="ars-card-glyph"[^>]*>.*?</span>',
                          '', card, count=1, flags=re.S)
            card = card.replace('ars-text-card', 'ars-photo-card', 1)
        return card

    html = re.sub(r'<a class="service-card[^>]*>[\s\S]*?</a>',
                  service_card, html)
    if card_number != 11:
        raise RuntimeError(f"Expected 11 original service cards; got {card_number}")
    # The same existing high quality visual cards now lead to indexed URLs.
    assert all('href="./' + p["file"] + '"' in html for p in PAGES)
    return html


_ARS_NAV_ASSETS = (
    '<link rel="stylesheet" href="./assets/arsenal-glass-nav.css?v=20261108a">\n'
    '<script defer src="./assets/arsenal-glass-nav.js?v=20261108a"></script>\n'
)
def shared_header(home: str, inner_page: bool = True) -> str:
    """Exact same premium header and mobile flyout as production homepage."""
    hit = re.search(
        r'(<header class="site-header" id="top">[\s\S]*?</header>[\s\S]*?'
        r'<div class="mobile-menu site-mobile-flyout" id="mobile-menu">'
        r'[\s\S]*?)(?=<div aria-hidden="true" class="read-progress">)',
        home
    )
    if not hit:
        raise RuntimeError("Cannot locate canonical Arsenal homepage header")
    nav=hit.group(1).strip().replace('<a href="#projects">Наши работы</a>','')
    if inner_page:
        nav=nav.replace('href="#top"','href="./"')
        for anchor in ('services','approach','contacts'):
            nav=nav.replace('href="#'+anchor+'"','href="./#'+anchor+'"')
    assert nav.count('id="menu-toggle"')==1 and nav.count('id="mobile-menu"')==1
    return nav


_ARS_SUBPAGE_ACTIONS = f"""<nav class="ars-service-dock" aria-label="Связаться с Арсеналом">
<a href="./#contacts">Написать ↗</a><a href="tel:{TEL}">Позвонить ↗</a></nav>
<a class="ars-back-to-top" id="ars-back-to-top" href="#top" aria-label="Наверх"
 title="Наверх"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 14 7-7 7 7M12 7v13"/></svg></a>"""

def shared_footer(home: str) -> str:
    """Compact, line-free legal footer for SEO and policy pages."""
    assert '<footer class="footer db-forge-footer"' in home
    return """<footer class="ars-legal-footer" aria-label="Юридическая информация Арсенала">
<div class="ars-legal-footer__inner">
<p class="ars-legal-footer__brand">АРСЕНАЛ <span>· МЕТАЛЛОКОНСТРУКЦИИ</span></p>
<p class="ars-legal-footer__details">© 2026 · ООО «ТД АРСЕНАЛ» · ИНН 5904362275
<br>Изготовление и монтаж металлоконструкций · Пермь и Пермский край</p>
<nav class="ars-legal-footer__links" aria-label="Ссылки внизу страницы">
<a href="./">На главную</a>
<a href="./arsenal-privacy.html">Политика конфиденциальности</a>
<a href="https://t.me/DashByteStudioBot" target="_blank" rel="noopener noreferrer">Сделано DashByte ↗</a>
</nav></div></footer>"""


def decorate_privacy(html: str, home: str) -> str:
    """Give the legal page the same header and back-to-top as SEO pages."""
    if '<body>' not in html or '<header class="top">' not in html:
        raise RuntimeError("Expected original legal page layout")
    html, count = re.subn(r'<header class="top">[\s\S]*?</header>', '', html, count=1)
    if count != 1:
        raise RuntimeError("Could not replace legacy policy header")
    html = html.replace('<body>', '<body class="ars-policy-page">\n' + shared_header(home), 1)
    html = html.replace('</head>', _ARS_NAV_ASSETS + '</head>', 1)
    html, old_footer = re.subn(r'<footer class="foot">[\s\S]*?</footer>', '', html, count=1)
    if old_footer != 1:
        raise RuntimeError("Old policy footer missing")
    html = html.replace('</body>', shared_footer(home) + _ARS_SUBPAGE_ACTIONS + '</body>', 1)
    assert 'id="menu-toggle"' in html and 'ars-back-to-top' in html
    return html

_CSS = """
:root{color-scheme:dark;--bg:#15110f;--surface:#302620;--bronze:#dbb38a;--ink:#f5ece3;--muted:#c8b6a5}
*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:radial-gradient(ellipse at 82% 0%,#7d543726,transparent 40%),var(--bg);color:var(--ink);font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;line-height:1.75}
a{color:inherit}a:focus-visible{outline:2px solid var(--bronze);outline-offset:4px} .wrap{width:min(1080px,calc(100% - 36px));margin:auto}
main{padding-bottom:60px}.hero{padding:68px 0 38px}.eyebrow{letter-spacing:.2em;font-size:11px;font-weight:800;color:var(--bronze)}
h1{font-size:clamp(38px,7vw,76px);line-height:1.05;letter-spacing:-.065em;max-width:930px;margin:15px 0 24px}
.lead{font-size:clamp(16px,2.1vw,20px);color:#d6c3b3;max-width:850px}
.hero-actions{display:flex;flex-wrap:wrap;gap:12px;margin-top:28px}.btn{display:inline-flex;align-items:center;justify-content:center;padding:13px 20px;background:var(--bronze);color:#211914;font-size:13px;font-weight:800;text-decoration:none;border:1px solid var(--bronze);border-radius:999px}.btn.ghost{color:#f5e4d3;background:transparent}
h2{font-size:clamp(26px,3vw,39px);letter-spacing:-.04em;line-height:1.15;margin:0 0 20px}
.panel{background:linear-gradient(135deg,#362920,#221b17);border:1px solid #f2c99e36;border-radius:22px;padding:clamp(22px,4vw,35px);margin-top:22px}.panel p{color:#d6c3b3}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
.item{background:#ffffff09;border:1px solid #e3c5a828;border-radius:16px;padding:20px}.item h3{font-size:18px;margin:0 0 8px}.item p{font-size:14px;margin:0}
details{padding:15px 0;border-bottom:1px solid #ffffff20}summary{font-weight:800;cursor:pointer}details p{font-size:14px;margin:10px 0 0}
.links{display:flex;flex-wrap:wrap;gap:9px}.links a{text-decoration:none;border:1px solid #e3c5a845;border-radius:12px;padding:9px 12px;background:#ffffff0b;font-size:13px}

.service-gallery__intro p{font-size:13px;line-height:1.65;color:#cdb9a7;margin-top:-7px;margin-bottom:22px}
.service-photos{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:13px}
.service-photo{margin:0;min-width:0;background:#241d19;border:1px solid #e3c5a835;border-radius:16px;overflow:hidden}
.service-photo img{display:block;width:100%;aspect-ratio:1.12;object-fit:cover;background:#352922}
.service-photo figcaption{padding:12px 13px 14px;display:grid;gap:6px;color:#d6c3b3;line-height:1.4;font-size:12px}
.service-photo figcaption strong{color:#f5ece3;font-size:13px;font-weight:750}
.service-photo figcaption span{color:#d3ab86;font-size:11px}
.service-contact{margin-top:30px;border-color:#dab38880;background:linear-gradient(130deg,#3b2b22,#241a16)}
.service-contact__actions{display:flex;flex-wrap:wrap;gap:12px;margin-top:23px}
@media(max-width:760px){.service-photos{grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}}
@media(max-width:460px){.service-photo{border-radius:12px}.service-photo figcaption{padding:9px;font-size:11px}.service-photo figcaption strong{font-size:11px}.service-photo figcaption span{font-size:10px}.service-contact__actions{display:grid;grid-template-columns:1fr 1fr;gap:9px}.service-contact__actions .btn{font-size:12px;padding:12px 9px}}
footer{border-top:1px solid #e4b88e31;padding:28px 0 50px;font-size:12px;color:#cdb9a7}footer a{color:#e6be94}footer .row{display:flex;gap:9px 25px;flex-wrap:wrap}
@media(max-width:650px){.hero{padding-top:48px}.grid{grid-template-columns:1fr}}
"""

def make_service_page(p: dict, catalog: list, footer: str, header: str) -> str:
    u = BASE + "/" + p["file"]
    pieces = "".join(
       '<div class="item"><h3>' + escape(a) + '</h3><p>' + escape(b) + '</p></div>'
       for a, b in p["points"]
    )
    faqs = "".join(
       '<details><summary>' + escape(a) + '</summary><p>' + escape(b) + '</p></details>'
       for a,b in p["faq"]
    )
    siblings = "".join('<a href="./' + q["file"] + '">' + escape(q["name"]) + '</a>'
                       for q in PAGES if q["file"] != p["file"])
    photos = _media_for(p, catalog)
    figures = "".join(
        '<figure class="service-photo"><img src="' +
        escape(photo["src"], quote=True) + '" alt="' +
        escape(photo["alt"], quote=True) +
        '" loading="lazy" decoding="async"><figcaption><strong>' +
        escape(photo["label"]) + '</strong><span>' +
        escape(_media_caption(photo)) + '</span></figcaption></figure>'
        for photo in photos
    )
    gallery_title = ("Фотографии металлоконструкций" if p["file"] in
                     ("terrasy.html", "svarka.html") else "Фотографии наших работ")
    gallery_markup = (
        '<section class="panel service-gallery" aria-labelledby="photos">'
        '<div class="service-gallery__intro"><h2 id="photos">' +
        gallery_title + '</h2><p>Реальные фотографии из галереи Арсенала. '
        'Населённые пункты и даты указаны только там, где подтверждены.</p></div>'
        '<div class="service-photos">' + figures + '</div></section>'
    )
    data = {
      "@context": "https://schema.org",
      "@graph": [
        {"@type": "Service", "name": p["heading"], "description": p["description"],
         "url": u, "serviceType": p["name"],
         "areaServed": [{"@type": "Place", "name": "Пермь"},
                        {"@type": "AdministrativeArea", "name": "Пермский край"}],
         "provider": {"@type": "Organization", "name": COMPANY,
                      "url": BASE + "/", "telephone": TEL}},
        {"@type": "BreadcrumbList", "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "Главная", "item": BASE + "/"},
            {"@type": "ListItem", "position": 2, "name": p["name"], "item": u}
        ]}
      ]
    }
    return f"""<!doctype html>
<html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#15110f"><meta name="robots" content="index,follow,max-image-preview:large">
<title>{escape(p['title'])}</title>
<meta name="description" content="{escape(p['description'],quote=True)}">
<link rel="canonical" href="{u}">
<link rel="icon" type="image/x-icon" href="./favicon.ico">
<link rel="icon" type="image/svg+xml" href="./assets/arsenal-favicon.svg">
<meta property="og:type" content="website"><meta property="og:locale" content="ru_RU">
<meta property="og:title" content="{escape(p['title'],quote=True)}">
<meta property="og:description" content="{escape(p['description'],quote=True)}">
<meta property="og:url" content="{u}"><meta property="og:image" content="{BASE}/assets/arsenal-frame-updated-20261030.webp">
<script type="application/ld+json">{_json(data)}</script>
<link rel="stylesheet" href="./assets/arsenal-compliance.css?v=20261106m">
<script defer src="./assets/arsenal-compliance.js?v=20261107x"></script>
<style>{_CSS}</style>{_ARS_NAV_ASSETS}</head>
<body class="ars-service-page">{header}<div class="wrap">
<main><div class="hero"><div class="eyebrow">МЕТАЛЛОКОНСТРУКЦИИ / ПЕРМЬ И ПЕРМСКИЙ КРАЙ</div>
<h1>{escape(p['heading'])}</h1><p class="lead">{escape(p['lead'])}</p>
<div class="hero-actions"><a class="btn" href="tel:{TEL}">Обсудить проект ↗</a><a class="btn ghost" href="./#services">Смотреть услуги</a></div></div>
<section class="panel" aria-labelledby="solutions"><h2 id="solutions">Какие решения обсуждаем</h2><div class="grid">{pieces}</div></section>
{gallery_markup}
<section class="panel" aria-labelledby="details"><h2 id="details">Что потребуется для расчёта</h2><p>{escape(p['details'])}</p>
<p>Стоимость и сроки обсуждаются индивидуально после уточнения объёма работ, материалов и условий монтажа. На сайте не публикуются непроверенные фиксированные цены.</p></section>
<section class="panel" aria-labelledby="faq"><h2 id="faq">Частые вопросы</h2>{faqs}</section>
<section class="panel" aria-labelledby="other"><h2 id="other">Другие направления Арсенала</h2>
<nav class="links" aria-label="Другие услуги">{siblings}</nav>
<p>Работаем с запросами из Перми и Пермского края. Для первичной консультации позвоните по телефону <a href="tel:{TEL}">{PHONE}</a> или напишите на <a href="mailto:{EMAIL}">{EMAIL}</a>.</p></section>
<section class="panel service-contact" aria-labelledby="service-contact-title">
<h2 id="service-contact-title">Обсудим ваш проект?</h2>
<p>Расскажите, какая конструкция нужна. Мы уточним параметры и условия работы в Перми и Пермском крае.</p>
<div class="service-contact__actions"><a class="btn" href="./#contacts">Написать ↗</a><a class="btn ghost" href="tel:{TEL}">Позвонить ↗</a></div>
</section>
</main></div>{footer}{_ARS_SUBPAGE_ACTIONS}</body></html>
"""

def service_files(html: str) -> dict:
    catalog = _photo_catalog(html)
    footer = shared_footer(html)
    header=shared_header(html)
    return {p["file"]: make_service_page(p, catalog, footer, header) for p in PAGES}

def sitemap() -> str:
    from xml.sax.saxutils import escape as xesc
    urls = ["/"] + ["/" + p["file"] for p in PAGES] + ["/arsenal-privacy.html"]
    links = "".join(
        "<url><loc>" + xesc(BASE + path) + "</loc><lastmod>2026-11-05</lastmod></url>"
        for path in urls
    )
    return '<?xml version="1.0" encoding="UTF-8"?>\n' \
           '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' \
           + links + '</urlset>\n'

def robots() -> str:
    return "User-agent: *\nAllow: /\nSitemap: " + BASE + "/sitemap.xml\n"

def htaccess() -> str:
    return """# Canonical host and TLS: navesy59.ru (Apache/REG.RU)
DirectoryIndex index.html
Options -Indexes
<IfModule mod_rewrite.c>
RewriteEngine On
RewriteCond %{HTTP_HOST} ^www\\.navesy59\\.ru$ [NC,OR]
RewriteCond %{HTTPS} !=on
RewriteRule ^ https://navesy59.ru%{REQUEST_URI} [R=301,L,NE]
</IfModule>
"""
