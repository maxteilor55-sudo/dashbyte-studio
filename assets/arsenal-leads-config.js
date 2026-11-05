/* Public site settings only. No Telegram token, private ID or Turnstile secret here.
 * After the Cloudflare Worker is updated:
 * 1) Copy its actual public HTTPS URL, then append /api/arsenal-lead.
 * 2) Add the Cloudflare Turnstile PUBLIC sitekey for navesy59.ru.
 * Leave blank to retain the safe manual copy-to-manager mode.
 */
window.ARSENAL_LEADS_ENDPOINT = '';
window.ARSENAL_TURNSTILE_SITEKEY = '';
