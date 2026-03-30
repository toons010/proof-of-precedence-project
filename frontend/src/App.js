/**
 * App.js — Proof of Precedence
 * Redesigned: Apple/Ferrari-level professional UI
 * No MetaMask required — uses direct private key via ethers.js
 */

import React, { useState, useCallback, useRef, useEffect } from "react";
import { ethers } from "ethers";
import "./App.css";

const REGISTRY_ABI = [
  "function submitPaper(string calldata _ipfsCID) external",
  "function getPaper(string calldata _ipfsCID) external view returns (string memory, address, uint256, bool)",
  "function paperExists(string calldata _ipfsCID) external view returns (bool)",
  "function totalPapers() external view returns (uint256)",
  "event PaperSubmitted(string indexed ipfsCID, address indexed author, uint256 timestamp)",
];

const CONTRACT_ADDRESS = process.env.REACT_APP_CONTRACT_ADDRESS || "";
const PINATA_API_KEY   = process.env.REACT_APP_PINATA_API_KEY   || "";
const PINATA_SECRET    = process.env.REACT_APP_PINATA_SECRET    || "";
const RPC_URL          = process.env.REACT_APP_RPC_URL          || "http://127.0.0.1:8545";
const DEFAULT_KEY      = process.env.REACT_APP_PRIVATE_KEY      || "";

function getSigner(privateKey) {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  return new ethers.Wallet(privateKey, provider);
}

async function uploadToPinata(file, onProgress) {
  const formData = new FormData();
  formData.append("file", file, file.name);
  formData.append("pinataMetadata", JSON.stringify({ name: file.name }));
  formData.append("pinataOptions",  JSON.stringify({ cidVersion: 1 }));
  onProgress("Uploading to IPFS via Pinata…");
  const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method: "POST",
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

// ── Copyable field ─────────────────────────────────────────────
function CopyField({ label, value }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  return (
      <div className="result-row">
        <span className="result-row-label">{label}</span>
        <div className="result-row-value">
          <span className="result-row-text">{value}</span>
          <button className="copy-btn" onClick={copy}>{copied ? "✓ Copied" : "Copy"}</button>
        </div>
      </div>
  );
}

// ── Status block ───────────────────────────────────────────────
function Status({ type, message }) {
  if (!message) return null;
  const icons = { success: "✓", error: "✕", loading: "" };
  return (
      <div className={`status-block status-${type}`}>
        {type === "loading"
            ? <span className="spinner" />
            : <span className="status-block-icon">{icons[type]}</span>
        }
        <span>{message}</span>
      </div>
  );
}

// ═══════════════════════════════════════════════════════════════
export default function App() {
  const [scrolled, setScrolled]             = useState(false);
  const [activeTab, setActiveTab]           = useState("upload");
  const [showApp, setShowApp]               = useState(false);
  const appRef = useRef(null);

  // ── Wallet ──────────────────────────────────────────────────
  const [privateKey, setPrivateKey]         = useState(DEFAULT_KEY);
  const [walletAddress, setWalletAddress]   = useState("");
  const [walletStatus, setWalletStatus]     = useState("idle");
  const [walletError, setWalletError]       = useState("");

  // ── Upload ──────────────────────────────────────────────────
  const [selectedFile, setSelectedFile]     = useState(null);
  const [uploadCid, setUploadCid]           = useState("");
  const [uploadStatus, setUploadStatus]     = useState("idle");
  const [uploadMsg, setUploadMsg]           = useState("");
  const [manualCid, setManualCid]           = useState("");
  const fileInputRef = useRef(null);

  // ── Submit ──────────────────────────────────────────────────
  const [submitCid, setSubmitCid]           = useState("");
  const [contractAddr, setContractAddr]     = useState(CONTRACT_ADDRESS);
  const [submitStatus, setSubmitStatus]     = useState("idle");
  const [submitMsg, setSubmitMsg]           = useState("");
  const [txHash, setTxHash]                 = useState("");
  const [submitTimestamp, setSubmitTimestamp] = useState(null);

  // ── Verify ──────────────────────────────────────────────────
  const [verifyCid, setVerifyCid]           = useState("");
  const [verifyAddr, setVerifyAddr]         = useState(CONTRACT_ADDRESS);
  const [verifyStatus, setVerifyStatus]     = useState("idle");
  const [verifyResult, setVerifyResult]     = useState(null);

  // ── Scroll handler ──────────────────────────────────────────
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToApp = () => {
    setShowApp(true);
    setTimeout(() => appRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  };

  // ── Connect wallet ──────────────────────────────────────────
  const connectWallet = useCallback(async () => {
    if (!privateKey.trim()) { setWalletError("Enter your private key."); setWalletStatus("error"); return; }
    setWalletStatus("loading");
    setWalletError("");
    try {
      const signer  = getSigner(privateKey.trim());
      const address = await signer.getAddress();
      setWalletAddress(address);
      setWalletStatus("success");
    } catch {
      setWalletError("Invalid private key or cannot reach RPC.");
      setWalletStatus("error");
    }
  }, [privateKey]);

  // ── Upload ──────────────────────────────────────────────────
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
    if (!PINATA_API_KEY || !selectedFile) {
      const cid = manualCid.trim();
      if (!cid) { setUploadMsg("Paste an IPFS CID below to continue."); setUploadStatus("error"); return; }
      setUploadCid(cid); setSubmitCid(cid); setVerifyCid(cid);
      setUploadStatus("success");
      setUploadMsg("CID accepted. Proceed to Submit.");
      return;
    }
    setUploadStatus("loading"); setUploadMsg("");
    try {
      const cid = await uploadToPinata(selectedFile, setUploadMsg);
      setUploadCid(cid); setSubmitCid(cid); setVerifyCid(cid);
      setUploadStatus("success");
      setUploadMsg("Successfully pinned to IPFS.");
    } catch (err) {
      setUploadStatus("error"); setUploadMsg(err.message);
    }
  };

  // ── Submit ──────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!submitCid.trim())    { setSubmitMsg("Enter an IPFS CID."); setSubmitStatus("error"); return; }
    if (!contractAddr.trim()) { setSubmitMsg("Enter the contract address."); setSubmitStatus("error"); return; }
    if (!walletAddress)       { setSubmitMsg("Connect your wallet first."); setSubmitStatus("error"); return; }

    setSubmitStatus("loading"); setSubmitMsg("Sending transaction to blockchain…"); setTxHash("");
    try {
      const signer   = getSigner(privateKey.trim());
      const registry = new ethers.Contract(contractAddr, REGISTRY_ABI, signer);
      const exists   = await registry.paperExists(submitCid);
      if (exists) {
        setSubmitStatus("error");
        setSubmitMsg("This CID is already registered. Verify it in the Verify tab.");
        return;
      }
      const tx = await registry.submitPaper(submitCid);
      setTxHash(tx.hash);
      setSubmitMsg("Transaction sent — awaiting confirmation…");
      const receipt = await tx.wait(1);
      const provider = new ethers.JsonRpcProvider(RPC_URL);
      const block    = await provider.getBlock(receipt.blockNumber);
      setSubmitTimestamp(block.timestamp);
      setVerifyCid(submitCid); setVerifyAddr(contractAddr);
      setSubmitStatus("success");
      setSubmitMsg(`Confirmed in block #${receipt.blockNumber}`);
    } catch (err) {
      setSubmitStatus("error");
      setSubmitMsg(err?.reason || err?.message || "Transaction failed.");
    }
  };

  // ── Verify ──────────────────────────────────────────────────
  const handleVerify = async () => {
    if (!verifyCid.trim())  { setVerifyResult({ error: "Enter a CID." }); setVerifyStatus("error"); return; }
    if (!verifyAddr.trim()) { setVerifyResult({ error: "Enter the contract address." }); setVerifyStatus("error"); return; }
    setVerifyStatus("loading"); setVerifyResult(null);
    try {
      const provider = new ethers.JsonRpcProvider(RPC_URL);
      const registry = new ethers.Contract(verifyAddr, REGISTRY_ABI, provider);
      const [cid, author, timestamp, exists] = await registry.getPaper(verifyCid);
      const total = await registry.totalPapers();
      if (!exists) {
        setVerifyStatus("error"); setVerifyResult({ exists: false });
      } else {
        setVerifyStatus("success");
        setVerifyResult({ exists: true, cid, author, timestamp: Number(timestamp), total: total.toString() });
      }
    } catch (err) {
      setVerifyStatus("error"); setVerifyResult({ error: err.message });
    }
  };

  const hasPinata = Boolean(PINATA_API_KEY && PINATA_SECRET);

  return (
      <div className="app">

        {/* ══ NAVBAR ══ */}
        <nav className={`navbar ${scrolled ? "scrolled" : ""}`}>
          <div className="nav-logo">
            <div className="nav-logo-mark">⛓</div>
            Proof of Precedence
          </div>
          <div className="nav-links">
            <button className="nav-link" onClick={scrollToApp}>Launch App</button>
            <button className="nav-link" onClick={() => document.querySelector(".how-section")?.scrollIntoView({ behavior: "smooth" })}>
              How It Works
            </button>
          </div>
          <div className="nav-wallet">
            {walletAddress ? (
                <div className="wallet-connected-display">
                  <div className="wallet-pulse" />
                  <span className="wallet-address">{walletAddress.slice(0,6)}…{walletAddress.slice(-4)}</span>
                  <span className="wallet-network">Local</span>
                </div>
            ) : (
                <button className="btn btn-outline btn-sm" onClick={scrollToApp}>Connect</button>
            )}
          </div>
        </nav>

        {/* ══ HERO ══ */}
        <section className="hero">
          <div className="hero-eyebrow">Blockchain · IPFS · Solidity</div>

          <h1 className="hero-title">
            Establish Your<br />
            <span>Research Priority.</span>
          </h1>

          <p className="hero-subtitle">
            Upload your paper to IPFS. Register its fingerprint on the blockchain.
            Create an immutable, publicly verifiable timestamp that no one can dispute.
          </p>

          <div className="hero-cta">
            <button className="btn-hero-primary" onClick={scrollToApp}>
              Register a Paper
            </button>
            <button className="btn-hero-secondary" onClick={() => document.querySelector(".how-section")?.scrollIntoView({ behavior: "smooth" })}>
              How It Works
            </button>
          </div>

          <div className="hero-stats">
            <div className="hero-stat">
              <div className="hero-stat-value">SHA-256</div>
              <div className="hero-stat-label">Content Hashing</div>
            </div>
            <div className="hero-stat">
              <div className="hero-stat-value">EVM</div>
              <div className="hero-stat-label">Smart Contract</div>
            </div>
            <div className="hero-stat">
              <div className="hero-stat-value">IPFS</div>
              <div className="hero-stat-label">Decentralised Storage</div>
            </div>
          </div>

          <button className="hero-scroll" onClick={scrollToApp}>
            <span>↓</span>
            <span>Launch App</span>
          </button>
        </section>

        {/* ══ HOW IT WORKS ══ */}
        <section className="how-section">
          <div className="how-inner">
            <p className="section-label">The Process</p>
            <h2 className="section-title">Three steps to permanent proof.</h2>

            <div className="how-grid">
              {[
                { num: "01", icon: "📄", title: "Upload Your Paper", desc: "Drop your PDF. It gets uploaded to IPFS via Pinata. IPFS calculates a cryptographic fingerprint — the CID — from the exact bytes of your file." },
                { num: "02", icon: "⛓", title: "Register on Chain", desc: "Your CID, wallet address, and a network timestamp are recorded in a Solidity smart contract. The contract rejects any future attempt to register the same CID." },
                { num: "03", icon: "✓", title: "Verify Anytime", desc: "Anyone in the world can query the contract with a CID. If it exists, the blockchain returns the author address and timestamp — permanent, public, unchallengeable." },
              ].map(({ num, icon, title, desc }) => (
                  <div className="how-item" key={num}>
                    <div className="how-item-num">{num}</div>
                    <span className="how-item-icon">{icon}</span>
                    <h3 className="how-item-title">{title}</h3>
                    <p className="how-item-desc">{desc}</p>
                  </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══ APP SECTION ══ */}
        <section className="app-section" ref={appRef}>
          <div className="section-inner">
            <p className="section-label">The Application</p>
            <h2 className="section-title">Register or verify a paper.</h2>

            {/* Wallet panel */}
            <div className="wallet-panel">
              <div className="wallet-panel-info">
                <div className="wallet-panel-title">Wallet Connection</div>
                {walletAddress ? (
                    <div className="wallet-connected-display">
                      <div className="wallet-pulse" />
                      <span className="wallet-address">{walletAddress}</span>
                      <span className="wallet-network">Hardhat Local</span>
                    </div>
                ) : (
                    <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                  Enter your private key to sign transactions
                </span>
                )}
              </div>

              {!walletAddress && (
                  <div className="key-connect-inline">
                    <input
                        className="field-input"
                        type="password"
                        placeholder="Private key (0x…)"
                        value={privateKey}
                        onChange={(e) => setPrivateKey(e.target.value)}
                        style={{ flex: 1 }}
                    />
                    <button
                        className="btn btn-gold btn-sm"
                        onClick={connectWallet}
                        disabled={walletStatus === "loading"}
                    >
                      {walletStatus === "loading" ? <><span className="spinner" /> Connecting</> : "Connect"}
                    </button>
                  </div>
              )}
              {walletError && <Status type="error" message={walletError} />}
            </div>

            {/* Tab navigation */}
            <div className="tab-nav">
              {[
                { id: "upload", icon: "⬆", label: "Upload to IPFS",    num: "01" },
                { id: "submit", icon: "⛓", label: "Submit to Chain",   num: "02" },
                { id: "verify", icon: "✓", label: "Verify Precedence", num: "03" },
              ].map(({ id, icon, label, num }) => (
                  <button
                      key={id}
                      className={`tab-btn ${activeTab === id ? "active" : ""}`}
                      onClick={() => setActiveTab(id)}
                  >
                    <span className="tab-icon">{icon}</span>
                    <span>{label}</span>
                    <span className="tab-num">{num}</span>
                  </button>
              ))}
            </div>

            {/* ── TAB: Upload ── */}
            <div className={`tab-panel ${activeTab === "upload" ? "active" : ""}`}>
              <div className="panel-card">
                <div className="panel-header">
                  <div className="panel-title">Upload Your Paper to IPFS</div>
                  <div className="panel-desc">Your PDF will be pinned on IPFS. Its content fingerprint (CID) is returned for blockchain registration.</div>
                </div>
                <div className="panel-body">
                  {hasPinata ? (
                      <>
                        <div
                            className={`drop-zone ${selectedFile ? "has-file" : ""}`}
                            onDrop={handleDrop}
                            onDragOver={(e) => e.preventDefault()}
                            onClick={() => fileInputRef.current?.click()}
                        >
                          <input ref={fileInputRef} type="file" accept=".pdf" style={{ display: "none" }} onChange={handleFileSelect} />
                          {selectedFile ? (
                              <div className="file-preview">
                                <span className="file-preview-icon">📄</span>
                                <div className="file-preview-info">
                                  <div className="file-preview-name">{selectedFile.name}</div>
                                  <div className="file-preview-size">{(selectedFile.size / 1024).toFixed(1)} KB</div>
                                </div>
                              </div>
                          ) : (
                              <>
                                <div className="drop-icon-wrap">⬆</div>
                                <div className="drop-main-text">Drop your PDF here</div>
                                <div className="drop-sub-text">or click to browse files</div>
                              </>
                          )}
                        </div>
                        <button className="btn btn-gold full-width" onClick={handleUpload} disabled={uploadStatus === "loading" || !selectedFile}>
                          {uploadStatus === "loading" ? <><span className="spinner" /> Uploading…</> : "Upload to IPFS via Pinata"}
                        </button>
                      </>
                  ) : (
                      <div className="manual-section">
                        <div className="manual-note">
                          <span className="manual-note-icon">ℹ</span>
                          <span>
                        No Pinata keys detected. Upload your PDF manually at{" "}
                            <a href="https://app.pinata.cloud" target="_blank" rel="noreferrer">app.pinata.cloud</a>,
                        then paste the CID below.
                      </span>
                        </div>
                        <div className="field-group">
                          <label className="field-label-text">IPFS CID</label>
                          <input className="field-input" placeholder="bafybei…" value={manualCid} onChange={(e) => setManualCid(e.target.value)} />
                        </div>
                        <button className="btn btn-gold full-width" onClick={handleUpload}>
                          Use This CID
                        </button>
                      </div>
                  )}

                  <Status type={uploadStatus} message={uploadMsg} />

                  {uploadCid && (
                      <div className="result-panel">
                        <div className="result-panel-header">IPFS Result</div>
                        <div className="result-panel-body">
                          <CopyField label="Content Identifier (CID)" value={uploadCid} />
                          <a className="btn btn-outline btn-sm" href={`https://gateway.pinata.cloud/ipfs/${uploadCid}`} target="_blank" rel="noreferrer" style={{ textDecoration: "none", display: "inline-flex" }}>
                            View on IPFS Gateway ↗
                          </a>
                          <div className="divider" />
                          <button className="btn btn-blue full-width" onClick={() => { setSubmitCid(uploadCid); setActiveTab("submit"); }}>
                            Continue to Submit →
                          </button>
                        </div>
                      </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── TAB: Submit ── */}
            <div className={`tab-panel ${activeTab === "submit" ? "active" : ""}`}>
              <div className="panel-card">
                <div className="panel-header">
                  <div className="panel-title">Submit CID to Blockchain</div>
                  <div className="panel-desc">Your wallet signs a transaction recording the CID, your address, and an immutable timestamp on-chain.</div>
                </div>
                <div className="panel-body">
                  <div className="field-group">
                    <label className="field-label-text">Contract Address</label>
                    <input className="field-input" placeholder="0x…" value={contractAddr} onChange={(e) => setContractAddr(e.target.value)} />
                  </div>
                  <div className="field-group">
                    <label className="field-label-text">IPFS CID</label>
                    <input className="field-input" placeholder="bafybei…" value={submitCid} onChange={(e) => setSubmitCid(e.target.value)} />
                  </div>
                  <button className="btn btn-gold full-width" onClick={handleSubmit} disabled={submitStatus === "loading"}>
                    {submitStatus === "loading" ? <><span className="spinner" /> Submitting…</> : "Submit to Blockchain"}
                  </button>

                  <Status type={submitStatus} message={submitMsg} />

                  {submitStatus === "success" && txHash && (
                      <div className="precedence-card">
                        <span className="precedence-icon">🔒</span>
                        <div className="precedence-title">Precedence Established</div>
                        <div className="precedence-sub">
                          Your paper has been permanently registered. No one can claim an earlier on-chain submission for this document.
                        </div>
                        <div className="precedence-meta">
                          <div className="precedence-meta-item">
                            <div className="precedence-meta-label">Transaction Hash</div>
                            <div className="precedence-meta-value">{txHash.slice(0,20)}…</div>
                          </div>
                          {submitTimestamp && (
                              <div className="precedence-meta-item">
                                <div className="precedence-meta-label">Block Timestamp</div>
                                <div className="precedence-meta-value">{new Date(submitTimestamp * 1000).toUTCString()}</div>
                              </div>
                          )}
                          <div className="precedence-meta-item">
                            <div className="precedence-meta-label">IPFS CID</div>
                            <div className="precedence-meta-value">{submitCid.slice(0,24)}…</div>
                          </div>
                        </div>
                        <div style={{ marginTop: "24px" }}>
                          <button className="btn btn-outline" onClick={() => { setVerifyCid(submitCid); setActiveTab("verify"); }}>
                            Verify This Paper →
                          </button>
                        </div>
                      </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── TAB: Verify ── */}
            <div className={`tab-panel ${activeTab === "verify" ? "active" : ""}`}>
              <div className="panel-card">
                <div className="panel-header">
                  <div className="panel-title">Verify Proof of Precedence</div>
                  <div className="panel-desc">Query the blockchain with any CID to retrieve the author, timestamp, and precedence status. No wallet required.</div>
                </div>
                <div className="panel-body">
                  <div className="field-group">
                    <label className="field-label-text">Contract Address</label>
                    <input className="field-input" placeholder="0x…" value={verifyAddr} onChange={(e) => setVerifyAddr(e.target.value)} />
                  </div>
                  <div className="field-group">
                    <label className="field-label-text">IPFS CID to Verify</label>
                    <input className="field-input" placeholder="bafybei…" value={verifyCid} onChange={(e) => setVerifyCid(e.target.value)} />
                  </div>
                  <button className="btn btn-green full-width" onClick={handleVerify} disabled={verifyStatus === "loading"}>
                    {verifyStatus === "loading" ? <><span className="spinner" /> Querying Blockchain…</> : "Verify on Blockchain"}
                  </button>

                  {verifyResult?.error && <Status type="error" message={verifyResult.error} />}

                  {verifyResult?.exists === false && (
                      <div className="not-registered-card">
                        <span className="not-registered-icon">✕</span>
                        <div className="not-registered-title">Not Registered</div>
                        <div className="not-registered-sub">This CID has no on-chain record in this registry.</div>
                      </div>
                  )}

                  {verifyResult?.exists === true && (
                      <div className="precedence-card">
                        <span className="precedence-icon">✅</span>
                        <div className="precedence-title">Proof of Precedence Confirmed</div>
                        <div className="precedence-sub">
                          This paper is permanently registered on the blockchain. The record is tamper-proof and publicly verifiable.
                        </div>
                        <div className="precedence-meta">
                          <div className="precedence-meta-item">
                            <div className="precedence-meta-label">Author Wallet</div>
                            <div className="precedence-meta-value">{verifyResult.author}</div>
                          </div>
                          <div className="precedence-meta-item">
                            <div className="precedence-meta-label">Registered At</div>
                            <div className="precedence-meta-value">{new Date(verifyResult.timestamp * 1000).toUTCString()}</div>
                          </div>
                          <div className="precedence-meta-item">
                            <div className="precedence-meta-label">IPFS CID</div>
                            <div className="precedence-meta-value">{verifyResult.cid}</div>
                          </div>
                          <div className="precedence-meta-item">
                            <div className="precedence-meta-label">Total Papers in Registry</div>
                            <div className="precedence-meta-value">{verifyResult.total}</div>
                          </div>
                        </div>
                      </div>
                  )}
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* ══ FOOTER ══ */}
        <footer className="footer">
          <div className="footer-logo">Proof of Precedence</div>
          <div className="footer-tech">
            {["Solidity 0.8", "Hardhat", "Ethers.js v6", "React", "IPFS", "Pinata", "Polygon"].map(t => (
                <span className="tech-tag" key={t}>{t}</span>
            ))}
          </div>
          <div className="footer-copy">© 2025 · All records immutable</div>
        </footer>

      </div>
  );
}