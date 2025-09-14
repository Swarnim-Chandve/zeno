#!/bin/bash

# 🚀 Real-World Blockchain Deployment Script
# This script deploys your Math Duel Game to a real blockchain network

set -e

echo "🎯 Math Duel Game - Real-World Deployment"
echo "========================================"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check dependencies
echo "🔍 Checking dependencies..."

if ! command_exists node; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

if ! command_exists npm; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ Dependencies check passed"

# Install dependencies
echo "📦 Installing dependencies..."
npm run install:all

# Compile contracts
echo "🔨 Compiling smart contracts..."
cd contracts
npm run compile

# Run tests
echo "🧪 Running tests..."
npm test

# Deploy to testnet first
echo "🚀 Deploying to Avalanche Fuji testnet..."
npm run deploy

# Get contract addresses
echo "📋 Getting deployment information..."
if [ -f "deployed-addresses.json" ]; then
    echo "Contract addresses:"
    cat deployed-addresses.json | jq '.'
else
    echo "❌ Deployment addresses not found"
    exit 1
fi

# Update backend configuration
echo "🔧 Updating backend configuration..."
cd ../server
if [ -f ".env.example" ]; then
    cp .env.example .env
    echo "✅ Backend .env file created"
    echo "⚠️  Please update server/.env with your contract addresses"
fi

# Update frontend configuration
echo "🔧 Updating frontend configuration..."
cd ../frontend
if [ -f "env.local.example" ]; then
    cp env.local.example .env.local
    echo "✅ Frontend .env.local file created"
    echo "⚠️  Please update frontend/.env.local with your contract addresses"
fi

# Start development servers
echo "🎮 Starting development servers..."
cd ..

echo "Starting backend server..."
npm run dev:server &
BACKEND_PID=$!

echo "Starting frontend server..."
npm run dev:frontend &
FRONTEND_PID=$!

echo "✅ Development servers started!"
echo ""
echo "🌐 Frontend: http://localhost:3000"
echo "🔧 Backend: http://localhost:3001"
echo ""
echo "📋 Next steps:"
echo "1. Open http://localhost:3000 in your browser"
echo "2. Connect your MetaMask wallet"
echo "3. Switch to Avalanche Fuji testnet"
echo "4. Get test tokens from the faucet"
echo "5. Start playing!"
echo ""
echo "🛑 To stop servers, press Ctrl+C"

# Wait for user to stop
trap "echo 'Stopping servers...'; kill $BACKEND_PID $FRONTEND_PID; exit 0" INT
wait

