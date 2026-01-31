#!/bin/bash

# ============================================
# Payroll System - Backup Script
# ============================================
# Creates backups of uploads, logs, and environment files
# Usage: ./backup.sh

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration
PROJECT_ROOT="/var/www/payroll-system"
BACKUP_DIR="/var/backups/payroll-system"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="payroll-backup-$DATE"

# Create backup directory
mkdir -p $BACKUP_DIR

echo -e "${GREEN}Starting backup...${NC}"

# Create backup archive
cd $PROJECT_ROOT
tar -czf "$BACKUP_DIR/$BACKUP_NAME.tar.gz" \
    backend/uploads \
    backend/.env \
    frontend/.env.production \
    backend/logs \
    frontend/logs \
    2>/dev/null || true

# Keep only last 7 days of backups
find $BACKUP_DIR -name "payroll-backup-*.tar.gz" -mtime +7 -delete

echo -e "${GREEN}Backup completed: $BACKUP_DIR/$BACKUP_NAME.tar.gz${NC}"

# Optional: Upload to cloud storage (uncomment and configure)
# aws s3 cp "$BACKUP_DIR/$BACKUP_NAME.tar.gz" s3://your-bucket/backups/
