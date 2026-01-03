# Docker Deployment Guide

This guide explains how to deploy the TrainTracker application using Docker and Docker Compose.

## Architecture

The Docker setup includes:

- **Next.js Application**: Production-optimized standalone build
- **Nginx Reverse Proxy**: Handles SSL termination, caching, and rate limiting
- **SQLite Database**: Persisted in a Docker volume
- **Automatic Migrations**: Prisma migrations run on container startup

## Prerequisites

- Docker Engine 20.10+
- Docker Compose v2.0+
- VAPID keys for web push notifications

## Setup

### 1. Generate VAPID Keys

If you don't have VAPID keys yet, generate them:

```bash
npx web-push generate-vapid-keys
```

### 2. Configure Environment Variables

Copy the Docker environment template:

```bash
cp .env.docker .env
```

Edit `.env` and add your VAPID keys:

```env
VAPID_PUBLIC_KEY=your-generated-public-key
VAPID_PRIVATE_KEY=your-generated-private-key
VAPID_SUBJECT=mailto:your-email@example.com
```

Optionally change the exposed port:

```env
PORT=8724  # Default for VPS deployment
PORT=80    # For standalone deployment
```

**Note**: The default is now 8724 to support VPS deployments with host nginx. For standalone deployments without host nginx, you may want to use port 80 or 443.

### 3. Build and Start

Build and start all services:

```bash
docker-compose up -d
```

This will:

- Build the Next.js application with optimizations
- Run Prisma migrations automatically
- Start the nginx reverse proxy
- Create and mount the database volume

### 4. Verify Deployment

Check that services are running:

```bash
docker-compose ps
```

View logs:

```bash
# All services
docker-compose logs -f

# Just the app
docker-compose logs -f app

# Just nginx
docker-compose logs -f nginx
```

Access the application at `http://localhost` (or your configured PORT).

## Management

### Stop Services

```bash
docker-compose stop
```

### Restart Services

```bash
docker-compose restart
```

### Rebuild After Code Changes

```bash
docker-compose up -d --build
```

### View Real-time Logs

```bash
docker-compose logs -f
```

### Access Application Shell

```bash
docker-compose exec app sh
```

## Database Management

### Backup Database

```bash
docker run --rm \
  -v traintracker-db:/data \
  -v $(pwd):/backup \
  alpine cp /data/app.db /backup/backup-$(date +%Y%m%d-%H%M%S).db
```

### Restore Database

```bash
docker run --rm \
  -v traintracker-db:/data \
  -v $(pwd):/backup \
  alpine cp /backup/your-backup.db /data/app.db

# Restart the app
docker-compose restart app
```

### Run Migrations Manually

```bash
docker-compose exec app npx prisma migrate deploy
```

### Reset Database (⚠️ Destructive)

```bash
docker-compose down -v  # Removes volume with database
docker-compose up -d    # Recreates everything
```

## Nginx Configuration

The nginx reverse proxy provides:

- **Caching**: Static assets cached for 1 year, map data for 1 week
- **Rate Limiting**: API endpoints limited to 10 requests/second per IP (burst of 20)
- **Compression**: Gzip enabled for text and JSON responses
- **Security Headers**: X-Frame-Options, X-Content-Type-Options, X-XSS-Protection

To modify nginx configuration:

1. Edit `nginx.conf`
2. Reload nginx: `docker-compose exec nginx nginx -s reload`

## Health Checks

Both services include health checks:

- **App**: Checks `/api/notifications/vapid-key` every 30s
- **Nginx**: Checks proxy connectivity every 30s

View health status:

```bash
docker-compose ps
```

## VPS Deployment with Host Nginx

For deployment on a VPS (Virtual Private Server) with an existing nginx setup that hosts multiple applications:

### Architecture

This deployment uses a **two-tier nginx architecture**:

```
Internet (HTTPS) → Host Nginx (SSL, domain routing) → Container Nginx (caching, rate limiting) → Next.js App
```

**Benefits:**

- **Host nginx**: Centralized SSL/TLS termination and domain routing
- **Container nginx**: Application-specific caching, rate limiting, and optimization
- **Version control**: Container nginx config stays in the repository
- **Flexibility**: Easy to update application without affecting other services on the host

### Quick Setup

1. **Configure Port in `.env`:**

   ```env
   PORT=8724
   ```

   The default port is now 8724 to avoid conflicts with other services.

2. **Deploy Host Nginx Config:**

   ```bash
   # Copy the template (replace DOMAIN_PLACEHOLDER with your domain)
   sudo sed "s/DOMAIN_PLACEHOLDER/yourdomain.com/g" nginx-vps.conf \
     | sudo tee /etc/nginx/sites-available/traintracker

   # Enable the site
   sudo ln -s /etc/nginx/sites-available/traintracker /etc/nginx/sites-enabled/

   # Test configuration
   sudo nginx -t

   # Reload nginx
   sudo systemctl reload nginx
   ```

3. **Obtain SSL Certificate:**

   ```bash
   sudo certbot --nginx -d yourdomain.com
   ```

4. **Start Docker Containers:**
   ```bash
   docker-compose up -d
   ```

### Automated Deployment

Use the provided deployment script for automated deployments:

1. **Configure the script:**

   ```bash
   nano deploy.sh
   ```

   Update `VPS_HOST`, `VPS_USER`, and `DOMAIN` variables.

2. **Run the script:**
   ```bash
   chmod +x deploy.sh
   ./deploy.sh
   ```

The script handles:

- Syncing application files to the VPS
- Deploying and configuring host nginx
- Building and starting Docker containers
- Verifying the deployment

### Port Configuration

The container nginx is exposed on `localhost:8724` by default:

```yaml
# docker-compose.yml
ports:
  - '127.0.0.1:${PORT:-8724}:80'
```

This binds to localhost only for security. The host nginx proxies to this port:

```nginx
# nginx-vps.conf
location / {
    proxy_pass http://localhost:8724;
    # ... additional proxy settings
}
```

### Updating the Application

**Using the deployment script:**

```bash
./deploy.sh
```

**Manual update:**

```bash
ssh user@your-vps
cd /opt/traintracker
git pull origin main
docker-compose up -d --build
```

### Troubleshooting

**Container not accessible:**

```bash
# Verify container is running
docker-compose ps

# Check port mapping
docker port traintracker-nginx

# Test directly
curl http://localhost:8724/api/notifications/vapid-key
```

**SSL certificate errors:**

```bash
# List certificates
sudo certbot certificates

# Renew if needed
sudo certbot renew
```

**Headers not forwarded correctly:**

```bash
# Check container nginx logs
docker-compose logs nginx

# Verify X-Forwarded-Proto header
curl -H "X-Forwarded-Proto: https" http://localhost:8724
```

### Comprehensive Guide

For complete VPS deployment instructions including prerequisites, security best practices, monitoring, and advanced configuration, see **[VPS-DEPLOYMENT.md](VPS-DEPLOYMENT.md)**.

## Production Deployment

For production deployment:

### 1. SSL/TLS Configuration

Add an SSL certificate (recommended: Let's Encrypt with Certbot):

1. Update `nginx.conf` to include SSL configuration
2. Mount certificate files in `docker-compose.yml`:
   ```yaml
   volumes:
     - ./nginx.conf:/etc/nginx/nginx.conf:ro
     - /etc/letsencrypt:/etc/letsencrypt:ro
   ```

### 2. Environment Security

- Store `.env` securely and never commit it to version control
- Use secrets management (Docker Secrets, AWS Secrets Manager, etc.)
- Rotate VAPID keys periodically

### 3. Resource Limits

Add resource constraints to `docker-compose.yml`:

```yaml
services:
  app:
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M
```

### 4. Monitoring

Consider adding:

- Container monitoring (Prometheus + Grafana)
- Log aggregation (ELK stack, Loki)
- Uptime monitoring (UptimeRobot, Pingdom)

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker-compose logs app

# Check if port is already in use
lsof -i :80
```

### Database Errors

```bash
# Verify database volume exists
docker volume inspect traintracker-db

# Check database file permissions
docker-compose exec app ls -la /app/db/
```

### Build Failures

```bash
# Clean build cache
docker-compose build --no-cache

# Remove all containers and rebuild
docker-compose down
docker-compose up -d --build
```

### Migration Failures

```bash
# Check migration status
docker-compose exec app npx prisma migrate status

# Manually run migrations
docker-compose exec app npx prisma migrate deploy
```

## Development vs Production

This configuration is optimized for **production**. For development:

1. Use `npm run dev` locally (not Docker)
2. Or create a separate `docker-compose.dev.yml` with:
   - Volume mounts for hot-reload
   - Development build
   - Exposed debugging ports

## Scaling Considerations

For high-traffic deployments:

1. **Horizontal Scaling**: Use a proper database (PostgreSQL) instead of SQLite
2. **Load Balancing**: Deploy multiple app containers behind nginx
3. **CDN**: Serve static assets from a CDN
4. **Caching**: Add Redis for API response caching

## Additional Resources

- [Next.js Docker Documentation](https://nextjs.org/docs/deployment#docker-image)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Nginx Configuration Guide](https://nginx.org/en/docs/)
