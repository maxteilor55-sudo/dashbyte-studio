# Арсенал → Telegram-уведомления через DashByteStudioBot

## Уже подготовлено в исходниках

- Сайт `navesy59.ru` (REG.RU): форма подключается через
  `assets/arsenal-leads.js` **только после настройки**.
  Если интеграция не настроена, сохранён старый ручной режим.
- Cloudflare Worker: `bot/worker.js`, маршрут `POST /api/arsenal-lead`.
  Он отделён от формы студии `/api/lead`.
- Сервер проверяет Origin, тип и размер запроса, поля заявки, время
  заполнения и Cloudflare Turnstile через обязательный Siteverify API.
  Затем вызывает Telegram Bot API `sendMessage`.
- Ни Telegram bot token, ни ID получателя в HTML и JavaScript сайта не записываются.

## Настройка (обязательна до реальной доставки)

1. **Александр:** откройте [@DashByteStudioBot](https://t.me/DashByteStudioBot)
   и отправьте `/start`. Бот не может первым начать личный диалог.
2. **Cloudflare → Worker → Settings → Builds:** подключите GitHub к
   *существующему* Worker `dashbyte-studio-bot` (не создавайте новый).
   В окне настройки сборки выберите:
   - GitHub account: `maxteilor55-sudo`
   - Repository: `dashbyte-studio`
   - Branch: `main`
   - Root directory: `bot`
   - Build command: `npm run check` (проверка кода и тесты)
   - Deploy command: `npx wrangler deploy`
   - Preview command: по умолчанию `npx wrangler preview`
   В папке `bot` уже есть `wrangler.toml` с именем Worker и
   `package.json` с Wrangler. После сохранения Git integration
   новые коммиты смогут запускать автоматические публикации.
   **Внимание:** подключение GitHub в ChatGPT не даёт доступа менять
   настройки Cloudflare. Подтвердить Git installation и Build settings
   нужно в панели самого Cloudflare. Секреты Runtime Variables не переносить
   в Build Variables и не хранить в GitHub.
3. **Cloudflare → Worker → Settings → Variables and Secrets:**
   - `ARSENAL_CHAT_ID`: персональный числовой chat ID Александра,
     полученный у него напрямую. Хранить как Secret.
   - `ARSENAL_TURNSTILE_SECRET`: приватный ключ созданного для
     `navesy59.ru` виджета Turnstile. Хранить как Secret.
   - `TELEGRAM_BOT_TOKEN`: уже настроенный секрет бота DashByte.
   - `ARSENAL_RATE_LIMITER`: необязательный отдельный binding
     Cloudflare Rate Limiting для дополнительной защиты.
4. **Cloudflare → Turnstile:** создать виджет для **navesy59.ru**,
   получить публичный `sitekey` и приватный `secret`.
   Не путать ключи: private secret только в Cloudflare Worker.
5. **REG.RU:** сделайте полный бэкап сайта, залейте обновлённый
   `arsenal-upload.zip` в корень `www/navesy59.ru`, распакуйте
   с заменой, не удаляя существующие конфигурации обработки заказов.
6. В `www/navesy59.ru/assets/arsenal-leads-config.js` замените
   только две пустые строки:
   ```js
   window.ARSENAL_LEADS_ENDPOINT = 'https://ВАШ-РЕАЛЬНЫЙ-WORKER.workers.dev/api/arsenal-lead';
   window.ARSENAL_TURNSTILE_SITEKEY = 'ПУБЛИЧНЫЙ-SITEKEY-TURNSTILE';
   ```
   Используйте **реальный** URL Worker, не пример. Редактирование этого
   маленького файла после распаковки не требует повторной сборки ZIP.
   Никогда не вписывайте сюда Telegram chat ID или BotFather token.
7. Выйдите из кеша браузера/откройте сайт в приватном окне,
   заполните форму, отметьте согласие, пройдите Turnstile и отправьте
   тестовую заявку. Убедитесь, что **Александр получил сообщение**.
   Если Telegram ответил ошибкой, форма предложит скопировать текст.
8. При реальном запуске проверьте требования обработки персональных
   данных, включая локализацию и возможную трансграничную передачу,
   договоры с обработчиками и актуальность опубликованной политики.

## При ошибках

- Кнопка **«Сформировать заявку»** = нет URL Worker или sitekey; ручной режим.
- Кнопка **«Отправить заявку»** = интеграция активирована в браузере.
- Ошибка `503 not_configured` = нет обязательных секретов в Worker.
- Ошибка `403 turnstile` = неверный ключ, домен, action или истёкший токен.
- Ошибка `502 delivery_failed` = Worker не смог доставить в Telegram;
  проверьте что Александр запустил бота, ID корректен и токен действителен.
- Сразу после обновления HTML **автоматические сообщения ещё не
  начнут приходить**, пока не выполнены все шаги выше.

## Важно

Маршрут `/api/lead` для студии DashByte продолжает использовать
`TELEGRAM_OWNER_CHAT_ID`. Для «Арсенала» предназначен **только**
`ARSENAL_CHAT_ID`, задаваемый отдельно. Удалять или менять
`TELEGRAM_OWNER_CHAT_ID` нельзя.

Проверки: GitHub Actions `Verify Arsenal Telegram delivery separation`
и `Build Arsenal REG.RU deployment ZIP`.
