// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title AuditLog — Immutable data provenance on Creditcoin EVM
/// @notice Optional add-on: append-only log of data hashes and descriptions (no PHI).
contract AuditLog {
    struct Entry {
        address submitter;
        uint256 timestamp;
        bytes32 dataHash;
        string description;
    }

    Entry[] public entries;

    event EntryAdded(uint256 indexed id, address indexed submitter, bytes32 dataHash, string description);

    function addEntry(bytes32 dataHash, string calldata description) external {
        entries.push(Entry({
            submitter: msg.sender,
            timestamp: block.timestamp,
            dataHash: dataHash,
            description: description
        }));
        emit EntryAdded(entries.length - 1, msg.sender, dataHash, description);
    }

    function getEntry(uint256 id) external view returns (Entry memory) {
        return entries[id];
    }

    function getEntriesCount() external view returns (uint256) {
        return entries.length;
    }
}
