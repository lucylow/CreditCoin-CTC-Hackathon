// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/// @title PediScreen RWA Certificate — Screening certificates as Real World Assets on Creditcoin EVM
/// @notice ERC-721 screening certificates; minted by CHWs, verified by RiskEngine (USC attestor)
contract PediScreenNFT is ERC721, ERC721URIStorage, AccessControl {
    bytes32 public constant CHW_ROLE = keccak256("CHW_ROLE");
    bytes32 public constant RISK_ENGINE_ROLE = keccak256("RISK_ENGINE_ROLE");

    uint256 private _tokenIdCounter;

    enum RiskLevel { LOW, MEDIUM, HIGH }

    struct ScreeningMetadata {
        uint64 childAgeMonths;
        RiskLevel riskLevel;
        uint8 confidence;
        bytes32 evidenceHash;
        address chw;
        uint256 timestamp;
        bool verified;
    }

    mapping(uint256 => ScreeningMetadata) public screenings;
    mapping(bytes32 => uint256) public evidenceHashToTokenId;

    event ScreeningMinted(
        uint256 indexed tokenId,
        address indexed parent,
        address indexed chw,
        RiskLevel riskLevel,
        uint8 confidence,
        bytes32 evidenceHash
    );
    event ScreeningVerified(uint256 indexed tokenId, bool valid);

    constructor() ERC721("PediScreen RWA Certificate", "PEDIRWA") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    /// @dev Minted only by a registered CHW (backend or CHW wallet with CHW_ROLE)
    function mintScreening(
        address parent,
        uint64 childAgeMonths,
        RiskLevel riskLevel,
        uint8 confidence,
        bytes32 evidenceHash,
        string calldata ipfsCID
    ) external onlyRole(CHW_ROLE) returns (uint256) {
        require(confidence >= 75, "Confidence too low");
        require(evidenceHashToTokenId[evidenceHash] == 0, "Duplicate evidence");
        uint256 tokenId = _tokenIdCounter;
        _tokenIdCounter += 1;

        _safeMint(parent, tokenId);
        screenings[tokenId] = ScreeningMetadata({
            childAgeMonths: childAgeMonths,
            riskLevel: riskLevel,
            confidence: confidence,
            evidenceHash: evidenceHash,
            chw: msg.sender,
            timestamp: block.timestamp,
            verified: false
        });
        evidenceHashToTokenId[evidenceHash] = tokenId;

        string memory uri = string(abi.encodePacked("ipfs://", ipfsCID));
        _setTokenURI(tokenId, uri);
        emit ScreeningMinted(tokenId, parent, msg.sender, riskLevel, confidence, evidenceHash);
        return tokenId;
    }

    /// @dev Called by RiskEngine after USC oracle verification
    function setVerified(uint256 tokenId, bool valid) external onlyRole(RISK_ENGINE_ROLE) {
        screenings[tokenId].verified = valid;
        emit ScreeningVerified(tokenId, valid);
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721, ERC721URIStorage)
        returns (address)
    {
        return super._update(to, tokenId, auth);
    }
}
