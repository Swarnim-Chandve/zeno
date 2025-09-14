# 🧪 TEST AVAX BLOCKCHAIN SYSTEM - Step by Step

## 🚀 **QUICK TEST GUIDE**

### **Step 1: Deploy Smart Contract**
```bash
cd contracts
npm run deploy-avax
```

### **Step 2: Get AVAX Test Tokens**
1. Go to [Avalanche Fuji Faucet](https://faucet.avax.network/)
2. Enter your wallet address
3. Get **AVAX test tokens** (you'll get ~1-2 AVAX)

### **Step 3: Update Contract Address**
After deployment, copy the contract address and update:
- `frontend/components/BlockchainLobby.tsx` line 21

### **Step 4: Start the System**
```bash
# Terminal 1 - Start WebSocket server
cd server
node websocket-server.js

# Terminal 2 - Start frontend
cd frontend
npm run dev
```

### **Step 5: Test with 2 Browsers**
1. **Browser 1**: Open `http://localhost:3000`
2. **Browser 2**: Open `http://localhost:3000` (or incognito)
3. **Both**: Click "Blockchain Mode"
4. **Both**: Connect wallets and stake 0.01 AVAX
5. **Play real-time duel!**

## 🎯 **What You'll See**

### **Lobby Screen**
- ✅ **AVAX balance** displayed
- ✅ **Stake amount** input (minimum 0.01 AVAX)
- ✅ **Create/Join lobby** buttons
- ✅ **Real-time player list** with status

### **Game Screen**
- ✅ **Real-time scores** updating live
- ✅ **WebSocket connection** status
- ✅ **Live opponent answers** and feedback
- ✅ **Automatic winner payout**

## 🔧 **Troubleshooting**

### **If WebSocket Fails**
- Check if server is running: `cd server && node websocket-server.js`
- Look for "WebSocket server running on port 3004"

### **If Contract Fails**
- Make sure you have AVAX test tokens
- Check contract address is correct
- Ensure you're on Avalanche Fuji testnet

### **If Game Doesn't Start**
- Both players must be in the same lobby
- Both players must be ready
- WebSocket must be connected

## 🎮 **Testing Scenarios**

### **Scenario 1: Basic Duel**
1. Player A creates lobby with 0.01 AVAX
2. Player B joins with 0.01 AVAX
3. Both click "Ready"
4. Game starts automatically
5. Winner gets 0.02 AVAX

### **Scenario 2: Different Stakes**
1. Player A creates lobby with 0.05 AVAX
2. Player B joins with 0.05 AVAX
3. Winner gets 0.10 AVAX total

### **Scenario 3: Demo vs Blockchain**
1. One browser: Demo Mode (free)
2. Other browser: Blockchain Mode (AVAX stakes)
3. Test both systems work independently

## 📊 **Expected Results**

### **Successful Test**
- ✅ Both players can stake AVAX
- ✅ Game starts when both are ready
- ✅ Real-time score updates work
- ✅ Winner gets paid automatically
- ✅ WebSocket shows "Connected"

### **AVAX Transactions**
- ✅ `createDuel()` - Stakes AVAX
- ✅ `joinDuel()` - Stakes AVAX
- ✅ `finalizeDuel()` - Pays winner

## 🚀 **Ready to Test!**

The system is now ready for testing with real AVAX stakes and multiplayer functionality!
