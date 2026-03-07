/**
 * Federated learning client — submit contributions via backend, PEDISC rewards on Creditcoin.
 * Uses FedCoordinator + PEDISC (Creditcoin EVM, chain 337). No Polygon.
 */
import { useCallback, useState, useEffect } from "react";
import {
  FED_COORDINATOR_ADDRESS,
  PEDISC_TOKEN_ADDRESS,
  PEDI_REWARD_TOKEN_ADDRESS,
} from "@/config/blockchain";
import { usePediScreenWallet } from "@/hooks/usePediScreenWallet";

const FED_API_BASE =
  (import.meta.env.VITE_PEDISCREEN_BACKEND_URL || "http://localhost:8000").replace(/\/$/, "") +
  "/api/federated";

export interface UseFedLearningResult {
  registerClient: () => Promise<boolean>;
  submitGradients: (gradientHash: string, datapointCount: number) => Promise<boolean>;
  submitContribution: (datapointCount: number, dataPath?: string) => Promise<boolean>;
  balance: string | null;
  currentRound: number | null;
  loading: boolean;
  error: string | null;
  isConfigured: boolean;
  refreshBalance: () => Promise<void>;
}

const REWARD_PER_DATAPOINT = 10;

export function useFedLearning(): UseFedLearningResult {
  const { address, isConnected } = usePediScreenWallet();
  const [balance, setBalance] = useState<string | null>(null);
  const [currentRound, setCurrentRound] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isConfigured = !!(
    FED_COORDINATOR_ADDRESS &&
    (PEDISC_TOKEN_ADDRESS || PEDI_REWARD_TOKEN_ADDRESS)
  );

  const fetchBalance = useCallback(async () => {
    if (!address || !FED_API_BASE) return;
    try {
      const res = await fetch(
        `${FED_API_BASE}/balance?address=${encodeURIComponent(address)}`
      );
      if (res.ok) {
        const data = await res.json();
        setBalance(data.balance ?? null);
      }
    } catch {
      setBalance(null);
    }
  }, [address]);

  const fetchCurrentRound = useCallback(async () => {
    if (!FED_API_BASE) return;
    try {
      const res = await fetch(`${FED_API_BASE}/round/current`);
      if (res.ok) {
        const data = await res.json();
        setCurrentRound(data.current_round ?? null);
      }
    } catch {
      setCurrentRound(null);
    }
  }, []);

  useEffect(() => {
    if (isConfigured && address) {
      fetchBalance();
      fetchCurrentRound();
    }
  }, [isConfigured, address, fetchBalance, fetchCurrentRound]);

  const registerClient = useCallback(async (): Promise<boolean> => {
    if (!FED_COORDINATOR_ADDRESS || !address) return false;
    setLoading(true);
    setError(null);
    try {
      // CONTRIBUTOR_ROLE is granted by admin; no on-chain register in FedCoordinator
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return false;
    } finally {
      setLoading(false);
    }
  }, [address]);

  const submitContribution = useCallback(
    async (datapointCount: number, dataPath = "mock"): Promise<boolean> => {
      if (!FED_COORDINATOR_ADDRESS || !address) return false;
      setLoading(true);
      setError(null);
      try {
        let round = currentRound;
        if (round == null) {
          const resRound = await fetch(`${FED_API_BASE}/round/current`);
          if (resRound.ok) {
            const data = await resRound.json();
            round = data.current_round ?? 1;
            setCurrentRound(round);
          } else {
            round = 1;
          }
        }
        const res = await fetch(`${FED_API_BASE}/submit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            round_id: round,
            data_path: dataPath,
            data_points: datapointCount,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.detail || err.message || `HTTP ${res.status}`);
        }
        await fetchBalance();
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        return false;
      } finally {
        setLoading(false);
      }
    },
    [address, currentRound, fetchBalance]
  );

  const submitGradients = useCallback(
    async (gradientHash: string, datapointCount: number): Promise<boolean> => {
      return submitContribution(datapointCount, gradientHash || "mock");
    },
    [submitContribution]
  );

  return {
    registerClient,
    submitGradients,
    submitContribution,
    balance,
    currentRound,
    loading,
    error,
    isConfigured: isConfigured && isConnected,
    refreshBalance: fetchBalance,
  };
}
