/**
 * Deploy Creditcoin RWA stack: PediScreenRWA, DataFeed, AttestationLog.
 * Usage: npx hardhat run scripts/deploy_rwa.js --network creditcoinTestnet
 * Set DEPLOYER_PRIVATE_KEY and optionally CREDITCOIN_RPC_URL in .env.
 * Gas token: CTC. Replaces Polygon + Chainlink with Creditcoin USC + Attestor.
 */
const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying RWA stack with account:", deployer.address);

  const chainId = Number((await hre.ethers.provider.getNetwork()).chainId);
  console.log("Chain ID:", chainId);

  // 1. PediScreenRWA (RWA NFT with built-in attestation)
  const RWA = await hre.ethers.getContractFactory("PediScreenRWA");
  const rwa = await RWA.deploy();
  await rwa.waitForDeployment();
  const rwaAddress = await rwa.getAddress();
  console.log("PediScreenRWA deployed to:", rwaAddress);

  // 2. DataFeed (external data oracle)
  const DataFeed = await hre.ethers.getContractFactory("DataFeed");
  const feed = await DataFeed.deploy();
  await feed.waitForDeployment();
  const feedAddress = await feed.getAddress();
  console.log("DataFeed deployed to:", feedAddress);

  // 3. AttestationLog (optional attestation log)
  const Attestation = await hre.ethers.getContractFactory("AttestationLog");
  const attest = await Attestation.deploy();
  await attest.waitForDeployment();
  const attestAddress = await attest.getAddress();
  console.log("AttestationLog deployed to:", attestAddress);

  // Grant roles to deployer (backend)
  const MINTER_ROLE = await rwa.MINTER_ROLE();
  const ATTESTOR_ROLE = await rwa.ATTESTOR_ROLE();
  await rwa.grantRole(MINTER_ROLE, deployer.address);
  await rwa.grantRole(ATTESTOR_ROLE, deployer.address);
  console.log("Granted MINTER_ROLE and ATTESTOR_ROLE to deployer on PediScreenRWA");

  const DATA_PROVIDER_ROLE = await feed.DATA_PROVIDER_ROLE();
  await feed.grantRole(DATA_PROVIDER_ROLE, deployer.address);
  console.log("Granted DATA_PROVIDER_ROLE to deployer on DataFeed");

  console.log("\n--- Set in .env (backend) ---");
  console.log("RWA_CONTRACT_ADDRESS=" + rwaAddress);
  console.log("DATA_FEED_ADDRESS=" + feedAddress);
  console.log("ATTESTATION_LOG_ADDRESS=" + attestAddress);
  console.log("\nOptional frontend (if using RWA NFT):");
  console.log("VITE_RWA_CONTRACT_ADDRESS=" + rwaAddress);
  console.log("VITE_DATA_FEED_ADDRESS=" + feedAddress);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
