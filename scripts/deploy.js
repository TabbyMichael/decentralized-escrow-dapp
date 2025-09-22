const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Deploying Escrow contract...");

  const [deployer, seller, arbiter] = await hre.ethers.getSigners();

  console.log(`Deploying Escrow with the following roles:`);
  console.log(`- Owner/Deployer: ${deployer.address}`);
  console.log(`- Buyer: ${deployer.address}`); // Buyer is also the deployer
  console.log(`- Seller: ${seller.address}`);
  console.log(`- Arbiter: ${arbiter.address}`);

  const Escrow = await hre.ethers.getContractFactory("Escrow");
  const escrow = await Escrow.deploy(seller.address, arbiter.address);

  await escrow.waitForDeployment();
  const escrowAddress = await escrow.getAddress();

  console.log(`Escrow deployed to: ${escrowAddress}`);

  // Save the contract's address and ABI to the frontend
  saveFrontendFiles(escrowAddress);

  // Verify the contract on Etherscan (if on a testnet/mainnet)
  if (process.env.ETHERSCAN_API_KEY && hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("Waiting for block confirmations...");
    await escrow.deployTransaction.wait(6);
    
    console.log("Verifying contract on Etherscan...");
    await hre.run("verify:verify", {
      address: escrow.address,
      constructorArguments: [seller.address, arbiter.address],
    });
  }
}

function saveFrontendFiles(escrowAddress) {
  const contractsDir = path.join(__dirname, "..", "frontend", "src");
  const configPath = path.join(contractsDir, "config.json");

  // Read existing config
  let config = {};
  if (fs.existsSync(configPath)) {
    config = JSON.parse(fs.readFileSync(configPath));
  }

  // Update config with new address
  const networkId = hre.network.config.chainId;
  config[networkId] = { escrowAddress };

  // Write back to config.json
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

  console.log(`Updated frontend/src/config.json with address ${escrowAddress} for network ${networkId}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
