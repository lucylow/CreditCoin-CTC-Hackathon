/**
 * Federated Learning Dashboard — privacy-first model training with $PEDI rewards on Creditcoin.
 * Three-column layout: sidebar nav, main content, right panel (rewards/clients/activity).
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Lock,
  Cpu,
  Coins,
  Shield,
  Users,
  FileText,
  Gift,
  BookOpen,
  Home,
  ArrowUpRight,
  RefreshCw,
  CheckCircle,
  Clock,
  AlertCircle,
  Zap,
  Database,
  TrendingUp,
  Activity,
  ChevronRight,
  Hash,
  Send,
  PanelLeftClose,
  PanelLeftOpen,
  Eye,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useFedLearning } from "@/hooks/useFedLearning";
import { usePediScreenWallet } from "@/hooks/usePediScreenWallet";
import { ConnectWalletButton } from "@/components/blockchain/ConnectWalletButton";
import { MOCK_WALLET_DATA } from "@/data/mockWallet";
import { getChainName } from "@/config/blockchain";
import { toast } from "sonner";

// ── Mock data ──

const MOCK_ROUND = { number: 7, endsIn: "3 days", participants: 42, totalDataPoints: 18400 };

const MOCK_REWARDS = {
  totalEarned: 1250,
  pending: 250,
  history: [
    { round: 7, earned: 250, status: "pending" },
    { round: 6, earned: 340, status: "claimed" },
    { round: 5, earned: 280, status: "claimed" },
    { round: 4, earned: 380, status: "claimed" },
  ],
};

const MOCK_CLIENTS = [
  { id: "0x742d…6637", name: "Hospital A", dataPoints: 1200, pedi: 12000, active: true },
  { id: "0x8Ba1…BA72", name: "CHW Network B", dataPoints: 850, pedi: 8500, active: true },
  { id: "0xAb58…eC9B", name: "Clinic C", dataPoints: 620, pedi: 6200, active: true },
  { id: "0x9012…ijkl", name: "Research Lab D", dataPoints: 430, pedi: 4300, active: false },
];

const MOCK_ACTIVITY = [
  { time: "13:42", client: "0x742d…6637", points: 150, tx: "0xabcd…ef12" },
  { time: "13:38", client: "0x8Ba1…BA72", points: 200, tx: "0xef12…3456" },
  { time: "13:15", client: "0xAb58…eC9B", points: 80, tx: "0x7890…abcd" },
  { time: "12:50", client: "0x742d…6637", points: 120, tx: "0x3456…7890" },
  { time: "12:30", client: "0x9012…ijkl", points: 95, tx: "0x1234…5678" },
];

const MOCK_SUBMISSIONS = [
  { round: 7, hash: "0xa1b2c3d4…", points: 124, reward: 1240, time: "2 hrs ago", status: "confirmed" },
  { round: 7, hash: "0xe5f6g7h8…", points: 86, reward: 860, time: "5 hrs ago", status: "confirmed" },
  { round: 6, hash: "0xi9j0k1l2…", points: 130, reward: 1300, time: "2 days ago", status: "confirmed" },
];

type SidebarTab = "dashboard" | "clients" | "submissions" | "rewards" | "docs";

const FederatedLearningPage = () => {
  const [activeTab, setActiveTab] = useState<SidebarTab>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const wallet = usePediScreenWallet();
  const fedLearning = useFedLearning();

  const useMock = wallet.isMock || !wallet.isConnected;
  const isConnected = wallet.isConnected || useMock;
  const address = wallet.address ?? MOCK_WALLET_DATA.connected.address;
  const chainId = wallet.chainId ?? 337;
  const chainName = getChainName(chainId);

  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      {/* ── Header ── */}
      <div className="border-b border-border bg-card/60 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <Cpu className="w-6 h-6 text-primary" />
                Federated Learning
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-300 text-amber-700 dark:text-amber-300 font-medium">
                  🔥 Privacy-First
                </span>
              </h1>
              <p className="text-sm text-muted-foreground">
                <Lock className="w-3 h-3 inline mr-1" />
                No raw data leaves your device — only encrypted gradient hashes are aggregated
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-300 text-emerald-700 dark:text-emerald-300 text-xs font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {chainName}
              </span>
              <ConnectWalletButton />
            </div>
          </div>

          {/* Round status banner */}
          {isConnected && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3 flex items-center justify-between text-xs bg-primary/5 border border-primary/10 rounded-lg px-3 py-2"
            >
              <span className="text-muted-foreground flex items-center gap-2">
                <Activity className="w-3.5 h-3.5 text-primary" />
                <strong className="text-foreground">Round #{MOCK_ROUND.number}</strong> — {MOCK_ROUND.endsIn} left to submit gradients
              </span>
              <span className="text-muted-foreground">
                {MOCK_ROUND.participants} participants • {MOCK_ROUND.totalDataPoints.toLocaleString()} data points
              </span>
            </motion.div>
          )}
        </div>
      </div>

      {/* ── Main Layout ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {!isConnected ? (
          <NotConnectedState onConnectMock={() => wallet.connectMock()} />
        ) : (
          <div className="flex gap-6">
            {/* ── Left Sidebar (retractable) ── */}
            <motion.aside
              initial={false}
              animate={{ width: sidebarOpen ? 180 : 48 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="hidden lg:flex flex-col shrink-0 overflow-hidden"
            >
              <div className="sticky top-32 space-y-1">
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="w-full flex items-center justify-center p-2 mb-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
                >
                  {sidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
                </button>
                {([
                  { id: "dashboard", icon: Home, label: "Dashboard" },
                  { id: "clients", icon: Cpu, label: "My Clients" },
                  { id: "submissions", icon: Send, label: "Submissions" },
                  { id: "rewards", icon: Gift, label: "Rewards" },
                  { id: "docs", icon: BookOpen, label: "Documentation" },
                ] as const).map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    title={item.label}
                    className={cn(
                      "w-full flex items-center gap-2.5 rounded-lg text-sm font-medium transition-colors",
                      sidebarOpen ? "px-3 py-2.5" : "justify-center px-0 py-2.5",
                      activeTab === item.id
                        ? "bg-primary/10 text-primary border-l-2 border-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <item.icon className="w-4 h-4 shrink-0" />
                    {sidebarOpen && (
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="truncate"
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </button>
                ))}
              </div>
            </motion.aside>

            {/* ── Main Content ── */}
            <main className="flex-1 min-w-0 space-y-6">
              <AnimatePresence mode="wait">
                {activeTab === "dashboard" && <DashboardView key="dashboard" fedLearning={fedLearning} />}
                {activeTab === "clients" && <ClientsView key="clients" />}
                {activeTab === "submissions" && <SubmissionsView key="submissions" />}
                {activeTab === "rewards" && <RewardsDetailView key="rewards" />}
                {activeTab === "docs" && <DocsView key="docs" />}
              </AnimatePresence>
            </main>

            {/* ── Right Panel ── */}
            <aside className="hidden lg:block w-80 shrink-0 space-y-4">
              <RewardsCard />
              <ActiveClientsCard />
              <ActivityFeedCard />
            </aside>
          </div>
        )}

        <FedFooter chainId={chainId} />
      </div>
    </div>
  );
};

// ── Dashboard View ──

function DashboardView({ fedLearning }: { fedLearning: ReturnType<typeof useFedLearning> }) {
  const [datapoints, setDatapoints] = useState("124");
  const [gradientHash, setGradientHash] = useState("");
  const [generating, setGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const handleGenerate = async () => {
    setGenerating(true);
    await new Promise((r) => setTimeout(r, 2000));
    const hash = `0x${Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`;
    setGradientHash(hash);
    setGenerating(false);
    toast.success("Local training complete", { description: "Gradient hash generated." });
  };

  const handleSubmit = async () => {
    const count = parseInt(datapoints) || 0;
    if (!count || !gradientHash) return;
    const ok = await fedLearning.submitGradients(gradientHash, count);
    if (ok) {
      toast.success("Gradients submitted!", { description: `${count} data points anchored on Creditcoin.` });
      setGradientHash("");
      setShowPreview(false);
    } else {
      toast.error("Submission failed", { description: fedLearning.error || "Try again." });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6"
    >
      {/* Privacy explainer */}
      <Card>
        <CardContent className="pt-6">
          <h2 className="text-lg font-semibold text-foreground mb-2">Contribute to Pediatric AI — Privately</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Train the AI model on your local data. <strong>No raw data ever leaves your device</strong> — only encrypted gradient hashes are aggregated. Differential privacy (ε=1.0) ensures your data remains anonymous.
          </p>

          {/* Flow diagram */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {[
              { step: "1", label: "Local Data", icon: Database },
              { step: "2", label: "Encrypt Gradients", icon: Lock },
              { step: "3", label: "Submit Hash", icon: Hash },
              { step: "4", label: "Earn $PEDI", icon: Coins },
            ].map((s, i) => (
              <div key={s.step} className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 bg-primary/5 border border-primary/10 rounded-lg px-3 py-2">
                  <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                    {s.step}
                  </div>
                  <s.icon className="w-3.5 h-3.5 text-primary" />
                  <span className="text-foreground font-medium">{s.label}</span>
                </div>
                {i < 3 && <ChevronRight className="w-3 h-3 text-muted-foreground" />}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Client status */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Cpu className="w-4 h-4 text-primary" />
            Your Training Client
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-[10px] text-muted-foreground">Status</p>
              <p className="text-sm font-medium text-emerald-600 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Registered
              </p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-[10px] text-muted-foreground">Current Round</p>
              <p className="text-sm font-bold text-foreground">#{fedLearning.currentRound ?? MOCK_ROUND.number}</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-[10px] text-muted-foreground">Total Submissions</p>
              <p className="text-sm font-bold text-foreground">3</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-[10px] text-muted-foreground">Model Version</p>
              <p className="text-sm font-mono text-foreground">fl-v2.1</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Submit gradients */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Send className="w-4 h-4 text-primary" />
            Submit Your Gradients
          </CardTitle>
          <CardDescription>
            Run local training on your data, then submit the gradient hash to Creditcoin.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="datapoints" className="text-xs">Data Points (local samples used)</Label>
              <Input
                id="datapoints"
                type="number"
                min={1}
                value={datapoints}
                onChange={(e) => setDatapoints(e.target.value)}
                placeholder="e.g., 124"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Gradient Hash</Label>
              <div className="flex gap-2">
                <Input
                  value={gradientHash}
                  onChange={(e) => setGradientHash(e.target.value)}
                  placeholder="Hash will appear after training"
                  className="font-mono text-xs"
                  readOnly={!!gradientHash}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGenerate}
                  disabled={generating}
                  className="shrink-0 text-xs"
                >
                  {generating ? (
                    <span className="flex items-center gap-1">
                      <RefreshCw className="w-3 h-3 animate-spin" /> Training…
                    </span>
                  ) : (
                    "Run Training"
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Preview */}
          {gradientHash && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="bg-muted/50 rounded-lg p-3 text-xs space-y-1 border border-border"
            >
              <p className="font-medium text-foreground">Submission Preview</p>
              <p className="text-muted-foreground">Hash: <span className="font-mono text-foreground">{gradientHash}</span></p>
              <p className="text-muted-foreground">Data points: <span className="text-foreground">{datapoints}</span></p>
              <p className="text-muted-foreground">
                Estimated reward: <span className="font-bold text-amber-600">{(parseInt(datapoints) || 0) * 10} $PEDI</span>
              </p>
              <p className="text-muted-foreground">Chain: <span className="text-primary">Creditcoin Testnet</span></p>
            </motion.div>
          )}

          <div className="flex gap-3">
            <Button
              onClick={handleSubmit}
              disabled={fedLearning.loading || !gradientHash || !parseInt(datapoints)}
              className="gap-2"
            >
              {fedLearning.loading ? "Submitting…" : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  Submit to Creditcoin
                </>
              )}
            </Button>
          </div>

          {fedLearning.error && (
            <p className="text-destructive text-xs flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {fedLearning.error}
            </p>
          )}

          {/* Submission progress */}
          <div className="pt-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>Your contributions this round</span>
              <span className="font-medium text-foreground">3 / ∞</span>
            </div>
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: "60%" }}
                transition={{ duration: 1 }}
                className="h-full bg-primary rounded-full"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ── Clients View ──

function ClientsView() {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">My Registered Clients</h2>
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4 mb-4 p-3 bg-emerald-500/5 border border-emerald-300/30 rounded-lg">
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <Cpu className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-foreground text-sm">Primary Client</p>
              <p className="font-mono text-[10px] text-muted-foreground">{MOCK_WALLET_DATA.connected.address}</p>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-semibold">Active</span>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-lg font-bold text-foreground">340</p>
              <p className="text-[10px] text-muted-foreground">Data Points</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-lg font-bold text-foreground">3</p>
              <p className="text-[10px] text-muted-foreground">Submissions</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-lg font-bold text-amber-600">3,400</p>
              <p className="text-[10px] text-muted-foreground">$PEDI Earned</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6 text-center text-sm text-muted-foreground py-8">
          <Cpu className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" />
          <p>Register additional training clients from other devices.</p>
          <Button variant="outline" size="sm" className="mt-3 gap-1">
            <Zap className="w-3.5 h-3.5" /> Register New Client
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ── Submissions View ──

function SubmissionsView() {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">Submission History</h2>
      <div className="space-y-3">
        {MOCK_SUBMISSIONS.map((s, i) => (
          <Card key={i}>
            <CardContent className="pt-5">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-medium text-foreground">{s.hash}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-semibold">
                      ✓ {s.status}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Round #{s.round} • {s.points} data points • {s.time}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-amber-600 text-sm">+{s.reward} $PEDI</p>
                  <a
                    href="https://testnet-explorer.creditcoin.org/tx/0x1234"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] text-primary hover:underline inline-flex items-center gap-0.5"
                  >
                    View tx <ArrowUpRight className="w-2.5 h-2.5" />
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </motion.div>
  );
}

// ── Rewards Detail View ──

function RewardsDetailView() {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">$PEDI Rewards</h2>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-5 text-center">
            <p className="text-3xl font-bold text-amber-600">{MOCK_REWARDS.totalEarned.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Total $PEDI Earned</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 text-center">
            <p className="text-3xl font-bold text-foreground">{MOCK_REWARDS.pending}</p>
            <p className="text-xs text-muted-foreground">Pending (current round)</p>
            <Button size="sm" className="mt-2 text-xs gap-1" disabled={MOCK_REWARDS.pending === 0}>
              <Gift className="w-3 h-3" /> Claim
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Reward History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {MOCK_REWARDS.history.map((h, i) => (
              <div key={i} className="flex items-center justify-between text-xs py-2 border-b border-border last:border-0">
                <span className="text-muted-foreground">Round #{h.round}</span>
                <span className="font-bold text-amber-600">+{h.earned} $PEDI</span>
                <span className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded-full font-semibold",
                  h.status === "claimed"
                    ? "bg-emerald-500/10 text-emerald-600"
                    : "bg-amber-500/10 text-amber-600"
                )}>
                  {h.status}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <p className="text-[10px] text-muted-foreground text-center">
        10 $PEDI per data point. Rewards distributed after each round ends.
      </p>
    </motion.div>
  );
}

// ── Docs View ──

function DocsView() {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">Documentation</h2>
      <Card>
        <CardContent className="pt-6 space-y-4">
          {[
            { title: "Getting Started", desc: "Set up your training client and connect your wallet.", link: "#" },
            { title: "Privacy & Differential Privacy", desc: "How ε=1.0 differential privacy protects your data.", link: "#" },
            { title: "FedAvg Aggregation", desc: "How gradient hashes are aggregated across clients.", link: "#" },
            { title: "Smart Contracts", desc: "FedCoordinator and PEDISC token on Creditcoin EVM.", link: "#" },
          ].map((d) => (
            <a
              key={d.title}
              href={d.link}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors group"
            >
              <BookOpen className="w-4 h-4 text-primary shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{d.title}</p>
                <p className="text-xs text-muted-foreground">{d.desc}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </a>
          ))}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ── Right Panel Cards ──

function RewardsCard() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Coins className="w-4 h-4 text-amber-500" />
          Your $PEDI Rewards
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-center py-2">
          <p className="text-3xl font-bold text-amber-600">{MOCK_REWARDS.totalEarned.toLocaleString()}</p>
          <p className="text-[10px] text-muted-foreground">Total $PEDI earned</p>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Pending</span>
          <span className="font-bold text-foreground">{MOCK_REWARDS.pending} $PEDI</span>
        </div>
        <Button size="sm" className="w-full gap-1 text-xs" disabled={MOCK_REWARDS.pending === 0}>
          <Gift className="w-3 h-3" /> Claim Rewards
        </Button>
        <p className="text-[10px] text-muted-foreground text-center">10 $PEDI per data point</p>

        {/* Mini chart */}
        <div className="pt-2">
          <p className="text-[10px] text-muted-foreground mb-1">Earnings by round</p>
          <div className="flex items-end gap-1 h-12">
            {MOCK_REWARDS.history.slice().reverse().map((h, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${(h.earned / 400) * 100}%` }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className="w-full bg-amber-500/30 rounded-t"
                />
                <span className="text-[8px] text-muted-foreground">R{h.round}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ActiveClientsCard() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          Active Clients
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {MOCK_CLIENTS.filter((c) => c.active).map((c) => (
          <div key={c.id} className="flex items-center justify-between text-xs py-1.5 border-b border-border last:border-0">
            <div>
              <p className="font-medium text-foreground">{c.name}</p>
              <p className="font-mono text-[10px] text-muted-foreground">{c.id}</p>
            </div>
            <div className="text-right">
              <p className="text-foreground">{c.dataPoints.toLocaleString()} pts</p>
              <p className="text-amber-600 text-[10px] font-medium">{c.pedi.toLocaleString()} $PEDI</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function ActivityFeedCard() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          Live Submissions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {MOCK_ACTIVITY.map((a, i) => (
          <div key={i} className="flex items-start gap-2 text-xs">
            <span className="text-muted-foreground text-[10px] w-10 shrink-0">[{a.time}]</span>
            <div className="flex-1">
              <span className="font-mono text-foreground">{a.client}</span>
              <span className="text-muted-foreground"> submitted {a.points} pts</span>
            </div>
            <a
              href={`https://testnet-explorer.creditcoin.org/tx/${a.tx}`}
              target="_blank"
              rel="noreferrer"
              className="text-primary hover:underline text-[10px] font-mono shrink-0"
            >
              {a.tx}
            </a>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ── Not Connected ──

function NotConnectedState({ onConnectMock }: { onConnectMock: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
        <Cpu className="w-10 h-10 text-primary" />
      </div>
      <h2 className="text-xl font-bold text-foreground mb-2">Join Federated Learning</h2>
      <p className="text-muted-foreground text-sm max-w-md mb-6">
        Connect your wallet to register as a training client, submit gradient hashes, and earn $PEDI rewards on Creditcoin.
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <ConnectWalletButton />
        <Button variant="outline" onClick={onConnectMock} className="gap-2">
          <Zap className="w-4 h-4" /> Try Demo Mode
        </Button>
      </div>
    </div>
  );
}

// ── Footer ──

function FedFooter({ chainId }: { chainId: number }) {
  const explorerBase = chainId === 336
    ? "https://explorer.creditcoin.org"
    : "https://testnet-explorer.creditcoin.org";

  return (
    <div className="mt-12 border-t border-border pt-6 pb-8">
      <div className="flex flex-wrap items-center justify-between gap-4 text-[10px] text-muted-foreground">
        <div className="flex flex-wrap items-center gap-4">
          <span>🔧 FedCoordinator:</span>
          <a href={`${explorerBase}/address/0x742d35Cc`} target="_blank" rel="noreferrer" className="font-mono hover:text-primary hover:underline">
            0x742d…6637 (verified)
          </a>
          <span>💵 $PEDI Token:</span>
          <a href={`${explorerBase}/token/0xabcd`} target="_blank" rel="noreferrer" className="font-mono hover:text-primary hover:underline">
            0xabcd…efgh
          </a>
        </div>
        <a href="https://github.com/PediScreen" target="_blank" rel="noreferrer" className="hover:text-primary hover:underline">
          GitHub ↗
        </a>
      </div>
    </div>
  );
}

export default FederatedLearningPage;
