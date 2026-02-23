# Deployment Guide

This guide covers deploying TrainTracker to a VPS (Virtual Private Server) with Docker and a two-tier nginx architecture.

## Architecture

```
Internet (HTTPS)
    ↓
Cloudflare (CDN, Brotli compression, DDoS protection)
    ↓
Host Nginx (:443)
├── TLS Termination (Certbot)
├── Domain Routing (server_name)
├── Security (blocks exploit paths, rate limits sensitive endpoints)
└── Proxy to localhost:8724
    ↓
Container Nginx (:8724 → :80)
├── Rate Limiting (10 req/s per IP)
├── Caching (static assets, map data)
├── Security Headers
├── Real IP resolution (from X-Real-IP header)
└── Proxy to app:3000
    ↓
Next.js App (:3000, internal)
├── API Routes
├── SSR/SSG Pages
├── Push Notifications
└── SQLite Database (Docker volume)
```

**Why two nginx tiers?**

- **Host nginx** manages SSL and domain routing centrally (shared with other apps on the VPS)
- **Container nginx** provides application-specific caching, rate limiting, and optimization
- Container nginx config (`nginx.conf`) stays in version control

## Prerequisites

On your VPS:

- **OS**: Debian 11+ or Ubuntu 20.04+
- **Docker Engine** 20.10+ and **Docker Compose** v2.0+
- **Nginx** installed on the host
- **Certbot** for SSL certificate management
- **Domain** with DNS pointing to your VPS IP

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose, nginx, and Certbot
sudo apt install docker-compose-plugin nginx certbot python3-certbot-nginx
```

On your local machine:

- SSH access to the VPS (preferably key-based)
- Git and rsync

## Initial Setup

### 1. Create application directory

```bash
ssh your-user@your-vps
sudo mkdir -p /opt/traintracker
sudo chown $USER:$USER /opt/traintracker
```

### 2. Configure environment variables

On the VPS:

```bash
cd /opt/traintracker
cp .env.example .env
nano .env
```

Update with your VAPID keys (generate with `npx web-push generate-vapid-keys`):

```env
VAPID_PUBLIC_KEY=your-generated-public-key
VAPID_PRIVATE_KEY=your-generated-private-key
VAPID_SUBJECT=mailto:your-email@example.com
ENABLE_NOTIFICATIONS=true
PORT=8724
```

> **Note:** `DATABASE_URL` can be omitted — `docker-compose.yml` overrides it automatically with the Docker volume path.

### 3. Configure the deployment script

On your local machine, edit `deploy.sh`:

```bash
VPS_HOST="your-vps-hostname-or-ip"
VPS_USER="your-username"
DOMAIN="traintracker.yourdomain.com"
APP_DIR="/opt/traintracker"
CONTAINER_PORT="8724"
```

Set up SSH key auth if you haven't:

```bash
ssh-copy-id your-user@your-vps
```

### 4. Deploy

```bash
chmod +x deploy.sh
./deploy.sh
```

The script syncs files, deploys the nginx config, builds and starts Docker containers, and verifies the deployment.

### 5. Set up SSL (first time only)

```bash
ssh your-user@your-vps
sudo certbot --nginx -d traintracker.yourdomain.com
```

Follow the prompts to obtain an SSL certificate.

## Deploying Updates

### Automated (recommended)

```bash
./deploy.sh
```

### Manual

```bash
ssh your-user@your-vps
cd /opt/traintracker

# Sync files from local machine (run from local):
rsync -avz --exclude 'node_modules' --exclude '.next' --exclude 'db/app.db' \
  ./ your-user@your-vps:/opt/traintracker/

# On the VPS, rebuild and restart:
docker compose up -d --build
```

### Updating the host nginx config

> **WARNING — Certbot footgun:** The `nginx-vps.conf` template in this repo is an HTTP-only server block. When you deploy it (either via `deploy.sh` or manually with `sed`), it **overwrites the certbot-managed config** at `/etc/nginx/sites-available/traintracker`, which includes the HTTPS server block, SSL certificate paths, and HTTP→HTTPS redirect that certbot added.
>
> **After any update to the host nginx config, you must re-run certbot to restore HTTPS:**
>
> ```bash
> sudo certbot --nginx -d traintracker.app
> ```
>
> Select the option to reinstall the existing certificate (not issue a new one). Then reload:
>
> ```bash
> sudo nginx -t && sudo systemctl reload nginx
> ```
>
> If you skip this step, Cloudflare will return **520 errors** because it can't establish an HTTPS connection to the origin.

### Updating the container nginx config

Changes to `nginx.conf` are picked up when the container restarts. To reload without a full restart (avoids the `depends_on: service_healthy` wait):

```bash
docker compose exec nginx nginx -s reload
```

## Nginx Configuration

### `nginx-vps.conf` — Host nginx (template)

Deployed to `/etc/nginx/sites-available/traintracker` with domain substitution. Handles:

- Blocking common exploit/scan paths (`.env`, `.git`, `wp-admin`, `phpMyAdmin`, etc.)
- Rate limiting: 10 req/s general, 1 req/s for notification endpoints
- Forwarding real client IP from Cloudflare's `CF-Connecting-IP` header
- Proxying to the container nginx on `127.0.0.1:8724`
- HSTS header

Certbot adds the HTTPS server block, SSL cert paths, and HTTP→HTTPS redirect to the deployed copy.

### `nginx.conf` — Container nginx

Mounted read-only into the Docker container. Handles:

- Real IP resolution from the `X-Real-IP` header (trusts Docker network ranges)
- Rate limiting: 10 req/s for API routes
- Static asset caching (1 year for `/_next/static/`, 1 week for `/map_data/`)
- Service worker served with `no-cache`
- Security headers (`X-Frame-Options`, `X-Content-Type-Options`, `X-XSS-Protection`)
- Proxying to the Next.js app on `app:3000`
- Compression is off (Cloudflare handles Brotli at the edge)

### Port mapping

| Component       | Port                                 | Visibility                     |
| --------------- | ------------------------------------ | ------------------------------ |
| Next.js app     | 3000                                 | Internal (Docker network only) |
| Container nginx | 80 (mapped to host `127.0.0.1:8724`) | Localhost only                 |
| Host nginx      | 443                                  | Public (via Cloudflare)        |

## Management

### Viewing logs

```bash
# Container logs
docker compose logs -f          # all services
docker compose logs -f app      # Next.js app only
docker compose logs -f nginx    # container nginx only
docker compose logs --tail=100  # last 100 lines

# Host nginx logs
sudo tail -f /var/log/nginx/traintracker-access.log
sudo tail -f /var/log/nginx/traintracker-error.log
```

### Health checks

```bash
# Container health status
docker compose ps

# Test container endpoint directly
curl http://localhost:8724/api/notifications/vapid-key

# Test public endpoint
curl https://yourdomain.com/api/notifications/vapid-key

# Resource usage
docker stats
```

### Stopping and restarting

```bash
docker compose stop       # stop containers
docker compose start      # start stopped containers
docker compose restart    # restart containers
docker compose down       # stop and remove containers (preserves volumes)
```

## Database Operations

The app uses SQLite, persisted in a Docker volume (`traintracker-db`) mounted at `/app/data/` inside the container. Prisma migrations run automatically on container startup.

### Backup

```bash
docker run --rm \
  -v traintracker-db:/data \
  -v $(pwd)/backups:/backup \
  alpine cp /data/app.db /backup/traintracker-$(date +%Y%m%d-%H%M%S).db
```

### Restore

```bash
docker compose stop app

docker run --rm \
  -v traintracker-db:/data \
  -v $(pwd)/backups:/backup \
  alpine cp /backup/your-backup.db /data/app.db

docker compose start app
```

### Direct access

```bash
docker compose exec app sh
sqlite3 /app/data/app.db
```

### Check integrity

```bash
docker compose exec app sh -c 'sqlite3 /app/data/app.db "PRAGMA integrity_check;"'
```

### Reset database (destructive)

```bash
docker compose down -v  # removes volume with database
docker compose up -d    # recreates everything
```

### Scheduled backups

Create `/opt/traintracker/backup.sh`:

```bash
#!/bin/bash
BACKUP_DIR="/opt/traintracker/backups"
DATE=$(date +%Y%m%d-%H%M%S)

mkdir -p $BACKUP_DIR

docker run --rm \
  -v traintracker-db:/data \
  -v $BACKUP_DIR:/backup \
  alpine cp /data/app.db /backup/traintracker-$DATE.db

# Keep only last 30 days
find $BACKUP_DIR -name "traintracker-*.db" -mtime +30 -delete

echo "Backup completed: $BACKUP_DIR/traintracker-$DATE.db"
```

```bash
chmod +x /opt/traintracker/backup.sh

# Add to crontab (daily at 2 AM)
crontab -e
# Add: 0 2 * * * /opt/traintracker/backup.sh
```

## SSL / Certbot

### Obtain certificate (first time)

```bash
sudo certbot --nginx -d yourdomain.com
```

### Reinstall certificate after nginx config update

```bash
sudo certbot --nginx -d yourdomain.com
# Select "reinstall existing certificate"
sudo systemctl reload nginx
```

### Check certificate status

```bash
sudo certbot certificates
```

### Test auto-renewal

```bash
sudo certbot renew --dry-run
sudo systemctl status certbot.timer
```

### Check certificate expiry

```bash
echo | openssl s_client -connect yourdomain.com:443 2>/dev/null | \
  openssl x509 -noout -dates
```

## Troubleshooting

### Container not starting

```bash
docker compose logs app     # check for startup errors
docker compose logs nginx   # check for config errors
docker compose ps           # look at STATUS column
```

Common causes:

- Missing `.env` or invalid VAPID keys
- Port 8724 already in use (`sudo lsof -i :8724`)
- Database migration failures (check app logs)

### 520 errors from Cloudflare

This means Cloudflare can't connect to your origin over HTTPS. Most likely the host nginx HTTPS config is missing.

```bash
# Check if certbot config is present
sudo grep -l "ssl_certificate" /etc/nginx/sites-available/traintracker

# If not found, reinstall:
sudo certbot --nginx -d yourdomain.com
sudo systemctl reload nginx
```

### "Connection refused" to upstream in host nginx logs

The Docker container isn't listening on port 8724.

```bash
docker compose ps                                           # is nginx running?
curl -I http://127.0.0.1:8724/health                       # can you reach it directly?
docker compose up -d                                        # start any stopped containers
docker compose exec nginx nginx -t                          # check container nginx config
```

If the nginx container won't start, the app container's health check may be failing (nginx `depends_on: condition: service_healthy`). Check `docker compose logs app`.

### Firewall issues

```bash
sudo ufw status

# Allow HTTP/HTTPS if needed
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

### Container accessible locally but not publicly

```bash
# Verify host nginx is running
sudo systemctl status nginx

# Test nginx config
sudo nginx -t

# Check host nginx error log
sudo tail -20 /var/log/nginx/traintracker-error.log

# Verify port mapping
docker port traintracker-nginx
```

## Security

### Firewall

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP (for certbot challenges)
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

### SSH hardening

In `/etc/ssh/sshd_config`:

```
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
```

```bash
sudo systemctl restart sshd
```
