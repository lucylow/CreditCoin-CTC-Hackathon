# Federated Learning (Creditcoin EVM)

Privacy-preserving federated learning for PediScreen is coordinated on **Creditcoin EVM** (chain ID 337 testnet / 336 mainnet). Gas is paid in **CTC**. There are **no Polygon dependencies**.

## Architecture

- **Local training**: Hospitals/CHWs run MedGemma LoRA training locally (e.g. `training/finetune_lora.py`) on private data.
- **Gradient submission**: Only **model hashes** (or gradient update hashes) are sent to the aggregator; no raw data leaves the site.
- **Creditcoin contracts**: `FedCoordinator` records rounds and contributions; `PEDISC` token rewards contributors (10 PEDISC per datapoint when the round is closed).
- **Aggregator**: Starts rounds, collects contributions, performs FedAvg off-chain, closes the round with the new global model hash and triggers on-chain reward distribution.

## Contracts (Solidity)

| Contract         | Role |
|------------------|------|
| `PEDISC.sol`     | ERC-20 reward token (100M initial supply). FedCoordinator has MINTER_ROLE. |
| `FedCoordinator.sol` | Rounds, `submitContribution(roundId, dataPoints, modelHash)`, `closeRound(globalModelHash)`; distributes PEDISC to contributors. |

## Deployment (Creditcoin testnet)

```bash
npx hardhat run scripts/deploy_fed.js --network creditcoinTestnet
```

Set in `.env`:

- `FED_COORDINATOR_ADDRESS` — FedCoordinator contract
- `PEDISC_TOKEN_ADDRESS` — PEDISC (FL reward) token
- `CTC_PRIVATE_KEY` or `AGGREGATOR_PRIVATE_KEY` — for start/close round and (optionally) contributor submissions
- `CONTRIBUTOR_PRIVATE_KEY` — optional; used when frontend/API submit without passing a key (demo)

Frontend (Vite):

- `VITE_FED_COORDINATOR_ADDRESS`
- `VITE_PEDISC_TOKEN_ADDRESS`
- `VITE_CHAIN_ID=337`

## Backend API

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST   | `/api/federated/start-round` | Aggregator starts a new round |
| POST   | `/api/federated/submit`      | Submit contribution (round_id, data_path, data_points; backend runs mock/real training and submits to chain) |
| POST   | `/api/federated/close-round/{round_id}` | Aggregator closes round with global model hash; contract mints PEDISC to contributors |
| GET    | `/api/federated/round/current` | Current round ID |
| GET    | `/api/federated/round/{id}/contributions` | List contributions for a round |
| GET    | `/api/federated/balance?address=0x...` | PEDISC balance for address |

## Workflow

1. **Aggregator** starts a round: `POST /api/federated/start-round`.
2. **Hospitals/CHWs** run local training, then call `POST /api/federated/submit` with `round_id`, `data_path`, `data_points`. Backend computes model hash (mock or real) and submits to `FedCoordinator.submitContribution` (contributor must have CONTRIBUTOR_ROLE).
3. **Aggregator** fetches contributions with `GET /api/federated/round/{id}/contributions`, runs FedAvg off-chain, then `POST /api/federated/close-round/{id}` with `global_model_hash`. The contract closes the round and mints PEDISC to each contributor.

## Security and privacy

- No raw data is sent on-chain; only commitments (model/gradient hashes).
- In production, contributors should sign transactions with their own wallets; the backend should not hold contributor private keys.
- Rewards are distributed by the smart contract for transparency.

## References

- Creditcoin: [docs/CREDITCOIN_INTEGRATION.md](CREDITCOIN_INTEGRATION.md)
- AGENTS.md (Federated Learning section)
