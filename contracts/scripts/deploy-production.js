const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Deploying Math Duel Game to Production...\n");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await deployer.provider.getBalance(deployer.address)).toString());

  // Deploy MockERC20 first (for testing) or use existing USDC.e
  console.log("\n📝 Deploying MockERC20...");
  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const mockToken = await MockERC20.deploy("Math Duel Token", "MDT", 6);
  await mockToken.waitForDeployment();
  console.log("MockERC20 deployed to:", await mockToken.getAddress());

  // Mint tokens to deployer for testing
  console.log("Minting test tokens...");
  await mockToken.mint(deployer.address, ethers.parseUnits("1000", 6));
  console.log("Minted 1000 MDT to deployer");

  // Deploy DuelEscrow contract
  console.log("\n🎯 Deploying DuelEscrow...");
  const DuelEscrow = await ethers.getContractFactory("DuelEscrow");
  const duelEscrow = await DuelEscrow.deploy(await mockToken.getAddress());
  await duelEscrow.waitForDeployment();
  console.log("DuelEscrow deployed to:", await duelEscrow.getAddress());

  // Verify deployment
  console.log("\n✅ Verifying deployment...");
  const duelCount = await duelEscrow.getDuelCount();
  console.log("Initial duel count:", duelCount.toString());

  // Test contract functions
  console.log("\n🧪 Testing contract functions...");
  
  // Test question generation
  const questionHash = await duelEscrow.generateQuestionHash(0, 5, 3); // 5 + 3
  console.log("Question hash for 5 + 3:", questionHash.toString());

  // Test answer validation
  const isValidAddition = await duelEscrow.validateAnswer(0, 5, 3, 8); // 5 + 3 = 8
  const isValidSubtraction = await duelEscrow.validateAnswer(1, 10, 3, 7); // 10 - 3 = 7
  const isValidMultiplication = await duelEscrow.validateAnswer(2, 4, 5, 20); // 4 * 5 = 20
  const isValidDivision = await duelEscrow.validateAnswer(3, 20, 4, 5); // 20 / 4 = 5

  console.log("Addition validation (5 + 3 = 8):", isValidAddition);
  console.log("Subtraction validation (10 - 3 = 7):", isValidSubtraction);
  console.log("Multiplication validation (4 * 5 = 20):", isValidMultiplication);
  console.log("Division validation (20 / 4 = 5):", isValidDivision);

  // Test division by zero protection
  try {
    await duelEscrow.validateAnswer(3, 10, 0, 5);
    console.log("❌ Division by zero protection failed!");
  } catch (error) {
    console.log("✅ Division by zero protection working:", error.message.includes("Division by zero"));
  }

  // Save deployment addresses
  const deploymentInfo = {
    network: await deployer.provider.getNetwork(),
    deployer: deployer.address,
    mockToken: await mockToken.getAddress(),
    duelEscrow: await duelEscrow.getAddress(),
    timestamp: new Date().toISOString(),
    gasUsed: {
      mockToken: (await mockToken.deploymentTransaction())?.gasLimit?.toString() || "N/A",
      duelEscrow: (await duelEscrow.deploymentTransaction())?.gasLimit?.toString() || "N/A"
    }
  };

  console.log("\n📋 Deployment Summary:");
  console.log("Network:", deploymentInfo.network.name, `(Chain ID: ${deploymentInfo.network.chainId})`);
  console.log("Deployer:", deploymentInfo.deployer);
  console.log("MockERC20:", deploymentInfo.mockToken);
  console.log("DuelEscrow:", deploymentInfo.duelEscrow);
  console.log("Timestamp:", deploymentInfo.timestamp);

  // Save to file
  const fs = require('fs');
  const path = require('path');
  const deploymentPath = path.join(__dirname, '..', 'deployed-addresses.json');
  
  let existingDeployments = {};
  if (fs.existsSync(deploymentPath)) {
    existingDeployments = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
  }
  
  existingDeployments[deploymentInfo.network.chainId.toString()] = deploymentInfo;
  fs.writeFileSync(deploymentPath, JSON.stringify(existingDeployments, null, 2));
  
  console.log("\n💾 Deployment info saved to deployed-addresses.json");

  // Generate frontend configuration
  console.log("\n🔧 Frontend Configuration:");
  console.log("Add these to your .env.local:");
  console.log(`NEXT_PUBLIC_CONTRACT_ADDRESS=${deploymentInfo.duelEscrow}`);
  console.log(`NEXT_PUBLIC_TOKEN_ADDRESS=${deploymentInfo.mockToken}`);
  console.log(`NEXT_PUBLIC_CHAIN_ID=${deploymentInfo.network.chainId}`);

  // Generate backend configuration
  console.log("\n🔧 Backend Configuration:");
  console.log("Add these to your server/.env:");
  console.log(`CONTRACT_ADDRESS=${deploymentInfo.duelEscrow}`);
  console.log(`TOKEN_ADDRESS=${deploymentInfo.mockToken}`);
  console.log(`CHAIN_ID=${deploymentInfo.network.chainId}`);

  console.log("\n🎉 Deployment completed successfully!");
  console.log("\nNext steps:");
  console.log("1. Update your frontend and backend with the contract addresses");
  console.log("2. Test the game with the deployed contracts");
  console.log("3. Deploy to mainnet when ready");
  console.log("4. Get your smart contract audited for production use");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
