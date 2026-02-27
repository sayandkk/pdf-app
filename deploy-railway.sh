#!/bin/bash

# PDF Nexus - Railway Deployment Script
# This script helps deploy the application to Railway.app

echo "🚀 PDF Nexus - Railway Deployment"
echo "================================="

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Installing..."
    npm install -g @railway/cli
fi

# Login to Railway
echo "🔐 Logging into Railway..."
railway login

# Initialize project
echo "📁 Initializing Railway project..."
railway init pdf-nexus --name "PDF Nexus"

# Add PostgreSQL database
echo "🗄️ Adding PostgreSQL database..."
railway add postgresql

# Deploy backend
echo "🔧 Deploying backend..."
cd pdf-backend

# Set environment variables for backend
railway variables set NODE_ENV=production
railway variables set DB_HOST=\${{Postgres.PGHOST}}
railway variables set DB_PORT=\${{Postgres.PGPORT}}
railway variables set DB_USERNAME=\${{Postgres.PGUSER}}
railway variables set DB_PASSWORD=\${{Postgres.PGPASSWORD}}
railway variables set DB_NAME=\${{Postgres.PGDATABASE}}
railway variables set JWT_SECRET=$(openssl rand -base64 32)

# Link and deploy backend
railway link
railway up

# Get backend URL
BACKEND_URL=$(railway domain)

# Deploy frontend
echo "🎨 Deploying frontend..."
cd ../pdf-frontend

# Set API URL for frontend
railway variables set VITE_API_BASE_URL=https://$BACKEND_URL

# Link and deploy frontend
railway link
railway up

# Get frontend URL
FRONTEND_URL=$(railway domain)

echo "✅ Deployment Complete!"
echo "======================"
echo "🌐 Frontend: https://$FRONTEND_URL"
echo "🔗 Backend: https://$BACKEND_URL"
echo ""
echo "📝 Next steps:"
echo "1. Update your frontend API calls if needed"
echo "2. Test the application"
echo "3. Set up monitoring if required"
echo ""
echo "💡 Railway URLs are automatically generated"
echo "💡 Free tier: 512MB RAM, sleeps after 24h inactivity"