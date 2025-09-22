const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Escrow", function () {
  let Escrow, escrow;
  let owner, buyer, seller, arbiter, otherAccount;
  const depositAmount = ethers.utils.parseEther("1.0"); // 1 ETH

  beforeEach(async function () {
    // Get the ContractFactory and Signers here
    [owner, buyer, seller, arbiter, otherAccount] = await ethers.getSigners();
    
    // Deploy a new Escrow contract for each test
    const EscrowFactory = await ethers.getContractFactory("Escrow");
    escrow = await EscrowFactory.deploy(seller.address, arbiter.address);
    await escrow.deployed();
  });

  describe("Deployment", function () {
    it("Should set the right buyer, seller, and arbiter", async function () {
      expect(await escrow.buyer()).to.equal(owner.address);
      expect(await escrow.seller()).to.equal(seller.address);
      expect(await escrow.arbiter()).to.equal(arbiter.address);
    });

    it("Should set the initial state to AWAITING_PAYMENT", async function () {
      expect(await escrow.getState()).to.equal("AWAITING_PAYMENT");
    });
  });

  describe("Deposits", function () {
    it("Should accept ETH deposit and change state to AWAITING_DELIVERY", async function () {
      // Send ETH to the contract
      const tx = await owner.sendTransaction({
        to: escrow.address,
        value: depositAmount
      });
      await tx.wait();

      // Check the contract balance and state
      expect(await ethers.provider.getBalance(escrow.address)).to.equal(depositAmount);
      expect(await escrow.getState()).to.equal("AWAITING_DELIVERY");
    });

    it("Should reject deposit if not in AWAITING_PAYMENT state", async function () {
      // First deposit (should work)
      await owner.sendTransaction({
        to: escrow.address,
        value: depositAmount
      });

      // Second deposit should fail
      await expect(
        owner.sendTransaction({
          to: escrow.address,
          value: depositAmount
        })
      ).to.be.revertedWith("Invalid state");
    });
  });

  describe("Release funds", function () {
    beforeEach(async function () {
      // Set up a deposit
      await owner.sendTransaction({
        to: escrow.address,
        value: depositAmount
      });
    });

    it("Should allow buyer to release funds to seller", async function () {
      const initialSellerBalance = await seller.getBalance();
      
      // Release funds
      const tx = await escrow.connect(owner).release();
      await tx.wait();
      
      // Check state and balances
      expect(await escrow.getState()).to.equal("COMPLETE");
      expect(await ethers.provider.getBalance(escrow.address)).to.equal(0);
      
      const finalSellerBalance = await seller.getBalance();
      expect(finalSellerBalance.sub(initialSellerBalance)).to.equal(depositAmount);
    });

    it("Should allow arbiter to release funds to seller", async function () {
      const initialSellerBalance = await seller.getBalance();
      
      // Release funds as arbiter
      const tx = await escrow.connect(arbiter).release();
      await tx.wait();
      
      // Check state and balances
      expect(await escrow.getState()).to.equal("COMPLETE");
      expect(await ethers.provider.getBalance(escrow.address)).to.equal(0);
      
      const finalSellerBalance = await seller.getBalance();
      expect(finalSellerBalance.sub(initialSellerBalance)).to.equal(depositAmount);
    });

    it("Should prevent non-authorized accounts from releasing funds", async function () {
      await expect(
        escrow.connect(otherAccount).release()
      ).to.be.revertedWith("Only buyer or arbiter can release funds");
    });
  });

  describe("Refunds", function () {
    beforeEach(async function () {
      // Set up a deposit
      await owner.sendTransaction({
        to: escrow.address,
        value: depositAmount
      });
    });

    it("Should allow buyer to get a refund", async function () {
      const initialBuyerBalance = await owner.getBalance();
      
      // Get a refund
      const tx = await escrow.connect(owner).refund();
      const receipt = await tx.wait();
      
      // Calculate gas cost
      const gasUsed = receipt.gasUsed.mul(receipt.effectiveGasPrice);
      
      // Check state and balances
      expect(await escrow.getState()).to.equal("REFUNDED");
      expect(await ethers.provider.getBalance(escrow.address)).to.equal(0);
      
      const finalBuyerBalance = await owner.getBalance();
      // Final balance should be initial + deposit - gas
      expect(finalBuyerBalance).to.equal(
        initialBuyerBalance.add(depositAmount).sub(gasUsed)
      );
    });

    it("Should allow arbiter to issue a refund", async function () {
      const initialBuyerBalance = await owner.getBalance();
      
      // Get a refund as arbiter
      const tx = await escrow.connect(arbiter).refund();
      const receipt = await tx.wait();
      
      // Calculate gas cost
      const gasUsed = receipt.gasUsed.mul(receipt.effectiveGasPrice);
      
      // Check state and balances
      expect(await escrow.getState()).to.equal("REFUNDED");
      expect(await ethers.provider.getBalance(escrow.address)).to.equal(0);
      
      const finalBuyerBalance = await owner.getBalance();
      // Final balance should be initial + deposit - gas
      expect(finalBuyerBalance).to.equal(
        initialBuyerBalance.add(depositAmount).sub(gasUsed)
      );
    });

    it("Should prevent non-authorized accounts from issuing refunds", async function () {
      await expect(
        escrow.connect(otherAccount).refund()
      ).to.be.revertedWith("Only buyer or arbiter can refund");
    });
  });

  describe("Dispute resolution", function () {
    beforeEach(async function () {
      // Set up a deposit
      await owner.sendTransaction({
        to: escrow.address,
        value: depositAmount
      });
    });

    it("Should allow arbiter to resolve dispute in favor of buyer", async function () {
      const initialBuyerBalance = await owner.getBalance();
      
      // Resolve dispute in favor of buyer
      const tx = await escrow.connect(arbiter).resolveDispute(owner.address);
      const receipt = await tx.wait();
      
      // Calculate gas cost
      const gasUsed = receipt.gasUsed.mul(receipt.effectiveGasPrice);
      
      // Check state and balances
      expect(await escrow.getState()).to.equal("DISPUTED");
      expect(await ethers.provider.getBalance(escrow.address)).to.equal(0);
      
      const finalBuyerBalance = await owner.getBalance();
      // Final balance should be initial + deposit - gas
      expect(finalBuyerBalance).to.equal(
        initialBuyerBalance.add(depositAmount).sub(gasUsed)
      );
    });

    it("Should allow arbiter to resolve dispute in favor of seller", async function () {
      const initialSellerBalance = await seller.getBalance();
      
      // Resolve dispute in favor of seller
      const tx = await escrow.connect(arbiter).resolveDispute(seller.address);
      await tx.wait();
      
      // Check state and balances
      expect(await escrow.getState()).to.equal("DISPUTED");
      expect(await ethers.provider.getBalance(escrow.address)).to.equal(0);
      
      const finalSellerBalance = await seller.getBalance();
      expect(finalSellerBalance.sub(initialSellerBalance)).to.equal(depositAmount);
    });

    it("Should prevent non-arbiter from resolving disputes", async function () {
      await expect(
        escrow.connect(owner).resolveDispute(owner.address)
      ).to.be.revertedWith("Only arbiter can call this function");
    });

    it("Should prevent resolving dispute with invalid winner", async function () {
      await expect(
        escrow.connect(arbiter).resolveDispute(otherAccount.address)
      ).to.be.revertedWith("Winner must be either buyer or seller");
    });
  });
});
