/**
 * React hooks for consuming Creditcoin mock data.
 * Drop-in replacements for real RPC/contract calls.
 */
import { useState, useEffect, useCallback } from "react";
import { creditcoinService } from "@/lib/blockchain/mockService";
import type {
  MockNFT,
  MockStakingPosition,
  MockAttestation,
  MockUSCVerification,
  MockDualChainAnchor,
  MockCredalReputation,
  MockDePINDevice,
} from "@/lib/blockchain/mockData";

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

// ── USC Verifications ──

export function useUSCVerifications() {
  const [verifications, setVerifications] = useState<MockUSCVerification[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(() => {
    setLoading(true);
    creditcoinService.getAllUSCVerifications().then((data) => {
      setVerifications(data);
      setLoading(false);
    });
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { verifications, loading, refresh };
}

// ── Dual-Chain Anchors ──

export function useDualChainAnchors() {
  const [anchors, setAnchors] = useState<MockDualChainAnchor[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(() => {
    setLoading(true);
    creditcoinService.getAllDualChainAnchors().then((data) => {
      setAnchors(data);
      setLoading(false);
    });
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { anchors, loading, refresh };
}

// ── Credal CHW Reputations ──

export function useCHWReputations() {
  const [reputations, setReputations] = useState<MockCredalReputation[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(() => {
    setLoading(true);
    creditcoinService.getAllCHWReputations().then((data) => {
      setReputations(data);
      setLoading(false);
    });
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { reputations, loading, refresh };
}

// ── DePIN Devices ──

export function useDePINDevices() {
  const [devices, setDevices] = useState<MockDePINDevice[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(() => {
    setLoading(true);
    creditcoinService.getDePINDevices().then((data) => {
      setDevices(data);
      setLoading(false);
    });
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { devices, loading, refresh };
}

// ── DePIN Stats ──

export function useDePINStats() {
  const [stats, setStats] = useState<{
    totalDevices: number;
    onlineDevices: number;
    totalDataAnchored: number;
    pendingAnchors: number;
    avgAnchorTime: string;
    totalGasSpent: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(() => {
    setLoading(true);
    creditcoinService.getDePINStats().then((data) => {
      setStats(data);
      setLoading(false);
    });
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { stats, loading, refresh };
}
