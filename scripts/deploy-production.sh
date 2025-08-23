#!/bin/bash

# 🚀 Production Deployment Script for Internal University Website
# This script ensures stable deployment with basic validation

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# Check if running in production environment
if [ "$NODE_ENV" != "production" ]; then
    error "This script should only be run in production environment"
    error "Set NODE_ENV=production before running"
    exit 1
fi

log "Starting production deployment for internal university website..."

# Step 1: Essential Environment Validation
log "Step 1: Validating essential environment variables..."
if [ -z "$DATABASE_URL" ]; then
    error "DATABASE_URL is not set"
    exit 1
fi

if [ -z "$NEXTAUTH_SECRET" ]; then
    error "NEXTAUTH_SECRET is not set"
    exit 1
fi

if [ -z "$ADMIN_SECRET_CODE" ]; then
    error "ADMIN_SECRET_CODE is not set"
    exit 1
fi

if [ -z "$NEXTAUTH_URL" ]; then
    error "NEXTAUTH_URL is not set"
    exit 1
fi

success "Essential environment variables validated"

# Step 2: Basic Security Check
log "Step 2: Basic security check..."
if [ "$ADMIN_SECRET_CODE" = "admin123" ]; then
    error "ADMIN_SECRET_CODE is using the default value 'admin123'"
    exit 1
fi

if [ ${#NEXTAUTH_SECRET} -lt 16 ]; then
    error "NEXTAUTH_SECRET should be at least 16 characters long"
    exit 1
fi

success "Basic security check passed"

# Step 3: Install Dependencies
log "Step 3: Installing production dependencies..."
npm ci --only=production
success "Dependencies installed"

# Step 4: Database Migration
log "Step 4: Running database migrations..."
npx prisma generate
npx prisma migrate deploy
success "Database migrations completed"

# Step 5: Build Validation
log "Step 5: Running build validation..."
npm run validate:build

if [ $? -ne 0 ]; then
    error "Build validation failed. Please fix all errors before deploying."
    exit 1
fi

success "Build validation passed"

# Step 6: Production Build
log "Step 6: Building production application..."
npm run build

if [ $? -ne 0 ]; then
    error "Production build failed"
    exit 1
fi

success "Production build completed"

# Step 7: Final Check
log "Step 7: Final deployment check..."

# Check if build artifacts exist
if [ ! -d "dist" ]; then
    error "Build directory not found"
    exit 1
fi

if [ ! -d "dist/.next" ]; then
    error "Next.js build not found"
    exit 1
fi

success "Final deployment check passed"

# Step 8: Deployment Summary
log "Step 8: Deployment summary..."
echo ""
echo "🎉 PRODUCTION DEPLOYMENT COMPLETED SUCCESSFULLY!"
echo ""
echo "📋 Deployment Summary:"
echo "   ✅ Environment variables validated"
echo "   ✅ Basic security check passed"
echo "   ✅ Dependencies installed"
echo "   ✅ Database migrated"
echo "   ✅ Build validation passed"
echo "   ✅ Production build completed"
echo "   ✅ Final deployment check passed"
echo ""
echo "🚀 Your internal university website is ready for production!"
echo ""
echo "📁 Build location: dist/"
echo "🌐 Next.js URL: $NEXTAUTH_URL"
echo ""
echo "⚠️  Remember to:"
echo "   - Start the production server: npm start"
echo "   - Test the website functionality"
echo "   - Monitor for any issues"
echo "   - Ensure good user experience"
echo ""

# Optional: Start the application
read -p "Do you want to start the production server now? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    log "Starting production server..."
    npm start
else
    log "Deployment completed. Start the server with: npm start"
fi

success "Production deployment script completed successfully"
