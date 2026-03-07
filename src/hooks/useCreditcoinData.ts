/**
 * React hooks for consuming Creditcoin mock data.
 * Drop-in replacements for real RPC/contract calls.
 */
import { useState, useEffect, useCallback } from "react";
import { creditcoinService } from "@/lib/blockchain/mockService";
import type { MockNFT, MockStakingPosition, MockAttestation } from "@/lib/blockchain/mockData";

// ── CTC Balance ──

export function useCTCBalance(address: string | null) {
  const [balance, setBalance] = useState<{ balance: string; symbol: string; usdValue: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(() => {
    if (!address) return;
    setLoading(true);
    creditcoinService.getBalance(address).then((data) => {
      setBalance(data);
      setLoading(false);
    });
  }, [address]);

  useEffect(() => { refresh(); }, [refresh]);

  return { balance, loading, refresh };
}

// ── Staking Positions ──

export function useStakingPositions(address: string | null) {
  const [positions, setPositions] = useState<MockStakingPosition[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(() => {
    if (!address) return;
    setLoading(true);
    creditcoinService.getStakingPositions(address).then((data) => {
      setPositions(data);
      setLoading(false);
    });
  }, [address]);

  useEffect(() => { refresh(); }, [refresh]);

  return { positions, loading, refresh };
}

// ── NFTs ──

export function useNFTs(address: string | null) {
  const [nfts, setNfts] = useState<MockNFT[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(() => {
    if (!address) return;
    setLoading(true);
    creditcoinService.getNFTs(address).then((data) => {
      setNfts(data);
      setLoading(false);
    });
  }, [address]);

  useEffect(() => { refresh(); }, [refresh]);

  return { nfts, loading, refresh };
}

// ── Oracle Attestation ──

export function useAttestation(tokenId: string | null) {
  const [attestation, setAttestation] = useState<MockAttestation | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(() => {
    if (!tokenId) return;
    setLoading(true);
    creditcoinService.getAttestation(tokenId).then((data) => {
      setAttestation(data);
      setLoading(false);
    });
  }, [tokenId]);

  useEffect(() => { refresh(); }, [refresh]);

  return { attestation, loading, refresh };
}

// ── Network Stats ──

export function useNetworkStats() {
  const [stats, setStats] = useState<{
    currentBlock: number;
    tps: number;
    activeValidators: number;
    totalStaked: string;
    averageFee: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(() => {
    setLoading(true);
    creditcoinService.getNetworkStats().then((data) => {
      setStats(data);
      setLoading(false);
    });
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { stats, loading, refresh };
}
