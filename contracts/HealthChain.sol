// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

/// @title HealthChain — Permissioned data-sharing layer on Creditcoin EVM
/// @notice Patient-controlled consent and immutable access logs for screening records (recordId = PediScreenNFT tokenId)
contract HealthChain is AccessControl {
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
        uint256 recordId;
    }

    mapping(uint256 => Consent) public consents;
    mapping(uint256 => AccessLog[]) public accessLogs;
    mapping(address => uint256[]) public patientRecords;

    event ConsentGranted(uint256 indexed recordId, address indexed patient, address indexed clinician, uint256 expiry);
    event ConsentRevoked(uint256 indexed recordId, address indexed patient);
    event RecordAccessed(uint256 indexed recordId, address indexed clinician);

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    /// @notice Patient grants a clinician access to a specific screening record until expiry
    function grantConsent(uint256 recordId, address clinician, uint256 expiry) external {
        require(hasRole(PATIENT_ROLE, msg.sender), "Not a patient");
        require(expiry > block.timestamp, "Expiry must be in future");

        Consent storage c = consents[recordId];
        c.patient = msg.sender;
        c.clinician = clinician;
        c.expiry = expiry;
        c.active = true;

        patientRecords[msg.sender].push(recordId);
        emit ConsentGranted(recordId, msg.sender, clinician, expiry);
    }

    /// @notice Patient revokes previously granted consent
    function revokeConsent(uint256 recordId) external {
        require(consents[recordId].patient == msg.sender, "Not the patient");
        consents[recordId].active = false;
        emit ConsentRevoked(recordId, msg.sender);
    }

    /// @notice Clinician accesses a record — logs the access and checks consent
    function accessRecord(uint256 recordId) external onlyRole(CLINICIAN_ROLE) {
        Consent memory c = consents[recordId];
        require(c.active && block.timestamp <= c.expiry && c.clinician == msg.sender, "No valid consent");

        accessLogs[recordId].push(AccessLog({
            clinician: msg.sender,
            timestamp: block.timestamp,
            recordId: recordId
        }));
        emit RecordAccessed(recordId, msg.sender);
    }

    /// @notice View access logs for a record (patient or any clinician with CLINICIAN_ROLE can view)
    function getAccessLogs(uint256 recordId) external view returns (AccessLog[] memory) {
        require(
            consents[recordId].patient == msg.sender || hasRole(CLINICIAN_ROLE, msg.sender),
            "Not authorized"
        );
        return accessLogs[recordId];
    }

    /// @notice Get all record IDs ever granted by a patient
    function getPatientRecords(address patient) external view returns (uint256[] memory) {
        return patientRecords[patient];
    }
}
