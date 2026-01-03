# VPS Deployment Guide

This guide covers deploying TrainTracker to a VPS (Virtual Private Server) with an existing nginx setup, such as a DigitalOcean Droplet hosting multiple applications.

## Architecture Overview

The VPS deployment uses a two-tier nginx architecture:

```
Internet (HTTPS)
    ↓
Host Nginx (:443)
├── SSL Termination (Certbot)
├── Domain Routing (server_name)
└── Proxy to localhost:8724
    ↓
Container Nginx (:8724 → :80)
├── Rate Limiting (10 req/s)
├── Caching (static assets, map data)
├── Compression (gzip)
├── Security Headers
└── Proxy to app:3000
    ↓
Next.js App (:3000, internal)
├── API Routes
├── SSR/SSG Pages
├── Push Notifications
└── SQLite Database (Docker volume)
```

**Benefits:**

- Host nginx manages SSL and domain routing centrally
- Container nginx provides application-specific optimizations
- Configuration stays in version control
- Easy to migrate or replicate the application

## Prerequisites

### On Your VPS

1. **Operating System**: Debian 11+ or Ubuntu 20.04+ recommended
2. **Docker**: Version 20.10 or higher
3. **Docker Compose**: Version 2.0 or higher
4. **Nginx**: Installed and running on the host
5. **Certbot**: For SSL certificate management
6. **Domain**: DNS configured to point to your VPS IP address

### Installation Commands (if needed)

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt install docker-compose-plugin

# Install nginx and Certbot
sudo apt install nginx certbot python3-certbot-nginx

# Verify installations
docker --version
docker compose version
nginx -v
certbot --version
```

### On Your Local Machine

1. **SSH access** to your VPS configured
2. **Git** to clone the repository
3. **rsync** for the deployment script (usually pre-installed)

## Initial Setup

### 1. Prepare Your VPS

SSH into your VPS and create the application directory:

```bash
ssh your-user@your-vps-ip
sudo mkdir -p /opt/traintracker
sudo chown $USER:$USER /opt/traintracker
```

### 2. Configure Domain DNS

Ensure your domain has an A record pointing to your VPS IP:

```
Type: A
Name: traintracker (or @ for root domain)
Value: YOUR_VPS_IP
TTL: 3600
```

Wait for DNS propagation (check with `dig traintracker.yourdomain.com`).

### 3. Generate VAPID Keys

On your local machine, generate keys for web push notifications:

```bash
npx web-push generate-vapid-keys
```

Save these keys - you'll need them for the `.env` file.

### 4. Configure Environment Variables

On your VPS, create the environment file:

```bash
ssh your-user@your-vps-ip
cd /opt/traintracker
cp .env.docker .env
nano .env
```

Update with your VAPID keys:

```env
DATABASE_URL=file:/app/db/app.db

VAPID_PUBLIC_KEY=your-actual-public-key
VAPID_PRIVATE_KEY=your-actual-private-key
VAPID_SUBJECT=mailto:your-email@example.com

ENABLE_NOTIFICATIONS=true

PORT=8724
```

Save and exit (Ctrl+X, Y, Enter).

## Deployment Methods

You can deploy using either the automated script or manual steps.

### Method 1: Automated Deployment (Recommended)

**On your local machine:**

1. Edit the deployment script configuration:

```bash
nano deploy.sh
```

Update these variables:

```bash
VPS_HOST="your-vps-hostname-or-ip"
VPS_USER="your-username"
DOMAIN="traintracker.yourdomain.com"
APP_DIR="/opt/traintracker"
CONTAINER_PORT="8724"
```

2. Set up SSH key authentication (if not already):

```bash
ssh-copy-id your-user@your-vps-ip
```

3. Run the deployment script:

```bash
./deploy.sh
```

The script will:

- Sync application files to the VPS
- Deploy the nginx configuration
- Build and start Docker containers
- Configure host nginx
- Verify the deployment

4. Set up SSL (first time only):

```bash
ssh your-user@your-vps-ip
sudo certbot --nginx -d traintracker.yourdomain.com
```

Follow the prompts to obtain an SSL certificate.

### Method 2: Manual Deployment

**On your local machine:**

1. Clone or sync the repository to your VPS:

```bash
rsync -avz --exclude 'node_modules' --exclude '.next' --exclude 'db/app.db' \
  ./ your-user@your-vps-ip:/opt/traintracker/
```

**On your VPS:**

2. Deploy the nginx configuration:

```bash
cd /opt/traintracker

# Replace domain placeholder
sudo sed "s/DOMAIN_PLACEHOLDER/traintracker.yourdomain.com/g" \
  nginx-vps.conf | sudo tee /etc/nginx/sites-available/traintracker

# Enable the site
sudo ln -s /etc/nginx/sites-available/traintracker /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# If test passes, reload nginx
sudo systemctl reload nginx
```

3. Build and start Docker containers:

```bash
cd /opt/traintracker
docker compose up -d --build
```

4. Set up SSL certificate:

```bash
sudo certbot --nginx -d traintracker.yourdomain.com
```

5. Verify deployment:

```bash
# Check containers are running
docker compose ps

# Test local endpoint
curl http://localhost:8724/api/notifications/vapid-key

# Test public endpoint
curl https://traintracker.yourdomain.com/api/notifications/vapid-key
```

## Updating the Application

### Using Deployment Script

Simply run the script again:

```bash
./deploy.sh
```

### Manual Update

```bash
ssh your-user@your-vps-ip
cd /opt/traintracker

# Pull latest changes (if using git)
git pull origin main

# Or sync from local (from your local machine)
rsync -avz --exclude 'node_modules' --exclude '.next' --exclude 'db/app.db' \
  ./ your-user@your-vps-ip:/opt/traintracker/

# Rebuild and restart containers
docker compose up -d --build

# Check status
docker compose ps
```

## Monitoring and Maintenance

### Viewing Logs

**Container logs:**

```bash
cd /opt/traintracker

# All services
docker compose logs -f

# Specific service
docker compose logs -f app
docker compose logs -f nginx

# Last 100 lines
docker compose logs --tail=100
```

**Host nginx logs:**

```bash
# Access log
sudo tail -f /var/log/nginx/traintracker-access.log

# Error log
sudo tail -f /var/log/nginx/traintracker-error.log

# All nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Health Checks

**Check container health:**

```bash
docker compose ps
```

Look for "healthy" status on both containers.

**Test endpoints:**

```bash
# Container endpoint
curl http://localhost:8724/api/notifications/vapid-key

# Public endpoint
curl https://yourdomain.com/api/notifications/vapid-key
```

**Check resource usage:**

```bash
docker stats
```

### Database Operations

**Backup database:**

```bash
docker run --rm \
  -v traintracker-db:/data \
  -v /opt/traintracker/backups:/backup \
  alpine cp /data/app.db /backup/traintracker-$(date +%Y%m%d-%H%M%S).db
```

**Restore database:**

```bash
# Stop application
cd /opt/traintracker
docker compose stop app

# Restore
docker run --rm \
  -v traintracker-db:/data \
  -v /opt/traintracker/backups:/backup \
  alpine cp /backup/your-backup.db /data/app.db

# Restart application
docker compose start app
```

**Access database directly:**

```bash
docker compose exec app sh
cd /app/db
sqlite3 app.db
```

### SSL Certificate Renewal

Certbot automatically renews certificates. To test renewal:

```bash
sudo certbot renew --dry-run
```

To check renewal status:

```bash
sudo systemctl status certbot.timer
```

## Troubleshooting

### Container Not Starting

**Check logs:**

```bash
docker compose logs app
docker compose logs nginx
```

**Common issues:**

- Missing `.env` file or invalid VAPID keys
- Port 8724 already in use
- Database migration failures

**Solutions:**

```bash
# Check if port is in use
sudo lsof -i :8724

# Verify environment file
cat .env

# Check Docker networks
docker network ls
docker network inspect traintracker-network
```

### Cannot Access Application

**Verify nginx configuration:**

```bash
sudo nginx -t
```

**Check if container is accessible:**

```bash
curl http://localhost:8724/api/notifications/vapid-key
```

**Check host nginx logs:**

```bash
sudo tail -f /var/log/nginx/traintracker-error.log
```

**Common issues:**

- DNS not propagated yet
- Firewall blocking ports 80/443
- Host nginx not proxying correctly
- Container not bound to correct port

**Solutions:**

```bash
# Check firewall
sudo ufw status

# Allow HTTP/HTTPS if needed
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Verify nginx is running
sudo systemctl status nginx

# Check container port mapping
docker port traintracker-nginx
```

### SSL Certificate Issues

**Certificate not found:**

```bash
sudo certbot certificates
```

**Re-obtain certificate:**

```bash
sudo certbot --nginx -d yourdomain.com --force-renewal
```

**Check certificate expiry:**

```bash
echo | openssl s_client -connect yourdomain.com:443 2>/dev/null | \
  openssl x509 -noout -dates
```

### Performance Issues

**Check resource usage:**

```bash
docker stats

# System resources
htop
df -h
```

**Container resource limits:**
Edit `docker-compose.yml` to add resource limits:

```yaml
services:
  app:
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 512M
```

### Database Issues

**Database locked:**

```bash
# Stop app container
docker compose stop app

# Wait a few seconds
sleep 5

# Start app container
docker compose start app
```

**Corrupt database:**

```bash
# Restore from backup (see Database Operations section)
```

**Check database integrity:**

```bash
docker compose exec app sh
cd /app/db
sqlite3 app.db "PRAGMA integrity_check;"
```

## Security Best Practices

### Firewall Configuration

```bash
# Default deny incoming
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH (change 22 if using custom port)
sudo ufw allow 22/tcp

# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

### Secure SSH

Edit SSH configuration:

```bash
sudo nano /etc/ssh/sshd_config
```

Recommended settings:

```
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
```

Restart SSH:

```bash
sudo systemctl restart sshd
```

### Regular Updates

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Update Docker images
cd /opt/traintracker
docker compose pull
docker compose up -d
```

### Backup Strategy

Create a backup script `/opt/traintracker/backup.sh`:

```bash
#!/bin/bash
BACKUP_DIR="/opt/traintracker/backups"
DATE=$(date +%Y%m%d-%H%M%S)

mkdir -p $BACKUP_DIR

# Backup database
docker run --rm \
  -v traintracker-db:/data \
  -v $BACKUP_DIR:/backup \
  alpine cp /data/app.db /backup/traintracker-$DATE.db

# Backup environment file
cp /opt/traintracker/.env $BACKUP_DIR/.env-$DATE

# Keep only last 30 days of backups
find $BACKUP_DIR -name "traintracker-*.db" -mtime +30 -delete
find $BACKUP_DIR -name ".env-*" -mtime +30 -delete

echo "Backup completed: $BACKUP_DIR/traintracker-$DATE.db"
```

Make executable and schedule:

```bash
chmod +x /opt/traintracker/backup.sh

# Add to crontab (daily at 2 AM)
crontab -e
# Add line:
0 2 * * * /opt/traintracker/backup.sh
```

## Advanced Configuration

### Using a Different Port

Edit `.env` on the VPS:

```env
PORT=3002
```

Update the host nginx configuration:

```bash
sudo nano /etc/nginx/sites-available/traintracker
# Change proxy_pass to http://localhost:3002
sudo nginx -t
sudo systemctl reload nginx
```

Restart containers:

```bash
docker compose up -d
```

### Multiple Environments

Create environment-specific configs:

```bash
# Staging
docker-compose.staging.yml

# Production
docker-compose.production.yml
```

Deploy with:

```bash
docker compose -f docker-compose.yml -f docker-compose.production.yml up -d
```

### Custom Domain per Environment

Create separate nginx configs:

- `/etc/nginx/sites-available/traintracker-staging`
- `/etc/nginx/sites-available/traintracker-production`

Each pointing to different ports (8724, 3002, etc.).

## Migration from Existing Deployment

If you're migrating from another hosting setup:

1. **Backup existing database:**
   - Export from current hosting
   - Convert to SQLite format if needed

2. **Copy to VPS:**

```bash
scp your-backup.db your-user@your-vps-ip:/opt/traintracker/backups/
```

3. **Restore before first deployment:**

```bash
ssh your-user@your-vps-ip
cd /opt/traintracker

# Create volume
docker volume create traintracker-db

# Restore backup
docker run --rm \
  -v traintracker-db:/data \
  -v $(pwd)/backups:/backup \
  alpine cp /backup/your-backup.db /data/app.db
```

4. **Deploy application** using methods above

5. **Update DNS** to point to new VPS

6. **Monitor** for issues

## Cost Considerations

### Recommended VPS Specs

**Minimum:**

- 1 vCPU
- 1 GB RAM
- 25 GB SSD
- ~$6/month (DigitalOcean, Linode, Vultr)

**Recommended:**

- 2 vCPU
- 2 GB RAM
- 50 GB SSD
- ~$12/month

### Optimization

- Use gzip compression (already configured)
- Enable caching (already configured)
- Use CDN for static assets (optional)
- Monitor resource usage and scale as needed

## Getting Help

**Check logs first:**

```bash
# Container logs
docker compose logs -f

# Host nginx logs
sudo tail -f /var/log/nginx/traintracker-error.log

# System logs
sudo journalctl -u docker
```

**Verify configuration:**

```bash
# Test nginx config
sudo nginx -t

# Check Docker status
docker compose ps
docker compose config
```

**Test endpoints:**

```bash
# Local
curl -v http://localhost:8724/api/notifications/vapid-key

# Public
curl -v https://yourdomain.com/api/notifications/vapid-key
```

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [Certbot Documentation](https://certbot.eff.org/docs/)
- [DigitalOcean Tutorials](https://www.digitalocean.com/community/tutorials)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
