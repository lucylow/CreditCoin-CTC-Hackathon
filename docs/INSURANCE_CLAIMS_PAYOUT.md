# Health Insurance Claims Payout on Creditcoin EVM

Policyholders file claims; the backend (FastAPI) acts as **underwriter** (issue policy) and **attestor** (verify claim). Approved claims trigger automatic USDC payouts via smart contracts on Creditcoin EVM.

## Architecture

```
Frontend (React)  →  FastAPI Backend (Attestor)  →  Creditcoin EVM
                            ↓
                       IPFS (evidence)
```

- **PolicyRegistry**: Policies (holder, coverage, premium, expiry, screening hash).
- **ClaimProcessor**: Claim submission, attestation, USDC payout.
- **USDC**: ERC-20 (MockUSDC on testnet).
- **Backend**: UNDERWRITER on PolicyRegistry, ATTESTOR on ClaimProcessor.

## Contracts

| Contract         | Path                    | Role |
|------------------|-------------------------|------|
| PolicyRegistry   | `contracts/PolicyRegistry.sol`   | Store policies, issue/cancel |
| ClaimProcessor   | `contracts/ClaimProcessor.sol`   | Submit claim, attest, execute payout |
| MockUSDC        | `contracts/mocks/MockUSDC.sol`  | Testnet USDC (mint, transfer) |

## Deployment

From repo root (ensure Hardhat deps are installed, e.g. `npm install --save-dev hardhat @nomicfoundation/hardhat-ethers @nomicfoundation/hardhat-toolbox`):

```bash
npx hardhat run scripts/deploy_insurance.js --network creditcoinTestnet
```

Set in `.env`:

- `CREDITCOIN_RPC` / `CREDITCOIN_CHAIN_ID` (e.g. 337)
- `CTC_PRIVATE_KEY` or `BACKEND_PRIVATE_KEY`
- `USDC_ADDRESS`, `INSURANCE_REGISTRY_ADDRESS`, `INSURANCE_PROCESSOR_ADDRESS`

(Deploy script also accepts `REGISTRY_ADDRESS` / `PROCESSOR_ADDRESS`.)

## Backend API

Base path: `/api/insurance`.

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST   | `/policy/issue`   | Issue policy (underwriter); returns `policy_id` |
| POST   | `/claim/submit`   | Submit claim (tx from **policy holder**; for demo, use backend as holder) |
| POST   | `/claim/attest`   | Attest claim (approve/amount); attestor only |
| POST   | `/claim/execute/{claim_id}` | Execute USDC payout |
| GET    | `/policy/{policy_id}` | Read policy |
| GET    | `/claim/{claim_id}`   | Read claim |
| GET    | `/health`             | Insurance stack configured |

## Workflow

1. **Issue policy**: Backend calls `POST /api/insurance/policy/issue` with holder, coverage, premium, expiry, screening hash (bytes32 hex or string).
2. **Submit claim**: Policy holder submits via `POST /api/insurance/claim/submit` (policy_id, amount_requested, evidence_hash). For testing, set holder to backend address when issuing the policy.
3. **Attest**: Backend fetches evidence (e.g. from IPFS), verifies (e.g. against screening/AI), then `POST /api/insurance/claim/attest` with claim_id, approved, approved_amount.
4. **Payout**: Anyone calls `POST /api/insurance/claim/execute/{claim_id}` to send USDC to the claimant.

## Python

Backend uses existing Creditcoin stack: `app.core.creditcoin` (`get_nonce`, `build_and_send_tx`, `get_insurance_*_contract`). No extra Python deps beyond `web3`, `eth-account` (see `requirements.txt`).

## No Polygon

All logic and RPC are Creditcoin EVM only; no Polygon RPC or addresses.
