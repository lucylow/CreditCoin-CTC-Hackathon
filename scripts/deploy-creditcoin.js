/**
 * Deploy Creditcoin EVM stack: PEDISC token, PediScreenNFT, RiskEngine, CHWRegistry, HealthChain.
 * Usage: npx hardhat run scripts/deploy-creditcoin.js --network creditcoinTestnet
 * Set DEPLOYER_PRIVATE_KEY and optionally CREDITCOIN_RPC_URL in .env.
 * Gas token: CTC.
 */
const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying Creditcoin stack with account:", deployer.address);

  const chainId = Number((await hre.ethers.provider.getNetwork()).chainId);
  console.log("Chain ID:", chainId);

  // 1. PEDISC token (for CHW staking)
  const PEDISCToken = await hre.ethers.getContractFactory("PEDISCToken");
  const pedisc = await PEDISCToken.deploy();
  await pedisc.waitForDeployment();
  const pediscAddress = await pedisc.getAddress();
  console.log("PEDISCToken deployed to:", pediscAddress);

  // 2. PediScreen NFT
  const PediScreenNFT = await hre.ethers.getContractFactory("PediScreenNFT");
  const nft = await PediScreenNFT.deploy();
  await nft.waitForDeployment();
  const nftAddress = await nft.getAddress();
  console.log("PediScreenNFT deployed to:", nftAddress);

  // 3. RiskEngine (needs NFT address)
  const RiskEngine = await hre.ethers.getContractFactory("RiskEngine");
  const riskEngine = await RiskEngine.deploy(nftAddress);
  await riskEngine.waitForDeployment();
  const riskEngineAddress = await riskEngine.getAddress();
  console.log("RiskEngine deployed to:", riskEngineAddress);

  // 4. CHWRegistry (needs PEDISC token)
  const CHWRegistry = await hre.ethers.getContractFactory("CHWRegistry");
  const chwRegistry = await CHWRegistry.deploy(pediscAddress);
  await chwRegistry.waitForDeployment();
  const chwRegistryAddress = await chwRegistry.getAddress();
  console.log("CHWRegistry deployed to:", chwRegistryAddress);

  // 5. HealthChain (consent and access logs; recordId = PediScreenNFT tokenId)
  const HealthChain = await hre.ethers.getContractFactory("HealthChain");
  const healthChain = await HealthChain.deploy();
  await healthChain.waitForDeployment();
  const healthChainAddress = await healthChain.getAddress();
  console.log("HealthChain deployed to:", healthChainAddress);

  // 6. Grant RISK_ENGINE_ROLE on NFT to RiskEngine so it can call setVerified
  const RISK_ENGINE_ROLE = await nft.RISK_ENGINE_ROLE();
  await nft.grantRole(RISK_ENGINE_ROLE, riskEngineAddress);
  console.log("Granted RISK_ENGINE_ROLE to RiskEngine on PediScreenNFT");

  // 8. Grant CHW_ROLE to deployer (backend can use this or a dedicated minter)
  const CHW_ROLE = await nft.CHW_ROLE();
  await nft.grantRole(CHW_ROLE, deployer.address);
  console.log("Granted CHW_ROLE to deployer on PediScreenNFT");

  // 9. Grant ATTESTOR_ROLE on RiskEngine to deployer (backend)
  const ATTESTOR_ROLE = await riskEngine.ATTESTOR_ROLE();
  await riskEngine.grantRole(ATTESTOR_ROLE, deployer.address);
  console.log("Granted ATTESTOR_ROLE to deployer on RiskEngine");

  // 10. HealthChain: grant PATIENT_ROLE and CLINICIAN_ROLE to deployer so backend can grant/revoke consent (demo) and read access logs
  const PATIENT_ROLE = await healthChain.PATIENT_ROLE();
  const CLINICIAN_ROLE = await healthChain.CLINICIAN_ROLE();
  await healthChain.grantRole(PATIENT_ROLE, deployer.address);
  await healthChain.grantRole(CLINICIAN_ROLE, deployer.address);
  console.log("Granted PATIENT_ROLE and CLINICIAN_ROLE to deployer on HealthChain");

  console.log("\n--- Set in .env (backend and frontend) ---");
  console.log("CREDITCOIN_CHAIN_ID=" + chainId);
  console.log("VITE_CHAIN_ID=" + chainId);
  console.log("VITE_PEDISC_TOKEN_ADDRESS=" + pediscAddress);
  console.log("VITE_PEDISCREEN_NFT_ADDRESS=" + nftAddress);
  console.log("VITE_RISK_ENGINE_ADDRESS=" + riskEngineAddress);
  console.log("VITE_CHW_REGISTRY_ADDRESS=" + chwRegistryAddress);
  console.log("VITE_HEALTH_CHAIN_ADDRESS=" + healthChainAddress);
  console.log("\nBackend (Creditcoin mint/verify + Healthchain):");
  console.log("PEDISC_TOKEN_ADDRESS=" + pediscAddress);
  console.log("NFT_CONTRACT_ADDRESS=" + nftAddress);
  console.log("RISK_ENGINE_ADDRESS=" + riskEngineAddress);
  console.log("CHW_REGISTRY_ADDRESS=" + chwRegistryAddress);
  console.log("HEALTH_CHAIN_ADDRESS=" + healthChainAddress);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
