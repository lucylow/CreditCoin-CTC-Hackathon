# backend/app/api/insurance.py
"""
Health Insurance Claims Payout on Creditcoin EVM.
Backend acts as underwriter (issue policy) and attestor (verify claim); payouts in USDC.
"""
from __future__ import annotations

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from web3 import Web3

from app.core.creditcoin import (
    build_and_send_tx,
    get_chain_id,
    get_backend_account,
    get_nonce,
    get_web3,
    get_insurance_registry_contract,
    get_insurance_processor_contract,
    get_insurance_usdc_contract,
    is_insurance_configured,
)
from app.core.logger import logger

router = APIRouter(prefix="/api/insurance", tags=["insurance"])


def _to_bytes32(s: str) -> bytes:
    """Convert hex string (0x + 64 hex) or arbitrary string to bytes32."""
    s = s.strip()
    if s.startswith("0x") and len(s) == 66 and all(c in "0123456789abcdefABCDEF" for c in s[2:]):
        return bytes.fromhex(s[2:])
    # keccak256 of string for arbitrary evidence/screening identifiers
    return Web3.keccak(text=s)


def _require_insurance():
    if not is_insurance_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Insurance stack not configured (CREDITCOIN_RPC, BACKEND_PRIVATE_KEY, USDC_ADDRESS, INSURANCE_REGISTRY_ADDRESS, INSURANCE_PROCESSOR_ADDRESS)",
        )
    account = get_backend_account()
    w3 = get_web3()
    if not account or not w3:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Creditcoin RPC or backend key not available",
        )
    return w3, account


# ---------- Policy Management ----------


class IssuePolicyRequest(BaseModel):
    """Issue a new insurance policy (underwriter only)."""

    holder: str = Field(..., description="Policy holder address")
    coverage_amount: int = Field(..., ge=0, description="Coverage in USDC (6 decimals)")
    premium_paid: int = Field(..., ge=0, description="Premium paid in USDC (6 decimals)")
    expiry: int = Field(..., ge=0, description="Policy expiry Unix timestamp")
    screening_hash: str = Field(..., description="Bytes32 hex (0x...) or string to hash (screening that qualified)")


@router.post("/policy/issue")
async def issue_policy(req: IssuePolicyRequest):
    """
    Issue a new policy. Backend must have UNDERWRITER_ROLE on PolicyRegistry.
    Returns tx_hash and policy_id (from PolicyIssued event / policyCounter).
    """
    _require_insurance()
    registry = get_insurance_registry_contract()
    if not registry:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="PolicyRegistry not configured",
        )
    account = get_backend_account()
    w3 = get_web3()
    chain_id = get_chain_id()
    screening_b32 = _to_bytes32(req.screening_hash)
    try:
        tx = registry.functions.issuePolicy(
            Web3.to_checksum_address(req.holder),
            req.coverage_amount,
            req.premium_paid,
            req.expiry,
            screening_b32,
        ).build_transaction({
            "from": account.address,
            "nonce": get_nonce(),
            "gas": 200_000,
            "chainId": chain_id,
        })
        if "gasPrice" not in tx and w3:
            tx["gasPrice"] = w3.eth.gas_price
        receipt = build_and_send_tx(tx)
        policy_id = registry.functions.policyCounter().call()
        return {
            "tx_hash": receipt["transactionHash"].hex(),
            "policy_id": policy_id,
            "block_number": receipt.get("blockNumber"),
        }
    except Exception as e:
        logger.exception("issue_policy failed: %s", e)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Policy issue transaction failed",
        ) from e


# ---------- Claim Submission ----------


class SubmitClaimRequest(BaseModel):
    """Submit a claim (must be sent by policy holder; for demo, backend can be holder)."""

    policy_id: int = Field(..., ge=1)
    amount_requested: int = Field(..., ge=0, description="Requested amount in USDC (6 decimals)")
    evidence_hash: str = Field(..., description="Bytes32 hex or string (e.g. IPFS CID hash)")


@router.post("/claim/submit")
async def submit_claim(req: SubmitClaimRequest):
    """
    Submit a claim. Transaction must be sent by the policy holder address.
    For testing, set holder to backend address when issuing the policy.
    """
    _require_insurance()
    processor = get_insurance_processor_contract()
    if not processor:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="ClaimProcessor not configured",
        )
    account = get_backend_account()
    w3 = get_web3()
    chain_id = get_chain_id()
    evidence_b32 = _to_bytes32(req.evidence_hash)
    try:
        tx = processor.functions.submitClaim(
            req.policy_id,
            req.amount_requested,
            evidence_b32,
        ).build_transaction({
            "from": account.address,
            "nonce": get_nonce(),
            "gas": 200_000,
            "chainId": chain_id,
        })
        if "gasPrice" not in tx and w3:
            tx["gasPrice"] = w3.eth.gas_price
        receipt = build_and_send_tx(tx)
        claim_id = processor.functions.claimCounter().call()
        return {
            "tx_hash": receipt["transactionHash"].hex(),
            "claim_id": claim_id,
            "block_number": receipt.get("blockNumber"),
        }
    except Exception as e:
        logger.exception("submit_claim failed: %s", e)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Claim submission failed",
        ) from e


# ---------- Attestation (Oracle) ----------


class AttestClaimRequest(BaseModel):
    """Attestor (backend) verifies claim and sets approved amount."""

    claim_id: int = Field(..., ge=1)
    approved: bool = True
    approved_amount: int = Field(..., ge=0, description="USDC (6 decimals); 0 if not approved")


@router.post("/claim/attest")
async def attest_claim(req: AttestClaimRequest):
    """
    Attest a claim after verifying evidence (e.g. fetch from IPFS, re-run AI).
    Backend must have ATTESTOR_ROLE on ClaimProcessor.
    """
    _require_insurance()
    processor = get_insurance_processor_contract()
    if not processor:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="ClaimProcessor not configured",
        )
    account = get_backend_account()
    w3 = get_web3()
    chain_id = get_chain_id()
    try:
        tx = processor.functions.attestClaim(
            req.claim_id,
            req.approved,
            req.approved_amount,
        ).build_transaction({
            "from": account.address,
            "nonce": get_nonce(),
            "gas": 150_000,
            "chainId": chain_id,
        })
        if "gasPrice" not in tx and w3:
            tx["gasPrice"] = w3.eth.gas_price
        receipt = build_and_send_tx(tx)
        return {
            "tx_hash": receipt["transactionHash"].hex(),
            "block_number": receipt.get("blockNumber"),
        }
    except Exception as e:
        logger.exception("attest_claim failed: %s", e)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Claim attestation failed",
        ) from e


@router.post("/claim/execute/{claim_id}")
async def execute_payout(claim_id: int):
    """
    Execute USDC payout to claimant after attestation. Anyone can call.
    """
    _require_insurance()
    processor = get_insurance_processor_contract()
    if not processor:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="ClaimProcessor not configured",
        )
    account = get_backend_account()
    w3 = get_web3()
    chain_id = get_chain_id()
    try:
        tx = processor.functions.executePayout(claim_id).build_transaction({
            "from": account.address,
            "nonce": get_nonce(),
            "gas": 100_000,
            "chainId": chain_id,
        })
        if "gasPrice" not in tx and w3:
            tx["gasPrice"] = w3.eth.gas_price
        receipt = build_and_send_tx(tx)
        return {
            "tx_hash": receipt["transactionHash"].hex(),
            "block_number": receipt.get("blockNumber"),
        }
    except Exception as e:
        logger.exception("execute_payout failed: %s", e)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Payout execution failed",
        ) from e


# ---------- View Functions ----------


@router.get("/policy/{policy_id}")
async def get_policy(policy_id: int):
    """Return policy details from PolicyRegistry."""
    if not is_insurance_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Insurance stack not configured",
        )
    registry = get_insurance_registry_contract()
    if not registry:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="PolicyRegistry not configured",
        )
    try:
        policy = registry.functions.policies(policy_id).call()
        return {
            "holder": policy[0],
            "coverage_amount": policy[1],
            "premium_paid": policy[2],
            "expiry": policy[3],
            "active": policy[4],
            "screening_hash": policy[5].hex(),
        }
    except Exception as e:
        logger.exception("get_policy failed: %s", e)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to fetch policy",
        ) from e


@router.get("/claim/{claim_id}")
async def get_claim(claim_id: int):
    """Return claim details from ClaimProcessor."""
    if not is_insurance_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Insurance stack not configured",
        )
    processor = get_insurance_processor_contract()
    if not processor:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="ClaimProcessor not configured",
        )
    try:
        claim = processor.functions.claims(claim_id).call()
        return {
            "policy_id": claim[0],
            "claimant": claim[1],
            "amount_requested": claim[2],
            "amount_approved": claim[3],
            "evidence_hash": claim[4].hex(),
            "submission_time": claim[5],
            "attested": claim[6],
            "paid": claim[7],
        }
    except Exception as e:
        logger.exception("get_claim failed: %s", e)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to fetch claim",
        ) from e


@router.get("/health")
async def insurance_health():
    """Check if insurance stack is configured and reachable."""
    ok = is_insurance_configured()
    return {"insurance_configured": ok}
