# backend/app/api/federated.py
"""
Federated learning API: start/close rounds, submit contributions, list contributions.
Creditcoin EVM (chain 337/336). Gas: CTC.
"""
from __future__ import annotations

import os
from typing import Any, List

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.core.creditcoin import (
    build_and_send_tx,
    get_fed_coordinator_contract,
    get_chain_id,
    get_nonce,
    is_federated_configured,
)
from app.core.logger import logger
from app.services.creditcoin import get_web3
from app.services.federated import run_local_training, compute_model_hash, submit_contribution

router = APIRouter(prefix="/federated", tags=["federated"])


class StartRoundResponse(BaseModel):
    round_id: int
    tx_hash: str


class SubmitContributionRequest(BaseModel):
    round_id: int
    data_path: str = "mock"
    data_points: int = 100
    contributor_key: str = ""


    class Config:
        extra = "forbid"


class SubmitContributionResponse(BaseModel):
    tx_hash: str
    model_hash: str
    data_points: int


class CloseRoundRequest(BaseModel):
    global_model_hash: str


class ContributionItem(BaseModel):
    contributor: str
    round: int
    dataPoints: int
    modelHash: str
    timestamp: int
    rewarded: bool


def _get_account():
    from app.services.creditcoin import get_backend_account
    key = os.getenv("CTC_PRIVATE_KEY") or os.getenv("BACKEND_PRIVATE_KEY") or os.getenv("AGGREGATOR_PRIVATE_KEY")
    if key:
        try:
            from eth_account import Account
            return Account.from_key(key)
        except Exception:
            pass
    return get_backend_account()


@router.post("/start-round", response_model=StartRoundResponse)
async def start_round():
    """Aggregator starts a new federated learning round (Creditcoin)."""
    if not is_federated_configured():
        raise HTTPException(503, "Federated learning not configured (CREDITCOIN_RPC, FED_COORDINATOR_ADDRESS, private key)")
    fed = get_fed_coordinator_contract()
    w3 = get_web3()
    account = _get_account()
    if not fed or not w3 or not account:
        raise HTTPException(503, "Creditcoin or aggregator account not available")

    tx = fed.functions.startRound().build_transaction({
        "from": account.address,
        "nonce": get_nonce(),
        "gas": 150_000,
        "chainId": get_chain_id(),
    })
    if "gasPrice" not in tx:
        tx["gasPrice"] = w3.eth.gas_price
    receipt = build_and_send_tx(tx)
    # Parse RoundStarted(roundId, startTime) from logs
    round_id = None
    for log in receipt.get("logs", []):
        topics = log.get("topics", [])
        if not topics:
            continue
        # RoundStarted(uint256 indexed roundId, uint256 startTime) -> topics[0] = event sig, topics[1] = roundId
        if len(topics) >= 2:
            try:
                round_id = int(topics[1].hex(), 16)
                break
            except Exception:
                continue
    if round_id is None:
        # Fallback: read currentRound from contract (it was just incremented)
        round_id = fed.functions.currentRound().call()
    tx_hash = receipt["transactionHash"].hex()
    logger.info("Fed round started round_id=%s tx=%s", round_id, tx_hash)
    return StartRoundResponse(round_id=round_id, tx_hash=tx_hash)


@router.post("/submit", response_model=SubmitContributionResponse)
async def submit_contribution_endpoint(req: SubmitContributionRequest):
    """
    Submit a contribution for the current round. Runs local training (mock or real), then submits to Creditcoin.
    contributor_key: private key of wallet with CONTRIBUTOR_ROLE (demo only; in production use wallet signing).
    """
    if not is_federated_configured():
        raise HTTPException(503, "Federated learning not configured")
    if not req.contributor_key:
        raise HTTPException(400, "contributor_key required to sign the transaction")

    model_hash_bytes = run_local_training(req.data_path)
    model_hash_hex = compute_model_hash(model_hash_bytes)
    if len(model_hash_hex) >= 2 and model_hash_hex[:2] == "0x":
        pass
    else:
        model_hash_hex = "0x" + model_hash_hex
    if len(model_hash_hex) != 66:
        model_hash_hex = get_web3().keccak(primitive=model_hash_bytes).hex()

    try:
        receipt = submit_contribution(
            req.round_id,
            req.data_points,
            model_hash_hex,
            req.contributor_key,
        )
    except Exception as e:
        logger.exception("Submit contribution failed: %s", e)
        raise HTTPException(500, str(e))

    return SubmitContributionResponse(
        tx_hash=receipt["transactionHash"].hex(),
        model_hash=model_hash_hex,
        data_points=req.data_points,
    )


@router.post("/close-round/{round_id}")
async def close_round(round_id: int, body: CloseRoundRequest):
    """Aggregator closes the round with the aggregated global model hash and distributes PEDISC rewards."""
    if not is_federated_configured():
        raise HTTPException(503, "Federated learning not configured")
    fed = get_fed_coordinator_contract()
    w3 = get_web3()
    account = _get_account()
    if not fed or not w3 or not account:
        raise HTTPException(503, "Creditcoin or aggregator account not available")

    global_hash = body.global_model_hash.strip()
    if not global_hash.startswith("0x"):
        global_hash = "0x" + global_hash
    if len(global_hash) != 66:
        global_hash = w3.keccak(text=global_hash).hex()

    tx = fed.functions.closeRound(bytes.fromhex(global_hash[2:])).build_transaction({
        "from": account.address,
        "nonce": get_nonce(),
        "gas": 300_000,
        "chainId": get_chain_id(),
    })
    if "gasPrice" not in tx:
        tx["gasPrice"] = w3.eth.gas_price
    receipt = build_and_send_tx(tx)
    logger.info("Fed round closed round_id=%s tx=%s", round_id, receipt["transactionHash"].hex())
    return {"tx_hash": receipt["transactionHash"].hex()}


@router.get("/round/{round_id}/contributions", response_model=List[ContributionItem])
async def get_round_contributions(round_id: int):
    """List all contributions for a round (view call, no gas)."""
    fed = get_fed_coordinator_contract()
    if not fed:
        raise HTTPException(503, "FedCoordinator not configured")
    try:
        contribs: List[Any] = fed.functions.getRoundContributions(round_id).call()
    except Exception as e:
        logger.warning("getRoundContributions failed: %s", e)
        raise HTTPException(500, str(e))
    out = []
    for c in contribs:
        if isinstance(c, (list, tuple)) and len(c) >= 6:
            contributor, rnd, data_pts, model_hash, ts, rewarded = c[0], c[1], c[2], c[3], c[4], c[5]
            model_hash_hex = model_hash.hex() if hasattr(model_hash, "hex") else str(model_hash)
            if not model_hash_hex.startswith("0x"):
                model_hash_hex = "0x" + model_hash_hex
            out.append(ContributionItem(
                contributor=contributor if isinstance(contributor, str) else contributor,
                round=rnd,
                dataPoints=data_pts,
                modelHash=model_hash_hex,
                timestamp=ts,
                rewarded=rewarded,
            ))
        else:
            out.append(ContributionItem(
                contributor=getattr(c, "contributor", str(c)),
                round=getattr(c, "round", round_id),
                dataPoints=getattr(c, "dataPoints", 0),
                modelHash=getattr(c, "modelHash", b"").hex() if hasattr(getattr(c, "modelHash", b""), "hex") else str(getattr(c, "modelHash", "")),
                timestamp=getattr(c, "timestamp", 0),
                rewarded=getattr(c, "rewarded", False),
            ))
    return out


@router.get("/round/current")
async def get_current_round():
    """Return current open round ID (view call)."""
    fed = get_fed_coordinator_contract()
    if not fed:
        raise HTTPException(503, "FedCoordinator not configured")
    current = fed.functions.currentRound().call()
    return {"current_round": current}
