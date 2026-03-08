/**
 * Federated Learning Dashboard — privacy-first model training with $PEDI rewards on Creditcoin.
 * Deep Creditcoin integrations: USC verification, dual-chain anchoring, Credal reputation, DePIN IoT.
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
  Layers,
  Link2,
  Award,
  Radio,
  Wifi,
  WifiOff,
  Globe,
  ShieldCheck,
  Star,
  Badge,
  UserPlus,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useFedLearning } from "@/hooks/useFedLearning";
import type { UseFedLearningResult } from "@/hooks/useFedLearning";
import { usePediScreenWallet } from "@/hooks/usePediScreenWallet";
import { useUSCVerifications, useDualChainAnchors, useCHWReputations, useDePINDevices, useDePINStats } from "@/hooks/useCreditcoinData";
import { ConnectWalletButton } from "@/components/blockchain/ConnectWalletButton";
import { MOCK_WALLET_DATA } from "@/data/mockWallet";
import { getChainName } from "@/config/blockchain";
import { creditcoinService } from "@/lib/blockchain/mockService";
import { toast } from "sonner";

// ── Mock data (static, for sidebar panels) ──

const MOCK_ROUND = { number: 7, endsIn: "3 days", participants: 42, totalDataPoints: 18400 };

const MOCK_CLIENTS = [
  { id: "0x742d…6637", name: "Hospital A", dataPoints: 1200, pedi: 12000, active: true },
  { id: "0x8Ba1…BA72", name: "CHW Network B", dataPoints: 850, pedi: 8500, active: true },
  { id: "0xAb58…eC9B", name: "Clinic C", dataPoints: 620, pedi: 6200, active: true },
  { id: "0x9012…ijkl", name: "Research Lab D", dataPoints: 430, pedi: 4300, active: false },
];

const MOCK_ACTIVITY_INITIAL = [
  { time: "13:42", client: "Hospital A", points: 150, tx: "0xabcd…ef12" },
  { time: "13:38", client: "CHW Network B", points: 200, tx: "0xef12…3456" },
  { time: "13:15", client: "Clinic C", points: 80, tx: "0x7890…abcd" },
  { time: "12:50", client: "Hospital A", points: 120, tx: "0x3456…7890" },
  { time: "12:30", client: "Research Lab D", points: 95, tx: "0x1234…5678" },
];

type SidebarTab = "dashboard" | "clients" | "submissions" | "rewards" | "usc" | "dualchain" | "credal" | "depin" | "docs";

const FederatedLearningPage = () => {
  const [activeTab, setActiveTab] = useState<SidebarTab>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const wallet = usePediScreenWallet();
  const fedLearning = useFedLearning();
  const [activityFeed, setActivityFeed] = useState(MOCK_ACTIVITY_INITIAL);

  const useMock = wallet.isMock || !wallet.isConnected;
  const isConnected = wallet.isConnected || useMock;
  const address = wallet.address ?? MOCK_WALLET_DATA.connected.address;
  const chainId = wallet.chainId ?? 337;
  const chainName = getChainName(chainId);

  // When a submission happens, add to activity feed
  const addActivity = (points: number) => {
    const now = new Date();
    const time = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
    const hash = `0x${Array.from({ length: 4 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}…${Array.from({ length: 4 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`;
    setActivityFeed((prev) => [{ time, client: "You", points, tx: hash }, ...prev].slice(0, 15));
  };

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
                {fedLearning.isMock && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 border border-primary/30 text-primary font-medium">
                    Demo Mode
                  </span>
                )}
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
                <strong className="text-foreground">Round #{fedLearning.currentRound ?? MOCK_ROUND.number}</strong> — {MOCK_ROUND.endsIn} left to submit gradients
              </span>
              <span className="text-muted-foreground">
                {MOCK_ROUND.participants} participants • {(MOCK_ROUND.totalDataPoints + fedLearning.totalDataPoints).toLocaleString()} data points
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
          <div className="flex gap-6 relative">
            {/* Show menu button — visible when sidebar is hidden */}
            {!sidebarOpen && (
              <motion.button
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={() => setSidebarOpen(true)}
                className="hidden lg:flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shadow-sm shrink-0 self-start sticky top-32"
              >
                <PanelLeftOpen className="w-4 h-4" />
                <span>Menu</span>
              </motion.button>
            )}

            {/* ── Left Sidebar (fully hideable) ── */}
            <AnimatePresence initial={false}>
              {sidebarOpen && (
                <motion.aside
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 190, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  className="hidden lg:flex flex-col shrink-0 overflow-hidden"
                >
                  <div className="sticky top-32 space-y-1">
                    {([
                      { id: "dashboard", icon: Home, label: "Dashboard" },
                      { id: "clients", icon: Cpu, label: "My Clients" },
                      { id: "submissions", icon: Send, label: "Submissions" },
                      { id: "rewards", icon: Gift, label: "Rewards" },
                      { id: "usc", icon: ShieldCheck, label: "USC Verify" },
                      { id: "dualchain", icon: Layers, label: "Dual-Chain" },
                      { id: "credal", icon: Award, label: "CHW Reputation" },
                      { id: "depin", icon: Radio, label: "DePIN IoT" },
                      { id: "docs", icon: BookOpen, label: "Documentation" },
                    ] as const).map((item) => (
                      <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        title={item.label}
                        className={cn(
                          "w-full flex items-center gap-2.5 rounded-lg text-sm font-medium transition-colors px-3 py-2.5 whitespace-nowrap",
                          activeTab === item.id
                            ? "bg-primary/10 text-primary border-l-2 border-primary"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                      >
                        <item.icon className="w-4 h-4 shrink-0" />
                        <span>{item.label}</span>
                      </button>
                    ))}

                    {/* Hide menu button at bottom */}
                    <div className="pt-4 border-t border-border mt-4">
                      <button
                        onClick={() => setSidebarOpen(false)}
                        className="w-full flex items-center gap-2.5 rounded-lg text-sm font-medium px-3 py-2.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors whitespace-nowrap"
                      >
                        <PanelLeftClose className="w-4 h-4 shrink-0" />
                        <span>Hide Menu</span>
                      </button>
                    </div>
                  </div>
                </motion.aside>
              )}
            </AnimatePresence>

            {/* ── Main Content ── */}
            <main className="flex-1 min-w-0 space-y-6">
              <AnimatePresence mode="wait">
                {activeTab === "dashboard" && <DashboardView key="dashboard" fedLearning={fedLearning} onSubmit={addActivity} />}
                {activeTab === "clients" && <ClientsView key="clients" fedLearning={fedLearning} />}
                {activeTab === "submissions" && <SubmissionsView key="submissions" fedLearning={fedLearning} />}
                {activeTab === "rewards" && <RewardsDetailView key="rewards" fedLearning={fedLearning} />}
                {activeTab === "usc" && <USCVerificationView key="usc" />}
                {activeTab === "dualchain" && <DualChainView key="dualchain" />}
                {activeTab === "credal" && <CredalReputationView key="credal" />}
                {activeTab === "depin" && <DePINView key="depin" />}
                {activeTab === "docs" && <DocsView key="docs" />}
              </AnimatePresence>
            </main>

            {/* ── Right Panel ── */}
            <aside className="hidden lg:block w-80 shrink-0 space-y-4">
              <RewardsCard fedLearning={fedLearning} />
              <ActiveClientsCard />
              <ActivityFeedCard feed={activityFeed} />
            </aside>
          </div>
        )}

        <FedFooter chainId={chainId} />
      </div>
    </div>
  );
};

// ── Dashboard View ──

function DashboardView({ fedLearning, onSubmit }: { fedLearning: UseFedLearningResult; onSubmit: (pts: number) => void }) {
  const [datapoints, setDatapoints] = useState("124");
  const [gradientHash, setGradientHash] = useState("");
  const [generating, setGenerating] = useState(false);

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
      toast.success("Gradients submitted!", { description: `${count} data points → +${count * 10} $PEDI on Creditcoin.` });
      onSubmit(count);
      setGradientHash("");
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
              <p className="text-sm font-bold text-foreground">{fedLearning.submissions.length}</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-[10px] text-muted-foreground">Total Data Points</p>
              <p className="text-sm font-bold text-foreground">{fedLearning.totalDataPoints.toLocaleString()}</p>
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
              {fedLearning.loading ? (
                <span className="flex items-center gap-1">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Submitting…
                </span>
              ) : (
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
              <span className="font-medium text-foreground">{fedLearning.submissions.filter(s => s.round === (fedLearning.currentRound ?? 7)).length} / ∞</span>
            </div>
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, fedLearning.submissions.filter(s => s.round === (fedLearning.currentRound ?? 7)).length * 20)}%` }}
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

function ClientsView({ fedLearning }: { fedLearning: UseFedLearningResult }) {
  const [registering, setRegistering] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [showRegForm, setShowRegForm] = useState(false);

  const handleRegister = async () => {
    if (!newClientName.trim()) {
      toast.error("Enter a client name");
      return;
    }
    setRegistering(true);
    const ok = await fedLearning.registerClient();
    if (ok) {
      toast.success("Client registered!", { description: `"${newClientName}" is now a training client.` });
      setNewClientName("");
      setShowRegForm(false);
    } else {
      toast.error("Registration failed");
    }
    setRegistering(false);
  };

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
              <p className="text-lg font-bold text-foreground">{fedLearning.totalDataPoints.toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground">Data Points</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-lg font-bold text-foreground">{fedLearning.submissions.length}</p>
              <p className="text-[10px] text-muted-foreground">Submissions</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-lg font-bold text-amber-600">{fedLearning.totalEarned.toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground">$PEDI Earned</p>
            </div>
          </div>

          {/* Additional registered clients */}
          {fedLearning.registeredClients > 1 && (
            <div className="mt-4 space-y-2">
              {Array.from({ length: fedLearning.registeredClients - 1 }, (_, i) => (
                <div key={i} className="flex items-center gap-3 p-2 bg-muted/30 rounded-lg border border-border">
                  <Cpu className="w-4 h-4 text-primary" />
                  <div className="flex-1">
                    <p className="text-xs font-medium text-foreground">Client #{i + 2}</p>
                    <p className="text-[10px] text-muted-foreground font-mono">device-{Math.random().toString(36).slice(2, 8)}</p>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-semibold">Active</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Register new client */}
      <Card>
        <CardContent className="pt-6">
          {!showRegForm ? (
            <div className="text-center text-sm text-muted-foreground py-4">
              <Cpu className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" />
              <p>Register additional training clients from other devices.</p>
              <Button variant="outline" size="sm" className="mt-3 gap-1" onClick={() => setShowRegForm(true)}>
                <UserPlus className="w-3.5 h-3.5" /> Register New Client
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground">Register a New Training Client</p>
              <div className="space-y-1.5">
                <Label className="text-xs">Client Name</Label>
                <Input
                  placeholder="e.g., Clinic Workstation 2"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Device ID</Label>
                <Input value={`dev-${Math.random().toString(36).slice(2, 10)}`} readOnly className="font-mono text-xs bg-muted/50" />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleRegister} disabled={registering} className="gap-1">
                  {registering ? (
                    <><RefreshCw className="w-3 h-3 animate-spin" /> Registering…</>
                  ) : (
                    <><CheckCircle className="w-3 h-3" /> Register</>
                  )}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowRegForm(false)}>Cancel</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ── Submissions View ──

function SubmissionsView({ fedLearning }: { fedLearning: UseFedLearningResult }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Submission History</h2>
        <span className="text-xs text-muted-foreground">{fedLearning.submissions.length} total</span>
      </div>
      {fedLearning.submissions.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-sm text-muted-foreground py-8">
            <Send className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" />
            <p>No submissions yet. Go to Dashboard to run training and submit gradients.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {fedLearning.submissions.map((s) => (
            <Card key={s.id}>
              <CardContent className="pt-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-medium text-foreground">{s.hash.slice(0, 18)}…</span>
                      <span className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded-full font-semibold",
                        s.status === "confirmed" ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"
                      )}>
                        {s.status === "confirmed" ? "✓ confirmed" : "⏳ pending"}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Round #{s.round} • {s.points} data points • {s.time}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-amber-600 text-sm">+{s.reward.toLocaleString()} $PEDI</p>
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
      )}
    </motion.div>
  );
}

// ── Rewards Detail View ──

function RewardsDetailView({ fedLearning }: { fedLearning: UseFedLearningResult }) {
  const [claiming, setClaiming] = useState(false);

  const handleClaim = async () => {
    setClaiming(true);
    const ok = await fedLearning.claimRewards();
    if (ok) {
      toast.success("Rewards claimed!", { description: `All pending $PEDI has been transferred to your wallet.` });
    } else {
      toast.error("Claim failed", { description: "Try again later." });
    }
    setClaiming(false);
  };

  // Group submissions by round for history
  const roundMap = new Map<number, number>();
  fedLearning.submissions.forEach((s) => {
    roundMap.set(s.round, (roundMap.get(s.round) || 0) + s.reward);
  });
  const history = Array.from(roundMap.entries())
    .sort((a, b) => b[0] - a[0])
    .map(([round, earned]) => ({ round, earned, status: round === (fedLearning.currentRound ?? 7) ? "pending" : "claimed" }));

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">$PEDI Rewards</h2>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-5 text-center">
            <p className="text-3xl font-bold text-amber-600">{fedLearning.totalEarned.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Total $PEDI Earned</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 text-center">
            <p className="text-3xl font-bold text-foreground">{fedLearning.pending.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Pending (current round)</p>
            <Button
              size="sm"
              className="mt-2 text-xs gap-1"
              disabled={fedLearning.pending === 0 || claiming}
              onClick={handleClaim}
            >
              {claiming ? (
                <><RefreshCw className="w-3 h-3 animate-spin" /> Claiming…</>
              ) : (
                <><Gift className="w-3 h-3" /> Claim</>
              )}
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
            {history.map((h, i) => (
              <div key={i} className="flex items-center justify-between text-xs py-2 border-b border-border last:border-0">
                <span className="text-muted-foreground">Round #{h.round}</span>
                <span className="font-bold text-amber-600">+{h.earned.toLocaleString()} $PEDI</span>
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

// ── USC Verification View ──

function USCVerificationView() {
  const { verifications, loading } = useUSCVerifications();
  const [submitting, setSubmitting] = useState<string | null>(null);

  const handleSubmitProof = async (tokenId: string, evidenceHash: string) => {
    setSubmitting(tokenId);
    try {
      const result = await creditcoinService.submitUSCProof(tokenId, evidenceHash);
      toast.success("STARK proof submitted", {
        description: `${result.attestorsNotified} attestors notified for token #${tokenId}`,
      });
    } catch {
      toast.error("Proof submission failed");
    }
    setSubmitting(null);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-primary" />
          Universal Smart Contract (USC) Verification
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Trustless AI verification via Creditcoin's native oracle — replaces Chainlink with on-chain STARK proofs.
        </p>
      </div>

      {/* How it works */}
      <Card>
        <CardContent className="pt-5">
          <p className="text-xs font-medium text-foreground mb-3">How USC Verification Works</p>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {[
              { step: "1", label: "AI Inference", icon: Cpu },
              { step: "2", label: "STARK Proof", icon: Lock },
              { step: "3", label: "Attestor Consensus", icon: Users },
              { step: "4", label: "On-Chain Verified", icon: CheckCircle },
            ].map((s, i) => (
              <div key={s.step} className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 bg-primary/5 border border-primary/10 rounded-lg px-3 py-2">
                  <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">{s.step}</div>
                  <s.icon className="w-3.5 h-3.5 text-primary" />
                  <span className="text-foreground font-medium">{s.label}</span>
                </div>
                {i < 3 && <ChevronRight className="w-3 h-3 text-muted-foreground" />}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Verifications list */}
      {loading ? (
        <Card><CardContent className="pt-6 text-center text-sm text-muted-foreground py-8">Loading verifications…</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {verifications.map((v) => (
            <Card key={v.tokenId}>
              <CardContent className="pt-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground text-sm">Token #{v.tokenId}</span>
                      {v.verified ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-semibold flex items-center gap-1">
                          <CheckCircle className="w-2.5 h-2.5" /> Verified
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 font-semibold flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" /> Pending
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <p className="text-muted-foreground">Proof Type</p>
                        <p className="font-mono text-foreground">{v.proofType}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Attestors</p>
                        <p className="text-foreground">{v.attestorCount}/5 consensus</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Evidence Hash</p>
                        <p className="font-mono text-foreground truncate">{v.evidenceHash}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Gas Used</p>
                        <p className="text-foreground">{v.gasUsed ?? "—"}</p>
                      </div>
                    </div>
                  </div>
                  <div className="shrink-0">
                    {!v.verified && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs gap-1"
                        disabled={submitting === v.tokenId}
                        onClick={() => handleSubmitProof(v.tokenId, v.evidenceHash)}
                      >
                        {submitting === v.tokenId ? (
                          <><RefreshCw className="w-3 h-3 animate-spin" /> Submitting…</>
                        ) : (
                          <><Shield className="w-3 h-3" /> Submit Proof</>
                        )}
                      </Button>
                    )}
                    {v.txHash && (
                      <a
                        href={`https://testnet-explorer.creditcoin.org/tx/${v.txHash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] text-primary hover:underline flex items-center gap-0.5 mt-1"
                      >
                        View tx <ArrowUpRight className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </motion.div>
  );
}

// ── Dual-Chain View ──

function DualChainView() {
  const { anchors, loading } = useDualChainAnchors();
  const [relaying, setRelaying] = useState<string | null>(null);

  const handleRelay = async (tokenId: string, evmTxHash: string) => {
    setRelaying(tokenId);
    try {
      const result = await creditcoinService.relayToNativeChain(tokenId, evmTxHash);
      toast.success("Relayed to Native Chain", {
        description: `Token #${tokenId} anchored at native block #${result.nativeBlock}`,
      });
    } catch {
      toast.error("Relay failed");
    }
    setRelaying(null);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Layers className="w-5 h-5 text-primary" />
          Dual-Chain Anchoring
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Mint on Creditcoin EVM for speed, relay evidence hash to Creditcoin Native for permanent legal finality.
        </p>
      </div>

      {/* Architecture diagram */}
      <Card>
        <CardContent className="pt-5">
          <div className="flex items-center justify-center gap-4 text-xs">
            <div className="text-center p-3 rounded-lg bg-primary/5 border border-primary/10">
              <Zap className="w-5 h-5 text-primary mx-auto mb-1" />
              <p className="font-medium text-foreground">EVM Chain</p>
              <p className="text-muted-foreground text-[10px]">Fast minting</p>
            </div>
            <div className="flex flex-col items-center gap-1">
              <ChevronRight className="w-4 h-4 text-primary" />
              <span className="text-[10px] text-muted-foreground">Relayer</span>
            </div>
            <div className="text-center p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
              <Link2 className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
              <p className="font-medium text-foreground">Native Chain</p>
              <p className="text-muted-foreground text-[10px]">Permanent record</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <Card><CardContent className="pt-6 text-center text-sm text-muted-foreground py-8">Loading anchors…</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {anchors.map((a) => (
            <Card key={a.tokenId}>
              <CardContent className="pt-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground text-sm">Token #{a.tokenId}</span>
                      <span className={cn(
                        "text-[10px] px-2 py-0.5 rounded-full font-semibold",
                        a.finality === "permanent"
                          ? "bg-emerald-500/10 text-emerald-600"
                          : "bg-amber-500/10 text-amber-600"
                      )}>
                        {a.finality === "permanent" ? "✓ Dual-Chain" : "⏳ EVM Only"}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <p className="text-muted-foreground">EVM Block</p>
                        <p className="font-mono text-foreground">#{a.evmBlock}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Native Block</p>
                        <p className="font-mono text-foreground">{a.nativeBlock ? `#${a.nativeBlock}` : "—"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">EVM Tx</p>
                        <p className="font-mono text-foreground truncate">{a.evmTxHash.slice(0, 18)}…</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Relayer</p>
                        <p className={cn("font-medium", a.relayerStatus === "confirmed" ? "text-emerald-600" : "text-amber-600")}>
                          {a.relayerStatus}
                        </p>
                      </div>
                    </div>
                  </div>
                  {a.relayerStatus === "pending" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs gap-1 shrink-0"
                      disabled={relaying === a.tokenId}
                      onClick={() => handleRelay(a.tokenId, a.evmTxHash)}
                    >
                      {relaying === a.tokenId ? (
                        <><RefreshCw className="w-3 h-3 animate-spin" /> Relaying…</>
                      ) : (
                        <><Link2 className="w-3 h-3" /> Relay Now</>
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </motion.div>
  );
}

// ── Credal CHW Reputation View ──

function CredalReputationView() {
  const { reputations, loading } = useCHWReputations();

  const tierColors: Record<string, string> = {
    Master: "bg-amber-500/10 text-amber-600 border-amber-300",
    Expert: "bg-primary/10 text-primary border-primary/30",
    Advanced: "bg-emerald-500/10 text-emerald-600 border-emerald-300",
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Award className="w-5 h-5 text-primary" />
          CHW Reputation (Credal)
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          On-chain credit histories for Community Health Workers built via Creditcoin's Credal API — portable, verifiable, border-agnostic.
        </p>
      </div>

      {loading ? (
        <Card><CardContent className="pt-6 text-center text-sm text-muted-foreground py-8">Loading reputations…</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {reputations.map((r) => (
            <Card key={r.chwAddress}>
              <CardContent className="pt-5">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Users className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-foreground">{r.chwName}</span>
                      <span className={cn("text-[10px] px-2 py-0.5 rounded-full border font-semibold", tierColors[r.reputationTier] || "bg-muted text-foreground")}>
                        {r.reputationTier}
                      </span>
                      <span className="text-[10px] text-muted-foreground">{r.region}</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div className="rounded-lg bg-muted/50 p-2 text-center">
                        <p className="text-lg font-bold text-foreground">{r.totalScreenings}</p>
                        <p className="text-[10px] text-muted-foreground">Screenings</p>
                      </div>
                      <div className="rounded-lg bg-muted/50 p-2 text-center">
                        <p className="text-lg font-bold text-foreground">{r.qualityScore}%</p>
                        <p className="text-[10px] text-muted-foreground">Quality</p>
                      </div>
                      <div className="rounded-lg bg-muted/50 p-2 text-center">
                        <p className="text-lg font-bold text-primary">{r.creditScore}</p>
                        <p className="text-[10px] text-muted-foreground">Credit Score</p>
                      </div>
                      <div className="rounded-lg bg-muted/50 p-2 text-center">
                        <p className="text-lg font-bold text-amber-600">{r.rewardsEarned}</p>
                        <p className="text-[10px] text-muted-foreground">PEDISC Earned</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {r.badges.map((b) => (
                        <span key={b} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/5 border border-primary/10 text-primary font-medium flex items-center gap-1">
                          <Star className="w-2.5 h-2.5" /> {b}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </motion.div>
  );
}

// ── DePIN IoT View ──

function DePINView() {
  const { devices, loading: devicesLoading } = useDePINDevices();
  const { stats, loading: statsLoading } = useDePINStats();
  const [anchoring, setAnchoring] = useState<string | null>(null);

  const handleAnchor = async (deviceId: string, dataHash: string) => {
    setAnchoring(deviceId);
    try {
      const result = await creditcoinService.anchorIoTData(deviceId, dataHash);
      toast.success("Data anchored on Creditcoin", {
        description: `${deviceId} anchored at block #${result.blockNumber}`,
      });
    } catch {
      toast.error("Anchor failed");
    }
    setAnchoring(null);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Radio className="w-5 h-5 text-primary" />
          DePIN IoT Data Anchoring
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Encrypted vitals from edge devices anchored immutably on Creditcoin. Raw data stays on device — only hashes stored on-chain.
        </p>
      </div>

      {/* Network stats */}
      {!statsLoading && stats && (
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {[
            { label: "Devices", value: stats.totalDevices, icon: Radio },
            { label: "Online", value: stats.onlineDevices, icon: Wifi },
            { label: "Anchored", value: stats.totalDataAnchored.toLocaleString(), icon: Database },
            { label: "Pending", value: stats.pendingAnchors, icon: Clock },
            { label: "Avg Time", value: stats.avgAnchorTime, icon: Zap },
            { label: "Gas Spent", value: stats.totalGasSpent, icon: Coins },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="pt-3 pb-3 text-center">
                <s.icon className="w-4 h-4 text-primary mx-auto mb-1" />
                <p className="text-sm font-bold text-foreground">{s.value}</p>
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Devices */}
      {devicesLoading ? (
        <Card><CardContent className="pt-6 text-center text-sm text-muted-foreground py-8">Loading devices…</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {devices.map((d) => (
            <Card key={d.deviceId}>
              <CardContent className="pt-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      {d.status === "online" ? (
                        <Wifi className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <WifiOff className="w-4 h-4 text-destructive" />
                      )}
                      <span className="font-medium text-foreground text-sm">{d.deviceId}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{d.type}</span>
                      <span className={cn(
                        "text-[10px] px-2 py-0.5 rounded-full font-semibold",
                        d.status === "online" ? "bg-emerald-500/10 text-emerald-600" : "bg-destructive/10 text-destructive"
                      )}>
                        {d.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div>
                        <p className="text-muted-foreground">Data Points</p>
                        <p className="font-bold text-foreground">{d.dataPoints.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Anchored</p>
                        <p className="font-bold text-emerald-600">{d.anchored.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Pending</p>
                        <p className="font-bold text-amber-600">{d.pendingAnchor}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Encryption</p>
                        <p className="font-mono text-foreground text-[10px]">{d.encryptionType}</p>
                      </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      <Globe className="w-2.5 h-2.5 inline mr-1" />{d.region} • Last hash: <span className="font-mono">{d.lastDataHash.slice(0, 22)}…</span>
                    </p>
                  </div>
                  {d.pendingAnchor > 0 && d.status === "online" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs gap-1 shrink-0"
                      disabled={anchoring === d.deviceId}
                      onClick={() => handleAnchor(d.deviceId, d.lastDataHash)}
                    >
                      {anchoring === d.deviceId ? (
                        <><RefreshCw className="w-3 h-3 animate-spin" /> Anchoring…</>
                      ) : (
                        <><Database className="w-3 h-3" /> Anchor {d.pendingAnchor}</>
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
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

function RewardsCard({ fedLearning }: { fedLearning: UseFedLearningResult }) {
  const [claiming, setClaiming] = useState(false);

  const handleClaim = async () => {
    setClaiming(true);
    const ok = await fedLearning.claimRewards();
    if (ok) {
      toast.success("Rewards claimed!");
    }
    setClaiming(false);
  };

  // Group by round for mini chart
  const roundMap = new Map<number, number>();
  fedLearning.submissions.forEach((s) => {
    roundMap.set(s.round, (roundMap.get(s.round) || 0) + s.reward);
  });
  const chartData = Array.from(roundMap.entries()).sort((a, b) => a[0] - b[0]).slice(-5);
  const maxReward = Math.max(...chartData.map(([, r]) => r), 1);

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
          <p className="text-3xl font-bold text-amber-600">{fedLearning.totalEarned.toLocaleString()}</p>
          <p className="text-[10px] text-muted-foreground">Total $PEDI earned</p>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Pending</span>
          <span className="font-bold text-foreground">{fedLearning.pending.toLocaleString()} $PEDI</span>
        </div>
        <Button
          size="sm"
          className="w-full gap-1 text-xs"
          disabled={fedLearning.pending === 0 || claiming}
          onClick={handleClaim}
        >
          {claiming ? (
            <><RefreshCw className="w-3 h-3 animate-spin" /> Claiming…</>
          ) : (
            <><Gift className="w-3 h-3" /> Claim Rewards</>
          )}
        </Button>
        <p className="text-[10px] text-muted-foreground text-center">10 $PEDI per data point</p>

        {/* Mini chart */}
        {chartData.length > 0 && (
          <div className="pt-2">
            <p className="text-[10px] text-muted-foreground mb-1">Earnings by round</p>
            <div className="flex items-end gap-1 h-12">
              {chartData.map(([round, reward], i) => (
                <div key={round} className="flex-1 flex flex-col items-center gap-0.5">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${(reward / maxReward) * 100}%` }}
                    transition={{ duration: 0.5, delay: i * 0.1 }}
                    className="w-full bg-amber-500/30 rounded-t"
                  />
                  <span className="text-[8px] text-muted-foreground">R{round}</span>
                </div>
              ))}
            </div>
          </div>
        )}
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

function ActivityFeedCard({ feed }: { feed: typeof MOCK_ACTIVITY_INITIAL }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          Live Submissions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 max-h-64 overflow-y-auto">
        {feed.map((a, i) => (
          <motion.div
            key={`${a.time}-${a.tx}-${i}`}
            initial={i === 0 ? { opacity: 0, y: -10 } : {}}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-2 text-xs"
          >
            <span className="text-muted-foreground text-[10px] w-10 shrink-0">[{a.time}]</span>
            <div className="flex-1">
              <span className={cn("font-mono text-foreground", a.client === "You" && "text-primary font-semibold")}>{a.client}</span>
              <span className="text-muted-foreground"> submitted {a.points} pts</span>
            </div>
            <span className="text-primary text-[10px] font-mono shrink-0">{a.tx}</span>
          </motion.div>
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
