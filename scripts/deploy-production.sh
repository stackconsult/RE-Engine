#!/bin/bash

# RE Engine Production Deployment Script
# Deploys the magical AI-infused automation system to production

set -e  # Exit on any error

echo "🪄 RE Engine Production Deployment Script"
echo "=========================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Must be run from the project root directory"
    exit 1
fi

# Configuration
PROJECT_NAME="re-engine"
DEPLOY_BRANCH="main"
BUILD_DIR="dist"
ENV_FILE=".env.production"

echo "🔧 Phase 1: Pre-deployment Checks"

# Check if required tools are installed
command -v node >/dev/null 2>&1 || { echo "❌ Node.js is required but not installed."; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "❌ npm is required but not installed."; exit 1; }

# Check if we're on the correct branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$CURRENT_BRANCH" != "$DEPLOY_BRANCH" ]; then
    echo "⚠️  Warning: Not on $DEPLOY_BRANCH branch (current: $CURRENT_BRANCH)"
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Deployment cancelled"
        exit 1
    fi
fi

# Check if there are uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
    echo "⚠️  Warning: There are uncommitted changes"
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Deployment cancelled"
        exit 1
    fi
fi

echo "✅ Pre-deployment checks passed"

echo ""
echo "🔧 Phase 2: Environment Setup"

# Check if production environment file exists
if [ ! -f "$ENV_FILE" ]; then
    echo "❌ Error: Production environment file $ENV_FILE not found"
    echo "Please copy .env.example to $ENV_FILE and configure it"
    exit 1
fi

# Load environment variables
export $(grep -v '^#' "$ENV_FILE" | xargs)

echo "✅ Environment loaded from $ENV_FILE"

echo ""
echo "🔧 Phase 3: Build Process"

# Clean previous build
echo "🧹 Cleaning previous build..."
rm -rf "$BUILD_DIR"

# Install dependencies
echo "📦 Installing dependencies..."
npm ci --production

# Build the application
echo "🔨 Building application..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed"
    exit 1
fi

echo "✅ Build completed successfully"

echo ""
echo "🔧 Phase 4: Production Tests"

# Run production tests
echo "🧪 Running production tests..."

# Test if the built application can start
echo "🚀 Testing application startup..."
timeout 10s node dist/index.js || {
    echo "❌ Application startup test failed"
    exit 1
}

echo "✅ Production tests passed"

echo ""
echo "🔧 Phase 5: Deployment"

# Create deployment directory
DEPLOY_DIR="/opt/$PROJECT_NAME"
echo "📁 Creating deployment directory: $DEPLOY_DIR"

# Copy built files
echo "📋 Copying built files..."
sudo mkdir -p "$DEPLOY_DIR"
sudo cp -r "$BUILD_DIR"/* "$DEPLOY_DIR/"
sudo cp "$ENV_FILE" "$DEPLOY_DIR/.env"

# Set permissions
echo "🔐 Setting permissions..."
sudo chown -R $USER:$USER "$DEPLOY_DIR"
sudo chmod +x "$DEPLOY_DIR"

# Create systemd service
echo "⚙️  Creating systemd service..."
sudo tee /etc/systemd/system/$PROJECT_NAME.service > /dev/null <<EOF
[Unit]
Description=RE Engine - Magical AI Automation System
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$DEPLOY_DIR
Environment=NODE_ENV=production
Environment=PATH=/usr/bin:/usr/local/bin
ExecStart=/usr/bin/node $DEPLOY_DIR/index.js
Restart=always
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=$PROJECT_NAME

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd and start service
echo "🔄 Reloading systemd..."
sudo systemctl daemon-reload
sudo systemctl enable $PROJECT_NAME
sudo systemctl start $PROJECT_NAME

# Check service status
echo "📊 Checking service status..."
sleep 5
if sudo systemctl is-active --quiet $PROJECT_NAME; then
    echo "✅ Service is running"
else
    echo "❌ Service failed to start"
    sudo systemctl status $PROJECT_NAME
    exit 1
fi

echo ""
echo "🔧 Phase 6: Post-deployment Verification"

# Health check
echo "🏥 Performing health check..."
curl -f http://localhost:${PORT:-3000}/health || {
    echo "❌ Health check failed"
    exit 1
}

echo "✅ Health check passed"

# Test API endpoints
echo "🌐 Testing API endpoints..."
curl -f http://localhost:${PORT:-3000}/api || {
    echo "❌ API test failed"
    exit 1
}

echo "✅ API test passed"

echo ""
echo "🎉 Deployment Successful!"
echo "======================="
echo "📍 Application URL: http://localhost:${PORT:-3000}"
echo "📊 Health Check: http://localhost:${PORT:-3000}/health"
echo "📚 API Documentation: http://localhost:${PORT:-3000}/api"
echo ""
echo "🔧 Management Commands:"
echo "  sudo systemctl status $PROJECT_NAME"
echo "  sudo systemctl restart $PROJECT_NAME"
echo "  sudo systemctl stop $PROJECT_NAME"
echo "  sudo journalctl -u $PROJECT_NAME -f"
echo ""
echo "🪄 Magical AI Automation System is now running in production!"
