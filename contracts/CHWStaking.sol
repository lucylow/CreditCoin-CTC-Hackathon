// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/// @title CHWStaking — Staking PEDISC for governance and rewards on Creditcoin EVM
/// @notice Lock PEDISC to earn voting power; optional STAKING_MANAGER for future fee shares. Gas: CTC.
contract CHWStaking is AccessControl {
    bytes32 public constant STAKING_MANAGER = keccak256("STAKING_MANAGER");

    IERC20 public pedisc;

    struct Stake {
        uint256 amount;
        uint256 startTime;
        uint256 lockEnd;
    }

    mapping(address => Stake) public stakes;

    event Staked(address indexed user, uint256 amount, uint256 lockEnd);
    event Unstaked(address indexed user, uint256 amount);

    constructor(address _pedisc) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        pedisc = IERC20(_pedisc);
    }

    function stake(uint256 amount, uint256 lockDays) external {
        require(amount > 0, "Amount must be >0");
        require(pedisc.transferFrom(msg.sender, address(this), amount), "Transfer failed");

        stakes[msg.sender] = Stake({
            amount: amount,
            startTime: block.timestamp,
            lockEnd: block.timestamp + lockDays * 1 days
        });

        emit Staked(msg.sender, amount, block.timestamp + lockDays * 1 days);
    }

    function unstake() external {
        Stake memory s = stakes[msg.sender];
        require(s.amount > 0, "No stake");
        require(block.timestamp >= s.lockEnd, "Locked");

        delete stakes[msg.sender];
        pedisc.transfer(msg.sender, s.amount);

        emit Unstaked(msg.sender, s.amount);
    }

    function getVotingPower(address user) external view returns (uint256) {
        Stake memory s = stakes[user];
        return s.amount;
    }
}
