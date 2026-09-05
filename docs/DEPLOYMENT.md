# Deploying Sampada

Sampada is a **local-first, open-source** Rails app. You deploy it yourself on your own infrastructure.

> **Supported deployment path — Docker Compose + sops.** This is the one actively-maintained
> deploy story: `deploy.sh` + `docker-compose.yml`, with secrets encrypted via `sops`
> in `secrets.enc.env`. Every config and SSL change in this app is validated against this
> path only. Use it for any real deployment.
>
> **Unsupported / retired alternatives.** The Render.com buildpack path (`bin/render-build.sh`)
> was dropped 2026-06-12 during the DPDP overhaul (US-hosted infra retired — see
> `docs/CONTEXT.md`); the manual bare-metal / Nginx + Certbot steps below are kept as
> reference only. Neither is maintained, exercised in CI, or a valid target for new config
> changes. Prefer `deploy.sh` for production.

This guide covers:

- **Quick Start (local Docker)** — run the same Compose stack locally for development
- **Single VM Deploy** — production-style self-hosted deploy on a cloud VM (Oracle Cloud / Hostinger)

---

## Prerequisites

- Docker & Docker Compose (v2.24+)
- A Google Cloud OAuth 2.0 Client ID + Secret ([setup guide](#google-oauth-setup))
- A domain or subdomain (optional, for SSL)

---

## Quick Start (Local Docker)

```bash
# 1. Clone the repo
git clone https://github.com/sdachary/sampada.git
cd sampada

# 2. Copy env config
cp .env.example .env

# 3. Edit .env — fill in required values:
#    - SECRET_KEY_BASE (run: rails secret or openssl rand -hex 64)
#    - POSTGRES_PASSWORD (choose a strong password)
#    - GOOGLE_CLIENT_ID
#    - GOOGLE_CLIENT_SECRET
#    - APP_DOMAIN (e.g. localhost:3000)

# 4. Start everything
docker compose up -d

# 5. Visit http://localhost:3000
```

> **First run**: The app auto-creates the database and runs migrations via `db:prepare`. Give it 10-15 seconds on first startup.

---

## Single VM Deploy (Oracle Cloud / Hostinger)

### Step 1: Provision the VM

**Oracle Cloud Mumbai (free):**
- Create an Ubuntu 22.04 VM (1 OCPU, 1GB RAM, boot volume)
- Open ports 22, 80, 443 in security lists
- SSH in and install Docker: `curl -fsSL https://get.docker.com | sh`

**Hostinger VPS India (₹99/mo):**
- Order VPS with Ubuntu 22.04
- SSH in and install Docker: `curl -fsSL https://get.docker.com | sh`

### Step 2: Set up the app

```bash
git clone https://github.com/sdachary/sampada.git
cd sampada
cp .env.example .env
# Edit .env with your values
docker compose up -d
```

### Step 3: Nginx + SSL (optional)

```nginx
# /etc/nginx/sites-available/sampada
server {
    listen 80;
    server_name sampada.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Then get SSL: `sudo certbot --nginx -d sampada.yourdomain.com`

Set `RAILS_FORCE_SSL=true` in `.env` after SSL is configured.

### Step 4: Keep alive (prevent idle sleep)

Free-tier VMs may idle-stop after inactivity. Set up a cron job or use [cron-job.org](https://cron-job.org) (free):

```
URL: https://sampada.yourdomain.com/api/health
Interval: every 10 minutes
```

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SECRET_KEY_BASE` | ✅ | — | Rails secret key base. Run `rails secret` |
| `POSTGRES_PASSWORD` | ✅ | — | PostgreSQL password |
| `GOOGLE_CLIENT_ID` | ✅ | — | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | ✅ | — | Google OAuth client secret |
| `APP_DOMAIN` | ✅ | — | Your app domain (e.g. `localhost:3000` or `sampada.app`) |
| `POSTGRES_USER` | — | `sampada` | PostgreSQL user |
| `POSTGRES_DB` | — | `sampada_production` | PostgreSQL database name |
| `DB_HOST` | — | `postgres` (Docker) / `localhost` | PostgreSQL host |
| `DB_PORT` | — | `5432` | PostgreSQL port |
| `PORT` | — | `3002` (host) / `3000` (Docker) | Puma listen port |
| `REDIS_URL` | — | `redis://localhost:6379/0` | Redis connection URL |
| `RAILS_MAX_THREADS` | — | `3` | Puma thread count |
| `WEB_CONCURRENCY` | — | `1` | Puma worker count |
| `RAILS_FORCE_SSL` | — | `true` | Force HTTPS redirect |
| `RAILS_ASSUME_SSL` | — | `true` | Assume SSL in proxy mode |
| `SIDEKIQ_WEB_USERNAME` | — | `sampada` | Sidekiq dashboard username |
| `SIDEKIQ_WEB_PASSWORD` | — | `sampada` | Sidekiq dashboard password |
| `ACTIVE_RECORD_ENCRYPTION_PRIMARY_KEY` | **recommended** | derived from `SECRET_KEY_BASE` | Rails encryption key (set independently for real deployments — see note below) |
| `ACTIVE_RECORD_ENCRYPTION_DETERMINISTIC_KEY` | **recommended** | derived from `SECRET_KEY_BASE` | Rails deterministic key |
| `ACTIVE_RECORD_ENCRYPTION_KEY_DERIVATION_SALT` | **recommended** | derived from `SECRET_KEY_BASE` | Rails encryption salt |

> **Encryption keys:** if the three `ACTIVE_RECORD_ENCRYPTION_*` vars are not set, the app
> derives them from `SECRET_KEY_BASE`. Deriving them lets a single leaked `SECRET_KEY_BASE`
> also reconstruct the keys protecting encrypted columns (`ApiCredential#encrypted_value`,
> encrypted `User` fields), so the app logs a loud boot-time warning in production whenever
> the fallback is active. Any real deployment should set the three vars independently —
> ship them via sops, see `.sops.yaml`.
| `SMTP_ADDRESS` | — | — | SMTP server for emails |
| `SMTP_PORT` | — | `587` | SMTP port |
| `SMTP_USERNAME` | — | — | SMTP username |
| `SMTP_PASSWORD` | — | — | SMTP password |
| `SMTP_TLS_ENABLED` | — | `false` | Enable TLS for SMTP |
| `CORS_ORIGINS` | — | `*` | Allowed CORS origins (comma-separated) |

---

## Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select existing)
3. Go to **APIs & Services → Credentials**
4. Click **Create Credentials → OAuth 2.0 Client ID**
5. Application type: **Web application**
6. Add authorized redirect URI: `https://YOUR_DOMAIN/auth/google_oauth2/callback`
   - For local dev: `http://localhost:3000/auth/google_oauth2/callback`
7. Copy the Client ID and Client Secret
8. Enable the **Google Sheets API** if you want Sheet backup

---

## Production Checklist

- [ ] Strong `SECRET_KEY_BASE` (64+ hex chars)
- [ ] Strong `POSTGRES_PASSWORD` (20+ chars)
- [ ] Google OAuth credentials configured
- [ ] Rails encryption keys set independently (`ACTIVE_RECORD_ENCRYPTION_PRIMARY_KEY`/`_DETERMINISTIC_KEY`/`_KEY_DERIVATION_SALT`, via sops) — do NOT rely on the `SECRET_KEY_BASE`-derived fallback in production
- [ ] SMTP configured for emails
- [ ] SSL enabled (Let's Encrypt + Nginx)
- [ ] Firewall: ports 22, 80, 443 only
- [ ] fail2ban installed and configured
- [ ] Daily PostgreSQL backup (add to crontab: `pg_dump ... > /backups/sampada_$(date +%F).sql`)
- [ ] Health check monitoring (cron-job.org or similar)
- [ ] `RAILS_FORCE_SSL=true` after SSL setup
