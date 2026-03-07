/**
 * PediScreen wallet connection (HIPAA blockchain, NFT mint, HealthChain).
 * Creditcoin hackathon: targets Creditcoin Mainnet (336) / Testnet (337).
 */
import { useCallback, useEffect, useState } from "react";
import {
  CHAIN_ID,
  getChainRpcUrl,
  getChainName,
  CREDITCOIN_MAINNET,
  CREDITCOIN_TESTNET,
} from "@/config/blockchain";
import { MOCK_WALLET_DATA } from "@/data/mockWallet";

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on?: (event: string, handler: (...args: unknown[]) => void) => void;
    };
  }
}

export interface UsePediScreenWalletResult {
  address: string | null;
  chainId: number | null;
  isConnecting: boolean;
  isConnected: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  switchChain: (targetChainId: number) => Promise<void>;
  error: string | null;
}

function getCreditcoinNetworkParams(targetChainId: number) {
  if (targetChainId === 336) return CREDITCOIN_MAINNET;
  if (targetChainId === 337) return CREDITCOIN_TESTNET;
  return {
    chainId: `0x${targetChainId.toString(16)}`,
    chainName: `Chain ${targetChainId}`,
    nativeCurrency: { name: "CTC", symbol: "CTC", decimals: 18 },
    rpcUrls: [getChainRpcUrl(targetChainId)],
    blockExplorerUrls: ["https://testnet-explorer.creditcoin.org/"],
  };
}

export function usePediScreenWallet(): UsePediScreenWalletResult {
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(async () => {
    if (!window.ethereum) {
      setError("No wallet found. Install MetaMask or another Web3 wallet.");
      return;
    }
    setIsConnecting(true);
    setError(null);
    try {
      const accounts = (await window.ethereum.request({
        method: "eth_requestAccounts",
        params: [],
      })) as string[];
      const acc = accounts?.[0] ?? null;
      setAddress(acc ?? null);
      if (acc) {
        const hexChainId = (await window.ethereum.request({
          method: "eth_chainId",
          params: [],
        })) as string;
        setChainId(hexChainId ? parseInt(hexChainId, 16) : null);
      } else {
        setChainId(null);
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setError(message);
      setAddress(null);
      setChainId(null);
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setAddress(null);
    setChainId(null);
    setError(null);
  }, []);

  const switchChain = useCallback(async (targetChainId: number) => {
    if (!window.ethereum) return;
    const hexChainId = `0x${targetChainId.toString(16)}`;
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: hexChainId }],
      });
      setChainId(targetChainId);
    } catch (err: unknown) {
      const addChain = (err as { code?: number })?.code === 4902;
      if (addChain) {
        const networkParams = getCreditcoinNetworkParams(targetChainId);
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [networkParams],
        });
        setChainId(targetChainId);
      } else {
        throw err;
      }
    }
  }, []);

  useEffect(() => {
    if (!window.ethereum) return;
    const onAccounts = (accounts: unknown) => {
      const acc = Array.isArray(accounts) ? accounts[0] : null;
      setAddress(typeof acc === "string" ? acc : null);
    };
    const onChainId = (hexChainId: unknown) => {
      const hex = typeof hexChainId === "string" ? hexChainId : "";
      setChainId(hex ? parseInt(hex, 16) : null);
    };
    window.ethereum.on?.("accountsChanged", onAccounts);
    window.ethereum.on?.("chainChanged", onChainId);
    return () => {
      window.ethereum?.on?.("accountsChanged", () => {});
      window.ethereum?.on?.("chainChanged", () => {});
    };
  }, []);

  return {
    address,
    chainId,
    isConnecting,
    isConnected: !!address,
    connect,
    disconnect,
    switchChain,
    error,
  };
}

// ---------------------------------------------------------------------------
// Demo-ready wallet wrapper with mock NFTs + richer status (Creditcoin)
// ---------------------------------------------------------------------------

export interface WalletStatus {
  address: string | null;
  isConnected: boolean;
  chainId: number | null;
  isCreditcoin: boolean;
  ensName: string | null;
  balance: string;
  status: "idle" | "connecting" | "connected" | "error" | "switching";
  error: string | null;
}

export interface ScreeningNFT {
  tokenId: number;
  ipfsCID: string;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  confidence: number;
  verified: boolean;
  txHash: string;
  childAgeMonths?: number;
  timestamp?: number;
  keyFindings?: string[];
}

const CREDITCOIN_CHAIN_ID = 336;
const MOCK_DELAY = 1200;

/**
 * Higher-level wallet hook used by demo blockchain flows.
 * Wraps `usePediScreenWallet` (real MetaMask) but can also run in pure mock mode.
 */
export function usePediscreenWallet() {
  const {
    address,
    chainId,
    isConnecting,
    isConnected,
    connect,
    disconnect,
    switchChain,
    error,
  } = usePediScreenWallet();

  const [wallet, setWallet] = useState<WalletStatus>({
    address: null,
    isConnected: false,
    chainId: null,
    isCreditcoin: false,
    ensName: null,
    balance: "0",
    status: "idle",
    error: null,
  });
  const [screeningNFTs, setScreeningNFTs] = useState<ScreeningNFT[]>([]);

  useEffect(() => {
    setWallet((prev) => ({
      ...prev,
      address,
      isConnected,
      chainId,
      isCreditcoin: chainId === CREDITCOIN_CHAIN_ID || chainId === 337,
      balance: prev.balance ?? "0",
      status: error
        ? "error"
        : isConnecting
          ? "connecting"
          : isConnected
            ? "connected"
            : "idle",
      error,
    }));
  }, [address, chainId, isConnected, isConnecting, error]);

  const connectWallet = useCallback(
    async (useMock: boolean = false) => {
      setWallet((prev) => ({ ...prev, status: "connecting", error: null }));

      try {
        const hasEthereum =
          typeof window !== "undefined" &&
          typeof (window as Window).ethereum !== "undefined";

        if (useMock || !hasEthereum) {
          await new Promise((resolve) => setTimeout(resolve, MOCK_DELAY));
          setWallet({
            ...MOCK_WALLET_DATA.connected,
            status: "connected",
          });
          setScreeningNFTs(MOCK_WALLET_DATA.nfts);
          return;
        }

        await connect();
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        setWallet((prev) => ({
          ...prev,
          status: "error",
          error: message || "Connection failed",
        }));
      }
    },
    [connect],
  );

  const disconnectWallet = useCallback(() => {
    disconnect();
    setWallet({
      address: null,
      isConnected: false,
      chainId: null,
      isCreditcoin: false,
      ensName: null,
      balance: "0",
      status: "idle",
      error: null,
    });
    setScreeningNFTs([]);
  }, [disconnect]);

  const switchToCreditcoin = useCallback(async () => {
    setWallet((prev) => ({ ...prev, status: "switching", error: null }));

    const hasEthereum =
      typeof window !== "undefined" &&
      typeof (window as Window).ethereum !== "undefined";
    if (!hasEthereum) {
      setWallet((prev) => ({
        ...prev,
        status: "error",
        error: "No wallet detected",
      }));
      return;
    }

    try {
      await switchChain(CREDITCOIN_CHAIN_ID);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setWallet((prev) => ({
        ...prev,
        status: "error",
        error: message || "Failed to switch network",
      }));
    }
  }, [switchChain]);

  return {
    wallet,
    screeningNFTs,
    setScreeningNFTs,
    connectWallet,
    disconnectWallet,
    switchToCreditcoin,
    refetchNFTs: () => setScreeningNFTs(MOCK_WALLET_DATA.nfts),
    isConnected,
    baseAddress: address,
  };
}
