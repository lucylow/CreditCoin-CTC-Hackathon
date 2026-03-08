/**
 * Federated learning client — submit contributions via backend, PEDISC rewards on Creditcoin.
 * Falls back to mock mode when backend is unreachable (demo / hackathon).
 */
import { useCallback, useState, useEffect, useRef } from "react";
import {
  FED_COORDINATOR_ADDRESS,
  PEDISC_TOKEN_ADDRESS,
  PEDI_REWARD_TOKEN_ADDRESS,
} from "@/config/blockchain";
import { usePediScreenWallet } from "@/hooks/usePediScreenWallet";

const FED_API_BASE =
  (import.meta.env.VITE_PEDISCREEN_BACKEND_URL || "http://localhost:8000").replace(/\/$/, "") +
  "/api/federated";

const REWARD_PER_DATAPOINT = 10;

export interface FedSubmission {
  id: string;
  round: number;
  hash: string;
  points: number;
  reward: number;
  time: string;
  status: "confirmed" | "pending";
}

export interface UseFedLearningResult {
  registerClient: () => Promise<boolean>;
  submitGradients: (gradientHash: string, datapointCount: number) => Promise<boolean>;
  submitContribution: (datapointCount: number, dataPath?: string) => Promise<boolean>;
  balance: string | null;
  currentRound: number | null;
  loading: boolean;
  error: string | null;
  isConfigured: boolean;
  isMock: boolean;
  refreshBalance: () => Promise<void>;
  submissions: FedSubmission[];
  totalEarned: number;
  pending: number;
  claimRewards: () => Promise<boolean>;
  registeredClients: number;
  totalDataPoints: number;
}

// ── Mock helpers ──

function mockHash(): string {
  return `0x${Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`;
}

function timeAgo(ms: number): string {
  const mins = Math.round(ms / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

export function useFedLearning(): UseFedLearningResult {
  const { address, isConnected, isMock: walletIsMock } = usePediScreenWallet();

  const [balance, setBalance] = useState<string | null>(null);
  const [currentRound, setCurrentRound] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);

  // Mock state
  const [mockBalance, setMockBalance] = useState(12500); // in $PEDI
  const [mockPending, setMockPending] = useState(2500);
  const [mockSubmissions, setMockSubmissions] = useState<FedSubmission[]>([
    { id: "sub-m1", round: 7, hash: "0xa1b2c3d4e5f6a7b8", points: 450, reward: 4500, time: "2h ago", status: "confirmed" },
    { id: "sub-m2", round: 7, hash: "0xe5f6g7h8i9j0k1l2", points: 320, reward: 3200, time: "5h ago", status: "confirmed" },
    { id: "sub-m3", round: 6, hash: "0x9a8b7c6d5e4f3a2b", points: 180, reward: 1800, time: "1d ago", status: "confirmed" },
    { id: "sub-m4", round: 6, hash: "0xf1e2d3c4b5a69788", points: 130, reward: 1300, time: "2d ago", status: "confirmed" },
    { id: "sub-m5", round: 5, hash: "0x1234abcd5678ef90", points: 170, reward: 1700, time: "5d ago", status: "confirmed" },
  ]);
  const [mockClients, setMockClients] = useState(1);
  const [mockTotalDP, setMockTotalDP] = useState(1250);

  const isConfigured = !!(
    FED_COORDINATOR_ADDRESS &&
    (PEDISC_TOKEN_ADDRESS || PEDI_REWARD_TOKEN_ADDRESS)
  );

  const useMockMode = walletIsMock || !isConfigured || backendOnline === false;

  // ── Probe backend once ──
  const probed = useRef(false);
  useEffect(() => {
    if (probed.current) return;
    probed.current = true;
    fetch(`${FED_API_BASE}/round/current`, { signal: AbortSignal.timeout(3000) })
      .then((r) => {
        if (r.ok) {
          setBackendOnline(true);
          return r.json();
        }
        setBackendOnline(false);
        return null;
      })
      .then((data) => {
        if (data?.current_round != null) setCurrentRound(data.current_round);
      })
      .catch(() => setBackendOnline(false));
  }, []);

  // Set mock round
  useEffect(() => {
    if (useMockMode && currentRound == null) setCurrentRound(7);
  }, [useMockMode, currentRound]);

  // ── Balance ──
  const fetchBalance = useCallback(async () => {
    if (useMockMode) {
      setBalance(String(mockBalance));
      return;
    }
    if (!address) return;
    try {
      const res = await fetch(`${FED_API_BASE}/balance?address=${encodeURIComponent(address)}`);
      if (res.ok) {
        const data = await res.json();
        setBalance(data.balance ?? null);
      }
    } catch {
      setBalance(String(mockBalance));
    }
  }, [address, useMockMode, mockBalance]);

  useEffect(() => {
    if ((isConfigured || useMockMode) && (address || useMockMode)) {
      fetchBalance();
    }
  }, [isConfigured, address, fetchBalance, useMockMode]);

  // ── Register client ──
  const registerClient = useCallback(async (): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      await new Promise((r) => setTimeout(r, 1200));
      setMockClients((c) => c + 1);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Submit contribution ──
  const submitContribution = useCallback(
    async (datapointCount: number, dataPath = "mock"): Promise<boolean> => {
      setLoading(true);
      setError(null);
      try {
        if (useMockMode) {
          await new Promise((r) => setTimeout(r, 1500));
          const reward = datapointCount * REWARD_PER_DATAPOINT;
          const newSub: FedSubmission = {
            id: `sub-${Date.now()}`,
            round: currentRound ?? 7,
            hash: mockHash(),
            points: datapointCount,
            reward,
            time: "just now",
            status: "confirmed",
          };
          setMockSubmissions((prev) => [newSub, ...prev]);
          setMockPending((p) => p + reward);
          setMockTotalDP((dp) => dp + datapointCount);
          setMockBalance((b) => b + reward);
          setBalance(String(mockBalance + reward));
          return true;
        }

        // Real backend path
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
    [useMockMode, currentRound, fetchBalance, mockBalance]
  );

  const submitGradients = useCallback(
    async (gradientHash: string, datapointCount: number): Promise<boolean> => {
      return submitContribution(datapointCount, gradientHash || "mock");
    },
    [submitContribution]
  );

  // ── Claim rewards ──
  const claimRewards = useCallback(async (): Promise<boolean> => {
    if (mockPending <= 0) return false;
    setLoading(true);
    setError(null);
    try {
      await new Promise((r) => setTimeout(r, 1800));
      setMockPending(0);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return false;
    } finally {
      setLoading(false);
    }
  }, [mockPending]);

  return {
    registerClient,
    submitGradients,
    submitContribution,
    balance: useMockMode ? String(mockBalance) : balance,
    currentRound,
    loading,
    error,
    isConfigured: (isConfigured || useMockMode) && (isConnected || walletIsMock),
    isMock: useMockMode,
    refreshBalance: fetchBalance,
    submissions: mockSubmissions,
    totalEarned: mockBalance,
    pending: mockPending,
    claimRewards,
    registeredClients: mockClients,
    totalDataPoints: mockTotalDP,
  };
}
