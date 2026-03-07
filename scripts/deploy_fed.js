/**
 * Deploy federated learning stack on Creditcoin EVM: PEDISC (FL reward token), FedCoordinator.
 * Usage: npx hardhat run scripts/deploy_fed.js --network creditcoinTestnet
 * Set DEPLOYER_PRIVATE_KEY and optionally CREDITCOIN_RPC_URL in .env.
 * Gas token: CTC. Chain ID: 337 (testnet) / 336 (mainnet).
 */
const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying federated learning stack with:", deployer.address);

  const chainId = Number((await hre.ethers.provider.getNetwork()).chainId);
  console.log("Chain ID:", chainId);

  // 1. PEDISC — FL reward token (100M initial supply)
  const PEDISC = await hre.ethers.getContractFactory("PEDISC");
  const pedisc = await PEDISC.deploy();
  await pedisc.waitForDeployment();
  const pediscAddress = await pedisc.getAddress();
  console.log("PEDISC deployed to:", pediscAddress);

  // 2. FedCoordinator
  const Fed = await hre.ethers.getContractFactory("FedCoordinator");
  const fed = await Fed.deploy(pediscAddress);
  await fed.waitForDeployment();
  const fedAddress = await fed.getAddress();
  console.log("FedCoordinator deployed to:", fedAddress);

  // 3. Grant MINTER_ROLE on PEDISC to FedCoordinator (so it can mint rewards on closeRound)
  const MINTER_ROLE = await pedisc.MINTER_ROLE();
  await pedisc.grantRole(MINTER_ROLE, fedAddress);
  console.log("Granted MINTER_ROLE to FedCoordinator on PEDISC");

  // 4. Grant AGGREGATOR_ROLE to deployer (can start/close rounds)
  const AGGREGATOR_ROLE = await fed.AGGREGATOR_ROLE();
  await fed.grantRole(AGGREGATOR_ROLE, deployer.address);
  console.log("Granted AGGREGATOR_ROLE to deployer on FedCoordinator");

  // 5. Grant CONTRIBUTOR_ROLE to deployer (for demo; in production grant to each hospital/CHW wallet)
  const CONTRIBUTOR_ROLE = await fed.CONTRIBUTOR_ROLE();
  await fed.grantRole(CONTRIBUTOR_ROLE, deployer.address);
  console.log("Granted CONTRIBUTOR_ROLE to deployer on FedCoordinator (demo)");

  console.log("\n--- Set in .env (backend and frontend) ---");
  console.log("CREDITCOIN_CHAIN_ID=" + chainId);
  console.log("VITE_CHAIN_ID=" + chainId);
  console.log("FED_COORDINATOR_ADDRESS=" + fedAddress);
  console.log("PEDISC_TOKEN_ADDRESS=" + pediscAddress);
  console.log("VITE_FED_COORDINATOR_ADDRESS=" + fedAddress);
  console.log("VITE_PEDISC_TOKEN_ADDRESS=" + pediscAddress);
  console.log("# Backend aggregator (start/close round): use CTC_PRIVATE_KEY or AGGREGATOR_PRIVATE_KEY");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
