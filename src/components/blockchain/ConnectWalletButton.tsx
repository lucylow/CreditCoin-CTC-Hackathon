/**
 * Connect wallet button for HIPAA blockchain, NFT mint, and HealthChain.
 * Shows a popover with options: Creditcoin Testnet (Demo) or real MetaMask.
 */
import { useState } from "react";
import { usePediScreenWallet } from "@/hooks/usePediScreenWallet";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useA11yContext } from "@/components/a11y/AccessiblePediScreenProvider";
import { Wallet, TestTube, Globe } from "lucide-react";

export interface ConnectWalletButtonProps {
  className?: string;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

export function ConnectWalletButton({
  className,
  onConnect,
  onDisconnect,
}: ConnectWalletButtonProps) {
  const a11y = useA11yContext(false);
  const {
    address,
    chainId,
    isConnecting,
    isConnected,
    isMock,
    ctcBalance,
    connect,
    connectMock,
    disconnect,
    error,
  } = usePediScreenWallet();

  const [popoverOpen, setPopoverOpen] = useState(false);

  const shortAddress =
    address &&
    `${address.slice(0, 6)}…${address.slice(address.length - 4)}`;

  const chainLabel =
    chainId === 337
      ? "Creditcoin Testnet"
      : chainId === 336
        ? "Creditcoin"
        : chainId != null
          ? `Chain ${chainId}`
          : "";

  if (isConnected && address) {
    a11y?.announce?.("Wallet connected");
    return (
      <div
        className={cn("flex flex-col gap-1", className)}
        data-wallet-status
        tabIndex={-1}
        aria-label={`Wallet connected, address ${shortAddress}${chainLabel ? ` on ${chainLabel}` : ""}`}
      >
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="bg-background text-foreground border-border hover:bg-accent hover:text-accent-foreground"
            onClick={() => {
              disconnect();
              onDisconnect?.();
              a11y?.announce?.("Wallet disconnected");
            }}
          >
            Disconnect
          </Button>
          <span className="text-muted-foreground text-sm" title={address}>
            {isMock && (
              <span className="inline-flex items-center gap-1 mr-1 text-xs bg-accent text-accent-foreground px-1.5 py-0.5 rounded-md font-medium">
                <TestTube className="h-3 w-3" />
                Demo
              </span>
            )}
            {shortAddress}
            {chainLabel && (
              <span className="ml-1 text-xs text-muted-foreground">({chainLabel})</span>
            )}
            {ctcBalance && isMock && (
              <span className="ml-1 text-xs font-medium text-primary">{ctcBalance} CTC</span>
            )}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="bg-background text-foreground border-border hover:bg-accent hover:text-accent-foreground gap-2"
            disabled={isConnecting}
          >
            <Wallet className="h-4 w-4" />
            {isConnecting ? "Connecting…" : "Connect wallet"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-2" align="end">
          <div className="flex flex-col gap-1">
            <p className="text-xs font-medium text-muted-foreground px-2 py-1">
              Select network
            </p>
            {/* Creditcoin Testnet Demo — always available */}
            <button
              className="flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-left text-sm hover:bg-accent transition-colors"
              onClick={() => {
                connectMock();
                setPopoverOpen(false);
                onConnect?.();
                a11y?.announce?.("Demo wallet connected to Creditcoin Testnet");
              }}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                <TestTube className="h-4 w-4" />
              </div>
              <div>
                <div className="font-medium text-foreground">Creditcoin Testnet</div>
                <div className="text-xs text-muted-foreground">Demo mode · No wallet needed</div>
              </div>
            </button>
            {/* Real MetaMask */}
            <button
              className="flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-left text-sm hover:bg-accent transition-colors"
              onClick={async () => {
                setPopoverOpen(false);
                await connect();
                onConnect?.();
                a11y?.announce?.("Wallet connection requested");
              }}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Globe className="h-4 w-4" />
              </div>
              <div>
                <div className="font-medium text-foreground">MetaMask / Web3</div>
                <div className="text-xs text-muted-foreground">Connect real wallet</div>
              </div>
            </button>
          </div>
        </PopoverContent>
      </Popover>
      {error && (
        <p className="text-destructive text-xs">{error}</p>
      )}
    </div>
  );
}
