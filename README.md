# ⛓ Proof of Precedence — Blockchain Academic Publishing

An end-to-end system for registering academic papers on-chain.
Upload a PDF to IPFS → submit the CID to a Solidity smart contract →
prove immutable authorship and timestamp to the world.

---

## Project Structure

```
proof-of-precedence/
├── contracts/
│   └── PaperRegistry.sol          # Solidity smart contract
├── scripts/
│   ├── deploy.js                  # Deploy contract to any network
│   ├── uploadToIPFS.js            # Upload PDF → get CID
│   ├── submitPaper.js             # Submit CID to blockchain
│   └── verifyPaper.js             # Verify proof on-chain
├── test/
│   └── PaperRegistry.test.js      # Hardhat / Chai test suite
├── frontend/                      # React UI
│   ├── src/
│   │   ├── App.js
│   │   └── App.css
│   └── public/index.html
├── .env.example
├── hardhat.config.js
└── package.json
```

---

## Prerequisites

- Node.js ≥ 18
- MetaMask (for the React frontend)
- [Pinata account](https://app.pinata.cloud) for IPFS (free tier is fine)
- MATIC on Mumbai testnet, OR just use the local Hardhat node (no tokens needed)

---

## Installation

```bash
# 1. Clone / enter the project
cd proof-of-precedence

# 2. Install dependencies
npm install

# 3. Copy and fill in your environment variables
cp .env.example .env
# Edit .env:
#   PRIVATE_KEY   — your wallet private key
#   RPC_URL       — http://127.0.0.1:8545  (local)  OR  Mumbai RPC
#   PINATA_API_KEY / PINATA_SECRET_KEY  — from Pinata dashboard

# 4. Compile the smart contract
npx hardhat compile
```

---

## Running the Full Flow

### Option A — Local Hardhat Network (no tokens needed)

```bash
# Terminal 1: start the local node (keep it running)
npx hardhat node

# Terminal 2: run the scripts
```

---

### Step 1 — Deploy the contract

```bash
npx hardhat run scripts/deploy.js --network localhost
```

**Expected output:**
```
╔══════════════════════════════════════════════╗
║   Proof of Precedence — Contract Deployment  ║
╚══════════════════════════════════════════════╝

Deployer address : 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
Deployer balance : 10000.0 ETH/MATIC

Deploying PaperRegistry…

✅  PaperRegistry deployed successfully!
    Contract address : 0x5FbDB2315678afecb367f032d93F642f64180aa3
    Transaction hash : 0xabc123...
    Block number     : 1

── Next step ──────────────────────────────────────────────────────────
Add the following line to your .env file:
  CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
```

→ Copy `CONTRACT_ADDRESS=…` into your `.env`.

---

### Step 2 — Upload a PDF to IPFS

```bash
node scripts/uploadToIPFS.js ./my-research-paper.pdf
```

**Expected output:**
```
╔══════════════════════════════════════════════╗
║   Proof of Precedence — IPFS Upload           ║
╚══════════════════════════════════════════════╝

File       : my-research-paper.pdf
Size       : 342.17 KB

Uploading to IPFS via Pinata…

✅  Upload successful!
    IPFS CID        : bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi
    IPFS Gateway URL: https://gateway.pinata.cloud/ipfs/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi

── Next step ──────────────────────────────────────────────────────────
Run submitPaper.js with this CID:
  node scripts/submitPaper.js 0x5FbDB2315678afecb367f032d93F642f64180aa3 bafybeigdyrzt5...
```

---

### Step 3 — Submit CID to blockchain

```bash
node scripts/submitPaper.js \
  0x5FbDB2315678afecb367f032d93F642f64180aa3 \
  bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi
```

**Expected output:**
```
╔══════════════════════════════════════════════╗
║   Proof of Precedence — Submit Paper          ║
╚══════════════════════════════════════════════╝

Author (signer)  : 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
Contract address : 0x5FbDB2315678afecb367f032d93F642f64180aa3
IPFS CID         : bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi

Sending transaction…
Transaction hash : 0xd4e5f6a7b8c9...
Waiting for confirmation…

✅  Paper submitted successfully!
    Transaction hash : 0xd4e5f6a7b8c9...
    Block number     : 2
    Gas used         : 68420
    Author           : 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
    IPFS CID         : bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi
    Timestamp (UTC)  : Fri, 01 Jan 2025 12:00:00 GMT
    Timestamp (Unix) : 1735732800

── Precedence established ─────────────────────────────────────────────
This paper was registered at block 2.
No one can claim an earlier on-chain registration for this CID.
```

---

### Step 4 — Verify proof of precedence

```bash
node scripts/verifyPaper.js \
  0x5FbDB2315678afecb367f032d93F642f64180aa3 \
  bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi
```

**Expected output:**
```
╔══════════════════════════════════════════════╗
║   Proof of Precedence — Verify Paper          ║
╚══════════════════════════════════════════════╝

Contract address : 0x5FbDB2315678afecb367f032d93F642f64180aa3
IPFS CID         : bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi

Querying blockchain…

══════════════════════════════════════════════════════
  ✅  PROOF OF PRECEDENCE ESTABLISHED
══════════════════════════════════════════════════════
  IPFS CID         : bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi
  Author address   : 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
  Registered at    : Fri, 01 Jan 2025 12:00:00 GMT
  Unix timestamp   : 1735732800
  IPFS Gateway     : https://gateway.pinata.cloud/ipfs/bafybeigdyrzt5...
──────────────────────────────────────────────────────
  Total papers in registry : 1
══════════════════════════════════════════════════════

What this proves:
  • The wallet 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
    submitted this paper on Fri, 01 Jan 2025 12:00:00 GMT.
  • The IPFS CID is a cryptographic hash of the paper's
    exact contents — any modification changes the CID.
  • The block timestamp is set by the Ethereum/Polygon
    network and cannot be falsified retroactively.
  • No earlier on-chain record exists for this CID.
```

---

## Running Tests

```bash
npx hardhat test
```

**Expected output:**
```
  PaperRegistry
    Deployment
      ✔ should deploy with zero papers (42ms)
      ✔ should have a valid contract address
    submitPaper
      ✔ should register a paper and store the correct author
      ✔ should record a timestamp close to the current block time
      ✔ should increment totalPapers on each submission
      ✔ should emit a PaperSubmitted event with correct arguments
      ✔ should revert on duplicate CID submission
      ✔ should revert on the same author submitting the same CID twice
      ✔ should revert when CID is an empty string
      ✔ should allow different CIDs from the same author
    getPaper
      ✔ should return exists=false for an unknown CID
      ✔ should return the full record for a known CID
    paperExists
      ✔ should return false before submission
      ✔ should return true after submission
    Proof of Precedence
      ✔ the first submitter cannot be displaced by a later submission
      ✔ allCIDs array preserves submission order

  16 passing (1.2s)
```

---

## React Frontend

```bash
cd frontend

# Install React dependencies
npm install

# Copy and fill frontend env vars
cp .env.example .env
# REACT_APP_CONTRACT_ADDRESS=0x...
# REACT_APP_PINATA_API_KEY=...
# REACT_APP_PINATA_SECRET=...

# Start the dev server
npm start
# → Opens http://localhost:3000
```

The UI provides:
1. **Upload PDF** — drag-and-drop → uploads to Pinata → shows CID
2. **Submit** — paste contract address + CID → triggers MetaMask → records on-chain
3. **Verify** — look up any CID → displays author, timestamp, and precedence status

---

## Option B — Deploy to Polygon Mumbai

```bash
# 1. Get test MATIC: https://faucet.polygon.technology/

# 2. Update .env:
#    RPC_URL=https://rpc-mumbai.maticvigil.com
#    PRIVATE_KEY=<your key>

# 3. Deploy
npx hardhat run scripts/deploy.js --network mumbai

# 4. Run scripts the same way — they'll use the Mumbai RPC automatically
```

---

## How Proof of Precedence Works

| Property | How it's guaranteed |
|---|---|
| **Content integrity** | IPFS CID = SHA-256 of the file. Any byte change = different CID. |
| **Author identity** | The Ethereum address signing the transaction is cryptographically tied to a private key. It cannot be forged. |
| **Timestamp** | Block timestamp is set by the network consensus. It cannot be altered after the fact. |
| **No duplicates** | The contract reverts if the same CID is submitted twice — the earliest block wins. |
| **Public verifiability** | Anyone with the contract address + CID can query the registry without any trusted intermediary. |

---

## Security Notes

- Never commit your `.env` file.
- Pinata API keys in `REACT_APP_*` are exposed in the browser bundle — use a backend proxy for production.
- The contract has no admin/owner — it is fully immutable once deployed.
