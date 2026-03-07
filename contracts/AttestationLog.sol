// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title AttestationLog — Dedicated log for Creditcoin Attestor verifications (USC)
/// @notice Optional separate log for all attestations (in addition to per-NFT attestation on PediScreenRWA)
contract AttestationLog {
    struct Attestation {
        address attester;
        uint256 timestamp;
        bytes32 dataHash;
        bool valid;
        string description;
    }

    Attestation[] public attestations;

    event AttestationRecorded(uint256 indexed id, address indexed attester, bytes32 dataHash, bool valid);

    function recordAttestation(bytes32 dataHash, bool valid, string calldata description) external {
        attestations.push(Attestation({
            attester: msg.sender,
            timestamp: block.timestamp,
            dataHash: dataHash,
            valid: valid,
            description: description
        }));
        emit AttestationRecorded(attestations.length - 1, msg.sender, dataHash, valid);
    }

    function getAttestation(uint256 id) external view returns (Attestation memory) {
        return attestations[id];
    }
}
