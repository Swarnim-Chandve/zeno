# 🎯 Math Duel Game - V1

A 1v1 Math Duel Game built on Avalanche where players compete in real-time math challenges and winners get paid from escrow.

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- Git
- MetaMask or compatible wallet
- USDC.e test tokens on Avalanche Fuji

### 1. Install Dependencies
```bash
npm run install:all
```

### 2. Deploy Smart Contract

#### Get USDC.e Test Tokens
1. Go to [Avalanche Fuji Faucet](https://faucet.avax.network/)
2. Get AVAX test tokens
3. Go to [USDC.e Faucet](https://faucet.avax.network/) and get USDC.e tokens

#### Deploy Contract
```bash
# Copy environment file
cp contracts/env.example contracts/.env

# Edit contracts/.env and add your private key
# PRIVATE_KEY=your_private_key_here

# Deploy to Fuji testnet
npm run deploy
```

#### Update Backend with Contract Address
After deployment, copy the contract address and update `server/server.js`:
```javascript
const CONTRACT_ADDRESS = "0x..."; // Your deployed contract address
```

### 3. Start Backend
```bash
npm run dev:server
```

### 4. Start Frontend
```bash
npm run dev:frontend
```

### 5. Play the Game!
1. Open http://localhost:3000
2. Connect your wallet
3. Click "Find Opponent"
4. Answer 3 math questions as fast as possible
5. Winner gets 2x the stake amount!

## 🎮 How to Play

### Game Flow
1. **Connect Wallet**: Connect your MetaMask or compatible wallet
2. **Find Opponent**: Click "Find Opponent" to start matchmaking
3. **Answer Questions**: You'll get 3 math questions (addition, subtraction, multiplication)
4. **Submit Answers**: Answer as quickly and accurately as possible
5. **Win Rewards**: Winner gets 2x the stake amount instantly!

### Scoring System
- **Accuracy**: 1 point per correct answer
- **Speed Bonus**: Faster answers get bonus points
- **Winner**: Highest total score wins

## 🏗️ Architecture

### Smart Contract (`contracts/`)
- **DuelEscrow.sol**: Handles staking and payouts
- **Functions**: `createDuel()`, `joinDuel()`, `finalizeDuel()`
- **Token**: USDC.e on Avalanche Fuji testnet

### Backend (`server/`)
- **Express API**: Matchmaking and game logic
- **WebSocket**: Real-time communication
- **Math Engine**: Question generation and scoring

### Frontend (`frontend/`)
- **Next.js 15**: React framework with App Router
- **TailwindCSS**: Styling
- **Wagmi**: Wallet connection
- **WebSocket Client**: Real-time updates

## 🔧 Development

### Smart Contract Development
```bash
cd contracts
npm run compile    # Compile contracts
npm run test       # Run tests
npm run deploy     # Deploy to Fuji
```

### Backend Development
```bash
cd server
npm run dev        # Start with nodemon
```

### Frontend Development
```bash
cd frontend
npm run dev        # Start Next.js dev server
```

## 📁 Project Structure

```
math-duel-game/
├── contracts/           # Hardhat project
│   ├── contracts/
│   │   └── DuelEscrow.sol
│   ├── scripts/
│   │   └── deploy.js
│   └── package.json
├── server/             # Node.js backend
│   ├── server.js
│   └── package.json
├── frontend/           # Next.js app
│   ├── app/
│   ├── components/
│   └── package.json
└── README.md
```

## 🎯 V1 Features

- ✅ 1v1 Math Duel gameplay
- ✅ Real-time WebSocket communication
- ✅ Smart contract escrow system
- ✅ USDC.e staking on Avalanche Fuji
- ✅ Automatic matchmaking
- ✅ Instant payouts to winners
- ✅ Responsive UI with TailwindCSS
- ✅ Wallet connection with Wagmi

## 🚀 Testing the Flow

### Test with 2 Wallets
1. **Wallet A**: Connect and click "Find Opponent"
2. **Wallet B**: Connect and click "Find Opponent" (should match with A)
3. **Both**: Answer the 3 math questions
4. **Winner**: Gets 2x stake amount automatically

### Test Scenarios
- **Correct Answers**: Both players answer correctly, winner based on speed
- **Mixed Answers**: One player answers correctly, one doesn't
- **Timeout**: Questions have 30-second time limit
- **Network Issues**: WebSocket reconnection handling

## 🔒 Security Notes

- **V1 Only**: No dispute resolution (server decides winner)
- **Testnet Only**: Uses Avalanche Fuji testnet
- **Test Tokens**: Uses USDC.e test tokens
- **No Database**: In-memory storage for V1

## 🐛 Troubleshooting

### Common Issues
1. **"Insufficient balance"**: Get USDC.e test tokens from faucet
2. **"Contract not found"**: Deploy contract and update backend
3. **WebSocket connection failed**: Check if backend is running
4. **"Approval failed"**: Approve USDC.e spending first

### Debug Mode
- Check browser console for errors
- Check backend logs for WebSocket issues
- Check MetaMask for transaction status

## 📝 Next Steps (V2+)

- [ ] Database persistence
- [ ] Dispute resolution system
- [ ] Tournament mode
- [ ] Different difficulty levels
- [ ] Mobile app
- [ ] Mainnet deployment
- [ ] Advanced UI/UX

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

---

**Built with ❤️ on Avalanche**
# Deployment trigger
