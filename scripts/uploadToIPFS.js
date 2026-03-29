/**
 * uploadToIPFS.js
 * ───────────────
 * Uploads a local PDF file to IPFS via Pinata and prints the resulting CID.
 *
 * Usage:
 *   node scripts/uploadToIPFS.js <path-to-pdf>
 *
 * Example:
 *   node scripts/uploadToIPFS.js ./my-paper.pdf
 *
 * Required .env variables:
 *   PINATA_API_KEY
 *   PINATA_SECRET_KEY
 */

require("dotenv").config();
const fs       = require("fs");
const path     = require("path");
const FormData = require("form-data");
const fetch    = require("node-fetch");

// ── Pinata REST endpoint for pinning files ────────────────────────────────────
const PINATA_PIN_URL = "https://api.pinata.cloud/pinning/pinFileToIPFS";

/**
 * Uploads a file to IPFS via Pinata's REST API.
 * Returns the IPFS CID (Content Identifier) of the pinned file.
 *
 * @param {string} filePath  Absolute or relative path to the file to upload.
 * @returns {Promise<string>} The IPFS CID.
 */
async function uploadToIPFS(filePath) {
  // ── Validate credentials ────────────────────────────────────────────────
  const apiKey    = process.env.PINATA_API_KEY;
  const secretKey = process.env.PINATA_SECRET_KEY;

  if (!apiKey || !secretKey) {
    throw new Error(
      "Missing Pinata credentials.\n" +
      "Set PINATA_API_KEY and PINATA_SECRET_KEY in your .env file.\n" +
      "Get keys at: https://app.pinata.cloud/keys"
    );
  }

  // ── Validate file ────────────────────────────────────────────────────────
  const absolutePath = path.resolve(filePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`File not found: ${absolutePath}`);
  }

  const fileName = path.basename(absolutePath);
  const fileSize = fs.statSync(absolutePath).size;
  console.log(`\nFile       : ${fileName}`);
  console.log(`Size       : ${(fileSize / 1024).toFixed(2)} KB`);

  // ── Build multipart form ─────────────────────────────────────────────────
  const form = new FormData();
  form.append("file", fs.createReadStream(absolutePath), { filename: fileName });

  // Optional metadata — helps identify the file in your Pinata dashboard
  const metadata = JSON.stringify({
    name: fileName,
    keyvalues: {
      uploadedAt: new Date().toISOString(),
      type: "academic-paper",
    },
  });
  form.append("pinataMetadata", metadata);

  // Pin options (wrapWithDirectory: false keeps the CID pointing directly at the file)
  const options = JSON.stringify({ cidVersion: 1 });
  form.append("pinataOptions", options);

  // ── Send request to Pinata ───────────────────────────────────────────────
  console.log("\nUploading to IPFS via Pinata…");

  const response = await fetch(PINATA_PIN_URL, {
    method:  "POST",
    headers: {
      pinata_api_key:        apiKey,
      pinata_secret_api_key: secretKey,
      ...form.getHeaders(),
    },
    body: form,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Pinata upload failed (${response.status}): ${errorBody}`);
  }

  const result = await response.json();
  return result.IpfsHash; // The CID
}

// ── CLI entry point ───────────────────────────────────────────────────────────
async function main() {
  console.log("╔══════════════════════════════════════════════╗");
  console.log("║   Proof of Precedence — IPFS Upload           ║");
  console.log("╚══════════════════════════════════════════════╝");

  const filePath = process.argv[2];
  if (!filePath) {
    console.error("\nUsage: node scripts/uploadToIPFS.js <path-to-pdf>");
    process.exit(1);
  }

  try {
    const cid = await uploadToIPFS(filePath);

    console.log("\n✅  Upload successful!");
    console.log(`    IPFS CID        : ${cid}`);
    console.log(`    IPFS Gateway URL: https://gateway.pinata.cloud/ipfs/${cid}`);
    console.log("\n── Next step ──────────────────────────────────────────────────────────");
    console.log("Run submitPaper.js with this CID:");
    console.log(`  node scripts/submitPaper.js ${process.env.CONTRACT_ADDRESS || "<CONTRACT_ADDRESS>"} ${cid}\n`);
  } catch (err) {
    console.error("\n❌  Upload failed:", err.message);
    process.exit(1);
  }
}

main();

// Export for use in other scripts / tests
module.exports = { uploadToIPFS };
