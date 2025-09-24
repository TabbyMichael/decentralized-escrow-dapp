import { expect } from "chai";
import hre from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

describe("EscrowFactory for ERC20", function () {
  async function deployEscrowFactoryFixture() {
    const { ethers } = hre;
    const [owner, seller, arbiter] = await ethers.getSigners();

    // Deploy a test token
    const TestToken = await hre.ethers.getContractFactory("TestToken");
    const testToken = await TestToken.deploy("Test Token", "TST");
    const tokenAddress = await testToken.getAddress();

    // Deploy the factory
    const EscrowFactory = await hre.ethers.getContractFactory("EscrowFactory", owner);
    const factory = await EscrowFactory.deploy();

    const escrowAmount = ethers.parseUnits("100", 18);

    return { factory, owner, seller, arbiter, tokenAddress, escrowAmount };
  }

  describe("Deployment", function () {
    it("Should deploy without errors", async function () {
      const { factory } = await loadFixture(deployEscrowFactoryFixture);
      expect(await factory.getAddress()).to.not.be.null;
    });
  });

  describe("Escrow Creation", function () {
    it("Should create a new ERC20 escrow contract", async function () {
      const { factory, seller, arbiter, tokenAddress, escrowAmount } = await loadFixture(deployEscrowFactoryFixture);

      await factory.createEscrow(seller.address, arbiter.address, tokenAddress, escrowAmount);

      const deployedEscrows = await factory.getDeployedEscrows();
      expect(deployedEscrows.length).to.equal(1);
    });

    it("Should emit an EscrowCreated event with all parameters", async function () {
      const { factory, owner, seller, arbiter, tokenAddress, escrowAmount } = await loadFixture(deployEscrowFactoryFixture);

      const tx = await factory.createEscrow(seller.address, arbiter.address, tokenAddress, escrowAmount);
      const deployedEscrows = await factory.getDeployedEscrows();
      const escrowAddress = deployedEscrows[0];

      await expect(tx)
        .to.emit(factory, "EscrowCreated")
        .withArgs(
          escrowAddress,
          owner.address,
          seller.address,
          arbiter.address,
          tokenAddress,
          escrowAmount
        );
    });

    it("Should allow retrieval of the created escrow address", async function () {
      const { factory, seller, arbiter, tokenAddress, escrowAmount } = await loadFixture(deployEscrowFactoryFixture);
      await factory.createEscrow(seller.address, arbiter.address, tokenAddress, escrowAmount);

      const deployedEscrows = await factory.getDeployedEscrows();
      const escrowAddress = deployedEscrows[0];

      const Escrow = await hre.ethers.getContractFactory("Escrow");
      const escrowContract = Escrow.attach(escrowAddress);

      expect(await escrowContract.token()).to.equal(tokenAddress);
      expect(await escrowContract.amount()).to.equal(escrowAmount);
    });
  });
});
