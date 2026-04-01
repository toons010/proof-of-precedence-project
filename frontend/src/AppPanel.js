import React, { useState, useCallback, useRef } from "react";
import { ethers } from "ethers";
import "./AppPanel.css";

const REGISTRY_ABI = [
    "function submitPaper(string calldata _ipfsCID) external",
    "function getPaper(string calldata _ipfsCID) external view returns (string memory, address, uint256, bool)",
    "function paperExists(string calldata _ipfsCID) external view returns (bool)",
    "function totalPapers() external view returns (uint256)",
];

const CONTRACT_ADDRESS = process.env.REACT_APP_CONTRACT_ADDRESS || "";
const PINATA_API_KEY   = process.env.REACT_APP_PINATA_API_KEY   || "";
const PINATA_SECRET    = process.env.REACT_APP_PINATA_SECRET    || "";
const RPC_URL          = process.env.REACT_APP_RPC_URL          || "http://127.0.0.1:8545";
const DEFAULT_KEY      = process.env.REACT_APP_PRIVATE_KEY      || "";

function getSigner(pk) {
    return new ethers.Wallet(pk, new ethers.JsonRpcProvider(RPC_URL));
}

async function uploadToPinata(file, onMsg) {
    const fd = new FormData();
    fd.append("file", file, file.name);
    fd.append("pinataMetadata", JSON.stringify({ name: file.name }));
    fd.append("pinataOptions",  JSON.stringify({ cidVersion: 1 }));
    onMsg("Uploading to IPFS via Pinata…");
    const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
        method: "POST",
        headers: { pinata_api_key: PINATA_API_KEY, pinata_secret_api_key: PINATA_SECRET },
        body: fd,
    });
    if (!res.ok) throw new Error(`Pinata error ${res.status}: ${await res.text()}`);
    return (await res.json()).IpfsHash;
}

function Spin() { return <span className="ap-spin" />; }

function CopyField({ label, value }) {
    const [c, setC] = useState(false);
    const copy = () => { navigator.clipboard.writeText(value); setC(true); setTimeout(() => setC(false), 1800); };
    return (
        <div className="ap-result-row">
            <span className="ap-result-label">{label}</span>
            <div className="ap-result-val">
                <span>{value}</span>
                <button className="ap-copy" onClick={copy}>{c ? "✓" : "Copy"}</button>
            </div>
        </div>
    );
}

function Status({ type, msg }) {
    if (!msg) return null;
    const icons = { success: "✓", error: "✕", loading: null };
    return (
        <div className={`ap-status ap-status--${type}`}>
            {type === "loading" ? <Spin /> : <span>{icons[type]}</span>}
            <span>{msg}</span>
        </div>
    );
}

export default function AppPanel({ forwardRef, onWalletChange }) {
    const [tab, setTab]         = useState("upload");
    const [pk, setPk]           = useState(DEFAULT_KEY);
    const [wallet, setWallet]   = useState("");
    const [wSt, setWSt]         = useState("idle");
    const [wErr, setWErr]       = useState("");

    const [file, setFile]       = useState(null);
    const [cid, setCid]         = useState("");
    const [manCid, setManCid]   = useState("");
    const [upSt, setUpSt]       = useState("idle");
    const [upMsg, setUpMsg]     = useState("");
    const fileRef = useRef(null);

    const [sCid, setSCid]       = useState("");
    const [sAddr, setSAddr]     = useState(CONTRACT_ADDRESS);
    const [sSt, setSSt]         = useState("idle");
    const [sMsg, setSMsg]       = useState("");
    const [txHash, setTxHash]   = useState("");
    const [sTs, setSTs]         = useState(null);

    const [vCid, setVCid]       = useState("");
    const [vAddr, setVAddr]     = useState(CONTRACT_ADDRESS);
    const [vSt, setVSt]         = useState("idle");
    const [vRes, setVRes]       = useState(null);

    const connect = useCallback(async () => {
        if (!pk.trim()) { setWErr("Enter private key."); setWSt("error"); return; }
        setWSt("loading"); setWErr("");
        try {
            const addr = await getSigner(pk.trim()).getAddress();
            setWallet(addr); setWSt("success");
            onWalletChange?.(addr);
        } catch { setWErr("Invalid key or RPC unreachable."); setWSt("error"); }
    }, [pk, onWalletChange]);

    const handleDrop = (e) => {
        e.preventDefault();
        const f = e.dataTransfer.files[0];
        if (f) { setFile(f); setCid(""); setUpMsg(""); setUpSt("idle"); }
    };

    const doUpload = async () => {
        if (!PINATA_API_KEY || !file) {
            const c = manCid.trim();
            if (!c) { setUpMsg("Paste a CID."); setUpSt("error"); return; }
            setCid(c); setSCid(c); setVCid(c);
            setUpSt("success"); setUpMsg("CID accepted."); return;
        }
        setUpSt("loading"); setUpMsg("");
        try {
            const c = await uploadToPinata(file, setUpMsg);
            setCid(c); setSCid(c); setVCid(c);
            setUpSt("success"); setUpMsg("Pinned to IPFS successfully.");
        } catch (err) { setUpSt("error"); setUpMsg(err.message); }
    };

    const doSubmit = async () => {
        if (!sCid.trim())  { setSMsg("Enter CID.");              setSSt("error"); return; }
        if (!sAddr.trim()) { setSMsg("Enter contract address."); setSSt("error"); return; }
        if (!wallet)       { setSMsg("Connect wallet first.");   setSSt("error"); return; }
        setSSt("loading"); setSMsg("Sending transaction…"); setTxHash("");
        try {
            const signer = getSigner(pk.trim());
            const reg = new ethers.Contract(sAddr, REGISTRY_ABI, signer);
            if (await reg.paperExists(sCid)) { setSSt("error"); setSMsg("Already registered. Try Verify."); return; }
            const tx = await reg.submitPaper(sCid);
            setTxHash(tx.hash); setSMsg("Awaiting confirmation…");
            const receipt = await tx.wait(1);
            const block = await new ethers.JsonRpcProvider(RPC_URL).getBlock(receipt.blockNumber);
            setSTs(block.timestamp);
            setVCid(sCid); setVAddr(sAddr);
            setSSt("success"); setSMsg(`Confirmed · Block #${receipt.blockNumber}`);
        } catch (err) { setSSt("error"); setSMsg(err?.reason || err?.message || "Failed."); }
    };

    const doVerify = async () => {
        if (!vCid.trim())  { setVRes({ error: "Enter CID." });              setVSt("error"); return; }
        if (!vAddr.trim()) { setVRes({ error: "Enter contract address." }); setVSt("error"); return; }
        setVSt("loading"); setVRes(null);
        try {
            const reg = new ethers.Contract(vAddr, REGISTRY_ABI, new ethers.JsonRpcProvider(RPC_URL));
            const [rc, author, ts, exists] = await reg.getPaper(vCid);
            const total = await reg.totalPapers();
            if (!exists) { setVSt("error"); setVRes({ exists: false }); }
            else { setVSt("success"); setVRes({ exists: true, cid: rc, author, timestamp: Number(ts), total: total.toString() }); }
        } catch (err) { setVSt("error"); setVRes({ error: err.message }); }
    };

    const hasPinata = Boolean(PINATA_API_KEY && PINATA_SECRET);

    return (
        <section className="ap" ref={forwardRef}>
            <div className="ap__inner">

                {/* Header */}
                <div className="ap__header">
                    <div className="ap__header-label">The Application</div>
                    <h2 className="ap__header-title">
                        Register or verify<br /><em>your paper.</em>
                    </h2>
                </div>

                {/* Wallet strip */}
                <div className="ap__wallet">
                    <div className="ap__wallet-left">
                        <div className="ap__wallet-label">Wallet</div>
                        {wallet ? (
                            <div className="ap__wallet-addr">
                                <span className="ap__wallet-live" />
                                {wallet}
                                <span className="ap__wallet-net">Hardhat Local</span>
                            </div>
                        ) : (
                            <span className="ap__wallet-hint">Enter private key to sign transactions</span>
                        )}
                    </div>
                    {!wallet && (
                        <div className="ap__wallet-right">
                            <input
                                className="ap__input"
                                type="password"
                                placeholder="Private key (0x…)"
                                value={pk}
                                onChange={e => setPk(e.target.value)}
                                style={{ width: 280 }}
                            />
                            <button className="ap__btn ap__btn--gold ap__btn--sm" onClick={connect} disabled={wSt === "loading"}>
                                {wSt === "loading" ? <><Spin /> Connecting</> : "Connect"}
                            </button>
                        </div>
                    )}
                    {wErr && <Status type="error" msg={wErr} />}
                </div>

                {/* Tab bar */}
                <div className="ap__tabs">
                    {[
                        { id: "upload", icon: "⬆", label: "Upload to IPFS",    n: "01" },
                        { id: "submit", icon: "⛓", label: "Submit to Chain",   n: "02" },
                        { id: "verify", icon: "✓", label: "Verify Precedence", n: "03" },
                    ].map(({ id, icon, label, n }) => (
                        <button
                            key={id}
                            className={`ap__tab ${tab === id ? "ap__tab--active" : ""}`}
                            onClick={() => setTab(id)}
                        >
                            <span className="ap__tab-icon">{icon}</span>
                            <span className="ap__tab-label">{label}</span>
                            <span className="ap__tab-n">{n}</span>
                        </button>
                    ))}
                    <div className="ap__tab-indicator" style={{ left: `${["upload","submit","verify"].indexOf(tab) * 33.333}%` }} />
                </div>

                {/* ── UPLOAD panel ── */}
                {tab === "upload" && (
                    <div className="ap__panel ap__panel--dark">
                        <div className="ap__panel-header">
                            <h3 className="ap__panel-title">Upload Your Paper to IPFS</h3>
                            <p className="ap__panel-desc">Your PDF is pinned on IPFS. Its cryptographic fingerprint — the CID — is returned for blockchain registration. The CID changes if even a single byte of your document changes.</p>
                        </div>

                        {hasPinata ? (
                            <>
                                <div
                                    className={`ap__drop ${file ? "ap__drop--filled" : ""}`}
                                    onDrop={handleDrop}
                                    onDragOver={e => e.preventDefault()}
                                    onClick={() => fileRef.current?.click()}
                                >
                                    <input ref={fileRef} type="file" accept=".pdf" style={{ display: "none" }} onChange={e => { const f = e.target.files[0]; if (f) { setFile(f); setCid(""); setUpMsg(""); setUpSt("idle"); } }} />
                                    {file ? (
                                        <div className="ap__drop-preview">
                                            <span className="ap__drop-preview-icon">📄</span>
                                            <div>
                                                <div className="ap__drop-preview-name">{file.name}</div>
                                                <div className="ap__drop-preview-size">{(file.size/1024).toFixed(1)} KB</div>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="ap__drop-box">⬆</div>
                                            <div className="ap__drop-main">Drop your PDF here</div>
                                            <div className="ap__drop-sub">or click to browse · PDF only</div>
                                        </>
                                    )}
                                </div>
                                <button className="ap__btn ap__btn--gold ap__btn--full" onClick={doUpload} disabled={upSt === "loading" || !file}>
                                    {upSt === "loading" ? <><Spin /><span>Uploading…</span></> : "Upload to IPFS via Pinata"}
                                </button>
                            </>
                        ) : (
                            <div className="ap__manual">
                                <p className="ap__manual-note">
                                    ℹ No Pinata keys configured. Upload at <a href="https://app.pinata.cloud" target="_blank" rel="noreferrer">app.pinata.cloud</a> then paste the CID:
                                </p>
                                <input className="ap__input ap__input--full" placeholder="bafybei…" value={manCid} onChange={e => setManCid(e.target.value)} />
                                <button className="ap__btn ap__btn--gold ap__btn--full" onClick={doUpload} style={{ marginTop: 12 }}>Use This CID</button>
                            </div>
                        )}

                        <Status type={upSt} msg={upMsg} />

                        {cid && (
                            <div className="ap__result">
                                <div className="ap__result-title">IPFS Result</div>
                                <CopyField label="Content ID (CID)" value={cid} />
                                <div className="ap__result-actions">
                                    <a className="ap__btn ap__btn--ghost ap__btn--sm" href={`https://gateway.pinata.cloud/ipfs/${cid}`} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>
                                        View on IPFS ↗
                                    </a>
                                    <button className="ap__btn ap__btn--gold ap__btn--sm" onClick={() => { setSCid(cid); setTab("submit"); }}>
                                        Continue → Submit
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ── SUBMIT panel ── */}
                {tab === "submit" && (
                    <div className="ap__panel ap__panel--navy">
                        <div className="ap__panel-header">
                            <h3 className="ap__panel-title">Submit CID to Blockchain</h3>
                            <p className="ap__panel-desc">Your wallet signs a transaction permanently recording the CID, your Ethereum address, and an immutable network timestamp. The contract rejects any duplicate — your precedence is locked in forever.</p>
                        </div>

                        <div className="ap__field">
                            <label className="ap__label">Contract Address</label>
                            <input className="ap__input ap__input--full" placeholder="0x…" value={sAddr} onChange={e => setSAddr(e.target.value)} />
                        </div>
                        <div className="ap__field">
                            <label className="ap__label">IPFS CID</label>
                            <input className="ap__input ap__input--full" placeholder="bafybei…" value={sCid} onChange={e => setSCid(e.target.value)} />
                        </div>

                        <button className="ap__btn ap__btn--gold ap__btn--full" onClick={doSubmit} disabled={sSt === "loading"}>
                            {sSt === "loading" ? <><Spin /><span>Submitting…</span></> : "Submit to Blockchain"}
                        </button>

                        <Status type={sSt} msg={sMsg} />

                        {sSt === "success" && txHash && (
                            <div className="ap__cert">
                                <div className="ap__cert-seal">🔒</div>
                                <div className="ap__cert-title">Precedence Established</div>
                                <p className="ap__cert-sub">This document is permanently registered on-chain. No earlier submission for this CID can ever exist.</p>
                                <div className="ap__cert-grid">
                                    <div className="ap__cert-item">
                                        <div className="ap__cert-item-label">Tx Hash</div>
                                        <div className="ap__cert-item-val">{txHash.slice(0,24)}…</div>
                                    </div>
                                    {sTs && (
                                        <div className="ap__cert-item">
                                            <div className="ap__cert-item-label">Block Timestamp</div>
                                            <div className="ap__cert-item-val">{new Date(sTs*1000).toUTCString()}</div>
                                        </div>
                                    )}
                                    <div className="ap__cert-item">
                                        <div className="ap__cert-item-label">IPFS CID</div>
                                        <div className="ap__cert-item-val">{sCid.slice(0,28)}…</div>
                                    </div>
                                    <div className="ap__cert-item">
                                        <div className="ap__cert-item-label">Author</div>
                                        <div className="ap__cert-item-val">{wallet.slice(0,24)}…</div>
                                    </div>
                                </div>
                                <button className="ap__btn ap__btn--ghost ap__btn--sm" style={{ marginTop: 24 }} onClick={() => { setVCid(sCid); setTab("verify"); }}>
                                    Verify This Paper →
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* ── VERIFY panel ── */}
                {tab === "verify" && (
                    <div className="ap__panel ap__panel--light">
                        <div className="ap__panel-header">
                            <h3 className="ap__panel-title ap__panel-title--dark">Verify Proof of Precedence</h3>
                            <p className="ap__panel-desc ap__panel-desc--dark">Query the blockchain with any CID. The contract returns the author address, block timestamp, and full precedence status. This is a read-only call — no wallet, no gas, no cost.</p>
                        </div>

                        <div className="ap__field">
                            <label className="ap__label ap__label--dark">Contract Address</label>
                            <input className="ap__input ap__input--light ap__input--full" placeholder="0x…" value={vAddr} onChange={e => setVAddr(e.target.value)} />
                        </div>
                        <div className="ap__field">
                            <label className="ap__label ap__label--dark">IPFS CID to Verify</label>
                            <input className="ap__input ap__input--light ap__input--full" placeholder="bafybei…" value={vCid} onChange={e => setVCid(e.target.value)} />
                        </div>

                        <button className="ap__btn ap__btn--teal ap__btn--full" onClick={doVerify} disabled={vSt === "loading"}>
                            {vSt === "loading" ? <><Spin /><span>Querying…</span></> : "Verify on Blockchain"}
                        </button>

                        {vRes?.error && <Status type="error" msg={vRes.error} />}

                        {vRes?.exists === false && (
                            <div className="ap__cert ap__cert--denied">
                                <div className="ap__cert-seal">✕</div>
                                <div className="ap__cert-title" style={{ color: "#c0392b" }}>Not Registered</div>
                                <p className="ap__cert-sub">This CID has no on-chain record in this registry contract.</p>
                            </div>
                        )}

                        {vRes?.exists === true && (
                            <div className="ap__cert">
                                <div className="ap__cert-seal">✅</div>
                                <div className="ap__cert-title">Proof Confirmed</div>
                                <p className="ap__cert-sub">This record is immutable. The authorship and timestamp have been verified on-chain and cannot be altered.</p>
                                <div className="ap__cert-grid">
                                    <div className="ap__cert-item">
                                        <div className="ap__cert-item-label">Author Wallet</div>
                                        <div className="ap__cert-item-val">{vRes.author}</div>
                                    </div>
                                    <div className="ap__cert-item">
                                        <div className="ap__cert-item-label">Registered At</div>
                                        <div className="ap__cert-item-val">{new Date(vRes.timestamp*1000).toUTCString()}</div>
                                    </div>
                                    <div className="ap__cert-item">
                                        <div className="ap__cert-item-label">IPFS CID</div>
                                        <div className="ap__cert-item-val">{vRes.cid}</div>
                                    </div>
                                    <div className="ap__cert-item">
                                        <div className="ap__cert-item-label">Total Papers</div>
                                        <div className="ap__cert-item-val">{vRes.total}</div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

            </div>
        </section>
    );
}