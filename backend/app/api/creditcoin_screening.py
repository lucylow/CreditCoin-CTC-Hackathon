# backend/app/api/creditcoin_screening.py
"""
Creditcoin EVM: mint screening RWA NFT, submit attestation (USC oracle), CHW register.
Gas: CTC. Chain ID 336 (mainnet) / 337 (testnet).
"""
from __future__ import annotations

import json
from typing import Any, Dict

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from app.core.creditcoin import (
    get_chain_id,
    get_nft_contract,
    get_nonce,
    get_risk_engine_contract,
    get_chw_registry_contract,
    get_health_chain_contract,
    get_web3,
    get_backend_account,
    is_creditcoin_configured,
    build_and_send_tx,
)
from app.core.logger import logger
from app.services.ipfs_pinata import pin_json_to_ipfs

router = APIRouter(prefix="/api/creditcoin", tags=["creditcoin"])

# RiskLevel enum in contract: LOW=0, MEDIUM=1, HIGH=2
RISK_LEVEL_MAP = {"low": 0, "medium": 1, "high": 2}


class MintRequest(BaseModel):
    """Request to mint a PediScreen RWA certificate NFT after MedGemma analysis and IPFS pin."""

    parent_address: str = Field(..., description="Parent/custodian wallet address (NFT owner)")
    child_age_months: int = Field(..., ge=0, le=240, description="Child age in months")
    risk_level: int = Field(..., ge=0, le=2, description="0=LOW, 1=MEDIUM, 2=HIGH")
    confidence: int = Field(..., ge=0, le=100, description="AI confidence 0-100 (min 75 required)")
    report_json: Dict[str, Any] = Field(..., description="Anonymised report to pin to IPFS and hash")


class MintResponse(BaseModel):
    """Response after minting a screening certificate on Creditcoin EVM."""

    tx_hash: str
    token_id: int
    ipfs_cid: str
    evidence_hash: str
    block_number: int | None = None


class AttestationRequest(BaseModel):
    """Request to submit USC attestation for a screening (RiskEngine)."""

    token_id: int = Field(..., ge=0)
    is_valid: bool = True
    proof_hash: str | None = Field(None, description="Optional STARK proof digest (hex); default placeholder if omitted")


@router.post("/screening/mint", response_model=MintResponse)
async def mint_screening(req: MintRequest):
    """
    Mint a PediScreen RWA certificate NFT on Creditcoin EVM.
    Runs: pin report to IPFS → compute evidence hash (keccak256(ipfsCID + canonical JSON)) → mint on chain.
    Backend must have CHW_ROLE. Gas paid in CTC.
    """
    if not is_creditcoin_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Creditcoin not configured (CREDITCOIN_RPC, CTC_PRIVATE_KEY or BACKEND_PRIVATE_KEY, NFT_CONTRACT_ADDRESS)",
        )
    if req.confidence < 75:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Confidence must be >= 75",
        )
    if req.risk_level not in (0, 1, 2):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="risk_level must be 0 (LOW), 1 (MEDIUM), or 2 (HIGH)",
        )

    # 1. Pin report to IPFS
    ipfs_cid = await pin_json_to_ipfs(req.report_json)
    if not ipfs_cid:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="IPFS pinning not configured (Pinata) or failed",
        )

    # 2. Evidence hash: keccak256(ipfsCID + canonical JSON)
    from web3 import Web3

    canonical = json.dumps(req.report_json, sort_keys=True, separators=(",", ":"))
    evidence_hash_bytes = Web3.keccak(text=ipfs_cid + canonical)
    evidence_hash_hex = evidence_hash_bytes.hex()

    w3 = get_web3()
    account = get_backend_account()
    nft = get_nft_contract()
    if not all([w3, account, nft]):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Creditcoin client or NFT contract not available",
        )

    chain_id = get_chain_id()
    try:
        tx = nft.functions.mintScreening(
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
        logger.exception("Creditcoin mint failed: %s", e)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Mint transaction failed: {str(e)}",
        ) from e

    # Parse tokenId from ScreeningMinted event (indexed tokenId in topics[1])
    token_id = None
    if receipt.get("logs"):
        contract_address = nft.address
        for log in receipt["logs"]:
            if log.get("address", "").lower() == contract_address.lower() and len(log.get("topics", [])) >= 2:
                try:
                    token_id = int(log["topics"][1], 16)
                    break
                except (ValueError, IndexError, TypeError):
                    continue
        if token_id is None and receipt.get("status") == 1:
            try:
                first_log = receipt["logs"][0]
                topics = first_log.get("topics") or []
                if len(topics) > 1 and topics[1] is not None:
                    token_id = int(topics[1], 16)
            except (ValueError, IndexError, TypeError, KeyError):
                pass

    if token_id is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not extract token ID from mint receipt",
        )

    return MintResponse(
        tx_hash=tx_hash.hex(),
        token_id=token_id,
        ipfs_cid=ipfs_cid,
        evidence_hash=evidence_hash_hex,
        block_number=receipt.get("blockNumber"),
    )


@router.post("/screening/verify")
async def verify_screening(req: AttestationRequest):
    """
    Submit attestation to RiskEngine (USC oracle). Backend must have ATTESTOR_ROLE.
    In production the Attestor would re-run MedGemma or verify evidence hash; proof_hash can be a STARK digest or placeholder.
    """
    if not is_creditcoin_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Creditcoin not configured",
        )
    risk_engine = get_risk_engine_contract()
    account = get_backend_account()
    w3 = get_web3()
    if not all([risk_engine, account, w3]):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="RiskEngine or account not available",
        )

    from web3 import Web3

    if req.proof_hash and len(req.proof_hash.strip()) >= 64:
        h = req.proof_hash.strip().removeprefix("0x")
        if len(h) == 64:
            proof_hash = bytes.fromhex(h)
        else:
            proof_hash = Web3.keccak(hexstr=req.proof_hash)
    else:
        proof_hash = Web3.keccak(text="valid_stark_proof")

    try:
        tx = risk_engine.functions.submitAttestation(
            req.token_id,
            req.is_valid,
            proof_hash,
        ).build_transaction({
            "from": account.address,
            "nonce": get_nonce(),
            "gas": 200_000,
            "chainId": get_chain_id(),
        })
        if "gasPrice" not in tx:
            tx["gasPrice"] = w3.eth.gas_price
        receipt = build_and_send_tx(tx)
        tx_hash = receipt["transactionHash"]
    except Exception as e:
        logger.exception("Creditcoin attestation failed: %s", e)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Attestation failed: {str(e)}",
        ) from e

    return {
        "attestation_tx": tx_hash.hex(),
        "valid": req.is_valid,
        "block_number": receipt.get("blockNumber"),
    }


@router.get("/chw/register-info")
async def chw_register_info():
    """
    Return instructions for CHW self-registration. CHW must call CHWRegistry.register() from their wallet (approve MIN_STAKE PEDISC first).
    """
    registry = get_chw_registry_contract()
    if not registry:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="CHWRegistry not configured",
        )
    try:
        min_stake = registry.functions.MIN_STAKE().call()
    except Exception:
        min_stake = 100 * 10**18
    return {
        "message": "Call CHWRegistry.register() from your wallet after approving MIN_STAKE PEDISC to the registry contract.",
        "min_stake_wei": str(min_stake),
        "min_stake_human": str(100),
        "token_symbol": "PEDISC",
    }


@router.get("/health")
async def creditcoin_health():
    """Check Creditcoin RPC and contract config."""
    w3 = get_web3()
    connected = w3.is_connected() if w3 else False
    return {
        "configured": is_creditcoin_configured(),
        "rpc_connected": connected,
        "chain_id": get_chain_id() if w3 else None,
        "health_chain_configured": get_health_chain_contract() is not None,
    }


# --- Healthchain: consent and access logs (recordId = screening tokenId) ---

class ConsentGrantRequest(BaseModel):
    """Request to grant a clinician access to a screening record until expiry."""

    record_id: int = Field(..., ge=0, description="Screening token ID (PediScreenNFT)")
    clinician_address: str = Field(..., description="Clinician wallet address")
    expiry: int = Field(..., gt=0, description="Unix timestamp until consent is valid")


@router.post("/consent/grant")
async def grant_consent(req: ConsentGrantRequest):
    """
    Grant a clinician access to a screening record on HealthChain.
    Backend account must have PATIENT_ROLE for demo; in production the patient should call the contract from their wallet.
    """
    if not is_creditcoin_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Creditcoin not configured",
        )
    health = get_health_chain_contract()
    if not health:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="HealthChain not configured (HEALTH_CHAIN_ADDRESS)",
        )
    if req.expiry <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="expiry must be a future Unix timestamp",
        )
    from web3 import Web3

    account = get_backend_account()
    w3 = get_web3()
    try:
        tx = health.functions.grantConsent(
            req.record_id,
            Web3.to_checksum_address(req.clinician_address),
            req.expiry,
        ).build_transaction({
            "from": account.address,
            "nonce": get_nonce(),
            "gas": 200_000,
            "chainId": get_chain_id(),
        })
        if "gasPrice" not in tx:
            tx["gasPrice"] = w3.eth.gas_price
        receipt = build_and_send_tx(tx)
        return {"tx_hash": receipt["transactionHash"].hex()}
    except Exception as e:
        logger.exception("HealthChain grantConsent failed: %s", e)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Grant consent failed: {str(e)}",
        ) from e


@router.post("/consent/revoke/{record_id}")
async def revoke_consent(record_id: int):
    """
    Revoke consent for a screening record on HealthChain.
    Caller (backend account) must be the patient for that record.
    """
    if not is_creditcoin_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Creditcoin not configured",
        )
    health = get_health_chain_contract()
    if not health:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="HealthChain not configured (HEALTH_CHAIN_ADDRESS)",
        )
    account = get_backend_account()
    w3 = get_web3()
    try:
        tx = health.functions.revokeConsent(record_id).build_transaction({
            "from": account.address,
            "nonce": get_nonce(),
            "gas": 150_000,
            "chainId": get_chain_id(),
        })
        if "gasPrice" not in tx:
            tx["gasPrice"] = w3.eth.gas_price
        receipt = build_and_send_tx(tx)
        return {"tx_hash": receipt["transactionHash"].hex()}
    except Exception as e:
        logger.exception("HealthChain revokeConsent failed: %s", e)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Revoke consent failed: {str(e)}",
        ) from e


class AccessLogEntry(BaseModel):
    """Single access log entry for a screening record."""

    clinician: str
    timestamp: int
    record_id: int


@router.get("/access-logs/{record_id}", response_model=list[AccessLogEntry])
async def get_access_logs(record_id: int):
    """
    Return access logs for a screening record from HealthChain.
    Backend account must have CLINICIAN_ROLE to call getAccessLogs for any record (audit).
    """
    if not is_creditcoin_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Creditcoin not configured",
        )
    health = get_health_chain_contract()
    if not health:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="HealthChain not configured (HEALTH_CHAIN_ADDRESS)",
        )
    try:
        # Call from backend account (must have CLINICIAN_ROLE to view any record's logs)
        logs = health.functions.getAccessLogs(record_id).call(
            {"from": get_backend_account().address}
        )
    except Exception as e:
        logger.warning("HealthChain getAccessLogs failed for record %s: %s", record_id, e)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view access logs (backend needs CLINICIAN_ROLE)",
        ) from e
    return [
        AccessLogEntry(
            clinician=log[0],
            timestamp=log[1],
            record_id=log[2],
        )
        for log in logs
    ]
