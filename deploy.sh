#!/bin/bash

echo "🚀 Deploying Math Duel Game..."

# Install Railway CLI if not installed
if ! command -v railway &> /dev/null; then
    echo "Installing Railway CLI..."
    npm install -g @railway/cli
fi

# Login to Railway
echo "Logging into Railway..."
railway login

# Deploy backend
echo "Deploying backend..."
cd server
railway up --detach

# Get the backend URL
echo "Getting backend URL..."
BACKEND_URL=$(railway domain)

echo "Backend deployed at: $BACKEND_URL"

# Update frontend environment
echo "Updating frontend environment..."
cd ../frontend
echo "NEXT_PUBLIC_BACKEND_URL=$BACKEND_URL" > .env.local

# Deploy frontend
echo "Deploying frontend..."
cd ..
railway up --detach

echo "✅ Deployment complete!"
echo "Frontend: $(railway domain)"
echo "Backend: $BACKEND_URL"
