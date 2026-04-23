/**
 * deploy.js
 * ─────────
 * Compiles and deploys PaperRegistry + ReviewManager to the selected network.
 *
 * Usage:
 *   npx hardhat run scripts/deploy.js --network localhost   (local Hardhat node)
 *   npx hardhat run scripts/deploy.js --network mumbai      (Polygon Mumbai)
 *
 * Both contract addresses are printed — copy them into your .env.
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
  await registry.waitForDeployment();
  const contractAddress = await registry.getAddress();

  console.log("\n✅  PaperRegistry deployed successfully!");
  console.log(`    Contract address : ${contractAddress}`);
  console.log(`    Transaction hash : ${registry.deploymentTransaction().hash}`);
  console.log(`    Block number     : ${registry.deploymentTransaction().blockNumber ?? "pending"}`);

  // ── 3. Deploy ReviewManager ──────────────────────────────────────────────
  console.log("\nDeploying ReviewManager…");
  const ReviewManager = await ethers.getContractFactory("ReviewManager");
  const reviewManager = await ReviewManager.deploy(contractAddress);
  await reviewManager.waitForDeployment();
  const reviewManagerAddress = await reviewManager.getAddress();

  console.log("\n✅  ReviewManager deployed successfully!");
  console.log(`    Contract address : ${reviewManagerAddress}`);
  console.log(`    Transaction hash : ${reviewManager.deploymentTransaction().hash}`);

  // ── 4. Deploy RewardSystem ──────────────────────────────────────────────
  console.log("\nDeploying RewardSystem…");
  const RewardSystem = await ethers.getContractFactory("RewardSystem");
  const rewardSystem = await RewardSystem.deploy(reviewManagerAddress);
  await rewardSystem.waitForDeployment();
  const rewardSystemAddress = await rewardSystem.getAddress();

  console.log("\n✅  RewardSystem deployed successfully!");
  console.log(`    Contract address : ${rewardSystemAddress}`);
  console.log(`    Transaction hash : ${rewardSystem.deploymentTransaction().hash}`);

  // ── 5. Print results ─────────────────────────────────────────────────────
  console.log("\n── Next step ──────────────────────────────────────────────────────────");
  console.log("Add the following lines to your .env file:");
  console.log(`  CONTRACT_ADDRESS=${contractAddress}`);
  console.log(`  REVIEW_MANAGER_ADDRESS=${reviewManagerAddress}`);
  console.log(`  REACT_APP_REWARD_CONTRACT_ADDRESS=${rewardSystemAddress}\n`);
}

main().catch((err) => {
  console.error("Deployment failed:", err);
  process.exitCode = 1;
});
