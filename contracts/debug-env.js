require('dotenv').config();

console.log("Environment variables:");
console.log("PRIVATE_KEY:", process.env.PRIVATE_KEY ? "Set" : "Not set");
console.log("PRIVATE_KEY length:", process.env.PRIVATE_KEY ? process.env.PRIVATE_KEY.length : 0);
console.log("REPORT_GAS:", process.env.REPORT_GAS);

const { ethers } = require("hardhat");

async function main() {
  try {
    console.log("\nTesting Hardhat configuration...");
    
    // Check if we can get signers
    const signers = await ethers.getSigners();
    console.log("Number of signers:", signers.length);
    
    if (signers.length === 0) {
      console.log("❌ No signers found. Check your private key configuration.");
      console.log("Make sure your .env file is in the contracts directory and contains a valid PRIVATE_KEY");
      return;
    }
    
    const [deployer] = signers;
    console.log("Deployer address:", deployer.address);
    
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
