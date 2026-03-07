# backend/app/services/ipfs_pinata.py
"""
Optional IPFS pinning via Pinata for screening report metadata.
Set PINATA_JWT or PINATA_API_KEY + PINATA_SECRET_API_KEY in .env.
"""
from __future__ import annotations

import json
import os
from typing import Any, Dict

import httpx

from app.core.logger import logger


async def pin_json_to_ipfs(data: Dict[str, Any]) -> str | None:
    """
    Pin JSON to IPFS via Pinata. Returns IPFS CID (e.g. Qm...) or None if not configured.
    """
    jwt = os.getenv("PINATA_JWT")
    if jwt:
        return await _pin_via_pinata_jwt(data, jwt)
    api_key = os.getenv("PINATA_API_KEY")
    secret = os.getenv("PINATA_SECRET_API_KEY")
    if api_key and secret:
        return await _pin_via_pinata_key_secret(data, api_key, secret)
    logger.debug("Pinata not configured; skipping IPFS pin")
    return None


async def _pin_via_pinata_jwt(data: Dict[str, Any], jwt: str) -> str | None:
    try:
        body = json.dumps(data).encode("utf-8")
        async with httpx.AsyncClient() as client:
            r = await client.post(
                "https://api.pinata.cloud/pinning/pinJSONToIPFS",
                content=body,
                headers={
                    "Authorization": f"Bearer {jwt}",
                    "Content-Type": "application/json",
                },
                timeout=30.0,
            )
            r.raise_for_status()
            out = r.json()
            cid = out.get("IpfsHash")
            if not cid:
                logger.warning("Pinata JWT response missing IpfsHash: %s", out)
                return None
            return cid
    except httpx.HTTPStatusError as e:
        logger.warning("Pinata JWT pin HTTP error %s: %s", e.response.status_code, e.response.text[:200])
        return None
    except Exception as e:
        logger.warning("Pinata JWT pin failed: %s", e)
        return None


async def _pin_via_pinata_key_secret(
    data: Dict[str, Any], api_key: str, secret: str
) -> str | None:
    try:
        body = json.dumps(data).encode("utf-8")
        async with httpx.AsyncClient() as client:
            r = await client.post(
                "https://api.pinata.cloud/pinning/pinJSONToIPFS",
                content=body,
                headers={
                    "pinata_api_key": api_key,
                    "pinata_secret_api_key": secret,
                    "Content-Type": "application/json",
                },
                timeout=30.0,
            )
            r.raise_for_status()
            out = r.json()
            cid = out.get("IpfsHash")
            if not cid:
                logger.warning("Pinata key/secret response missing IpfsHash: %s", out)
                return None
            return cid
    except httpx.HTTPStatusError as e:
        logger.warning("Pinata key/secret pin HTTP error %s: %s", e.response.status_code, e.response.text[:200])
        return None
    except Exception as e:
        logger.warning("Pinata key/secret pin failed: %s", e)
        return None
