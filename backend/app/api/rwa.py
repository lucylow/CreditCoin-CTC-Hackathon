# backend/app/api/rwa.py
"""
Creditcoin RWA API: mint screening RWA NFT, attest (USC oracle), external data feed.
Replaces Polygon + Chainlink with Creditcoin USC and backend Attestor.
"""
from __future__ import annotations

import json
import os
from typing import Any, Dict

import httpx
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from web3 import Web3

from app.core.creditcoin import (
    build_and_send_tx,
    get_attestation_log_contract,
    get_chain_id,
    get_data_feed_contract,
    get_nonce,
    get_rwa_contract,
    get_web3,
    get_backend_account,
    is_rwa_configured,
)
from app.core.logger import logger
from app.services.ipfs_pinata import pin_json_to_ipfs

router = APIRouter(prefix="/api/rwa", tags=["rwa"])


class MintRWARequest(BaseModel):
    """Request to mint a screening as RWA NFT on Creditcoin EVM."""

    parent_address: str = Field(..., description="Parent/custodian wallet (NFT owner)")
    child_age_months: int = Field(..., ge=0, le=240)
    risk_level: int = Field(..., ge=0, le=2, description="0=LOW, 1=MEDIUM, 2=HIGH")
    confidence: int = Field(..., ge=0, le=100, description="Min 75 required")
    report_json: Dict[str, Any] = Field(..., description="Report to pin to IPFS and hash")


class MintRWAResponse(BaseModel):
    token_id: int
    tx_hash: str
    ipfs_cid: str
    evidence_hash: str


class AttestRequest(BaseModel):
    token_id: int = Field(..., ge=0)
    valid: bool = True


class UpdateDataFeedRequest(BaseModel):
    key: str = Field(..., description="e.g. USD/CAD, COST_INDEX_ONTARIO")
    value: int = Field(..., description="Integer (e.g. 650 for 6.50)")


class DataFeedResponse(BaseModel):
    value: int
    timestamp: int


@router.post("/mint", response_model=MintRWAResponse)
async def mint_rwa(req: MintRWARequest):
    """
    Mint a screening as RWA NFT on Creditcoin EVM.
    Pin report to IPFS → compute evidence hash → mint on PediScreenRWA. Backend must have MINTER_ROLE.
    """
    if not is_rwa_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="RWA not configured (CREDITCOIN_RPC, BACKEND_PRIVATE_KEY, RWA_CONTRACT_ADDRESS)",
        )
    if req.confidence < 75:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Confidence must be >= 75",
        )

    ipfs_cid = await pin_json_to_ipfs(req.report_json)
    if not ipfs_cid:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="IPFS pinning not configured (Pinata) or failed",
        )

    canonical = json.dumps(req.report_json, sort_keys=True, separators=(",", ":"))
    evidence_hash_bytes = Web3.keccak(text=ipfs_cid + canonical)
    evidence_hash_hex = evidence_hash_bytes.hex()

    w3 = get_web3()
    account = get_backend_account()
    rwa = get_rwa_contract()
    if not all([w3, account, rwa]):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Creditcoin client or RWA contract not available",
        )

    chain_id = get_chain_id()
    try:
        tx = rwa.functions.mintScreening(
            Web3.to_checksum_address(req.parent_address),
            req.child_age_months,
            req.risk_level,
            req.confidence,
            evidence_hash_bytes,
            ipfs_cid,
        ).build_transaction({
            "from": account.address,
            "nonce": get_nonce(),
            "gas": 300_000,
            "chainId": chain_id,
        })
        if "gasPrice" not in tx:
            tx["gasPrice"] = w3.eth.gas_price
        receipt = build_and_send_tx(tx)
        tx_hash = receipt["transactionHash"]
    except Exception as e:
        logger.exception("RWA mint failed: %s", e)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Mint transaction failed: {str(e)}",
        ) from e

    token_id = None
    if receipt.get("logs"):
        contract_address = rwa.address
        for log in receipt["logs"]:
            if log.get("address", "").lower() == contract_address.lower() and len(log.get("topics", [])) >= 2:
                try:
                    token_id = int(log["topics"][1], 16)
                    break
                except (ValueError, IndexError):
                    continue
    if token_id is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not extract token ID from mint receipt",
        )

    return MintRWAResponse(
        token_id=token_id,
        tx_hash=tx_hash.hex(),
        ipfs_cid=ipfs_cid,
        evidence_hash=evidence_hash_hex,
    )


@router.post("/attest")
async def attest_screening(req: AttestRequest):
    """
    Submit attestation for a screening (Creditcoin Attestor). Backend must have ATTESTOR_ROLE.
    Updates PediScreenRWA and optionally records in AttestationLog.
    """
    if not is_rwa_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="RWA not configured",
        )
    rwa = get_rwa_contract()
    account = get_backend_account()
    w3 = get_web3()
    if not all([rwa, account, w3]):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="RWA contract or account not available",
        )

    try:
        tx1 = rwa.functions.attestScreening(req.token_id, req.valid).build_transaction({
            "from": account.address,
            "nonce": get_nonce(),
            "gas": 200_000,
            "chainId": get_chain_id(),
        })
        if "gasPrice" not in tx1:
            tx1["gasPrice"] = w3.eth.gas_price
        receipt1 = build_and_send_tx(tx1)
    except Exception as e:
        logger.exception("RWA attest failed: %s", e)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Attestation failed: {str(e)}",
        ) from e

    attest_tx_hex = receipt1["transactionHash"].hex()
    log_tx_hex = None

    attest_log = get_attestation_log_contract()
    if attest_log:
        try:
            screening = rwa.functions.screenings(req.token_id).call()
            evidence_hash = screening[3]
            tx2 = attest_log.functions.recordAttestation(
                evidence_hash,
                req.valid,
                f"Attestation for token {req.token_id}",
            ).build_transaction({
                "from": account.address,
                "nonce": get_nonce(),
                "gas": 150_000,
                "chainId": get_chain_id(),
            })
            if "gasPrice" not in tx2:
                tx2["gasPrice"] = w3.eth.gas_price
            receipt2 = build_and_send_tx(tx2)
            log_tx_hex = receipt2["transactionHash"].hex()
        except Exception as e:
            logger.warning("AttestationLog record failed (optional): %s", e)

    return {
        "attest_tx": attest_tx_hex,
        "log_tx": log_tx_hex,
        "valid": req.valid,
    }


@router.post("/data-feed/update")
async def update_data_feed(req: UpdateDataFeedRequest):
    """Update a data feed key (DATA_PROVIDER_ROLE). E.g. exchange rate, regional index."""
    if not is_rwa_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="RWA not configured",
        )
    feed = get_data_feed_contract()
    if not feed:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="DataFeed not configured (DATA_FEED_ADDRESS)",
        )
    w3 = get_web3()
    account = get_backend_account()
    key_bytes = Web3.keccak(text=req.key)
    try:
        tx = feed.functions.setData(key_bytes, req.value).build_transaction({
            "from": account.address,
            "nonce": get_nonce(),
            "gas": 100_000,
            "chainId": get_chain_id(),
        })
        if "gasPrice" not in tx:
            tx["gasPrice"] = w3.eth.gas_price
        receipt = build_and_send_tx(tx)
        return {"tx_hash": receipt["transactionHash"].hex()}
    except Exception as e:
        logger.exception("DataFeed setData failed: %s", e)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Update failed: {str(e)}",
        ) from e


@router.get("/data-feed/{key}", response_model=DataFeedResponse)
async def get_data_feed(key: str):
    """Read a data feed value (anyone can call)."""
    feed = get_data_feed_contract()
    if not feed:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="DataFeed not configured (DATA_FEED_ADDRESS)",
        )
    key_bytes = Web3.keccak(text=key)
    try:
        value, timestamp = feed.functions.getData(key_bytes).call()
    except Exception as e:
        logger.warning("DataFeed getData failed for key %s: %s", key, e)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to read data feed value",
        ) from e
    return DataFeedResponse(value=value, timestamp=timestamp)


@router.post("/data-feed/refresh-exchange-rate")
async def refresh_exchange_rate():
    """
    Fetch USD/CAD from external API and push to DataFeed (replaces Chainlink price feed).
    Set EXCHANGE_RATE_API_KEY for exchangerate-api.com (or use a free tier).
    """
    if not is_rwa_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="RWA not configured",
        )
    feed = get_data_feed_contract()
    if not feed:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="DataFeed not configured (DATA_FEED_ADDRESS)",
        )
    api_key = os.getenv("EXCHANGE_RATE_API_KEY")
    url = f"https://v6.exchangerate-api.com/v6/{api_key or 'demo'}/latest/USD"
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(url)
        data = resp.json()
        if resp.status_code != 200 or data.get("result") != "success":
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Exchange rate API error or quota exceeded",
            )
        rates = data.get("conversion_rates") or {}
        cad = rates.get("CAD")
        if cad is None:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Exchange rate API did not return CAD rate",
            )
        cad_rate = int(float(cad) * 100)
    except HTTPException:
        raise
    except Exception as e:
        logger.warning("Exchange rate fetch failed: %s", e)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to fetch exchange rate",
        ) from e

    w3 = get_web3()
    account = get_backend_account()
    key_bytes = Web3.keccak(text="USD/CAD")
    try:
        tx = feed.functions.setData(key_bytes, cad_rate).build_transaction({
            "from": account.address,
            "nonce": get_nonce(),
            "gas": 100_000,
            "chainId": get_chain_id(),
        })
        if "gasPrice" not in tx:
            tx["gasPrice"] = w3.eth.gas_price
        receipt = build_and_send_tx(tx)
        return {
            "tx_hash": receipt["transactionHash"].hex(),
            "rate": cad_rate / 100,
        }
    except Exception as e:
        logger.exception("DataFeed setData (USD/CAD) failed: %s", e)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Update failed: {str(e)}",
        ) from e
