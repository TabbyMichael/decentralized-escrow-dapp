import { expect } from "chai";
import hre from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

describe("EscrowFactory", function () {
  async function deployEscrowFactoryFixture() {
    const { ethers } = hre;
    const [owner, seller, arbiter, otherAccount] = await ethers.getSigners();

    const EscrowFactory = await hre.ethers.getContractFactory("EscrowFactory", owner);
    const factory = await EscrowFactory.deploy();

    return { factory, owner, seller, arbiter, otherAccount };
  }

  describe("Deployment", function () {
    it("Should deploy without errors", async function () {
      const { factory } = await loadFixture(deployEscrowFactoryFixture);
      expect(await factory.getAddress()).to.not.be.null;
    });
  });

  describe("Escrow Creation", function () {
    it("Should create a new escrow contract", async function () {
      const { factory, owner, seller, arbiter } = await loadFixture(deployEscrowFactoryFixture);

      const tx = await factory.createEscrow(seller.address, arbiter.address);
      await tx.wait();

      const deployedEscrows = await factory.getDeployedEscrows();
      expect(deployedEscrows.length).to.equal(1);
      expect(deployedEscrows[0]).to.be.a.properAddress;
    });

    it("Should emit an EscrowCreated event", async function () {
      const { factory, owner, seller, arbiter } = await loadFixture(deployEscrowFactoryFixture);

      const tx = await factory.createEscrow(seller.address, arbiter.address);
      const deployedEscrows = await factory.getDeployedEscrows();
      const escrowAddress = deployedEscrows[0];

      await expect(tx)
        .to.emit(factory, "EscrowCreated")
        .withArgs(escrowAddress, owner.address, seller.address, arbiter.address);
    });

    it("Should create multiple escrows for different users", async function () {
      const { factory, owner, seller, arbiter, otherAccount } = await loadFixture(deployEscrowFactoryFixture);

      // First escrow created by owner
      await factory.connect(owner).createEscrow(seller.address, arbiter.address);

      // Second escrow created by otherAccount
      await factory.connect(otherAccount).createEscrow(seller.address, arbiter.address);

      const deployedEscrows = await factory.getDeployedEscrows();
      expect(deployedEscrows.length).to.equal(2);

      // Verify the first escrow's details via the event
      const filterOwner = factory.filters.EscrowCreated(null, owner.address);
      const eventsOwner = await factory.queryFilter(filterOwner);
      expect(eventsOwner.length).to.equal(1);
      expect(eventsOwner[0].args.buyer).to.equal(owner.address);

      // Verify the second escrow's details
      const filterOther = factory.filters.EscrowCreated(null, otherAccount.address);
      const eventsOther = await factory.queryFilter(filterOther);
      expect(eventsOther.length).to.equal(1);
      expect(eventsOther[0].args.buyer).to.equal(otherAccount.address);
    });
  });

  describe("getDeployedEscrows", function () {
    it("Should return an empty array initially", async function () {
      const { factory } = await loadFixture(deployEscrowFactoryFixture);
      const deployedEscrows = await factory.getDeployedEscrows();
      expect(deployedEscrows.length).to.equal(0);
    });

    it("Should return an array with the addresses of all created escrows", async function () {
      const { factory, seller, arbiter } = await loadFixture(deployEscrowFactoryFixture);

      const tx1 = await factory.createEscrow(seller.address, arbiter.address);
      const receipt1 = await tx1.wait();
      const events1 = await factory.queryFilter(factory.filters.EscrowCreated(), receipt1.blockNumber);
      const escrowAddress1 = events1[0].args.escrowAddress;

      const tx2 = await factory.createEscrow(arbiter.address, seller.address); // Different parties
      const receipt2 = await tx2.wait();
      const events2 = await factory.queryFilter(factory.filters.EscrowCreated(), receipt2.blockNumber);
      const escrowAddress2 = events2[0].args.escrowAddress;

      const deployedEscrows = await factory.getDeployedEscrows();
      expect(deployedEscrows.length).to.equal(2);
      expect(deployedEscrows).to.include(escrowAddress1);
      expect(deployedEscrows).to.include(escrowAddress2);
    });
  });
});
