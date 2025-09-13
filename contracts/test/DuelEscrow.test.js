const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DuelEscrow", function () {
  let duelEscrow;
  let stakeToken;
  let owner;
  let playerA;
  let playerB;
  let stakeAmount;

  beforeEach(async function () {
    [owner, playerA, playerB] = await ethers.getSigners();
    
    // Deploy mock ERC20 token
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    stakeToken = await MockERC20.deploy("USDC.e", "USDC.e", 6);
    await stakeToken.waitForDeployment();
    
    // Deploy DuelEscrow
    const DuelEscrow = await ethers.getContractFactory("DuelEscrow");
    duelEscrow = await DuelEscrow.deploy(await stakeToken.getAddress());
    await duelEscrow.waitForDeployment();
    
    stakeAmount = ethers.parseUnits("1", 6); // 1 USDC.e
    
    // Mint tokens to players
    await stakeToken.mint(playerA.address, ethers.parseUnits("100", 6));
    await stakeToken.mint(playerB.address, ethers.parseUnits("100", 6));
    
    // Approve spending
    await stakeToken.connect(playerA).approve(await duelEscrow.getAddress(), ethers.parseUnits("100", 6));
    await stakeToken.connect(playerB).approve(await duelEscrow.getAddress(), ethers.parseUnits("100", 6));
  });

  describe("Deployment", function () {
    it("Should set the correct stake token", async function () {
      expect(await duelEscrow.stakeToken()).to.equal(await stakeToken.getAddress());
    });

    it("Should set the correct minimum stake", async function () {
      expect(await duelEscrow.MINIMUM_STAKE()).to.equal(ethers.parseUnits("1", 6));
    });
  });

  describe("createDuel", function () {
    it("Should create a duel successfully", async function () {
      await expect(duelEscrow.connect(playerA).createDuel(stakeAmount))
        .to.emit(duelEscrow, "DuelCreated")
        .withArgs(1, playerA.address, stakeAmount);
      
      const duel = await duelEscrow.getDuel(1);
      expect(duel.playerA).to.equal(playerA.address);
      expect(duel.playerB).to.equal(ethers.ZeroAddress);
      expect(duel.stakeAmount).to.equal(stakeAmount);
      expect(duel.isActive).to.be.true;
      expect(duel.isCompleted).to.be.false;
    });

    it("Should fail with insufficient balance", async function () {
      await expect(duelEscrow.connect(playerA).createDuel(ethers.parseUnits("1000", 6)))
        .to.be.revertedWith("Insufficient balance");
    });

    it("Should fail with stake too low", async function () {
      await expect(duelEscrow.connect(playerA).createDuel(ethers.parseUnits("0.5", 6)))
        .to.be.revertedWith("Stake too low");
    });
  });

  describe("joinDuel", function () {
    beforeEach(async function () {
      await duelEscrow.connect(playerA).createDuel(stakeAmount);
    });

    it("Should join a duel successfully", async function () {
      await expect(duelEscrow.connect(playerB).joinDuel(1))
        .to.emit(duelEscrow, "DuelJoined")
        .withArgs(1, playerB.address);
      
      const duel = await duelEscrow.getDuel(1);
      expect(duel.playerB).to.equal(playerB.address);
    });

    it("Should fail if duel not active", async function () {
      await duelEscrow.connect(playerB).joinDuel(1);
      await expect(duelEscrow.connect(playerA).joinDuel(1))
        .to.be.revertedWith("Duel already joined");
    });

    it("Should fail if already joined", async function () {
      await duelEscrow.connect(playerB).joinDuel(1);
      await expect(duelEscrow.connect(playerA).joinDuel(1))
        .to.be.revertedWith("Duel already joined");
    });
  });

  describe("finalizeDuel", function () {
    beforeEach(async function () {
      await duelEscrow.connect(playerA).createDuel(stakeAmount);
      await duelEscrow.connect(playerB).joinDuel(1);
    });

    it("Should finalize duel and pay winner", async function () {
      const initialBalance = await stakeToken.balanceOf(playerA.address);
      
      await expect(duelEscrow.finalizeDuel(1, playerA.address))
        .to.emit(duelEscrow, "DuelFinalized")
        .withArgs(1, playerA.address, stakeAmount * 2n);
      
      const finalBalance = await stakeToken.balanceOf(playerA.address);
      expect(finalBalance).to.equal(initialBalance + stakeAmount * 2n);
      
      const duel = await duelEscrow.getDuel(1);
      expect(duel.isActive).to.be.false;
      expect(duel.isCompleted).to.be.true;
    });

    it("Should fail if not owner", async function () {
      await expect(duelEscrow.connect(playerA).finalizeDuel(1, playerA.address))
        .to.be.revertedWithCustomError(duelEscrow, "OwnableUnauthorizedAccount");
    });

    it("Should fail if invalid winner", async function () {
      await expect(duelEscrow.finalizeDuel(1, owner.address))
        .to.be.revertedWith("Invalid winner");
    });
  });
});
