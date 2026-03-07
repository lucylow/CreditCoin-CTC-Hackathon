"""
DePIN + Edge AI: device registration, sensor ingestion, edge inference coordination.
Generic blockchain anchoring (no Polygon); IPFS for encrypted storage.
"""
from app.depin.router import router as depin_router

__all__ = ["depin_router"]
