/**
 * Creditcoin network stats bar — block height, TPS, validators, staked, avg fee.
 */
import { useNetworkStats } from "@/hooks/useCreditcoinData";
import { Activity, Box, Users, Coins, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface NetworkStatsProps {
  className?: string;
}

const items = [
  { key: "currentBlock", label: "Block", icon: Box, format: (v: number) => `#${v.toLocaleString()}` },
  { key: "tps", label: "TPS", icon: Activity, format: (v: number) => String(v) },
  { key: "activeValidators", label: "Validators", icon: Users, format: (v: number) => String(v) },
  { key: "totalStaked", label: "Staked", icon: Coins, format: (v: string) => v },
  { key: "averageFee", label: "Avg Fee", icon: Zap, format: (v: string) => v },
] as const;

export function NetworkStats({ className }: NetworkStatsProps) {
  const { stats, loading } = useNetworkStats();

  return (
    <div className={cn("grid grid-cols-2 sm:grid-cols-5 gap-3", className)}>
      {items.map((item) => {
        const raw = stats?.[item.key as keyof typeof stats];
        const value = raw != null ? (item.format as (v: any) => string)(raw) : "—";
        return (
          <div
            key={item.key}
            className="flex flex-col items-center gap-1 rounded-lg border border-border bg-card/60 px-3 py-2.5 text-center"
          >
            <item.icon className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
              {item.label}
            </span>
            <span className={cn("text-sm font-semibold text-foreground", loading && "animate-pulse")}>
              {loading ? "…" : value}
            </span>
          </div>
        );
      })}
    </div>
  );
}
