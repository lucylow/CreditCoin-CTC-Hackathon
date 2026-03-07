# DePIN + Edge AI Integration

Decentralized physical infrastructure (DePIN) and edge AI devices for pediatric screening: device registration, sensor data ingestion, edge inference coordination, IPFS storage, and generic blockchain anchoring (no Polygon).

## Architecture

- **Sensors** (wearables, environmental, cameras): authenticate with ECDSA; send data to `POST /api/depin/sensor/data`.
- **Edge devices** (Raspberry Pi, Jetson): register, pull latest model from IPFS, poll `GET /api/depin/task/next`, run MedGemma locally, submit results to `POST /api/depin/inference/result`.
- **Backend**: validates signatures, stores data in DePIN DB (SQLite or PostgreSQL), optionally pins to IPFS (Pinata) and anchors hashes via a generic blockchain client.

## Backend layout

```
backend/app/depin/
├── __init__.py
├── models.py       # Device, SensorData, EdgeInference, ModelVersion, ScreeningTask
├── database.py     # SQLAlchemy engine/session (DEPIN_DATABASE_URI or sqlite)
├── auth.py         # verify_device_signature (X-Device-ID, X-Signature, body SHA256)
├── schemas.py      # Pydantic request models
├── blockchain.py   # Abstract BlockchainClient + MockBlockchainClient
├── services.py     # pin_to_ipfs (Pinata), anchor_hash (blockchain)
└── router.py      # All DePIN API routes
```

## API

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/depin/device/register` | None | Register device (device_id, device_type, owner_wallet, public_key, firmware_version) |
| POST | `/api/depin/sensor/data` | Device signature | Ingest sensor payload; optional IPFS + blockchain anchor |
| GET | `/api/depin/model/latest` | None | Latest active model version + IPFS CID |
| POST | `/api/depin/task` | None | Create pending screening task (sensor_data_ids) |
| GET | `/api/depin/task/next` | Device signature | Assign next pending task to device |
| POST | `/api/depin/inference/result` | Device signature | Submit edge inference result; optional IPFS + anchor |

## Device authentication

- **Headers**: `X-Device-ID`, `X-Signature` (base64-encoded ECDSA signature of SHA256(request body)).
- **Flow**: Device signs `SHA256(body)` with its private key; backend loads public key from DB and verifies. Use PEM-encoded EC public key (e.g. secp256k1) at registration.

## Config

- `DEPIN_DATABASE_URI`: PostgreSQL (e.g. `postgresql+pg8000://user:pass@host/depin`) or leave unset for SQLite `./depin.db`.
- `DEPIN_PIN_SENSOR_DATA`: Pin sensor payloads to IPFS (default true).
- `DEPIN_ANCHOR_SENSOR_DATA` / `DEPIN_ANCHOR_INFERENCE`: Anchor hashes on blockchain (default false; uses mock client until a real chain is wired).

## Blockchain

- **Generic client**: `app/depin/blockchain.py` defines `BlockchainClient` and `MockBlockchainClient`. Replace with an Ethereum/Creditcoin/etc. implementation and inject via `get_blockchain_client()` for production.
- **No Polygon**: All Polygon-specific code is removed; anchoring is chain-agnostic.

## Database migrations

- With SQLite (default), tables are created on first use via `Base.metadata.create_all`.
- For PostgreSQL, set `DEPIN_DATABASE_URI` and run migrations (e.g. Alembic) or run `create_all` once from a script that imports `app.depin.database.get_depin_engine` and `app.depin.models.Base`.
