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
- A domain name whose DNS `A` record points to the server's IP address (certbot needs this for HTTPS).
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
sudo certbot --nginx -d example.com
```

Add `-d www.example.com` if you also use the `www` name (and add it to `server_name` in the nginx file first). Certbot renews the certificate automatically.

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

The project data is in MySQL. Back it up regularly:

```bash
mysqldump -u mpala -p mpala > mpala_$(date +%F).sql
```

To automate it, add a daily job with `crontab -e` and keep copies off the server. To restore: `mysql -u mpala -p mpala < mpala_2026-01-01.sql`.

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
- [ ] Database backups are taken and stored off the server.
- [ ] Optional: hide the API documentation page by adding `location /api/docs { return 404; }` above `location /api/` in the nginx file, then reload nginx.

## Troubleshooting

| Problem | What to do |
|---|---|
| `deploy.sh` lists settings to fix | Edit `backend/.env` as listed and run it again. |
| `Could not set up MySQL` | Check `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, that MySQL is running (`sudo systemctl status mysql`) and that the user has rights on the database (step 3). |
| `502 Bad Gateway` | The API is not running or uses another port. Check `sudo systemctl status mpala-api`, the logs, and that `BACKEND_PORT` matches the nginx file. |
| Website loads but forms and dashboard fail | The site was built for a different address. Run `./deploy.sh --domain <the real domain>` again and re-publish `dist/`. |
| Refreshing `/admin` shows `404` | The nginx file is missing `try_files $uri /index.html;` in `location /`. Use the generated file. |
| Dashboard says "This account is not an admin" | The sign-in email is not in `ADMIN_EMAILS`. Add it and run `sudo systemctl restart mpala-api`. |
| No emails arrive | Check the `MAIL_*` values and `COMPANY_EMAIL`; look for "Email failed" in the API logs. Gmail needs an app password. Projects are saved even when email fails. |
| Certbot fails | The domain's DNS must point to this server and port 80 must be open. Check with `dig +short example.com`. |
| Welcome page of nginx shows instead of the site | The default site is still enabled: `sudo rm -f /etc/nginx/sites-enabled/default` and reload nginx. |
| Forgot the admin password | Delete that user in MySQL (`DELETE FROM users WHERE email='...';`), then run `./deploy.sh --domain <domain>` again: with no users it asks you to create a new admin. |
