# Production Deployment Guide - Payroll System
## Hostinger VPS (Ubuntu) Deployment

**Domain:** introup.io  
**Frontend:** https://introup.io (Port 3000)  
**Backend API:** https://api.introup.io (Port 5000)

---

## 📋 Pre-Deployment Checklist

- [ ] Domain `introup.io` points to VPS IP address
- [ ] Domain `api.introup.io` points to VPS IP address
- [ ] MongoDB Atlas cluster is running and accessible
- [ ] MongoDB Atlas IP whitelist includes VPS IP (or 0.0.0.0/0 for testing)
- [ ] You have SSH access to VPS
- [ ] You have root/sudo access on VPS

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
sudo apt update
sudo apt upgrade -y
sudo apt install -y build-essential curl wget git ufw
```

### 1.3 Install Node.js (v20 LTS)
```bash
# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version  # Should show v20.x.x
npm --version   # Should show 10.x.x
```

### 1.4 Install PM2
```bash
sudo npm install -g pm2
pm2 --version
```

### 1.5 Install Nginx
```bash
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

### 1.6 Setup Firewall (UFW)
```bash
# Allow SSH
sudo ufw allow 22/tcp

# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

---

## 📁 Step 2: Upload Project Files

### 2.1 Create Project Directory
```bash
sudo mkdir -p /var/www/payroll-system
sudo chown -R $USER:$USER /var/www/payroll-system
cd /var/www/payroll-system
```

### 2.2 Upload Files (Choose one method)

**Option A: Using Git (Recommended)**
```bash
# Clone your repository
git clone https://github.com/your-username/payroll-system.git .

# Or if you have a private repo, use SSH key
git clone git@github.com:your-username/payroll-system.git .
```

**Option B: Using SCP (from local machine)**
```bash
# From your local machine
scp -r backend frontend root@your-vps-ip:/var/www/payroll-system/
```

**Option C: Using SFTP**
- Use FileZilla, WinSCP, or similar
- Upload `backend` and `frontend` folders to `/var/www/payroll-system/`

---

## 🔧 Step 3: Backend Setup

### 3.1 Navigate to Backend Directory
```bash
cd /var/www/payroll-system/backend
```

### 3.2 Install Dependencies
```bash
npm install --production
```

### 3.3 Create Environment File
```bash
nano .env
```

**Paste the following (update with your values):**
```env
NODE_ENV=production
PORT=5000

MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/payroll_system?retryWrites=true&w=majority
DATABASE_NAME=payroll_system

CORS_ORIGIN=https://introup.io,https://www.introup.io

JWT_SECRET=your-super-secret-jwt-key-min-32-characters-long
JWT_EXPIRE=7d
JWT_REFRESH_SECRET=your-super-secret-refresh-key-min-32-characters-long
JWT_REFRESH_EXPIRE=30d

MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads

RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

**Save and exit:** `Ctrl+X`, then `Y`, then `Enter`

### 3.4 Create Uploads Directory
```bash
mkdir -p uploads/profiles uploads/general uploads/reports
chmod -R 755 uploads
```

### 3.5 Create Logs Directory
```bash
mkdir -p logs
chmod 755 logs
```

### 3.6 Test Backend Connection
```bash
# Test MongoDB connection
npm run test-connection

# If successful, create admin user
npm run create-admin
```

### 3.7 Start Backend with PM2
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

**Verify backend is running:**
```bash
pm2 status
pm2 logs payroll-backend
```

**Test backend health:**
```bash
curl http://localhost:5000/health
curl http://localhost:5000/api/health
```

---

## 🎨 Step 4: Frontend Setup

### 4.1 Navigate to Frontend Directory
```bash
cd /var/www/payroll-system/frontend
```

### 4.2 Install Dependencies
```bash
npm install
```

### 4.3 Create Production Environment File
```bash
nano .env.production
```

**Paste the following:**
```env
NEXT_PUBLIC_API_URL=https://api.introup.io/api
NEXT_PUBLIC_APP_NAME=Payroll Management System
NEXT_PUBLIC_APP_URL=https://introup.io
```

**Save and exit:** `Ctrl+X`, then `Y`, then `Enter`

### 4.4 Build Frontend
```bash
npm run build
```

**This will create:**
- `.next/` directory with optimized build
- `.next/standalone/` for production deployment

### 4.5 Create Logs Directory
```bash
mkdir -p logs
chmod 755 logs
```

### 4.6 Start Frontend with PM2
```bash
pm2 start ecosystem.config.js
pm2 save
```

**Verify frontend is running:**
```bash
pm2 status
pm2 logs payroll-frontend
```

**Test frontend:**
```bash
curl http://localhost:3000
```

---

## 🌐 Step 5: Nginx Configuration

### 5.1 Copy Nginx Configuration
```bash
sudo cp /var/www/payroll-system/nginx/payroll-system.conf /etc/nginx/sites-available/payroll-system.conf
```

### 5.2 Create Symbolic Link
```bash
sudo ln -s /etc/nginx/sites-available/payroll-system.conf /etc/nginx/sites-enabled/
```

### 5.3 Remove Default Site (Optional)
```bash
sudo rm /etc/nginx/sites-enabled/default
```

### 5.4 Test Nginx Configuration
```bash
sudo nginx -t
```

**If test passes, reload Nginx:**
```bash
sudo systemctl reload nginx
```

---

## 🔒 Step 6: SSL Certificate Setup (Let's Encrypt)

### 6.1 Install Certbot
```bash
sudo apt install -y certbot python3-certbot-nginx
```

### 6.2 Obtain SSL Certificates

**For main domain:**
```bash
sudo certbot --nginx -d introup.io -d www.introup.io
```

**For API subdomain:**
```bash
sudo certbot --nginx -d api.introup.io
```

**Follow the prompts:**
- Enter your email address
- Agree to terms
- Choose whether to redirect HTTP to HTTPS (recommended: Yes)

### 6.3 Verify Auto-Renewal
```bash
sudo certbot renew --dry-run
```

### 6.4 Test SSL
```bash
# Test main domain
curl -I https://introup.io

# Test API domain
curl -I https://api.introup.io/health
```

---

## ✅ Step 7: Final Verification

### 7.1 Check All Services
```bash
# Check PM2 processes
pm2 status

# Check Nginx
sudo systemctl status nginx

# Check ports
sudo netstat -tlnp | grep -E '3000|5000'
```

### 7.2 Test Endpoints

**From your local machine or browser:**

1. **Frontend:** https://introup.io
2. **Backend Health:** https://api.introup.io/health
3. **Backend API Info:** https://api.introup.io/api

### 7.3 Check Logs

**PM2 Logs:**
```bash
pm2 logs payroll-backend
pm2 logs payroll-frontend
```

**Nginx Logs:**
```bash
sudo tail -f /var/log/nginx/payroll-frontend-access.log
sudo tail -f /var/log/nginx/payroll-backend-access.log
```

---

## 🔄 Step 8: Maintenance Commands

### 8.1 PM2 Commands
```bash
# View all processes
pm2 status

# View logs
pm2 logs payroll-backend
pm2 logs payroll-frontend

# Restart services
pm2 restart payroll-backend
pm2 restart payroll-frontend

# Stop services
pm2 stop payroll-backend
pm2 stop payroll-frontend

# Delete from PM2
pm2 delete payroll-backend
pm2 delete payroll-frontend

# Monitor resources
pm2 monit
```

### 8.2 Update Application

**Backend Update:**
```bash
cd /var/www/payroll-system/backend
git pull  # or upload new files
npm install --production
pm2 restart payroll-backend
```

**Frontend Update:**
```bash
cd /var/www/payroll-system/frontend
git pull  # or upload new files
npm install
npm run build
pm2 restart payroll-frontend
```

### 8.3 Nginx Commands
```bash
# Test configuration
sudo nginx -t

# Reload configuration
sudo systemctl reload nginx

# Restart Nginx
sudo systemctl restart nginx

# Check status
sudo systemctl status nginx
```

---

## 🐛 Common Issues & Solutions

### Issue 1: Backend Not Starting
**Symptoms:** PM2 shows `errored` status

**Solutions:**
```bash
# Check logs
pm2 logs payroll-backend --lines 50

# Common causes:
# 1. MongoDB connection failed
#    - Check MONGODB_URI in .env
#    - Verify MongoDB Atlas IP whitelist
#    - Test connection: npm run test-connection

# 2. Port already in use
#    - Check: sudo lsof -i :5000
#    - Kill process: sudo kill -9 <PID>

# 3. Missing environment variables
#    - Verify .env file exists
#    - Check all required variables are set
```

### Issue 2: Frontend Build Fails
**Symptoms:** `npm run build` errors

**Solutions:**
```bash
# Clear Next.js cache
rm -rf .next
rm -rf node_modules
npm install
npm run build

# Check for TypeScript errors
npm run lint

# Check environment variables
cat .env.production
```

### Issue 3: 502 Bad Gateway
**Symptoms:** Nginx returns 502 error

**Solutions:**
```bash
# Check if services are running
pm2 status

# Check Nginx error logs
sudo tail -f /var/log/nginx/error.log

# Verify ports are listening
sudo netstat -tlnp | grep -E '3000|5000'

# Restart services
pm2 restart all
sudo systemctl reload nginx
```

### Issue 4: CORS Errors
**Symptoms:** Frontend can't connect to API

**Solutions:**
```bash
# Check CORS_ORIGIN in backend .env
# Should include: https://introup.io,https://www.introup.io

# Restart backend
pm2 restart payroll-backend

# Check browser console for exact error
```

### Issue 5: SSL Certificate Issues
**Symptoms:** Browser shows "Not Secure"

**Solutions:**
```bash
# Renew certificate
sudo certbot renew

# Check certificate status
sudo certbot certificates

# Manually renew if needed
sudo certbot --nginx -d introup.io -d www.introup.io --force-renewal
```

### Issue 6: MongoDB Connection Timeout
**Symptoms:** Backend can't connect to MongoDB

**Solutions:**
```bash
# 1. Check MongoDB Atlas cluster is running (not paused)
# 2. Verify IP whitelist includes VPS IP (or 0.0.0.0/0)
# 3. Test connection string
npm run test-connection

# 4. Check firewall
sudo ufw status
# MongoDB uses port 27017, but Atlas handles this

# 5. Verify connection string format
# Should be: mongodb+srv://user:pass@cluster.mongodb.net/db
```

### Issue 7: File Upload Fails
**Symptoms:** Can't upload files

**Solutions:**
```bash
# Check uploads directory permissions
ls -la /var/www/payroll-system/backend/uploads
chmod -R 755 /var/www/payroll-system/backend/uploads

# Check Nginx client_max_body_size (should be 10M or more)
sudo nano /etc/nginx/sites-available/payroll-system.conf

# Restart Nginx
sudo systemctl reload nginx
```

---

## 📊 Monitoring & Maintenance

### Daily Checks
```bash
# Check service status
pm2 status

# Check disk space
df -h

# Check memory usage
free -h
```

### Weekly Tasks
```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Check PM2 logs for errors
pm2 logs --lines 100

# Verify SSL certificates (auto-renewal should handle this)
sudo certbot certificates
```

### Monthly Tasks
```bash
# Review and rotate logs
pm2 flush

# Check MongoDB connection
cd /var/www/payroll-system/backend
npm run test-connection

# Backup database (if needed)
# Use MongoDB Atlas backup or mongodump
```

---

## 🔐 Security Best Practices

1. **Keep System Updated**
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

2. **Use Strong Passwords**
   - JWT secrets should be 32+ characters
   - MongoDB password should be strong

3. **Restrict MongoDB Access**
   - Only whitelist VPS IP in MongoDB Atlas
   - Don't use 0.0.0.0/0 in production

4. **Regular Backups**
   - Set up MongoDB Atlas automated backups
   - Backup uploads directory regularly

5. **Monitor Logs**
   - Check PM2 logs regularly
   - Monitor Nginx access logs for suspicious activity

6. **Firewall Rules**
   - Only allow necessary ports (22, 80, 443)
   - Block all other ports

---

## 📞 Support & Troubleshooting

### Useful Commands Reference

```bash
# PM2
pm2 status
pm2 logs
pm2 restart all
pm2 monit

# Nginx
sudo nginx -t
sudo systemctl status nginx
sudo systemctl reload nginx

# System
sudo systemctl status
df -h
free -h
top

# Network
sudo netstat -tlnp
curl -I https://introup.io
curl -I https://api.introup.io/health
```

### Log Locations

- **PM2 Logs:** `/var/www/payroll-system/backend/logs/` and `/var/www/payroll-system/frontend/logs/`
- **Nginx Logs:** `/var/log/nginx/`
- **System Logs:** `/var/log/syslog`

---

## ✅ Deployment Checklist

- [ ] Node.js 20.x installed
- [ ] PM2 installed and configured
- [ ] Nginx installed and configured
- [ ] Backend `.env` file created with correct values
- [ ] Frontend `.env.production` file created
- [ ] MongoDB connection tested and working
- [ ] Backend running on port 5000
- [ ] Frontend built and running on port 3000
- [ ] Nginx configuration tested and active
- [ ] SSL certificates installed for both domains
- [ ] Firewall configured (UFW)
- [ ] PM2 processes set to auto-start on reboot
- [ ] Health checks passing
- [ ] Frontend accessible at https://introup.io
- [ ] Backend API accessible at https://api.introup.io
- [ ] File uploads working
- [ ] All features tested in production

---

## 🎉 Deployment Complete!

Your Payroll System is now live at:
- **Frontend:** https://introup.io
- **Backend API:** https://api.introup.io

**Next Steps:**
1. Test all features in production
2. Set up monitoring (optional: PM2 Plus, Sentry, etc.)
3. Configure automated backups
4. Set up email notifications (if needed)
5. Document any custom configurations

---

**Last Updated:** Production Deployment Guide v1.0  
**Maintained By:** DevOps Team
