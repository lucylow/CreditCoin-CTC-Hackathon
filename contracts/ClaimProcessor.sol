// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./PolicyRegistry.sol";

/// @title ClaimProcessor — Health insurance claims payout on Creditcoin EVM
/// @notice Handles claim submission, attestation (oracle), and USDC payout
contract ClaimProcessor is AccessControl, ReentrancyGuard {
    bytes32 public constant ATTESTOR_ROLE = keccak256("ATTESTOR_ROLE");

    IERC20 public usdc;
    PolicyRegistry public registry;

    struct Claim {
        uint256 policyId;
        address claimant;
        uint256 amountRequested;
        uint256 amountApproved;
        bytes32 evidenceHash;      // hash of supporting documents (IPFS CID)
        uint256 submissionTime;
        bool attested;
        bool paid;
    }

    mapping(uint256 => Claim) public claims;
    uint256 public claimCounter;

    event ClaimSubmitted(uint256 indexed claimId, uint256 indexed policyId, address claimant, uint256 amount);
    event ClaimAttested(uint256 indexed claimId, bool approved, uint256 approvedAmount);
    event ClaimPaid(uint256 indexed claimId, address claimant, uint256 amount);

    constructor(address _usdc, address _registry) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        usdc = IERC20(_usdc);
        registry = PolicyRegistry(_registry);
    }

    /// @dev Submit a claim. Called by policy holder.
    function submitClaim(
        uint256 policyId,
        uint256 amountRequested,
        bytes32 evidenceHash
    ) external nonReentrant {
        require(registry.isPolicyActive(policyId), "Policy not active");
        require(registry.policies(policyId).holder == msg.sender, "Not policy holder");

        claimCounter++;
        claims[claimCounter] = Claim({
            policyId: policyId,
            claimant: msg.sender,
            amountRequested: amountRequested,
            amountApproved: 0,
            evidenceHash: evidenceHash,
            submissionTime: block.timestamp,
            attested: false,
            paid: false
        });
        emit ClaimSubmitted(claimCounter, policyId, msg.sender, amountRequested);
    }

    /// @dev Attestor (backend) verifies the claim and sets approved amount.
    function attestClaim(
        uint256 claimId,
        bool approved,
        uint256 approvedAmount
    ) external onlyRole(ATTESTOR_ROLE) {
        Claim storage c = claims[claimId];
        require(!c.attested, "Already attested");
        require(!c.paid, "Already paid");

        c.attested = true;
        if (approved) {
            c.amountApproved = approvedAmount;
        }
        emit ClaimAttested(claimId, approved, approvedAmount);
    }

    /// @dev Trigger payout after attestation (anyone can call, funds go to claimant).
    function executePayout(uint256 claimId) external nonReentrant {
        Claim storage c = claims[claimId];
        require(c.attested, "Not attested");
        require(!c.paid, "Already paid");
        require(c.amountApproved > 0, "Amount zero");

        c.paid = true;
        require(usdc.transfer(c.claimant, c.amountApproved), "USDC transfer failed");
        emit ClaimPaid(claimId, c.claimant, c.amountApproved);
    }

    /// @dev Admin can withdraw any stuck tokens.
    function withdrawToken(address token, uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) {
        IERC20(token).transfer(msg.sender, amount);
    }
}
