// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title CHWRegistry — CHW staking in PEDISC on Creditcoin EVM
/// @notice CHWs stake PEDISC to register; slashing on disputes (RiskEngine/oracle mismatch)
contract CHWRegistry is AccessControl {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant SLASHER_ROLE = keccak256("SLASHER_ROLE");

    IERC20 public pediscToken;
    uint256 public constant MIN_STAKE = 100 * 10**18; // 100 PEDISC (18 decimals)

    struct CHWProfile {
        address wallet;
        uint256 stake;
        uint64 screeningsCompleted;
        uint64 flags;
        bool active;
    }

    mapping(address => CHWProfile) public chwProfiles;

    event CHWRegistered(address indexed chw, uint256 stake);
    event StakeSlashed(address indexed chw, uint256 amount, string reason);
    event StakeWithdrawn(address indexed chw, uint256 amount);

    constructor(address _pediscToken) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        pediscToken = IERC20(_pediscToken);
    }

    /// @dev CHW must approve the contract to transfer MIN_STAKE PEDISC, then call register()
    function register() external {
        require(chwProfiles[msg.sender].wallet == address(0), "Already registered");
        require(pediscToken.transferFrom(msg.sender, address(this), MIN_STAKE), "Stake failed");

        chwProfiles[msg.sender] = CHWProfile({
            wallet: msg.sender,
            stake: MIN_STAKE,
            screeningsCompleted: 0,
            flags: 0,
            active: true
        });
        emit CHWRegistered(msg.sender, MIN_STAKE);
    }

    /// @dev Called by RiskEngine or admin when a screening is disputed
    function slash(address chw, uint256 amount, string calldata reason)
        external
        onlyRole(SLASHER_ROLE)
    {
        CHWProfile storage profile = chwProfiles[chw];
        require(profile.stake >= amount, "Insufficient stake");

        profile.stake -= amount;
        profile.flags += 1;
        if (profile.stake < MIN_STAKE) {
            profile.active = false;
        }
        require(pediscToken.transfer(msg.sender, amount), "Transfer failed");

        emit StakeSlashed(chw, amount, reason);
    }

    /// @dev Admin can slash (e.g. manual review)
    function slashByAdmin(address chw, uint256 amount, string calldata reason)
        external
        onlyRole(ADMIN_ROLE)
    {
        CHWProfile storage profile = chwProfiles[chw];
        require(profile.stake >= amount, "Insufficient stake");

        profile.stake -= amount;
        profile.flags += 1;
        if (profile.stake < MIN_STAKE) {
            profile.active = false;
        }
        require(pediscToken.transfer(msg.sender, amount), "Transfer failed");

        emit StakeSlashed(chw, amount, reason);
    }

    /// @dev CHW can withdraw remaining stake when active and above min
    function withdrawStake() external {
        CHWProfile storage profile = chwProfiles[msg.sender];
        require(profile.active, "Inactive or insufficient stake");
        uint256 amount = profile.stake;
        profile.stake = 0;
        profile.active = false;
        require(pediscToken.transfer(msg.sender, amount), "Transfer failed");
        emit StakeWithdrawn(msg.sender, amount);
    }

    function getProfile(address chw)
        external
        view
        returns (uint256 stake, uint64 screeningsCompleted, uint64 flags, bool active)
    {
        CHWProfile storage p = chwProfiles[chw];
        return (p.stake, p.screeningsCompleted, p.flags, p.active);
    }

    function isRegistered(address chw) external view returns (bool) {
        return chwProfiles[chw].wallet != address(0);
    }
}
