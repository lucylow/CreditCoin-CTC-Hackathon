// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

/// @title DataFeed — External data oracle for Creditcoin EVM (replaces Chainlink Data Feeds)
/// @notice Trusted backend (DATA_PROVIDER_ROLE) pushes exchange rates, regional indices, etc.
contract DataFeed is AccessControl {
    bytes32 public constant DATA_PROVIDER_ROLE = keccak256("DATA_PROVIDER_ROLE");

    mapping(bytes32 => uint256) public data;
    mapping(bytes32 => uint256) public lastUpdate;

    event DataUpdated(bytes32 indexed key, uint256 value, uint256 timestamp);

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    /// @dev Update a data point (e.g., exchange rate, regional cost index)
    function setData(bytes32 key, uint256 value) external onlyRole(DATA_PROVIDER_ROLE) {
        data[key] = value;
        lastUpdate[key] = block.timestamp;
        emit DataUpdated(key, value, block.timestamp);
    }

    /// @dev Read data (anyone can call)
    function getData(bytes32 key) external view returns (uint256, uint256) {
        return (data[key], lastUpdate[key]);
    }
}
