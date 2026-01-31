#!/bin/bash

# ============================================
# Health Check Script
# ============================================
# Monitors application health and restarts if needed
# Usage: Add to crontab: */5 * * * * /var/www/payroll-system/health-check.sh

BACKEND_URL="http://localhost:5000/health"
FRONTEND_URL="http://localhost:3000"

# Check backend
if ! curl -f $BACKEND_URL > /dev/null 2>&1; then
    echo "$(date): Backend health check failed, restarting..."
    pm2 restart payroll-backend
fi

# Check frontend
if ! curl -f $FRONTEND_URL > /dev/null 2>&1; then
    echo "$(date): Frontend health check failed, restarting..."
    pm2 restart payroll-frontend
fi
