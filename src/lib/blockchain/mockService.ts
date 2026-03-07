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
};
