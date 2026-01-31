# Production Deployment - Quick Reference

## 🚀 Quick Deploy Commands

### Initial Setup (One-time)
```bash
# On VPS, run as root:
sudo ./setup-vps.sh

# Upload project files, then:
cd /var/www/payroll-system
chmod +x deploy.sh backup.sh health-check.sh
```

### Deploy Everything
```bash
./deploy.sh all
```

### Deploy Backend Only
```bash
./deploy.sh backend
```

### Deploy Frontend Only
```bash
./deploy.sh frontend
```

## 📋 Essential Commands

### PM2 Management
```bash
pm2 status              # Check status
pm2 logs                # View logs
pm2 restart all         # Restart all
pm2 monit               # Monitor resources
pm2 save                # Save current process list
```

### Nginx Management
```bash
sudo nginx -t           # Test configuration
sudo systemctl reload nginx
sudo systemctl status nginx
```

### SSL Certificates
```bash
sudo certbot renew --dry-run
sudo certbot renew
```

### Health Checks
```bash
curl http://localhost:5000/health
curl http://localhost:3000
curl https://api.introup.io/health
curl https://introup.io
```

## 🔧 Environment Variables

### Backend (.env)
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - 32+ character secret
- `JWT_REFRESH_SECRET` - 32+ character secret
- `CORS_ORIGIN` - Comma-separated allowed origins
- `PORT` - Backend port (default: 5000)

### Frontend (.env.production)
- `NEXT_PUBLIC_API_URL` - Backend API URL

## 🛠️ Troubleshooting

### Service Won't Start
```bash
pm2 logs payroll-backend --lines 50
pm2 logs payroll-frontend --lines 50
```

### Port Already in Use
```bash
sudo lsof -i :5000
sudo kill -9 <PID>
```

### Build Fails
```bash
cd frontend
rm -rf .next node_modules
npm install
npm run build
```

## 📊 Monitoring

### Check Resource Usage
```bash
pm2 monit
htop
df -h
```

### Check Logs
```bash
# Application logs
pm2 logs

# Nginx logs
sudo tail -f /var/log/nginx/payroll-*-access.log
sudo tail -f /var/log/nginx/payroll-*-error.log
```

## 🔄 Update Process

1. Pull latest code: `git pull`
2. Run deploy script: `./deploy.sh all`
3. Verify: Check PM2 status and test endpoints

## 🔐 Security Checklist

- [ ] Firewall enabled (UFW)
- [ ] Fail2Ban active
- [ ] SSL certificates valid
- [ ] Environment variables secured
- [ ] Strong JWT secrets
- [ ] MongoDB IP whitelist configured
- [ ] Regular backups scheduled
