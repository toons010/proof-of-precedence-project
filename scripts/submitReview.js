/**
 * submitReview.js
 * ───────────────
 * Registers the caller as a reviewer (idempotent) and submits a review
 * for an IPFS CID via the ReviewManager contract.
 *
 * Usage:
 *   node scripts/submitReview.js <reviewManagerAddress> <ipfsCID> <score> "<comments>"
 *
 * Example:
 *   node scripts/submitReview.js 0xABC...123 bafybei...xyz 4 "Well-structured paper."
 *
 * Required .env variables:
 *   PRIVATE_KEY  — reviewer's wallet
 *   RPC_URL      — JSON-RPC endpoint
 */

require("dotenv").config();
const { ethers } = require("ethers");
const fs         = require("fs");
const path       = require("path");

const artifactPath = path.join(
  __dirname,
  "../artifacts/contracts/ReviewManager.sol/ReviewManager.json"
);

if (!fs.existsSync(artifactPath)) {
  console.error(
    "\n❌  ABI not found. Did you run `npx hardhat compile` first?\n" +
    `    Expected: ${artifactPath}`
  );
  process.exit(1);
}

const { abi } = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

async function main() {
  console.log("\n╔══════════════════════════════════════════════╗");
  console.log("║   Proof of Precedence — Submit Review        ║");
  console.log("╚══════════════════════════════════════════════╝\n");

  const reviewManagerAddress = process.argv[2] || process.env.REVIEW_MANAGER_ADDRESS;
  const ipfsCID              = process.argv[3];
  const score                = Number(process.argv[4]);
  const comments             = process.argv[5] || "";

  if (!reviewManagerAddress || !ipfsCID || !score) {
    console.error(
      "Usage: node scripts/submitReview.js <reviewManagerAddress> <ipfsCID> <score 1-5> \"<comments>\""
    );
    process.exit(1);
  }

  if (score < 1 || score > 5 || !Number.isInteger(score)) {
    console.error("❌  Score must be an integer between 1 and 5.");
    process.exit(1);
  }

  const privateKey = process.env.PRIVATE_KEY;
  const rpcUrl     = process.env.RPC_URL;

  if (!privateKey || !rpcUrl) {
    console.error("❌  Missing PRIVATE_KEY or RPC_URL in .env");
    process.exit(1);
  }

  const provider      = new ethers.JsonRpcProvider(rpcUrl);
  const signer        = new ethers.Wallet(privateKey, provider);
  const reviewManager = new ethers.Contract(reviewManagerAddress, abi, signer);

  console.log(`Reviewer (signer)       : ${signer.address}`);
  console.log(`ReviewManager address   : ${reviewManagerAddress}`);
  console.log(`IPFS CID                : ${ipfsCID}`);
  console.log(`Score                   : ${score}/5`);
  console.log(`Comments                : ${comments || "(none)"}\n`);

  // Register reviewer if not already registered
  const already = await reviewManager.isReviewer(signer.address);
  if (!already) {
    console.log("Registering as reviewer…");
    const regTx = await reviewManager.registerReviewer();
    await regTx.wait(1);
    console.log("✅  Registered as reviewer.\n");
  } else {
    console.log("ℹ  Already a registered reviewer.\n");
  }

  // Check not already reviewed
  const alreadyReviewed = await reviewManager.hasReviewed(ipfsCID, signer.address);
  if (alreadyReviewed) {
    console.error("❌  You have already reviewed this paper.");
    process.exit(1);
  }

  console.log("Submitting review…");
  const tx = await reviewManager.submitReview(ipfsCID, score, comments);
  console.log(`Transaction hash : ${tx.hash}`);
  console.log("Waiting for confirmation…");

  const receipt = await tx.wait(1);

  console.log("\n✅  Review submitted successfully!");
  console.log(`    Transaction hash : ${receipt.hash}`);
  console.log(`    Block number     : ${receipt.blockNumber}`);
  console.log(`    Gas used         : ${receipt.gasUsed.toString()}\n`);
}

main().catch((err) => {
  console.error("Submit review failed:", err.message);
  process.exitCode = 1;
});
