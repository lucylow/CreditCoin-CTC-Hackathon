/**
 * Deploy Health Insurance Claims Payout stack on Creditcoin EVM:
 * MockUSDC, PolicyRegistry, ClaimProcessor.
 * Usage: npx hardhat run scripts/deploy_insurance.js --network creditcoinTestnet
 * Set DEPLOYER_PRIVATE_KEY and optionally CREDITCOIN_RPC_URL in .env.
 * Gas token: CTC.
 */
const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying insurance stack with account:", deployer.address);

  const chainId = Number((await hre.ethers.provider.getNetwork()).chainId);
  console.log("Chain ID:", chainId);

  // 1. Mock USDC (for testnet; use real USDC address on mainnet)
  const MockUSDC = await hre.ethers.getContractFactory("MockUSDC");
  const usdc = await MockUSDC.deploy(deployer.address);
  await usdc.waitForDeployment();
  const usdcAddress = await usdc.getAddress();
  console.log("MockUSDC deployed to:", usdcAddress);

  // 2. PolicyRegistry
  const PolicyRegistry = await hre.ethers.getContractFactory("PolicyRegistry");
  const registry = await PolicyRegistry.deploy();
  await registry.waitForDeployment();
  const registryAddress = await registry.getAddress();
  console.log("PolicyRegistry deployed to:", registryAddress);

  // 3. ClaimProcessor (needs USDC and PolicyRegistry)
  const ClaimProcessor = await hre.ethers.getContractFactory("ClaimProcessor");
  const processor = await ClaimProcessor.deploy(usdcAddress, registryAddress);
  await processor.waitForDeployment();
  const processorAddress = await processor.getAddress();
  console.log("ClaimProcessor deployed to:", processorAddress);

  // 4. Grant roles
  const UNDERWRITER_ROLE = await registry.UNDERWRITER_ROLE();
  await registry.grantRole(UNDERWRITER_ROLE, deployer.address);
  console.log("Granted UNDERWRITER_ROLE to deployer on PolicyRegistry");

  const ATTESTOR_ROLE = await processor.ATTESTOR_ROLE();
  await processor.grantRole(ATTESTOR_ROLE, deployer.address);
  console.log("Granted ATTESTOR_ROLE to deployer on ClaimProcessor");

  // 5. Fund processor with USDC for payouts
  const payoutReserve = hre.ethers.parseUnits("100000", 6); // 100k USDC (6 decimals)
  await usdc.mint(processorAddress, payoutReserve);
  console.log("Minted 100,000 USDC to ClaimProcessor for payouts");

  console.log("\n--- Set in .env (backend) ---");
  console.log("CREDITCOIN_CHAIN_ID=" + chainId);
  console.log("USDC_ADDRESS=" + usdcAddress);
  console.log("INSURANCE_REGISTRY_ADDRESS=" + registryAddress);
  console.log("INSURANCE_PROCESSOR_ADDRESS=" + processorAddress);
  console.log("\nBackend needs UNDERWRITER and ATTESTOR (deployer has both):");
  console.log("CREDITCOIN_RPC=" + (process.env.CREDITCOIN_RPC_URL || "https://testnet.creditcoin.network"));
  console.log("CTC_PRIVATE_KEY=0x... or BACKEND_PRIVATE_KEY=0x...");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
