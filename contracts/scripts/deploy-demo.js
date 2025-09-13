const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Deploying Demo Math Duel Game to Fuji Testnet...\n");
  
  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  
  // Check balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "AVAX");
  
  if (balance === 0n) {
    throw new Error("❌ No AVAX balance! Please get testnet AVAX from the faucet.");
  }
  
  console.log("\n📝 Step 1: Deploying Mock USDC Token...");
  const MockUSDC = await ethers.getContractFactory("MockERC20");
  const mockUSDC = await MockUSDC.deploy("Mock USDC", "mUSDC", 6);
  await mockUSDC.waitForDeployment();
  
  const mockUSDCAddress = await mockUSDC.getAddress();
  console.log("✅ Mock USDC deployed to:", mockUSDCAddress);
  
  // Mint tokens to deployer
  const mintAmount = ethers.parseUnits("10000", 6); // 10,000 mUSDC
  await mockUSDC.mint(deployer.address, mintAmount);
  console.log("✅ Minted 10,000 mUSDC to deployer");
  
  console.log("\n📝 Step 2: Deploying DuelEscrow Contract...");
  const DuelEscrow = await ethers.getContractFactory("DuelEscrow");
  const duelEscrow = await DuelEscrow.deploy(mockUSDCAddress);
  await duelEscrow.waitForDeployment();
  
  const duelEscrowAddress = await duelEscrow.getAddress();
  console.log("✅ DuelEscrow deployed to:", duelEscrowAddress);
  
  console.log("\n📝 Step 3: Verifying Deployment...");
  const stakeToken = await duelEscrow.stakeToken();
  const minimumStake = await duelEscrow.MINIMUM_STAKE();
  const owner = await duelEscrow.owner();
  
  console.log("✅ Stake token:", stakeToken);
  console.log("✅ Minimum stake:", ethers.formatUnits(minimumStake, 6), "mUSDC");
  console.log("✅ Owner:", owner);
  
  console.log("\n🎉 Deployment Complete!");
  console.log("=" * 50);
  console.log("Contract Addresses:");
  console.log("DuelEscrow:", duelEscrowAddress);
  console.log("Mock USDC:", mockUSDCAddress);
  console.log("=" * 50);
  
  console.log("\n📋 Next Steps:");
  console.log("1. Copy the DuelEscrow address above");
  console.log("2. Update your backend .env file with this address");
  console.log("3. Restart your backend server");
  console.log("4. Test the game with real wallet connection!");
  
  // Save addresses to a file for easy reference
  const fs = require('fs');
  const addresses = {
    duelEscrow: duelEscrowAddress,
    mockUSDC: mockUSDCAddress,
    network: "fuji",
    chainId: 43113
  };
  
  fs.writeFileSync('deployed-addresses.json', JSON.stringify(addresses, null, 2));
  console.log("\n💾 Addresses saved to deployed-addresses.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
