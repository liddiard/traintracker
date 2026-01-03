#!/bin/bash
# TrainTracker VPS Deployment Script
#
# This script automates deploying the TrainTracker application to a VPS
# with an existing nginx setup.
#
# Prerequisites:
# - SSH access to VPS configured (use ssh-copy-id for passwordless access)
# - Docker and Docker Compose installed on VPS
# - Host nginx installed on VPS
# - Application directory created on VPS (default: /opt/traintracker)
#
# Usage:
#   ./deploy.sh
#
# First-time setup:
#   1. Edit configuration variables below
#   2. Run: chmod +x deploy.sh
#   3. Run: ./deploy.sh

set -e  # Exit on any error

# ========================================
# Configuration - EDIT THESE VALUES
# ========================================

VPS_HOST="your-vps-hostname-or-ip"
VPS_USER="your-username"
DOMAIN="traintracker.yourdomain.com"
APP_DIR="/opt/traintracker"
CONTAINER_PORT="8724"  # Should match PORT in .env

# ========================================
# Color output for better readability
# ========================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

# ========================================
# Pre-flight checks
# ========================================

info "Starting deployment to ${VPS_HOST}..."

# Check if configuration has been edited
if [[ "$VPS_HOST" == "your-vps-hostname-or-ip" ]]; then
    error "Please edit deploy.sh and set VPS_HOST, VPS_USER, and DOMAIN"
fi

# Check SSH connectivity
info "Testing SSH connection..."
if ! ssh -o ConnectTimeout=5 -o BatchMode=yes ${VPS_USER}@${VPS_HOST} echo "SSH OK" > /dev/null 2>&1; then
    error "Cannot connect to ${VPS_USER}@${VPS_HOST}. Please check SSH configuration."
fi
info "SSH connection successful"

# Check if .env file exists locally
if [[ ! -f .env ]]; then
    warn ".env file not found. Make sure to create it on the VPS with VAPID keys."
fi

# ========================================
# Step 1: Sync application files
# ========================================

info "Syncing application files to VPS..."

rsync -avz --progress \
    --exclude 'node_modules' \
    --exclude '.next' \
    --exclude 'db/app.db' \
    --exclude 'db/app.db-journal' \
    --exclude '.git' \
    --exclude '.env' \
    --exclude '*.md' \
    ./ ${VPS_USER}@${VPS_HOST}:${APP_DIR}/

if [[ $? -eq 0 ]]; then
    info "Application files synced successfully"
else
    error "Failed to sync application files"
fi

# ========================================
# Step 2: Deploy nginx configuration
# ========================================

info "Deploying host nginx configuration..."

# Copy nginx config to VPS (to temp location first)
scp nginx-vps.conf ${VPS_USER}@${VPS_HOST}:/tmp/traintracker-nginx.conf

# Move to sites-available and update domain placeholder
ssh ${VPS_USER}@${VPS_HOST} << EOF
    set -e
    # Replace domain placeholder
    sudo sed "s/DOMAIN_PLACEHOLDER/${DOMAIN}/g" /tmp/traintracker-nginx.conf > /tmp/traintracker-nginx-final.conf

    # Move to sites-available
    sudo mv /tmp/traintracker-nginx-final.conf /etc/nginx/sites-available/traintracker

    # Create symlink if it doesn't exist
    if [[ ! -L /etc/nginx/sites-enabled/traintracker ]]; then
        sudo ln -s /etc/nginx/sites-available/traintracker /etc/nginx/sites-enabled/traintracker
        echo "Created symlink in sites-enabled"
    else
        echo "Symlink already exists"
    fi

    # Clean up temp file
    rm -f /tmp/traintracker-nginx.conf
EOF

info "Nginx configuration deployed"

# ========================================
# Step 3: Test nginx configuration
# ========================================

info "Testing nginx configuration..."

if ssh ${VPS_USER}@${VPS_HOST} "sudo nginx -t" 2>&1 | grep -q "successful"; then
    info "Nginx configuration is valid"
else
    error "Nginx configuration test failed. Please check the config on the VPS."
fi

# ========================================
# Step 4: Build and start Docker containers
# ========================================

info "Building and starting Docker containers..."

ssh ${VPS_USER}@${VPS_HOST} << EOF
    set -e
    cd ${APP_DIR}

    # Check if .env exists
    if [[ ! -f .env ]]; then
        echo "WARNING: .env file not found. Copying .env.docker as template..."
        cp .env.docker .env
        echo "IMPORTANT: Edit ${APP_DIR}/.env and add your VAPID keys!"
    fi

    # Build and start containers
    docker-compose up -d --build

    # Wait for containers to be healthy
    echo "Waiting for containers to be healthy..."
    sleep 10

    # Check container status
    docker-compose ps
EOF

info "Docker containers started"

# ========================================
# Step 5: Verify container is accessible
# ========================================

info "Verifying container accessibility..."

if ssh ${VPS_USER}@${VPS_HOST} "curl -s -o /dev/null -w '%{http_code}' http://localhost:${CONTAINER_PORT}/api/notifications/vapid-key" | grep -q "200"; then
    info "Container is responding correctly on port ${CONTAINER_PORT}"
else
    warn "Container may not be responding correctly. Check logs with: docker-compose logs"
fi

# ========================================
# Step 6: Reload nginx
# ========================================

info "Reloading nginx..."

ssh ${VPS_USER}@${VPS_HOST} "sudo systemctl reload nginx"

info "Nginx reloaded successfully"

# ========================================
# Step 7: Final checks and information
# ========================================

info "Checking SSL certificate status..."

ssh ${VPS_USER}@${VPS_HOST} << EOF
    if sudo test -d /etc/letsencrypt/live/${DOMAIN}; then
        echo "SSL certificate found for ${DOMAIN}"
    else
        echo "WARNING: SSL certificate not found. Run on VPS:"
        echo "  sudo certbot --nginx -d ${DOMAIN}"
    fi
EOF

# ========================================
# Deployment complete
# ========================================

echo ""
info "═══════════════════════════════════════════════════════════"
info "Deployment complete!"
info "═══════════════════════════════════════════════════════════"
echo ""
info "Next steps:"
echo "  1. Verify deployment: curl https://${DOMAIN}/api/notifications/vapid-key"
echo "  2. Check logs: ssh ${VPS_USER}@${VPS_HOST} 'cd ${APP_DIR} && docker-compose logs -f'"
echo "  3. If SSL not set up: ssh ${VPS_USER}@${VPS_HOST} 'sudo certbot --nginx -d ${DOMAIN}'"
echo ""
info "Application should be accessible at: https://${DOMAIN}"
echo ""
