# VPS Deployment - Quick Start Guide

## 🚀 One-Command Setup (After Initial VPS Configuration)

```bash
# 1. Initial VPS setup (run once as root)
sudo ./setup-vps.sh

# 2. Upload project files to /var/www/payroll-system

# 3. Configure environment files
cd /var/www/payroll-system/backend
cp .env.example .env
nano .env  # Fill in your values

cd ../frontend
cp .env.production.example .env.production
nano .env.production  # Fill in your values

# 4. Deploy everything
cd /var/www/payroll-system
chmod +x deploy.sh backup.sh health-check.sh
./deploy.sh all

# 5. Setup SSL
sudo certbot --nginx -d introup.io -d www.introup.io
sudo certbot --nginx -d api.introup.io
```

## 📋 Essential Files Created

### Configuration Files
- `backend/.env.example` - Backend environment template
- `frontend/.env.production.example` - Frontend environment template
- `backend/ecosystem.config.js` - PM2 config (updated)
- `frontend/ecosystem.config.js` - PM2 config (updated)

### Deployment Scripts
- `setup-vps.sh` - Initial VPS setup (run once)
- `deploy.sh` - Automated deployment script
- `backup.sh` - Automated backup script
- `health-check.sh` - Health monitoring script

### Documentation
- `VPS_DEPLOYMENT_GUIDE.md` - Complete deployment guide
- `DEPLOYMENT_CHECKLIST.md` - Step-by-step checklist
- `README_DEPLOYMENT.md` - Quick reference commands

## 🔑 Key Environment Variables

### Backend (.env)
```env
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/db
JWT_SECRET=32-character-secret-minimum
JWT_REFRESH_SECRET=32-character-secret-minimum
CORS_ORIGIN=https://introup.io,https://www.introup.io
PORT=5000
NODE_ENV=production
```

### Frontend (.env.production)
```env
NEXT_PUBLIC_API_URL=https://api.introup.io/api
NODE_ENV=production
```

## ✅ Post-Deployment Verification

```bash
# Check services
pm2 status

# Test endpoints
curl https://api.introup.io/health
curl -I https://introup.io

# Check logs
pm2 logs
```

## 🔄 Update Process

```bash
cd /var/www/payroll-system
git pull
./deploy.sh all
```

## 🆘 Quick Troubleshooting

```bash
# Restart everything
pm2 restart all
sudo systemctl reload nginx

# Check logs
pm2 logs payroll-backend --lines 50
pm2 logs payroll-frontend --lines 50

# Rebuild frontend
cd frontend
rm -rf .next node_modules
npm install
npm run build
pm2 restart payroll-frontend
```

---

**Ready for Production!** 🎉
