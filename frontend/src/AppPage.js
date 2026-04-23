import React, { useState, useRef, useEffect, useCallback } from "react";
import { useScrollReveal, useParallax, useElementScroll } from "./useScrollAnimation";
import { ethers } from "ethers";
import "./AppPage.css";
import JournalPanel from "./JournalPanel";

// ─── tiny smoothstep helper ──────────────────────────────────────────────────
const ss = (v, a, b) => Math.max(0, Math.min(1, (v - a) / (b - a)));

// ─── Contract ABI ────────────────────────────────────────────────────────────
const REGISTRY_ABI = [
  "function submitPaper(string calldata _ipfsCID) external",
  "function getPaper(string calldata _ipfsCID) external view returns (string memory, address, uint256, bool)",
  "function paperExists(string calldata _ipfsCID) external view returns (bool)",
  "function totalPapers() external view returns (uint256)",
];

// ─── Environment (all wired up in .env — researcher never sees these) ────────
const CONTRACT_ADDRESS = process.env.REACT_APP_CONTRACT_ADDRESS || "";
const PINATA_API_KEY   = process.env.REACT_APP_PINATA_API_KEY   || "";
const PINATA_SECRET    = process.env.REACT_APP_PINATA_SECRET    || "";
const RPC_URL          = process.env.REACT_APP_RPC_URL          || "http://127.0.0.1:8545";
const DEFAULT_KEY      = process.env.REACT_APP_PRIVATE_KEY      || "";

function getSigner() {
  return new ethers.Wallet(DEFAULT_KEY, new ethers.JsonRpcProvider(RPC_URL));
}

async function uploadToPinata(file, onMsg) {
  const fd = new FormData();
  fd.append("file", file, file.name);
  fd.append("pinataMetadata", JSON.stringify({ name: file.name }));
  fd.append("pinataOptions",  JSON.stringify({ cidVersion: 1 }));
  onMsg("Uploading to IPFS…");
  const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method: "POST",
    headers: { pinata_api_key: PINATA_API_KEY, pinata_secret_api_key: PINATA_SECRET },
    body: fd,
  });
  if (!res.ok) throw new Error(`Pinata error ${res.status}: ${await res.text()}`);
  return (await res.json()).IpfsHash;
}

// ─── Micro-components ────────────────────────────────────────────────────────
function Spin() { return <span className="spin" />; }

function CopyField({ label, value }) {
  const [c, setC] = useState(false);
  return (
    <div className="app-result-row">
      <span className="app-result-lbl">{label}</span>
      <div className="app-result-val">
        <span>{value}</span>
        <button className="app-copy-btn" onClick={() => { navigator.clipboard.writeText(value); setC(true); setTimeout(() => setC(false), 1800); }}>
          {c ? "✓ Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}

function StatusMsg({ type, msg }) {
  if (!msg) return null;
  return (
    <div className={`status status-${type === "success" ? "ok" : type === "error" ? "err" : "ld"}`}>
      {type === "loading" ? <Spin /> : <span>{type === "success" ? "✓" : "✕"}</span>}
      <span>{msg}</span>
    </div>
  );
}

// ─── Step progress indicator ──────────────────────────────────────────────────
const STEPS = [
  { id: "upload",   icon: "⬆",  label: "Upload PDF"         },
  { id: "register", icon: "⛓",  label: "Register on Chain"  },
  { id: "done",     icon: "✓",  label: "Proof Confirmed"    },
];

function StepBar({ current }) {
  const idx = STEPS.findIndex(s => s.id === current);
  return (
    <div className="apppage-stepbar">
      {STEPS.map((s, i) => (
        <React.Fragment key={s.id}>
          <div className={`apppage-step ${i < idx ? "apppage-step--done" : i === idx ? "apppage-step--active" : ""}`}>
            <div className="apppage-step__circle">
              {i < idx ? "✓" : s.icon}
            </div>
            <span className="apppage-step__label">{s.label}</span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`apppage-step__line ${i < idx ? "apppage-step__line--done" : ""}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// ─── Wallet badge (auto-connected, no user input) ─────────────────────────────
function WalletBadge({ wallet, status }) {
  if (status === "loading") return (
    <div className="apppage-wallet-badge apppage-wallet-badge--loading">
      <Spin /> Connecting wallet…
    </div>
  );
  if (!wallet) return (
    <div className="apppage-wallet-badge apppage-wallet-badge--err">
      ⚠ Wallet not connected — check your .env setup
    </div>
  );
  return (
    <div className="apppage-wallet-badge apppage-wallet-badge--ok">
      <span className="apppage-wallet__dot" />
      {wallet.slice(0, 6)}…{wallet.slice(-4)}
      <span className="apppage-wallet__net">Hardhat Local</span>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function AppPage({ onWalletChange, initialTab }) {
  useScrollReveal();
  const [heroRef, heroP] = useElementScroll();
  const heroExit      = heroP > 0.72 ? ss(heroP, 0.72, 0.95) : 0;
  const heroEnterBack = heroP < 0.32 ? 1 - ss(heroP, 0.08, 0.32) : 0;
  const heroFade      = Math.max(heroExit, heroEnterBack);
  const heroRetrace   = 1 - heroFade;
  const [bgRef,    bgOff]   = useParallax(0.3);
  const [bleedRef, blOff]   = useParallax(-0.07);
  const [textRef,  textOff] = useParallax(0.12);

  // ── Wallet (auto-connect) ────────────────────────────────────────────────
  const [wallet, setWallet] = useState("");
  const [wSt, setWSt]       = useState("loading");

  useEffect(() => {
    if (!DEFAULT_KEY) { setWSt("error"); return; }
    getSigner().getAddress()
      .then(addr => { setWallet(addr); setWSt("success"); onWalletChange?.(addr); })
      .catch(() => setWSt("error"));
  }, [onWalletChange]);

  // ── Step state ───────────────────────────────────────────────────────────
  const [appMode, setAppMode] = useState(initialTab ? "journals" : "registry"); // "registry" | "journals"
  const [step, setStep] = useState("upload"); // upload | register | done

  // ── Upload ───────────────────────────────────────────────────────────────
  const [file, setFile]   = useState(null);
  const [cid, setCid]     = useState("");
  const [upSt, setUpSt]   = useState("idle");
  const [upMsg, setUpMsg] = useState("");
  const fileRef = useRef(null);

  const pickFile = (f) => {
    if (!f) return;
    setFile(f); setCid(""); setUpMsg(""); setUpSt("idle");
  };

  const doUpload = async () => {
    if (!file) return;
    setUpSt("loading"); setUpMsg("");
    try {
      const c = await uploadToPinata(file, setUpMsg);
      setCid(c);
      setUpSt("success"); setUpMsg("Pinned to IPFS successfully.");
      // Auto-advance after a brief moment
      setTimeout(() => setStep("register"), 800);
    } catch (err) { setUpSt("error"); setUpMsg(err.message); }
  };

  // ── Register (submit) ────────────────────────────────────────────────────
  const [sSt, setSSt]     = useState("idle");
  const [sMsg, setSMsg]   = useState("");
  const [txHash, setTxHash] = useState("");
  const [sTs, setSTs]     = useState(null);

  const doRegister = async () => {
    if (!cid)    { setSMsg("Upload a PDF first."); setSSt("error"); return; }
    if (!wallet) { setSMsg("Wallet not connected."); setSSt("error"); return; }
    setSSt("loading"); setSMsg("Sending transaction…"); setTxHash("");
    try {
      const signer = getSigner();
      const reg = new ethers.Contract(CONTRACT_ADDRESS, REGISTRY_ABI, signer);
      if (await reg.paperExists(cid)) {
        setSSt("error"); setSMsg("This paper is already registered. Use Verify to check its record.");
        return;
      }
      const tx = await reg.submitPaper(cid);
      setTxHash(tx.hash); setSMsg("Awaiting confirmation…");
      const receipt = await tx.wait(1);
      const block = await new ethers.JsonRpcProvider(RPC_URL).getBlock(receipt.blockNumber);
      setSTs(block.timestamp);
      setSSt("success"); setSMsg(`Confirmed · Block #${receipt.blockNumber}`);
      setTimeout(() => setStep("done"), 600);
    } catch (err) { setSSt("error"); setSMsg(err?.reason || err?.message || "Failed."); }
  };

  // ── Verify ───────────────────────────────────────────────────────────────
  const [vSt, setVSt]       = useState("idle");
  const [vRes, setVRes]     = useState(null);
  const [otherCid, setOtherCid] = useState("");
  const [verifyOther, setVerifyOther] = useState(false);

  const doVerify = useCallback(async (targetCid) => {
    if (!targetCid.trim()) { setVRes({ error: "Enter a CID to verify." }); setVSt("error"); return; }
    setVSt("loading"); setVRes(null);
    try {
      const reg = new ethers.Contract(CONTRACT_ADDRESS, REGISTRY_ABI, new ethers.JsonRpcProvider(RPC_URL));
      const [rc, author, ts, exists] = await reg.getPaper(targetCid.trim());
      const total = await reg.totalPapers();
      if (!exists) { setVSt("error"); setVRes({ exists: false }); }
      else { setVSt("success"); setVRes({ exists: true, cid: rc, author, timestamp: Number(ts), total: total.toString() }); }
    } catch (err) { setVSt("error"); setVRes({ error: err.message }); }
  }, []);

  // Auto-verify once we reach the done step
  useEffect(() => {
    if (step === "done" && cid && vSt === "idle") {
      doVerify(cid);
    }
  }, [step, cid, vSt, doVerify]);

  const hasPinata = Boolean(PINATA_API_KEY && PINATA_SECRET);

  return (
    <div className="apppage page-enter">

      {/* ── Hero banner ── */}
      <section className="apppage-hero" ref={heroRef}>
        <div ref={bgRef} className="apppage-hero__bg"
          style={{ transform: `translateY(${bgOff}px) scale(1.15)` }} />
        <div className="apppage-hero__ov"/>
        <div className="apppage-hero__grid tech-grid-bg"/>
        <div ref={bleedRef} className="apppage-hero__bleed"
          style={{ transform: `translate(-50%,-50%) translateY(${blOff}px)` }}>APP</div>
        <div ref={textRef} className="apppage-hero__content"
          style={{ transform: `translateY(${textOff}px)` }}>
          <div className="eyebrow"
            style={heroFade > 0.01 ? { opacity: heroRetrace, transform: `translateY(${heroFade*-40}px)` } : undefined}>
            The Application
          </div>
          <h1 className="apppage-hero__h1"
            style={heroFade > 0.01 ? { opacity: heroRetrace, transform: `translateY(${heroFade*60}px)` } : undefined}>
            Register or verify<br /><em className="gold-text">your paper.</em>
          </h1>
          <p className="apppage-hero__sub"
            style={heroFade > 0.01 ? { opacity: heroRetrace, transform: `translateY(${heroFade*40}px)` } : undefined}>
            Upload your PDF. We handle the rest — IPFS pinning, blockchain registration, and cryptographic proof.
          </p>
        </div>
      </section>

      {/* ── Main tool ── */}
      <div className="apppage-tool" id="app-dashboard">
        
        {/* Dashboard Mode Toggle */}
        <div className="apppage-mode-toggle">
          <button 
            className={`apppage-mode-btn ${appMode === "registry" ? "apppage-mode-btn--active" : ""}`}
            onClick={() => setAppMode("registry")}
          >
            <span className="apppage-mode-btn__n">01</span>
            Paper Registry
          </button>
          <button 
            className={`apppage-mode-btn ${appMode === "journals" ? "apppage-mode-btn--active" : ""}`}
            onClick={() => setAppMode("journals")}
          >
            <span className="apppage-mode-btn__n">02</span>
            Journals &amp; Review
          </button>
          <div className="apppage-mode-indicator" style={{ left: appMode === "registry" ? "0%" : "50%" }} />
        </div>

        {/* Wallet badge — auto-connected, no input needed */}
        <div className="apppage-wallet-strip">
          <WalletBadge wallet={wallet} status={wSt} />
        </div>

        {appMode === "registry" ? (
          <div className="apppage-registry-flow page-enter">
            {/* Step progress bar */}
            <StepBar current={step} />

        {/* ── STEP 1: Upload ── */}
        {step === "upload" && (
          <div className="apppage-panel apppage-panel--dark">
            <div className="apppage-panel__img-wrap">
              <img src="https://images.unsplash.com/photo-1516979187457-637abb4f9353?w=800&q=80" alt="Upload" className="apppage-panel__img" />
              <div className="apppage-panel__img-ov" />
            </div>
            <h2 className="apppage-panel__title">Upload Your Research Paper</h2>
            <p className="apppage-panel__desc">
              Drop your PDF below. We'll pin it to IPFS and generate a unique cryptographic
              fingerprint — no data leaves until you click Upload.
            </p>

            {hasPinata ? (
              <>
                <div
                  className={`apppage-drop ${file ? "apppage-drop--filled" : ""}`}
                  onDrop={e => { e.preventDefault(); pickFile(e.dataTransfer.files[0]); }}
                  onDragOver={e => e.preventDefault()}
                  onClick={() => fileRef.current?.click()}
                >
                  <input ref={fileRef} type="file" accept=".pdf" style={{ display: "none" }}
                    onChange={e => pickFile(e.target.files[0])} />
                  {file ? (
                    <div className="apppage-drop__preview">
                      <span>📄</span>
                      <div>
                        <div className="apppage-drop__name">{file.name}</div>
                        <div className="apppage-drop__size">{(file.size / 1024).toFixed(1)} KB</div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="apppage-drop__icon">⬆</div>
                      <div className="apppage-drop__main">Drop your PDF here</div>
                      <div className="apppage-drop__sub">or click to browse · PDF only</div>
                    </>
                  )}
                </div>
                <button
                  className="btn btn-gold btn-full"
                  onClick={doUpload}
                  disabled={upSt === "loading" || !file}
                >
                  {upSt === "loading"
                    ? <><Spin /><span>{upMsg || "Uploading…"}</span></>
                    : <span>Upload to IPFS</span>}
                </button>
              </>
            ) : (
              /* Fallback: no Pinata keys — shouldn't normally be seen by researcher */
              <div className="apppage-manual">
                <p className="apppage-manual__note">
                  ⚠ IPFS service not configured. Contact your administrator.
                </p>
              </div>
            )}

            <StatusMsg type={upSt} msg={upMsg} />

            {cid && (
              <div className="apppage-result">
                <div className="apppage-result__hdr">✓ Pinned to IPFS</div>
                <CopyField label="Content ID (CID)" value={cid} />
                <div className="apppage-result__actions">
                  <a className="btn btn-ghost btn-sm"
                    href={`https://gateway.pinata.cloud/ipfs/${cid}`}
                    target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>
                    View on IPFS ↗
                  </a>
                  <button className="btn btn-gold btn-sm"
                    onClick={() => setStep("register")}>
                    Continue → Register
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── STEP 2: Register ── */}
        {step === "register" && (
          <div className="apppage-panel apppage-panel--navy">
            <div className="apppage-panel__img-wrap">
              <img src="https://images.unsplash.com/photo-1639322537228-f710d846310a?w=800&q=80" alt="Register" className="apppage-panel__img" />
              <div className="apppage-panel__img-ov" />
            </div>
            <h2 className="apppage-panel__title">Register on the Blockchain</h2>
            <p className="apppage-panel__desc">
              Your paper's unique fingerprint will be permanently recorded on-chain with
              your wallet address and an immutable timestamp. No earlier submission for
              this paper can ever exist once this transaction confirms.
            </p>

            {/* Paper summary card — no editable fields */}
            <div className="apppage-summary-card">
              <div className="apppage-summary-card__row">
                <span className="apppage-summary-card__lbl">📄 Paper</span>
                <span className="apppage-summary-card__val">{file?.name || "—"}</span>
              </div>
              <div className="apppage-summary-card__row">
                <span className="apppage-summary-card__lbl">🔑 Fingerprint (CID)</span>
                <span className="apppage-summary-card__val apppage-summary-card__val--mono">
                  {cid.slice(0, 20)}…{cid.slice(-6)}
                </span>
              </div>
              <div className="apppage-summary-card__row">
                <span className="apppage-summary-card__lbl">👤 Author Wallet</span>
                <span className="apppage-summary-card__val apppage-summary-card__val--mono">
                  {wallet ? `${wallet.slice(0, 10)}…${wallet.slice(-6)}` : "—"}
                </span>
              </div>
            </div>

            <button className="btn btn-gold btn-full"
              onClick={doRegister}
              disabled={sSt === "loading"}>
              {sSt === "loading"
                ? <><Spin /><span>{sMsg || "Submitting…"}</span></>
                : <span>🔒 Register on Blockchain</span>}
            </button>

            {sSt === "error" && <StatusMsg type="error" msg={sMsg} />}

            <button className="btn btn-ghost btn-sm" style={{ marginTop: 12 }}
              onClick={() => setStep("upload")}>
              ← Back to Upload
            </button>
          </div>
        )}

        {/* ── STEP 3: Done / Certificate ── */}
        {step === "done" && (
          <div className="apppage-panel apppage-panel--navy">
            <div className="apppage-panel__img-wrap">
              <img src="https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&q=80" alt="Success" className="apppage-panel__img" />
              <div className="apppage-panel__img-ov" />
            </div>
            <div className="apppage-cert">
              <div className="apppage-cert__seal">🔒</div>
              <div className="apppage-cert__title">Precedence Established</div>
              <p className="apppage-cert__sub">
                Permanently registered on-chain. No earlier submission can ever exist for this paper.
              </p>
              <div className="apppage-cert__grid">
                {txHash && (
                  <div className="apppage-cert__item">
                    <div className="apppage-cert__item-l">Transaction Hash</div>
                    <div className="apppage-cert__item-v">{txHash.slice(0, 26)}…</div>
                  </div>
                )}
                {sTs && (
                  <div className="apppage-cert__item">
                    <div className="apppage-cert__item-l">Timestamp</div>
                    <div className="apppage-cert__item-v">{new Date(sTs * 1000).toUTCString()}</div>
                  </div>
                )}
                <div className="apppage-cert__item">
                  <div className="apppage-cert__item-l">Paper</div>
                  <div className="apppage-cert__item-v">{file?.name || cid.slice(0, 28) + "…"}</div>
                </div>
                <div className="apppage-cert__item">
                  <div className="apppage-cert__item-l">Author Wallet</div>
                  <div className="apppage-cert__item-v">{wallet.slice(0, 26)}…</div>
                </div>
              </div>

              {/* Inline verify result */}
              {vSt === "loading" && (
                <div className="apppage-verify-inline"><Spin /> Confirming on-chain record…</div>
              )}
              {vSt === "success" && vRes?.exists && (
                <div className="apppage-verify-inline apppage-verify-inline--ok">
                  ✅ On-chain record verified — {vRes.total} paper{vRes.total !== "1" ? "s" : ""} registered in total.
                </div>
              )}
            </div>

            {/* Register another paper */}
            <div style={{ textAlign: "center", marginTop: 24, display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <button className="btn btn-gold btn-sm" onClick={() => {
                setStep("upload"); setFile(null); setCid(""); setUpSt("idle"); setUpMsg("");
                setSSt("idle"); setSMsg(""); setTxHash(""); setSTs(null);
                setVSt("idle"); setVRes(null); setVerifyOther(false); setOtherCid("");
              }}>
                + Register Another Paper
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => setVerifyOther(v => !v)}>
                {verifyOther ? "▲ Hide" : "🔍 Verify a Different Paper"}
              </button>
            </div>

            {/* Optional: verify someone else's paper */}
            {verifyOther && (
              <div className="apppage-verify-other">
                <p className="apppage-verify-other__desc">
                  Paste the CID of any registered paper to verify its on-chain record.
                </p>
                <div className="apppage-verify-other__row">
                  <input
                    className="apppage-input apppage-verify-other__input"
                    placeholder="Paste CID (bafybei…)"
                    value={otherCid}
                    onChange={e => setOtherCid(e.target.value)}
                  />
                  <button className="btn btn-gold btn-sm"
                    onClick={() => doVerify(otherCid)}
                    disabled={vSt === "loading"}>
                    {vSt === "loading" ? <><Spin /> Checking…</> : "Verify"}
                  </button>
                </div>
                {vRes?.error && <StatusMsg type="error" msg={vRes.error} />}
                {vRes?.exists === false && (
                  <div className="apppage-cert apppage-cert--denied" style={{ marginTop: 16 }}>
                    <div className="apppage-cert__seal">✕</div>
                    <div className="apppage-cert__title" style={{ color: "#c0392b" }}>Not Registered</div>
                    <p className="apppage-cert__sub">This CID has no on-chain record.</p>
                  </div>
                )}
                {vRes?.exists === true && (
                  <div className="apppage-cert" style={{ marginTop: 16 }}>
                    <div className="apppage-cert__seal">✅</div>
                    <div className="apppage-cert__title">Proof Confirmed</div>
                    <div className="apppage-cert__grid">
                      <div className="apppage-cert__item">
                        <div className="apppage-cert__item-l">Author Wallet</div>
                        <div className="apppage-cert__item-v">{vRes.author}</div>
                      </div>
                      <div className="apppage-cert__item">
                        <div className="apppage-cert__item-l">Registered At</div>
                        <div className="apppage-cert__item-v">{new Date(vRes.timestamp * 1000).toUTCString()}</div>
                      </div>
                      <div className="apppage-cert__item">
                        <div className="apppage-cert__item-l">IPFS CID</div>
                        <div className="apppage-cert__item-v">{vRes.cid}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
          </div>
        ) : (
          <div className="apppage-journal-flow page-enter">
            <JournalPanel 
              wallet={wallet} 
              currentCid={(verifyOther && vRes?.exists && otherCid) ? vRes.cid : cid} 
              initialTab={initialTab}
            />
          </div>
        )}
      </div>

    </div>
  );
}