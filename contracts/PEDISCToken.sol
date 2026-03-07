// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/// @title PEDISC — Staking token for CHW registry on Creditcoin EVM
/// @notice ERC-20 used for CHW staking (CHWRegistry); gas for minting is CTC
contract PEDISCToken is ERC20, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    constructor() ERC20("PediScreen Certificate", "PEDISC") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        // Optional: mint initial supply to deployer for testing
        // _mint(msg.sender, 1_000_000 * 10**18);
    }

    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }
}
