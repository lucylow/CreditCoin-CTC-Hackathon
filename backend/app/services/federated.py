# backend/app/services/federated.py
"""
Federated learning service: local training (mock or real), model hash, submit contribution to Creditcoin FedCoordinator.
Gas: CTC. Chain ID: 337 (testnet) / 336 (mainnet).
"""
from __future__ import annotations

import hashlib
import os
from typing import Any, Optional

from app.core.logger import logger

try:
    from web3 import Web3
    from eth_account import Account

    _WEB3_AVAILABLE = True
except ImportError:
    _WEB3_AVAILABLE = False
    Web3 = None
    Account = None


def run_local_training(data_path: str) -> bytes:
    """
    Run local training and return a hash of the updated model (or gradient).
    Hackathon mock: deterministic hash from data_path. Production: call training/finetune_lora.py
    and hash the output weights.
    """
    # Mock: return a deterministic hash based on data_path (no raw data leaves the site)
    h = hashlib.sha256(data_path.encode()).hexdigest()
    return h.encode()


def compute_model_hash(raw_bytes: bytes) -> str:
    """Compute keccak256 hash for on-chain modelHash (bytes32). Returns hex string."""
    if not _WEB3_AVAILABLE:
        # Fallback: use sha256 hex as placeholder (not bytes32-sized)
        return "0x" + hashlib.sha256(raw_bytes).hexdigest()
    return Web3.keccak(raw_bytes).hex()


def submit_contribution(
    round_id: int,
    data_points: int,
    model_hash_hex: str,
    contributor_private_key: str,
) -> Any:
    """
    Submit a contribution to FedCoordinator (Creditcoin). Contributor signs the tx.
    model_hash_hex: hex string (with or without 0x) for bytes32.
    Returns transaction receipt.
    """
    if not _WEB3_AVAILABLE or not Account:
        raise RuntimeError("web3/eth_account not installed")
    from app.services.creditcoin import get_web3, get_fed_coordinator_contract, get_chain_id

    w3 = get_web3()
    fed = get_fed_coordinator_contract()
    if not w3 or not fed:
        raise RuntimeError("Creditcoin/FedCoordinator not configured (CREDITCOIN_RPC, FED_COORDINATOR_ADDRESS)")

    contributor = Account.from_key(contributor_private_key)
    chain_id = get_chain_id()
    # Normalize model_hash to bytes32 (hex)
    if not model_hash_hex.startswith("0x"):
        model_hash_hex = "0x" + model_hash_hex
    if len(model_hash_hex) != 66:  # 0x + 64 hex chars
        # Use keccak of the string as bytes32
        model_hash_hex = w3.keccak(text=model_hash_hex).hex()

    tx = fed.functions.submitContribution(
        round_id,
        data_points,
        bytes.fromhex(model_hash_hex[2:]),
    ).build_transaction({
        "from": contributor.address,
        "nonce": w3.eth.get_transaction_count(contributor.address),
        "gas": 200_000,
        "chainId": chain_id,
    })
    if "gasPrice" not in tx:
        tx["gasPrice"] = w3.eth.gas_price
    signed = contributor.sign_transaction(tx)
    tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
    receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
    logger.info("Fed contribution submitted round=%s tx=%s", round_id, receipt["transactionHash"].hex())
    return receipt
