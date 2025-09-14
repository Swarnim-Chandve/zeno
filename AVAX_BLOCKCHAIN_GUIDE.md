# 🔗 AVAX Blockchain Math Duel - Real Multiplayer!

## ✅ **AVAX-BASED BLOCKCHAIN INTEGRATION**

I've updated the system to use **AVAX tokens** instead of USDC.e for much easier testing!

### **🚀 What's New**

**AVAX Integration:**
- ✅ **Real AVAX staking** on Avalanche Fuji testnet (much easier than USDC.e!)
- ✅ **Real multiplayer duels** - both players must be present
- ✅ **Off-chain gameplay** with on-chain staking and claiming
- ✅ **Real-time score updates** between players via WebSocket
- ✅ **Automatic winner payouts** via smart contract

**Game Flow:**
1. **Stake AVAX** - Players stake AVAX before the game starts
2. **Real-time duel** - Game happens off-chain with live updates
3. **Winner claims** - Winner automatically gets 2x stake amount

## 🎯 **How to Test**

### **Step 1: Deploy Smart Contract**
```bash
cd contracts
npm run deploy-avax
```

### **Step 2: Get AVAX Test Tokens**
1. Go to [Avalanche Fuji Faucet](https://faucet.avax.network/)
2. Get **AVAX test tokens** (much easier than USDC.e!)
3. You'll get ~1-2 AVAX for testing

### **Step 3: Update Contract Address**
After deployment, update the contract address in:
- `frontend/components/BlockchainLobby.tsx` (line 21)

### **Step 4: Test Real Multiplayer**
1. **Open 2 browsers** (Chrome + Firefox or incognito)
2. **Connect wallets** in both browsers
3. **Click "Blockchain Mode"** in both
4. **Stake AVAX** (minimum 0.01 AVAX)
5. **Play real-time duel** with live score updates!

## 🔧 **Smart Contract Details**

### **AVAXDuelEscrow Contract**
- **Minimum stake**: 0.01 AVAX
- **Functions**:
  - `createDuel()` - Create duel with AVAX stake
  - `joinDuel(duelId)` - Join existing duel with same stake
  - `finalizeDuel(duelId, winner)` - Payout winner (2x stake)

### **Contract Features**
- **Native AVAX support** - No token approvals needed!
- **Simple staking** - Just send AVAX with function call
- **Automatic payouts** - Winner gets all stakes instantly
- **Reentrancy protection** - Safe from attacks

## 🎮 **Real Multiplayer Features**

### **Lobby System**
- **Create lobby** - First player creates and stakes AVAX
- **Join lobby** - Second player joins with same stake amount
- **Ready system** - Both players must be ready to start
- **Real-time updates** - Live player status and scores

### **Game Features**
- **Off-chain gameplay** - Fast, responsive math duels
- **Real-time scores** - Live updates between players
- **WebSocket communication** - Instant score synchronization
- **Automatic claiming** - Winner gets paid automatically

## 💰 **Staking System**

### **AVAX Staking**
- **Minimum**: 0.01 AVAX per player
- **Total pot**: 0.02 AVAX (0.01 × 2)
- **Winner gets**: 0.02 AVAX (100% of pot)
- **No approvals needed** - Just send AVAX!

### **Easy Testing**
- **Get AVAX from faucet** - Much simpler than USDC.e
- **Native token** - No complex token contracts
- **Instant staking** - No approval transactions

## 🎯 **Testing Instructions**

### **Quick Test (2 Browsers)**
1. **Deploy contract** and update address
2. **Get AVAX** from faucet in both wallets
3. **Open 2 browsers** to localhost:3000
4. **Click "Blockchain Mode"** in both
5. **Stake 0.01 AVAX** each
6. **Play real-time duel!**

### **What You'll See**
- **Real-time lobby** - See both players join
- **Live scores** - Updates as you answer questions
- **Automatic payouts** - Winner gets AVAX instantly
- **WebSocket status** - Connection indicators

## 🔗 **Technical Details**

### **Off-Chain Game**
- **WebSocket server** - Handles real-time communication
- **Question generation** - Happens on frontend
- **Score tracking** - Real-time updates between players
- **Game logic** - All off-chain for speed

### **On-Chain Integration**
- **Staking** - AVAX locked in smart contract
- **Finalization** - Winner determined off-chain
- **Payouts** - Automatic AVAX transfer to winner
- **Transparency** - All transactions on-chain

## 🚀 **Ready to Deploy!**

The AVAX-based system is much simpler to test and deploy:

1. **Deploy contract** with `npm run deploy-avax`
2. **Update contract address** in frontend
3. **Get AVAX test tokens** from faucet
4. **Test with 2 browsers** for real multiplayer!

**No complex token approvals, no USDC.e setup - just pure AVAX staking and real-time multiplayer duels!**
