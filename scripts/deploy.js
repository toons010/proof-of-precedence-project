/**
 * deploy.js
 * ─────────
 * Compiles and deploys the PaperRegistry contract to the selected network.
 *
 * Usage:
 *   npx hardhat run scripts/deploy.js --network localhost   (local Hardhat node)
 *   npx hardhat run scripts/deploy.js --network mumbai      (Polygon Mumbai)
 *
 * The deployed contract address is printed to stdout — copy it into your .env
 * as CONTRACT_ADDRESS so the other scripts can use it.
 */

const { ethers } = require("hardhat");

async function main() {
  console.log("\n╔══════════════════════════════════════════════╗");
  console.log("║   Proof of Precedence — Contract Deployment  ║");
  console.log("╚══════════════════════════════════════════════╝\n");

  // ── 1. Get the deploying signer ──────────────────────────────────────────
  const [deployer] = await ethers.getSigners();
  console.log(`Deployer address : ${deployer.address}`);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`Deployer balance : ${ethers.formatEther(balance)} ETH/MATIC\n`);

  // ── 2. Deploy PaperRegistry ──────────────────────────────────────────────
  console.log("Deploying PaperRegistry…");
  const PaperRegistry = await ethers.getContractFactory("PaperRegistry");
  const registry      = await PaperRegistry.deploy();

  // Wait for the deployment transaction to be mined
  await registry.waitForDeployment();

  const contractAddress = await registry.getAddress();

  // ── 3. Print results ─────────────────────────────────────────────────────
  console.log("\n✅  PaperRegistry deployed successfully!");
  console.log(`    Contract address : ${contractAddress}`);
  console.log(`    Transaction hash : ${registry.deploymentTransaction().hash}`);
  console.log(`    Block number     : ${registry.deploymentTransaction().blockNumber ?? "pending"}`);

  console.log("\n── Next step ──────────────────────────────────────────────────────────");
  console.log("Add the following line to your .env file:");
  console.log(`  CONTRACT_ADDRESS=${contractAddress}\n`);
}

main().catch((err) => {
  console.error("Deployment failed:", err);
  process.exitCode = 1;
});
