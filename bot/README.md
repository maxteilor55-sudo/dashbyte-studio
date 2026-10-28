# DashByte Studio Bot — @DashByteStudioBot

Готовый Telegram-бот с приветствием, кнопкой запуска мини-приложения и контактом студии.

## Что настроить в @BotFather

Выберите /mybots → @DashByteStudioBot.

**Имя** (Edit Name): `DashByte | Digital Studio`

**About** (Edit About / /setabouttext):
```text
DashByte — цифровая студия: сайты, айдентика, дизайн и видео. Превращаем идеи в успех.
```

**Description** (Edit Description / /setdescription):
```text
DashByte — цифровая студия для бизнеса.

Создаём современные сайты, логотипы, айдентику, фото, видео и рекламный контент.

Здесь можно открыть наше мини-приложение, познакомиться с проектом «Арсенал», изучить услуги и оставить заявку.

Превращаем идеи в успех.
```

**Аватарка** (Edit Botpic / /setuserpic): файл `DashByte_Telegram_Avatar.png` из этой беседы — отправить в BotFather как изображение.

**Main Mini App** (Bot Settings → Configure Mini App): оставьте ранее настроенный Main Mini App в режиме **Fullsize** по адресу
`https://maxteilor55-sudo.github.io/dashbyte-studio/`.
Это большая синяя кнопка **«Открыть приложение»** в профиле бота.

**Нижняя кнопка слева** (Bot Settings → Menu Button или /setmenubutton):
- Текст: `Открыть`
- Адрес: `https://maxteilor55-sudo.github.io/dashbyte-studio/`

**Команды** (/setcommands), вставить весь блок:
```text
start - Главное меню
site - Открыть приложение
contact - Связаться со студией
help - Помощь
```

## Приветствие после /start

Код расположен в `bot/worker.js`. Он отвечает на /start приветствием и выдаёт две кнопки:
- 🌐 Открыть приложение — открывает текущий мини-сайт «Арсенал» внутри Telegram.
- 💬 Написать в студию — открывает @Reelog.

> Важно: сообщения бота отправляет серверный обработчик. **Одних настроек BotFather недостаточно.** Пока Worker не развёрнут и webhook не подключён, приветствие после /start не появится.

## Запуск обработчика на Cloudflare Workers

1. Создайте Worker `dashbyte-studio-bot` в панели Cloudflare и разместите в нём код из `bot/worker.js`. Можно также использовать Wrangler с `bot/wrangler.toml`.
2. В Worker → Settings → Variables and Secrets добавьте **секреты**, не текстовые переменные:
   - `TELEGRAM_BOT_TOKEN` — новый действующий токен @DashByteStudioBot.
   - `TELEGRAM_WEBHOOK_SECRET` — самостоятельно созданная случайная строка из 32–64 символов (буквы, цифры, `_` и `-`).
3. Опубликуйте Worker и получите адрес вида `https://dashbyte-studio-bot.<subdomain>.workers.dev`.
4. Для привязки webhook выполните **со своего компьютера** HTTP POST к Telegram Bot API `setWebhook`, где `url` — адрес Worker + `/webhook`, а `secret_token` — значение второго секрета. Не публикуйте токен и не пересылайте его в чат.
5. Проверьте `/health` (ответ `DashByte Telegram bot: OK`), затем в @DashByteStudioBot отправьте `/start`.

Пример POST из локального терминала (значения брать из безопасных переменных окружения):
```bash
curl -sS -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
  --data-urlencode "url=$WORKER_URL/webhook" \
  --data-urlencode "secret_token=$TELEGRAM_WEBHOOK_SECRET" \
  --data-urlencode "allowed_updates=[\"message\"]"
```

Если токен когда-либо попадал на публичный скриншот, сначала перевыпустите его в @BotFather. Токены **нельзя** класть в GitHub.

## Не меняем
- Полноэкранный режим Mini App (Fullsize) и интерфейс сайта.
- Текущий сайт «Арсенал» по главному адресу GitHub Pages.
- Меню и навигацию самого проекта «Арсенал».
