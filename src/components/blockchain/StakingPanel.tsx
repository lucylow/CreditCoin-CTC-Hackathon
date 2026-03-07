/**
 * StakingPanel — stake PEDISC tokens on Creditcoin, view positions & tiers.
 */
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStakingPositions, useCTCBalance } from "@/hooks/useCreditcoinData";
import { creditcoinService } from "@/lib/blockchain/mockService";
import { STAKING_TIERS } from "@/lib/blockchain/mockData";
import { cn } from "@/lib/utils";
import { Coins, Lock, TrendingUp, Award } from "lucide-react";
import { toast } from "sonner";

interface StakingPanelProps {
  address: string | null;
  className?: string;
}

const tierColors: Record<string, string> = {
  Bronze: "text-amber-700 bg-amber-100 dark:text-amber-300 dark:bg-amber-900/30",
  Silver: "text-slate-600 bg-slate-100 dark:text-slate-300 dark:bg-slate-800/40",
  Gold: "text-yellow-600 bg-yellow-100 dark:text-yellow-300 dark:bg-yellow-900/30",
};

export function StakingPanel({ address, className }: StakingPanelProps) {
  const { balance } = useCTCBalance(address);
  const { positions, loading, refresh } = useStakingPositions(address);
  const [amount, setAmount] = useState("");
  const [staking, setStaking] = useState(false);

  const handleStake = async () => {
    if (!amount || Number(amount) <= 0) return;
    setStaking(true);
    try {
      const result = await creditcoinService.stake(amount, 90);
      toast.success(`Staked ${amount} PEDISC — tx: ${result.txHash.slice(0, 12)}…`);
      setAmount("");
      refresh();
    } catch {
      toast.error("Staking failed");
    } finally {
      setStaking(false);
    }
  };

  return (
    <Card className={cn("border-border", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Coins className="w-5 h-5 text-primary" />
            Stake PEDISC
          </CardTitle>
          <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
            APY up to 12.5%
          </span>
        </div>
        <CardDescription>Secure the network and earn rewards</CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Balances */}
        {address && (
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <p className="text-[11px] text-muted-foreground font-medium">Your CTC</p>
              <p className="text-lg font-bold text-foreground">{balance?.balance ?? "0"} CTC</p>
            </div>
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <p className="text-[11px] text-muted-foreground font-medium">Your PEDISC</p>
              <p className="text-lg font-bold text-foreground">
                {positions.reduce((s, p) => s + Number(p.amount), 0).toLocaleString()} PEDISC
              </p>
            </div>
          </div>
        )}

        {/* Active positions */}
        {positions.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Your Stakes</h4>
            {positions.map((pos) => (
              <div key={pos.id} className="rounded-lg border border-border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", tierColors[pos.tier])}>
                    {pos.tier} Tier
                  </span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" /> {pos.apy}% APY
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <p className="text-muted-foreground">Staked</p>
                    <p className="font-semibold text-foreground">{pos.amount} PEDISC</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Rewards</p>
                    <p className="font-semibold text-emerald-600 dark:text-emerald-400">+{pos.rewards} PEDISC</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Lock ends</p>
                    <p className="font-semibold text-foreground">{new Date(pos.lockEnd).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Stake form */}
        {address ? (
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Amount to stake (PEDISC)</label>
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="e.g. 500"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="flex-1"
              />
              <Button onClick={handleStake} disabled={staking || !amount} size="sm">
                {staking ? "Staking…" : "Stake"}
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">Connect wallet to stake</p>
        )}

        {/* Tiers */}
        <div className="space-y-1.5">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <Award className="w-3 h-3" /> Tiers
          </h4>
          {STAKING_TIERS.map((tier) => (
            <div key={tier.name} className="flex items-center justify-between text-xs rounded-md px-2 py-1.5 bg-muted/30">
              <span className="font-medium text-foreground">
                {tier.name} ({tier.min}+ PEDISC)
              </span>
              <span className="text-muted-foreground">{tier.feeShare}% fee share · {tier.apy}% APY</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
