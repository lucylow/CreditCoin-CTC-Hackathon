/**
 * PediScreen — blockchain contract addresses and chain config (env-driven).
 * Creditcoin hackathon: mainnet (336) and testnet (337).
 */

/** Creditcoin contract addresses; set via deploy-creditcoin.js */
export const PEDISCREEN_NFT_ADDRESS =
  (import.meta.env.VITE_PEDISCREEN_NFT_ADDRESS as string) || "";
export const RISK_ENGINE_ADDRESS =
  (import.meta.env.VITE_RISK_ENGINE_ADDRESS as string) || "";
export const CHW_REGISTRY_ADDRESS =
  (import.meta.env.VITE_CHW_REGISTRY_ADDRESS as string) || "";
export const PEDISC_TOKEN_ADDRESS =
  (import.meta.env.VITE_PEDISC_TOKEN_ADDRESS as string) || "";
/** Creditcoin Healthchain: consent and access logs (recordId = screening tokenId) */
export const CREDITCOIN_HEALTH_CHAIN_ADDRESS =
  (import.meta.env.VITE_HEALTH_CHAIN_ADDRESS as string) || "";

/** RWA stack (Creditcoin USC: replaces Chainlink) */
export const RWA_CONTRACT_ADDRESS =
  (import.meta.env.VITE_RWA_CONTRACT_ADDRESS as string) || "";
export const DATA_FEED_ADDRESS =
  (import.meta.env.VITE_DATA_FEED_ADDRESS as string) || "";

/** Legacy / optional contract addresses */
export const PEDISCREEN_REGISTRY_ADDRESS =
  (import.meta.env.VITE_PEDISCREEN_REGISTRY_ADDRESS as string) || "";
export const PAYMENT_ESCROW_ADDRESS =
  (import.meta.env.VITE_PAYMENT_ESCROW_ADDRESS as string) || "";
export const PEDISCREEN_RECORDS_ADDRESS =
  (import.meta.env.VITE_PEDISCREEN_RECORDS_ADDRESS as string) || "";
/** Creditcoin Attestor verification (RWA or legacy oracle address) */
export const PEDISCREEN_ORACLE_ADDRESS =
  (import.meta.env.VITE_PEDISCREEN_ORACLE_ADDRESS as string) ||
  (import.meta.env.VITE_RWA_CONTRACT_ADDRESS as string) ||
  "";
export const HEALTH_CHAIN_POC_ADDRESS =
  (import.meta.env.VITE_HEALTH_CHAIN_POC_ADDRESS as string) || "";
export const FED_COORDINATOR_ADDRESS =
  (import.meta.env.VITE_FED_COORDINATOR_ADDRESS as string) || "";
export const PEDI_REWARD_TOKEN_ADDRESS =
  (import.meta.env.VITE_PEDI_REWARD_TOKEN_ADDRESS as string) || "";

/** Chain ID: 336 = Creditcoin Mainnet, 337 = Creditcoin Testnet */
export const CHAIN_ID = parseInt(
  (import.meta.env.VITE_CHAIN_ID as string) || "337",
  10
);

/** Creditcoin network parameters for wallet_addEthereumChain */
export const CREDITCOIN_MAINNET = {
  chainId: "0x150", // 336
  chainName: "Creditcoin Mainnet",
  nativeCurrency: { name: "Creditcoin", symbol: "CTC", decimals: 18 },
  rpcUrls: ["https://mainnet.creditcoin.network"],
  blockExplorerUrls: ["https://explorer.creditcoin.org/"],
};

export const CREDITCOIN_TESTNET = {
  chainId: "0x151", // 337
  chainName: "Creditcoin Testnet",
  nativeCurrency: { name: "Creditcoin", symbol: "CTC", decimals: 18 },
  rpcUrls: ["https://testnet.creditcoin.network"],
  blockExplorerUrls: ["https://testnet-explorer.creditcoin.org/"],
};

export function getChainRpcUrl(chainId: number): string {
  const env = import.meta.env.VITE_CREDITCOIN_RPC_URL as string | undefined;
  if (env) return env;
  switch (chainId) {
    case 336:
      return "https://mainnet.creditcoin.network";
    case 337:
      return "https://testnet.creditcoin.network";
    default:
      return "https://testnet.creditcoin.network";
  }
}

export function getChainName(chainId: number): string {
  switch (chainId) {
    case 336:
      return "Creditcoin";
    case 337:
      return "Creditcoin Testnet";
    default:
      return `Chain ${chainId}`;
  }
}

export function getBlockExplorerTxUrl(chainId: number, txHash: string): string {
  const base =
    chainId === 336
      ? "https://explorer.creditcoin.org/tx/"
      : "https://testnet-explorer.creditcoin.org/tx/";
  return `${base}${txHash}`;
}

export function getBlockExplorerAddressUrl(chainId: number, address: string): string {
  const base =
    chainId === 336
      ? "https://explorer.creditcoin.org/address/"
      : "https://testnet-explorer.creditcoin.org/address/";
  return `${base}${address}`;
}

export function getBlockExplorerTokenUrl(chainId: number, contractAddress: string, tokenId: string): string {
  const base =
    chainId === 336
      ? "https://explorer.creditcoin.org"
      : "https://testnet-explorer.creditcoin.org";
  return `${base}/token/${contractAddress}?a=${tokenId}`;
}

export const isBlockchainConfigured =
  !!(
    PEDISCREEN_NFT_ADDRESS ||
    RWA_CONTRACT_ADDRESS ||
    PEDISCREEN_REGISTRY_ADDRESS ||
    PEDISCREEN_RECORDS_ADDRESS ||
    HEALTH_CHAIN_POC_ADDRESS ||
    PEDISCREEN_ORACLE_ADDRESS ||
    FED_COORDINATOR_ADDRESS
  );
