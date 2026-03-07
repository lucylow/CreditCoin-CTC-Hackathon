# backend/app/depin/auth.py
"""Device authentication: verify request signature (ECDSA) and return Device."""

import base64
import hashlib
from datetime import datetime
from typing import Optional

from fastapi import Request, HTTPException, Depends
from sqlalchemy.orm import Session

from app.depin.database import get_depin_db
from app.depin.models import Device

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ec


def verify_device_signature_raw(
    device_id: str,
    signature_b64: str,
    body_bytes: bytes,
    db: Session,
) -> Optional[Device]:
    """
    Verify X-Device-ID + X-Signature against body (SHA256); update last_seen and return Device.
    Returns None if invalid.
    """
    if not device_id or not signature_b64:
        return None
    device = db.query(Device).filter(Device.device_id == device_id).first()
    if not device or not device.active:
        return None
    body_digest = hashlib.sha256(body_bytes).digest()
    try:
        public_key = serialization.load_pem_public_key(device.public_key.encode())
        signature = base64.b64decode(signature_b64)
        if isinstance(public_key, ec.EllipticCurvePublicKey):
            public_key.verify(signature, body_digest, ec.ECDSA(hashes.SHA256()))
        else:
            return None
    except (InvalidSignature, ValueError, TypeError):
        return None
    device.last_seen = datetime.utcnow()
    db.commit()
    return device


async def verify_device_signature(
    request: Request,
    db: Session = Depends(get_depin_db),
) -> Device:
    """
    FastAPI dependency: read body, verify X-Device-ID + X-Signature, store body on request.state for route.
    """
    device_id = request.headers.get("X-Device-ID")
    signature_b64 = request.headers.get("X-Signature")
    if not device_id or not signature_b64:
        raise HTTPException(status_code=401, detail="Missing X-Device-ID or X-Signature")
    body = await request.body()
    device = verify_device_signature_raw(device_id, signature_b64, body, db)
    if not device:
        raise HTTPException(status_code=401, detail="Invalid or inactive device or invalid signature")
    request.state.depin_body = body
    return device
