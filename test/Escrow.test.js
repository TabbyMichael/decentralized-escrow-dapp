import { expect } from "chai";
import hre from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

describe("Escrow Contract", function () {
  async function deployEscrowFixture() {
    const { ethers } = hre;
    const depositAmount = ethers.parseEther("1.0"); // 1 ETH
    const [owner, buyer, seller, arbiter, otherAccount] = await ethers.getSigners();
    
    const Escrow = await hre.ethers.getContractFactory("Escrow");
    // Deploy with explicit buyer, seller, and arbiter for isolated testing
    const escrow = await Escrow.deploy(buyer.address, seller.address, arbiter.address);

    return { escrow, owner, buyer, seller, arbiter, otherAccount, depositAmount };
  }

  describe("Deployment", function () {
    it("Should set the right buyer, seller, and arbiter", async function () {
      const { escrow, buyer, seller, arbiter } = await loadFixture(deployEscrowFixture);
      expect(await escrow.buyer()).to.equal(buyer.address);
      expect(await escrow.seller()).to.equal(seller.address);
      expect(await escrow.arbiter()).to.equal(arbiter.address);
    });

    it("Should set the initial state to AWAITING_PAYMENT", async function () {
      const { escrow } = await loadFixture(deployEscrowFixture);
      expect(await escrow.getState()).to.equal("AWAITING_PAYMENT");
    });
  });

  describe("Deposits", function () {
    it("Should accept deposit from buyer and change state to AWAITING_DELIVERY", async function () {
      const { ethers } = hre;
      const { escrow, buyer, depositAmount } = await loadFixture(deployEscrowFixture);
      const contractAddress = await escrow.getAddress();

      await buyer.sendTransaction({ to: contractAddress, value: depositAmount });

      expect(await ethers.provider.getBalance(contractAddress)).to.equal(depositAmount);
      expect(await escrow.getState()).to.equal("AWAITING_DELIVERY");
    });

    it("Should reject deposit from non-buyer", async function () {
      const { escrow, otherAccount, depositAmount } = await loadFixture(deployEscrowFixture);
      const contractAddress = await escrow.getAddress();

      await expect(
        otherAccount.sendTransaction({ to: contractAddress, value: depositAmount })
      ).to.be.revertedWith("Only buyer can call this function");
    });
  });

  describe("Seller Actions", function () {
    async function depositFixture() {
        const deployData = await deployEscrowFixture();
        const { escrow, buyer, depositAmount } = deployData;
        const contractAddress = await escrow.getAddress();
        await buyer.sendTransaction({ to: contractAddress, value: depositAmount });
        return deployData;
    }

    describe("confirmShipment", function() {
        it("Should allow seller to confirm shipment and change state to SHIPPED", async function () {
            const { escrow, seller } = await loadFixture(depositFixture);
            await expect(escrow.connect(seller).confirmShipment())
                .to.emit(escrow, "ItemShipped")
                .withArgs(seller.address);
            expect(await escrow.getState()).to.equal("SHIPPED");
        });

        it("Should prevent non-seller from confirming shipment", async function () {
            const { escrow, buyer, otherAccount } = await loadFixture(depositFixture);
            await expect(escrow.connect(buyer).confirmShipment()).to.be.revertedWith("Only seller can call this function");
            await expect(escrow.connect(otherAccount).confirmShipment()).to.be.revertedWith("Only seller can call this function");
        });

        it("Should prevent confirming shipment if not in AWAITING_DELIVERY state", async function () {
            const { escrow, seller } = await loadFixture(deployEscrowFixture); // No deposit
            await expect(escrow.connect(seller).confirmShipment()).to.be.revertedWith("Invalid state");
        });
    });
  });

  describe("Buyer Actions", function () {
    async function shippedFixture() {
        const deployData = await deployEscrowFixture();
        const { escrow, buyer, seller, depositAmount } = deployData;
        const contractAddress = await escrow.getAddress();
        await buyer.sendTransaction({ to: contractAddress, value: depositAmount });
        await escrow.connect(seller).confirmShipment();
        return deployData;
    }

    describe("release", function() {
        it("Should allow buyer to release funds to seller after shipment", async function () {
            const { escrow, buyer, seller, depositAmount } = await loadFixture(shippedFixture);
            await expect(escrow.connect(buyer).release()).to.changeEtherBalance(seller, depositAmount);
            expect(await escrow.getState()).to.equal("COMPLETE");
        });

        it("Should prevent buyer from releasing funds before shipment", async function () {
            const { escrow, buyer } = await loadFixture(deployEscrowFixture);
            await buyer.sendTransaction({ to: await escrow.getAddress(), value: ethers.parseEther("1.0") });
            await expect(escrow.connect(buyer).release()).to.be.revertedWith("Invalid state");
        });

        it("Should prevent non-buyer from releasing funds", async function () {
            const { escrow, seller, otherAccount } = await loadFixture(shippedFixture);
            await expect(escrow.connect(seller).release()).to.be.revertedWith("Only buyer can call this function");
            await expect(escrow.connect(otherAccount).release()).to.be.revertedWith("Only buyer can call this function");
        });
    });
  });

  describe("Dispute and Resolution", function () {
    async function depositFixture() {
        const deployData = await deployEscrowFixture();
        const { escrow, buyer, depositAmount } = deployData;
        const contractAddress = await escrow.getAddress();
        await buyer.sendTransaction({ to: contractAddress, value: depositAmount });
        return deployData;
    }

    describe("raiseDispute", function() {
        it("Should allow buyer to raise a dispute", async function() {
            const { escrow, buyer } = await loadFixture(depositFixture);
            await expect(escrow.connect(buyer).raiseDispute())
                .to.emit(escrow, "DisputeRaised").withArgs(buyer.address);
            expect(await escrow.getState()).to.equal("DISPUTED");
        });

        it("Should allow seller to raise a dispute", async function() {
            const { escrow, seller } = await loadFixture(depositFixture);
            await expect(escrow.connect(seller).raiseDispute())
                .to.emit(escrow, "DisputeRaised").withArgs(seller.address);
            expect(await escrow.getState()).to.equal("DISPUTED");
        });

        it("Should prevent non-participant from raising a dispute", async function() {
            const { escrow, otherAccount } = await loadFixture(depositFixture);
            await expect(escrow.connect(otherAccount).raiseDispute()).to.be.revertedWith("Only buyer or seller can raise a dispute");
        });
    });

    describe("refund (by Arbiter)", function() {
        it("Should allow arbiter to refund buyer if item not shipped", async function() {
            const { escrow, buyer, arbiter, depositAmount } = await loadFixture(depositFixture);
            await expect(escrow.connect(arbiter).refund()).to.changeEtherBalance(buyer, depositAmount);
            expect(await escrow.getState()).to.equal("REFUNDED");
        });

        it("Should prevent non-arbiter from refunding", async function() {
            const { escrow, buyer, seller } = await loadFixture(depositFixture);
            await expect(escrow.connect(buyer).refund()).to.be.revertedWith("Only arbiter can call this function");
            await expect(escrow.connect(seller).refund()).to.be.revertedWith("Only arbiter can call this function");
        });
    });

    describe("resolveDispute (by Arbiter)", function() {
        async function disputedFixture() {
            const deployData = await depositFixture();
            const { escrow, buyer } = deployData;
            await escrow.connect(buyer).raiseDispute();
            return deployData;
        }

        it("Should allow arbiter to resolve dispute in favor of buyer", async function() {
            const { escrow, buyer, arbiter, depositAmount } = await loadFixture(disputedFixture);
            await expect(escrow.connect(arbiter).resolveDispute(buyer.address)).to.changeEtherBalance(buyer, depositAmount);
            expect(await escrow.getState()).to.equal("RESOLVED");
        });

        it("Should allow arbiter to resolve dispute in favor of seller", async function() {
            const { escrow, seller, arbiter, depositAmount } = await loadFixture(disputedFixture);
            await expect(escrow.connect(arbiter).resolveDispute(seller.address)).to.changeEtherBalance(seller, depositAmount);
            expect(await escrow.getState()).to.equal("RESOLVED");
        });

        it("Should prevent resolving dispute if not in DISPUTED state", async function() {
            const { escrow, buyer, arbiter } = await loadFixture(depositFixture);
            await expect(escrow.connect(arbiter).resolveDispute(buyer.address)).to.be.revertedWith("Invalid state");
        });

        it("Should prevent non-arbiter from resolving dispute", async function() {
            const { escrow, buyer, seller } = await loadFixture(disputedFixture);
            await expect(escrow.connect(buyer).resolveDispute(buyer.address)).to.be.revertedWith("Only arbiter can call this function");
            await expect(escrow.connect(seller).resolveDispute(seller.address)).to.be.revertedWith("Only arbiter can call this function");
        });

        it("Should prevent resolving dispute with an invalid winner", async function() {
            const { escrow, arbiter, otherAccount } = await loadFixture(disputedFixture);
            await expect(escrow.connect(arbiter).resolveDispute(otherAccount.address)).to.be.revertedWith("Winner must be either buyer or seller");
        });
    });
  });
});
