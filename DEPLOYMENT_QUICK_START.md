# Quick Start Deployment Commands
## Copy-paste friendly commands for Hostinger VPS

---

## 🚀 Complete Deployment (Run in Order)

### 1. Initial Setup
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y build-essential curl wget git ufw
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
sudo apt install -y nginx
sudo ufw allow 22/tcp && sudo ufw allow 80/tcp && sudo ufw allow 443/tcp && sudo ufw enable
```

### 2. Create Project Directory
```bash
sudo mkdir -p /var/www/payroll-system
sudo chown -R $USER:$USER /var/www/payroll-system
cd /var/www/payroll-system
```

### 3. Upload Files (Choose one)
```bash
# Option A: Git
git clone https://github.com/your-repo/payroll-system.git .

# Option B: Upload via SCP from local machine
# scp -r backend frontend root@your-vps-ip:/var/www/payroll-system/
```

### 4. Backend Setup
```bash
cd /var/www/payroll-system/backend
npm install --production
nano .env  # Create .env file (see backend/.env.example)
mkdir -p uploads/profiles uploads/general uploads/reports logs
chmod -R 755 uploads
npm run test-connection
npm run create-admin
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 5. Frontend Setup
```bash
cd /var/www/payroll-system/frontend
npm install
nano .env.production  # Create .env.production (see frontend/.env.production.example)
npm run build
mkdir -p logs
pm2 start ecosystem.config.js
pm2 save
```

### 6. Nginx Setup
```bash
sudo cp /var/www/payroll-system/nginx/payroll-system.conf /etc/nginx/sites-available/payroll-system.conf
sudo ln -s /etc/nginx/sites-available/payroll-system.conf /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

### 7. SSL Setup
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d introup.io -d www.introup.io
sudo certbot --nginx -d api.introup.io
sudo certbot renew --dry-run
```

### 8. Verify
```bash
pm2 status
curl http://localhost:5000/health
curl http://localhost:3000
curl -I https://introup.io
curl -I https://api.introup.io/health
```

---

## 🔄 Update Commands

### Update Backend
```bash
cd /var/www/payroll-system/backend
git pull  # or upload new files
npm install --production
pm2 restart payroll-backend
```

### Update Frontend
```bash
cd /var/www/payroll-system/frontend
git pull  # or upload new files
npm install
npm run build
pm2 restart payroll-frontend
```

---

## 🛠️ Maintenance Commands

```bash
# View logs
pm2 logs payroll-backend
pm2 logs payroll-frontend

# Restart services
pm2 restart all

# Check status
pm2 status
sudo systemctl status nginx

# Test Nginx config
sudo nginx -t && sudo systemctl reload nginx
```

---

## 📝 Environment Files Template

### Backend `.env`
```env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/payroll_system
DATABASE_NAME=payroll_system
CORS_ORIGIN=https://introup.io,https://www.introup.io
JWT_SECRET=your-32-char-secret-key-here
JWT_EXPIRE=7d
JWT_REFRESH_SECRET=your-32-char-refresh-secret-here
JWT_REFRESH_EXPIRE=30d
```

### Frontend `.env.production`
```env
NEXT_PUBLIC_API_URL=https://api.introup.io/api
NEXT_PUBLIC_APP_NAME=Payroll Management System
NEXT_PUBLIC_APP_URL=https://introup.io
```
