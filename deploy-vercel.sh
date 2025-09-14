#!/bin/bash

echo "🚀 Deploying Math Duel to Vercel..."

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm install -g vercel
fi

# Deploy WebSocket server first
echo "📡 Deploying WebSocket server..."
cd server
vercel --prod --yes
cd ..

# Deploy frontend
echo "🌐 Deploying frontend..."
cd frontend
vercel --prod --yes
cd ..

echo "✅ Deployment complete!"
echo ""
echo "🔗 Your app will be available at:"
echo "   Frontend: https://math-duel-frontend.vercel.app"
echo "   Backend:  https://math-duel-backend.vercel.app"
echo ""
echo "🎯 Test with different browsers:"
echo "   Chrome: https://math-duel-frontend.vercel.app/test"
echo "   Firefox: https://math-duel-frontend.vercel.app/test"
echo ""
echo "💰 Each browser will trigger its own MetaMask!"
