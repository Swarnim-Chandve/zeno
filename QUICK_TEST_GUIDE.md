# 🎮 Quick Test Guide - Math Duel Game

## 🚨 Current Issue Fixed
- ✅ **Auto-game start**: Game now starts automatically when both players join
- ✅ **Wallet loading**: Fixed infinite loading issue
- 🔧 **Lobby join**: Need to use the correct lobby ID

## 🎯 How to Test Right Now

### Step 1: Start Fresh
1. **Close both browser windows**
2. **Restart the server** (if needed):
   ```bash
   cd server
   npm start
   ```
3. **Open two new browser windows** to `http://localhost:3000`

### Step 2: Create Lobby (Browser 1)
1. Click **"Demo Mode (No Wallet Required)"**
2. Click **"Create New Lobby"**
3. **Copy the Lobby ID** (e.g., `lobby_1234567890_abc123`)

### Step 3: Join Lobby (Browser 2)
1. Click **"Demo Mode (No Wallet Required)"**
2. Click **"Join Lobby"**
3. **Paste the exact Lobby ID** from Browser 1
4. Click **"Join"**

### Step 4: Game Starts Automatically! 🎉
- Both browsers will show the game screen
- Math questions will appear
- 30 seconds per question
- Real-time scoring

## 🔧 Alternative: Use Share URL
1. In Browser 1, click **"Copy URL"**
2. Paste that URL in Browser 2's address bar
3. This automatically joins the lobby

## 🐛 If Still Not Working

### Check Console Logs
1. Press **F12** in both browsers
2. Look for error messages in the **Console** tab
3. Share any red error messages

### Common Issues & Solutions
- **"Lobby not found"**: Make sure you're using the exact lobby ID
- **"Lobby is full"**: Start fresh with new browser windows
- **"Connection Error"**: Check if server is running on port 3004

### Server Status
Make sure the WebSocket server is running:
```bash
cd server
node websocket-server.js
```
You should see: `WebSocket server running on port 3004`

## 🎮 Expected Game Flow
1. **Lobby Creation** → Browser 1 creates lobby
2. **Player Joining** → Browser 2 joins with lobby ID
3. **Auto Game Start** → Game starts automatically when both players join
4. **Math Questions** → 5 questions, 30 seconds each
5. **Real-time Scoring** → Live score updates
6. **Results** → Winner announcement

## 🚀 Quick Test Commands
```bash
# Start the main server
cd frontend && npm run dev

# Start WebSocket server (in another terminal)
cd server && node websocket-server.js
```

The game should now work perfectly! Let me know if you see any errors.
