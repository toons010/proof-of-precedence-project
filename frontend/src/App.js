/**
 * App.js  —  Proof of Precedence Frontend
 * Modified to use direct private key instead of MetaMask.
 * No browser wallet extension required.
 */

import React, { useState, useCallback, useRef } from "react";
import { ethers } from "ethers";
import "./App.css";

// ── ABI ───────────────────────────────────────────────────────────────────────
const REGISTRY_ABI = [
  "function submitPaper(string calldata _ipfsCID) external",
  "function getPaper(string calldata _ipfsCID) external view returns (string memory, address, uint256, bool)",
  "function paperExists(string calldata _ipfsCID) external view returns (bool)",
  "function totalPapers() external view returns (uint256)",
  "event PaperSubmitted(string indexed ipfsCID, address indexed author, uint256 timestamp)",
];

// ── Environment variables ─────────────────────────────────────────────────────
const CONTRACT_ADDRESS = process.env.REACT_APP_CONTRACT_ADDRESS || "";
const PINATA_API_KEY   = process.env.REACT_APP_PINATA_API_KEY   || "";
const PINATA_SECRET    = process.env.REACT_APP_PINATA_SECRET    || "";
const RPC_URL          = process.env.REACT_APP_RPC_URL          || "http://127.0.0.1:8545";
const DEFAULT_KEY      = process.env.REACT_APP_PRIVATE_KEY      || "";

// ── Helper: get a signer from private key ─────────────────────────────────────
function getSigner(privateKey) {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  return new ethers.Wallet(privateKey, provider);
}

// ── Helper: upload to Pinata ──────────────────────────────────────────────────
async function uploadToPinata(file, onProgress) {
  const formData = new FormData();
  formData.append("file", file, file.name);
  formData.append("pinataMetadata", JSON.stringify({ name: file.name }));
  formData.append("pinataOptions",  JSON.stringify({ cidVersion: 1 }));
  onProgress("Uploading to IPFS…");
  const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method:  "POST",
    headers: {
      pinata_api_key:        PINATA_API_KEY,
      pinata_secret_api_key: PINATA_SECRET,
    },
    body: formData,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Pinata error ${res.status}: ${err}`);
  }
  const { IpfsHash } = await res.json();
  return IpfsHash;
}

// ── Sub-components ────────────────────────────────────────────────────────────
function StepCard({ number, title, children }) {
  return (
      <div className="step-card">
        <div className="step-header">
          <span className="step-number">{String(number).padStart(2, "0")}</span>
          <h2 className="step-title">{title}</h2>
        </div>
        <div className="step-body">{children}</div>
      </div>
  );
}

function CopyableField({ value, label }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
      <div className="copyable-field">
        <span className="field-label">{label}</span>
        <div className="field-row">
          <code className="field-value">{value}</code>
          <button className="copy-btn" onClick={copy} title="Copy">
            {copied ? "✓" : "⎘"}
          </button>
        </div>
      </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  // ── Wallet state ────────────────────────────────────────────────────────
  const [privateKey, setPrivateKey]         = useState(DEFAULT_KEY);
  const [walletAddress, setWalletAddress]   = useState("");
  const [walletStatus, setWalletStatus]     = useState("idle");
  const [walletError, setWalletError]       = useState("");

  // ── Step 1: IPFS upload ─────────────────────────────────────────────────
  const [selectedFile, setSelectedFile]     = useState(null);
  const [uploadCid, setUploadCid]           = useState("");
  const [uploadStatus, setUploadStatus]     = useState("idle");
  const [uploadMsg, setUploadMsg]           = useState("");
  const [manualCid, setManualCid]           = useState("");
  const fileInputRef = useRef(null);

  // ── Step 2: Submit ──────────────────────────────────────────────────────
  const [submitCid, setSubmitCid]           = useState("");
  const [contractAddr, setContractAddr]     = useState(CONTRACT_ADDRESS);
  const [submitStatus, setSubmitStatus]     = useState("idle");
  const [submitMsg, setSubmitMsg]           = useState("");
  const [txHash, setTxHash]                 = useState("");
  const [submitTimestamp, setSubmitTimestamp] = useState(null);

  // ── Step 3: Verify ──────────────────────────────────────────────────────
  const [verifyCid, setVerifyCid]           = useState("");
  const [verifyAddr, setVerifyAddr]         = useState(CONTRACT_ADDRESS);
  const [verifyStatus, setVerifyStatus]     = useState("idle");
  const [verifyResult, setVerifyResult]     = useState(null);

  // ────────────────────────────────────────────────────────────────────────
  //  Connect wallet via private key
  // ────────────────────────────────────────────────────────────────────────
  const connectWallet = useCallback(async () => {
    if (!privateKey.trim()) {
      setWalletError("Please enter your private key.");
      setWalletStatus("error");
      return;
    }
    setWalletStatus("loading");
    setWalletError("");
    try {
      const signer  = getSigner(privateKey.trim());
      const address = await signer.getAddress();
      setWalletAddress(address);
      setWalletStatus("success");
    } catch (err) {
      setWalletError("Invalid private key or cannot connect to RPC.");
      setWalletStatus("error");
    }
  }, [privateKey]);

  // ────────────────────────────────────────────────────────────────────────
  //  Step 1: Upload PDF to IPFS
  // ────────────────────────────────────────────────────────────────────────
  const handleFileSelect = (e) => {
    const f = e.target.files[0];
    if (f) { setSelectedFile(f); setUploadCid(""); setUploadMsg(""); setUploadStatus("idle"); }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) { setSelectedFile(f); setUploadCid(""); setUploadMsg(""); setUploadStatus("idle"); }
  };

  const handleUpload = async () => {
    if (!selectedFile && !manualCid) {
      setUploadMsg("Please select a PDF or paste a CID manually.");
      setUploadStatus("error");
      return;
    }
    if (!PINATA_API_KEY || !selectedFile) {
      const cid = manualCid.trim();
      if (!cid) { setUploadMsg("Paste an IPFS CID below to continue."); setUploadStatus("error"); return; }
      setUploadCid(cid);
      setSubmitCid(cid);
      setVerifyCid(cid);
      setUploadStatus("success");
      setUploadMsg("CID accepted from manual entry.");
      return;
    }
    setUploadStatus("loading");
    setUploadMsg("");
    try {
      const cid = await uploadToPinata(selectedFile, setUploadMsg);
      setUploadCid(cid);
      setSubmitCid(cid);
      setVerifyCid(cid);
      setUploadStatus("success");
      setUploadMsg(`Pinned successfully — CID: ${cid}`);
    } catch (err) {
      setUploadStatus("error");
      setUploadMsg(err.message);
    }
  };

  // ────────────────────────────────────────────────────────────────────────
  //  Step 2: Submit CID to blockchain
  // ────────────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!submitCid.trim())    { setSubmitMsg("Enter an IPFS CID first.");      setSubmitStatus("error"); return; }
    if (!contractAddr.trim()) { setSubmitMsg("Enter the contract address.");    setSubmitStatus("error"); return; }
    if (!walletAddress)       { setSubmitMsg("Connect your wallet first.");     setSubmitStatus("error"); return; }

    setSubmitStatus("loading");
    setSubmitMsg("Sending transaction…");
    setTxHash("");

    try {
      const signer   = getSigner(privateKey.trim());
      const registry = new ethers.Contract(contractAddr, REGISTRY_ABI, signer);

      const exists = await registry.paperExists(submitCid);
      if (exists) {
        setSubmitStatus("error");
        setSubmitMsg("This CID is already registered on-chain. Try verifying it in Step 3.");
        return;
      }

      const tx      = await registry.submitPaper(submitCid);
      setTxHash(tx.hash);
      setSubmitMsg(`TX sent: ${tx.hash.slice(0, 18)}… — waiting for confirmation…`);

      const receipt = await tx.wait(1);
      const provider = new ethers.JsonRpcProvider(RPC_URL);
      const block   = await provider.getBlock(receipt.blockNumber);
      const ts      = block.timestamp;

      setSubmitTimestamp(ts);
      setVerifyCid(submitCid);
      setVerifyAddr(contractAddr);
      setSubmitStatus("success");
      setSubmitMsg(
          `Confirmed in block #${receipt.blockNumber} — ` +
          `${new Date(ts * 1000).toUTCString()}`
      );
    } catch (err) {
      console.error(err);
      setSubmitStatus("error");
      setSubmitMsg(err?.reason || err?.message || "Transaction failed.");
    }
  };

  // ────────────────────────────────────────────────────────────────────────
  //  Step 3: Verify
  // ────────────────────────────────────────────────────────────────────────
  const handleVerify = async () => {
    if (!verifyCid.trim())  { setVerifyResult({ error: "Enter a CID to verify." });          setVerifyStatus("error"); return; }
    if (!verifyAddr.trim()) { setVerifyResult({ error: "Enter the contract address." });      setVerifyStatus("error"); return; }

    setVerifyStatus("loading");
    setVerifyResult(null);

    try {
      const provider = new ethers.JsonRpcProvider(RPC_URL);
      const registry = new ethers.Contract(verifyAddr, REGISTRY_ABI, provider);
      const [cid, author, timestamp, exists] = await registry.getPaper(verifyCid);
      const total = await registry.totalPapers();

      if (!exists) {
        setVerifyStatus("error");
        setVerifyResult({ exists: false });
      } else {
        setVerifyStatus("success");
        setVerifyResult({
          exists: true,
          cid,
          author,
          timestamp: Number(timestamp),
          total: total.toString(),
        });
      }
    } catch (err) {
      console.error(err);
      setVerifyStatus("error");
      setVerifyResult({ error: err.message });
    }
  };

  // ────────────────────────────────────────────────────────────────────────
  //  Render
  // ────────────────────────────────────────────────────────────────────────
  const hasPinata = Boolean(PINATA_API_KEY && PINATA_SECRET);

  return (
      <div className="app">
        {/* ── Header ── */}
        <header className="app-header">
          <div className="header-inner">
            <div className="logo-group">
              <span className="logo-icon">⛓</span>
              <div>
                <h1 className="app-title">Proof of Precedence</h1>
                <p className="app-subtitle">Immutable academic publishing on blockchain</p>
              </div>
            </div>

            {/* ── Wallet connect via private key ── */}
            <div className="wallet-section">
              {walletAddress ? (
                  <div className="wallet-connected">
                    <span className="wallet-dot" />
                    <span className="wallet-addr">
                  {walletAddress.slice(0, 6)}…{walletAddress.slice(-4)}
                </span>
                    <span className="network-tag">Hardhat Local</span>
                  </div>
              ) : (
                  <div className="key-connect">
                    <input
                        className="text-input key-input"
                        type="password"
                        placeholder="Paste private key (0x…)"
                        value={privateKey}
                        onChange={(e) => setPrivateKey(e.target.value)}
                    />
                    <button
                        className="btn btn-primary"
                        onClick={connectWallet}
                        disabled={walletStatus === "loading"}
                    >
                      {walletStatus === "loading" ? "Connecting…" : "Connect"}
                    </button>
                    {walletError && <p className="status-msg status-error">{walletError}</p>}
                  </div>
              )}
            </div>
          </div>
        </header>

        {/* ── Flow bar ── */}
        <div className="flow-bar">
          {["Upload PDF → IPFS", "Submit CID → Chain", "Verify Precedence"].map((s, i) => (
              <React.Fragment key={i}>
                <span className="flow-step">{s}</span>
                {i < 2 && <span className="flow-arrow">→</span>}
              </React.Fragment>
          ))}
        </div>

        <main className="app-main">

          {/* ── Step 1: Upload ── */}
          <StepCard number={1} title="Upload Paper to IPFS">
            {hasPinata ? (
                <>
                  <div
                      className={`drop-zone ${selectedFile ? "has-file" : ""}`}
                      onDrop={handleDrop}
                      onDragOver={(e) => e.preventDefault()}
                      onClick={() => fileInputRef.current?.click()}
                  >
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf"
                        style={{ display: "none" }}
                        onChange={handleFileSelect}
                    />
                    {selectedFile ? (
                        <div className="file-info">
                          <span className="file-icon">📄</span>
                          <span className="file-name">{selectedFile.name}</span>
                          <span className="file-size">{(selectedFile.size / 1024).toFixed(1)} KB</span>
                        </div>
                    ) : (
                        <div className="drop-prompt">
                          <span className="drop-icon">⬆</span>
                          <span>Drop PDF here or click to browse</span>
                        </div>
                    )}
                  </div>
                  <button
                      className="btn btn-primary full-width"
                      onClick={handleUpload}
                      disabled={uploadStatus === "loading" || !selectedFile}
                  >
                    {uploadStatus === "loading" ? "Uploading…" : "Upload to IPFS via Pinata"}
                  </button>
                </>
            ) : (
                <div className="manual-cid-section">
                  <p className="info-note">
                    ℹ No Pinata keys detected. Upload your PDF to{" "}
                    <a href="https://app.pinata.cloud" target="_blank" rel="noreferrer">Pinata</a>{" "}
                    manually, then paste the CID below.
                  </p>
                  <input
                      className="text-input"
                      placeholder="bafybei… (IPFS CID)"
                      value={manualCid}
                      onChange={(e) => setManualCid(e.target.value)}
                  />
                  <button className="btn btn-primary full-width" onClick={handleUpload}>
                    Use this CID
                  </button>
                </div>
            )}

            {uploadMsg && (
                <p className={`status-msg status-${uploadStatus}`}>{uploadMsg}</p>
            )}

            {uploadCid && (
                <div className="result-box">
                  <CopyableField label="IPFS CID" value={uploadCid} />
                  <a
                      className="ipfs-link"
                      href={`https://gateway.pinata.cloud/ipfs/${uploadCid}`}
                      target="_blank"
                      rel="noreferrer"
                  >
                    View on IPFS Gateway ↗
                  </a>
                </div>
            )}
          </StepCard>

          {/* ── Step 2: Submit ── */}
          <StepCard number={2} title="Submit CID to Blockchain">
            <label className="field-label">Contract Address</label>
            <input
                className="text-input"
                placeholder="0x…"
                value={contractAddr}
                onChange={(e) => setContractAddr(e.target.value)}
            />

            <label className="field-label" style={{ marginTop: 12 }}>IPFS CID</label>
            <input
                className="text-input"
                placeholder="bafybei…"
                value={submitCid}
                onChange={(e) => setSubmitCid(e.target.value)}
            />

            <button
                className="btn btn-accent full-width"
                onClick={handleSubmit}
                disabled={submitStatus === "loading"}
                style={{ marginTop: 16 }}
            >
              {submitStatus === "loading" ? "Submitting…" : "Submit to Blockchain"}
            </button>

            {submitMsg && (
                <p className={`status-msg status-${submitStatus}`}>{submitMsg}</p>
            )}

            {txHash && (
                <div className="result-box">
                  <CopyableField label="Transaction Hash" value={txHash} />
                  {submitTimestamp && (
                      <CopyableField
                          label="Block Timestamp"
                          value={new Date(submitTimestamp * 1000).toUTCString()}
                      />
                  )}
                  <p className="precedence-badge">🔒 Precedence Established</p>
                </div>
            )}
          </StepCard>

          {/* ── Step 3: Verify ── */}
          <StepCard number={3} title="Verify Proof of Precedence">
            <label className="field-label">Contract Address</label>
            <input
                className="text-input"
                placeholder="0x…"
                value={verifyAddr}
                onChange={(e) => setVerifyAddr(e.target.value)}
            />

            <label className="field-label" style={{ marginTop: 12 }}>IPFS CID to verify</label>
            <input
                className="text-input"
                placeholder="bafybei…"
                value={verifyCid}
                onChange={(e) => setVerifyCid(e.target.value)}
            />

            <button
                className="btn btn-verify full-width"
                onClick={handleVerify}
                disabled={verifyStatus === "loading"}
                style={{ marginTop: 16 }}
            >
              {verifyStatus === "loading" ? "Querying…" : "Verify on Blockchain"}
            </button>

            {verifyResult && (
                <div className={`result-box ${verifyResult.exists === false || verifyResult.error ? "result-fail" : "result-pass"}`}>
                  {verifyResult.error ? (
                      <p className="status-msg status-error">{verifyResult.error}</p>
                  ) : verifyResult.exists === false ? (
                      <>
                        <p className="verify-icon">❌</p>
                        <p className="verify-headline">NOT Registered</p>
                        <p className="verify-detail">This CID has no on-chain record.</p>
                      </>
                  ) : (
                      <>
                        <p className="verify-icon">✅</p>
                        <p className="verify-headline">Proof of Precedence Confirmed</p>
                        <CopyableField label="Author" value={verifyResult.author} />
                        <CopyableField
                            label="Registered at"
                            value={new Date(verifyResult.timestamp * 1000).toUTCString()}
                        />
                        <CopyableField label="IPFS CID" value={verifyResult.cid} />
                        <p className="verify-detail">
                          Total papers in registry: <strong>{verifyResult.total}</strong>
                        </p>
                        <p className="verify-detail small">
                          The block timestamp is set by the network and cannot be
                          altered retroactively. This record proves that this wallet
                          submitted this exact paper content before anyone else.
                        </p>
                      </>
                  )}
                </div>
            )}
          </StepCard>

        </main>

        <footer className="app-footer">
          <p>Proof of Precedence · Solidity 0.8 · Hardhat Local · IPFS via Pinata</p>
        </footer>
      </div>
  );
}