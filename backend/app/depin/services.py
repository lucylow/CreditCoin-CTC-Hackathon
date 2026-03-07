# backend/app/depin/services.py
"""DePIN services: IPFS pinning (reuse existing) and blockchain anchoring."""

from typing import Any, Dict, Optional

from app.core.config import settings
from app.services.ipfs_pinata import pin_json_to_ipfs


async def pin_to_ipfs(data: Dict[str, Any]) -> Optional[str]:
    """Pin JSON to IPFS via existing Pinata integration. Returns CID or None."""
    return await pin_json_to_ipfs(data)


async def anchor_hash(data_hash: str) -> Optional[str]:
    """Anchor a data hash on the configured blockchain. Returns tx hash or None."""
    from app.depin.blockchain import get_blockchain_client
    client = get_blockchain_client()
    return await client.anchor_hash(data_hash)
