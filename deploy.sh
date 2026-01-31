#!/bin/bash

# ============================================
# Payroll System - Production Deployment Script
# ============================================
# This script automates the deployment process
# Usage: ./deploy.sh [backend|frontend|all]

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Project root
PROJECT_ROOT="/var/www/payroll-system"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT/frontend"

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Function to deploy backend
deploy_backend() {
    print_status "Deploying backend..."
    
    cd $BACKEND_DIR
    
    # Check if .env exists
    if [ ! -f .env ]; then
        print_error ".env file not found! Please create it from .env.example"
        exit 1
    fi
    
    # Install dependencies
    print_status "Installing backend dependencies..."
    npm install --production
    
    # Test MongoDB connection
    print_status "Testing MongoDB connection..."
    if npm run test-connection > /dev/null 2>&1; then
        print_status "MongoDB connection successful"
    else
        print_warning "MongoDB connection test failed, but continuing..."
    fi
    
    # Restart with PM2
    print_status "Restarting backend with PM2..."
    pm2 restart payroll-backend || pm2 start ecosystem.config.js
    
    # Wait for service to be ready
    sleep 3
    
    # Health check
    if curl -f http://localhost:5000/health > /dev/null 2>&1; then
        print_status "Backend health check passed"
    else
        print_error "Backend health check failed!"
        pm2 logs payroll-backend --lines 20
        exit 1
    fi
    
    print_status "Backend deployment completed successfully!"
}

# Function to deploy frontend
deploy_frontend() {
    print_status "Deploying frontend..."
    
    cd $FRONTEND_DIR
    
    # Check if .env.production exists
    if [ ! -f .env.production ]; then
        print_warning ".env.production not found, using defaults"
    fi
    
    # Install dependencies
    print_status "Installing frontend dependencies..."
    npm install
    
    # Build
    print_status "Building frontend..."
    npm run build
    
    # Check if build was successful
    if [ ! -d ".next/standalone" ]; then
        print_error "Frontend build failed! .next/standalone directory not found"
        exit 1
    fi
    
    # Restart with PM2
    print_status "Restarting frontend with PM2..."
    pm2 restart payroll-frontend || pm2 start ecosystem.config.js
    
    # Wait for service to be ready
    sleep 3
    
    # Health check
    if curl -f http://localhost:3000 > /dev/null 2>&1; then
        print_status "Frontend health check passed"
    else
        print_error "Frontend health check failed!"
        pm2 logs payroll-frontend --lines 20
        exit 1
    fi
    
    print_status "Frontend deployment completed successfully!"
}

# Function to reload Nginx
reload_nginx() {
    print_status "Reloading Nginx..."
    if sudo nginx -t > /dev/null 2>&1; then
        sudo systemctl reload nginx
        print_status "Nginx reloaded successfully"
    else
        print_error "Nginx configuration test failed!"
        sudo nginx -t
        exit 1
    fi
}

# Main deployment logic
main() {
    print_status "Starting deployment process..."
    
    DEPLOY_TARGET=${1:-all}
    
    case $DEPLOY_TARGET in
        backend)
            deploy_backend
            reload_nginx
            ;;
        frontend)
            deploy_frontend
            reload_nginx
            ;;
        all)
            deploy_backend
            deploy_frontend
            reload_nginx
            ;;
        *)
            print_error "Invalid deployment target: $DEPLOY_TARGET"
            print_status "Usage: ./deploy.sh [backend|frontend|all]"
            exit 1
            ;;
    esac
    
    # Show PM2 status
    print_status "PM2 Status:"
    pm2 status
    
    print_status "Deployment completed successfully! 🎉"
}

# Run main function
main "$@"
