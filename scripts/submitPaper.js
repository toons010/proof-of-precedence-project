/**
 * submitPaper.js
 * ──────────────
 * Submits an IPFS CID to the deployed PaperRegistry smart contract,
 * recording the caller's address and a block timestamp on-chain.
 *
 * Usage:
 *   node scripts/submitPaper.js <contractAddress> <ipfsCID>
 *
 * Example:
 *   node scripts/submitPaper.js 0xABC...123 bafybeig...xyz
 *
 * Required .env variables:
 *   PRIVATE_KEY      — wallet that will sign the transaction
 *   RPC_URL          — JSON-RPC endpoint
 */

require("dotenv").config();
const { ethers } = require("ethers");
const fs         = require("fs");
const path       = require("path");

// ── Load the compiled ABI ──────────────────────────────────────────────────────
// Hardhat places artifacts in ./artifacts/contracts/<name>.sol/<name>.json
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
  console.log("║   Proof of Precedence — Submit Paper          ║");
  console.log("╚══════════════════════════════════════════════╝\n");

  // ── Parse CLI arguments ─────────────────────────────────────────────────
  const contractAddress = process.argv[2] || process.env.CONTRACT_ADDRESS;
  const ipfsCID         = process.argv[3];

  if (!contractAddress || !ipfsCID) {
    console.error("Usage: node scripts/submitPaper.js <contractAddress> <ipfsCID>");
    process.exit(1);
  }

  // ── Set up provider + signer ────────────────────────────────────────────
  const privateKey = process.env.PRIVATE_KEY;
  const rpcUrl     = process.env.RPC_URL;

  if (!privateKey || !rpcUrl) {
    console.error("❌  Missing PRIVATE_KEY or RPC_URL in .env");
    process.exit(1);
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const signer   = new ethers.Wallet(privateKey, provider);

  console.log(`Author (signer)  : ${signer.address}`);
  console.log(`Contract address : ${contractAddress}`);
  console.log(`IPFS CID         : ${ipfsCID}\n`);

  // ── Connect to deployed contract ────────────────────────────────────────
  const registry = new ethers.Contract(contractAddress, abi, signer);

  // ── Check for duplicate before sending tx (saves gas on failure) ────────
  const alreadyExists = await registry.paperExists(ipfsCID);
  if (alreadyExists) {
    console.error("❌  This CID has already been registered on-chain.");
    console.log("    Run verifyPaper.js to see the existing record.\n");
    process.exit(1);
  }

  // ── Send the submitPaper transaction ────────────────────────────────────
  console.log("Sending transaction…");
  const tx = await registry.submitPaper(ipfsCID);
  console.log(`Transaction hash : ${tx.hash}`);
  console.log("Waiting for confirmation…");

  const receipt = await tx.wait(1); // wait for 1 block confirmation

  // ── Decode the emitted PaperSubmitted event ──────────────────────────────
  const event = receipt.logs
    .map((log) => {
      try { return registry.interface.parseLog(log); } catch { return null; }
    })
    .find((e) => e && e.name === "PaperSubmitted");

  const timestamp = event
    ? Number(event.args.timestamp)
    : Math.floor(Date.now() / 1000);

  const submittedAt = new Date(timestamp * 1000).toUTCString();

  // ── Print results ────────────────────────────────────────────────────────
  console.log("\n✅  Paper submitted successfully!");
  console.log(`    Transaction hash : ${receipt.hash}`);
  console.log(`    Block number     : ${receipt.blockNumber}`);
  console.log(`    Gas used         : ${receipt.gasUsed.toString()}`);
  console.log(`    Author           : ${signer.address}`);
  console.log(`    IPFS CID         : ${ipfsCID}`);
  console.log(`    Timestamp (UTC)  : ${submittedAt}`);
  console.log(`    Timestamp (Unix) : ${timestamp}`);

  console.log("\n── Precedence established ─────────────────────────────────────────────");
  console.log(`This paper was registered at block ${receipt.blockNumber}.`);
  console.log("No one can claim an earlier on-chain registration for this CID.\n");

  console.log("── Next step ──────────────────────────────────────────────────────────");
  console.log("Verify the record at any time:");
  console.log(`  node scripts/verifyPaper.js ${contractAddress} ${ipfsCID}\n`);
}

main().catch((err) => {
  console.error("Submit failed:", err.message);
  process.exitCode = 1;
});
