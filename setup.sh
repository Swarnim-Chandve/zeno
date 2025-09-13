#!/bin/bash

echo "🚀 Setting up Math Duel Game..."

# Install dependencies
echo "📦 Installing dependencies..."
npm run install:all

# Copy environment files
echo "📋 Setting up environment files..."
cp contracts/env.example contracts/.env
cp server/env.example server/.env
cp frontend/env.local.example frontend/.env.local

echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit contracts/.env and add your private key"
echo "2. Run 'npm run deploy' to deploy the contract"
echo "3. Update server/.env with the deployed contract address"
echo "4. Run 'npm run dev' to start the application"
echo ""
echo "Happy dueling! 🎯"
