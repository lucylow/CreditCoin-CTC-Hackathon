# Creditcoin EVM Integration

PediScreen AI’s blockchain layer runs on **Creditcoin** (dual-chain: Native + EVM). The EVM chain keeps **low-cost minting** (gas token **CTC**) and **permanent legal anchoring**; **Universal Smart Contracts (USC)** provide trustless AI oracle verification without Chainlink.

## Summary

| Component        | Before (Polygon)     | Creditcoin                          |
|-----------------|----------------------|-------------------------------------|
| Smart contracts | Solidity on Polygon  | Solidity on Creditcoin EVM          |
| Gas token       | MATIC                | **CTC**                             |
| RPC             | polygon-rpc          | `https://testnet.creditcoin.network` |
| Chain ID        | 137 / 80001          | **336** (mainnet) / **337** (testnet) |
| Oracle          | Chainlink            | **Creditcoin USC + Attestor** (backend) |
| Explorer        | polygonscan.com      | explorer.creditcoin.org             |

## RWA (Real World Assets)

Each screening is a **non-fungible token (NFT)** on Creditcoin — a tamper-proof, patient-owned digital asset representing a verified developmental assessment. The **evidence hash** (keccak256 of IPFS CID + canonical report JSON) cryptographically binds the on-chain token to the off-chain medical data. All Polygon-specific code is removed; gas is paid in **CTC**.

## Contracts (Creditcoin EVM)

**RWA stack (primary; replaces Chainlink):**

- **PediScreenRWA.sol** — ERC-721 RWA NFT with built-in attestation; minted by backend (MINTER_ROLE), attested by Creditcoin Attestor (ATTESTOR_ROLE). Replaces Polygon NFT + Chainlink verification.
- **DataFeed.sol** — External data oracle (exchange rates, regional indices); trusted backend (DATA_PROVIDER_ROLE) pushes data. Replaces Chainlink Data Feeds.
- **AttestationLog.sol** — Optional log of all attestations (in addition to per-NFT `verified` on PediScreenRWA).

**Existing stack (optional):**

- **PediScreenNFT.sol** — ERC-721 “PediScreen RWA Certificate”; minted by CHWs, verified by RiskEngine.
- **RiskEngine.sol** — USC attestor for PediScreenNFT.
- **CHWRegistry.sol** — CHW staking in **PEDISC** (ERC-20).
- **PEDISCToken.sol** — ERC-20 staking token for CHWRegistry.
- **HealthChain.sol** — Permissioned data-sharing; consent and access logs (recordId = tokenId).

**Security (Creditcoin-native, no raw PHI on-chain):**

- **ConsentRegistry.sol** — Patient-controlled access; `recordId = bytes32` (keccak256 of patient + data_hash + expiry). Grant/revoke consent; clinician access logs. Roles: PATIENT_ROLE, CLINICIAN_ROLE.
- **AuditLog.sol** — Immutable append-only provenance (data hash + description).

Deploy security stack (from repo root):

```bash
npx hardhat run scripts/deploy_security.js --network creditcoinTestnet
```

Set `CONSENT_REGISTRY_ADDRESS`, `AUDIT_LOG_ADDRESS`, and ensure backend has PATIENT_ROLE and CLINICIAN_ROLE (deploy script grants to deployer).

Deploy RWA stack (from repo root):

```bash
export DEPLOYER_PRIVATE_KEY=0x...
npx hardhat run scripts/deploy_rwa.js --network creditcoinTestnet
```

Deploy existing stack:

```bash
npx hardhat run scripts/deploy-creditcoin.js --network creditcoinTestnet
```

Set the printed env vars in `.env` (backend) and frontend (e.g. Vite `VITE_*`). **Polygon networks have been removed from Hardhat config;** use Creditcoin testnet/mainnet only.

## Backend (FastAPI)

- **Config:** `CREDITCOIN_RPC`, `CREDITCOIN_CHAIN_ID`, `CTC_PRIVATE_KEY` or `BACKEND_PRIVATE_KEY`. For RWA: `RWA_CONTRACT_ADDRESS`, `DATA_FEED_ADDRESS`, `ATTESTATION_LOG_ADDRESS`. Optional: `EXCHANGE_RATE_API_KEY` for data-feed refresh. For **security (consent + audit):** `CONSENT_REGISTRY_ADDRESS`, `AUDIT_LOG_ADDRESS`. For existing stack: `NFT_CONTRACT_ADDRESS`, `RISK_ENGINE_ADDRESS`, `CHW_REGISTRY_ADDRESS`, `PEDISC_TOKEN_ADDRESS`, `HEALTH_CHAIN_ADDRESS`. Optional: `PINATA_JWT` or Pinata keys for IPFS.
- **Core:** `backend/app/core/creditcoin.py` — Re-exports Web3/contract access and `build_and_send_tx` helper.
- **Service:** `backend/app/services/creditcoin.py` — Web3 client, contract wrappers (NFT, RiskEngine, CHWRegistry, HealthChain, **RWA, DataFeed, AttestationLog**).
- **API (RWA — Creditcoin USC, no Chainlink):** `backend/app/api/rwa.py`:
  - `POST /api/rwa/mint` — Mint screening as RWA NFT (PediScreenRWA). Body: `parent_address`, `child_age_months`, `risk_level`, `confidence`, `report_json`. Returns `token_id`, `tx_hash`, `ipfs_cid`, `evidence_hash`.
  - `POST /api/rwa/attest` — Submit attestation (Creditcoin Attestor). Body: `token_id`, `valid`. Updates PediScreenRWA and optionally AttestationLog.
  - `POST /api/rwa/data-feed/update` — Update a data feed key (e.g. exchange rate, regional index). Body: `key`, `value`.
  - `GET /api/rwa/data-feed/{key}` — Read data feed value.
  - `POST /api/rwa/data-feed/refresh-exchange-rate` — Fetch USD/CAD from external API and push to DataFeed (replaces Chainlink price feed).
- **API (existing):** `backend/app/api/creditcoin_screening.py`:
  - `POST /api/creditcoin/screening/mint` — Body: `MintRequest` (parent_address, child_age_months, risk_level, confidence, report_json). Pin report to IPFS, compute evidenceHash, call `PediScreenNFT.mintScreening` (backend must have CHW_ROLE). Returns `MintResponse` (tx_hash, token_id, ipfs_cid, evidence_hash).
  - `POST /api/creditcoin/screening/verify` — Body: `AttestationRequest` (token_id, is_valid, proof_hash). Call `RiskEngine.submitAttestation` (backend must have ATTESTOR_ROLE).
  - `GET /api/creditcoin/chw/register-info` — Returns MIN_STAKE and instructions for CHW self-registration.
  - `GET /api/creditcoin/health` — RPC and contract config check (includes `health_chain_configured`).
  - **Healthchain:** `POST /api/creditcoin/consent/grant` — Body: `record_id`, `clinician_address`, `expiry` (Unix timestamp). Backend must have PATIENT_ROLE for demo; in production the patient should call the contract from their wallet.
  - `POST /api/creditcoin/consent/revoke/{record_id}` — Revoke consent for a record (caller must be the patient).
  - `GET /api/creditcoin/access-logs/{record_id}` — Return access logs for a record (backend must have CLINICIAN_ROLE to call the contract view).
- **API (Security — ConsentRegistry + AuditLog; bytes32 recordId, no PHI on-chain):** `backend/app/api/security.py`:
  - `POST /api/security/records` — Submit encrypted record and register consent. Body: `patient_address`, `encrypted_data`, `tag`, `nonce`, `data_hash` (SHA3-256 hex), `clinician_address`, `expiry`. Returns `record_id` (bytes32 hex), `tx_hash`. Backend must have PATIENT_ROLE for demo.
  - `POST /api/security/access` — Log clinician access (requires CLINICIAN_ROLE and valid consent). Body: `record_id`, `clinician_address`, `data_hash`.
  - `POST /api/security/revoke` — Revoke consent. Body: `record_id`. Caller must be the patient for that record.
  - `GET /api/security/access-logs?record_id=0x...` — View access logs for a record (backend with CLINICIAN_ROLE can read).
  - `GET /api/security/audit?limit=10` — Read last N entries from AuditLog.
  - `POST /api/security/audit/add` — Append AuditLog entry. Body: `data_hash`, `description`.

Encryption (client-side in production): `backend/app/services/encryption.py` — AES-256-GCM; `hash_data()` for SHA3-256 on-chain commitment. Dependencies: `web3`, `eth-account`, `pycryptodome` (see `backend/requirements.txt`).

## Frontend

- **Config:** `src/config/blockchain.ts` — `PEDISCREEN_NFT_ADDRESS`, `RISK_ENGINE_ADDRESS`, `CHW_REGISTRY_ADDRESS`, `PEDISC_TOKEN_ADDRESS`, `VITE_HEALTH_CHAIN_ADDRESS` (Creditcoin Healthchain), `CHAIN_ID` (337/336), `getChainRpcUrl`, `getChainName`, `getBlockExplorerTxUrl` (Creditcoin).
- Use Creditcoin Testnet (chainId 337) or Mainnet (336) in wagmi/WalletConnect; gas is displayed in **CTC**. For Healthchain consent/access logs, set `VITE_HEALTH_CHAIN_ADDRESS` and call the backend consent/access-logs endpoints or the contract directly from the patient/clinician wallet.

## CHW onboarding

1. CHW gets PEDISC (e.g. from deployer or faucet).
2. CHW approves `CHWRegistry` to spend `MIN_STAKE` PEDISC.
3. CHW calls `CHWRegistry.register()` from their wallet (or frontend triggers the tx).

Backend does not call `register()` for the CHW; the CHW signs the tx.

## Testing on Creditcoin Testnet

1. Deploy contracts (see above).
2. Set all env vars (backend + frontend).
3. Grant CHW_ROLE to the backend wallet on PediScreenNFT (done by deploy script for deployer).
4. Run backend, call `POST /api/creditcoin/screening/mint` with JSON body `{ "parent_address": "0x...", "child_age_months": 24, "risk_level": 0, "confidence": 85, "report_json": { ... } }` and Pinata configured; then `POST /api/creditcoin/screening/verify` with body `{ "token_id": <id>, "is_valid": true }`.
5. With HealthChain deployed and `HEALTH_CHAIN_ADDRESS` set, grant consent: `POST /api/creditcoin/consent/grant` with `{ "record_id": <token_id>, "clinician_address": "0x...", "expiry": <unix_ts> }`. Get access logs: `GET /api/creditcoin/access-logs/<record_id>` (backend must have CLINICIAN_ROLE).
