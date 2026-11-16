# Deployment guide

How to put Mpala Consultant on a Linux server with MySQL, nginx and HTTPS. The steps use Ubuntu 22.04/24.04 commands; other distributions work the same with their own package manager.

**How it fits together**

```
Browser ──HTTPS──> nginx ──/        ──> website files (/var/www/mpala)
                         └─/api/    ──> gunicorn (127.0.0.1:5000) ──> MySQL
```

`deploy.sh` does the application part (checks, backend, database tables, website build, server config files). The server part (packages, MySQL user, nginx, HTTPS) is below.

## 1. What you need

- A Linux server you can log in to with `sudo`.
- A domain name with two DNS records at your DNS provider: an `A` record for `@` pointing to the server's IP address, and a `CNAME` record for `www` pointing to your domain. Without the `www` record, `www.yourdomain` does not work. In Cloudflare set both to **DNS only** (grey cloud) until HTTPS works.
- Mail settings for the notification emails (for Gmail: an app password, which needs 2-step verification on the account).

## 2. Prepare the server

```bash
sudo apt update
sudo apt install -y python3 python3-venv python3-pip git rsync nginx mysql-server certbot python3-certbot-nginx
```

Install a current **Node.js LTS** (22 or newer) from [nodejs.org](https://nodejs.org) or NodeSource. The version in Ubuntu's default repositories is often too old for Vite. Check with `node -v`.

Open the firewall for SSH and web traffic only:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

The API listens only on `127.0.0.1`, so it is not reachable from outside except through nginx.

## 3. Create the MySQL database and user

```bash
sudo mysql
```

```sql
CREATE DATABASE mpala CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'mpala'@'localhost' IDENTIFIED BY 'a-long-random-password';
GRANT ALL PRIVILEGES ON mpala.* TO 'mpala'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

Use a real random password and keep it for the next step. The tables are created for you by `deploy.sh`.

## 4. Get the code

```bash
cd ~
git clone <your-repository-url> mpala_consultant
cd mpala_consultant
chmod +x run.sh deploy.sh
```

Or upload the project folder and apply the update zip with `./apply_update.sh` (see the README). Do not copy your local `backend/.env`, `backend/venv`, `node_modules` or the SQLite file to the server.

## 5. Configure `backend/.env`

```bash
cp backend/.env.example backend/.env
nano backend/.env
```

Set at least these:

| Key | Value |
|---|---|
| `DB_ENGINE` | `mysql` |
| `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | `127.0.0.1`, `mpala`, the password from step 3, `mpala` |
| `JWT_SECRET_KEY` | a long random value: `python3 -c "import secrets; print(secrets.token_hex(32))"` |
| `ADMIN_EMAILS` | the email(s) allowed to open the dashboard |
| `COMPANY_EMAIL` | where "new project" emails go |
| `MAIL_SERVER`, `MAIL_PORT`, `MAIL_USE_TLS`, `MAIL_USERNAME`, `MAIL_PASSWORD` | your SMTP login (Gmail: `smtp.gmail.com`, `587`, `True`, your address, the app password) |
| `ALLOW_REGISTRATION` | `false` |

`deploy.sh` also sets `DASHBOARD_URL` to `https://<your-domain>/admin` and `ALLOW_REGISTRATION=false` if they are missing, and it refuses to continue if the rest is still a placeholder.

#### Email settings: Cloudflare or Gmail

The app sends two emails: the short "new project" note to `COMPANY_EMAIL`, and a thank-you to the client. Receiving mail on your domain and sending mail from the app are two different things in Cloudflare.

**Receiving (Cloudflare Email Routing, free).** In the Cloudflare dashboard, open your domain, then **Email Routing**.
1. Under **Destination addresses**, add a real inbox you can open (for example your Gmail) and click the verification link Cloudflare emails to it. The status changes from *Pending* to *Verified*. Do not add `info@yourdomain` itself as a destination: that mailbox does not exist yet, so the verification email can never be read and it stays *Pending*.
2. Under **Routing rules**, create custom addresses such as `info@yourdomain` and `admin@yourdomain` and send them to that verified inbox.

Routing only forwards incoming mail. It cannot send, so the app needs one of these for sending:

**Option A, Cloudflare Email Service (sends from `no-reply@yourdomain`).** Email Sending is in beta, and sending to anyone other than your verified destination addresses needs the Workers Paid plan. Onboard the domain under **Email Sending** (Cloudflare adds the SPF and DKIM records), create an API token with the **Email Sending: Edit** permission, then set:

```
MAIL_SERVER=smtp.mx.cloudflare.net
MAIL_PORT=465
MAIL_USE_SSL=True
MAIL_USE_TLS=False
MAIL_USERNAME=api_token
MAIL_PASSWORD=<the API token>
MAIL_FROM=no-reply@yourdomain.com
COMPANY_EMAIL=info@yourdomain.com
```

`MAIL_USERNAME` is the literal text `api_token`; the token goes in `MAIL_PASSWORD`. Cloudflare accepts SMTP only on port 465 with SSL, not 587.

**Option B, Gmail (free).** Turn on 2-step verification, create an app password, then set `MAIL_SERVER=smtp.gmail.com`, `MAIL_PORT=587`, `MAIL_USE_TLS=True`, `MAIL_USERNAME=<your Gmail address>` and `MAIL_PASSWORD=<the app password>`. You can still use Cloudflare Email Routing for `info@yourdomain` (receiving) at the same time.

`ADMIN_EMAILS` is only the list of logins allowed into the dashboard. The app never sends mail to it, so `admin@yourdomain.com` works there even if you do not route it.

Protect the file: `chmod 600 backend/.env`.

## 6. Run `deploy.sh`

```bash
./deploy.sh --domain example.com
```

It will:

1. check your settings and list anything still missing;
2. install the backend packages and the production web server (gunicorn);
3. create the MySQL tables;
4. ask for the **admin email and password** (the first admin; public registration is closed, so this is the only way in);
5. build the website into `dist/`, pointing it at `https://example.com/api`;
6. write `deploy/mpala-api.service` and `deploy/nginx-mpala.conf` with your paths and domain filled in.

In a non-interactive run (for example from automation), set `ADMIN_SEED_EMAIL` and `ADMIN_SEED_PASSWORD` for that one run instead of typing them.

## 7. Publish

The script prints these commands at the end. Run them in order.

**Website files**

```bash
sudo mkdir -p /var/www/mpala
sudo rsync -a --delete dist/ /var/www/mpala/
```

Files are served from `/var/www` rather than your home folder so nginx has permission to read them.

**API service** (starts at boot and restarts if it crashes)

```bash
sudo cp deploy/mpala-api.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now mpala-api
sudo systemctl status mpala-api
```

**nginx**

```bash
sudo cp deploy/nginx-mpala.conf /etc/nginx/sites-available/mpala
sudo ln -sf /etc/nginx/sites-available/mpala /etc/nginx/sites-enabled/mpala
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

**HTTPS**

```bash
sudo certbot --nginx -d example.com -d www.example.com
```

The generated nginx file already answers to both `example.com` and `www.example.com`. If you installed an older nginx file that only has `example.com`, add the `www` name and expand the certificate:

```bash
sudo sed -i 's/server_name example.com;/server_name example.com www.example.com;/' /etc/nginx/sites-available/mpala
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d example.com -d www.example.com
```

Certbot renews the certificate automatically.

## 8. Check that it works

1. Open `https://example.com`: the website loads.
2. Submit a test project through the form. You should land on the thank-you page, and the company email and the client email should arrive.
3. Open `https://example.com/admin`, sign in with the admin account, and open the test project.
4. Confirm public sign-up is closed: `curl -i -X POST https://example.com/api/register -H 'Content-Type: application/json' -d '{"email":"a@b.c","password":"x"}'` must return `403`.

## 9. Update to a new version

```bash
cd ~/mpala_consultant
git pull
./deploy.sh --domain example.com
sudo rsync -a --delete dist/ /var/www/mpala/
sudo systemctl restart mpala-api
```

Your `backend/.env` and the data in MySQL are kept. Running `deploy.sh` again is safe: existing tables are not changed and an existing admin is not asked for again.

**Roll back:** `git checkout <previous-commit>`, then repeat the same four steps.

## 10. Backups

The project data is in MySQL and the gallery photos are files in `backend/uploads/gallery/`. Back up **both** regularly:

```bash
mysqldump -u mpala -p mpala > mpala_$(date +%F).sql
tar czf mpala_photos_$(date +%F).tar.gz backend/uploads
```

Photos are not in git, and `git pull` / `./deploy.sh` never touch them.

To automate it, add a daily job with `crontab -e` and keep copies off the server. To restore: `mysql -u mpala -p mpala < mpala_2026-01-01.sql` and `tar xzf mpala_photos_2026-01-01.tar.gz`.

## 11. Logs and day-to-day commands

| Task | Command |
|---|---|
| API logs (live) | `sudo journalctl -u mpala-api -f` |
| Restart the API | `sudo systemctl restart mpala-api` |
| nginx errors | `sudo tail -f /var/log/nginx/error.log` |
| Test nginx config | `sudo nginx -t` |

## 12. Security checklist

- [ ] `DB_ENGINE=mysql` and a strong, unique MySQL password.
- [ ] `JWT_SECRET_KEY` is a long random value and is not shared.
- [ ] `ALLOW_REGISTRATION=false`.
- [ ] `ADMIN_EMAILS` lists only people who should see client data.
- [ ] The site and dashboard are used over HTTPS only.
- [ ] `backend/.env` has mode `600` and is not in git.
- [ ] Firewall allows only SSH and web traffic; MySQL is not open to the internet.
- [ ] Database and `backend/uploads` backups are taken and stored off the server.
- [ ] Optional: hide the API documentation page by adding `location /api/docs { return 404; }` above `location /api/` in the nginx file, then reload nginx.

## Emails: `info@` not working, and client emails going to spam

### `info@yourdomain` does not receive mail

`info@` is not a mailbox. It is a forwarding rule in Cloudflare Email Routing, so it only works when every link of this chain is in place. Check them in order in the Cloudflare dashboard, under your domain, **Email** → **Email Routing**:

1. **Routing is enabled and the DNS records exist.** The overview must not show a warning about missing records. If it does, use the button to add them. Check from the server: `dig +short MX yourdomain.com` should list hosts ending in `.mx.cloudflare.net`. Remove any other, older `MX` records (for example from a previous web host): mixed records make mail go to the wrong place.
2. **The destination inbox is Verified** (Destination addresses). *Pending* means the verification link in the email Cloudflare sent was never clicked. Look in the spam folder of that inbox; if there is nothing, delete the address and add it again. The destination must be a real inbox such as your Gmail, never an `@yourdomain` address.
3. **A rule exists and is active** (Routing rules): custom address `info` → Send to an email → your verified inbox. Do the same for any other address you publish.
4. **Test from a different account.** Send a message to `info@yourdomain` from another address (for example a friend's, not the Gmail you forward to). Mail from your own Gmail to a forward that lands back in the same Gmail is often hidden by Gmail. Then open **Email Routing** → **Overview** (the activity log) to see whether Cloudflare received and forwarded it, or why it did not.
5. **Only one SPF record.** If you also send through Gmail, merge them into one `TXT` record at `@`: `v=spf1 include:_spf.mx.cloudflare.net include:_spf.google.com ~all`. Two separate SPF records make both invalid.

Replies to `info@` go to the inbox you forward to. To also *send* as `info@` from that Gmail, see the stop-gap below.

### Client emails land in spam

The thank-you email used to be two lines of plain text, sent from a brand-new `@gmail.com` account, with the same address as sender and reply-to and no links. Spam filters treat that as suspicious. The email now has:

- a text and an HTML version, with a clear sender name (`Mpala Consultant`);
- links to the website, the gallery and the services, and your public address `info@yourdomain` (set `PUBLIC_EMAIL` or leave it to default to `info@<your domain>`);
- what was requested (service and place), what happens next, and a signature with your address and TIN;
- `Reply-To` set to `info@yourdomain`, and a line saying why the client is receiving the message.

That improves things, but one weakness remains: the mail is still sent from a free Gmail account, not from your own domain. For the best result, send from `no-reply@yourdomain` through a service that signs mail for your domain (SPF and DKIM):

- **Cloudflare Email Service** (Option A in step 5): set `MAIL_FROM=no-reply@yourdomain.com`.
- Another email-sending service where you verify your domain by adding the DNS records it gives you (set its SMTP login in the `MAIL_*` settings).
- Google Workspace, if you want real mailboxes as well.

**Stop-gap while you stay on Gmail:** in Gmail, Settings → Accounts → **Send mail as** → add `info@yourdomain` (the confirmation email arrives through your working `info@` forward), then set `MAIL_FROM=info@yourdomain.com`. Clients then see your domain in the From line. Do not publish a strict DMARC policy (`p=quarantine` or `p=reject`) while you use this: Gmail signs those messages for `gmail.com`, not for your domain. A DMARC record with `p=none` is safe.

Other things that help: ask clients to mark the first message as "Not spam", test a real message at mail-tester.com, and avoid testing by sending many emails to the same few addresses.

After applying an update, the API brings its own database up to date every time it starts, so a restart is enough: `sudo systemctl restart mpala-api`.

## Create or reset an admin login

On the server (as the user that owns the project), from the project folder:

```bash
cd backend
venv/bin/python create_admin.py admin@yourdomain.com
```

It asks for a password (8+ characters) twice. If the email already exists, its password is replaced, so the same command resets a forgotten password. Then:

1. Make sure the email is in `ADMIN_EMAILS` in `backend/.env` (comma-separated). Without it the sign-in works but the dashboard says the account is not an admin.
2. Restart the API: `sudo systemctl restart mpala-api`.
3. Sign in at `https://yourdomain.com/admin` with exactly that email, in lowercase.

Locally the same command works with `backend/venv/bin/python backend/create_admin.py` (or `.venv`, whichever you use).

If you still cannot open `/admin`, check in this order:

```bash
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:5000/api/gallery   # 200 = the API is running
sudo systemctl status mpala-api --no-pager
sudo nginx -t
ls /var/www/mpala                                                            # index.html must be there
```

## Small servers (512 MB to 1 GB of RAM)

A 512 MB server cannot run MySQL 8 and build the website without help: Linux kills the biggest process when memory runs out, and `systemctl status mysql` shows `Result: oom-kill`. Do these before `./deploy.sh`.

**1. Add 2 GB of swap** (check `free -h` first; if Swap shows 0B you need this):

```bash
fallocate -l 2G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=2048
chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
echo '/swapfile none swap sw 0 0' | tee -a /etc/fstab
free -h
```

If `swapon` says "Operation not permitted", the server is a container that does not allow swap: use MariaDB (`apt install mariadb-server`, same SQL steps) or ask your provider for a larger plan.

**2. Make MySQL use less memory.** Create `/etc/mysql/conf.d/lowmem.cnf`:

```
[mysqld]
performance_schema = OFF
mysqlx = OFF
skip-log-bin
innodb_buffer_pool_size = 64M
innodb_log_buffer_size = 8M
key_buffer_size = 8M
max_connections = 25
table_open_cache = 128
table_definition_cache = 128
tmp_table_size = 16M
max_heap_table_size = 16M
```

**3. Finish a MySQL install that was interrupted:**

```bash
dpkg --configure -a
systemctl status mysql --no-pager
```

It should say `active (running)`. If configuration still fails and you have no data yet, start clean: `apt purge -y mysql-server mysql-server-8.0 mysql-server-core-8.0 && rm -rf /var/lib/mysql && apt install -y mysql-server`.

**4. Use a current Node.js.** Ubuntu's `nodejs` package is version 18, which is too old for the website build (`deploy.sh` now stops with a clear message). Replace it with Node 22:

```bash
apt remove -y nodejs npm libnode-dev
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs
node -v      # v22.12 or higher
```

**5. If the website build is still killed**, build it on your own computer and upload the result:

```bash
VITE_API_URL=https://example.com/api npm run build
rsync -avz --delete dist/ root@your-server:/var/www/mpala/
```

Then run `./deploy.sh` on the server as usual (it rebuilds, so make sure swap is on, or skip this server-side build by publishing the uploaded `dist/`).

## Troubleshooting

| Problem | What to do |
|---|---|
| `deploy.sh` lists settings to fix | Edit `backend/.env` as listed and run it again. |
| `mysql.service ... Result: oom-kill` | The server ran out of memory. Follow "Small servers" above: add swap and the low-memory MySQL config. |
| `deploy.sh` says Node.js is too old | Install Node 22 from NodeSource ("Small servers", step 4). |
| `sudo: unable to resolve host` | Harmless. Fix it with `echo "127.0.1.1 $(hostname)" >> /etc/hosts`. |
| `www.yourdomain` does not open | Add the DNS record `CNAME  www  yourdomain` (DNS only), make sure nginx `server_name` lists the `www` name, then run `sudo certbot --nginx -d yourdomain -d www.yourdomain`. |
| Cannot sign in to `/admin` | Create the login with `create_admin.py` (see "Create or reset an admin login") and check the email is in `ADMIN_EMAILS`. |
| `Could not set up MySQL` | Check `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, that MySQL is running (`sudo systemctl status mysql`) and that the user has rights on the database (step 3). |
| `502 Bad Gateway` | The API is not running or uses another port. Check `sudo systemctl status mpala-api`, the logs, and that `BACKEND_PORT` matches the nginx file. |
| Website loads but forms and dashboard fail | The site was built for a different address. Run `./deploy.sh --domain <the real domain>` again and re-publish `dist/`. |
| Refreshing `/admin` shows `404` | The nginx file is missing `try_files $uri /index.html;` in `location /`. Use the generated file. |
| Photo upload fails with `413` or "too large" | nginx limits uploads to 1 MB by default. The generated nginx file sets `client_max_body_size 40m;`; if you wrote your own, add it and reload nginx. Also send fewer photos at once. |
| Dashboard says "This account is not an admin" | The sign-in email is not in `ADMIN_EMAILS`. Add it and run `sudo systemctl restart mpala-api`. |
| `535 Authentication failed` in the API log with Cloudflare | `MAIL_USERNAME` must be exactly `api_token`, `MAIL_PASSWORD` the API token with **Email Sending: Edit**, and `MAIL_USE_SSL=True` with port `465`. |
| `550 Sender denied` in the API log with Cloudflare | The domain in `MAIL_FROM` is not onboarded under **Email Sending** on the account that owns the token. |
| No emails arrive | Check the `MAIL_*` values and `COMPANY_EMAIL`; look for "Email failed" in the API logs. Gmail needs an app password. Projects are saved even when email fails. |
| Certbot fails | The domain's DNS must point to this server and port 80 must be open. Check with `dig +short example.com`. |
| Welcome page of nginx shows instead of the site | The default site is still enabled: `sudo rm -f /etc/nginx/sites-enabled/default` and reload nginx. |
| Forgot the admin password | Delete that user in MySQL (`DELETE FROM users WHERE email='...';`), then run `./deploy.sh --domain <domain>` again: with no users it asks you to create a new admin. |
