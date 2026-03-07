/**
 * Mock Creditcoin blockchain service.
 * Simulates async RPC / contract calls with realistic delays.
 */
import {
  mockCTCBalance,
  mockStakingPositions,
  mockNFTs,
  mockOracleAttestations,
  mockCreditcoinStats,
  mockUSCVerifications,
  mockDualChainAnchors,
  mockCredalReputations,
  mockDePINDevices,
  mockDePINStats,
} from "./mockData";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const creditcoinService = {
  /** Get CTC balance for an address */
  getBalance: async (_address: string) => {
    await delay(800);
    return { ...mockCTCBalance };
  },

  /** Get staking positions for a user */
  getStakingPositions: async (_address: string) => {
    await delay(1000);
    return [...mockStakingPositions];
  },

  /** Get NFTs owned by address */
  getNFTs: async (_address: string, _contractAddress?: string) => {
    await delay(1200);
    return [...mockNFTs];
  },

  /** Get oracle attestation for a specific token */
  getAttestation: async (tokenId: string) => {
    await delay(600);
    return mockOracleAttestations.find((a) => a.tokenId === tokenId) ?? null;
  },

  /** Stake PEDISC tokens */
  stake: async (amount: string, _duration: number) => {
    await delay(2000);
    return {
      txHash: "0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(""),
      status: "success" as const,
      amount,
    };
  },

  /** Unstake PEDISC tokens */
  unstake: async (positionId: string) => {
    await delay(1500);
    return {
      txHash: "0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(""),
      status: "success" as const,
      positionId,
    };
  },

  /** Get network stats */
  getNetworkStats: async () => {
    await delay(500);
    return { ...mockCreditcoinStats };
  },

  /** Mint a screening NFT (simulate) */
  mintScreeningNFT: async (screeningData: { childAgeMonths: number; riskLevel: string; confidence: number }) => {
    await delay(2500);
    const tokenId = String(1000 + Math.floor(Math.random() * 9000));
    return {
      txHash: "0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(""),
      tokenId,
      status: "success" as const,
      ...screeningData,
    };
  },

  // ── USC Verification ──

  /** Get USC verification status for a token */
  getUSCVerification: async (tokenId: string) => {
    await delay(700);
    return mockUSCVerifications.find((v) => v.tokenId === tokenId) ?? null;
  },

  /** Get all USC verifications */
  getAllUSCVerifications: async () => {
    await delay(900);
    return [...mockUSCVerifications];
  },

  /** Submit a STARK proof for USC verification */
  submitUSCProof: async (tokenId: string, evidenceHash: string) => {
    await delay(3000);
    return {
      txHash: "0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(""),
      tokenId,
      evidenceHash,
      status: "submitted" as const,
      attestorsNotified: 5,
    };
  },

  // ── Dual-Chain Anchoring ──

  /** Get dual-chain anchor status for a token */
  getDualChainAnchor: async (tokenId: string) => {
    await delay(600);
    return mockDualChainAnchors.find((a) => a.tokenId === tokenId) ?? null;
  },

  /** Get all dual-chain anchors */
  getAllDualChainAnchors: async () => {
    await delay(800);
    return [...mockDualChainAnchors];
  },

  /** Relay an EVM hash to the native chain */
  relayToNativeChain: async (tokenId: string, evmTxHash: string) => {
    await delay(4000);
    return {
      nativeAnchorHash: "0xNATIVE_" + Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join(""),
      nativeBlock: 9200000 + Math.floor(Math.random() * 1000),
      status: "confirmed" as const,
      tokenId,
      evmTxHash,
    };
  },

  // ── Credal CHW Reputation ──

  /** Get CHW reputation from Credal */
  getCHWReputation: async (chwAddress: string) => {
    await delay(800);
    return mockCredalReputations.find((r) => r.chwAddress === chwAddress) ?? null;
  },

  /** Get all CHW reputations (leaderboard) */
  getAllCHWReputations: async () => {
    await delay(1000);
    return [...mockCredalReputations];
  },

  /** Record a screening credit event on Credal */
  recordScreeningCredit: async (chwAddress: string, screeningId: string) => {
    await delay(1500);
    return {
      creditEventId: "CE-" + Math.floor(Math.random() * 100000),
      chwAddress,
      screeningId,
      creditDelta: 1,
      newCreditScore: 820 + Math.floor(Math.random() * 10),
      status: "recorded" as const,
    };
  },

  // ── DePIN IoT ──

  /** Get all DePIN devices */
  getDePINDevices: async () => {
    await delay(700);
    return [...mockDePINDevices];
  },

  /** Get DePIN network stats */
  getDePINStats: async () => {
    await delay(500);
    return { ...mockDePINStats };
  },

  /** Anchor IoT data hash on Creditcoin */
  anchorIoTData: async (deviceId: string, dataHash: string) => {
    await delay(2000);
    return {
      txHash: "0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(""),
      deviceId,
      dataHash,
      blockNumber: 18400000 + Math.floor(Math.random() * 1000),
      status: "anchored" as const,
    };
  },
};
