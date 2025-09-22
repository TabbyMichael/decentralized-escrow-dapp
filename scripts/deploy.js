const hre = require("hardhat");

async function main() {
  console.log("Deploying Escrow contract...");
  
  // Get the contract factory
  const Escrow = await hre.ethers.getContractFactory("Escrow");
  
  // Replace these with the actual addresses for seller and arbiter
  // For testing, you can use the second and third account from Hardhat
  const [deployer, seller, arbiter] = await hre.ethers.getSigners();
  
  console.log(`Deploying Escrow with the following roles:`);
  console.log(`- Buyer (deployer): ${deployer.address}`);
  console.log(`- Seller: ${seller.address}`);
  console.log(`- Arbiter: ${arbiter.address}`);
  
  // Deploy the contract
  const escrow = await Escrow.deploy(seller.address, arbiter.address);
  await escrow.deployed();
  
  console.log(`Escrow deployed to: ${escrow.address}`);
  
  // Verify the contract on Etherscan (if on a testnet/mainnet)
  if (process.env.ETHERSCAN_API_KEY) {
    console.log("Waiting for block confirmations...");
    await escrow.deployTransaction.wait(6);
    
    console.log("Verifying contract on Etherscan...");
    await hre.run("verify:verify", {
      address: escrow.address,
      constructorArguments: [seller.address, arbiter.address],
    });
  }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
