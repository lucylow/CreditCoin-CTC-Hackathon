// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

/// @title PolicyRegistry — Insurance policies on Creditcoin EVM
/// @notice Stores policies (coverage, premium, expiry, screening hash) for claim processor
contract PolicyRegistry is AccessControl {
    bytes32 public constant UNDERWRITER_ROLE = keccak256("UNDERWRITER_ROLE");

    struct Policy {
        address holder;
        uint256 coverageAmount;   // in USDC (6 decimals)
        uint256 premiumPaid;
        uint256 expiry;
        bool active;
        bytes32 screeningHash;    // hash of the screening that qualified for this policy
    }

    mapping(uint256 => Policy) public policies;
    uint256 public policyCounter;

    event PolicyIssued(uint256 indexed policyId, address indexed holder, uint256 coverage, uint256 expiry);
    event PolicyCancelled(uint256 indexed policyId);

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    /// @dev Issue a new policy. Called by underwriter (backend) after payment.
    function issuePolicy(
        address holder,
        uint256 coverageAmount,
        uint256 premiumPaid,
        uint256 expiry,
        bytes32 screeningHash
    ) external onlyRole(UNDERWRITER_ROLE) returns (uint256) {
        policyCounter++;
        policies[policyCounter] = Policy({
            holder: holder,
            coverageAmount: coverageAmount,
            premiumPaid: premiumPaid,
            expiry: expiry,
            active: true,
            screeningHash: screeningHash
        });
        emit PolicyIssued(policyCounter, holder, coverageAmount, expiry);
        return policyCounter;
    }

    /// @dev Cancel a policy (e.g., non-payment). Only underwriter.
    function cancelPolicy(uint256 policyId) external onlyRole(UNDERWRITER_ROLE) {
        require(policies[policyId].active, "Not active");
        policies[policyId].active = false;
        emit PolicyCancelled(policyId);
    }

    /// @dev Check if a policy is active and not expired.
    function isPolicyActive(uint256 policyId) external view returns (bool) {
        Policy memory p = policies[policyId];
        return p.active && block.timestamp <= p.expiry;
    }
}
