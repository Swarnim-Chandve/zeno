// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract AVAXDuelEscrow is Ownable, ReentrancyGuard {
    struct Duel {
        address playerA;
        address playerB;
        uint256 stakeAmount;
        bool isActive;
        bool isCompleted;
        uint256 startTime;
    }

    mapping(uint256 => Duel) public duels;
    uint256 public nextDuelId = 1;
    
    uint256 public constant MINIMUM_STAKE = 0.01 ether; // 0.01 AVAX minimum stake
    
    event DuelCreated(uint256 indexed duelId, address indexed playerA, uint256 stakeAmount);
    event DuelJoined(uint256 indexed duelId, address indexed playerB);
    event DuelFinalized(uint256 indexed duelId, address indexed winner, uint256 payout);

    constructor() Ownable(msg.sender) {}

    function createDuel() external payable nonReentrant {
        require(msg.value >= MINIMUM_STAKE, "Stake too low");
        
        uint256 duelId = nextDuelId++;
        duels[duelId] = Duel({
            playerA: msg.sender,
            playerB: address(0),
            stakeAmount: msg.value,
            isActive: true,
            isCompleted: false,
            startTime: block.timestamp
        });
        
        emit DuelCreated(duelId, msg.sender, msg.value);
    }

    function joinDuel(uint256 duelId) external payable nonReentrant {
        Duel storage duel = duels[duelId];
        require(duel.isActive, "Duel not active");
        require(duel.playerB == address(0), "Duel already joined");
        require(msg.sender != duel.playerA, "Cannot join own duel");
        require(msg.value == duel.stakeAmount, "Stake amount mismatch");
        
        duel.playerB = msg.sender;
        
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
        
        // Transfer all stakes to winner
        (bool success, ) = winner.call{value: totalStake}("");
        require(success, "Payout failed");
        
        emit DuelFinalized(duelId, winner, totalStake);
    }

    function getDuel(uint256 duelId) external view returns (Duel memory) {
        return duels[duelId];
    }

    function getDuelCount() external view returns (uint256) {
        return nextDuelId - 1;
    }

    // Emergency function to withdraw stuck funds (only owner)
    function emergencyWithdraw() external onlyOwner {
        (bool success, ) = owner().call{value: address(this).balance}("");
        require(success, "Withdrawal failed");
    }

    // Function to receive AVAX
    receive() external payable {}
}
