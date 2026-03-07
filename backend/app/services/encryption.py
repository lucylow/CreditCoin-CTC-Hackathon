"""
AES-256-GCM encryption for PHI. Keys are patient-owned (client-side or derived from wallet).
Backend uses this for verification/demo only; in production the client encrypts before sending.
"""
from __future__ import annotations

import hashlib
from typing import Tuple

try:
    from Crypto.Cipher import AES
    from Crypto.Random import get_random_bytes
    _CRYPTO_AVAILABLE = True
except ImportError:
    _CRYPTO_AVAILABLE = False
    AES = None
    get_random_bytes = None


class EncryptionService:
    """Client-side style encryption: AES-256-GCM. Key never leaves patient/client in production."""

    @staticmethod
    def encrypt_data(data: bytes, key: bytes) -> Tuple[bytes, bytes, bytes]:
        """Encrypt data with AES-256-GCM. Returns (ciphertext, tag, nonce)."""
        if not _CRYPTO_AVAILABLE:
            raise RuntimeError("pycryptodome is required for encryption; pip install pycryptodome")
        if len(key) != 32:
            raise ValueError("Key must be 32 bytes for AES-256")
        cipher = AES.new(key, AES.MODE_GCM)
        ciphertext, tag = cipher.encrypt_and_digest(data)
        return ciphertext, tag, cipher.nonce

    @staticmethod
    def decrypt_data(ciphertext: bytes, tag: bytes, nonce: bytes, key: bytes) -> bytes:
        """Decrypt and verify AES-256-GCM."""
        if not _CRYPTO_AVAILABLE:
            raise RuntimeError("pycryptodome is required for decryption; pip install pycryptodome")
        cipher = AES.new(key, AES.MODE_GCM, nonce=nonce)
        return cipher.decrypt_and_verify(ciphertext, tag)

    @staticmethod
    def generate_key() -> bytes:
        """Generate a 256-bit key (for demo or client-side use)."""
        if not _CRYPTO_AVAILABLE:
            raise RuntimeError("pycryptodome is required; pip install pycryptodome")
        return get_random_bytes(32)

    @staticmethod
    def hash_data(data: bytes) -> str:
        """SHA3-256 hash for on-chain commitment (hex)."""
        return hashlib.sha3_256(data).hexdigest()
