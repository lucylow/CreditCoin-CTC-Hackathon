# backend/app/depin/blockchain.py
"""Generic blockchain client for anchoring data hashes. No Polygon-specific code."""

from abc import ABC, abstractmethod
from typing import Optional


class BlockchainClient(ABC):
    """Abstract client for any chain (Ethereum, Creditcoin, private, etc.)."""

    @abstractmethod
    async def anchor_hash(self, data_hash: str) -> Optional[str]:
        """Anchor a data hash on-chain. Returns transaction hash or None if disabled."""
        pass


class MockBlockchainClient(BlockchainClient):
    """Simulates anchoring; returns a deterministic pseudo tx hash."""

    async def anchor_hash(self, data_hash: str) -> Optional[str]:
        return f"0x{data_hash[:64]}" if len(data_hash) >= 64 else f"0x{data_hash}"


# Global instance; replace with a real client (e.g. EthereumClient) in production.
def get_blockchain_client() -> BlockchainClient:
    from app.core.config import settings
    # Optional: if DEPIN_BLOCKCHAIN_CLASS is set, load it; else mock.
    return MockBlockchainClient()
