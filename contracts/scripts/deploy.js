const { ethers } = require("hardhat");

async function main() {
  // USDC.e on Fuji testnet address
  const USDC_E_ADDRESS = "0x5425890298aed601595a70AB815c96711a31Bc65";
  
  console.log("Deploying DuelEscrow contract...");
  
  const DuelEscrow = await ethers.getContractFactory("DuelEscrow");
  const duelEscrow = await DuelEscrow.deploy(USDC_E_ADDRESS);
  
  await duelEscrow.waitForDeployment();
  
  const contractAddress = await duelEscrow.getAddress();
  
  console.log("DuelEscrow deployed to:", contractAddress);
  console.log("USDC.e token address:", USDC_E_ADDRESS);
  console.log("Minimum stake:", await duelEscrow.MINIMUM_STAKE());
  
  // Verify deployment
  console.log("\nVerifying deployment...");
  const stakeToken = await duelEscrow.stakeToken();
  const minimumStake = await duelEscrow.MINIMUM_STAKE();
  
  console.log("✓ Stake token:", stakeToken);
  console.log("✓ Minimum stake:", ethers.formatUnits(minimumStake, 6), "USDC.e");
  console.log("✓ Owner:", await duelEscrow.owner());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
