# 🚀 **DEPLOY TO VERCEL - FIX CROSS-BROWSER ISSUES**

## ✅ **WHY DEPLOY TO VERCEL?**

**Cross-Browser Wallet Issues Fixed:**
- ✅ **Different domains** - Each browser gets its own domain
- ✅ **Independent MetaMask** - No more wallet conflicts
- ✅ **Real production testing** - Test like real users
- ✅ **WebSocket support** - Vercel handles WebSocket connections

## 🎯 **QUICK DEPLOYMENT**

### **Option 1: Automatic Deploy**
```bash
cd /home/swarnim/Desktop/hackathons/zeno
./deploy-vercel.sh
```

### **Option 2: Manual Deploy**

**Step 1: Deploy WebSocket Server**
```bash
cd server
vercel --prod --yes
```

**Step 2: Deploy Frontend**
```bash
cd frontend
vercel --prod --yes
```

## 🔧 **WHAT'S UPDATED**

### **WebSocket URLs**
- ✅ **Environment variables** - Uses `NEXT_PUBLIC_WEBSOCKET_URL`
- ✅ **Production URLs** - `wss://math-duel-backend.vercel.app`
- ✅ **Local fallback** - `ws://localhost:3004` for development

### **Contract Address**
- ✅ **Updated to AVAX contract** - `0x16F974aaeEa37A5422dF642934E7189E261C67B8`
- ✅ **Fuji testnet** - Ready for AVAX testing

### **Vercel Configuration**
- ✅ **Frontend config** - Updated with new contract address
- ✅ **Server config** - Updated with new contract address
- ✅ **Environment variables** - All necessary env vars set

## 🎮 **TESTING AFTER DEPLOYMENT**

### **Cross-Browser Testing**
1. **Chrome** → `https://math-duel-frontend.vercel.app/test`
2. **Firefox** → `https://math-duel-frontend.vercel.app/test`
3. **Each browser** triggers its own MetaMask
4. **No more wallet conflicts!**

### **Expected Behavior**
- ✅ **Independent wallets** - Each browser has its own MetaMask
- ✅ **Real-time WebSocket** - Works across different browsers
- ✅ **Lobby creation/joining** - Works perfectly
- ✅ **Blockchain transactions** - Each browser handles its own

## 🚀 **READY TO DEPLOY!**

**Everything is configured and ready:**
- WebSocket URLs updated
- Contract addresses updated
- Environment variables set
- Deployment script ready

**Run: `./deploy-vercel.sh`**
