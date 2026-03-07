/**
 * Federated learning client UI — submit contributions, show PEDISC balance (Creditcoin).
 */
import { useState } from "react";
import { useFedLearning } from "@/hooks/useFedLearning";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface FedLearningClientProps {
  className?: string;
}

export function FedLearningClient({ className }: FedLearningClientProps) {
  const {
    submitContribution,
    balance,
    currentRound,
    loading,
    error,
    isConfigured,
    refreshBalance,
  } = useFedLearning();
  const [datapoints, setDatapoints] = useState(100);
  const [dataPath, setDataPath] = useState("mock");

  if (!isConfigured) {
    return (
      <div
        className={cn(
          "rounded-md border border-dashed border-muted-foreground/30 bg-muted/30 p-3 text-sm text-muted-foreground",
          className
        )}
      >
        Federated learning not configured. Set VITE_FED_COORDINATOR_ADDRESS and
        VITE_PEDISC_TOKEN_ADDRESS (Creditcoin), then connect wallet.
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-md border border-border bg-card p-3 text-sm",
        className
      )}
    >
      <div className="font-medium text-foreground">Federated learning (Creditcoin)</div>
      {currentRound != null && (
        <p className="text-muted-foreground text-xs">Current round: {currentRound}</p>
      )}
      {balance != null && (
        <p className="text-muted-foreground text-xs">PEDISC balance: {balance} wei</p>
      )}
      <div className="mt-2 flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => refreshBalance()}
          disabled={loading}
        >
          Refresh balance
        </Button>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Data path (mock)"
            className="h-9 w-24 rounded-md border border-input bg-background px-2 text-xs"
            value={dataPath}
            onChange={(e) => setDataPath(e.target.value)}
          />
          <input
            type="number"
            min={1}
            className="h-9 w-20 rounded-md border border-input bg-background px-2 text-xs"
            value={datapoints}
            onChange={(e) => setDatapoints(Number(e.target.value) || 1)}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => submitContribution(datapoints, dataPath || "mock")}
            disabled={loading}
          >
            {loading ? "…" : "Submit contribution"}
          </Button>
        </div>
      </div>
      {error && <p className="mt-2 text-destructive text-xs">{error}</p>}
    </div>
  );
}
