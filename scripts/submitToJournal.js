/**
 * submitToJournal.js
 * ──────────────────
 * Submit an IPFS CID to a specific journal in PaperRegistry, paying the
 * required submission fee.
 *
 * Usage:
 *   node scripts/submitToJournal.js <contractAddress> <journalId> <ipfsCID> [feeInEther]
 *
 * If feeInEther is omitted the script reads the on-chain submissionFee automatically.
 *
 * Required .env variables:
 *   PRIVATE_KEY  — wallet that will sign & pay
 *   RPC_URL      — JSON-RPC endpoint
 */

require("dotenv").config();
const { ethers } = require("ethers");
const fs         = require("fs");
const path       = require("path");

const artifactPath = path.join(
  __dirname,
  "../artifacts/contracts/PaperRegistry.sol/PaperRegistry.json"
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
  console.log("║   Proof of Precedence — Submit to Journal    ║");
  console.log("╚══════════════════════════════════════════════╝\n");

  const contractAddress = process.argv[2] || process.env.CONTRACT_ADDRESS;
  const journalId       = process.argv[3];
  const ipfsCID         = process.argv[4];
  const feeArg          = process.argv[5]; // optional override in ETH

  if (!contractAddress || !journalId || !ipfsCID) {
    console.error(
      "Usage: node scripts/submitToJournal.js <contractAddress> <journalId> <ipfsCID> [feeInEther]"
    );
    process.exit(1);
  }

  const privateKey = process.env.PRIVATE_KEY;
  const rpcUrl     = process.env.RPC_URL;

  if (!privateKey || !rpcUrl) {
    console.error("❌  Missing PRIVATE_KEY or RPC_URL in .env");
    process.exit(1);
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const signer   = new ethers.Wallet(privateKey, provider);
  const registry = new ethers.Contract(contractAddress, abi, signer);

  // Resolve fee
  let feeWei;
  if (feeArg) {
    feeWei = ethers.parseEther(feeArg);
  } else {
    const journal = await registry.journals(journalId);
    feeWei = journal.submissionFee;
    console.log(`Auto-detected fee : ${ethers.formatEther(feeWei)} ETH`);
  }

  console.log(`Author (signer)  : ${signer.address}`);
  console.log(`Contract address : ${contractAddress}`);
  console.log(`Journal ID       : ${journalId}`);
  console.log(`IPFS CID         : ${ipfsCID}`);
  console.log(`Fee sent         : ${ethers.formatEther(feeWei)} ETH\n`);

  // Pre-flight duplicate check
  const alreadyExists = await registry.paperExists(ipfsCID);
  if (alreadyExists) {
    console.error("❌  This CID has already been registered on-chain.");
    process.exit(1);
  }

  console.log("Sending transaction…");
  const tx = await registry.submitToJournal(ipfsCID, journalId, { value: feeWei });
  console.log(`Transaction hash : ${tx.hash}`);
  console.log("Waiting for confirmation…");

  const receipt = await tx.wait(1);

  console.log("\n✅  Paper submitted to journal successfully!");
  console.log(`    Transaction hash : ${receipt.hash}`);
  console.log(`    Block number     : ${receipt.blockNumber}`);
  console.log(`    Gas used         : ${receipt.gasUsed.toString()}`);
  console.log(`    Author           : ${signer.address}`);
  console.log(`    Journal ID       : ${journalId}`);
  console.log(`    IPFS CID         : ${ipfsCID}\n`);
}

main().catch((err) => {
  console.error("Submit to journal failed:", err.message);
  process.exitCode = 1;
});
