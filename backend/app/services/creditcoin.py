# backend/app/services/creditcoin.py
"""
Creditcoin EVM integration: Web3 client for PediScreen NFT, RiskEngine, CHWRegistry.
Gas token: CTC. Chain ID: 336 (mainnet) / 337 (testnet).
"""
from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any, Optional

# Optional: web3 and eth_account (pip install web3 eth-account)
try:
    from web3 import Web3
    from eth_account import Account

    _WEB3_AVAILABLE = True
except ImportError:
    _WEB3_AVAILABLE = False
    Web3 = None
    Account = None

from app.core.logger import logger

# Minimal ABIs for the functions we call (avoid loading full artifact)
PEDI_SCREEN_NFT_ABI = [
    {
        "inputs": [
            {"name": "parent", "type": "address"},
            {"name": "childAgeMonths", "type": "uint64"},
            {"name": "riskLevel", "type": "uint8"},
            {"name": "confidence", "type": "uint8"},
            {"name": "evidenceHash", "type": "bytes32"},
            {"name": "ipfsCID", "type": "string"},
        ],
        "name": "mintScreening",
        "outputs": [{"type": "uint256"}],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {
        "inputs": [{"indexed": True, "name": "tokenId", "type": "uint256"}],
        "name": "ScreeningMinted",
        "type": "event",
    },
]

RISK_ENGINE_ABI = [
    {
        "inputs": [
            {"name": "tokenId", "type": "uint256"},
            {"name": "isValid", "type": "bool"},
            {"name": "proofHash", "type": "bytes32"},
        ],
        "name": "submitAttestation",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    },
]

CHW_REGISTRY_ABI = [
    {
        "inputs": [],
        "name": "register",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {
        "inputs": [{"name": "chw", "type": "address"}],
        "name": "getProfile",
        "outputs": [
            {"name": "stake", "type": "uint256"},
            {"name": "screeningsCompleted", "type": "uint64"},
            {"name": "flags", "type": "uint64"},
            {"name": "active", "type": "bool"},
        ],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [{"name": "chw", "type": "address"}],
        "name": "isRegistered",
        "outputs": [{"name": "", "type": "bool"}],
        "stateMutability": "view",
        "type": "function",
    },
]

# RWA stack (Creditcoin USC: PediScreenRWA, DataFeed, AttestationLog — replaces Chainlink)
PEDI_SCREEN_RWA_ABI = [
    {
        "inputs": [
            {"name": "parent", "type": "address"},
            {"name": "childAgeMonths", "type": "uint64"},
            {"name": "riskLevel", "type": "uint8"},
            {"name": "confidence", "type": "uint8"},
            {"name": "evidenceHash", "type": "bytes32"},
            {"name": "ipfsCID", "type": "string"},
        ],
        "name": "mintScreening",
        "outputs": [{"type": "uint256"}],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {
        "inputs": [{"name": "tokenId", "type": "uint256"}, {"name": "valid", "type": "bool"}],
        "name": "attestScreening",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {
        "inputs": [{"name": "", "type": "uint256"}],
        "name": "screenings",
        "outputs": [
            {"name": "childAgeMonths", "type": "uint64"},
            {"name": "riskLevel", "type": "uint8"},
            {"name": "confidence", "type": "uint8"},
            {"name": "evidenceHash", "type": "bytes32"},
            {"name": "chw", "type": "address"},
            {"name": "timestamp", "type": "uint256"},
            {"name": "verified", "type": "bool"},
            {"name": "attestationTimestamp", "type": "uint256"},
        ],
        "stateMutability": "view",
        "type": "function",
    },
]

DATA_FEED_ABI = [
    {
        "inputs": [{"name": "key", "type": "bytes32"}, {"name": "value", "type": "uint256"}],
        "name": "setData",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {
        "inputs": [{"name": "key", "type": "bytes32"}],
        "name": "getData",
        "outputs": [{"name": "", "type": "uint256"}, {"name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function",
    },
]

ATTESTATION_LOG_ABI = [
    {
        "inputs": [
            {"name": "dataHash", "type": "bytes32"},
            {"name": "valid", "type": "bool"},
            {"name": "description", "type": "string"},
        ],
        "name": "recordAttestation",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    },
]

# Insurance claims payout (PolicyRegistry, ClaimProcessor, USDC)
POLICY_REGISTRY_ABI = [
    {
        "inputs": [
            {"name": "holder", "type": "address"},
            {"name": "coverageAmount", "type": "uint256"},
            {"name": "premiumPaid", "type": "uint256"},
            {"name": "expiry", "type": "uint256"},
            {"name": "screeningHash", "type": "bytes32"},
        ],
        "name": "issuePolicy",
        "outputs": [{"name": "", "type": "uint256"}],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {
        "inputs": [{"name": "", "type": "uint256"}],
        "name": "policies",
        "outputs": [
            {"name": "holder", "type": "address"},
            {"name": "coverageAmount", "type": "uint256"},
            {"name": "premiumPaid", "type": "uint256"},
            {"name": "expiry", "type": "uint256"},
            {"name": "active", "type": "bool"},
            {"name": "screeningHash", "type": "bytes32"},
        ],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [{"name": "policyId", "type": "uint256"}],
        "name": "isPolicyActive",
        "outputs": [{"name": "", "type": "bool"}],
        "stateMutability": "view",
        "type": "function",
    },
    {"inputs": [], "name": "policyCounter", "outputs": [{"name": "", "type": "uint256"}], "stateMutability": "view", "type": "function"},
]
CLAIM_PROCESSOR_ABI = [
    {
        "inputs": [
            {"name": "policyId", "type": "uint256"},
            {"name": "amountRequested", "type": "uint256"},
            {"name": "evidenceHash", "type": "bytes32"},
        ],
        "name": "submitClaim",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {
        "inputs": [
            {"name": "claimId", "type": "uint256"},
            {"name": "approved", "type": "bool"},
            {"name": "approvedAmount", "type": "uint256"},
        ],
        "name": "attestClaim",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {
        "inputs": [{"name": "claimId", "type": "uint256"}],
        "name": "executePayout",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {
        "inputs": [{"name": "", "type": "uint256"}],
        "name": "claims",
        "outputs": [
            {"name": "policyId", "type": "uint256"},
            {"name": "claimant", "type": "address"},
            {"name": "amountRequested", "type": "uint256"},
            {"name": "amountApproved", "type": "uint256"},
            {"name": "evidenceHash", "type": "bytes32"},
            {"name": "submissionTime", "type": "uint256"},
            {"name": "attested", "type": "bool"},
            {"name": "paid", "type": "bool"},
        ],
        "stateMutability": "view",
        "type": "function",
    },
    {"inputs": [], "name": "claimCounter", "outputs": [{"name": "", "type": "uint256"}], "stateMutability": "view", "type": "function"},
]
INSURANCE_USDC_ABI = [
    {"inputs": [{"name": "to", "type": "address"}, {"name": "amount", "type": "uint256"}], "name": "mint", "outputs": [], "stateMutability": "nonpayable", "type": "function"},
    {"inputs": [{"name": "to", "type": "address"}, {"name": "amount", "type": "uint256"}], "name": "transfer", "outputs": [{"name": "", "type": "bool"}], "stateMutability": "nonpayable", "type": "function"},
    {"inputs": [], "name": "decimals", "outputs": [{"name": "", "type": "uint8"}], "stateMutability": "view", "type": "function"},
]

# ConsentRegistry (Creditcoin security): bytes32 recordId, patient-controlled consent + access log
CONSENT_REGISTRY_ABI = [
    {
        "inputs": [
            {"name": "recordId", "type": "bytes32"},
            {"name": "clinician", "type": "address"},
            {"name": "expiry", "type": "uint256"},
        ],
        "name": "grantConsent",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {
        "inputs": [{"name": "recordId", "type": "bytes32"}],
        "name": "revokeConsent",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {
        "inputs": [
            {"name": "recordId", "type": "bytes32"},
            {"name": "dataHash", "type": "bytes32"},
        ],
        "name": "accessRecord",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {
        "inputs": [{"name": "recordId", "type": "bytes32"}],
        "name": "getAccessLogs",
        "outputs": [
            {
                "components": [
                    {"name": "clinician", "type": "address"},
                    {"name": "timestamp", "type": "uint256"},
                    {"name": "dataHash", "type": "bytes32"},
                ],
                "name": "",
                "type": "tuple[]",
            },
        ],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [{"name": "recordId", "type": "bytes32"}],
        "name": "consents",
        "outputs": [
            {"name": "patient", "type": "address"},
            {"name": "clinician", "type": "address"},
            {"name": "expiry", "type": "uint256"},
            {"name": "active", "type": "bool"},
        ],
        "stateMutability": "view",
        "type": "function",
    },
]

# AuditLog (Creditcoin security): immutable provenance entries
AUDIT_LOG_ABI = [
    {
        "inputs": [
            {"name": "dataHash", "type": "bytes32"},
            {"name": "description", "type": "string"},
        ],
        "name": "addEntry",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {
        "inputs": [{"name": "id", "type": "uint256"}],
        "name": "getEntry",
        "outputs": [
            {"name": "submitter", "type": "address"},
            {"name": "timestamp", "type": "uint256"},
            {"name": "dataHash", "type": "bytes32"},
            {"name": "description", "type": "string"},
        ],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [],
        "name": "getEntriesCount",
        "outputs": [{"name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function",
    },
]

# HealthChain: consent and access logs (recordId = PediScreenNFT tokenId)
HEALTH_CHAIN_ABI = [
    {
        "inputs": [
            {"name": "recordId", "type": "uint256"},
            {"name": "clinician", "type": "address"},
            {"name": "expiry", "type": "uint256"},
        ],
        "name": "grantConsent",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {
        "inputs": [{"name": "recordId", "type": "uint256"}],
        "name": "revokeConsent",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {
        "inputs": [{"name": "recordId", "type": "uint256"}],
        "name": "accessRecord",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {
        "inputs": [{"name": "recordId", "type": "uint256"}],
        "name": "getAccessLogs",
        "outputs": [
            {
                "components": [
                    {"name": "clinician", "type": "address"},
                    {"name": "timestamp", "type": "uint256"},
                    {"name": "recordId", "type": "uint256"},
                ],
                "name": "",
                "type": "tuple[]",
            },
        ],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [{"name": "patient", "type": "address"}],
        "name": "getPatientRecords",
        "outputs": [{"name": "", "type": "uint256[]"}],
        "stateMutability": "view",
        "type": "function",
    },
]

# Federated learning (Creditcoin): FedCoordinator + PEDISC reward token
FED_COORDINATOR_ABI = [
    {
        "inputs": [],
        "name": "startRound",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {
        "inputs": [
            {"name": "roundId", "type": "uint256"},
            {"name": "dataPoints", "type": "uint256"},
            {"name": "modelHash", "type": "bytes32"},
        ],
        "name": "submitContribution",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {
        "inputs": [{"name": "globalModelHash", "type": "bytes32"}],
        "name": "closeRound",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {
        "inputs": [{"name": "roundId", "type": "uint256"}],
        "name": "getRoundContributions",
        "outputs": [
            {
                "components": [
                    {"name": "contributor", "type": "address"},
                    {"name": "round", "type": "uint256"},
                    {"name": "dataPoints", "type": "uint256"},
                    {"name": "modelHash", "type": "bytes32"},
                    {"name": "timestamp", "type": "uint256"},
                    {"name": "rewarded", "type": "bool"},
                ],
                "name": "",
                "type": "tuple[]",
            },
        ],
        "stateMutability": "view",
        "type": "function",
    },
    {"inputs": [], "name": "currentRound", "outputs": [{"name": "", "type": "uint256"}], "stateMutability": "view", "type": "function"},
    {
        "inputs": [{"name": "", "type": "uint256"}],
        "name": "rounds",
        "outputs": [
            {"name": "roundId", "type": "uint256"},
            {"name": "globalModelHash", "type": "bytes32"},
            {"name": "startTime", "type": "uint256"},
            {"name": "endTime", "type": "uint256"},
            {"name": "totalDataPoints", "type": "uint256"},
            {"name": "closed", "type": "bool"},
        ],
        "stateMutability": "view",
        "type": "function",
    },
]
PEDISC_FL_ABI = [
    {"inputs": [{"name": "to", "type": "address"}, {"name": "amount", "type": "uint256"}], "name": "mint", "outputs": [], "stateMutability": "nonpayable", "type": "function"},
    {"inputs": [{"name": "account", "type": "address"}], "name": "balanceOf", "outputs": [{"name": "", "type": "uint256"}], "stateMutability": "view", "type": "function"},
    {"inputs": [], "name": "decimals", "outputs": [{"name": "", "type": "uint8"}], "stateMutability": "view", "type": "function"},
]


def _artifact_path(name: str) -> Optional[Path]:
    """Resolve artifacts path: repo root is parent of backend."""
    try:
        # app/services/creditcoin.py -> backend -> repo root
        backend_dir = Path(__file__).resolve().parents[2]
        repo_root = backend_dir.parent
        path = repo_root / "artifacts" / "contracts" / f"{name}.sol" / f"{name}.json"
        return path if path.exists() else None
    except Exception:
        return None


def _load_abi_from_artifact(contract_name: str) -> Optional[list]:
    path = _artifact_path(contract_name)
    if not path:
        return None
    try:
        with open(path) as f:
            data = json.load(f)
        return data.get("abi")
    except Exception as e:
        logger.warning("Could not load ABI from %s: %s", path, e)
        return None


def get_nft_abi() -> list:
    abi = _load_abi_from_artifact("PediScreenNFT")
    return abi if abi else PEDI_SCREEN_NFT_ABI


def get_risk_engine_abi() -> list:
    abi = _load_abi_from_artifact("RiskEngine")
    return abi if abi else RISK_ENGINE_ABI


def get_chw_registry_abi() -> list:
    abi = _load_abi_from_artifact("CHWRegistry")
    return abi if abi else CHW_REGISTRY_ABI


def get_health_chain_abi() -> list:
    abi = _load_abi_from_artifact("HealthChain")
    return abi if abi else HEALTH_CHAIN_ABI


def get_consent_registry_abi() -> list:
    abi = _load_abi_from_artifact("ConsentRegistry")
    return abi if abi else CONSENT_REGISTRY_ABI


def get_audit_log_abi() -> list:
    abi = _load_abi_from_artifact("AuditLog")
    return abi if abi else AUDIT_LOG_ABI


def get_rwa_abi() -> list:
    abi = _load_abi_from_artifact("PediScreenRWA")
    return abi if abi else PEDI_SCREEN_RWA_ABI


def get_data_feed_abi() -> list:
    abi = _load_abi_from_artifact("DataFeed")
    return abi if abi else DATA_FEED_ABI


def get_attestation_log_abi() -> list:
    abi = _load_abi_from_artifact("AttestationLog")
    return abi if abi else ATTESTATION_LOG_ABI


def get_insurance_registry_abi() -> list:
    abi = _load_abi_from_artifact("PolicyRegistry")
    return abi if abi else POLICY_REGISTRY_ABI


def get_insurance_processor_abi() -> list:
    abi = _load_abi_from_artifact("ClaimProcessor")
    return abi if abi else CLAIM_PROCESSOR_ABI


def _load_abi_insurance_usdc() -> Optional[list]:
    for name in ("MockUSDC", "mocks/MockUSDC"):
        try:
            backend_dir = Path(__file__).resolve().parents[2]
            repo_root = backend_dir.parent
            parts = name.split("/")
            base = parts[-1]
            path = repo_root / "artifacts" / "contracts" / (name + ".sol") / (base + ".json")
            if path.exists():
                with open(path) as f:
                    return json.load(f).get("abi")
        except Exception:
            continue
    return None


def get_insurance_usdc_abi() -> list:
    abi = _load_abi_insurance_usdc()
    return abi if abi else INSURANCE_USDC_ABI


def get_fed_coordinator_abi() -> list:
    abi = _load_abi_from_artifact("FedCoordinator")
    return abi if abi else FED_COORDINATOR_ABI


def get_fed_pedisc_abi() -> list:
    abi = _load_abi_from_artifact("PEDISC")
    return abi if abi else PEDISC_FL_ABI


# Lazy-initialized globals
_w3: Optional[Any] = None
_backend_account: Optional[Any] = None
_nft_contract: Optional[Any] = None
_risk_engine_contract: Optional[Any] = None
_chw_registry_contract: Optional[Any] = None
_health_chain_contract: Optional[Any] = None
_rwa_contract: Optional[Any] = None
_data_feed_contract: Optional[Any] = None
_attestation_log_contract: Optional[Any] = None
_consent_registry_contract: Optional[Any] = None
_audit_log_contract: Optional[Any] = None
_insurance_registry_contract: Optional[Any] = None
_insurance_processor_contract: Optional[Any] = None
_insurance_usdc_contract: Optional[Any] = None
_fed_coordinator_contract: Optional[Any] = None
_fed_pedisc_contract: Optional[Any] = None


def is_creditcoin_configured() -> bool:
    if not _WEB3_AVAILABLE:
        return False
    rpc = os.getenv("CREDITCOIN_RPC")
    key = os.getenv("CTC_PRIVATE_KEY") or os.getenv("BACKEND_PRIVATE_KEY")
    nft_addr = os.getenv("NFT_CONTRACT_ADDRESS")
    return bool(rpc and key and nft_addr)


def get_web3() -> Optional[Any]:
    global _w3
    if not _WEB3_AVAILABLE:
        return None
    if _w3 is not None:
        return _w3
    rpc = os.getenv("CREDITCOIN_RPC", "https://testnet.creditcoin.network")
    _w3 = Web3(Web3.HTTPProvider(rpc))
    if not _w3.is_connected():
        logger.warning("Creditcoin RPC not connected: %s", rpc)
        return _w3
    return _w3


def get_backend_account() -> Optional[Any]:
    global _backend_account
    if not _WEB3_AVAILABLE:
        return None
    if _backend_account is not None:
        return _backend_account
    # Support both CTC_PRIVATE_KEY and BACKEND_PRIVATE_KEY (spec)
    key = os.getenv("CTC_PRIVATE_KEY") or os.getenv("BACKEND_PRIVATE_KEY")
    if not key:
        return None
    try:
        _backend_account = Account.from_key(key)
        return _backend_account
    except Exception as e:
        logger.warning("Invalid CTC_PRIVATE_KEY: %s", e)
        return None


def get_chain_id() -> int:
    return int(os.getenv("CREDITCOIN_CHAIN_ID", "337"))


def get_nft_contract():
    global _nft_contract
    if _nft_contract is not None:
        return _nft_contract
    w3 = get_web3()
    addr = os.getenv("NFT_CONTRACT_ADDRESS")
    if not w3 or not addr:
        return None
    _nft_contract = w3.eth.contract(
        address=Web3.to_checksum_address(addr),
        abi=get_nft_abi(),
    )
    return _nft_contract


def get_risk_engine_contract():
    global _risk_engine_contract
    if _risk_engine_contract is not None:
        return _risk_engine_contract
    w3 = get_web3()
    addr = os.getenv("RISK_ENGINE_ADDRESS")
    if not w3 or not addr:
        return None
    _risk_engine_contract = w3.eth.contract(
        address=Web3.to_checksum_address(addr),
        abi=get_risk_engine_abi(),
    )
    return _risk_engine_contract


def get_chw_registry_contract():
    global _chw_registry_contract
    if _chw_registry_contract is not None:
        return _chw_registry_contract
    w3 = get_web3()
    addr = os.getenv("CHW_REGISTRY_ADDRESS")
    if not w3 or not addr:
        return None
    _chw_registry_contract = w3.eth.contract(
        address=Web3.to_checksum_address(addr),
        abi=get_chw_registry_abi(),
    )
    return _chw_registry_contract


def get_health_chain_contract():
    """HealthChain contract for consent and access logs (recordId = screening tokenId)."""
    global _health_chain_contract
    if _health_chain_contract is not None:
        return _health_chain_contract
    w3 = get_web3()
    addr = os.getenv("HEALTH_CHAIN_ADDRESS")
    if not w3 or not addr:
        return None
    _health_chain_contract = w3.eth.contract(
        address=Web3.to_checksum_address(addr),
        abi=get_health_chain_abi(),
    )
    return _health_chain_contract


def get_rwa_contract():
    """PediScreenRWA contract (RWA NFT with built-in attestation; Creditcoin USC)."""
    global _rwa_contract
    if _rwa_contract is not None:
        return _rwa_contract
    w3 = get_web3()
    addr = os.getenv("RWA_CONTRACT_ADDRESS")
    if not w3 or not addr:
        return None
    _rwa_contract = w3.eth.contract(
        address=Web3.to_checksum_address(addr),
        abi=get_rwa_abi(),
    )
    return _rwa_contract


def get_data_feed_contract():
    """DataFeed contract (external data oracle; replaces Chainlink Data Feeds)."""
    global _data_feed_contract
    if _data_feed_contract is not None:
        return _data_feed_contract
    w3 = get_web3()
    addr = os.getenv("DATA_FEED_ADDRESS")
    if not w3 or not addr:
        return None
    _data_feed_contract = w3.eth.contract(
        address=Web3.to_checksum_address(addr),
        abi=get_data_feed_abi(),
    )
    return _data_feed_contract


def get_attestation_log_contract():
    """AttestationLog contract (optional attestation log)."""
    global _attestation_log_contract
    if _attestation_log_contract is not None:
        return _attestation_log_contract
    w3 = get_web3()
    addr = os.getenv("ATTESTATION_LOG_ADDRESS")
    if not w3 or not addr:
        return None
    _attestation_log_contract = w3.eth.contract(
        address=Web3.to_checksum_address(addr),
        abi=get_attestation_log_abi(),
    )
    return _attestation_log_contract


def get_consent_registry_contract():
    """ConsentRegistry contract (patient-controlled consent + access log; bytes32 recordId)."""
    global _consent_registry_contract
    if _consent_registry_contract is not None:
        return _consent_registry_contract
    w3 = get_web3()
    addr = os.getenv("CONSENT_REGISTRY_ADDRESS")
    if not w3 or not addr:
        return None
    _consent_registry_contract = w3.eth.contract(
        address=Web3.to_checksum_address(addr),
        abi=get_consent_registry_abi(),
    )
    return _consent_registry_contract


def get_audit_log_contract():
    """AuditLog contract (immutable provenance entries)."""
    global _audit_log_contract
    if _audit_log_contract is not None:
        return _audit_log_contract
    w3 = get_web3()
    addr = os.getenv("AUDIT_LOG_ADDRESS")
    if not w3 or not addr:
        return None
    _audit_log_contract = w3.eth.contract(
        address=Web3.to_checksum_address(addr),
        abi=get_audit_log_abi(),
    )
    return _audit_log_contract


def get_insurance_registry_contract():
    """PolicyRegistry contract (insurance policies for claims payout)."""
    global _insurance_registry_contract
    if _insurance_registry_contract is not None:
        return _insurance_registry_contract
    w3 = get_web3()
    addr = os.getenv("INSURANCE_REGISTRY_ADDRESS") or os.getenv("REGISTRY_ADDRESS")
    if not w3 or not addr:
        return None
    _insurance_registry_contract = w3.eth.contract(
        address=Web3.to_checksum_address(addr),
        abi=get_insurance_registry_abi(),
    )
    return _insurance_registry_contract


def get_insurance_processor_contract():
    """ClaimProcessor contract (claim submission, attestation, USDC payout)."""
    global _insurance_processor_contract
    if _insurance_processor_contract is not None:
        return _insurance_processor_contract
    w3 = get_web3()
    addr = os.getenv("INSURANCE_PROCESSOR_ADDRESS") or os.getenv("PROCESSOR_ADDRESS")
    if not w3 or not addr:
        return None
    _insurance_processor_contract = w3.eth.contract(
        address=Web3.to_checksum_address(addr),
        abi=get_insurance_processor_abi(),
    )
    return _insurance_processor_contract


def get_insurance_usdc_contract():
    """USDC (or MockUSDC) contract for insurance payouts."""
    global _insurance_usdc_contract
    if _insurance_usdc_contract is not None:
        return _insurance_usdc_contract
    w3 = get_web3()
    addr = os.getenv("USDC_ADDRESS")
    if not w3 or not addr:
        return None
    _insurance_usdc_contract = w3.eth.contract(
        address=Web3.to_checksum_address(addr),
        abi=get_insurance_usdc_abi(),
    )
    return _insurance_usdc_contract


def get_fed_coordinator_contract():
    """FedCoordinator contract (Creditcoin federated learning: rounds, contributions, rewards)."""
    global _fed_coordinator_contract
    if _fed_coordinator_contract is not None:
        return _fed_coordinator_contract
    w3 = get_web3()
    addr = os.getenv("FED_COORDINATOR_ADDRESS")
    if not w3 or not addr:
        return None
    _fed_coordinator_contract = w3.eth.contract(
        address=Web3.to_checksum_address(addr),
        abi=get_fed_coordinator_abi(),
    )
    return _fed_coordinator_contract


def get_fed_pedisc_contract():
    """PEDISC token contract for federated learning rewards (balance, mint by FedCoordinator)."""
    global _fed_pedisc_contract
    if _fed_pedisc_contract is not None:
        return _fed_pedisc_contract
    w3 = get_web3()
    addr = os.getenv("FED_PEDISC_TOKEN_ADDRESS") or os.getenv("PEDISC_TOKEN_ADDRESS")
    if not w3 or not addr:
        return None
    _fed_pedisc_contract = w3.eth.contract(
        address=Web3.to_checksum_address(addr),
        abi=get_fed_pedisc_abi(),
    )
    return _fed_pedisc_contract


def is_insurance_configured() -> bool:
    """True if Creditcoin insurance stack (registry, processor, USDC) is set."""
    if not _WEB3_AVAILABLE:
        return False
    rpc = os.getenv("CREDITCOIN_RPC")
    key = os.getenv("CTC_PRIVATE_KEY") or os.getenv("BACKEND_PRIVATE_KEY")
    reg = os.getenv("INSURANCE_REGISTRY_ADDRESS") or os.getenv("REGISTRY_ADDRESS")
    proc = os.getenv("INSURANCE_PROCESSOR_ADDRESS") or os.getenv("PROCESSOR_ADDRESS")
    usdc_addr = os.getenv("USDC_ADDRESS")
    return bool(rpc and key and reg and proc and usdc_addr)


def is_rwa_configured() -> bool:
    """True if Creditcoin RPC, key, and RWA contract are set."""
    if not _WEB3_AVAILABLE:
        return False
    rpc = os.getenv("CREDITCOIN_RPC")
    key = os.getenv("CTC_PRIVATE_KEY") or os.getenv("BACKEND_PRIVATE_KEY")
    rwa_addr = os.getenv("RWA_CONTRACT_ADDRESS")
    return bool(rpc and key and rwa_addr)


def is_federated_configured() -> bool:
    """True if Creditcoin FL stack (RPC, key, FedCoordinator) is set."""
    if not _WEB3_AVAILABLE:
        return False
    rpc = os.getenv("CREDITCOIN_RPC")
    key = os.getenv("CTC_PRIVATE_KEY") or os.getenv("BACKEND_PRIVATE_KEY") or os.getenv("AGGREGATOR_PRIVATE_KEY")
    fed_addr = os.getenv("FED_COORDINATOR_ADDRESS")
    return bool(rpc and key and fed_addr)
