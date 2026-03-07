/**
 * Blockchain & Web3 — three-column Creditcoin dashboard.
 * Wallet & Network | Screening NFTs (RWAs) | DAO & Governance
 */
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useLocation } from "react-router-dom";
import {
  Wallet,
  Copy,
  Check,
  ExternalLink,
  Shield,
  ShieldCheck,
  Activity,
  Vote,
  Landmark,
  RefreshCw,
  Zap,
  Lock,
  ArrowUpRight,
  ChevronRight,
  Coins,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { usePediScreenWallet } from "@/hooks/usePediScreenWallet";
import { ConnectWalletButton } from "@/components/blockchain/ConnectWalletButton";
import { MOCK_WALLET_DATA } from "@/data/mockWallet";
import {
  getBlockExplorerAddressUrl,
  getBlockExplorerTokenUrl,
  getChainName,
  CHAIN_ID,
} from "@/config/blockchain";
import { PediScreenBlockchainUI } from "@/components/blockchain";

// ---------- helpers ----------
const shortAddr = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
const riskBadge = (r: string) =>
  r === "LOW"
    ? { icon: "🟢", cls: "bg-emerald-500/10 text-emerald-700 border-emerald-300 dark:text-emerald-300" }
    : r === "MEDIUM"
      ? { icon: "🟡", cls: "bg-amber-500/10 text-amber-700 border-amber-300 dark:text-amber-300" }
      : { icon: "🔴", cls: "bg-red-500/10 text-red-700 border-red-300 dark:text-red-300" };

// ---------- mock staking ----------
const MOCK_STAKING = { staked: 1250, votingPower: 1250, apy: 12 };

// ---------- mock on-chain events timeline ----------
const MOCK_TIMELINE = [
  { text: "Screening #8472 minted", time: "2 hrs ago", icon: "🎟️" },
  { text: "Consent granted to Dr. Smith", time: "5 hrs ago", icon: "🔓" },
  { text: "Oracle attestation received", time: "1 day ago", icon: "⚡" },
];

// ---------- mock treasury ----------
const MOCK_TREASURY = {
  totalFunds: "125,000",
  pendingWithdrawals: "2,450",
  recentPayouts: [
    { to: "CHW Maria L.", amount: "6 USDC", date: "Mar 6" },
    { to: "CHW James K.", amount: "6 USDC", date: "Mar 5" },
    { to: "CHW Priya S.", amount: "6 USDC", date: "Mar 5" },
  ],
};

const BlockchainPage = () => {
  const location = useLocation();
  const isDashboard = location.pathname.includes("blockchain-dashboard");

  if (isDashboard) {
    return <PediScreenBlockchainUI />;
  }

  return <BlockchainDashboard />;
};

function BlockchainDashboard() {
  const wallet = usePediScreenWallet();
  const [copied, setCopied] = useState(false);
  const [daoTab, setDaoTab] = useState("proposals");

  const hasEthereum = typeof window !== "undefined" && !!window.ethereum;

  // Effective state (real or mock)
  const useMock = wallet.isMock || (!wallet.isConnected && !hasEthereum);
  const isConnected = wallet.isConnected || useMock;
  const address = wallet.isConnected
    ? wallet.address
    : useMock
      ? MOCK_WALLET_DATA.connected.address
      : null;
  const chainId = wallet.isConnected
    ? wallet.chainId
    : useMock
      ? MOCK_WALLET_DATA.connected.chainId
      : null;
  const balance = wallet.ctcBalance ?? (useMock ? MOCK_WALLET_DATA.connected.balance : null);
  const chainName = chainId ? getChainName(chainId) : null;

  const handleCopy = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  // Mock NFTs
  const nfts = MOCK_WALLET_DATA.nfts;
  const proposals = MOCK_WALLET_DATA.daoProposals;
  const oracleVerifications = MOCK_WALLET_DATA.oracleVerifications;

  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      {/* ── Header / Status Banner ── */}
      <div className="border-b border-border bg-card/60 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <Shield className="w-6 h-6 text-primary" />
                Blockchain & Web3
              </h1>
              <p className="text-sm text-muted-foreground">
                <Lock className="w-3 h-3 inline mr-1" />
                HIPAA-aligned: only hashes on-chain, PHI encrypted off-chain
              </p>
            </div>
            <div className="flex items-center gap-3">
              {chainName && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-300 text-emerald-700 dark:text-emerald-300 text-xs font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {chainName}
                </span>
              )}
              <ConnectWalletButton />
            </div>
          </div>

          {/* Status banner — last action */}
          {isConnected && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3 flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2"
            >
              <span className="text-emerald-500">✅</span>
              Screening #8472 minted as NFT — 2 hrs ago
              <a
                href="https://testnet-explorer.creditcoin.org/tx/0x1234abcd"
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-0.5 ml-1"
              >
                View <ExternalLink className="w-3 h-3" />
              </a>
            </motion.div>
          )}
        </div>
      </div>

      {/* ── Main 3-Column Grid ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!isConnected ? (
          <NotConnectedState onConnectMock={() => wallet.connectMock()} />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* ── Left Panel: Wallet & Network ── */}
            <div className="lg:col-span-3 space-y-4">
              <WalletCard
                address={address!}
                balance={balance}
                chainId={chainId!}
                chainName={chainName!}
                isMock={useMock}
                copied={copied}
                onCopy={handleCopy}
              />
              <NetworkCard chainId={chainId!} />
              <StakingCard staking={MOCK_STAKING} isConnected={isConnected} />
              <RecentTransactionsCard />
            </div>

            {/* ── Middle Panel: Screening NFTs ── */}
            <div className="lg:col-span-5 space-y-4">
              <NFTPanel nfts={nfts} chainId={chainId!} />
              <TimelineCard events={MOCK_TIMELINE} />
            </div>

            {/* ── Right Panel: DAO & Governance ── */}
            <div className="lg:col-span-4 space-y-4">
              <DAOPanel
                proposals={proposals}
                oracleVerifications={oracleVerifications}
                treasury={MOCK_TREASURY}
                isConnected={isConnected}
                tab={daoTab}
                onTabChange={setDaoTab}
              />
            </div>
          </div>
        )}

        {/* ── Footer: Contract Links ── */}
        <FooterLinks chainId={chainId ?? 337} />
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Sub-components
// ──────────────────────────────────────────────

function NotConnectedState({ onConnectMock }: { onConnectMock: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
        <Wallet className="w-10 h-10 text-primary" />
      </div>
      <h2 className="text-xl font-bold text-foreground mb-2">Connect your wallet</h2>
      <p className="text-muted-foreground text-sm max-w-md mb-6">
        Connect to view screening certificates, participate in DAO governance, and manage your CTC balance on Creditcoin.
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <ConnectWalletButton />
        <Button variant="outline" onClick={onConnectMock} className="gap-2">
          <Zap className="w-4 h-4" />
          Try Demo Mode
        </Button>
      </div>
    </div>
  );
}

function WalletCard({
  address,
  balance,
  chainId,
  chainName,
  isMock,
  copied,
  onCopy,
}: {
  address: string;
  balance: string | null;
  chainId: number;
  chainName: string;
  isMock: boolean;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Wallet className="w-4 h-4 text-primary" />
            Wallet
          </span>
          {isMock && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 font-medium">
              DEMO
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <p className="text-2xl font-bold text-foreground">
            {balance ?? "—"} <span className="text-sm font-normal text-muted-foreground">CTC</span>
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            ≈ ${balance ? (parseFloat(balance) * 0.15).toFixed(2) : "0.00"} USD
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-muted-foreground truncate flex-1">
            {shortAddr(address)}
          </span>
          <button onClick={onCopy} className="p-1 rounded hover:bg-muted transition-colors" title="Copy address">
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
          </button>
          <a
            href={getBlockExplorerAddressUrl(chainId, address)}
            target="_blank"
            rel="noreferrer"
            className="p-1 rounded hover:bg-muted transition-colors"
            title="View on explorer"
          >
            <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
          </a>
        </div>
      </CardContent>
    </Card>
  );
}

function NetworkCard({ chainId }: { chainId: number }) {
  return (
    <Card>
      <CardContent className="pt-5 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">Network</span>
          <span className="text-xs font-medium text-foreground">{getChainName(chainId)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Block</span>
          <span className="text-xs font-mono text-foreground">#1,234,567</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Gas</span>
          <span className="text-xs font-mono text-foreground">0.1 Gwei</span>
        </div>
      </CardContent>
    </Card>
  );
}

function StakingCard({ staking, isConnected }: { staking: typeof MOCK_STAKING; isConnected: boolean }) {
  return (
    <Card>
      <CardContent className="pt-5 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">Staked PEDISC</span>
          <span className="text-sm font-bold text-foreground">{staking.staked.toLocaleString()}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Voting Power</span>
          <span className="text-sm font-bold text-primary">{staking.votingPower.toLocaleString()}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">APY</span>
          <span className="text-sm font-bold text-emerald-600">{staking.apy}%</span>
        </div>
        {isConnected && (
          <Button variant="outline" size="sm" className="w-full mt-2 text-xs">
            Stake More
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function RecentTransactionsCard() {
  const txs = [
    { hash: "0x1234abcd…", action: "Mint NFT #8472", time: "2h ago" },
    { hash: "0x5678efgh…", action: "DAO Vote #1", time: "5h ago" },
    { hash: "0x9abcijkl…", action: "Stake 250 PEDISC", time: "1d ago" },
  ];
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs text-muted-foreground">Recent Transactions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {txs.map((tx, i) => (
          <div key={i} className="flex items-center justify-between text-xs">
            <div>
              <p className="font-medium text-foreground">{tx.action}</p>
              <p className="font-mono text-muted-foreground text-[10px]">{tx.hash}</p>
            </div>
            <span className="text-muted-foreground">{tx.time}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ── NFT Panel ──

function NFTPanel({ nfts, chainId }: { nfts: typeof MOCK_WALLET_DATA.nfts; chainId: number }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            Your Screening Certificates
            <span className="text-xs font-normal bg-primary/10 text-primary px-2 py-0.5 rounded-full">
              {nfts.length}
            </span>
          </CardTitle>
          <Link to="/pediscreen/blockchain-kaggle">
            <Button variant="ghost" size="sm" className="text-xs gap-1">
              Full Demo <ChevronRight className="w-3 h-3" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {nfts.map((nft) => {
            const badge = riskBadge(nft.riskLevel);
            return (
              <motion.div
                key={nft.tokenId}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ y: -2 }}
                className="rounded-xl border border-border bg-card p-4 hover:shadow-md transition-all"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className={cn("inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border", badge.cls)}>
                    {badge.icon} {nft.riskLevel}
                  </span>
                  <span className="text-sm font-bold text-foreground">{nft.childAgeMonths}mo</span>
                </div>

                <div className="mb-3">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                    <span>Confidence</span>
                    <span className="font-bold text-foreground">{Math.round(nft.confidence * 100)}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${nft.confidence * 100}%` }}
                      transition={{ duration: 0.8, delay: 0.2 }}
                      className={cn(
                        "h-full rounded-full",
                        nft.confidence > 0.9 ? "bg-emerald-500" : nft.confidence > 0.7 ? "bg-amber-500" : "bg-red-500"
                      )}
                    />
                  </div>
                </div>

                <div className="text-[10px] text-muted-foreground space-y-0.5">
                  <p>
                    {new Date(nft.timestamp ?? Date.now()).toLocaleDateString()} •{" "}
                    {nft.verified ? (
                      <span className="text-emerald-600">✓ Verified</span>
                    ) : (
                      <span className="text-amber-600">⏳ Pending</span>
                    )}
                  </p>
                  <div className="flex items-center justify-between pt-1">
                    <span className="font-mono">Token #{nft.tokenId}</span>
                    <a
                      href={`https://testnet-explorer.creditcoin.org/token/0x742d35Cc6b6DBcF823d80ADa7017a40A9D0e6637?a=${nft.tokenId}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-0.5 text-primary hover:underline"
                    >
                      Explorer <ArrowUpRight className="w-2.5 h-2.5" />
                    </a>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {nfts.length === 0 && (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground mb-3">No screening certificates yet</p>
            <Link to="/pediscreen/blockchain-kaggle">
              <Button className="gap-2">
                <Zap className="w-4 h-4" /> Mint Your First Screening
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TimelineCard({ events }: { events: typeof MOCK_TIMELINE }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs text-muted-foreground">On-Chain Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {events.map((e, i) => (
            <div key={i} className="flex items-start gap-3">
              <span className="text-sm mt-0.5" aria-hidden>{e.icon}</span>
              <div className="flex-1">
                <p className="text-xs font-medium text-foreground">{e.text}</p>
                <p className="text-[10px] text-muted-foreground">{e.time}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ── DAO Panel ──

function DAOPanel({
  proposals,
  oracleVerifications,
  treasury,
  isConnected,
  tab,
  onTabChange,
}: {
  proposals: typeof MOCK_WALLET_DATA.daoProposals;
  oracleVerifications: typeof MOCK_WALLET_DATA.oracleVerifications;
  treasury: typeof MOCK_TREASURY;
  isConnected: boolean;
  tab: string;
  onTabChange: (t: string) => void;
}) {
  return (
    <Card className="h-fit">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Landmark className="w-4 h-4 text-primary" />
          DAO & Governance
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={tab} onValueChange={onTabChange}>
          <TabsList className="w-full grid grid-cols-3 mb-4">
            <TabsTrigger value="proposals" className="text-xs">Proposals</TabsTrigger>
            <TabsTrigger value="oracle" className="text-xs">Oracle</TabsTrigger>
            <TabsTrigger value="treasury" className="text-xs">Treasury</TabsTrigger>
          </TabsList>

          <TabsContent value="proposals" className="space-y-3 mt-0">
            {proposals.map((p) => {
              const supportPct = Math.min((p.support / p.quorum) * 100, 100);
              const isActive = p.status === "active";
              return (
                <div key={p.id} className="rounded-lg border border-border p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-xs font-semibold text-foreground leading-tight">
                      #{p.id} {p.title}
                    </h4>
                    <span
                      className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded-full font-bold shrink-0",
                        isActive
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                          : p.status === "passed"
                            ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                            : "bg-red-100 text-red-700"
                      )}
                    >
                      {p.status.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground line-clamp-2">{p.description}</p>
                  <div>
                    <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                      <span>For: {p.support.toLocaleString()}</span>
                      <span>Against: {p.against.toLocaleString()}</span>
                    </div>
                    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${supportPct}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                      <span>Quorum: {p.quorum.toLocaleString()}</span>
                      <span>
                        {p.endTimestamp > Date.now()
                          ? `Ends ${new Date(p.endTimestamp).toLocaleDateString()}`
                          : "Closed"}
                      </span>
                    </div>
                  </div>
                  {isConnected && isActive && p.endTimestamp > Date.now() && (
                    <div className="flex gap-2 pt-1">
                      <Button size="sm" className="flex-1 text-[10px] h-7 bg-emerald-600 hover:bg-emerald-700">
                        Vote FOR
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1 text-[10px] h-7">
                        Vote AGAINST
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
            <Link to="/pediscreen/dao">
              <Button variant="ghost" size="sm" className="w-full text-xs gap-1">
                Full Governance <ChevronRight className="w-3 h-3" />
              </Button>
            </Link>
          </TabsContent>

          <TabsContent value="oracle" className="space-y-3 mt-0">
            <div className="flex items-center gap-2 text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-medium text-foreground">Creditcoin USC Oracle — Active</span>
            </div>
            <p className="text-[10px] text-muted-foreground">
              ⚡ Automated AI verification without Chainlink — {oracleVerifications.length} attestations
            </p>
            {oracleVerifications.map((v, i) => (
              <div key={i} className="rounded-lg border border-border p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-foreground">
                    Screening #{v.screeningTokenId}
                  </span>
                  <span
                    className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded-full font-bold",
                      v.oracleMatch
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                        : "bg-red-100 text-red-700"
                    )}
                  >
                    {v.oracleMatch ? "✅ MATCH" : "❌ MISMATCH"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>Confidence: {v.confidenceMatch}%</span>
                  <span>{new Date(v.timestamp).toLocaleTimeString()}</span>
                </div>
                <p className="text-[10px] text-muted-foreground">{v.oracleNode}</p>
              </div>
            ))}
            <p className="text-[10px] text-muted-foreground">Dispute rate: <span className="text-emerald-600 font-medium">0.2%</span></p>
            <Link to="/pediscreen/oracle-dashboard">
              <Button variant="ghost" size="sm" className="w-full text-xs gap-1">
                Full Oracle Dashboard <ChevronRight className="w-3 h-3" />
              </Button>
            </Link>
          </TabsContent>

          <TabsContent value="treasury" className="space-y-3 mt-0">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-[10px] text-muted-foreground">Total Funds</p>
                <p className="text-lg font-bold text-foreground">{treasury.totalFunds} <span className="text-xs font-normal">USDC</span></p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-[10px] text-muted-foreground">Pending</p>
                <p className="text-lg font-bold text-amber-600">{treasury.pendingWithdrawals} <span className="text-xs font-normal">USDC</span></p>
              </div>
            </div>
            <div>
              <p className="text-[10px] font-medium text-muted-foreground mb-2">Recent CHW Payouts</p>
              {treasury.recentPayouts.map((p, i) => (
                <div key={i} className="flex items-center justify-between text-xs py-1.5 border-b border-border last:border-0">
                  <span className="text-foreground">{p.to}</span>
                  <div className="text-right">
                    <span className="font-medium text-foreground">{p.amount}</span>
                    <span className="text-[10px] text-muted-foreground ml-1">{p.date}</span>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

// ── Footer Links ──

function FooterLinks({ chainId }: { chainId: number }) {
  const explorerBase = chainId === 336
    ? "https://explorer.creditcoin.org"
    : "https://testnet-explorer.creditcoin.org";

  const links = [
    { label: "Registry", path: "/token/0x742d...6637" },
    { label: "Oracle", path: "/address/0x8Ba1...BA72" },
    { label: "DAO", path: "/address/0xAb58...eC9B" },
    { label: "PEDISC Token", path: "/token/0x9012...ijkl" },
  ];

  return (
    <div className="mt-12 border-t border-border pt-6 pb-8">
      <div className="flex flex-wrap items-center justify-between gap-4 text-[10px] text-muted-foreground">
        <div className="flex flex-wrap items-center gap-4">
          <span>🔗 Contracts:</span>
          {links.map((l) => (
            <a
              key={l.label}
              href={`${explorerBase}${l.path}`}
              target="_blank"
              rel="noreferrer"
              className="hover:text-primary hover:underline transition-colors"
            >
              {l.label}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-4">
          <Link to="/pediscreen/blockchain-kaggle" className="hover:text-primary hover:underline">
            Creditcoin Demo Flow
          </Link>
          <Link to="/pediscreen/healthchain" className="hover:text-primary hover:underline">
            HealthChain POC
          </Link>
          <a
            href="https://github.com/PediScreen"
            target="_blank"
            rel="noreferrer"
            className="hover:text-primary hover:underline"
          >
            GitHub ↗
          </a>
        </div>
      </div>
    </div>
  );
}

export default BlockchainPage;
