#!/bin/bash

# ============================================
# VPS Initial Setup Script
# ============================================
# Run this script once on a fresh VPS
# Usage: sudo ./setup-vps.sh

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    print_error "Please run as root (use sudo)"
    exit 1
fi

print_status "Starting VPS setup..."

# Update system
print_status "Updating system packages..."
apt update && apt upgrade -y

# Install essential packages
print_status "Installing essential packages..."
apt install -y build-essential curl wget git ufw fail2ban

# Install Node.js 20.x
print_status "Installing Node.js 20.x..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Verify Node.js installation
NODE_VERSION=$(node --version)
NPM_VERSION=$(npm --version)
print_status "Node.js installed: $NODE_VERSION"
print_status "NPM installed: $NPM_VERSION"

# Install PM2
print_status "Installing PM2..."
npm install -g pm2

# Setup PM2 startup
print_status "Configuring PM2 startup..."
PM2_USER=${SUDO_USER:-$USER}
pm2 startup systemd -u $PM2_USER --hp /home/$PM2_USER

# Install Nginx
print_status "Installing Nginx..."
apt install -y nginx
systemctl enable nginx
systemctl start nginx

# Setup Firewall
print_status "Configuring firewall..."
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# Setup Fail2Ban
print_status "Configuring Fail2Ban..."
systemctl enable fail2ban
systemctl start fail2ban

# Install Certbot
print_status "Installing Certbot..."
apt install -y certbot python3-certbot-nginx

# Create project directory
print_status "Creating project directory..."
mkdir -p /var/www/payroll-system
chown -R $PM2_USER:$PM2_USER /var/www/payroll-system

# Create backup directory
print_status "Creating backup directory..."
mkdir -p /var/backups/payroll-system
chown -R $PM2_USER:$PM2_USER /var/backups/payroll-system

print_status "VPS setup completed successfully! ✅"
print_status "Next steps:"
print_status "1. Upload project files to /var/www/payroll-system"
print_status "2. Configure .env files"
print_status "3. Run deployment script"
