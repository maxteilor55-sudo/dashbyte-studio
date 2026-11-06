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
    cards = "".join(
      '<a href="./' + p["file"] + '"><span>' + escape(p["name"]) +
      '</span><span aria-hidden="true">↗</span></a>'
      for p in PAGES
    )
    section = (
      '\n<section class="ars-seo-services" aria-labelledby="ars-seo-title">'
      '<div class="wrap"><p class="ars-seo-eyebrow">АРСЕНАЛ · ПЕРМЬ И ПЕРМСКИЙ КРАЙ</p>'
      '<h2 id="ars-seo-title">Подробнее о наших работах</h2>'
      '<p>Выберите направление, чтобы узнать, какие параметры нужны для расчёта '
      'металлоконструкции и что важно учесть перед заказом.</p>'
      '<nav class="ars-seo-grid" aria-label="Подробные страницы услуг">' + cards + '</nav>'
      '<p class="ars-seo-contact">Официальные реквизиты: ' + escape(COMPANY) +
      ' · ИНН 5904362275 · <a href="mailto:' + EMAIL + '">' + EMAIL +
      '</a></p></div></section>\n'
    )
    css = """<style id="arsenal-seo-styles">
    .ars-seo-services{padding:clamp(45px,7vw,95px) 0;background:linear-gradient(145deg,#1d1714,#29201c);border-top:1px solid #d2ae8055}
    .ars-seo-services .ars-seo-eyebrow{color:#d2ae80;font-size:11px;font-weight:800;letter-spacing:.18em}
    .ars-seo-services h2{font-size:clamp(28px,4.5vw,54px);line-height:1.1;letter-spacing:-.05em;margin:16px 0}
    .ars-seo-services p:not(.ars-seo-eyebrow){max-width:790px;color:#cdb9a7;font-size:15px;line-height:1.7}
    .ars-seo-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin:27px 0}
    .ars-seo-grid a{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:19px 20px;background:#ffffff0b;border:1px solid #ddbd9a45;border-radius:17px;color:#f1e9de;font-weight:700;font-size:14px;transition:background .2s,border-color .2s}
    .ars-seo-grid a:hover{background:#e2ba8b17;border-color:#ddbd9a}
    .ars-seo-grid a span:last-child{color:#dfb98d}
    .ars-seo-services .ars-seo-contact{font-size:12px!important}
    .ars-seo-services .ars-seo-contact a{color:#e8c399;text-decoration:underline;text-underline-offset:4px}
    @media(max-width:760px){.ars-seo-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
    @media(max-width:480px){.ars-seo-grid{grid-template-columns:1fr}.ars-seo-grid a{padding:15px 17px}}
    </style>"""
    html = html.replace("</head>", css + "</head>", 1)
    # The original closing main tag follows the contact form; preserve its code.
    html = html.replace("</main>", section + "</main>", 1)
    assert all(('href="./' + p["file"] + '"') in html for p in PAGES)
    return html

_CSS = """
:root{color-scheme:dark;--bg:#15110f;--surface:#302620;--bronze:#dbb38a;--ink:#f5ece3;--muted:#c8b6a5}
*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:radial-gradient(ellipse at 82% 0%,#7d543726,transparent 40%),var(--bg);color:var(--ink);font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;line-height:1.75}
a{color:inherit}a:focus-visible{outline:2px solid var(--bronze);outline-offset:4px} .wrap{width:min(1080px,calc(100% - 36px));margin:auto}
header{position:sticky;top:12px;z-index:9;margin-top:12px;display:flex;align-items:center;justify-content:space-between;gap:12px;background:#322822eb;border:1px solid #eccba740;backdrop-filter:blur(20px);border-radius:21px;padding:13px 17px}
.brand{font-size:18px;letter-spacing:.1em;font-weight:900;text-decoration:none}.brand span{color:var(--bronze)}header nav{display:flex;gap:12px}header nav a{font-size:13px;text-decoration:none;color:#e1cfbd}
main{padding-bottom:60px}.hero{padding:68px 0 38px}.eyebrow{letter-spacing:.2em;font-size:11px;font-weight:800;color:var(--bronze)}
h1{font-size:clamp(38px,7vw,76px);line-height:1.05;letter-spacing:-.065em;max-width:930px;margin:15px 0 24px}
.lead{font-size:clamp(16px,2.1vw,20px);color:#d6c3b3;max-width:850px}
.hero-actions{display:flex;flex-wrap:wrap;gap:12px;margin-top:28px}.btn{display:inline-flex;align-items:center;justify-content:center;padding:13px 20px;background:var(--bronze);color:#211914;font-size:13px;font-weight:800;text-decoration:none;border:1px solid var(--bronze);border-radius:999px}.btn.ghost{color:#f5e4d3;background:transparent}
h2{font-size:clamp(26px,3vw,39px);letter-spacing:-.04em;line-height:1.15;margin:0 0 20px}
.panel{background:linear-gradient(135deg,#362920,#221b17);border:1px solid #f2c99e36;border-radius:22px;padding:clamp(22px,4vw,35px);margin-top:22px}.panel p{color:#d6c3b3}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
.item{background:#ffffff09;border:1px solid #e3c5a828;border-radius:16px;padding:20px}.item h3{font-size:18px;margin:0 0 8px}.item p{font-size:14px;margin:0}
details{padding:15px 0;border-bottom:1px solid #ffffff20}summary{font-weight:800;cursor:pointer}details p{font-size:14px;margin:10px 0 0}
.links{display:flex;flex-wrap:wrap;gap:9px}.links a{text-decoration:none;border:1px solid #e3c5a845;border-radius:12px;padding:9px 12px;background:#ffffff0b;font-size:13px}
footer{border-top:1px solid #e4b88e31;padding:28px 0 50px;font-size:12px;color:#cdb9a7}footer a{color:#e6be94}footer .row{display:flex;gap:9px 25px;flex-wrap:wrap}
@media(max-width:650px){header{padding:11px 13px}header nav{gap:8px}header nav a{font-size:11px}.hero{padding-top:48px}.grid{grid-template-columns:1fr}}
"""

def make_service_page(p: dict) -> str:
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
<script defer src="./assets/arsenal-compliance.js?v=20261107w"></script>
<style>{_CSS}</style></head>
<body><div class="wrap"><header><a class="brand" href="./">А<span>РСЕНАЛ</span></a><nav aria-label="Главная навигация"><a href="./#services">Услуги</a><a href="./#projects">Наши работы</a><a href="./arsenal-privacy.html">Политика</a></nav></header>
<main><div class="hero"><div class="eyebrow">МЕТАЛЛОКОНСТРУКЦИИ / ПЕРМЬ И ПЕРМСКИЙ КРАЙ</div>
<h1>{escape(p['heading'])}</h1><p class="lead">{escape(p['lead'])}</p>
<div class="hero-actions"><a class="btn" href="tel:{TEL}">Обсудить проект ↗</a><a class="btn ghost" href="./#projects">Смотреть работы</a></div></div>
<section class="panel" aria-labelledby="solutions"><h2 id="solutions">Какие решения обсуждаем</h2><div class="grid">{pieces}</div></section>
<section class="panel" aria-labelledby="details"><h2 id="details">Что потребуется для расчёта</h2><p>{escape(p['details'])}</p>
<p>Стоимость и сроки обсуждаются индивидуально после уточнения объёма работ, материалов и условий монтажа. На сайте не публикуются непроверенные фиксированные цены.</p></section>
<section class="panel" aria-labelledby="faq"><h2 id="faq">Частые вопросы</h2>{faqs}</section>
<section class="panel" aria-labelledby="other"><h2 id="other">Другие направления Арсенала</h2>
<nav class="links" aria-label="Другие услуги">{siblings}</nav>
<p>Работаем с запросами из Перми и Пермского края. Для первичной консультации позвоните по телефону <a href="tel:{TEL}">{PHONE}</a> или напишите на <a href="mailto:{EMAIL}">{EMAIL}</a>.</p></section>
</main><footer><div class="row"><span>© 2026 Арсенал · {escape(COMPANY)}</span><span>ИНН 5904362275</span><a href="./arsenal-privacy.html">Политика конфиденциальности</a><a href="./">На главную</a></div>
<div>Юридический адрес: {escape(ADDRESS)}. Адрес не обозначает место приёма клиентов.</div></footer></div></body></html>
"""

def service_files() -> dict:
    return {p["file"]: make_service_page(p) for p in PAGES}

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
