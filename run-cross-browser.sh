#!/bin/bash

echo "🌐 Starting Cross-Browser Testing Setup..."

# Kill any existing processes
pkill -f "next dev" 2>/dev/null || true
pkill -f "node websocket-server" 2>/dev/null || true

# Start WebSocket server
echo "📡 Starting WebSocket server on port 3004..."
cd /home/swarnim/Desktop/hackathons/zeno/server
node websocket-server.js &
WEBSOCKET_PID=$!

# Wait for WebSocket server to start
sleep 3

# Start frontend on port 3000
echo "🌐 Starting frontend on port 3000..."
cd /home/swarnim/Desktop/hackathons/zeno/frontend
PORT=3000 npm run dev &
FRONTEND_PID=$!

# Wait for frontend to start
sleep 5

# Start frontend on port 3001 (for second browser)
echo "🌐 Starting frontend on port 3001..."
cd /home/swarnim/Desktop/hackathons/zeno/frontend
PORT=3001 npm run dev &
FRONTEND2_PID=$!

# Wait for second frontend to start
sleep 5

echo ""
echo "✅ Cross-Browser Testing Ready!"
echo ""
echo "🔗 Test URLs:"
echo "   Browser 1: http://localhost:3000/test"
echo "   Browser 2: http://localhost:3001/test"
echo ""
echo "🎯 Each browser will trigger its own MetaMask!"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for user to stop
trap "echo 'Stopping services...'; kill $WEBSOCKET_PID $FRONTEND_PID $FRONTEND2_PID 2>/dev/null; exit" INT
wait
