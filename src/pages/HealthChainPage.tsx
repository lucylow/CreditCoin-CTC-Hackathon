/**
 * HealthChain POC — Patient-Controlled Data Exchange Dashboard.
 * Two-column layout: sidebar nav + main content (consents, grant/revoke, clinic verify).
 */
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  Lock,
  ExternalLink,
  CheckCircle,
  XCircle,
  FileText,
  Users,
  Search,
  Settings,
  Home,
  Key,
  Database,
  RefreshCw,
  Clock,
  ArrowUpRight,
  Copy,
  Check,
  AlertCircle,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useHealthChain } from "@/hooks/useHealthChain";
import { usePediScreenWallet } from "@/hooks/usePediScreenWallet";
import { ConnectWalletButton } from "@/components/blockchain/ConnectWalletButton";
import { MOCK_WALLET_DATA } from "@/data/mockWallet";
import { getChainName, getBlockExplorerAddressUrl } from "@/config/blockchain";
import { toast } from "sonner";

// ── Mock data for demo ──

const MOCK_CONSENTS = [
  {
    recordId: "#1234",
    clinic: "Mississauga Pediatric Centre",
    clinicAddr: "0x8Ba1...BA72",
    grantedOn: "Mar 1, 2026",
    expires: "Mar 31, 2026",
    status: "active" as const,
  },
  {
    recordId: "#1235",
    clinic: "SickKids Toronto",
    clinicAddr: "0xAb58...eC9B",
    grantedOn: "Feb 15, 2026",
    expires: "Feb 28, 2026",
    status: "expired" as const,
  },
  {
    recordId: "#1236",
    clinic: "BC Children's Hospital",
    clinicAddr: "0x742d...6637",
    grantedOn: "Mar 5, 2026",
    expires: "Jun 5, 2026",
    status: "active" as const,
  },
];

const MOCK_AUDIT_LOG = [
  { time: "10:32", actor: "Dr. Smith (SickKids)", action: "accessed record #1234", tx: "0xabcd…ef12" },
  { time: "09:15", actor: "Dr. Patel (Mississauga)", action: "accessed record #1235", tx: "0xef12…3456" },
  { time: "08:45", actor: "System", action: "consent granted for #1236", tx: "0x7890…abcd" },
  { time: "Yesterday", actor: "Dr. Chen (BC Children's)", action: "verified record #1236", tx: "0x3456…7890" },
  { time: "2 days ago", actor: "CHW Maria L.", action: "created record #1236", tx: "0x1234…5678" },
];

const MOCK_RECORDS = [
  { id: "#1234", risk: "LOW", age: 24, date: "Mar 1, 2026", verified: true },
  { id: "#1235", risk: "MEDIUM", age: 18, date: "Feb 15, 2026", verified: true },
  { id: "#1236", risk: "LOW", age: 12, date: "Mar 5, 2026", verified: false },
];

type SidebarTab = "dashboard" | "records" | "shared" | "request" | "settings";

const HealthChainPage = () => {
  const [activeTab, setActiveTab] = useState<SidebarTab>("dashboard");
  const wallet = usePediScreenWallet();
  const { grantClinicAccess, revokeConsent, isConfigured, loading, error } = useHealthChain();

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
                <Shield className="w-6 h-6 text-primary" />
                HealthChain — Patient Data Exchange
              </h1>
              <p className="text-sm text-muted-foreground">
                <Lock className="w-3 h-3 inline mr-1" />
                Your data is encrypted before leaving your device. Only you control access.
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

          {/* Privacy notice */}
          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground bg-primary/5 border border-primary/10 rounded-lg px-3 py-2">
            <Shield className="w-3.5 h-3.5 text-primary shrink-0" />
            <span>
              <strong>End-to-end encrypted.</strong> 1. Encrypt locally → 2. Store on IPFS → 3. Anchor on Creditcoin. No PHI stored on-chain.
            </span>
          </div>
        </div>
      </div>

      {/* ── Main Layout ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {!isConnected ? (
          <NotConnectedState onConnectMock={() => wallet.connectMock()} />
        ) : (
          <div className="flex gap-6">
            {/* Sidebar */}
            <aside className="hidden lg:block w-56 shrink-0">
              <nav className="sticky top-32 space-y-1">
                {([
                  { id: "dashboard", icon: Home, label: "Dashboard" },
                  { id: "records", icon: FileText, label: "My Records" },
                  { id: "shared", icon: Users, label: "Shared Access" },
                  { id: "request", icon: Search, label: "Verify Record" },
                  { id: "settings", icon: Settings, label: "Settings" },
                ] as const).map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                      activeTab === item.id
                        ? "bg-primary/10 text-primary border-l-2 border-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </button>
                ))}

                {/* Wallet info in sidebar */}
                <div className="mt-6 pt-4 border-t border-border">
                  <div className="px-3 space-y-1">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Wallet</p>
                    <p className="text-xs font-mono text-foreground truncate">{address?.slice(0, 6)}…{address?.slice(-4)}</p>
                    <p className="text-[10px] text-muted-foreground">{chainName}</p>
                  </div>
                </div>
              </nav>
            </aside>

            {/* Mobile tab bar */}
            <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border z-40 flex justify-around py-2 px-1">
              {([
                { id: "dashboard", icon: Home },
                { id: "records", icon: FileText },
                { id: "shared", icon: Users },
                { id: "request", icon: Search },
              ] as const).map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={cn(
                    "flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-[10px]",
                    activeTab === item.id ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  {item.id}
                </button>
              ))}
            </div>

            {/* Main content */}
            <main className="flex-1 min-w-0 space-y-6 pb-20 lg:pb-0">
              <AnimatePresence mode="wait">
                {activeTab === "dashboard" && (
                  <DashboardView key="dashboard" />
                )}
                {activeTab === "records" && (
                  <RecordsView key="records" records={MOCK_RECORDS} />
                )}
                {activeTab === "shared" && (
                  <SharedAccessView
                    key="shared"
                    consents={MOCK_CONSENTS}
                    onRevoke={async (id) => {
                      await revokeConsent(id);
                      toast.success("Consent revoked", { description: `Record ${id} access revoked.` });
                    }}
                    loading={loading}
                  />
                )}
                {activeTab === "request" && (
                  <VerifyView key="request" />
                )}
                {activeTab === "settings" && (
                  <SettingsView key="settings" />
                )}
              </AnimatePresence>
            </main>
          </div>
        )}

        {/* Footer */}
        <HealthChainFooter chainId={chainId} />
      </div>
    </div>
  );
};

// ── Dashboard View ──

function DashboardView() {
  const { grantClinicAccess, loading, error } = useHealthChain();
  const [recordId, setRecordId] = useState("");
  const [clinicAddress, setClinicAddress] = useState("");
  const [expiration, setExpiration] = useState("30");

  const handleGrant = async () => {
    if (!recordId.trim() || !clinicAddress.trim()) return;
    const ok = await grantClinicAccess(recordId.trim(), clinicAddress.trim());
    if (ok) {
      toast.success("Consent granted!", { description: `Clinic can now access record ${recordId}.` });
      setRecordId("");
      setClinicAddress("");
    } else {
      toast.error("Failed to grant access");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6"
    >
      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Active Consents", value: "2", icon: CheckCircle, color: "text-emerald-600" },
          { label: "Total Records", value: "3", icon: FileText, color: "text-primary" },
          { label: "Access Logs (24h)", value: "3", icon: Clock, color: "text-amber-600" },
          { label: "Total Accesses", value: "24", icon: Users, color: "text-blue-600" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between mb-2">
                <s.icon className={cn("w-4 h-4", s.color)} />
                <span className="text-2xl font-bold text-foreground">{s.value}</span>
              </div>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Active consents + audit trail */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              Active Consents & Audit Trail
            </CardTitle>
            <Button variant="ghost" size="sm" className="text-xs gap-1">
              <RefreshCw className="w-3 h-3" /> Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Consent table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="text-left py-2 font-medium">Record</th>
                  <th className="text-left py-2 font-medium">Clinic</th>
                  <th className="text-left py-2 font-medium hidden sm:table-cell">Granted</th>
                  <th className="text-left py-2 font-medium hidden sm:table-cell">Expires</th>
                  <th className="text-left py-2 font-medium">Status</th>
                  <th className="text-right py-2 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_CONSENTS.map((c) => (
                  <tr key={c.recordId} className="border-b border-border/50 last:border-0">
                    <td className="py-2.5 font-mono text-xs font-medium text-foreground">{c.recordId}</td>
                    <td className="py-2.5">
                      <span className="text-xs text-foreground">{c.clinic}</span>
                      <span className="block text-[10px] font-mono text-muted-foreground">{c.clinicAddr}</span>
                    </td>
                    <td className="py-2.5 text-xs text-muted-foreground hidden sm:table-cell">{c.grantedOn}</td>
                    <td className="py-2.5 text-xs text-muted-foreground hidden sm:table-cell">{c.expires}</td>
                    <td className="py-2.5">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full",
                          c.status === "active"
                            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                            : "bg-red-500/10 text-red-600 dark:text-red-400"
                        )}
                      >
                        {c.status === "active" ? "🟢 Active" : "🔴 Expired"}
                      </span>
                    </td>
                    <td className="py-2.5 text-right">
                      {c.status === "active" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-[10px] text-destructive hover:text-destructive h-6 px-2"
                          onClick={() => toast.success("Consent revoked", { description: `Record ${c.recordId}` })}
                        >
                          Revoke
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Audit log */}
          <div className="border-t border-border pt-4">
            <h4 className="text-xs font-medium text-muted-foreground mb-3">Live Access Log</h4>
            <div className="space-y-2">
              {MOCK_AUDIT_LOG.map((log, i) => (
                <div key={i} className="flex items-start gap-3 text-xs">
                  <span className="text-muted-foreground w-16 shrink-0 text-[10px]">[{log.time}]</span>
                  <span className="text-foreground flex-1">
                    <strong>{log.actor}</strong> {log.action}
                  </span>
                  <a
                    href={`https://testnet-explorer.creditcoin.org/tx/${log.tx}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline font-mono text-[10px] inline-flex items-center gap-0.5 shrink-0"
                  >
                    {log.tx} <ArrowUpRight className="w-2.5 h-2.5" />
                  </a>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grant access */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Key className="w-4 h-4 text-primary" />
            Grant Clinic Access
          </CardTitle>
          <CardDescription>
            Authorize a clinic to view a specific screening record. Consent is recorded on-chain and fully revocable.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="grant-record" className="text-xs">Select Record</Label>
              <Input
                id="grant-record"
                placeholder="Enter screening ID (e.g., #1234)"
                value={recordId}
                onChange={(e) => setRecordId(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="grant-clinic" className="text-xs">Clinic Address</Label>
              <Input
                id="grant-clinic"
                placeholder="0x… or search clinic name"
                value={clinicAddress}
                onChange={(e) => setClinicAddress(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="grant-expiry" className="text-xs">Expiration</Label>
              <select
                id="grant-expiry"
                value={expiration}
                onChange={(e) => setExpiration(e.target.value)}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm text-foreground"
              >
                <option value="30">30 days</option>
                <option value="90">90 days</option>
                <option value="365">1 year</option>
                <option value="custom">Custom</option>
              </select>
            </div>
          </div>

          {/* Preview */}
          {recordId && clinicAddress && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="bg-muted/50 rounded-lg p-3 text-xs space-y-1 border border-border"
            >
              <p className="font-medium text-foreground">Consent Preview</p>
              <p className="text-muted-foreground">Record: <span className="font-mono text-foreground">{recordId}</span></p>
              <p className="text-muted-foreground">Clinic: <span className="font-mono text-foreground">{clinicAddress.slice(0, 10)}…</span></p>
              <p className="text-muted-foreground">Duration: <span className="text-foreground">{expiration} days</span></p>
              <p className="text-muted-foreground">On-chain: <span className="text-primary">Creditcoin Testnet</span></p>
            </motion.div>
          )}

          <div className="flex gap-3">
            <Button
              onClick={handleGrant}
              disabled={loading || !recordId.trim() || !clinicAddress.trim()}
              className="gap-2"
            >
              {loading ? "Granting…" : (
                <>
                  <Key className="w-3.5 h-3.5" />
                  Grant Access
                </>
              )}
            </Button>
          </div>

          {error && (
            <p className="text-destructive text-xs flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {error}
            </p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ── Records View ──

function RecordsView({ records }: { records: typeof MOCK_RECORDS }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-4"
    >
      <h2 className="text-lg font-semibold text-foreground">My Screening Records</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {records.map((r) => (
          <Card key={r.id} className="hover:shadow-md transition-shadow">
            <CardContent className="pt-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm font-bold text-foreground">{r.id}</span>
                <span
                  className={cn(
                    "text-[10px] font-semibold px-2 py-0.5 rounded-full",
                    r.risk === "LOW"
                      ? "bg-emerald-500/10 text-emerald-700"
                      : r.risk === "MEDIUM"
                        ? "bg-amber-500/10 text-amber-700"
                        : "bg-red-500/10 text-red-700"
                  )}
                >
                  {r.risk === "LOW" ? "🟢" : r.risk === "MEDIUM" ? "🟡" : "🔴"} {r.risk}
                </span>
              </div>
              <div className="space-y-1 text-xs text-muted-foreground">
                <p>Age: <span className="text-foreground">{r.age} months</span></p>
                <p>Date: <span className="text-foreground">{r.date}</span></p>
                <p>
                  Status:{" "}
                  {r.verified ? (
                    <span className="text-emerald-600">✓ Verified on-chain</span>
                  ) : (
                    <span className="text-amber-600">⏳ Pending verification</span>
                  )}
                </p>
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm" className="text-[10px] flex-1 h-7">
                  Share
                </Button>
                <Button variant="ghost" size="sm" className="text-[10px] h-7 gap-1">
                  Explorer <ArrowUpRight className="w-2.5 h-2.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {records.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No screening records yet. Complete a screening to get started.</p>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}

// ── Shared Access View ──

function SharedAccessView({
  consents,
  onRevoke,
  loading,
}: {
  consents: typeof MOCK_CONSENTS;
  onRevoke: (id: string) => void;
  loading: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-4"
    >
      <h2 className="text-lg font-semibold text-foreground">Shared Access</h2>
      <p className="text-sm text-muted-foreground">Clinics with active or previous consent to your records.</p>

      <div className="space-y-3">
        {consents.map((c) => (
          <Card key={c.recordId}>
            <CardContent className="pt-5">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="font-medium text-foreground text-sm">{c.clinic}</p>
                  <p className="font-mono text-[10px] text-muted-foreground">{c.clinicAddr}</p>
                  <p className="text-xs text-muted-foreground">
                    Record {c.recordId} • Granted {c.grantedOn} • Expires {c.expires}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={cn(
                      "text-[10px] font-semibold px-2 py-0.5 rounded-full",
                      c.status === "active"
                        ? "bg-emerald-500/10 text-emerald-700"
                        : "bg-red-500/10 text-red-600"
                    )}
                  >
                    {c.status === "active" ? "Active" : "Expired"}
                  </span>
                  {c.status === "active" && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive text-[10px] h-7"
                      disabled={loading}
                      onClick={() => onRevoke(c.recordId)}
                    >
                      <XCircle className="w-3 h-3 mr-1" /> Revoke
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </motion.div>
  );
}

// ── Verify View (Clinic) ──

function VerifyView() {
  const { verifyRecordAccess, loading, error } = useHealthChain();
  const [recordId, setRecordId] = useState("");
  const [result, setResult] = useState<{ verified: boolean; fhir?: object } | null>(null);

  const handleVerify = async () => {
    if (!recordId.trim()) return;
    const res = await verifyRecordAccess(recordId.trim());
    setResult(res);
    if (res.verified) {
      toast.success("Record verified", { description: "Hash matches on-chain data." });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6"
    >
      <div>
        <h2 className="text-lg font-semibold text-foreground">For Clinics — Verify & Import Record</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Enter a record ID to verify its integrity on Creditcoin and import FHIR data into your EHR.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex gap-3">
            <div className="flex-1">
              <Input
                placeholder="Enter screening ID (e.g., #1234)"
                value={recordId}
                onChange={(e) => setRecordId(e.target.value)}
              />
            </div>
            <Button onClick={handleVerify} disabled={loading || !recordId.trim()} className="gap-2">
              {loading ? "Verifying…" : (
                <>
                  <Search className="w-4 h-4" />
                  Verify On-Chain
                </>
              )}
            </Button>
          </div>

          {error && (
            <p className="text-destructive text-xs flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {error}
            </p>
          )}

          {result && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "rounded-lg border p-4 space-y-3",
                result.verified
                  ? "border-emerald-300 bg-emerald-500/5"
                  : "border-red-300 bg-red-500/5"
              )}
            >
              <div className="flex items-center gap-2">
                {result.verified ? (
                  <>
                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                    <span className="font-medium text-emerald-700 dark:text-emerald-300">
                      Record verified on Creditcoin. Hash matches IPFS.
                    </span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-5 h-5 text-red-600" />
                    <span className="font-medium text-red-700 dark:text-red-300">
                      Record not found or consent expired. Contact the patient to request access.
                    </span>
                  </>
                )}
              </div>

              {result.verified && (
                <>
                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div>
                      <p className="text-muted-foreground">Risk Level</p>
                      <p className="font-medium text-foreground">🟢 LOW</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Confidence</p>
                      <p className="font-medium text-foreground">94%</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">CHW</p>
                      <p className="font-medium text-foreground">Maria L.</p>
                    </div>
                  </div>
                  <Button className="gap-2 w-full sm:w-auto" onClick={() => toast.success("FHIR bundle imported to EHR")}>
                    <Database className="w-3.5 h-3.5" />
                    Import FHIR to EHR
                  </Button>
                </>
              )}
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ── Settings View ──

function SettingsView() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-4"
    >
      <h2 className="text-lg font-semibold text-foreground">Settings</h2>
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Access Notifications</p>
              <p className="text-xs text-muted-foreground">Get notified when a clinic accesses your records.</p>
            </div>
            <Button variant="outline" size="sm">Enable</Button>
          </div>
          <div className="flex items-center justify-between border-t border-border pt-4">
            <div>
              <p className="text-sm font-medium text-foreground">Key Rotation</p>
              <p className="text-xs text-muted-foreground">Rotate encryption keys. Existing records will be re-encrypted.</p>
            </div>
            <Button variant="outline" size="sm">Rotate</Button>
          </div>
          <div className="flex items-center justify-between border-t border-border pt-4">
            <div>
              <p className="text-sm font-medium text-foreground">Export Audit Log</p>
              <p className="text-xs text-muted-foreground">Download a full audit trail of all access events.</p>
            </div>
            <Button variant="outline" size="sm">Export</Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ── Not Connected ──

function NotConnectedState({ onConnectMock }: { onConnectMock: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
        <Shield className="w-10 h-10 text-primary" />
      </div>
      <h2 className="text-xl font-bold text-foreground mb-2">Connect to HealthChain</h2>
      <p className="text-muted-foreground text-sm max-w-md mb-6">
        Connect your wallet to manage encrypted screening records, grant clinic access, and view your audit trail.
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <ConnectWalletButton />
        <Button variant="outline" onClick={onConnectMock} className="gap-2">
          Try Demo Mode
        </Button>
      </div>
    </div>
  );
}

// ── Footer ──

function HealthChainFooter({ chainId }: { chainId: number }) {
  const explorerBase = chainId === 336
    ? "https://explorer.creditcoin.org"
    : "https://testnet-explorer.creditcoin.org";

  return (
    <div className="mt-12 border-t border-border pt-6 pb-8">
      <div className="flex flex-wrap items-center justify-between gap-4 text-[10px] text-muted-foreground">
        <div className="flex flex-wrap items-center gap-4">
          <span>🔧 HealthChain contract:</span>
          <a
            href={`${explorerBase}/address/0x742d35Cc6b6DBcF823d80ADa7017a40A9D0e6637`}
            target="_blank"
            rel="noreferrer"
            className="font-mono hover:text-primary hover:underline"
          >
            0x742d…6637 (verified)
          </a>
          <span>📄 IPFS: Pinata (11 nodes, 99.9% uptime)</span>
        </div>
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
  );
}

export default HealthChainPage;
