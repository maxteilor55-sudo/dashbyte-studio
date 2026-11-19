ART-AVTO V17 · TELEGRAM SHOWROOM + NEW VEHICLES

# ART-AVTO — OPAL PRISM v9 · ORIGINAL RED COLORWAY (17 ноября 2026)

**Исходный дизайн v8 без изменений зафиксирован в GitHub:** ветка `art-avto-opal-prism-v8-frozen`, коммит `cb99a6713dbd959a72210811b57cf37d5afc8b16`.

**Действующая версия v9:** неизменные структура ATLAS, OPAL PRISM full-screen glass menu и анимация бургера в крестик; изменены только цвета. Палитра из первой версии ART-AVTO: фон `#080a0d`, красный `#f0444f`, металлический белый `#f6f7fa`. Стекло теперь графитовое с красными отражениями, без тяжелых теней. Все шесть автомобилей, форма, SEO-страницы и юридические документы сохранены.

**Регистрация/деплой:** содержимое архива `art-avto-upload.zip` загружается в корень сайта на REG.RU. В GitHub актуальные исходники хранятся в `production/art-avto/`, архив в корне репозитория должен быть идентичен этой папке.

**Форма:** пока `assets/config.js` не содержит действующего `requestEndpoint`, форма открывает email-клиент и не отправляет заявку автоматически. Перед коммерческим запуском подключить Cloudflare Worker, проверить уведомления Telegram / MAX, настроить Turnstile и Яндекс.Метрику с согласием пользователя, добавить подтверждённый домен в sitemap. Секреты в GitHub не публиковать.

## v10 / KINETIC MOTION (17 ноября 2026)
Убрано принудительное раскрытие всех элементов через 2,2 секунды. Каждая секция, заголовок, карточка, пункт меню, фото, поле формы и ряд футера теперь получает плавное появление по мере прокрутки. Текст крупных заголовков раскрывается по словам, карточки входят слева и справа по очереди, фотографии и подсветка реагируют на взаимодействия, а меню открывается стеклянной шторкой с последовательными пунктами. Добавлен тонкий индикатор прокрутки. Для людей с настройкой «уменьшение движения» эффекты отключены. Форма, цвета ORIGINAL RED, вёрстка, юридические страницы, фотографии и функциональность сохранены.

## v11 — OBSIDIAN BLOOD / MIRROR REVEAL
- Скролл вниз и вверх: повторные появления только после полного выхода элемента из экрана; зеркальные направления и задержки.
- Крупнее плавающие капсулы логотипа и меню (~1,4–1,5×), новая мобильная геометрия без горизонтальной прокрутки.
- Глухой графитовый почти чёрный фон (#050506), **без градиентов в секциях**; глубокий кроваво-красный акцент (#B50D1B).
- Прозрачность Liquid Glass сохранена на интерактивных панелях, формах и меню.
- Анимация бургера в крестик и функциональность сайта сохранены. Учитывается prefers-reduced-motion.

## v12 / PRISM EDGE (17.11.2026)
Сохранён полный дизайн OBSIDIAN BLOOD v11; эталон находится в ветке art-avto-obsidian-v11-frozen. Изменены только две вещи: прозрачные преломляющие кромки в шапке и новый чёрно-красный фон-картина за блоком Land Cruiser на главном экране. Снимок Land Cruiser оставлен без изменений. Фон art-black-red-car.webp — созданная заново стилизованная автомобильная иллюстрация; исходная картинка с визиток не обнаружена. Остальная структура и цвета v11 без изменений.


## v13 — MOTION POSTER / RESPONSIVE BRAND COVERS
Новые обложки из предоставленной клиентом визитки с чёрным спорткаром.

- `assets/cover-desktop.webp`: 2200×1240, для планшетов и ПК от 768px.

- `assets/cover-mobile.webp`: 1125×2000, для смартфонов до 767px включительно.

- `index.html` содержит responsive `<picture>`; CSS показывает обе обложки без обрезки или некорректного масштабирования.

- Старые фотографии, цвета, меню, анимации, SEO и юридические страницы сохранены.

- Оригинальная визитка использована как исходный художественный материал; на новые баннеры не перенесены неподтвержденные адрес и часы работы.

## v14 / Hero background corrected
The black sports car derived from the owner-supplied business card is a decorative, responsive background of the first screen (separate desktop and mobile WebP). The main photo card has been restored to the original Toyota Land Cruiser photo `assets/auto-11.webp`. No other content, layout or form flow changed.


## v15 — CONTINUUM GLASS (17.11.2026)
Верхние стеклянные капсулы логотипа и бургера объединены в один непрерывный Liquid Glass shape на ПК и мобильных устройствах. Преломление и световая кромка перенесены на общую панель; отдельные капсулы стали прозрачным контентом. Анимация бургера в крестик, фон спорткара и фотография Land Cruiser сохранены.

## UI polish v16 (17.11.2026)
- Unified header: no internal separator, more compact corner radii.
- Glass buttons across the site, one global floating back-to-top button.
- Consistent deal-step geometry and a single glass accordion surface per FAQ row.
- Removed photo-source and agency-facing disclaimer labels from the public home page; photo gallery remains unchanged.
- No new images added; awaiting next photo batch.


### Изменения v17
- Галерея: 13 уникальных машин (7 новых снимков), без повторения автомобилей из прошлой партии.
- Шапка в демо GitHub Pages сдвинута ниже интерфейса Telegram на мобильных; на REG.RU сохраняется стандартное положение у верхнего края.
- Телефонная кнопка выровнена, кнопка формы пульсирует красным свечением под стеклом.
- FAQ: последовательный блик один раз при каждом новом входе секции в область просмотра.
- Мобильная нижняя панель прозрачна: видны только две отдельные стеклянные кнопки.

## v18 — ART AVTO / APPROVED VECTOR BRAND (19 ноября 2026)
- Утверждённый логотип: серебряный щит, белый автомобиль, надпись ART AVTO белым и красным, красный шеврон.
- Исходники: assets/art-avto-logo.svg и assets/art-avto-mark.svg; фавикон assets/favicon.svg.
- На главной, политике, трёх страницах услуг: обновлённая эмблема в меню, на загрузке и в футере.
- Формы, фотографии, анимации и услуги не изменялись.
- art-avto-upload.zip автоматически пересобирается из production/art-avto/ в GitHub Actions.

## v19 — Header logo alignment (19 ноября 2026)
- Для меню теперь единый адаптивный SVG `assets/art-avto-header.svg`: щит с автомобилем + оригинальные векторные контуры надписи ART AVTO + подпись «АВТОВЫКУП · ПЕРМЬ».
- Исправлено масштабирование и плотная компоновка логотипа в единой Liquid Glass шапке Telegram и desktop.
- Пять страниц подключают один новый фирменный файл; параметры меню, отступ от интерфейса Telegram, кнопки и функциональность не изменены.
- Кэш CSS обновлён до v19. Архив для REG.RU пересобирается GitHub Actions автоматически.

## v20 — Restore unmodified complete logo in header (19 November 2026)
Client rejected the horizontally rearranged v19 header logo. All five pages now display the
complete, approved ART AVTO shield as one SVG: car, complete uncompressed text inside shield,
silver border and red chevron. The SVG viewport and intrinsic aspect ratio are synchronized,
and CSS sets only its height and auto width (no distortions). The taller unified Liquid Glass
header, menu stage and DashByte-return button receive coordinated responsive offsets
in Telegram. The incorrect `art-avto-header.svg` is no longer referenced by HTML.
CSS cache key v20. Existing site functionality and other clients unchanged.
