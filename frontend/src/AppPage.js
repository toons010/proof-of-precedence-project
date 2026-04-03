import React, { useState, useCallback, useRef, useEffect } from "react";
import { useScrollReveal, useParallax, useElementScroll } from "./useScrollAnimation";

const ss = (v, a, b) => Math.max(0, Math.min(1, (v - a) / (b - a)));
import { ethers } from "ethers";
import "./AppPage.css";

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

function getSigner(pk) { return new ethers.Wallet(pk, new ethers.JsonRpcProvider(RPC_URL)); }

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

function Spin() { return <span className="spin"/>; }

function CopyField({ label, value }) {
  const [c, setC] = useState(false);
  const copy = () => { navigator.clipboard.writeText(value); setC(true); setTimeout(()=>setC(false),1800); };
  return (
    <div className="app-result-row">
      <span className="app-result-lbl">{label}</span>
      <div className="app-result-val">
        <span>{value}</span>
        <button className="app-copy-btn" onClick={copy}>{c?"✓ Copied":"Copy"}</button>
      </div>
    </div>
  );
}

function StatusMsg({ type, msg }) {
  if (!msg) return null;
  return (
    <div className={`status status-${type === "success" ? "ok" : type === "error" ? "err" : "ld"}`}>
      {type === "loading" ? <Spin/> : <span>{type === "success" ? "✓" : "✕"}</span>}
      <span>{msg}</span>
    </div>
  );
}

export default function AppPage({ onWalletChange }) {
  useScrollReveal();
  const [heroRef, heroP] = useElementScroll();
  const heroExit      = heroP > 0.72 ? ss(heroP, 0.72, 0.95) : 0;
  const heroEnterBack = heroP < 0.32 ? 1 - ss(heroP, 0.08, 0.32) : 0;
  const heroFade      = Math.max(heroExit, heroEnterBack);
  const heroRetrace   = 1 - heroFade;
  const [bgRef,    bgOff]   = useParallax(0.3);
  const [bleedRef, blOff]   = useParallax(-0.07);
  const [textRef,  textOff] = useParallax(0.12);
  const [tab, setTab]       = useState("upload");
  const [pk, setPk]         = useState(DEFAULT_KEY);
  const [wallet, setWallet] = useState("");
  const [wSt, setWSt]       = useState("idle");
  const [wErr, setWErr]     = useState("");

  const [file, setFile]     = useState(null);
  const [cid, setCid]       = useState("");
  const [manCid, setManCid] = useState("");
  const [upSt, setUpSt]     = useState("idle");
  const [upMsg, setUpMsg]   = useState("");
  const fileRef = useRef(null);

  const [sCid, setSCid]     = useState("");
  const [sAddr, setSAddr]   = useState(CONTRACT_ADDRESS);
  const [sSt, setSSt]       = useState("idle");
  const [sMsg, setSMsg]     = useState("");
  const [txHash, setTxHash] = useState("");
  const [sTs, setSTs]       = useState(null);

  const [vCid, setVCid]     = useState("");
  const [vAddr, setVAddr]   = useState(CONTRACT_ADDRESS);
  const [vSt, setVSt]       = useState("idle");
  const [vRes, setVRes]     = useState(null);

  const connect = useCallback(async () => {
    if (!pk.trim()) { setWErr("Enter private key."); setWSt("error"); return; }
    setWSt("loading"); setWErr("");
    try {
      const addr = await getSigner(pk.trim()).getAddress();
      setWallet(addr); setWSt("success");
      onWalletChange?.(addr);
    } catch { setWErr("Invalid key or RPC unreachable."); setWSt("error"); }
  }, [pk, onWalletChange]);

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
      setUpSt("success"); setUpMsg("Successfully pinned to IPFS.");
    } catch (err) { setUpSt("error"); setUpMsg(err.message); }
  };

  const doSubmit = async () => {
    if (!sCid.trim())  { setSMsg("Enter CID."); setSSt("error"); return; }
    if (!sAddr.trim()) { setSMsg("Enter contract address."); setSSt("error"); return; }
    if (!wallet)       { setSMsg("Connect wallet first."); setSSt("error"); return; }
    setSSt("loading"); setSMsg("Sending transaction…"); setTxHash("");
    try {
      const signer = getSigner(pk.trim());
      const reg = new ethers.Contract(sAddr, REGISTRY_ABI, signer);
      if (await reg.paperExists(sCid)) { setSSt("error"); setSMsg("Already registered. Verify it in the Verify tab."); return; }
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
    if (!vCid.trim())  { setVRes({error:"Enter CID."}); setVSt("error"); return; }
    if (!vAddr.trim()) { setVRes({error:"Enter contract address."}); setVSt("error"); return; }
    setVSt("loading"); setVRes(null);
    try {
      const reg = new ethers.Contract(vAddr, REGISTRY_ABI, new ethers.JsonRpcProvider(RPC_URL));
      const [rc, author, ts, exists] = await reg.getPaper(vCid);
      const total = await reg.totalPapers();
      if (!exists) { setVSt("error"); setVRes({exists:false}); }
      else { setVSt("success"); setVRes({exists:true,cid:rc,author,timestamp:Number(ts),total:total.toString()}); }
    } catch (err) { setVSt("error"); setVRes({error:err.message}); }
  };

  const hasPinata = Boolean(PINATA_API_KEY && PINATA_SECRET);
  const tabs = ["upload","submit","verify"];
  const tabLabels = {upload:"⬆ Upload to IPFS", submit:"⛓ Submit to Chain", verify:"✓ Verify"};

  return (
    <div className="apppage page-enter">

      {/* ── Hero banner ── */}
      <section className="apppage-hero" ref={heroRef}>
        <div ref={bgRef} className="apppage-hero__bg"
          style={{ transform: `translateY(${bgOff}px) scale(1.15)` }} />
        <div className="apppage-hero__ov"/>
        <div className="apppage-hero__grid tech-grid-bg"/>
        {/* Bleed counter-scrolls */}
        <div ref={bleedRef} className="apppage-hero__bleed"
          style={{ transform: `translate(-50%,-50%) translateY(${blOff}px)` }}>APP</div>
        {/* Text at medium parallax */}
        <div ref={textRef} className="apppage-hero__content"
          style={{ transform: `translateY(${textOff}px)` }}>
          <div className="eyebrow"
            style={ heroFade > 0.01 ? { opacity: heroRetrace, transform: `translateY(${heroFade*-40}px)` } : undefined }>
            The Application
          </div>
          <h1 className="apppage-hero__h1"
            style={ heroFade > 0.01 ? { opacity: heroRetrace, transform: `translateY(${heroFade*60}px)` } : undefined }>
            Register or verify<br /><em className="gold-text">your paper.</em>
          </h1>
          <p className="apppage-hero__sub"
            style={ heroFade > 0.01 ? { opacity: heroRetrace, transform: `translateY(${heroFade*40}px)` } : undefined }>
            Three steps. Upload to IPFS, submit to blockchain, verify on-chain.
            No MetaMask required.
          </p>
        </div>
      </section>

      {/* ── Main tool ── */}
      <div className="apppage-tool">

        {/* Wallet strip */}
        <div className="apppage-wallet">
          <div className="apppage-wallet__left">
            <div className="apppage-wallet__label">Wallet Connection</div>
            {wallet ? (
              <div className="apppage-wallet__addr">
                <span className="apppage-wallet__dot"/>
                {wallet}
                <span className="apppage-wallet__net">Hardhat Local</span>
              </div>
            ) : (
              <span className="apppage-wallet__hint">Enter private key to sign transactions</span>
            )}
          </div>
          {!wallet && (
            <div className="apppage-wallet__right">
              <input className="apppage-input apppage-wallet__input" type="password" placeholder="Private key (0x…)" value={pk} onChange={e=>setPk(e.target.value)}/>
              <button className="btn btn-gold btn-sm" onClick={connect} disabled={wSt==="loading"}>
                {wSt==="loading" ? <><Spin/> Connecting</> : "Connect"}
              </button>
            </div>
          )}
          {wErr && <StatusMsg type="error" msg={wErr}/>}
        </div>

        {/* Tab bar */}
        <div className="apppage-tabs">
          {tabs.map((t,i) => (
            <button key={t} className={`apppage-tab ${tab===t?"apppage-tab--active":""}`} onClick={()=>setTab(t)}>
              <span className="apppage-tab__label">{tabLabels[t]}</span>
              <span className="apppage-tab__n">0{i+1}</span>
            </button>
          ))}
          <div className="apppage-tab-bar" style={{left:`${tabs.indexOf(tab)*33.333}%`}}/>
        </div>

        {/* ── Upload ── */}
        {tab==="upload" && (
          <div className="apppage-panel apppage-panel--dark">
            <h2 className="apppage-panel__title">Upload Your Paper to IPFS</h2>
            <p className="apppage-panel__desc">Your PDF is pinned on IPFS. Its cryptographic fingerprint — the CID — is returned for blockchain registration. The CID changes if even a single byte changes.</p>

            {hasPinata ? (
              <>
                <div className={`apppage-drop ${file?"apppage-drop--filled":""}`}
                  onDrop={e=>{e.preventDefault();const f=e.dataTransfer.files[0];if(f){setFile(f);setCid("");setUpMsg("");setUpSt("idle");}}}
                  onDragOver={e=>e.preventDefault()}
                  onClick={()=>fileRef.current?.click()}
                >
                  <input ref={fileRef} type="file" accept=".pdf" style={{display:"none"}} onChange={e=>{const f=e.target.files[0];if(f){setFile(f);setCid("");setUpMsg("");setUpSt("idle");}}}/>
                  {file ? (
                    <div className="apppage-drop__preview">
                      <span>📄</span>
                      <div>
                        <div className="apppage-drop__name">{file.name}</div>
                        <div className="apppage-drop__size">{(file.size/1024).toFixed(1)} KB</div>
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
                <button className="btn btn-gold btn-full" onClick={doUpload} disabled={upSt==="loading"||!file}>
                  {upSt==="loading" ? <><Spin/><span>Uploading…</span></> : <span>Upload to IPFS via Pinata</span>}
                </button>
              </>
            ) : (
              <div className="apppage-manual">
                <p className="apppage-manual__note">ℹ No Pinata keys configured. Upload at <a href="https://app.pinata.cloud" target="_blank" rel="noreferrer">app.pinata.cloud</a> then paste the CID:</p>
                <input className="apppage-input" placeholder="bafybei…" value={manCid} onChange={e=>setManCid(e.target.value)}/>
                <button className="btn btn-gold btn-full" onClick={doUpload} style={{marginTop:12}}>Use This CID</button>
              </div>
            )}

            <StatusMsg type={upSt} msg={upMsg}/>

            {cid && (
              <div className="apppage-result">
                <div className="apppage-result__hdr">IPFS Result</div>
                <CopyField label="Content ID (CID)" value={cid}/>
                <div className="apppage-result__actions">
                  <a className="btn btn-ghost btn-sm" href={`https://gateway.pinata.cloud/ipfs/${cid}`} target="_blank" rel="noreferrer" style={{textDecoration:"none"}}>View on IPFS ↗</a>
                  <button className="btn btn-gold btn-sm" onClick={()=>{setSCid(cid);setTab("submit");}}>Continue → Submit</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Submit ── */}
        {tab==="submit" && (
          <div className="apppage-panel apppage-panel--navy">
            <h2 className="apppage-panel__title">Submit CID to Blockchain</h2>
            <p className="apppage-panel__desc">Your wallet signs a transaction permanently recording the CID, your address, and an immutable network timestamp. The contract rejects any duplicate — your precedence is locked in forever.</p>

            <div className="apppage-field"><label className="apppage-wallet__label">Contract Address</label>
              <input className="apppage-input" placeholder="0x…" value={sAddr} onChange={e=>setSAddr(e.target.value)}/></div>
            <div className="apppage-field"><label className="apppage-wallet__label">IPFS CID</label>
              <input className="apppage-input" placeholder="bafybei…" value={sCid} onChange={e=>setSCid(e.target.value)}/></div>

            <button className="btn btn-gold btn-full" onClick={doSubmit} disabled={sSt==="loading"}>
              {sSt==="loading" ? <><Spin/><span>Submitting…</span></> : <span>Submit to Blockchain</span>}
            </button>
            <StatusMsg type={sSt} msg={sMsg}/>

            {sSt==="success" && txHash && (
              <div className="apppage-cert">
                <div className="apppage-cert__seal">🔒</div>
                <div className="apppage-cert__title">Precedence Established</div>
                <p className="apppage-cert__sub">Permanently registered on-chain. No earlier submission can ever exist for this CID.</p>
                <div className="apppage-cert__grid">
                  <div className="apppage-cert__item"><div className="apppage-cert__item-l">Transaction Hash</div><div className="apppage-cert__item-v">{txHash.slice(0,26)}…</div></div>
                  {sTs&&<div className="apppage-cert__item"><div className="apppage-cert__item-l">Block Timestamp</div><div className="apppage-cert__item-v">{new Date(sTs*1000).toUTCString()}</div></div>}
                  <div className="apppage-cert__item"><div className="apppage-cert__item-l">IPFS CID</div><div className="apppage-cert__item-v">{sCid.slice(0,28)}…</div></div>
                  <div className="apppage-cert__item"><div className="apppage-cert__item-l">Author Wallet</div><div className="apppage-cert__item-v">{wallet.slice(0,26)}…</div></div>
                </div>
                <button className="btn btn-ghost btn-sm" style={{marginTop:20}} onClick={()=>{setVCid(sCid);setTab("verify");}}>Verify This Paper →</button>
              </div>
            )}
          </div>
        )}

        {/* ── Verify ── */}
        {tab==="verify" && (
          <div className="apppage-panel apppage-panel--navy">
            <h2 className="apppage-panel__title">Verify Proof of Precedence</h2>
            <p className="apppage-panel__desc">Query the blockchain with any CID. Read-only — no wallet, no gas, no cost. Anyone can verify.</p>

            <div className="apppage-field"><label className="apppage-wallet__label">Contract Address</label>
              <input className="apppage-input" placeholder="0x…" value={vAddr} onChange={e=>setVAddr(e.target.value)}/></div>
            <div className="apppage-field"><label className="apppage-wallet__label">IPFS CID to Verify</label>
              <input className="apppage-input" placeholder="bafybei…" value={vCid} onChange={e=>setVCid(e.target.value)}/></div>

            <button className="btn btn-gold btn-full" onClick={doVerify} disabled={vSt==="loading"}>
              {vSt==="loading"?<><Spin/><span>Querying…</span></>:"Verify on Blockchain"}
            </button>

            {vRes?.error && <StatusMsg type="error" msg={vRes.error}/>}

            {vRes?.exists===false && (
              <div className="apppage-cert apppage-cert--denied">
                <div className="apppage-cert__seal">✕</div>
                <div className="apppage-cert__title" style={{color:"#c0392b"}}>Not Registered</div>
                <p className="apppage-cert__sub">This CID has no on-chain record in this registry contract.</p>
              </div>
            )}

            {vRes?.exists===true && (
              <div className="apppage-cert">
                <div className="apppage-cert__seal">✅</div>
                <div className="apppage-cert__title">Proof Confirmed</div>
                <p className="apppage-cert__sub">Immutable record verified on-chain. Authorship and timestamp cannot be altered.</p>
                <div className="apppage-cert__grid">
                  <div className="apppage-cert__item"><div className="apppage-cert__item-l">Author Wallet</div><div className="apppage-cert__item-v">{vRes.author}</div></div>
                  <div className="apppage-cert__item"><div className="apppage-cert__item-l">Registered At</div><div className="apppage-cert__item-v">{new Date(vRes.timestamp*1000).toUTCString()}</div></div>
                  <div className="apppage-cert__item"><div className="apppage-cert__item-l">IPFS CID</div><div className="apppage-cert__item-v">{vRes.cid}</div></div>
                  <div className="apppage-cert__item"><div className="apppage-cert__item-l">Total Papers</div><div className="apppage-cert__item-v">{vRes.total}</div></div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}