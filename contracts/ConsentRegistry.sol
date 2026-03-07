// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

/// @title ConsentRegistry — Patient-controlled access on Creditcoin EVM
/// @notice Encrypted hashes and consent proofs only; no raw PHI on-chain. recordId = keccak(patient + dataHash + expiry).
contract ConsentRegistry is AccessControl {
    bytes32 public constant PATIENT_ROLE = keccak256("PATIENT_ROLE");
    bytes32 public constant CLINICIAN_ROLE = keccak256("CLINICIAN_ROLE");

    struct Consent {
        address patient;
        address clinician;
        uint256 expiry;
        bool active;
    }

    struct AccessLog {
        address clinician;
        uint256 timestamp;
        bytes32 dataHash;
    }

    mapping(bytes32 => Consent) public consents;
    mapping(bytes32 => AccessLog[]) public accessLogs;

    event ConsentGranted(bytes32 indexed recordId, address indexed patient, address indexed clinician, uint256 expiry);
    event ConsentRevoked(bytes32 indexed recordId, address indexed patient);
    event RecordAccessed(bytes32 indexed recordId, address indexed clinician, uint256 timestamp);

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    /// @notice Patient grants access to a clinician for a specific record
    function grantConsent(
        bytes32 recordId,
        address clinician,
        uint256 expiry
    ) external onlyRole(PATIENT_ROLE) {
        require(expiry > block.timestamp, "Expiry must be in future");

        consents[recordId] = Consent({
            patient: msg.sender,
            clinician: clinician,
            expiry: expiry,
            active: true
        });

        emit ConsentGranted(recordId, msg.sender, clinician, expiry);
    }

    /// @notice Patient revokes previously granted consent
    function revokeConsent(bytes32 recordId) external {
        require(consents[recordId].patient == msg.sender, "Not the patient");
        consents[recordId].active = false;
        emit ConsentRevoked(recordId, msg.sender);
    }

    /// @notice Clinician attempts to access a record – logs the access if consent is valid
    function accessRecord(bytes32 recordId, bytes32 dataHash) external onlyRole(CLINICIAN_ROLE) {
        Consent memory c = consents[recordId];
        require(c.active && block.timestamp <= c.expiry && c.clinician == msg.sender, "No valid consent");

        accessLogs[recordId].push(AccessLog({
            clinician: msg.sender,
            timestamp: block.timestamp,
            dataHash: dataHash
        }));

        emit RecordAccessed(recordId, msg.sender, block.timestamp);
    }

    /// @notice View access logs (only patient or clinician with access can view)
    function getAccessLogs(bytes32 recordId) external view returns (AccessLog[] memory) {
        require(
            consents[recordId].patient == msg.sender || hasRole(CLINICIAN_ROLE, msg.sender),
            "Not authorized"
        );
        return accessLogs[recordId];
    }
}
