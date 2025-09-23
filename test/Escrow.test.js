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

  describe("Re-entrancy Guard", function () {
    it("Should prevent re-entrant calls to release()", async function () {
      const { ethers } = hre;
      const { owner, arbiter, depositAmount } = await loadFixture(deployEscrowFixture);

      // Deploy the attacker contract
      const Attacker = await ethers.getContractFactory("Attacker");
      const attacker = await Attacker.deploy();
      const attackerAddress = await attacker.getAddress();

      // Deploy Escrow with Attacker as the seller. The deployer (owner) becomes the buyer.
      const Escrow = await ethers.getContractFactory("Escrow", owner);
      const escrow = await Escrow.deploy(attackerAddress, arbiter.address);
      const escrowAddress = await escrow.getAddress();

      // Set the escrow address in the attacker contract
      await attacker.connect(owner).setEscrow(escrowAddress);

      // Deposit funds into the escrow from the owner's (buyer's) account
      await owner.sendTransaction({
        to: escrowAddress,
        value: depositAmount,
      });

      // Attempt the re-entrancy attack
      // The owner (buyer) calls release, which sends funds to the attacker, which tries to call release again.
      await expect(
        escrow.connect(owner).release()
      ).to.be.revertedWithCustomError(escrow, "FailedToSendEther");
    });
  });

  describe("Failed Transfers", function () {
    it("Should revert release if seller rejects payment", async function () {
      const { ethers } = hre;
      const { owner, arbiter, depositAmount } = await loadFixture(deployEscrowFixture);

      // Deploy the PaymentRejector contract
      const PaymentRejector = await ethers.getContractFactory("PaymentRejector");
      const paymentRejector = await PaymentRejector.deploy();
      const rejectorAddress = await paymentRejector.getAddress();

      // Deploy Escrow with PaymentRejector as the seller
      const Escrow = await ethers.getContractFactory("Escrow", owner);
      const escrow = await Escrow.deploy(rejectorAddress, arbiter.address);
      const escrowAddress = await escrow.getAddress();

      // Deposit funds
      await owner.sendTransaction({
        to: escrowAddress,
        value: depositAmount,
      });

      // Attempt to release funds, expecting it to fail
      await expect(
        escrow.connect(owner).release()
      ).to.be.revertedWithCustomError(escrow, "FailedToSendEther");
    });

    it("Should revert refund if buyer rejects payment", async function () {
      const { ethers } = hre;
      const [owner, , seller, arbiter] = await ethers.getSigners();
      const depositAmount = ethers.parseEther("1.0");

      // Deploy the BuyerContract helper
      const BuyerContract = await ethers.getContractFactory("BuyerContract");
      const buyerContract = await BuyerContract.deploy();

      // Deploy Escrow via the BuyerContract, so the buyer is the contract itself
      await buyerContract.deployEscrow(seller.address, arbiter.address);
      const escrowAddress = await buyerContract.getEscrowAddress();
      const escrow = await ethers.getContractAt("Escrow", escrowAddress);

      // An account (can be anyone) sends funds to the escrow
      await owner.sendTransaction({
        to: escrowAddress,
        value: depositAmount,
      });

      // Attempt to refund, expecting it to fail because the buyer contract rejects it
      await expect(
        escrow.connect(arbiter).refund()
      ).to.be.revertedWithCustomError(escrow, "FailedToSendEther");
    });
  });

  describe("Attacker Contract", function () {
    async function deployAttackerFixture() {
      const { ethers } = hre;
      const [owner, otherAccount] = await ethers.getSigners();
      const Attacker = await ethers.getContractFactory("Attacker", owner);
      const attacker = await Attacker.deploy();
      return { attacker, owner, otherAccount };
    }

    it("Should prevent non-owner from setting escrow address", async function () {
      const { attacker, otherAccount } = await loadFixture(deployAttackerFixture);
      const dummyEscrowAddress = otherAccount.address; // Just needs to be a valid address
      await expect(
        attacker.connect(otherAccount).setEscrow(dummyEscrowAddress)
      ).to.be.revertedWith("Only owner can set escrow");
    });

    it("Should return the correct balance", async function () {
      const { ethers } = hre;
      const { attacker } = await loadFixture(deployAttackerFixture);
      const attackerAddress = await attacker.getAddress();
      const amount = ethers.parseEther("1.0");

      // Send some ETH to the attacker contract
      const [owner] = await ethers.getSigners();
      await owner.sendTransaction({
        to: attackerAddress,
        value: amount
      });

      expect(await attacker.getBalance()).to.equal(amount);
    });
  });
});
