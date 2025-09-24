import { expect } from "chai";
import hre from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

describe("ERC20 Escrow Contract", function () {
  async function deployEscrowFixture() {
    const { ethers } = hre;
    const [owner, buyer, seller, arbiter] = await ethers.getSigners();
    
    // 1. Deploy the TestToken contract
    const TestToken = await hre.ethers.getContractFactory("TestToken");
    const testToken = await TestToken.deploy("Test Token", "TST");
    const tokenAddress = await testToken.getAddress();

    // 2. Define the escrow amount
    const escrowAmount = ethers.parseUnits("100", 18); // 100 TST

    // 3. Deploy the Escrow contract
    const Escrow = await hre.ethers.getContractFactory("Escrow");
    const escrow = await Escrow.deploy(
      buyer.address,
      seller.address,
      arbiter.address,
      tokenAddress,
      escrowAmount
    );
    const escrowAddress = await escrow.getAddress();

    // 4. Mint tokens to the buyer for the test
    await testToken.mint(buyer.address, escrowAmount);

    return { escrow, testToken, buyer, seller, arbiter, escrowAmount, escrowAddress };
  }

  describe("Deployment", function () {
    it("Should set the right parties, token, and amount", async function () {
      const { escrow, buyer, seller, arbiter, testToken, escrowAmount } = await loadFixture(deployEscrowFixture);
      expect(await escrow.buyer()).to.equal(buyer.address);
      expect(await escrow.seller()).to.equal(seller.address);
      expect(await escrow.arbiter()).to.equal(arbiter.address);
      expect(await escrow.token()).to.equal(await testToken.getAddress());
      expect(await escrow.amount()).to.equal(escrowAmount);
    });
  });

  describe("Deposit", function () {
    it("Should accept deposit after buyer approves", async function () {
      const { escrow, testToken, buyer, escrowAmount, escrowAddress } = await loadFixture(deployEscrowFixture);

      // Buyer approves the escrow contract to spend tokens
      await testToken.connect(buyer).approve(escrowAddress, escrowAmount);

      // Buyer calls deposit
      await expect(escrow.connect(buyer).deposit())
        .to.emit(escrow, "Deposited")
        .withArgs(buyer.address, escrowAmount);

      // Check balances
      expect(await testToken.balanceOf(buyer.address)).to.equal(0);
      expect(await testToken.balanceOf(escrowAddress)).to.equal(escrowAmount);
      expect(await escrow.currentState()).to.equal(1); // AWAITING_DELIVERY
    });

    it("Should reject deposit if buyer has not approved", async function () {
      const { escrow, buyer } = await loadFixture(deployEscrowFixture);
      // Note: No approval is given
      await expect(escrow.connect(buyer).deposit()).to.be.revertedWith("ERC20: insufficient allowance");
    });
  });

  describe("Seller and Buyer Actions", function () {
    // Fixture for tests that require a deposit to have been made
    async function depositedFixture() {
      const data = await loadFixture(deployEscrowFixture);
      const { escrow, testToken, buyer, escrowAmount, escrowAddress } = data;
      await testToken.connect(buyer).approve(escrowAddress, escrowAmount);
      await escrow.connect(buyer).deposit();
      return data;
    }

    it("Seller can confirm delivery, allowing buyer to release", async function () {
      const { escrow, seller } = await loadFixture(depositedFixture);
      await expect(escrow.connect(seller).confirmDelivery())
        .to.emit(escrow, "ItemShipped")
        .withArgs(seller.address);
      expect(await escrow.currentState()).to.equal(3); // COMPLETE
    });

    it("Buyer can release funds after delivery is confirmed", async function () {
      const { escrow, buyer, seller, testToken, escrowAmount } = await loadFixture(depositedFixture);
      await escrow.connect(seller).confirmDelivery(); // Seller confirms

      await expect(escrow.connect(buyer).release())
        .to.emit(escrow, "Released")
        .withArgs(seller.address, escrowAmount);

      // Check final balances
      expect(await testToken.balanceOf(seller.address)).to.equal(escrowAmount);
    });
  });

  describe("Dispute and Resolution", function () {
    async function depositedFixture() {
      const data = await loadFixture(deployEscrowFixture);
      const { escrow, testToken, buyer, escrowAmount, escrowAddress } = data;
      await testToken.connect(buyer).approve(escrowAddress, escrowAmount);
      await escrow.connect(buyer).deposit();
      return data;
    }

    it("Buyer can raise a dispute", async function() {
      const { escrow, buyer } = await loadFixture(depositedFixture);
      await expect(escrow.connect(buyer).raiseDispute())
        .to.emit(escrow, "DisputeRaised")
        .withArgs(buyer.address);
      expect(await escrow.currentState()).to.equal(2); // DISPUTED
    });

    it("Arbiter can resolve dispute in favor of seller", async function() {
      const { escrow, arbiter, seller, testToken, escrowAmount } = await loadFixture(depositedFixture);
      await escrow.connect(buyer).raiseDispute();

      await expect(escrow.connect(arbiter).resolveDispute(seller.address))
        .to.emit(escrow, "DisputeResolved");

      expect(await testToken.balanceOf(seller.address)).to.equal(escrowAmount);
      expect(await escrow.currentState()).to.equal(5); // RESOLVED
    });

    it("Arbiter can refund the buyer", async function() {
      const { escrow, arbiter, buyer, testToken, escrowAmount } = await loadFixture(depositedFixture);

      await expect(escrow.connect(arbiter).refundBuyer())
        .to.emit(escrow, "Refunded");

      expect(await testToken.balanceOf(buyer.address)).to.equal(escrowAmount);
      expect(await escrow.currentState()).to.equal(4); // REFUNDED
    });
  });
});
