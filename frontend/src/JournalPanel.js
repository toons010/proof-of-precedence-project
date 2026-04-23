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

const RPC_URL              = process.env.REACT_APP_RPC_URL              || "http://127.0.0.1:8545";
const REGISTRY_ADDRESS     = process.env.REACT_APP_CONTRACT_ADDRESS     || "";
const REVIEW_MANAGER_ADDR  = process.env.REACT_APP_REVIEW_MANAGER_ADDRESS || "";
const DEFAULT_KEY          = process.env.REACT_APP_PRIVATE_KEY          || "";

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

function getSigner() {
  return new ethers.Wallet(DEFAULT_KEY, new ethers.JsonRpcProvider(RPC_URL));
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
      const reg = new ethers.Contract(REGISTRY_ADDRESS, REGISTRY_JOURNAL_ABI, getSigner());
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
      const reg = new ethers.Contract(REGISTRY_ADDRESS, REGISTRY_JOURNAL_ABI, getSigner());

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
  const [rScore, setRScore]       = useState("5");
  const [rComments, setRComments] = useState("");
  const [rvSt, setRvSt]           = useState("idle");
  const [rvMsg, setRvMsg]         = useState("");
  const [rvTx, setRvTx]           = useState("");

  const doReview = async () => {
    if (!wallet)          { setRvMsg("Connect wallet first."); setRvSt("error"); return; }
    if (!currentCid)      { setRvMsg("Please upload, register, or verify a paper first."); setRvSt("error"); return; }
    
    const score = Number(rScore);
    if (!score || score < 1 || score > 5) { setRvMsg("Score must be 1–5."); setRvSt("error"); return; }
    
    setRvSt("loading"); setRvMsg("Verifying setup…"); setRvTx("");
    try {
      const rm = new ethers.Contract(REVIEW_MANAGER_ADDR, REVIEW_MANAGER_ABI, getSigner());

      // Auto-register if not reviewer
      if (!(await rm.isReviewer(wallet))) {
        setRvMsg("Auto-registering you as a reviewer…");
        const regTx = await rm.registerReviewer();
        await regTx.wait(1);
      }

      if (await rm.hasReviewed(currentCid, wallet)) {
        setRvSt("error"); setRvMsg("You have already reviewed this paper."); return;
      }

      setRvMsg("Submitting review…");
      const tx = await rm.submitReview(currentCid, score, rComments.trim());
      setRvTx(tx.hash); setRvMsg("Awaiting confirmation…");
      const receipt = await tx.wait(1);
      setRvSt("success"); setRvMsg(`Review submitted · Block #${receipt.blockNumber}`);
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

      <Field label="Score (1 = Poor · 5 = Excellent)">
        <select className="jp-input jp-select" value={rScore} onChange={e => setRScore(e.target.value)}>
          {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} — {["Poor","Fair","Good","Very Good","Excellent"][n-1]}</option>)}
        </select>
      </Field>
      <Field label="Comments">
        <textarea className="jp-input jp-textarea" placeholder="Your review comments…" value={rComments} onChange={e => setRComments(e.target.value)} rows={4} />
      </Field>

      <button className="jp-btn jp-btn--gold" onClick={doReview} disabled={rvSt === "loading" || !currentCid}>
        {rvSt === "loading" ? <><Spin /><span>Submitting…</span></> : "Submit Review"}
      </button>

      <StatusMsg type={rvSt} msg={rvMsg} />

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

function RewardPanel({ wallet }) {
  const [rewardCID, setRewardCID] = useState("");
  const [rewardReviewer, setRewardReviewer] = useState("");
  const [rewardAmount, setRewardAmount] = useState("");
  const [st, setSt] = useState("idle");
  const [msg, setMsg] = useState("");
  const [txHash, setTxHash] = useState("");

  const [confetti, setConfetti] = useState(false);

  const handleReward = async () => {
    if (!wallet)          { setMsg("Connect wallet first."); setSt("error"); return; }
    if (!rewardCID.trim()) { setMsg("Enter a paper CID."); setSt("error"); return; }
    if (!rewardReviewer.trim()) { setMsg("Enter a reviewer address."); setSt("error"); return; }
    if (!rewardAmount || Number(rewardAmount) <= 0) { setMsg("Enter a valid reward amount."); setSt("error"); return; }

    setSt("loading"); setMsg("Processing transaction..."); setTxHash(""); setConfetti(false);
    try {
      const signer = getSigner();
      const rewardAddress = process.env.REACT_APP_REWARD_CONTRACT_ADDRESS;
      const rewardABI = ["function rewardReviewer(string ipfsHash, address reviewer) payable"];
      const rewardContract = new ethers.Contract(rewardAddress, rewardABI, signer);
      const value = ethers.parseEther(rewardAmount);

      setMsg("Authorizing value transfer…");
      const tx = await rewardContract.rewardReviewer(rewardCID, rewardReviewer, { value });
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
        <p className="jp-subpanel__desc">Recognize exceptional contributions by issuing an on-chain reward and a cryptographic certificate of excellence.</p>

        <div className="jp-reward-grid">
          <Field label="Paper CID">
            <input className="jp-input jp-input--gold" placeholder="bafybe..." value={rewardCID} onChange={e => setRewardCID(e.target.value)} />
          </Field>
          <Field label="Reviewer Address">
            <input className="jp-input jp-input--gold" placeholder="0x..." value={rewardReviewer} onChange={e => setRewardReviewer(e.target.value)} />
          </Field>
        </div>
        
        <Field label="Reward Amount (ETH)">
          <div className="jp-reward-amt-wrap">
            <input className="jp-input jp-input--gold jp-input--lg" type="number" min="0" step="0.01" placeholder="0.05" value={rewardAmount} onChange={e => setRewardAmount(e.target.value)} />
            <span className="jp-reward-unit">ETH</span>
          </div>
        </Field>

        <button className="jp-btn jp-btn--gold jp-btn--reward" onClick={handleReward} disabled={st === "loading"}>
          {st === "loading" ? <><Spin /><span>Dispersing…</span></> : "Confirm Reward Dispersal"}
        </button>

        <StatusMsg type={st} msg={msg} />

        {st === "success" && txHash && (
          <div className="jp-cert jp-cert--gold">
            <div className="jp-cert__shine" />
            <div className="jp-cert__seal">🏆</div>
            <div className="jp-cert__title">Excellence Certified</div>
            <p className="jp-cert__sub">Reward of {rewardAmount} ETH has been permanently recorded on-chain.</p>
            <div className="jp-cert__row">
              <span className="jp-cert__lbl">Proof</span>
              <span className="jp-cert__val">{txHash.slice(0,32)}…</span>
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

export default function JournalPanel({ wallet, currentCid, initialTab }) {
  const [tab, setTab] = useState(initialTab || "create-journal");
  const [headRef, headOff] = useParallax(0.1);

  return (
    <div className="jp__inner tech-grid-bg">
      <div className="jp__header" ref={headRef} style={{ transform: `translateY(${headOff}px)` }}>
        <div className="jp__header-eyebrow">Phase 2</div>
        <h2 className="jp__header-title">Journals &amp; <em>Peer Review</em></h2>
        <p className="jp__header-sub">
          Create on-chain journals with submission fees, submit papers to specific
          journals, and record immutable peer reviews.
        </p>
      </div>

      {/* Sub-tab bar */}
      <div className="jp__tabs" style={{ gridTemplateColumns: `repeat(${SUBTABS.length}, 1fr)` }}>
        {SUBTABS.map(({ id, icon, label, n }) => (
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
            width: `${100 / SUBTABS.length}%`, 
            left: `${SUBTABS.findIndex(t => t.id === tab) * (100 / SUBTABS.length)}%` 
          }}
        />
      </div>

      {/* Panels */}
      <div className="jp__content">
        <div key={tab} className="page-enter">
          {tab === "create-journal"  && <CreateJournalPanel    wallet={wallet} />}
          {tab === "submit-journal"  && <SubmitToJournalPanel  wallet={wallet} currentCid={currentCid} />}
          {tab === "review"          && <ReviewPanel           wallet={wallet} currentCid={currentCid} />}
          {tab === "reward"          && <RewardPanel           wallet={wallet} />}
        </div>
      </div>
    </div>
  );
}
