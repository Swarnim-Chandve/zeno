# 🎮 Simple Test Solution - Math Duel Game

## 🚨 Current Issue
WebSocket connections are unstable - they connect and immediately disconnect, causing lobby creation to work but then fail.

## 🚀 Quick Fix - Use API Mode Instead

Since the WebSocket is having issues, let's use the API mode which is more stable:

### Step 1: Switch to API Mode
1. **Open browser console** (F12) in both browsers
2. **Type this command** in the console:
   ```javascript
   localStorage.setItem('force-api-mode', 'true')
   ```
3. **Refresh both browsers**

### Step 2: Test the Game
1. **Browser 1**: Click "Demo Mode" → "Create New Lobby"
2. **Browser 2**: Click "Demo Mode" → "Join Lobby" → Enter the lobby ID
3. **Game should start automatically!**

## 🔧 Alternative: Restart Everything

### Method 1: Complete Restart
1. **Stop the WebSocket server** (Ctrl+C in terminal)
2. **Close all browser windows**
3. **Restart WebSocket server**:
   ```bash
   cd server
   node websocket-server.js
   ```
4. **Open two new browser windows** to `localhost:3000`
5. **Test the game**

### Method 2: Use Different Browsers
1. **Use Chrome for one browser**
2. **Use Firefox for the other browser**
3. **This often fixes WebSocket connection issues**

## 🎯 Expected Behavior After Fix
- ✅ Stable WebSocket connections
- ✅ Lobby creation works
- ✅ Player joining works
- ✅ Game starts automatically when both players join
- ✅ Math questions appear
- ✅ Real-time scoring works

## 🐛 If Still Not Working

### Check Server Logs
In the terminal running the WebSocket server, you should see:
```
WebSocket server running on port 3004
New WebSocket connection
Lobby [ID] created by player [ID]
Player [ID] joined lobby [ID]
Both players in lobby [ID], starting game automatically
Game started in lobby [ID]
```

### Check Browser Console
Look for these messages:
- ✅ `"WebSocket connected"` (not disconnected)
- ✅ `"Lobby created"` or `"Player joined"`
- ✅ `"Game started"`

## 🚀 Quick Commands
```bash
# Check if server is running
lsof -i :3004

# Restart server
cd server && node websocket-server.js

# Check server logs
# Look at the terminal where server is running
```

Try the API mode first - it should work immediately!
