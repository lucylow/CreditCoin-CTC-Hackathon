"""
Creditcoin-native security API: encrypted PHI, consent registry, and audit log.
No raw medical data on-chain; only hashes and consent proofs. Chain: Creditcoin EVM (testnet 337).
"""
from __future__ import annotations

import os
from typing import Any, List

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from app.core.creditcoin import (
    build_and_send_tx,
    get_audit_log_contract,
    get_chain_id,
    get_consent_registry_contract,
    get_nonce,
    get_web3,
    get_backend_account,
)
from app.core.logger import logger

router = APIRouter(prefix="/api/security", tags=["security"])

# Optional: use for hashing recordId (same as client would compute)
try:
    from web3 import Web3
    _WEB3_AVAILABLE = True
except ImportError:
    Web3 = None
    _WEB3_AVAILABLE = False


def _bytes32_from_hex(s: str) -> bytes:
    """Convert hex string (with or without 0x) to 32 bytes."""
    h = s.strip().lower()
    if h.startswith("0x"):
        h = h[2:]
    if len(h) != 64:
        raise ValueError("data_hash must be 64 hex chars (32 bytes)")
    return bytes.fromhex(h)


def _record_id(patient_address: str, data_hash: str, expiry: int) -> bytes:
    """Compute recordId = keccak256(patient_address + data_hash + str(expiry)) as bytes32."""
    if not _WEB3_AVAILABLE:
        raise RuntimeError("web3 is required")
    composite = f"{patient_address}{data_hash}{expiry}"
    return Web3.keccak(text=composite)


# --- Request/Response models ---


class SubmitRecordRequest(BaseModel):
    patient_address: str
    encrypted_data: str  # base64 (for reference; storage to IPFS is separate)
    tag: str
    nonce: str
    data_hash: str  # SHA3-256 hex of plaintext
    clinician_address: str
    expiry: int  # Unix timestamp


class SubmitRecordResponse(BaseModel):
    record_id: str  # bytes32 hex
    tx_hash: str


class AccessRequest(BaseModel):
    record_id: str  # bytes32 hex
    clinician_address: str
    data_hash: str  # hash of data being accessed (for audit)


class RevokeRequest(BaseModel):
    record_id: str  # bytes32 hex


class AuditLogEntry(BaseModel):
    id: int
    submitter: str
    timestamp: int
    data_hash: str
    description: str


class AddAuditEntryRequest(BaseModel):
    data_hash: str  # 64 hex chars
    description: str


# --- Endpoints ---


@router.post("/records", response_model=SubmitRecordResponse)
async def submit_encrypted_record(req: SubmitRecordRequest) -> Any:
    """
    Submit an encrypted record and register consent on Creditcoin.
    recordId = keccak256(patient_address + data_hash + expiry).
    Caller (backend) must have PATIENT_ROLE for demo; in production the patient signs the tx.
    """
    consent = get_consent_registry_contract()
    account = get_backend_account()
    if not consent or not account:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Creditcoin ConsentRegistry not configured (CONSENT_REGISTRY_ADDRESS, CTC_PRIVATE_KEY)",
        )
    try:
        record_id_bytes = _record_id(req.patient_address, req.data_hash, req.expiry)
        record_id_hex = "0x" + record_id_bytes.hex()
        clinician = Web3.to_checksum_address(req.clinician_address)
        chain_id = get_chain_id()
        nonce = get_nonce()
        tx = consent.functions.grantConsent(
            record_id_bytes,
            clinician,
            req.expiry,
        ).build_transaction({
            "from": account.address,
            "nonce": nonce,
            "gas": 200_000,
            "chainId": chain_id,
        })
        w3 = get_web3()
        if w3 is not None:
            tx["gasPrice"] = w3.eth.gas_price
        receipt = build_and_send_tx(tx)
        return SubmitRecordResponse(
            record_id=record_id_hex,
            tx_hash=receipt["transactionHash"].hex(),
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))
    except Exception as e:
        logger.exception("submit_encrypted_record failed: %s", e)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to submit encrypted record",
        ) from e


@router.post("/access")
async def access_record(req: AccessRequest) -> Any:
    """
    Clinician access: log access on-chain (requires CLINICIAN_ROLE and valid consent).
    """
    consent = get_consent_registry_contract()
    account = get_backend_account()
    if not consent or not account:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Creditcoin ConsentRegistry not configured",
        )
    try:
        record_id_bytes = _record_id_from_hex(req.record_id)
        data_hash_bytes = _bytes32_from_hex(req.data_hash)
        chain_id = get_chain_id()
        nonce = get_nonce()
        tx = consent.functions.accessRecord(
            record_id_bytes,
            data_hash_bytes,
        ).build_transaction({
            "from": account.address,
            "nonce": nonce,
            "gas": 150_000,
            "chainId": chain_id,
        })
        w3 = get_web3()
        if w3 is not None:
            tx["gasPrice"] = w3.eth.gas_price
        receipt = build_and_send_tx(tx)
        return {"tx_hash": receipt["transactionHash"].hex()}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))
    except Exception as e:
        logger.exception("access_record failed: %s", e)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to record access",
        ) from e


def _record_id_from_hex(record_id: str) -> bytes:
    h = record_id.strip().lower().replace("0x", "")
    if len(h) != 64:
        raise ValueError("record_id must be 64 hex chars (bytes32)")
    return bytes.fromhex(h)


@router.post("/revoke")
async def revoke_consent(req: RevokeRequest) -> Any:
    """
    Patient revokes consent for a record (caller must be the patient for that record).
    """
    consent = get_consent_registry_contract()
    account = get_backend_account()
    if not consent or not account:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Creditcoin ConsentRegistry not configured",
        )
    try:
        record_id_bytes = _record_id_from_hex(req.record_id)
        chain_id = get_chain_id()
        nonce = get_nonce()
        tx = consent.functions.revokeConsent(record_id_bytes).build_transaction({
            "from": account.address,
            "nonce": nonce,
            "gas": 100_000,
            "chainId": chain_id,
        })
        w3 = get_web3()
        if w3 is not None:
            tx["gasPrice"] = w3.eth.gas_price
        receipt = build_and_send_tx(tx)
        return {"tx_hash": receipt["transactionHash"].hex()}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))
    except Exception as e:
        logger.exception("revoke_consent failed: %s", e)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to revoke consent",
        ) from e


@router.get("/audit", response_model=List[AuditLogEntry])
async def get_audit_logs(limit: int = 10) -> Any:
    """
    Read last N entries from the AuditLog contract (immutable provenance).
    """
    audit = get_audit_log_contract()
    if not audit:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AuditLog not configured (AUDIT_LOG_ADDRESS)",
        )
    try:
        count = audit.functions.getEntriesCount().call()
        start = max(0, int(count) - limit)
        entries: List[AuditLogEntry] = []
        for i in range(start, int(count)):
            entry = audit.functions.getEntry(i).call()
            entries.append(
                AuditLogEntry(
                    id=i,
                    submitter=entry[0],
                    timestamp=entry[1],
                    data_hash=entry[2].hex() if hasattr(entry[2], "hex") else str(entry[2]),
                    description=entry[3],
                )
            )
        return entries
    except Exception as e:
        logger.exception("get_audit_logs failed: %s", e)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to fetch audit logs",
        ) from e


@router.post("/audit/add")
async def add_audit_entry(body: AddAuditEntryRequest) -> Any:
    """
    Append an entry to the AuditLog (data hash + description). No PHI.
    """
    audit = get_audit_log_contract()
    account = get_backend_account()
    if not audit or not account:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AuditLog not configured",
        )
    try:
        data_hash_bytes = _bytes32_from_hex(body.data_hash)
        chain_id = get_chain_id()
        nonce = get_nonce()
        tx = audit.functions.addEntry(data_hash_bytes, body.description).build_transaction({
            "from": account.address,
            "nonce": nonce,
            "gas": 100_000,
            "chainId": chain_id,
        })
        w3 = get_web3()
        if w3 is not None:
            tx["gasPrice"] = w3.eth.gas_price
        receipt = build_and_send_tx(tx)
        return {"tx_hash": receipt["transactionHash"].hex()}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))
    except Exception as e:
        logger.exception("add_audit_entry failed: %s", e)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to add audit entry",
        ) from e


@router.get("/access-logs")
async def get_access_logs(record_id: str) -> Any:
    """
    View access logs for a record (caller must be patient or have CLINICIAN_ROLE).
    Backend has CLINICIAN_ROLE in demo, so it can read any record's logs.
    """
    consent = get_consent_registry_contract()
    if not consent:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="ConsentRegistry not configured",
        )
    try:
        record_id_bytes = _record_id_from_hex(record_id)
        logs = consent.functions.getAccessLogs(record_id_bytes).call()
        return {
            "record_id": record_id,
            "entries": [
                {
                    "clinician": e[0],
                    "timestamp": e[1],
                    "data_hash": e[2].hex() if hasattr(e[2], "hex") else str(e[2]),
                }
                for e in logs
            ],
        }
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))
    except Exception as e:
        logger.exception("get_access_logs failed: %s", e)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to fetch access logs",
        ) from e
