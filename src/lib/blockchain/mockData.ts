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

// Type exports
export type StakingTier = "Bronze" | "Silver" | "Gold";
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";
export type MockNFT = (typeof mockNFTs)[number];
export type MockAttestation = (typeof mockOracleAttestations)[number];
export type MockStakingPosition = (typeof mockStakingPositions)[number];
