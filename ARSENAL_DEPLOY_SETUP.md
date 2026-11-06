# Manual Arsenal website deployment via GitHub Actions

GitHub repository: maxteilor55-sudo/dashbyte-studio

1. In REG.RU hosting access settings confirm that SSH/SFTP is available.
   REG.RU's shared Linux hosting typically uses the primary SSH login for SFTP;
   a separately created FTP user is not necessarily an SFTP user.
2. Open GitHub repository Settings → Environments → New environment.
   Create environment named **arsenal-production**. Restrict allowed branches
   to **main**, if this setting is offered.
3. Add six **Environment secrets** (never commit them or paste them into chat):
   - ARSENAL_SFTP_HOST — correct hosting server host name or IP
   - ARSENAL_SFTP_PORT — SFTP port, normally 22
   - ARSENAL_SFTP_USER — actual SFTP / primary hosting username
   - ARSENAL_SFTP_PASSWORD — corresponding SFTP password
   - ARSENAL_SFTP_REMOTE_DIR — actual path from an SFTP session to the
     website document root, ending exactly with navesy59.ru; its index.html
     must already belong to Arsenal (do not infer blindly from ispmanager)
   - ARSENAL_SFTP_HOST_KEY_SHA256 — independently verified public host key
     fingerprint in SHA256:... format; ask REG.RU support if unsure.
4. Make a manual full backup before first deployment.
5. GitHub → Actions → Deploy Arsenal to REG.RU (manual SFTP) →
   Run workflow → branch main → enter **navesy59.ru**.

This workflow has NO push trigger. It builds and checks arsenal-upload.zip,
validates SSH server identity before password authentication, backs up only
files being overwritten into a timestamped folder OUTSIDE the web document
root, uploads assets before the homepage, never deletes files, and checks
the live HTTPS homepage afterward.

Safety: if the hosting account cannot write backups to the parent folder
or the server does not support SFTP atomic rename, the workflow stops rather
than falling back to unsafe behaviour. Backups accumulate; periodically
review retention. After a partial transfer, restoration is manual.
