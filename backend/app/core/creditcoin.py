# backend/app/core/creditcoin.py
"""
Creditcoin EVM: Web3 client and contract access for PediScreen RWA certificates.
Gas: CTC. Chain ID: 336 (mainnet) / 337 (testnet).
Re-exports from app.services.creditcoin and adds build_and_send_tx helper.
"""
from __future__ import annotations

from typing import Any

from app.core.logger import logger
from app.services import creditcoin as _svc

# Re-export for spec-aligned imports (e.g. from app.core.creditcoin import get_web3, ...)
get_web3 = _svc.get_web3
get_backend_account = _svc.get_backend_account
get_chain_id = _svc.get_chain_id
get_nft_contract = _svc.get_nft_contract
get_risk_engine_contract = _svc.get_risk_engine_contract
get_chw_registry_contract = _svc.get_chw_registry_contract
get_health_chain_contract = _svc.get_health_chain_contract
get_rwa_contract = _svc.get_rwa_contract
get_data_feed_contract = _svc.get_data_feed_contract
get_attestation_log_contract = _svc.get_attestation_log_contract
get_consent_registry_contract = _svc.get_consent_registry_contract
get_audit_log_contract = _svc.get_audit_log_contract
get_insurance_registry_contract = _svc.get_insurance_registry_contract
get_insurance_processor_contract = _svc.get_insurance_processor_contract
get_insurance_usdc_contract = _svc.get_insurance_usdc_contract
get_fed_coordinator_contract = _svc.get_fed_coordinator_contract
get_fed_pedisc_contract = _svc.get_fed_pedisc_contract
is_creditcoin_configured = _svc.is_creditcoin_configured
is_rwa_configured = _svc.is_rwa_configured
is_insurance_configured = _svc.is_insurance_configured
is_federated_configured = _svc.is_federated_configured


def get_nonce() -> int:
    """Current transaction count for backend account (for building tx)."""
    w3 = get_web3()
    account = get_backend_account()
    if not w3 or not account:
        return 0
    try:
        return w3.eth.get_transaction_count(account.address)
    except Exception as e:
        logger.warning("get_nonce failed: %s", e)
        raise RuntimeError("Failed to get transaction nonce (RPC or account issue)") from e


def build_and_send_tx(tx_data: dict[str, Any]) -> Any:
    """
    Sign and send a transaction; wait for receipt. Used by mint and attestation.
    tx_data must include 'from' and be build_transaction output.
    """
    account = get_backend_account()
    w3 = get_web3()
    if not account or not w3:
        raise RuntimeError("Creditcoin not configured (CTC_PRIVATE_KEY / CREDITCOIN_RPC)")
    try:
        signed = account.sign_transaction(tx_data)
        tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
        return w3.eth.wait_for_transaction_receipt(tx_hash)
    except Exception as e:
        logger.warning("build_and_send_tx failed: %s", e)
        raise RuntimeError("Transaction send or receipt failed") from e
