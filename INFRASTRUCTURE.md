# WayVeda Warehouse System — Infrastructure Setup (Phase A)

**For:** Codex / Claude Code  
**From:** Astra (Solution Architect)  
**Date:** 2026-04-03  
**Prerequisite:** Read `WayVeda_Project_Spec.md` first for full project context  

---

## Objective

Set up the complete production infrastructure on the Hostinger VPS so the application can be developed, deployed, and served. This is Phase A — no application code yet, purely infrastructure.

---

## 1. Target State

When Phase A is complete, the VPS should have:

1. **Self-hosted Supabase** running via Docker (PostgreSQL + Kong + Studio)
2. **Caddy** serving as reverse proxy with auto-SSL for two subdomains
3. **PM2** installed globally for Node.js process management
4. **Node.js LTS** installed
5. **The repo** cloned to `/root/apps/wayveda-warehouse-system/`
6. **DNS** configured — both subdomains resolving to the VPS

### Subdomains

| Subdomain | Target | Purpose |
|---|---|---|
| `wh.wayveda.cloud` | `localhost:4002` | React frontend + Express API |
| `db.wayveda.cloud` | `localhost:8000` | Supabase Studio (admin only) |

---

## 2. VPS Details

- **Provider:** Hostinger VPS
- **IP:** 187.127.142.230
- **OS:** Ubuntu (latest LTS)
- **Access:** Root SSH
- **Domain:** `wayveda.cloud` (registered on Hostinger)
- **Path for repo:** /root/apps

---

## 2.1. GIT Repo Details

- <https://github.com/sam9s/wayveda-warehouse-system.git>

## 3. Step-by-Step Setup

### Step 3.1 — System Preparation

```bash
# Update system
apt update && apt upgrade -y

# Install essential tools
apt install -y curl wget git ufw unzip

# Configure firewall
ufw allow OpenSSH
ufw allow 80
ufw allow 443
ufw --force enable
```

### Step 3.2 — Install Node.js (LTS)

```bash
# Install Node.js via NodeSource
curl -fsSL https://deb.nodesource.com/setup_lts.x | bash -
apt install -y nodejs

# Verify
node --version
npm --version
```

### Step 3.3 — Install PM2

```bash
npm install -g pm2
pm2 startup  # auto-start on reboot
```

### Step 3.4 — Install Docker & Docker Compose

Required for self-hosted Supabase.

```bash
# Install Docker
curl -fsSL https://get.docker.com | sh

# Install Docker Compose (if not bundled)
apt install -y docker-compose-plugin

# Verify
docker --version
docker compose version
```

### Step 3.5 — Deploy Self-Hosted Supabase

```bash
# Create Supabase directory
mkdir -p /root/supabase && cd /root/supabase

# Clone Supabase Docker setup
git clone --depth 1 https://github.com/supabase/supabase.git
cd supabase/docker

# Copy example env
cp .env.example .env
```

**Edit `.env` in `/root/supabase/supabase/docker/`:**

Critical variables to set:

- `POSTGRES_PASSWORD` — strong random password
- `JWT_SECRET` — generate with `openssl rand -base64 32`
- `ANON_KEY` — generate via Supabase JWT tool or `supabase/gotrue` docs
- `SERVICE_ROLE_KEY` — generate via same method
- `DASHBOARD_USERNAME` — admin username for Studio
- `DASHBOARD_PASSWORD` — admin password for Studio
- `SITE_URL` — set to `https://wh.wayveda.cloud`
- `API_EXTERNAL_URL` — set to `https://db.wayveda.cloud`

**Important:** Save the `ANON_KEY`, `SERVICE_ROLE_KEY`, `POSTGRES_PASSWORD`, and `JWT_SECRET` — these will be needed for the application `.env` file later.

```bash
# Start Supabase
docker compose up -d

# Verify all containers are running
docker compose ps

# Expected: supabase-db, supabase-kong, supabase-auth,
# supabase-rest, supabase-studio, supabase-realtime, etc.
```

**Verify Supabase is accessible:**

```bash
curl http://localhost:8000/rest/v1/ -H "apikey: YOUR_ANON_KEY"
# Should return empty JSON array or similar
```

### Step 3.6 — Install Caddy

```bash
# Install Caddy
apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
apt update
apt install -y caddy
```

**Create Caddyfile at `/etc/caddy/Caddyfile`:**

```
wh.wayveda.cloud {
    encode gzip zstd

    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "DENY"
    }

    reverse_proxy localhost:4002

    @static {
        path *.js *.css *.png *.jpg *.ico *.svg *.woff *.woff2
    }
    header @static Cache-Control "public, max-age=31536000, immutable"
}

db.wayveda.cloud {
    encode gzip

    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains"
        X-Content-Type-Options "nosniff"
    }

    reverse_proxy localhost:8000
}
```

```bash
# Restart Caddy to pick up new config
systemctl restart caddy
systemctl enable caddy

# Verify Caddy status
systemctl status caddy
```

### Step 3.7 — DNS Configuration

In the Hostinger DNS panel for `wayveda.cloud`, create two A records:

| Type | Name | Value | TTL |
|---|---|---|---|
| A | `wh` | `<VPS_IP_ADDRESS>` | 3600 |
| A | `db` | `<VPS_IP_ADDRESS>` | 3600 |

**Note:** DNS propagation may take a few minutes to a few hours. Caddy will automatically obtain SSL certificates once DNS resolves.

### Step 3.8 — Clone Repository

```bash
mkdir -p /root/apps
cd /root/apps
git clone https://github.com/sam9s/wayveda-warehouse-system.git
cd wayveda-warehouse-system
```

### Step 3.9 — Create Application Environment File

Create `/root/apps/wayveda-warehouse-system/backend/.env`:

```bash
cp /root/apps/wayveda-warehouse-system/backend/.env.example \
   /root/apps/wayveda-warehouse-system/backend/.env
```

Then edit `.env` with actual values (see `.env.example` for the template).

**The project manager (Sammy) will provide the actual values for:**

- Supabase keys (from Step 3.5)
- Shiprocket API credentials
- JWT secret

### Step 3.10 — Create Directory Structure

```bash
cd /root/apps/wayveda-warehouse-system
mkdir -p backend/src/{config,auth,routes,controllers,services,db/{migrations,views},utils}
mkdir -p frontend/src/{auth,components/{Layout,common,forms},pages,styles,utils}
mkdir -p frontend/public
mkdir -p logs
```

---

## 4. Verification Checklist

After completing all steps, verify each component:

| Check | Command | Expected |
|---|---|---|
| Node.js | `node --version` | v20.x or v22.x LTS |
| npm | `npm --version` | 10.x+ |
| PM2 | `pm2 --version` | 5.x+ |
| Docker | `docker --version` | 24.x+ |
| Supabase DB | `docker compose ps` (in supabase dir) | All containers Up |
| Supabase API | `curl localhost:8000` | Response (not connection refused) |
| Caddy | `systemctl status caddy` | Active (running) |
| SSL (wh) | `curl -I https://wh.wayveda.cloud` | 502 is OK (no backend yet) |
| SSL (db) | `curl -I https://db.wayveda.cloud` | 200 or Supabase Studio |
| Repo | `ls /root/apps/wayveda-warehouse-system/` | Files present |

**Note:** `wh.wayveda.cloud` returning 502 is expected at this stage — there's no Express server running yet. The important thing is that Caddy responds with a valid SSL certificate, not a connection error.

---

## 5. Reference: GREST Infrastructure

This setup mirrors the GREST Warehouse System infrastructure exactly:

- Same VPS provider pattern (Hostinger)
- Same Caddy configuration pattern (see `tmp_caddyfile` in GREST repo)
- Same PM2 configuration pattern (see `ecosystem.config.js` in GREST repo)
- Same Supabase self-hosted setup
- Same port conventions (`4002` for app, `8000` for Supabase)
- Reference repo is at D:\RAVENs\Wayveda-Warehouse-System\GWMS_repo
- GREST repo for reference: `https://github.com/sam9s/GREST-Warehouse-System.git`

---

## 6. What Comes Next (Phase B)

Once Phase A is verified, Phase B begins:

1. Create PostgreSQL tables (schema from `WayVeda_Project_Spec.md` Section 5)
2. Create SQL views (from same section)
3. Seed the 12 product SKUs
4. Import historical movement data (11 rows from Google Sheet)
5. Verify ledger calculations

Phase B does NOT require Shiprocket credentials. Those are needed in Phase E.

---

## 7. Troubleshooting

### Supabase containers won't start

- Check Docker logs: `docker compose logs -f`
- Ensure port 5432 isn't already in use: `lsof -i :5432`
- Ensure sufficient disk space: `df -h`

### Caddy SSL fails

- DNS must resolve first — check with: `dig wh.wayveda.cloud`
- Ports 80 and 443 must be open: `ufw status`
- Check Caddy logs: `journalctl -u caddy -f`

### PM2 not persisting after reboot

- Run: `pm2 save` after starting processes
- Run: `pm2 startup` and follow the output command

---

## 8. Security Reminders

- Never commit `.env` files to GitHub
- Restrict `db.wayveda.cloud` access (consider IP whitelist in Caddy later)
- Use strong passwords for Supabase dashboard
- The Shiprocket API user should be a dedicated API user, not the admin account
- SSH key-based auth is recommended over password auth
