// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title PediScreenDAOTreasury — DAO-controlled treasury for CHW screening rewards on Creditcoin EVM
/// @notice Holds USDC/CTC; DAO can pay clinicians and update reward amount. Gas: CTC.
contract PediScreenDAOTreasury is AccessControl, ReentrancyGuard {
    bytes32 public constant DAO_ROLE = keccak256("DAO_ROLE");
    bytes32 public constant CLINICIAN_ROLE = keccak256("CLINICIAN_ROLE");

    IERC20 public immutable paymentToken; // USDC or CTC
    uint256 public screeningReward = 5 * 10**6; // 5 USDC (6 decimals)

    mapping(uint256 => address) public screeningClinician;

    event RewardPaid(address indexed clinician, uint256 amount, uint256 screeningId);

    constructor(address _paymentToken) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        paymentToken = IERC20(_paymentToken);
    }

    /// @dev Called by DAO (or authorized contract) to pay a CHW for a screening
    function payClinician(uint256 screeningId, address clinician) external onlyRole(DAO_ROLE) nonReentrant {
        uint256 amount = screeningReward;
        require(paymentToken.transfer(clinician, amount), "Transfer failed");
        screeningClinician[screeningId] = clinician;
        emit RewardPaid(clinician, amount, screeningId);
    }

    /// @dev DAO can update reward amount
    function setScreeningReward(uint256 newReward) external onlyRole(DAO_ROLE) {
        screeningReward = newReward;
    }

    /// @dev Admin can top up treasury
    function deposit(uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) {
        paymentToken.transferFrom(msg.sender, address(this), amount);
    }
}
