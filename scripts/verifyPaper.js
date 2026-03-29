/**
 * verifyPaper.js
 * ──────────────
 * Reads the on-chain record for an IPFS CID and displays proof of precedence.
 * This is a READ-ONLY operation — it costs no gas.
 *
 * Usage:
 *   node scripts/verifyPaper.js <contractAddress> <ipfsCID>
 *
 * Example:
 *   node scripts/verifyPaper.js 0xABC...123 bafybeig...xyz
 *
 * Required .env variables:
 *   RPC_URL  — JSON-RPC endpoint (no private key needed for reads)
 */

require("dotenv").config();
const { ethers } = require("ethers");
const fs         = require("fs");
const path       = require("path");

// ── Load ABI ──────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  console.log("\n╔══════════════════════════════════════════════╗");
  console.log("║   Proof of Precedence — Verify Paper          ║");
  console.log("╚══════════════════════════════════════════════╝\n");

  // ── Parse CLI arguments ─────────────────────────────────────────────────
  const contractAddress = process.argv[2] || process.env.CONTRACT_ADDRESS;
  const ipfsCID         = process.argv[3];

  if (!contractAddress || !ipfsCID) {
    console.error("Usage: node scripts/verifyPaper.js <contractAddress> <ipfsCID>");
    process.exit(1);
  }

  const rpcUrl = process.env.RPC_URL;
  if (!rpcUrl) {
    console.error("❌  Missing RPC_URL in .env");
    process.exit(1);
  }

  // ── Connect (read-only — no private key needed) ──────────────────────────
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const registry = new ethers.Contract(contractAddress, abi, provider);

  console.log(`Contract address : ${contractAddress}`);
  console.log(`IPFS CID         : ${ipfsCID}\n`);
  console.log("Querying blockchain…\n");

  // ── Fetch the paper record ────────────────────────────────────────────────
  const [storedCID, author, timestamp, exists] = await registry.getPaper(ipfsCID);

  // ── Display verification result ───────────────────────────────────────────
  if (!exists) {
    console.log("══════════════════════════════════════════════════════");
    console.log("  ❌  PRECEDENCE NOT ESTABLISHED");
    console.log("══════════════════════════════════════════════════════");
    console.log("  This CID has NOT been registered on-chain.");
    console.log("  Anyone claiming precedence for this paper cannot");
    console.log("  prove it via this registry.\n");
    process.exit(0);
  }

  const unixTs    = Number(timestamp);
  const humanDate = new Date(unixTs * 1000).toUTCString();
  const totalPapers = await registry.totalPapers();

  // Pretty-print the proof
  console.log("══════════════════════════════════════════════════════");
  console.log("  ✅  PROOF OF PRECEDENCE ESTABLISHED");
  console.log("══════════════════════════════════════════════════════");
  console.log(`  IPFS CID         : ${storedCID}`);
  console.log(`  Author address   : ${author}`);
  console.log(`  Registered at    : ${humanDate}`);
  console.log(`  Unix timestamp   : ${unixTs}`);
  console.log(`  IPFS Gateway     : https://gateway.pinata.cloud/ipfs/${storedCID}`);
  console.log("──────────────────────────────────────────────────────");
  console.log(`  Total papers in registry : ${totalPapers.toString()}`);
  console.log("══════════════════════════════════════════════════════");

  console.log("\nWhat this proves:");
  console.log(`  • The wallet ${author}`);
  console.log(`    submitted this paper on ${humanDate}.`);
  console.log("  • The IPFS CID is a cryptographic hash of the paper's");
  console.log("    exact contents — any modification changes the CID.");
  console.log("  • The block timestamp is set by the Ethereum/Polygon");
  console.log("    network and cannot be falsified retroactively.");
  console.log("  • No earlier on-chain record exists for this CID.\n");
}

main().catch((err) => {
  console.error("Verification failed:", err.message);
  process.exitCode = 1;
});
