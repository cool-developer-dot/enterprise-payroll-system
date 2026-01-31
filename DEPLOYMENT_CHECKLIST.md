# VPS Deployment Checklist

## ✅ Pre-Deployment

### VPS Setup
- [ ] VPS provisioned (Ubuntu 20.04+)
- [ ] SSH access configured
- [ ] Root/sudo access confirmed
- [ ] Domain DNS configured (introup.io, api.introup.io)
- [ ] MongoDB Atlas cluster running
- [ ] MongoDB IP whitelist includes VPS IP

### Initial VPS Configuration
- [ ] Run `sudo ./setup-vps.sh` (one-time setup)
- [ ] Node.js 20.x installed
- [ ] PM2 installed and configured
- [ ] Nginx installed
- [ ] Firewall (UFW) configured
- [ ] Fail2Ban active

---

## ✅ Backend Deployment

### Configuration
- [ ] Files uploaded to `/var/www/payroll-system/backend`
- [ ] `.env` file created from `.env.example`
- [ ] `MONGODB_URI` configured
- [ ] `JWT_SECRET` and `JWT_REFRESH_SECRET` set (32+ chars)
- [ ] `CORS_ORIGIN` includes production domains
- [ ] `PORT` set to 5000

### Setup
- [ ] Dependencies installed (`npm install --production`)
- [ ] Upload directories created (`uploads/profiles`, `uploads/general`, `uploads/reports`)
- [ ] Logs directory created
- [ ] MongoDB connection tested (`npm run test-connection`)
- [ ] Database initialized (`npm run init-db`)
- [ ] Departments seeded (`npm run seed-departments`)
- [ ] Admin user created (`npm run create-admin`)

### Deployment
- [ ] PM2 started (`pm2 start ecosystem.config.js`)
- [ ] PM2 auto-start configured (`pm2 save`)
- [ ] Health check passes (`curl http://localhost:5000/health`)
- [ ] API health check passes (`curl http://localhost:5000/api/health`)

---

## ✅ Frontend Deployment

### Configuration
- [ ] Files uploaded to `/var/www/payroll-system/frontend`
- [ ] `.env.production` created from `.env.production.example`
- [ ] `NEXT_PUBLIC_API_URL` set to `https://api.introup.io/api`

### Setup
- [ ] Dependencies installed (`npm install`)
- [ ] Production build completed (`npm run build`)
- [ ] `.next/standalone` directory exists
- [ ] Logs directory created

### Deployment
- [ ] PM2 started (`pm2 start ecosystem.config.js`)
- [ ] PM2 auto-start configured (`pm2 save`)
- [ ] Health check passes (`curl http://localhost:3000`)

---

## ✅ Nginx Configuration

### Setup
- [ ] Configuration file copied to `/etc/nginx/sites-available/`
- [ ] Symbolic link created in `/etc/nginx/sites-enabled/`
- [ ] Default site removed (optional)
- [ ] Configuration tested (`sudo nginx -t`)
- [ ] Nginx reloaded (`sudo systemctl reload nginx`)

---

## ✅ SSL Certificates

### Setup
- [ ] Certbot installed
- [ ] SSL certificate obtained for `introup.io` and `www.introup.io`
- [ ] SSL certificate obtained for `api.introup.io`
- [ ] Auto-renewal tested (`sudo certbot renew --dry-run`)
- [ ] Certbot timer enabled

---

## ✅ Security

### Firewall
- [ ] UFW enabled
- [ ] SSH (22) allowed
- [ ] HTTP (80) allowed
- [ ] HTTPS (443) allowed
- [ ] Other ports blocked

### Application Security
- [ ] Environment variables secured
- [ ] Strong JWT secrets (32+ characters)
- [ ] MongoDB connection string secured
- [ ] CORS properly configured
- [ ] Rate limiting active
- [ ] Helmet security headers active

---

## ✅ Testing

### Health Checks
- [ ] Backend: `curl https://api.introup.io/health`
- [ ] Frontend: `curl -I https://introup.io`
- [ ] API Info: `curl https://api.introup.io/api`

### Functionality
- [ ] Can access frontend at https://introup.io
- [ ] Can login with admin credentials
- [ ] Dashboard loads correctly
- [ ] API endpoints responding
- [ ] File uploads working
- [ ] Images loading correctly

### Role-Based Access
- [ ] Admin dashboard accessible
- [ ] Manager dashboard accessible
- [ ] Dept_Lead dashboard accessible
- [ ] Employee dashboard accessible

---

## ✅ Monitoring & Maintenance

### Logs
- [ ] PM2 logs accessible (`pm2 logs`)
- [ ] Nginx logs accessible
- [ ] Application logs being written

### Monitoring
- [ ] PM2 monitoring working (`pm2 monit`)
- [ ] Health check script configured (cron)
- [ ] Resource usage acceptable

### Backups
- [ ] Backup script created (`backup.sh`)
- [ ] Backup directory created
- [ ] Cron job configured for daily backups
- [ ] Backup retention policy set (7 days)

---

## ✅ Post-Deployment

### Verification
- [ ] All services running (`pm2 status`)
- [ ] No errors in logs
- [ ] SSL certificates valid
- [ ] All endpoints accessible
- [ ] Performance acceptable

### Documentation
- [ ] Deployment guide reviewed
- [ ] Environment variables documented
- [ ] Admin credentials stored securely
- [ ] Team notified of deployment

---

## 🚨 Emergency Contacts

- **VPS Provider:** [Your VPS provider support]
- **Domain Registrar:** [Your domain registrar]
- **MongoDB Atlas:** [Your MongoDB support]

---

## 📝 Notes

- Deployment Date: _______________
- Deployed By: _______________
- Version: _______________
- Status: ☐ Production Ready ☐ Needs Review
