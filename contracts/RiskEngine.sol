// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "./PediScreenNFT.sol";

/// @title RiskEngine — Creditcoin USC oracle verification for PediScreen AI
/// @notice Attestor (backend) submits attestations after verifying MedGemma inference
contract RiskEngine is AccessControl {
    bytes32 public constant ATTESTOR_ROLE = keccak256("ATTESTOR_ROLE");

    PediScreenNFT public nft;

    struct Attestation {
        uint256 tokenId;
        bool isValid;
        uint256 timestamp;
        bytes32 proofHash;
    }

    mapping(uint256 => Attestation) public attestations;

    event AttestationSubmitted(uint256 indexed tokenId, bool isValid, bytes32 proofHash);

    constructor(address _nft) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        nft = PediScreenNFT(_nft);
    }

    /// @dev Called by an authorized attester (backend) after verifying the AI report
    function submitAttestation(
        uint256 tokenId,
        bool isValid,
        bytes32 proofHash
    ) external onlyRole(ATTESTOR_ROLE) {
        attestations[tokenId] = Attestation({
            tokenId: tokenId,
            isValid: isValid,
            timestamp: block.timestamp,
            proofHash: proofHash
        });

        nft.setVerified(tokenId, isValid);

        emit AttestationSubmitted(tokenId, isValid, proofHash);
    }
}
