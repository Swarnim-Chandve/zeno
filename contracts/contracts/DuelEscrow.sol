// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract DuelEscrow is Ownable, ReentrancyGuard {
    struct Duel {
        address playerA;
        address playerB;
        uint256 stakeAmount;
        bool isActive;
        bool isCompleted;
    }

    mapping(uint256 => Duel) public duels;
    mapping(address => uint256) public playerApprovals; // Track approved amounts per player
    uint256 public nextDuelId = 1;
    
    IERC20 public immutable stakeToken;
    uint256 public constant MINIMUM_STAKE = 1 * 10**6; // 1 USDC.e (6 decimals)
    
    event DuelCreated(uint256 indexed duelId, address indexed playerA, uint256 stakeAmount);
    event DuelJoined(uint256 indexed duelId, address indexed playerB);
    event DuelFinalized(uint256 indexed duelId, address indexed winner, uint256 payout);
    event ApprovalUpdated(address indexed player, uint256 newAmount);

    constructor(address _stakeToken) Ownable(msg.sender) {
        stakeToken = IERC20(_stakeToken);
    }

    function createDuel(uint256 stakeAmount) external nonReentrant {
        require(stakeAmount >= MINIMUM_STAKE, "Stake too low");
        require(stakeToken.balanceOf(msg.sender) >= stakeAmount, "Insufficient balance");
        
        uint256 duelId = nextDuelId++;
        duels[duelId] = Duel({
            playerA: msg.sender,
            playerB: address(0),
            stakeAmount: stakeAmount,
            isActive: true,
            isCompleted: false
        });

        // Transfer tokens to escrow
        require(stakeToken.transferFrom(msg.sender, address(this), stakeAmount), "Transfer failed");
        
        emit DuelCreated(duelId, msg.sender, stakeAmount);
    }

    function joinDuel(uint256 duelId) external nonReentrant {
        Duel storage duel = duels[duelId];
        require(duel.isActive, "Duel not active");
        require(duel.playerB == address(0), "Duel already joined");
        require(msg.sender != duel.playerA, "Cannot join own duel");
        require(stakeToken.balanceOf(msg.sender) >= duel.stakeAmount, "Insufficient balance");
        
        duel.playerB = msg.sender;
        
        // Transfer tokens to escrow
        require(stakeToken.transferFrom(msg.sender, address(this), duel.stakeAmount), "Transfer failed");
        
        emit DuelJoined(duelId, msg.sender);
    }

    function finalizeDuel(uint256 duelId, address winner) external onlyOwner nonReentrant {
        Duel storage duel = duels[duelId];
        require(duel.isActive, "Duel not active");
        require(duel.playerB != address(0), "Duel not joined");
        require(!duel.isCompleted, "Duel already completed");
        require(winner == duel.playerA || winner == duel.playerB, "Invalid winner");
        
        duel.isActive = false;
        duel.isCompleted = true;
        
        uint256 totalStake = duel.stakeAmount * 2;
        uint256 payout = totalStake;
        
        // Transfer all stakes to winner
        require(stakeToken.transfer(winner, payout), "Payout failed");
        
        emit DuelFinalized(duelId, winner, payout);
    }

    function approveStake(uint256 amount) external {
        require(amount >= MINIMUM_STAKE, "Amount too low");
        require(stakeToken.approve(address(this), amount), "Approval failed");
        playerApprovals[msg.sender] = amount;
        emit ApprovalUpdated(msg.sender, amount);
    }

    function getDuel(uint256 duelId) external view returns (Duel memory) {
        return duels[duelId];
    }

    function getDuelCount() external view returns (uint256) {
        return nextDuelId - 1;
    }

    // Emergency function to withdraw stuck funds (only owner)
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).transfer(owner(), amount);
    }
}
