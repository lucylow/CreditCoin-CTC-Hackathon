/**
 * Creditcoin-native mock data for PediScreen dApp.
 * Provides realistic CTC balances, staking, NFTs, oracle attestations, and network stats.
 */

// Mock CTC token balance
export const mockCTCBalance = {
  balance: "1250.42",
  symbol: "CTC",
  decimals: 18,
  usdValue: "187.56",
};

// Mock staking positions (CHWs / users)
export const mockStakingPositions = [
  {
    id: "1",
    amount: "1000",
    token: "PEDISC",
    startDate: Date.now() - 86400000 * 45,
    lockEnd: Date.now() + 86400000 * 45,
    apy: 12.5,
    rewards: "15.8",
    tier: "Gold" as const,
  },
  {
    id: "2",
    amount: "500",
    token: "PEDISC",
    startDate: Date.now() - 86400000 * 20,
    lockEnd: Date.now() + 86400000 * 70,
    apy: 8.2,
    rewards: "2.3",
    tier: "Silver" as const,
  },
];

// Mock NFTs (health records) on Creditcoin
export const mockNFTs = [
  {
    tokenId: "1001",
    chain: "Creditcoin EVM",
    contractAddress: "0x742d35Cc6b6DBCF823d80ADa7017a40A9D0e6637",
    metadata: {
      childAgeMonths: 24,
      riskLevel: "LOW" as const,
      confidence: 94,
      assessmentDate: Date.now() - 86400000 * 7,
      evidenceHash: "0x1a2b3c4d5e6f7a8b9c8d1e2f3a4b5c6d",
      image: "ipfs://QmXyz123",
      asq3Equivalent: "Communication 0.38 (Borderline)",
      chwName: "Nurse Sarah",
    },
    txHash: "0xabc123def456789ghi012jkl345mno678",
    blockNumber: 18400000,
  },
  {
    tokenId: "1002",
    chain: "Creditcoin EVM",
    contractAddress: "0x742d35Cc6b6DBCF823d80ADa7017a40A9D0e6637",
    metadata: {
      childAgeMonths: 36,
      riskLevel: "MEDIUM" as const,
      confidence: 87,
      assessmentDate: Date.now() - 86400000 * 3,
      evidenceHash: "0x9f8e7d6c5b4a39281760594a8b7c6d5e",
      image: "ipfs://QmAbc456",
      asq3Equivalent: "Motor 0.52 (Refer)",
      chwName: "CHW Michael",
    },
    txHash: "0xdef456ghi789012jkl345mno678pqr901",
    blockNumber: 18400012,
  },
  {
    tokenId: "1003",
    chain: "Creditcoin EVM",
    contractAddress: "0x742d35Cc6b6DBCF823d80ADa7017a40A9D0e6637",
    metadata: {
      childAgeMonths: 12,
      riskLevel: "HIGH" as const,
      confidence: 91,
      assessmentDate: Date.now() - 86400000 * 1,
      evidenceHash: "0x4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b",
      image: "ipfs://QmDef789",
      asq3Equivalent: "Social 0.71 (Refer)",
      chwName: "CHW Amina",
    },
    txHash: "0x789abc012def345ghi678jkl901mno234",
    blockNumber: 18400025,
  },
];

// Mock oracle attestations (Creditcoin USC)
export const mockOracleAttestations = [
  {
    requestId: "0x1111",
    tokenId: "1001",
    verifiedRisk: "LOW" as const,
    confidence: 95,
    timestamp: Date.now() - 86400000,
    attester: "0xAttestor1abcdef0123456789abcdef01234567",
    txHash: "0xattest123abc456def789ghi012jkl345mno",
  },
  {
    requestId: "0x2222",
    tokenId: "1002",
    verifiedRisk: "MEDIUM" as const,
    confidence: 86,
    timestamp: Date.now() - 3600000,
    attester: "0xAttestor2fedcba9876543210fedcba987654",
    txHash: "0xattest456def789ghi012jkl345mno678pqr",
  },
  {
    requestId: "0x3333",
    tokenId: "1003",
    verifiedRisk: "HIGH" as const,
    confidence: 90,
    timestamp: Date.now() - 600000,
    attester: "0xAttestor3abcdef9876543210abcdef98765",
    txHash: "0xattest789ghi012jkl345mno678pqr901stu",
  },
];

// Mock network stats
export const mockCreditcoinStats = {
  currentBlock: 18400123,
  tps: 124,
  activeValidators: 30,
  totalStaked: "12.4M CTC",
  averageFee: "0.00012 CTC",
};

// Staking tiers
export const STAKING_TIERS = [
  { name: "Bronze", min: 100, feeShare: 20, apy: 5.0 },
  { name: "Silver", min: 500, feeShare: 35, apy: 8.2 },
  { name: "Gold", min: 1000, feeShare: 50, apy: 12.5 },
] as const;

// ── USC Verification (replaces Chainlink) ──

export const mockUSCVerifications = [
  {
    tokenId: "1001",
    evidenceHash: "0x1a2b3c4d5e6f7a8b9c8d1e2f3a4b5c6d",
    proofType: "STARK" as const,
    proofHash: "0xSTARK_PROOF_abc123def456789",
    verified: true,
    verifiedAt: Date.now() - 86400000 * 2,
    attestorCount: 5,
    consensusReached: true,
    disputeWindow: Date.now() + 86400000 * 5,
    txHash: "0xuscverify_abc123def456789ghi",
    gasUsed: "0.00042 CTC",
  },
  {
    tokenId: "1002",
    evidenceHash: "0x9f8e7d6c5b4a39281760594a8b7c6d5e",
    proofType: "STARK" as const,
    proofHash: "0xSTARK_PROOF_def789ghi012345",
    verified: true,
    verifiedAt: Date.now() - 3600000 * 6,
    attestorCount: 4,
    consensusReached: true,
    disputeWindow: Date.now() + 86400000 * 7,
    txHash: "0xuscverify_def789ghi012345jkl",
    gasUsed: "0.00038 CTC",
  },
  {
    tokenId: "1003",
    evidenceHash: "0x4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b",
    proofType: "STARK" as const,
    proofHash: "0xSTARK_PROOF_ghi345jkl678901",
    verified: false,
    verifiedAt: null,
    attestorCount: 2,
    consensusReached: false,
    disputeWindow: Date.now() + 86400000 * 10,
    txHash: null,
    gasUsed: null,
  },
];

// ── Dual-Chain Anchoring ──

export const mockDualChainAnchors = [
  {
    tokenId: "1001",
    evmTxHash: "0xabc123def456789ghi012jkl345mno678",
    evmBlock: 18400000,
    evmChain: "Creditcoin EVM (337)" as const,
    nativeAnchorHash: "0xNATIVE_ANCHOR_abc123def456789",
    nativeBlock: 9200045,
    nativeChain: "Creditcoin Native (Substrate)" as const,
    anchoredAt: Date.now() - 86400000 * 7,
    relayerStatus: "confirmed" as const,
    finality: "permanent" as const,
  },
  {
    tokenId: "1002",
    evmTxHash: "0xdef456ghi789012jkl345mno678pqr901",
    evmBlock: 18400012,
    evmChain: "Creditcoin EVM (337)" as const,
    nativeAnchorHash: "0xNATIVE_ANCHOR_def789ghi012345",
    nativeBlock: 9200058,
    nativeChain: "Creditcoin Native (Substrate)" as const,
    anchoredAt: Date.now() - 86400000 * 3,
    relayerStatus: "confirmed" as const,
    finality: "permanent" as const,
  },
  {
    tokenId: "1003",
    evmTxHash: "0x789abc012def345ghi678jkl901mno234",
    evmBlock: 18400025,
    evmChain: "Creditcoin EVM (337)" as const,
    nativeAnchorHash: null,
    nativeBlock: null,
    nativeChain: "Creditcoin Native (Substrate)" as const,
    anchoredAt: null,
    relayerStatus: "pending" as const,
    finality: "evm-only" as const,
  },
];

// ── Credal CHW Reputation ──

export const mockCredalReputations = [
  {
    chwAddress: "0x742d35Cc6b6DBCF823d80ADa7017a40A9D0e6637",
    chwName: "Nurse Sarah",
    totalScreenings: 245,
    qualityScore: 94.2,
    reputationTier: "Expert" as const,
    creditScore: 820,
    rewardsEarned: "24,500 PEDISC",
    lastActive: Date.now() - 3600000 * 2,
    badges: ["Early Adopter", "1K Screenings", "High Accuracy"],
    region: "Lagos, Nigeria",
  },
  {
    chwAddress: "0x8Ba1f109551bD432803012645Ac136ddd64DBA72",
    chwName: "CHW Michael",
    totalScreenings: 187,
    qualityScore: 91.5,
    reputationTier: "Advanced" as const,
    creditScore: 760,
    rewardsEarned: "18,700 PEDISC",
    lastActive: Date.now() - 3600000 * 8,
    badges: ["Early Adopter", "500 Screenings"],
    region: "Nairobi, Kenya",
  },
  {
    chwAddress: "0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B",
    chwName: "CHW Amina",
    totalScreenings: 312,
    qualityScore: 96.1,
    reputationTier: "Master" as const,
    creditScore: 890,
    rewardsEarned: "31,200 PEDISC",
    lastActive: Date.now() - 3600000,
    badges: ["Early Adopter", "1K Screenings", "High Accuracy", "Top Contributor"],
    region: "Accra, Ghana",
  },
];

// ── DePIN IoT Data Anchoring ──

export const mockDePINDevices = [
  {
    deviceId: "DEV-001-WEARABLE",
    type: "Infant Wearable" as const,
    status: "online" as const,
    lastPing: Date.now() - 60000,
    dataPoints: 1842,
    anchored: 1830,
    pendingAnchor: 12,
    encryptionType: "AES-256-GCM",
    lastDataHash: "0xIOT_HASH_abc123def456",
    lastAnchorTx: "0xiot_anchor_abc123def",
    region: "Lagos, NG",
  },
  {
    deviceId: "DEV-002-CAMERA",
    type: "Baby Cam (Pose)" as const,
    status: "online" as const,
    lastPing: Date.now() - 120000,
    dataPoints: 956,
    anchored: 950,
    pendingAnchor: 6,
    encryptionType: "AES-256-GCM",
    lastDataHash: "0xIOT_HASH_def789ghi012",
    lastAnchorTx: "0xiot_anchor_def789ghi",
    region: "Nairobi, KE",
  },
  {
    deviceId: "DEV-003-AUDIO",
    type: "Cry Detector" as const,
    status: "offline" as const,
    lastPing: Date.now() - 86400000 * 2,
    dataPoints: 423,
    anchored: 423,
    pendingAnchor: 0,
    encryptionType: "AES-256-GCM",
    lastDataHash: "0xIOT_HASH_ghi345jkl678",
    lastAnchorTx: "0xiot_anchor_ghi345jkl",
    region: "Accra, GH",
  },
];

export const mockDePINStats = {
  totalDevices: 47,
  onlineDevices: 38,
  totalDataAnchored: 128400,
  pendingAnchors: 234,
  avgAnchorTime: "1.2s",
  totalGasSpent: "0.42 CTC",
};

// Type exports
export type StakingTier = "Bronze" | "Silver" | "Gold";
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";
export type MockNFT = (typeof mockNFTs)[number];
export type MockAttestation = (typeof mockOracleAttestations)[number];
export type MockStakingPosition = (typeof mockStakingPositions)[number];
export type MockUSCVerification = (typeof mockUSCVerifications)[number];
export type MockDualChainAnchor = (typeof mockDualChainAnchors)[number];
export type MockCredalReputation = (typeof mockCredalReputations)[number];
export type MockDePINDevice = (typeof mockDePINDevices)[number];
