const hre = require("hardhat");

async function main() {
  console.log("🚀 Deploying AVAX Duel Escrow Contract...");

  // Get the contract factory
  const AVAXDuelEscrow = await hre.ethers.getContractFactory("AVAXDuelEscrow");

  // Deploy the contract
  console.log("Deploying contract...");
  const duelEscrow = await AVAXDuelEscrow.deploy();

  // Wait for deployment to finish
  await duelEscrow.waitForDeployment();

  const contractAddress = await duelEscrow.getAddress();
  console.log("✅ AVAX Duel Escrow deployed to:", contractAddress);

  // Verify the contract
  console.log("Verifying contract...");
  try {
    await hre.run("verify:verify", {
      address: contractAddress,
      constructorArguments: [],
    });
    console.log("✅ Contract verified on block explorer");
  } catch (error) {
    console.log("⚠️  Contract verification failed:", error.message);
  }

  // Save deployment info
  const deploymentInfo = {
    contractAddress: contractAddress,
    network: hre.network.name,
    chainId: hre.network.config.chainId,
    deployer: await duelEscrow.runner.getAddress(),
    timestamp: new Date().toISOString(),
    minimumStake: "0.01 AVAX"
  };

  console.log("\n📋 Deployment Summary:");
  console.log("Contract Address:", contractAddress);
  console.log("Network:", hre.network.name);
  console.log("Chain ID:", hre.network.config.chainId);
  console.log("Minimum Stake:", "0.01 AVAX");
  console.log("Deployer:", await duelEscrow.runner.getAddress());

  console.log("\n🎯 Next Steps:");
  console.log("1. Update frontend with contract address:", contractAddress);
  console.log("2. Get AVAX test tokens from: https://faucet.avax.network/");
  console.log("3. Test the duel functionality!");

  return deploymentInfo;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
