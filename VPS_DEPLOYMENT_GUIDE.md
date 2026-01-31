# VPS Deployment Guide - Production Ready
## Complete Step-by-Step Deployment for Payroll System

**Domain:** introup.io  
**Frontend:** https://introup.io  
**Backend API:** https://api.introup.io

---

## 📋 Prerequisites

- [ ] VPS with Ubuntu 20.04+ (minimum 2GB RAM, 20GB storage)
- [ ] Domain names configured (introup.io, api.introup.io)
- [ ] MongoDB Atlas cluster running
- [ ] SSH access to VPS
- [ ] Root/sudo access on VPS

---

## 🚀 Step 1: Initial VPS Setup

### 1.1 Connect to VPS
```bash
ssh root@your-vps-ip
# or
ssh username@your-vps-ip
```

### 1.2 Update System
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y build-essential curl wget git ufw fail2ban
```

### 1.3 Install Node.js 20.x LTS
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node --version  # Should show v20.x.x
npm --version   # Should show 10.x.x
```

### 1.4 Install PM2 Globally
```bash
sudo npm install -g pm2
pm2 --version
pm2 startup systemd -u $USER --hp $HOME
```

### 1.5 Install Nginx
```bash
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

### 1.6 Setup Firewall (UFW)
```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
sudo ufw status
```

### 1.7 Setup Fail2Ban (Security)
```bash
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

---

## 📁 Step 2: Project Setup

### 2.1 Create Project Directory
```bash
sudo mkdir -p /var/www/payroll-system
sudo chown -R $USER:$USER /var/www/payroll-system
cd /var/www/payroll-system
```

### 2.2 Clone Repository
```bash
# Using Git (recommended)
git clone https://github.com/your-username/payroll-system.git .

# Or upload files via SCP from local machine:
# scp -r . root@your-vps-ip:/var/www/payroll-system/
```

### 2.3 Create Required Directories
```bash
mkdir -p backend/uploads/profiles
mkdir -p backend/uploads/general
mkdir -p backend/uploads/reports
mkdir -p backend/logs
mkdir -p frontend/logs
chmod -R 755 backend/uploads
chmod -R 755 backend/logs
chmod -R 755 frontend/logs
```

---

## 🔧 Step 3: Backend Configuration

### 3.1 Navigate to Backend
```bash
cd /var/www/payroll-system/backend
```

### 3.2 Install Dependencies
```bash
npm install --production
```

### 3.3 Create Environment File
```bash
cp .env.example .env
nano .env
```

**Required .env variables:**
```env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/payroll_system?retryWrites=true&w=majority
JWT_SECRET=your-32-character-secret-key-here
JWT_REFRESH_SECRET=your-32-character-refresh-secret-here
JWT_EXPIRE=7d
JWT_REFRESH_EXPIRE=30d
CORS_ORIGIN=https://introup.io,https://www.introup.io
TRUST_PROXY=true
```

**Generate secure secrets:**
```bash
openssl rand -base64 32  # For JWT_SECRET
openssl rand -base64 32  # For JWT_REFRESH_SECRET
```

### 3.4 Test MongoDB Connection
```bash
npm run test-connection
```

### 3.5 Initialize Database
```bash
npm run init-db
npm run seed-departments
npm run create-admin
```

### 3.6 Test Backend
```bash
npm start
# In another terminal:
curl http://localhost:5000/health
# Should return: {"status":"OK",...}
# Press Ctrl+C to stop
```

### 3.7 Start with PM2
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 status
```

---

## 🎨 Step 4: Frontend Configuration

### 4.1 Navigate to Frontend
```bash
cd /var/www/payroll-system/frontend
```

### 4.2 Install Dependencies
```bash
npm install
```

### 4.3 Create Production Environment File
```bash
cp .env.production.example .env.production
nano .env.production
```

**Required .env.production:**
```env
NEXT_PUBLIC_API_URL=https://api.introup.io/api
NODE_ENV=production
```

### 4.4 Build Frontend
```bash
npm run build
```

**Verify build:**
```bash
ls -la .next/standalone
# Should show standalone directory
```

### 4.5 Test Frontend
```bash
npm start
# In another terminal:
curl http://localhost:3000
# Should return HTML
# Press Ctrl+C to stop
```

### 4.6 Start with PM2
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 status
```

---

## 🌐 Step 5: Nginx Configuration

### 5.1 Copy Nginx Configuration
```bash
sudo cp /var/www/payroll-system/nginx/payroll-system.conf /etc/nginx/sites-available/payroll-system.conf
sudo ln -s /etc/nginx/sites-available/payroll-system.conf /etc/nginx/sites-enabled/
```

### 5.2 Remove Default Site (Optional)
```bash
sudo rm /etc/nginx/sites-enabled/default
```

### 5.3 Test Nginx Configuration
```bash
sudo nginx -t
```

### 5.4 Reload Nginx
```bash
sudo systemctl reload nginx
```

---

## 🔒 Step 6: SSL Certificate Setup

### 6.1 Install Certbot
```bash
sudo apt install -y certbot python3-certbot-nginx
```

### 6.2 Obtain SSL Certificates

**For Main Domain:**
```bash
sudo certbot --nginx -d introup.io -d www.introup.io
```

**For API Domain:**
```bash
sudo certbot --nginx -d api.introup.io
```

### 6.3 Test Auto-Renewal
```bash
sudo certbot renew --dry-run
```

### 6.4 Setup Auto-Renewal Cron
```bash
sudo systemctl enable certbot.timer
```

---

## ✅ Step 7: Verification & Testing

### 7.1 Check All Services
```bash
# PM2 Status
pm2 status

# Nginx Status
sudo systemctl status nginx

# Check Ports
sudo netstat -tulpn | grep -E ':(3000|5000|80|443)'
```

### 7.2 Test Endpoints
```bash
# Backend Health
curl https://api.introup.io/health

# Frontend
curl -I https://introup.io

# API Info
curl https://api.introup.io/api
```

### 7.3 Check Logs
```bash
# PM2 Logs
pm2 logs

# Nginx Logs
sudo tail -f /var/log/nginx/payroll-frontend-access.log
sudo tail -f /var/log/nginx/payroll-backend-access.log

# Application Logs
tail -f /var/www/payroll-system/backend/logs/pm2-combined.log
```

---

## 🔄 Step 8: Deployment Scripts

### 8.1 Create Deployment Script
```bash
cd /var/www/payroll-system
nano deploy.sh
```

**Add deployment script content (see deploy.sh file)**

### 8.2 Make Executable
```bash
chmod +x deploy.sh
```

---

## 🛡️ Step 9: Security Hardening

### 9.1 Update Nginx Security Headers
Already configured in `nginx/payroll-system.conf`

### 9.2 Setup Automated Backups
```bash
cd /var/www/payroll-system
nano backup.sh
# Add backup script content
chmod +x backup.sh
```

### 9.3 Setup Cron Jobs
```bash
crontab -e
```

**Add:**
```cron
# Daily backup at 2 AM
0 2 * * * /var/www/payroll-system/backup.sh

# SSL certificate renewal (handled by certbot)
0 0 * * * certbot renew --quiet
```

---

## 📊 Step 10: Monitoring

### 10.1 PM2 Monitoring
```bash
pm2 monit
```

### 10.2 Setup PM2 Web Dashboard (Optional)
```bash
pm2 web
# Access at http://your-vps-ip:9615
```

### 10.3 Log Rotation
PM2 handles log rotation automatically via ecosystem.config.js

---

## 🚨 Troubleshooting

### Backend Not Starting
```bash
cd /var/www/payroll-system/backend
pm2 logs payroll-backend
# Check for errors
npm run test-connection  # Test MongoDB
```

### Frontend Not Building
```bash
cd /var/www/payroll-system/frontend
rm -rf .next node_modules
npm install
npm run build
```

### 502 Bad Gateway
```bash
pm2 restart all
sudo systemctl reload nginx
```

### Port Already in Use
```bash
sudo lsof -i :5000
sudo kill -9 <PID>
pm2 restart payroll-backend
```

---

## 📝 Post-Deployment Checklist

- [ ] All services running (`pm2 status`)
- [ ] HTTPS working for both domains
- [ ] Can login and access dashboard
- [ ] API endpoints responding
- [ ] File uploads working
- [ ] No errors in logs
- [ ] SSL certificates valid
- [ ] MongoDB connection stable
- [ ] Backups configured
- [ ] Monitoring active

---

## 🔄 Update/Deploy Process

### Quick Update
```bash
cd /var/www/payroll-system
git pull
./deploy.sh
```

### Full Redeploy
```bash
cd /var/www/payroll-system
git pull
cd backend && npm install --production && pm2 restart payroll-backend
cd ../frontend && npm install && npm run build && pm2 restart payroll-frontend
```

---

## 📞 Support

For issues, check:
1. PM2 logs: `pm2 logs`
2. Nginx logs: `/var/log/nginx/`
3. Application logs: `/var/www/payroll-system/*/logs/`
