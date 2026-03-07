/**
 * Deploy DAO stack on Creditcoin EVM: PEDISCGovernance, Timelock, PediScreenDAO,
 * PediScreenDAOTreasury, CHWStaking. Gas: CTC. Chain ID: 337 (testnet) / 336 (mainnet).
 *
 * Usage: npx hardhat run scripts/deploy_dao.js --network creditcoinTestnet
 *
 * Prerequisites:
 *   - DEPLOYER_PRIVATE_KEY and CREDITCOIN_RPC_URL in .env
 *   - For Treasury: set USDC_ADDRESS (or deploy MockUSDC first and pass address)
 */
const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying DAO stack with account:", deployer.address);

  const chainId = Number((await hre.ethers.provider.getNetwork()).chainId);
  console.log("Chain ID:", chainId);

  // 1. PEDISCGovernance — governance token (ERC20Votes + Permit)
  const PEDISCGovernance = await hre.ethers.getContractFactory("PEDISCGovernance");
  const pedisc = await PEDISCGovernance.deploy();
  await pedisc.waitForDeployment();
  const pediscAddress = await pedisc.getAddress();
  console.log("PEDISCGovernance deployed to:", pediscAddress);

  // 2. TimelockController (2-day delay)
  const TimelockController = await hre.ethers.getContractFactory("TimelockController");
  const minDelay = 2 * 24 * 60 * 60; // 2 days
  const proposers = [deployer.address];
  const executors = [deployer.address];
  const timelock = await TimelockController.deploy(minDelay, proposers, executors, deployer.address);
  await timelock.waitForDeployment();
  const timelockAddress = await timelock.getAddress();
  console.log("TimelockController deployed to:", timelockAddress);

  // 3. PediScreenDAO (Governor)
  const PediScreenDAO = await hre.ethers.getContractFactory("PediScreenDAO");
  const dao = await PediScreenDAO.deploy(pediscAddress, timelockAddress);
  await dao.waitForDeployment();
  const daoAddress = await dao.getAddress();
  console.log("PediScreenDAO deployed to:", daoAddress);

  // 4. PediScreenDAOTreasury — payment token: use env or deploy MockUSDC
  const paymentTokenAddress = process.env.USDC_ADDRESS || process.env.TREASURY_PAYMENT_TOKEN;
  if (!paymentTokenAddress) {
    console.warn("USDC_ADDRESS / TREASURY_PAYMENT_TOKEN not set. Deploying MockUSDC for testnet.");
  }
  let treasuryPaymentToken = paymentTokenAddress;
  if (!treasuryPaymentToken) {
    const MockUSDC = await hre.ethers.getContractFactory("MockUSDC");
    const mockUsdc = await MockUSDC.deploy(deployer.address);
    await mockUsdc.waitForDeployment();
    treasuryPaymentToken = await mockUsdc.getAddress();
    console.log("MockUSDC (Treasury payment token) deployed to:", treasuryPaymentToken);
  }

  const PediScreenDAOTreasury = await hre.ethers.getContractFactory("PediScreenDAOTreasury");
  const treasury = await PediScreenDAOTreasury.deploy(treasuryPaymentToken);
  await treasury.waitForDeployment();
  const treasuryAddress = await treasury.getAddress();
  console.log("PediScreenDAOTreasury deployed to:", treasuryAddress);

  // 5. CHWStaking
  const CHWStaking = await hre.ethers.getContractFactory("CHWStaking");
  const staking = await CHWStaking.deploy(pediscAddress);
  await staking.waitForDeployment();
  const stakingAddress = await staking.getAddress();
  console.log("CHWStaking deployed to:", stakingAddress);

  // 6. Grant roles: DAO is proposer/executor on Timelock; DAO gets DAO_ROLE on Treasury; DAO gets STAKING_MANAGER on Staking
  const PROPOSER_ROLE = await timelock.PROPOSER_ROLE();
  const EXECUTOR_ROLE = await timelock.EXECUTOR_ROLE();
  await timelock.grantRole(PROPOSER_ROLE, daoAddress);
  await timelock.grantRole(EXECUTOR_ROLE, daoAddress);
  console.log("Granted Timelock proposer/executor to DAO");

  const DAO_ROLE = await treasury.DAO_ROLE();
  await treasury.grantRole(DAO_ROLE, daoAddress);
  console.log("Granted DAO_ROLE on Treasury to DAO");

  const STAKING_MANAGER = await staking.STAKING_MANAGER();
  await staking.grantRole(STAKING_MANAGER, daoAddress);
  console.log("Granted STAKING_MANAGER on Staking to DAO");

  // Optional: grant MINTER_ROLE on PEDISC to deployer (backend) for Stripe minting
  const MINTER_ROLE = await pedisc.MINTER_ROLE();
  await pedisc.grantRole(MINTER_ROLE, deployer.address);
  console.log("Granted MINTER_ROLE on PEDISC to deployer (use BACKEND_PRIVATE_KEY for Stripe mint)");

  console.log("\n--- Set in .env (backend) ---");
  console.log("CREDITCOIN_RPC=" + (process.env.CREDITCOIN_RPC_URL || "https://testnet.creditcoin.network"));
  console.log("CREDITCOIN_CHAIN_ID=" + chainId);
  console.log("BACKEND_PRIVATE_KEY=<deployer key for minting>");
  console.log("PEDISC_TOKEN_ADDRESS=" + pediscAddress);
  console.log("DAO_ADDRESS=" + daoAddress);
  console.log("TREASURY_ADDRESS=" + treasuryAddress);
  console.log("STAKING_ADDRESS=" + stakingAddress);
  console.log("TIMELOCK_ADDRESS=" + timelockAddress);
  if (treasuryPaymentToken && !paymentTokenAddress) {
    console.log("USDC_ADDRESS=" + treasuryPaymentToken + "  # MockUSDC if no real USDC");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
