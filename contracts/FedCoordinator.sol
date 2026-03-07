// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "./PEDISC.sol";

/// @title FedCoordinator — Federated learning coordination on Creditcoin EVM
/// @notice Records contributions, rounds, and triggers PEDISC reward payouts. Gas: CTC.
contract FedCoordinator is AccessControl {
    bytes32 public constant AGGREGATOR_ROLE = keccak256("AGGREGATOR_ROLE");
    bytes32 public constant CONTRIBUTOR_ROLE = keccak256("CONTRIBUTOR_ROLE");

    PEDISC public pedisc;

    struct Contribution {
        address contributor;
        uint256 round;
        uint256 dataPoints;
        bytes32 modelHash;
        uint256 timestamp;
        bool rewarded;
    }

    struct Round {
        uint256 roundId;
        bytes32 globalModelHash;
        uint256 startTime;
        uint256 endTime;
        uint256 totalDataPoints;
        bool closed;
    }

    mapping(uint256 => Round) public rounds;
    mapping(uint256 => Contribution[]) public roundContributions;
    mapping(address => uint256[]) public contributorRounds;

    uint256 public currentRound;
    uint256 public constant REWARD_PER_DATAPOINT = 10 * 10**18; // 10 PEDISC per data point

    event RoundStarted(uint256 indexed roundId, uint256 startTime);
    event RoundClosed(uint256 indexed roundId, bytes32 globalModelHash);
    event ContributionSubmitted(
        uint256 indexed roundId,
        address indexed contributor,
        uint256 dataPoints,
        bytes32 modelHash
    );
    event RewardsDistributed(uint256 indexed roundId, address indexed contributor, uint256 amount);

    constructor(address _pedisc) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        pedisc = PEDISC(_pedisc);
    }

    function startRound() external onlyRole(AGGREGATOR_ROLE) {
        currentRound++;
        rounds[currentRound] = Round({
            roundId: currentRound,
            globalModelHash: bytes32(0),
            startTime: block.timestamp,
            endTime: 0,
            totalDataPoints: 0,
            closed: false
        });
        emit RoundStarted(currentRound, block.timestamp);
    }

    function submitContribution(
        uint256 roundId,
        uint256 dataPoints,
        bytes32 modelHash
    ) external onlyRole(CONTRIBUTOR_ROLE) {
        require(roundId == currentRound, "Wrong round");
        require(!rounds[roundId].closed, "Round already closed");

        Contribution memory contrib = Contribution({
            contributor: msg.sender,
            round: roundId,
            dataPoints: dataPoints,
            modelHash: modelHash,
            timestamp: block.timestamp,
            rewarded: false
        });
        roundContributions[roundId].push(contrib);
        contributorRounds[msg.sender].push(roundId);

        rounds[roundId].totalDataPoints += dataPoints;
        emit ContributionSubmitted(roundId, msg.sender, dataPoints, modelHash);
    }

    function closeRound(bytes32 globalModelHash) external onlyRole(AGGREGATOR_ROLE) {
        Round storage r = rounds[currentRound];
        require(!r.closed, "Already closed");

        r.globalModelHash = globalModelHash;
        r.endTime = block.timestamp;
        r.closed = true;

        Contribution[] storage contribs = roundContributions[currentRound];
        for (uint256 i = 0; i < contribs.length; i++) {
            Contribution storage c = contribs[i];
            if (!c.rewarded) {
                uint256 reward = c.dataPoints * REWARD_PER_DATAPOINT;
                pedisc.mint(c.contributor, reward);
                c.rewarded = true;
                emit RewardsDistributed(currentRound, c.contributor, reward);
            }
        }

        emit RoundClosed(currentRound, globalModelHash);
    }

    function getRoundContributions(uint256 roundId) external view returns (Contribution[] memory) {
        return roundContributions[roundId];
    }
}
