// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
import hre from "hardhat";

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // Get the ContractFactory for EscrowFactory
  const EscrowFactory = await hre.ethers.getContractFactory("EscrowFactory");

  // Deploy the contract
  console.log("Deploying EscrowFactory...");
  const escrowFactory = await EscrowFactory.deploy();
  await escrowFactory.waitForDeployment();
  const address = await escrowFactory.getAddress();

  console.log(`EscrowFactory deployed to: ${address}`);

  // Optional: Verify the contract on Etherscan
  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost" && process.env.ETHERSCAN_API_KEY) {
    console.log("Waiting for block confirmations before verification...");
    // Wait for a few blocks to be mined
    const receipt = await escrowFactory.deploymentTransaction().wait(5);
    
    console.log("Verifying contract on Etherscan...");
    try {
      await hre.run("verify:verify", {
        address: address,
        constructorArguments: [], // No constructor arguments for EscrowFactory
      });
      console.log("Contract verified successfully.");
    } catch (error) {
      console.error("Verification failed:", error);
    }
  }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
