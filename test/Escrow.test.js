import { expect } from "chai";
import hre from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

describe("Escrow", function () {
  async function deployEscrowFixture() {
    const { ethers } = hre;
    const depositAmount = ethers.parseEther("1.0"); // 1 ETH
    const [owner, buyer, seller, arbiter, otherAccount] = await ethers.getSigners();
    
    const Escrow = await hre.ethers.getContractFactory("Escrow", owner);
    const escrow = await Escrow.deploy(seller.address, arbiter.address);

    return { escrow, owner, buyer, seller, arbiter, otherAccount, depositAmount };
  }

  describe("Deployment", function () {
    it("Should set the right buyer, seller, and arbiter", async function () {
      const { escrow, owner, seller, arbiter } = await loadFixture(deployEscrowFixture);
      expect(await escrow.buyer()).to.equal(owner.address);
      expect(await escrow.seller()).to.equal(seller.address);
      expect(await escrow.arbiter()).to.equal(arbiter.address);
    });

    it("Should set the initial state to AWAITING_PAYMENT", async function () {
      const { escrow } = await loadFixture(deployEscrowFixture);
      expect(await escrow.getState()).to.equal("AWAITING_PAYMENT");
    });
  });

  describe("Deposits", function () {
    it("Should accept ETH deposit and change state to AWAITING_DELIVERY", async function () {
      const { ethers } = hre;
      const { escrow, owner, depositAmount } = await loadFixture(deployEscrowFixture);
      const contractAddress = await escrow.getAddress();

      await owner.sendTransaction({
        to: contractAddress,
        value: depositAmount
      });

      expect(await ethers.provider.getBalance(contractAddress)).to.equal(depositAmount);
      expect(await escrow.getState()).to.equal("AWAITING_DELIVERY");
    });

    it("Should reject deposit if not in AWAITING_PAYMENT state", async function () {
      const { escrow, owner, depositAmount } = await loadFixture(deployEscrowFixture);
      const contractAddress = await escrow.getAddress();

      await owner.sendTransaction({
        to: contractAddress,
        value: depositAmount
      });

      await expect(
        owner.sendTransaction({
          to: contractAddress,
          value: depositAmount
        })
      ).to.be.revertedWith("Invalid state");
    });
  });

  describe("Release funds", function () {
    async function depositFixture() {
      const deployData = await deployEscrowFixture();
      const { escrow, owner, depositAmount } = deployData;
      const contractAddress = await escrow.getAddress();

      await owner.sendTransaction({
        to: contractAddress,
        value: depositAmount
      });

      return deployData;
    }

    it("Should allow buyer to release funds to seller", async function () {
      const { escrow, owner, seller, depositAmount } = await loadFixture(depositFixture);
      
      await expect(escrow.connect(owner).release()).to.changeEtherBalance(seller, depositAmount);
      expect(await escrow.getState()).to.equal("COMPLETE");
    });

    it("Should allow arbiter to release funds to seller", async function () {
      const { escrow, arbiter, seller, depositAmount } = await loadFixture(depositFixture);
      
      await expect(escrow.connect(arbiter).release()).to.changeEtherBalance(seller, depositAmount);
      expect(await escrow.getState()).to.equal("COMPLETE");
    });

    it("Should prevent non-authorized accounts from releasing funds", async function () {
      const { escrow, otherAccount } = await loadFixture(depositFixture);

      await expect(
        escrow.connect(otherAccount).release()
      ).to.be.revertedWith("Only buyer or arbiter can release funds");
    });
  });

  describe("Refunds", function () {
    async function depositFixture() {
      const deployData = await deployEscrowFixture();
      const { escrow, owner, depositAmount } = deployData;
      const contractAddress = await escrow.getAddress();

      await owner.sendTransaction({
        to: contractAddress,
        value: depositAmount
      });

      return deployData;
    }

    it("Should allow buyer to get a refund", async function () {
      const { escrow, owner, depositAmount } = await loadFixture(depositFixture);
      
      await expect(escrow.connect(owner).refund()).to.changeEtherBalance(owner, depositAmount);
      expect(await escrow.getState()).to.equal("REFUNDED");
    });

    it("Should allow arbiter to issue a refund", async function () {
      const { escrow, owner, arbiter, depositAmount } = await loadFixture(depositFixture);
      
      await expect(escrow.connect(arbiter).refund()).to.changeEtherBalance(owner, depositAmount);
      expect(await escrow.getState()).to.equal("REFUNDED");
    });

    it("Should prevent non-authorized accounts from issuing refunds", async function () {
      const { escrow, otherAccount } = await loadFixture(depositFixture);

      await expect(
        escrow.connect(otherAccount).refund()
      ).to.be.revertedWith("Only buyer or arbiter can refund");
    });
  });

  describe("Dispute resolution", function () {
    async function depositFixture() {
      const deployData = await deployEscrowFixture();
      const { escrow, owner, depositAmount } = deployData;
      const contractAddress = await escrow.getAddress();

      await owner.sendTransaction({
        to: contractAddress,
        value: depositAmount
      });

      return deployData;
    }

    it("Should allow arbiter to resolve dispute in favor of buyer", async function () {
      const { escrow, owner, arbiter, depositAmount } = await loadFixture(depositFixture);
      
      await expect(escrow.connect(arbiter).resolveDispute(owner.address)).to.changeEtherBalance(owner, depositAmount);
      expect(await escrow.getState()).to.equal("DISPUTED");
    });

    it("Should allow arbiter to resolve dispute in favor of seller", async function () {
      const { escrow, seller, arbiter, depositAmount } = await loadFixture(depositFixture);
      
      await expect(escrow.connect(arbiter).resolveDispute(seller.address)).to.changeEtherBalance(seller, depositAmount);
      expect(await escrow.getState()).to.equal("DISPUTED");
    });

    it("Should prevent non-arbiter from resolving disputes", async function () {
      const { escrow, owner } = await loadFixture(depositFixture);

      await expect(
        escrow.connect(owner).resolveDispute(owner.address)
      ).to.be.revertedWith("Only arbiter can call this function");
    });

    it("Should prevent resolving dispute with invalid winner", async function () {
      const { escrow, arbiter, otherAccount } = await loadFixture(depositFixture);

      await expect(
        escrow.connect(arbiter).resolveDispute(otherAccount.address)
      ).to.be.revertedWith("Winner must be either buyer or seller");
    });
  });
});
