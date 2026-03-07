/**
 * Deploy Creditcoin security stack: ConsentRegistry, AuditLog.
 * Usage: npx hardhat run scripts/deploy_security.js --network creditcoinTestnet
 * Set DEPLOYER_PRIVATE_KEY and optionally CREDITCOIN_RPC_URL in .env.
 * Gas token: CTC. Patient-controlled consent + immutable audit; no PHI on-chain.
 */
const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying security stack with account:", deployer.address);

  const chainId = Number((await hre.ethers.provider.getNetwork()).chainId);
  console.log("Chain ID:", chainId);

  // 1. ConsentRegistry (patient-controlled access; bytes32 recordId)
  const ConsentRegistry = await hre.ethers.getContractFactory("ConsentRegistry");
  const consent = await ConsentRegistry.deploy();
  await consent.waitForDeployment();
  const consentAddress = await consent.getAddress();
  console.log("ConsentRegistry deployed to:", consentAddress);

  // 2. AuditLog (immutable provenance entries)
  const AuditLog = await hre.ethers.getContractFactory("AuditLog");
  const audit = await AuditLog.deploy();
  await audit.waitForDeployment();
  const auditAddress = await audit.getAddress();
  console.log("AuditLog deployed to:", auditAddress);

  // Grant roles to deployer (backend) for demo: backend can act as patient and clinician
  const PATIENT_ROLE = await consent.PATIENT_ROLE();
  const CLINICIAN_ROLE = await consent.CLINICIAN_ROLE();
  await consent.grantRole(PATIENT_ROLE, deployer.address);
  await consent.grantRole(CLINICIAN_ROLE, deployer.address);
  console.log("Granted PATIENT_ROLE and CLINICIAN_ROLE to deployer on ConsentRegistry");

  console.log("\n--- Set in .env (backend) ---");
  console.log("CONSENT_REGISTRY_ADDRESS=" + consentAddress);
  console.log("AUDIT_LOG_ADDRESS=" + auditAddress);
  console.log("\nBackend (CTC_PRIVATE_KEY or BACKEND_PRIVATE_KEY) will use this account for:");
  console.log("  - grantConsent / revokeConsent (as patient in demo)");
  console.log("  - accessRecord (as clinician); getAccessLogs");
  console.log("  - addEntry on AuditLog");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
