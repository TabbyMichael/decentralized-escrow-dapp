import { expect } from "chai";
import hre from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";

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
      expect(await escrow.getState()).to.equal(0); // 0: AWAITING_PAYMENT
    });
  });

  describe("Deposits", function () {
    it("Should accept deposit from buyer and change state", async function () {
      const { ethers } = hre;
      const { escrow, owner, depositAmount } = await loadFixture(deployEscrowFixture);
      const contractAddress = await escrow.getAddress();

      await escrow.connect(owner).deposit({ value: depositAmount });

      expect(await ethers.provider.getBalance(contractAddress)).to.equal(depositAmount);
      expect(await escrow.getState()).to.equal(1); // 1: AWAITING_DELIVERY
    });

    it("Should reject deposit if not in AWAITING_PAYMENT state", async function () {
      const { escrow, owner, depositAmount } = await loadFixture(deployEscrowFixture);

      await escrow.connect(owner).deposit({ value: depositAmount });

      await expect(
        escrow.connect(owner).deposit({ value: depositAmount })
      ).to.be.revertedWith("Invalid state");
    });

    it("Should reject deposit from non-buyer", async function () {
      const { escrow, otherAccount, depositAmount } = await loadFixture(deployEscrowFixture);

      await expect(
        escrow.connect(otherAccount).deposit({ value: depositAmount })
      ).to.be.revertedWith("Only buyer can call this function");
    });
  });

  describe("Release funds", function () {
    async function depositFixture() {
      const deployData = await deployEscrowFixture();
      const { escrow, owner, depositAmount } = deployData;

      await escrow.connect(owner).deposit({ value: depositAmount });

      return deployData;
    }

    it("Should allow buyer to release funds to seller", async function () {
      const { escrow, owner, seller, depositAmount } = await loadFixture(depositFixture);
      
      await expect(escrow.connect(owner).release()).to.changeEtherBalance(seller, depositAmount);
      expect(await escrow.getState()).to.equal(2); // 2: COMPLETE
    });

    it("Should allow arbiter to release funds to seller", async function () {
      const { escrow, arbiter, seller, depositAmount } = await loadFixture(depositFixture);
      
      await expect(escrow.connect(arbiter).release()).to.changeEtherBalance(seller, depositAmount);
      expect(await escrow.getState()).to.equal(2); // 2: COMPLETE
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

      await escrow.connect(owner).deposit({ value: depositAmount });

      return deployData;
    }

    it("Should allow buyer to get a refund", async function () {
      const { escrow, owner, depositAmount } = await loadFixture(depositFixture);
      
      await expect(escrow.connect(owner).refund()).to.changeEtherBalance(owner, depositAmount);
      expect(await escrow.getState()).to.equal(3); // 3: REFUNDED
    });

    it("Should allow arbiter to issue a refund", async function () {
      const { escrow, owner, arbiter, depositAmount } = await loadFixture(depositFixture);
      
      await expect(escrow.connect(arbiter).refund()).to.changeEtherBalance(owner, depositAmount);
      expect(await escrow.getState()).to.equal(3); // 3: REFUNDED
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

      await escrow.connect(owner).deposit({ value: depositAmount });

      return deployData;
    }

    it("Should allow arbiter to resolve dispute in favor of buyer", async function () {
      const { escrow, owner, arbiter, depositAmount } = await loadFixture(depositFixture);
      
      await expect(escrow.connect(arbiter).resolveDispute(owner.address)).to.changeEtherBalance(owner, depositAmount);
      expect(await escrow.getState()).to.equal(4); // 4: DISPUTED
    });

    it("Should allow arbiter to resolve dispute in favor of seller", async function () {
      const { escrow, seller, arbiter, depositAmount } = await loadFixture(depositFixture);
      
      await expect(escrow.connect(arbiter).resolveDispute(seller.address)).to.changeEtherBalance(seller, depositAmount);
      expect(await escrow.getState()).to.equal(4); // 4: DISPUTED
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

  describe("Pausable", function () {
    async function depositFixture() {
      const deployData = await deployEscrowFixture();
      const { escrow, owner, depositAmount } = deployData;
      await escrow.connect(owner).deposit({ value: depositAmount });
      return deployData;
    }

    it("Should allow owner to pause and unpause", async function () {
      const { escrow, owner } = await loadFixture(deployEscrowFixture);
      await escrow.connect(owner).pause();
      expect(await escrow.paused()).to.be.true;

      await escrow.connect(owner).unpause();
      expect(await escrow.paused()).to.be.false;
    });

    it("Should prevent non-owner from pausing", async function () {
      const { escrow, otherAccount } = await loadFixture(deployEscrowFixture);
      await expect(escrow.connect(otherAccount).pause())
        .to.be.revertedWithCustomError(escrow, "OwnableUnauthorizedAccount")
        .withArgs(otherAccount.address);
    });

    it("Should prevent deposits when paused", async function () {
      const { escrow, owner, depositAmount } = await loadFixture(deployEscrowFixture);
      await escrow.connect(owner).pause();
      await expect(
        escrow.connect(owner).deposit({ value: depositAmount })
      ).to.be.revertedWithCustomError(escrow, "EnforcedPause");
    });

    it("Should prevent release when paused", async function () {
      const { escrow, owner } = await loadFixture(depositFixture);
      await escrow.connect(owner).pause();
      await expect(escrow.connect(owner).release())
        .to.be.revertedWithCustomError(escrow, "EnforcedPause");
    });
  });

  describe("Timeout", function () {
    async function depositFixture() {
      const deployData = await deployEscrowFixture();
      const { escrow, owner, depositAmount } = deployData;
      await escrow.connect(owner).deposit({ value: depositAmount });
      return deployData;
    }

    it("Should set the deadline upon deposit", async function () {
      const { escrow } = await loadFixture(depositFixture);
      const latestTime = await time.latest();
      const deadline = await escrow.deadline();
      expect(deadline).to.equal(BigInt(latestTime) + BigInt(30 * 24 * 60 * 60));
    });

    it("Should prevent refund before deadline", async function () {
      const { escrow, owner } = await loadFixture(depositFixture);
      await expect(escrow.connect(owner).claimRefundAfterDeadline())
        .to.be.revertedWith("Deadline not passed yet");
    });

    it("Should allow refund after deadline", async function () {
      const { escrow, owner, depositAmount } = await loadFixture(depositFixture);
      const deadline = await escrow.deadline();
      await time.increaseTo(deadline);

      await expect(escrow.connect(owner).claimRefundAfterDeadline())
        .to.changeEtherBalance(owner, depositAmount);
      expect(await escrow.getState()).to.equal(3); // 3: REFUNDED
    });

    it("Should prevent non-buyer from claiming refund", async function () {
        const { escrow, otherAccount } = await loadFixture(depositFixture);
        const deadline = await escrow.deadline();
        await time.increaseTo(deadline);

        await expect(escrow.connect(otherAccount).claimRefundAfterDeadline())
          .to.be.revertedWith("Only buyer can call this function");
      });
  });
});
