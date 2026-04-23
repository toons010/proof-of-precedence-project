import React, { useEffect, useRef, useState } from "react";
import { useScrollReveal, useParallax } from "./useScrollAnimation";
import "./HowItWorks.css";

const ss = (v, a, b) => Math.max(0, Math.min(1, (v - a) / (b - a)));

function useElP() {
  const ref = useRef(null);
  const [p, setP] = useState(0);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const fn = () => {
      const r = el.getBoundingClientRect();
      setP(Math.max(0, Math.min(1, (window.innerHeight - r.top) / (window.innerHeight + r.height))));
    };
    fn();
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);
  return [ref, p];
}

function prog(p, eA, eB, xA, xB) {
  return Math.max(0, ss(p, eA, eB) - ss(p, xA, xB));
}

const STEPS = [
  { num:"01", tag:"Step One",   title:"Upload to IPFS",    headline:"CONTENT-ADDRESSED",
    desc:"Your PDF is uploaded to IPFS via Pinata. IPFS runs your file through SHA-256 and returns a Content Identifier — a cryptographic fingerprint of every byte. Any modification produces a completely different CID.",
    details:["SHA-256 hashing of every file byte","Pinata pinning ensures global availability","Even 1 byte change = completely different CID","CID is mathematically unforgeable"],
    code:"const cid = await uploadToPinata(file);\n// → bafybeigdyrzt5sfp7...",
    img:"https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1400&q=80", accent:"#b8922a" },
  { num:"02", tag:"Step Two",   title:"Register On-Chain", headline:"IMMUTABLE",
    desc:"Your CID, wallet address, and a network-consensus timestamp are written into the PaperRegistry contract on Polygon. The contract permanently rejects any future attempt to register the same CID.",
    details:["msg.sender cryptographically verifies identity","block.timestamp set by Polygon consensus","Duplicate CIDs rejected at EVM level","No admin, no backdoor — code is the only law"],
    code:"await registry.submitPaper(cid);\n// Confirmed · Block #1,284,920",
    img:"https://images.unsplash.com/photo-1639322537228-f710d846310a?w=1400&q=80", accent:"#3d7fff" },
  { num:"03", tag:"Step Three", title:"Verify Anywhere",   headline:"TRUSTLESS",
    desc:"Anyone can call getPaper() with a CID. The blockchain returns the author address, timestamp, and precedence status — instantly, permissionlessly, without any trusted third party.",
    details:["Read-only view function — zero gas cost","No wallet or account required to verify","Returns author, timestamp, existence status","Valid as long as Polygon blockchain exists"],
    code:"const [cid, author, ts, exists]\n  = await registry.getPaper(cid);",
    img:"https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1400&q=80", accent:"#1a6b5a" },
  { num:"04", tag:"Step Four", title:"Journals & Peer Review", headline:"DECENTRALISED",
    desc:"Submit your registered paper to an on-chain academic journal. Reviewers cryptographically sign their peer reviews with a score and comments, permanently attached to your paper's CID.",
    details:["Create journals and set submission fees","Submit papers directly to journal contracts","Reviewers sign evaluations permanently on-chain","Entire peer review history is immutable and public"],
    code:"await reviewMgr.submitReview(cid, 5, 'Great');",
    img:"https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1400&q=80", accent:"#c9a84c" },
];

function Step({ step, i }) {
  const [ref, p] = useElP();
  const even = i % 2 === 1;

  // pr: the retrace driver — direct, zero dead zone
  const pr = prog(p, 0.06, 0.40, 0.50, 0.86);

  // Image: massive zoom retrace (1.06→1.46) + brightness retrace
  const imgScale = 1.06 + (1 - pr) * 0.40;
  const imgBright = 0.30 + pr * 0.42;

  // Entry-only stagger for text lines (one-way ss on p directly)
  // Parent column handles ALL retrace via translateX + opacity
  const tagE   = ss(p, 0.08, 0.28);
  const titleE = ss(p, 0.12, 0.34);
  const descE  = ss(p, 0.18, 0.40);
  const listE  = ss(p, 0.24, 0.46);

  return (
    <div className={`hiw-step ${even?"hiw-step--flip":""}`} ref={ref}>

      {/* IMAGE SIDE — scale and brightness retrace clearly with pr */}
      <div className="hiw-step__img-col">
        <img src={step.img} alt={step.title} className="hiw-step__img" loading="lazy"
          style={{
            transform: `translateY(${(p-0.5)*-100}px) scale(${imgScale})`,
            filter: `brightness(${imgBright}) saturate(${0.45+pr*0.50})`,
          }} />
        <div className="hiw-step__img-ov" />
        <div className="hiw-step__img-num"
          style={{ opacity: pr*1.5, transform:`translateY(${(1-pr)*-40}px)` }}>
          {step.num}
        </div>
        <div className="hiw-step__img-bleed"
          style={{ color:`${step.accent}1e`, transform:`translateY(${(p-0.5)*70}px)` }}>
          {step.headline}
        </div>
        <div className="hiw-step__code-ov">
          <pre className="hiw-step__code" style={{borderColor:`${step.accent}35`}}>{step.code}</pre>
        </div>
      </div>

      {/* TEXT SIDE — PARENT drives the retrace: 220px slide + full opacity fade
          Inner lines stagger ONLY on entry (one-way) — no dead zone on retrace */}
      <div className="hiw-step__text-col"
        style={{
          transform: `translateX(${(1-pr) * (even ? 220 : -220)}px)`,
          opacity: pr,
          "--a": step.accent,
        }}>
        <div className="hiw-step__ghost"
          style={{ transform:`translateX(${(p-0.5)*(even?40:-40)}px)` }}>
          {step.headline}
        </div>

        {/* Entry stagger — ss(p,...) not ss(pr,...) so no dead zone */}
        <div style={{ opacity: tagE, transform:`translateY(${(1-tagE)*120}px)` }}>
          <div className="hiw-step__tag">{step.tag} · {step.num}</div>
        </div>
        <div style={{ opacity: titleE, transform:`translateY(${(1-titleE)*150}px) scale(${0.84+titleE*0.16})` }}>
          <h3 className="hiw-step__title">{step.title}</h3>
        </div>
        <div style={{ opacity: descE, transform:`translateY(${(1-descE)*110}px)` }}>
          <p className="hiw-step__desc">{step.desc}</p>
        </div>
        <ul className="hiw-step__list"
          style={{ opacity: listE, transform:`translateY(${(1-listE)*90}px)` }}>
          {step.details.map((d, di) => (
            <li key={d} className="hiw-step__item"
              style={{ opacity: ss(listE, di*0.18, di*0.18+0.55) }}>
              <span className="hiw-step__bullet" />{d}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function FlowSection() {
  const [ref, p] = useElP();
  const pr = prog(p, 0.06, 0.34, 0.50, 0.82);
  const nodes = [
    {icon:"📄",label:"Your PDF",  sub:"Any research paper"},
    {arrow:true},
    {icon:"🌐",label:"IPFS",      sub:"SHA-256 → CID"},
    {arrow:true},
    {icon:"⛓", label:"Blockchain",sub:"CID + Wallet + Timestamp"},
    {arrow:true},
    {icon:"✅",label:"Proof",     sub:"Public · Permanent · Verified"},
    {arrow:true},
    {icon:"📰",label:"Journals",  sub:"Submit & Peer Review"},
  ];
  return (
    <section className="hiw-flow" ref={ref}>
      <div className="hiw-flow__bleed" style={{ transform:`translate(-50%,-50%) translateY(${(p-0.5)*-80}px)` }}>FLOW</div>
      <div className="hiw-flow__inner">
        <div style={{ opacity: pr, transform:`translateY(${(1-pr)*200}px)` }}>
          <div className="eyebrow">The Complete Flow</div>
        </div>
        <div style={{ opacity: pr, transform:`translateY(${(1-pr)*220}px) scale(${0.78+pr*0.22})` }}>
          <h2 className="hiw-flow__h2">End-to-end in one view.</h2>
        </div>
        <div className="hiw-flow__row">
          {nodes.map((item, i) => {
            // Use pr directly — entry stagger by shifting the window, zero dead zone on retrace
            const np = Math.max(0, prog(p, 0.10+i*0.04, 0.34+i*0.04, 0.52, 0.84));
            return item.arrow
              ? <div className="hiw-flow__arr" key={i} style={{opacity:np, transform:`translateX(${(1-np)*-40}px)`}}>→</div>
              : <div className="hiw-flow__node" key={i} style={{opacity:np, transform:`translateY(${(1-np)*100}px) scale(${0.78+np*0.22})`}}>
                  <div className="hiw-flow__node-icon">{item.icon}</div>
                  <div className="hiw-flow__node-label">{item.label}</div>
                  <div className="hiw-flow__node-sub">{item.sub}</div>
                </div>;
          })}
        </div>
      </div>
    </section>
  );
}

function CtaSection({ go }) {
  const [ref, p] = useElP();
  const h2p  = prog(p, 0.06, 0.32, 0.52, 0.82);
  const subp = prog(p, 0.12, 0.38, 0.52, 0.82);
  const btnp = prog(p, 0.18, 0.44, 0.52, 0.82);
  return (
    <section className="hiw-cta" ref={ref}>
      <div className="hiw-cta__inner">
        <div style={{ opacity:h2p, transform:`translateY(${(1-h2p)*200}px) scale(${0.78+h2p*0.22})` }}>
          <h2 className="hiw-cta__h2">Ready to register your paper?</h2>
        </div>
        <div style={{ opacity:subp, transform:`translateY(${(1-subp)*160}px)` }}>
          <p className="hiw-cta__sub">Upload to IPFS. Submit to blockchain. Establish your precedence — permanently.</p>
        </div>
        <div style={{ opacity:btnp, transform:`translateY(${(1-btnp)*120}px)` }} className="hiw-cta__btns">
          <button className="btn btn-gold" onClick={()=>go("app")}><span>Launch the App →</span></button>
          <button className="btn btn-ghost" onClick={()=>go("tech")}>Explore the Technology</button>
        </div>
      </div>
    </section>
  );
}

export default function HowItWorks({ navigate }) {
  useScrollReveal(0.12);
  const [bgRef, bgOff]     = useParallax(0.32);
  const [bleedRef, blOff]  = useParallax(-0.10);
  const [textRef, textOff] = useParallax(0.13);
  const [heroRef, heroP]   = useElP();
  const heroExit      = heroP > 0.72 ? ss(heroP, 0.72, 0.95) : 0;
  const heroEnterBack = heroP < 0.32 ? 1 - ss(heroP, 0.08, 0.32) : 0;
  const hf = Math.max(heroExit, heroEnterBack);
  const hr = 1 - hf;
  const go = (pg) => { navigate(pg); window.scrollTo({top:0}); };

  return (
    <div className="hiw">
      <section className="hiw-hero" ref={heroRef}>
        <div ref={bgRef} className="hiw-hero__bg" style={{transform:`translateY(${bgOff}px) scale(1.18)`}} />
        <div className="hiw-hero__ov" /><div className="hiw-hero__grid" />
        <div ref={bleedRef} className="hiw-hero__bleed" style={{transform:`translate(-50%,-50%) translateY(${blOff}px)`}}>HOW</div>
        <div ref={textRef} className="hiw-hero__content" style={{transform:`translateY(${textOff}px)`}}>
          <div className="eyebrow" style={hf>0.01?{opacity:hr,transform:`translateY(${hf*-80}px)`}:undefined}>The Process</div>
          <h1 className="hiw-hero__h1" style={hf>0.01?{opacity:hr,transform:`translateY(${hf*100}px)`}:undefined}>
            Four steps.<br /><em className="gold-text">Permanent proof.</em>
          </h1>
          <p className="hiw-hero__sub" style={hf>0.01?{opacity:hr,transform:`translateY(${hf*80}px)`}:undefined}>
            From raw PDF to immutable blockchain record — here's exactly what happens at every stage.
          </p>
        </div>
        <div className="hiw-hero__stats">
          {[{v:"4",l:"Steps"},{v:"SHA-256",l:"Hashing"},{v:"EVM",l:"Execution"},{v:"0 Gas",l:"To Verify"}].map(({v,l})=>(
            <div className="hiw-hero__stat" key={l}><div className="hiw-hero__stat-v">{v}</div><div className="hiw-hero__stat-l">{l}</div></div>
          ))}
        </div>
      </section>
      <div className="hiw-steps">{STEPS.map((s,i)=><Step key={s.num} step={s} i={i} />)}</div>
      <FlowSection go={go} />
      <CtaSection go={go} />
    </div>
  );
}