# Production Deployment Checklist

## ✅ Pre-Deployment

### Domain & DNS
- [ ] Domain `introup.io` DNS A record points to VPS IP
- [ ] Domain `api.introup.io` DNS A record points to VPS IP
- [ ] DNS propagation verified (use `nslookup` or `dig`)

### MongoDB Atlas
- [ ] MongoDB Atlas cluster is running (not paused)
- [ ] Database user created with proper permissions
- [ ] Network Access IP whitelist includes VPS IP (or 0.0.0.0/0 for initial setup)
- [ ] Connection string tested and working
- [ ] Database name matches configuration

### VPS Access
- [ ] SSH access to VPS verified
- [ ] Root/sudo access confirmed
- [ ] VPS has sufficient resources (min 2GB RAM, 20GB storage)

---

## ✅ Backend Deployment

### Environment Setup
- [ ] Node.js 20.x installed (`node --version`)
- [ ] PM2 installed globally (`pm2 --version`)
- [ ] Backend directory created at `/var/www/payroll-system/backend`
- [ ] Files uploaded to backend directory

### Configuration
- [ ] `.env` file created with all required variables
- [ ] `MONGODB_URI` verified and tested
- [ ] `JWT_SECRET` and `JWT_REFRESH_SECRET` are 32+ characters
- [ ] `CORS_ORIGIN` includes production domains
- [ ] `PORT` set to 5000

### Dependencies & Build
- [ ] `npm install --production` completed successfully
- [ ] Uploads directory created (`uploads/profiles`, `uploads/general`, `uploads/reports`)
- [ ] Logs directory created
- [ ] Permissions set correctly (755 for directories)

### Testing
- [ ] MongoDB connection test passed (`npm run test-connection`)
- [ ] Admin user created (`npm run create-admin`)
- [ ] Health check works (`curl http://localhost:5000/health`)
- [ ] API health check works (`curl http://localhost:5000/api/health`)

### PM2 Setup
- [ ] `ecosystem.config.js` exists and configured
- [ ] Backend started with PM2 (`pm2 start ecosystem.config.js`)
- [ ] PM2 process shows `online` status
- [ ] PM2 auto-start configured (`pm2 startup` and `pm2 save`)
- [ ] Logs accessible (`pm2 logs payroll-backend`)

---

## ✅ Frontend Deployment

### Environment Setup
- [ ] Frontend directory created at `/var/www/payroll-system/frontend`
- [ ] Files uploaded to frontend directory

### Configuration
- [ ] `.env.production` file created
- [ ] `NEXT_PUBLIC_API_URL` set to `https://api.introup.io/api`
- [ ] No hardcoded localhost URLs remain

### Build
- [ ] `npm install` completed successfully
- [ ] `npm run build` completed without errors
- [ ] `.next/standalone` directory created
- [ ] Logs directory created

### PM2 Setup
- [ ] `ecosystem.config.js` exists and configured
- [ ] Frontend started with PM2 (`pm2 start ecosystem.config.js`)
- [ ] PM2 process shows `online` status
- [ ] Frontend accessible on port 3000 (`curl http://localhost:3000`)

---

## ✅ Nginx Configuration

### Installation
- [ ] Nginx installed (`sudo systemctl status nginx`)
- [ ] Nginx service enabled (`sudo systemctl enable nginx`)

### Configuration
- [ ] Configuration file copied to `/etc/nginx/sites-available/payroll-system.conf`
- [ ] Symbolic link created in `/etc/nginx/sites-enabled/`
- [ ] Default site removed (optional)
- [ ] Configuration tested (`sudo nginx -t`)

### Service
- [ ] Nginx reloaded successfully (`sudo systemctl reload nginx`)
- [ ] Nginx status shows `active (running)`
- [ ] Access logs directory exists (`/var/log/nginx/`)

---

## ✅ SSL Certificates

### Installation
- [ ] Certbot installed (`certbot --version`)
- [ ] SSL certificate obtained for `introup.io` and `www.introup.io`
- [ ] SSL certificate obtained for `api.introup.io`
- [ ] Certificates auto-renewal tested (`sudo certbot renew --dry-run`)

### Verification
- [ ] HTTPS works for main domain (`curl -I https://introup.io`)
- [ ] HTTPS works for API domain (`curl -I https://api.introup.io/health`)
- [ ] Browser shows "Secure" lock icon
- [ ] No SSL warnings in browser console

---

## ✅ Firewall & Security

### UFW Configuration
- [ ] UFW installed
- [ ] SSH port (22) allowed
- [ ] HTTP port (80) allowed
- [ ] HTTPS port (443) allowed
- [ ] UFW enabled and active
- [ ] Other ports blocked (default deny)

### Security Headers
- [ ] Nginx security headers configured
- [ ] Helmet middleware active in backend
- [ ] CORS properly configured
- [ ] Rate limiting enabled

---

## ✅ Functionality Testing

### Frontend
- [ ] Homepage loads at https://introup.io
- [ ] Login page accessible
- [ ] Can login with admin credentials
- [ ] Dashboard loads after login
- [ ] Navigation works
- [ ] No console errors in browser

### Backend API
- [ ] Health check: https://api.introup.io/health
- [ ] API info: https://api.introup.io/api
- [ ] Authentication endpoint works
- [ ] Protected routes require authentication
- [ ] CORS headers present in responses

### Integration
- [ ] Frontend can connect to backend API
- [ ] API calls return data correctly
- [ ] File uploads work
- [ ] File downloads work
- [ ] Images load correctly
- [ ] PDF generation works

### Role-Based Access
- [ ] Admin dashboard accessible
- [ ] Manager dashboard accessible
- [ ] Dept_Lead dashboard accessible
- [ ] Employee dashboard accessible
- [ ] Role-based redirects work correctly

---

## ✅ Performance & Monitoring

### Performance
- [ ] Page load times acceptable (< 3 seconds)
- [ ] API response times acceptable (< 500ms)
- [ ] No memory leaks (check `pm2 monit`)
- [ ] Disk space sufficient (`df -h`)

### Monitoring
- [ ] PM2 monitoring working (`pm2 monit`)
- [ ] Logs being written correctly
- [ ] Error logs accessible
- [ ] Access logs accessible

---

## ✅ Backup & Recovery

### Backups
- [ ] MongoDB Atlas automated backups configured
- [ ] Uploads directory backup plan in place
- [ ] Environment files backed up securely

### Recovery Plan
- [ ] Know how to restore from backup
- [ ] Know how to restart services
- [ ] Know how to rollback deployment

---

## ✅ Documentation

- [ ] Deployment guide reviewed
- [ ] Environment variables documented
- [ ] Admin credentials stored securely
- [ ] Team has access to necessary information

---

## 🚨 Post-Deployment Verification

### Critical Checks (Do Immediately)
1. [ ] All services running (`pm2 status`)
2. [ ] Both domains accessible via HTTPS
3. [ ] Can login and access dashboard
4. [ ] API endpoints responding
5. [ ] No errors in PM2 logs
6. [ ] No errors in Nginx logs
7. [ ] SSL certificates valid
8. [ ] MongoDB connection stable

### Functional Tests (Within 24 Hours)
1. [ ] Create new user (admin)
2. [ ] Submit timesheet (employee)
3. [ ] Approve timesheet (manager)
4. [ ] Generate report (admin)
5. [ ] Upload file
6. [ ] Download PDF
7. [ ] Request leave (employee)
8. [ ] Approve leave (manager)

---

## 📋 Common Production Errors & Quick Fixes

### Error: "502 Bad Gateway"
**Fix:**
```bash
pm2 restart all
sudo systemctl reload nginx
```

### Error: "Cannot connect to MongoDB"
**Fix:**
```bash
# Check MongoDB Atlas cluster is running
# Verify IP whitelist
# Test connection
cd /var/www/payroll-system/backend
npm run test-connection
```

### Error: "CORS policy blocked"
**Fix:**
```bash
# Check CORS_ORIGIN in backend .env
# Should include: https://introup.io,https://www.introup.io
pm2 restart payroll-backend
```

### Error: "Port already in use"
**Fix:**
```bash
sudo lsof -i :5000  # or :3000
sudo kill -9 <PID>
pm2 restart all
```

### Error: "SSL certificate expired"
**Fix:**
```bash
sudo certbot renew
sudo systemctl reload nginx
```

### Error: "Build failed"
**Fix:**
```bash
cd /var/www/payroll-system/frontend
rm -rf .next node_modules
npm install
npm run build
```

---

## ✅ Final Sign-Off

- [ ] All checklist items completed
- [ ] Application tested in production
- [ ] Team notified of deployment
- [ ] Monitoring alerts configured (if applicable)
- [ ] Backup strategy confirmed
- [ ] Documentation updated

**Deployment Date:** _______________  
**Deployed By:** _______________  
**Status:** ☐ Ready for Production ☐ Needs Review

---

**Note:** Keep this checklist updated as you complete each step. This ensures nothing is missed during deployment.
