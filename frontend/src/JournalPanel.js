import React, { useState, useEffect, useRef } from "react";
import { ethers } from "ethers";
import { useParallax } from "./useScrollAnimation";
import "./JournalPanel.css";

// ────────────────────────────────────────────────────────────────────────────
// ABIs (minimal — only the functions this panel needs)
// ────────────────────────────────────────────────────────────────────────────

const REGISTRY_JOURNAL_ABI = [
  "function createJournal(string calldata _name, uint256 _submissionFee) external",
  "function submitToJournal(string calldata _ipfsCID, uint256 _journalId) external payable",
  "function journals(uint256) external view returns (string memory name, address editor, uint256 submissionFee)",
  "function journalCount() external view returns (uint256)",
  "function paperExists(string calldata _ipfsCID) external view returns (bool)",
];

const REVIEW_MANAGER_ABI = [
  "function registerReviewer() external",
  "function submitReview(string calldata _ipfsHash, uint8 _score, string calldata _comments) external",
  "function isReviewer(address) external view returns (bool)",
  "function hasReviewed(string calldata, address) external view returns (bool)",
  "function reviewCount(string calldata _ipfsHash) external view returns (uint256)",
  "function getReview(string calldata _ipfsHash, uint256 _index) external view returns (address reviewer, uint8 score, string memory comments)",
];

const REWARD_SYSTEM_ABI = [
  "function rewarded(string, address) view returns (bool)",
  "function reputation(address) view returns (uint256)",
];

const RPC_URL              = process.env.REACT_APP_RPC_URL              || "http://127.0.0.1:8545";
const REGISTRY_ADDRESS     = process.env.REACT_APP_CONTRACT_ADDRESS     || "";
const REVIEW_MANAGER_ADDR  = process.env.REACT_APP_REVIEW_MANAGER_ADDRESS || "";
const REWARD_SYSTEM_ADDR   = process.env.REACT_APP_REWARD_CONTRACT_ADDRESS || "";
const REWARD_SYSTEM_ADDR_ALT = process.env.REACT_APP_REWARD_SYSTEM_ADDRESS || "";
const HARDHAT_LOCAL_REWARD_ADDR = "0x9fE46736679d2d9a65F0992F2272dE9f3c7fa6e0";
const DEFAULT_KEY          = process.env.REACT_APP_PRIVATE_KEY          || "";

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

async function getSigner(wallet) {
  const injectedProvider = wallet?.provider || (typeof window !== "undefined" ? window.ethereum : null);
  if (injectedProvider) {
    const browserProvider = new ethers.BrowserProvider(injectedProvider);
    return browserProvider.getSigner();
  }

  if (!DEFAULT_KEY) {
    throw new Error("No wallet provider found. Connect MetaMask or set REACT_APP_PRIVATE_KEY.");
  }

  return new ethers.Wallet(DEFAULT_KEY, new ethers.JsonRpcProvider(RPC_URL));
}

async function resolveRewardContractAddress(wallet) {
  const explicitConfiguredAddress = (REWARD_SYSTEM_ADDR || "").trim();
  if (ethers.isAddress(explicitConfiguredAddress)) {
    return explicitConfiguredAddress;
  }

  const fallbackConfiguredAddress = (REWARD_SYSTEM_ADDR_ALT || "").trim();
  const candidates = [fallbackConfiguredAddress, HARDHAT_LOCAL_REWARD_ADDR];

  const providers = [
    wallet?.provider ? new ethers.BrowserProvider(wallet.provider) : null,
    typeof window !== "undefined" && window.ethereum ? new ethers.BrowserProvider(window.ethereum) : null,
    new ethers.JsonRpcProvider(RPC_URL),
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (!ethers.isAddress(candidate)) continue;

    for (const provider of providers) {
      try {
        const code = await provider.getCode(candidate);
        if (code && code !== "0x") return candidate;
      } catch {
        // continue checking on other available providers
      }
    }
  }

  throw new Error(
    "Reward contract not found on the connected network. Deploy contracts (scripts/deploy.js), set REACT_APP_REWARD_CONTRACT_ADDRESS in frontend/.env, restart the frontend, and ensure your wallet is on the same network."
  );
}

function normalizeCid(cid) {
  return (cid || "").trim().replace(/^ipfs:\/\//i, "");
}

function isContractMissingError(err) {
  const msg = (err?.reason || err?.message || "").toLowerCase();
  return msg.includes("reward contract not found");
}

function saveDummyRewardRecord(record) {
  try {
    const key = "dummyRewardRecords";
    const prev = JSON.parse(localStorage.getItem(key) || "[]");
    const next = [record, ...prev].slice(0, 100);
    localStorage.setItem(key, JSON.stringify(next));
  } catch {
    // non-blocking in demo mode
  }
}

function Spin() { return <span className="jp-spin" />; }

function StatusMsg({ type, msg }) {
  if (!msg) return null;
  const cls = { success: "jp-status--ok", error: "jp-status--err", loading: "jp-status--ld" };
  return (
    <div className={`jp-status ${cls[type] || ""}`}>
      {type === "loading" ? <Spin /> : <span className="jp-status__icon">{type === "success" ? "✓" : "✕"}</span>}
      <span className="jp-status__text">{msg}</span>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="jp-field">
      <label className="jp-label">{label}</label>
      {children}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Sub-panels
// ────────────────────────────────────────────────────────────────────────────

function CreateJournalPanel({ wallet }) {
  const [name, setName]   = useState("");
  const [fee, setFee]     = useState("0");
  const [st, setSt]       = useState("idle");
  const [msg, setMsg]     = useState("");
  const [journalId, setJournalId] = useState(null);

  const doCreate = async () => {
    if (!wallet)         { setMsg("Connect wallet first."); setSt("error"); return; }
    if (!name.trim())    { setMsg("Enter a journal name."); setSt("error"); return; }
    setSt("loading"); setMsg("Creating journal…");
    try {
      const signer = await getSigner(wallet);
      const reg = new ethers.Contract(REGISTRY_ADDRESS, REGISTRY_JOURNAL_ABI, signer);
      const feeWei = ethers.parseEther(fee || "0");
      const tx = await reg.createJournal(name.trim(), feeWei);
      setMsg("Awaiting confirmation…");
      const receipt = await tx.wait(1);

      // Parse JournalCreated event to get the new ID
      const iface = new ethers.Interface(REGISTRY_JOURNAL_ABI);
      let newId = null;
      for (const log of receipt.logs) {
        try {
          const parsed = iface.parseLog(log);
          if (parsed && parsed.name === "JournalCreated") {
            newId = parsed.args.journalId.toString();
          }
        } catch { /* skip */ }
      }
      setJournalId(newId);
      setSt("success");
      setMsg(`Journal created! Block #${receipt.blockNumber}`);
    } catch (err) {
      setSt("error"); setMsg(err?.reason || err?.message || "Failed.");
    }
  };

  return (
    <div className="jp-subpanel">
      <div className="jp-subpanel__img-wrap">
        <img src="https://images.unsplash.com/photo-1516979187457-637abb4f9353?w=1200&q=80" alt="Journal" className="jp-subpanel__img" />
        <div className="jp-subpanel__img-ov" />
        <div className="jp-subpanel__icon">📰</div>
      </div>
      <h3 className="jp-subpanel__title">Create Journal</h3>
      <p className="jp-subpanel__desc">Register a new academic journal on-chain. You become the editor.</p>

      <Field label="Journal Name">
        <input className="jp-input" placeholder="e.g. Journal of Distributed Systems" value={name} onChange={e => setName(e.target.value)} />
      </Field>
      <Field label="Submission Fee (ETH)">
        <input className="jp-input" type="number" min="0" step="0.001" placeholder="0.01" value={fee} onChange={e => setFee(e.target.value)} />
      </Field>

      <button className="jp-btn jp-btn--gold" onClick={doCreate} disabled={st === "loading"}>
        {st === "loading" ? <><Spin /><span>Creating…</span></> : "Create Journal"}
      </button>

      <StatusMsg type={st} msg={msg} />

      {st === "success" && journalId && (
        <div className="jp-cert">
          <div className="jp-cert__seal">📰</div>
          <div className="jp-cert__title">Journal #{journalId} Created</div>
          <p className="jp-cert__sub">Editors can now receive submissions.</p>
        </div>
      )}
    </div>
  );
}

function SubmitToJournalPanel({ wallet, currentCid }) {
  const [journals, setJournals]   = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [journalId, setJournalId] = useState("");
  const [st, setSt]               = useState("idle");
  const [msg, setMsg]             = useState("");
  const [txHash, setTxHash]       = useState("");

  // Load available journals
  useEffect(() => {
    async function loadJournals() {
      try {
        setIsLoading(true);
        const reg = new ethers.Contract(REGISTRY_ADDRESS, REGISTRY_JOURNAL_ABI, new ethers.JsonRpcProvider(RPC_URL));
        const count = await reg.journalCount();
        const loaded = [];
        for (let i = 1; i <= Number(count); i++) {
          const j = await reg.journals(i);
          loaded.push({ id: i, name: j.name, feeWei: j.submissionFee });
        }
        setJournals(loaded);
        if (loaded.length > 0) setJournalId(loaded[0].id.toString());
      } catch (e) {
        console.error("Load journals failed", e);
      } finally {
        setIsLoading(false);
      }
    }
    loadJournals();
  }, []);

  const doSubmit = async () => {
    if (!wallet)                   { setMsg("Connect wallet first.");    setSt("error"); return; }
    if (!journalId)                { setMsg("Select a journal.");        setSt("error"); return; }
    if (!currentCid)               { setMsg("Please upload, register, or verify a paper first."); setSt("error"); return; }
    setSt("loading"); setMsg("Checking journal…"); setTxHash("");
    try {
      const signer = await getSigner(wallet);
      const reg = new ethers.Contract(REGISTRY_ADDRESS, REGISTRY_JOURNAL_ABI, signer);

      // Auto-detect fee
      const journalItem = journals.find(j => j.id.toString() === journalId.toString());
      const feeWei = journalItem ? journalItem.feeWei : 0n;
      setMsg(`Fee: ${ethers.formatEther(feeWei)} ETH. Sending…`);

      setMsg("Sending transaction…");
      const tx = await reg.submitToJournal(currentCid, journalId, { value: feeWei });
      setTxHash(tx.hash); setMsg("Awaiting confirmation…");
      const receipt = await tx.wait(1);
      setSt("success"); setMsg(`Confirmed · Block #${receipt.blockNumber}`);
    } catch (err) {
      setSt("error"); setMsg(err?.reason || err?.message || "Failed.");
    }
  };

  return (
    <div className="jp-subpanel">
      <div className="jp-subpanel__img-wrap">
        <img src="https://images.unsplash.com/photo-1639322537228-f710d846310a?w=1200&q=80" alt="Submit" className="jp-subpanel__img" />
        <div className="jp-subpanel__img-ov" />
        <div className="jp-subpanel__icon">⛓</div>
      </div>
      <h3 className="jp-subpanel__title">Submit to Journal</h3>
      <p className="jp-subpanel__desc">Submit the currently active paper to a journal.</p>

      {currentCid ? (
        <div className="jp-active-paper">
          <span className="jp-active-paper__lbl">Active Paper CID:</span>
          <span className="jp-active-paper__val">{currentCid.slice(0, 10)}…{currentCid.slice(-6)}</span>
        </div>
      ) : (
        <div className="jp-status" style={{ background: 'rgba(255,255,255,0.05)', color: '#8890b0', border: '1px solid rgba(255,255,255,0.1)' }}>
          <span>ℹ</span> No active paper. Upload, register, or verify a paper above first.
        </div>
      )}

      <Field label="Select Journal">
        {isLoading ? (
          <div className="jp-input" style={{ opacity: 0.5, pointerEvents: "none" }}>Loading journals...</div>
        ) : journals.length > 0 ? (
          <select className="jp-input jp-select" value={journalId} onChange={e => setJournalId(e.target.value)}>
            {journals.map(j => (
              <option key={j.id} value={j.id}>
                #{j.id} - {j.name} (Fee: {ethers.formatEther(j.feeWei)} ETH)
              </option>
            ))}
          </select>
        ) : (
          <div className="jp-input" style={{ opacity: 0.5, pointerEvents: "none" }}>No journals found. Create one first.</div>
        )}
      </Field>

      <button className="jp-btn jp-btn--gold" onClick={doSubmit} disabled={st === "loading" || !currentCid || journals.length === 0}>
        {st === "loading" ? <><Spin /><span>Submitting…</span></> : "Submit to Journal"}
      </button>

      <StatusMsg type={st} msg={msg} />

      {st === "success" && txHash && (
        <div className="jp-cert">
          <div className="jp-cert__seal">🔒</div>
          <div className="jp-cert__title">Submitted to Journal #{journalId}</div>
          <div className="jp-cert__row"><span className="jp-cert__lbl">Tx Hash</span><span className="jp-cert__val">{txHash.slice(0,26)}…</span></div>
        </div>
      )}
    </div>
  );
}

function ReviewPanel({ wallet, currentCid }) {
  const [rCid, setRCid]           = useState(currentCid || "");
  const [rScore, setRScore]       = useState("5");
  const [rComments, setRComments] = useState("");
  const [rvSt, setRvSt]           = useState("idle");
  const [rvMsg, setRvMsg]         = useState("");
  const [rvTx, setRvTx]           = useState("");
  const [regSt, setRegSt]         = useState("idle");
  const [regMsg, setRegMsg]       = useState("");
  const [rewardMsg, setRewardMsg] = useState("");

  useEffect(() => {
    setRCid(currentCid || "");
  }, [currentCid]);

  const normalizedCid = normalizeCid(rCid);
  const reviewFileUrl = normalizedCid ? `https://ipfs.io/ipfs/${normalizedCid}` : "";

  const doRegisterReviewer = async () => {
    if (!wallet) { setRegSt("error"); setRegMsg("Connect wallet first."); return; }
    setRegSt("loading");
    setRegMsg("Registering reviewer…");
    try {
      const signer = await getSigner(wallet);
      const rm = new ethers.Contract(REVIEW_MANAGER_ADDR, REVIEW_MANAGER_ABI, signer);
      if (await rm.isReviewer(wallet)) {
        setRegSt("success");
        setRegMsg("Reviewer already registered.");
        return;
      }
      const tx = await rm.registerReviewer();
      await tx.wait(1);
      setRegSt("success");
      setRegMsg("Reviewer registration successful.");
    } catch (err) {
      setRegSt("error");
      setRegMsg(err?.reason || err?.message || "Failed.");
    }
  };

  const doReview = async () => {
    if (!wallet)          { setRvMsg("Connect wallet first."); setRvSt("error"); return; }
    if (!rCid.trim())     { setRvMsg("Enter a paper CID."); setRvSt("error"); return; }
    
    const score = Number(rScore);
    if (!score || score < 1 || score > 5) { setRvMsg("Score must be 1–5."); setRvSt("error"); return; }
    
    setRvSt("loading"); setRvMsg("Verifying setup…"); setRvTx("");
    try {
      const signer = await getSigner(wallet);
      const rm = new ethers.Contract(REVIEW_MANAGER_ADDR, REVIEW_MANAGER_ABI, signer);

      // Auto-register if not reviewer
      if (!(await rm.isReviewer(wallet))) {
        setRvMsg("Auto-registering you as a reviewer…");
        const regTx = await rm.registerReviewer();
        await regTx.wait(1);
      }

      if (await rm.hasReviewed(normalizedCid, wallet)) {
        setRvSt("error"); setRvMsg("You have already reviewed this paper."); return;
      }

      setRvMsg("Submitting review…");
      const tx = await rm.submitReview(normalizedCid, score, rComments.trim());
      setRvTx(tx.hash); setRvMsg("Awaiting confirmation…");
      const receipt = await tx.wait(1);
      setRvSt("success"); setRvMsg(`Review submitted · Block #${receipt.blockNumber}`);

      if (REWARD_SYSTEM_ADDR) {
        const reward = new ethers.Contract(REWARD_SYSTEM_ADDR, REWARD_SYSTEM_ABI, new ethers.JsonRpcProvider(RPC_URL));
        const wasRewarded = await reward.rewarded(normalizedCid, wallet);
        const rep = await reward.reputation(wallet);
        setRewardMsg(wasRewarded || Number(rep) > 0 ? "You have been rewarded" : "No reward yet.");
      }
    } catch (err) {
      setRvSt("error"); setRvMsg(err?.reason || err?.message || "Failed.");
    }
  };

  return (
    <div className="jp-subpanel">
      <div className="jp-subpanel__img-wrap">
        <img src="https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&q=80" alt="Review" className="jp-subpanel__img" />
        <div className="jp-subpanel__img-ov" />
        <div className="jp-subpanel__icon">🧪</div>
      </div>
      <h3 className="jp-subpanel__title">Peer Review</h3>
      <p className="jp-subpanel__desc">Review the currently active paper. We handle the reviewer registration automatically behind the scenes.</p>

      <Field label="Paper CID">
        <input className="jp-input" placeholder="bafybe..." value={rCid} onChange={e => setRCid(e.target.value)} />
      </Field>

      {reviewFileUrl && (
        <>
          <a
            className="jp-btn"
            href={reviewFileUrl}
            target="_blank"
            rel="noreferrer"
            style={{ textAlign: "center", textDecoration: "none" }}
          >
            View Paper File
          </a>
          <div className="jp-active-paper" style={{ marginTop: 12 }}>
            <span className="jp-active-paper__lbl">Preview:</span>
            <a href={reviewFileUrl} target="_blank" rel="noreferrer" className="jp-active-paper__val">
              {normalizedCid.slice(0, 14)}…{normalizedCid.slice(-8)}
            </a>
          </div>
        </>
      )}

      <button className="jp-btn jp-btn--gold" onClick={doRegisterReviewer} disabled={regSt === "loading"}>
        {regSt === "loading" ? <><Spin /><span>Registering…</span></> : "Register as Reviewer"}
      </button>
      <StatusMsg type={regSt} msg={regMsg} />

      <Field label="Score (1 = Poor · 5 = Excellent)">
        <select className="jp-input jp-select" value={rScore} onChange={e => setRScore(e.target.value)}>
          {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} — {["Poor","Fair","Good","Very Good","Excellent"][n-1]}</option>)}
        </select>
      </Field>
      <Field label="Comments">
        <textarea className="jp-input jp-textarea" placeholder="Your review comments…" value={rComments} onChange={e => setRComments(e.target.value)} rows={4} />
      </Field>

      <button className="jp-btn jp-btn--gold" onClick={doReview} disabled={rvSt === "loading" || !rCid.trim()}>
        {rvSt === "loading" ? <><Spin /><span>Submitting…</span></> : "Submit Review"}
      </button>

      <StatusMsg type={rvSt} msg={rvMsg} />
      {rewardMsg && <div className="jp-status jp-status--ok"><span className="jp-status__icon">✓</span><span className="jp-status__text">{rewardMsg}</span></div>}

      {rvSt === "success" && rvTx && (
        <div className="jp-cert">
          <div className="jp-cert__seal">✅</div>
          <div className="jp-cert__title">Review Recorded On-Chain</div>
          <div className="jp-cert__row"><span className="jp-cert__lbl">Tx</span><span className="jp-cert__val">{rvTx.slice(0,26)}…</span></div>
          <div className="jp-cert__row"><span className="jp-cert__lbl">Score</span><span className="jp-cert__val">{rScore}/5</span></div>
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Main export
// ────────────────────────────────────────────────────────────────────────────

function RewardPanel({ wallet, currentCid }) {
  const [paperName, setPaperName] = useState("");
  const [reviewerName, setReviewerName] = useState("");
  const [rewardAmount, setRewardAmount] = useState("");
  const [reviewers, setReviewers] = useState([]);
  const [reviewersSt, setReviewersSt] = useState("idle");
  const [st, setSt] = useState("idle");
  const [msg, setMsg] = useState("");
  const [txHash, setTxHash] = useState("");
  const [demoProof, setDemoProof] = useState("");

  const [confetti, setConfetti] = useState(false);

  const normalizedCurrentCid = normalizeCid(currentCid);

  useEffect(() => {
    const loadReviewers = async () => {
      if (!normalizedCurrentCid || !REVIEW_MANAGER_ADDR) {
        setReviewers([]);
        setReviewersSt("idle");
        return;
      }
      setReviewersSt("loading");
      try {
        const rm = new ethers.Contract(REVIEW_MANAGER_ADDR, REVIEW_MANAGER_ABI, new ethers.JsonRpcProvider(RPC_URL));
        const count = Number(await rm.reviewCount(normalizedCurrentCid));
        const loaded = [];
        for (let i = 0; i < count; i++) {
          const [reviewerAddr, score, comments] = await rm.getReview(normalizedCurrentCid, i);
          loaded.push({
            label: `Reviewer ${i + 1}`,
            address: reviewerAddr,
            addressShort: `${reviewerAddr.slice(0, 6)}…${reviewerAddr.slice(-4)}`,
            score: Number(score),
            comments: comments || "",
          });
        }
        setReviewers(loaded);
        setReviewersSt("success");
      } catch {
        setReviewers([]);
        setReviewersSt("error");
      }
    };

    loadReviewers();
  }, [normalizedCurrentCid]);

  const normalizedReviewerName = reviewerName.trim().toLowerCase();
  const selectedReviewer = reviewers.find(item => {
    const labelMatch = item.label.toLowerCase() === normalizedReviewerName;
    const shortMatch = item.addressShort.toLowerCase() === normalizedReviewerName;
    const fullMatch = item.address.toLowerCase() === normalizedReviewerName;
    return labelMatch || shortMatch || fullMatch;
  });

  useEffect(() => {
    if (!selectedReviewer || !normalizedCurrentCid || paperName.trim()) return;
    setPaperName(`CID: ${normalizedCurrentCid}`);
  }, [selectedReviewer, normalizedCurrentCid, paperName]);

  const handleReward = async () => {
    if (!wallet)          { setMsg("Connect wallet first."); setSt("error"); return; }
    if (!normalizedCurrentCid) { setMsg("No active paper found. Submit/select a paper first."); setSt("error"); return; }
    if (!reviewerName.trim()) { setMsg("Enter a reviewer name."); setSt("error"); return; }
    if (!selectedReviewer) { setMsg("Reviewer not found for the active paper. Use the suggested reviewer name."); setSt("error"); return; }
    if (!rewardAmount || Number(rewardAmount) <= 0) { setMsg("Enter a valid reward amount."); setSt("error"); return; }

    setSt("loading"); setMsg("Processing reward..."); setTxHash(""); setDemoProof(""); setConfetti(false);
    try {
      const signer = await getSigner(wallet);
      let rewardAddress = "";
      try {
        rewardAddress = await resolveRewardContractAddress(wallet);
      } catch (resolutionErr) {
        if (!isContractMissingError(resolutionErr)) throw resolutionErr;

        const dummyId = `DUMMY-${Date.now().toString(36).toUpperCase()}`;
        saveDummyRewardRecord({
          id: dummyId,
          cid: normalizedCurrentCid,
          paperName: paperName.trim() || `CID: ${normalizedCurrentCid}`,
          reviewer: selectedReviewer.address,
          reviewerLabel: selectedReviewer.label,
          amount: rewardAmount,
          createdAt: new Date().toISOString(),
        });
        setDemoProof(dummyId);
        setSt("success");
        setConfetti(true);
        setMsg("Reward recorded in demo mode (no real coins used). Contract deployment is optional for this college project.");
        return;
      }
      const rewardABI = ["function rewardReviewer(string ipfsHash, address reviewer) payable"];
      const rewardContract = new ethers.Contract(rewardAddress, rewardABI, signer);
      const value = ethers.parseEther(rewardAmount);

      setMsg("Authorizing value transfer…");
      const tx = await rewardContract.rewardReviewer(normalizedCurrentCid, selectedReviewer.address, { value });
      setTxHash(tx.hash);
      setMsg("Confirming on-chain…");
      
      const receipt = await tx.wait(1);
      setSt("success");
      setConfetti(true);
      setMsg(`Reward successfully dispersed · Block #${receipt.blockNumber}`);
    } catch (err) {
      setSt("error"); setMsg(err?.reason || err?.message || "Failed.");
    }
  };

  return (
    <div className={`jp-subpanel jp-subpanel--reward ${confetti ? 'jp-reward-success' : ''}`}>
      <div className="jp-subpanel__img-wrap">
        <img src="https://images.unsplash.com/photo-1639762681057-408e52192e55?w=1200&q=80" alt="Reward" className="jp-subpanel__img jp-subpanel__img--gold" />
        <div className="jp-subpanel__img-ov jp-subpanel__img-ov--gold" />
        <div className="jp-subpanel__icon jp-subpanel__icon--reward">🏆</div>
        {confetti && <div className="jp-reward-confetti">✨ GOLD DISPERSED ✨</div>}
      </div>
      
      <div className="jp-reward-body">
        <h3 className="jp-subpanel__title gold-text">Disperse Reward</h3>
        <p className="jp-subpanel__desc">Recognize exceptional contributions. This panel supports both on-chain rewards and dummy demo rewards (no real coins needed).</p>

        <div className="jp-reward-grid">
          <Field label="Paper Name">
            <input className="jp-input jp-input--gold" placeholder="e.g. Quantum Vision Study" value={paperName} onChange={e => setPaperName(e.target.value)} />
          </Field>
          <Field label="Reviewer Name">
            <input className="jp-input jp-input--gold" placeholder="e.g. Reviewer 1" value={reviewerName} onChange={e => setReviewerName(e.target.value)} list="jp-reviewer-suggestions" />
            <datalist id="jp-reviewer-suggestions">
              {reviewers.map(r => (
                <option key={`${r.address}-${r.label}`} value={r.label}>{`${r.label} (${r.addressShort})`}</option>
              ))}
            </datalist>
          </Field>
        </div>

        <p className="jp-reward-note">
          {reviewersSt === "loading"
            ? "Loading reviewers from backend…"
            : reviewers.length > 0
              ? "CID and reviewer are auto-resolved from the active paper and selected reviewer."
              : "No reviewer found on-chain for the active paper yet."}
        </p>

        {selectedReviewer && (
          <div className="jp-review-insight">
            <div className="jp-review-insight__title">Review Details Before Reward</div>
            <div className="jp-review-insight__row">
              <span className="jp-review-insight__label">Paper</span>
              <span className="jp-review-insight__value">{paperName.trim() || "(enter paper name)"}</span>
            </div>
            <div className="jp-review-insight__row">
              <span className="jp-review-insight__label">CID</span>
              <span className="jp-review-insight__value jp-review-insight__mono">{normalizedCurrentCid}</span>
            </div>
            <div className="jp-review-insight__row">
              <span className="jp-review-insight__label">Reviewer</span>
              <span className="jp-review-insight__value">{selectedReviewer.label} ({selectedReviewer.addressShort})</span>
            </div>
            <div className="jp-review-insight__row">
              <span className="jp-review-insight__label">Score</span>
              <span className="jp-review-insight__value">{selectedReviewer.score}/5</span>
            </div>
            <div className="jp-review-insight__remarks">
              <span className="jp-review-insight__label">Remarks</span>
              <p className="jp-review-insight__comment">
                {selectedReviewer.comments?.trim() || "No remarks were submitted by this reviewer."}
              </p>
            </div>
          </div>
        )}
        
        <Field label="Reward Amount (Demo ETH)">
          <div className="jp-reward-amt-wrap">
            <input className="jp-input jp-input--gold jp-input--lg" type="number" min="0" step="0.01" placeholder="0.05" value={rewardAmount} onChange={e => setRewardAmount(e.target.value)} />
            <span className="jp-reward-unit">DEMO</span>
          </div>
        </Field>

        <button className="jp-btn jp-btn--gold jp-btn--reward" onClick={handleReward} disabled={st === "loading"}>
          {st === "loading" ? <><Spin /><span>Dispersing…</span></> : "Confirm Reward Dispersal"}
        </button>

        <StatusMsg type={st} msg={msg} />

        {st === "success" && (txHash || demoProof) && (
          <div className="jp-cert jp-cert--gold">
            <div className="jp-cert__shine" />
            <div className="jp-cert__seal">🏆</div>
            <div className="jp-cert__title">Excellence Certified</div>
            <p className="jp-cert__sub">Reward of {rewardAmount} {txHash ? "ETH" : "DEMO"} has been {txHash ? "permanently recorded on-chain" : "recorded in local demo mode"}.</p>
            <div className="jp-cert__row">
              <span className="jp-cert__lbl">Proof</span>
              <span className="jp-cert__val">{txHash ? `${txHash.slice(0,32)}…` : demoProof}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────

const SUBTABS = [
  { id: "create-journal",  icon: "📰", label: "Create Journal",    n: "04" },
  { id: "submit-journal",  icon: "⛓",  label: "Submit to Journal", n: "05" },
  { id: "review",          icon: "🧪", label: "Peer Review",       n: "06" },
  { id: "reward",          icon: "🏆", label: "Reward Reviewer",   n: "07" },
];

export default function JournalPanel({ wallet, currentCid, initialTab, role = "submitter" }) {
  const defaultTab = role === "admin" ? "create-journal" : role === "reviewer" ? "review" : (initialTab || "submit-journal");
  const [tab, setTab] = useState(defaultTab);
  const [headRef, headOff] = useParallax(0.1);
  const [walletDetailsOpen, setWalletDetailsOpen] = useState(false);
  const [walletDetailsLoading, setWalletDetailsLoading] = useState(false);
  const [walletDetailsError, setWalletDetailsError] = useState("");
  const [walletDetails, setWalletDetails] = useState(null);
  const walletShort = wallet ? `${wallet.slice(0, 6)}…${wallet.slice(-4)}` : "Not connected";
  const roleTabs = role === "admin"
    ? SUBTABS.filter(t => t.id === "create-journal" || t.id === "reward")
    : role === "reviewer"
      ? SUBTABS.filter(t => t.id === "review")
      : SUBTABS.filter(t => t.id === "submit-journal");

  const loadWalletDetails = async () => {
    if (!wallet) {
      setWalletDetails(null);
      setWalletDetailsError("Connect wallet to view details.");
      return;
    }

    try {
      setWalletDetailsLoading(true);
      setWalletDetailsError("");

      const injectedProvider = (typeof window !== "undefined" && window.ethereum) ? window.ethereum : null;
      const provider = injectedProvider ? new ethers.BrowserProvider(injectedProvider) : new ethers.JsonRpcProvider(RPC_URL);
      const [network, balance, txCount] = await Promise.all([
        provider.getNetwork(),
        provider.getBalance(wallet),
        provider.getTransactionCount(wallet),
      ]);

      setWalletDetails({
        address: wallet,
        balance: Number(ethers.formatEther(balance)).toFixed(4),
        network: network.name === "unknown" ? "Custom Network" : network.name,
        chainId: Number(network.chainId),
        txCount,
      });
    } catch (err) {
      setWalletDetails(null);
      setWalletDetailsError(err?.message || "Could not load wallet details.");
    } finally {
      setWalletDetailsLoading(false);
    }
  };

  useEffect(() => {
    setTab(defaultTab);
  }, [defaultTab]);

  useEffect(() => {
    if (!walletDetailsOpen) return;
    loadWalletDetails();
  }, [walletDetailsOpen, wallet]);

  return (
    <div className="jp__inner tech-grid-bg">
      <div className="jp__header" ref={headRef} style={{ transform: `translateY(${headOff}px)` }}>
        <div className="jp__header-eyebrow">Phase 2</div>
        <h2 className="jp__header-title">{role === "admin" ? "Admin" : role === "reviewer" ? "Reviewer" : "Submitter"} <em>Interface</em></h2>
        <p className="jp__header-sub">
          Create on-chain journals with submission fees, submit papers to specific
          journals, and record immutable peer reviews.
        </p>
        <div className={`jp__wallet-badge ${wallet ? "jp__wallet-badge--ok" : "jp__wallet-badge--warn"}`} title={wallet || "Wallet not connected"}>
          <span className="jp__wallet-dot" />
          <span className="jp__wallet-label">Wallet</span>
          <span className="jp__wallet-value">{walletShort}</span>
          <button
            type="button"
            className="jp__wallet-toggle"
            onClick={() => setWalletDetailsOpen(v => !v)}
          >
            {walletDetailsOpen ? "Hide" : "View"}
          </button>
        </div>

        {walletDetailsOpen && (
          <div className="jp__wallet-details">
            {walletDetailsLoading && <div className="jp__wallet-details-msg">Loading wallet details…</div>}
            {!walletDetailsLoading && walletDetailsError && <div className="jp__wallet-details-msg jp__wallet-details-msg--error">{walletDetailsError}</div>}
            {!walletDetailsLoading && !walletDetailsError && walletDetails && (
              <>
                <div className="jp__wallet-details-row">
                  <span className="jp__wallet-details-label">Address</span>
                  <span className="jp__wallet-details-value jp__wallet-details-value--mono">{walletDetails.address}</span>
                </div>
                <div className="jp__wallet-details-row">
                  <span className="jp__wallet-details-label">Balance</span>
                  <span className="jp__wallet-details-value">{walletDetails.balance} ETH</span>
                </div>
                <div className="jp__wallet-details-row">
                  <span className="jp__wallet-details-label">Network</span>
                  <span className="jp__wallet-details-value">{walletDetails.network} (Chain ID: {walletDetails.chainId})</span>
                </div>
                <div className="jp__wallet-details-row">
                  <span className="jp__wallet-details-label">Transactions</span>
                  <span className="jp__wallet-details-value">{walletDetails.txCount}</span>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Sub-tab bar */}
      <div className="jp__tabs" style={{ gridTemplateColumns: `repeat(${roleTabs.length}, 1fr)` }}>
        {roleTabs.map(({ id, icon, label, n }) => (
          <button
            key={id}
            className={`jp__tab ${tab === id ? "jp__tab--active" : ""}`}
            onClick={() => setTab(id)}
          >
            <span className="jp__tab-icon">{icon}</span>
            <span className="jp__tab-label">{label}</span>
            <span className="jp__tab-n">{n}</span>
          </button>
        ))}
        <div
          className="jp__tab-indicator"
          style={{ 
            width: `${100 / roleTabs.length}%`,
            left: `${Math.max(roleTabs.findIndex(t => t.id === tab), 0) * (100 / roleTabs.length)}%` 
          }}
        />
      </div>

      {/* Panels */}
      <div className="jp__content">
        <div key={tab} className="page-enter">
          {tab === "create-journal"  && <CreateJournalPanel    wallet={wallet} />}
          {tab === "submit-journal"  && <SubmitToJournalPanel  wallet={wallet} currentCid={currentCid} />}
          {tab === "review"          && <ReviewPanel           wallet={wallet} currentCid={currentCid} />}
          {tab === "reward"          && <RewardPanel           wallet={wallet} currentCid={currentCid} />}
        </div>
      </div>
    </div>
  );
}
