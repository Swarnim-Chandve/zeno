const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Arithmetic Operations Test Suite", function () {
  let duelEscrow;
  let mockToken;
  let owner, player1, player2;

  beforeEach(async function () {
    [owner, player1, player2] = await ethers.getSigners();

    // Deploy MockERC20
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    mockToken = await MockERC20.deploy("Math Duel Token", "MDT", 6);
    await mockToken.waitForDeployment();

    // Deploy DuelEscrow
    const DuelEscrow = await ethers.getContractFactory("DuelEscrow");
    duelEscrow = await DuelEscrow.deploy(await mockToken.getAddress());
    await duelEscrow.waitForDeployment();

    // Mint tokens to players
    await mockToken.mint(player1.address, ethers.parseUnits("100", 6));
    await mockToken.mint(player2.address, ethers.parseUnits("100", 6));

    // Approve tokens
    await mockToken.connect(player1).approve(await duelEscrow.getAddress(), ethers.parseUnits("10", 6));
    await mockToken.connect(player2).approve(await duelEscrow.getAddress(), ethers.parseUnits("10", 6));
  });

  describe("Addition Operations", function () {
    it("Should validate correct addition", async function () {
      const result = await duelEscrow.validateAnswer(0, 5, 3, 8); // 5 + 3 = 8
      expect(result).to.be.true;
    });

    it("Should reject incorrect addition", async function () {
      const result = await duelEscrow.validateAnswer(0, 5, 3, 7); // 5 + 3 ≠ 7
      expect(result).to.be.false;
    });

    it("Should handle large numbers", async function () {
      const result = await duelEscrow.validateAnswer(0, 1000, 2000, 3000);
      expect(result).to.be.true;
    });

    it("Should handle zero addition", async function () {
      const result = await duelEscrow.validateAnswer(0, 5, 0, 5);
      expect(result).to.be.true;
    });
  });

  describe("Subtraction Operations", function () {
    it("Should validate correct subtraction", async function () {
      const result = await duelEscrow.validateAnswer(1, 10, 3, 7); // 10 - 3 = 7
      expect(result).to.be.true;
    });

    it("Should reject incorrect subtraction", async function () {
      const result = await duelEscrow.validateAnswer(1, 10, 3, 6); // 10 - 3 ≠ 6
      expect(result).to.be.false;
    });

    it("Should handle zero subtraction", async function () {
      const result = await duelEscrow.validateAnswer(1, 5, 0, 5);
      expect(result).to.be.true;
    });

    it("Should handle equal numbers", async function () {
      const result = await duelEscrow.validateAnswer(1, 5, 5, 0);
      expect(result).to.be.true;
    });
  });

  describe("Multiplication Operations", function () {
    it("Should validate correct multiplication", async function () {
      const result = await duelEscrow.validateAnswer(2, 4, 5, 20); // 4 * 5 = 20
      expect(result).to.be.true;
    });

    it("Should reject incorrect multiplication", async function () {
      const result = await duelEscrow.validateAnswer(2, 4, 5, 21); // 4 * 5 ≠ 21
      expect(result).to.be.false;
    });

    it("Should handle zero multiplication", async function () {
      const result = await duelEscrow.validateAnswer(2, 5, 0, 0);
      expect(result).to.be.true;
    });

    it("Should handle one multiplication", async function () {
      const result = await duelEscrow.validateAnswer(2, 5, 1, 5);
      expect(result).to.be.true;
    });
  });

  describe("Division Operations", function () {
    it("Should validate correct division", async function () {
      const result = await duelEscrow.validateAnswer(3, 20, 4, 5); // 20 / 4 = 5
      expect(result).to.be.true;
    });

    it("Should reject incorrect division", async function () {
      const result = await duelEscrow.validateAnswer(3, 20, 4, 4); // 20 / 4 ≠ 4
      expect(result).to.be.false;
    });

    it("Should reject division with remainder", async function () {
      const result = await duelEscrow.validateAnswer(3, 21, 4, 5); // 21 / 4 = 5.25 (not exact)
      expect(result).to.be.false;
    });

    it("Should handle division by one", async function () {
      const result = await duelEscrow.validateAnswer(3, 5, 1, 5);
      expect(result).to.be.true;
    });

    it("Should reject division by zero", async function () {
      await expect(
        duelEscrow.validateAnswer(3, 10, 0, 5)
      ).to.be.revertedWith("Division by zero");
    });
  });

  describe("Question Hash Generation", function () {
    it("Should generate consistent hashes for same inputs", async function () {
      const hash1 = await duelEscrow.generateQuestionHash(0, 5, 3);
      const hash2 = await duelEscrow.generateQuestionHash(0, 5, 3);
      expect(hash1).to.equal(hash2);
    });

    it("Should generate different hashes for different inputs", async function () {
      const hash1 = await duelEscrow.generateQuestionHash(0, 5, 3);
      const hash2 = await duelEscrow.validateAnswer(0, 5, 4, 9);
      expect(hash1).to.not.equal(hash2);
    });
  });

  describe("End-to-End Game Flow", function () {
    it("Should complete a full game with arithmetic operations", async function () {
      // Create duel
      await duelEscrow.connect(player1).createDuel(ethers.parseUnits("1", 6));
      const duelId = 1;

      // Join duel
      await duelEscrow.connect(player2).joinDuel(duelId);

      // Submit answers for different operations
      await duelEscrow.connect(player1).submitAnswer(duelId, 0, 8); // Assuming first question is 5 + 3
      await duelEscrow.connect(player2).submitAnswer(duelId, 0, 8);

      // Check scores
      const player1Score = await duelEscrow.getPlayerScore(duelId, player1.address);
      const player2Score = await duelEscrow.getPlayerScore(duelId, player2.address);

      expect(player1Score).to.be.greaterThan(0);
      expect(player2Score).to.be.greaterThan(0);
    });
  });

  describe("Edge Cases and Error Handling", function () {
    it("Should handle invalid operation codes", async function () {
      const result = await duelEscrow.validateAnswer(99, 5, 3, 8);
      expect(result).to.be.false;
    });

    it("Should handle maximum uint256 values", async function () {
      const maxUint = ethers.MaxUint256;
      const result = await duelEscrow.validateAnswer(0, maxUint, 0, maxUint);
      expect(result).to.be.true;
    });

    it("Should handle minimum values", async function () {
      const result = await duelEscrow.validateAnswer(0, 0, 0, 0);
      expect(result).to.be.true;
    });
  });

  describe("Gas Optimization", function () {
    it("Should use reasonable gas for validation", async function () {
      const tx = await duelEscrow.validateAnswer(0, 5, 3, 8);
      const receipt = await tx.wait();
      expect(receipt.gasUsed).to.be.lessThan(50000); // Should use less than 50k gas
    });

    it("Should batch multiple validations efficiently", async function () {
      const operations = [0, 1, 2, 3]; // +, -, *, /
      const num1s = [5, 10, 4, 20];
      const num2s = [3, 3, 5, 4];
      const answers = [8, 7, 20, 5];

      for (let i = 0; i < operations.length; i++) {
        const result = await duelEscrow.validateAnswer(operations[i], num1s[i], num2s[i], answers[i]);
        expect(result).to.be.true;
      }
    });
  });
});
