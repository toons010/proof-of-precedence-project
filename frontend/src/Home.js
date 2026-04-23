import React, { useEffect, useRef, useState } from "react";
import { useScrollReveal, useParallax, useElementScroll } from "./useScrollAnimation";
import "./Home.css";

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

/* prog() — entered-minus-exiting. Direct mapping: every scroll move = visible change.
   NO nested ss() on top — that creates dead zones where nothing moves. */
function prog(p, eA, eB, xA, xB) {
  return Math.max(0, ss(p, eA, eB) - ss(p, xA, xB));
}

/* ── Problem Section ── */
function ProblemSection() {
  const [ref, p] = useElP();
  const pr = prog(p, 0.08, 0.36, 0.50, 0.80);
  return (
    <section className="h-prob" ref={ref}>
      <div className="h-prob__bg" />
      <div className="h-prob__ov" />
      <div className="h-prob__bleed-l" style={{ transform: `translateX(${(p-0.5)*-50}px)` }}>TRUST</div>
      <div className="h-prob__bleed-r" style={{ transform: `translateX(${(p-0.5)*50}px)` }}>LESS</div>
      <div className="h-prob__inner">
        <div className="h-prob__left" style={{
          opacity: pr,
          transform: `translateX(${(1-pr)*-240}px) translateY(${(p-0.5)*-50}px)`,
        }}>
          <div className="eyebrow">The Problem</div>
          <h2 className="h-prob__h2">Science<br />deserves<br /><em className="gold-text">certainty.</em></h2>
          <div className="h-prob__stats">
            {[{v:"100%",l:"Tamper-proof"},{v:"∞",l:"Permanent"},{v:"0",l:"Trust required"}].map(({v,l})=>(
              <div key={l}>
                <div className="h-prob__stat-v">{v}</div>
                <div className="h-prob__stat-l">{l}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="h-prob__right" style={{
          opacity: pr,
          transform: `translateX(${(1-pr)*240}px)`,
        }}>
          <p className="h-prob__para">Academic priority disputes are as old as science. When two researchers independently discover the same thing, the community needs an <strong>objective, tamper-proof record</strong> of who arrived first.</p>
          <p className="h-prob__para">Today's systems depend on <strong>centralised servers</strong> whose records can be altered, delayed, or destroyed. Proof of Precedence changes this by combining{" "}<strong>IPFS content addressing</strong> with an <strong>Ethereum smart contract</strong>.</p>
          <blockquote className="h-prob__quote">
            <span>"</span>The blockchain is immutable. The timestamp is real. The authorship is cryptographic. This is certainty.
          </blockquote>
        </div>
      </div>
    </section>
  );
}

/* ── Cards Section ── */
function CardsSection({ go }) {
  const [ref, p] = useElP();
  /* Header uses prog directly — zero dead zone */
  const hdr = prog(p, 0.04, 0.28, 0.50, 0.80);
  const cards = [
    { page:"how",  num:"01", title:"How It Works", desc:"The three-step flow from PDF upload to permanent blockchain record.", img:"https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&q=80", word:"FLOW",  accent:"#b8922a" },
    { page:"tech", num:"02", title:"Technology",   desc:"Deep dive into Solidity, IPFS, Hardhat, and every component.", img:"https://images.unsplash.com/photo-1639322537228-f710d846310a?w=800&q=80", word:"CODE",  accent:"#3d7fff" },
    { page:"app",  num:"03", title:"Launch App",   desc:"Register your paper right now and receive cryptographic proof.", img:"https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&q=80", word:"BUILD", accent:"#1a6b5a" },
  ];
  return (
    <section className="h-cards" ref={ref}>
      <div className="h-cards__bleed">EXPLORE</div>
      <div className="h-cards__inner">
        <div className="h-cards__hdr">
          <div style={{ opacity: hdr, transform: `translateY(${(1-hdr)*180}px)` }}>
            <div className="eyebrow">Discover More</div>
          </div>
          <div style={{ opacity: hdr, transform: `translateY(${(1-hdr)*200}px) scale(${0.80+hdr*0.20})` }}>
            <h2 className="h-cards__h2">Everything you need to know.</h2>
          </div>
        </div>
        <div className="h-cards__grid">
          {cards.map(({ page, num, title, desc, img, word, accent }, i) => {
            const cp = prog(p, 0.08+i*0.05, 0.32+i*0.05, 0.52, 0.82);
            return (
              <div className="h-card" key={page} style={{ "--ca": accent,
                opacity: cp,
                transform: `translateY(${(1-cp)*120}px)`,
              }} onClick={() => go(page)}>
                <div className="h-card__img-wrap">
                  <img src={img} alt={title} className="h-card__img" loading="lazy"
                    style={{
                      transform: `translateY(${(p-0.5)*-30}px) scale(${1.06+(1-cp)*0.30})`,
                      filter: `brightness(${0.35+cp*0.35}) saturate(${0.5+cp*0.45})`,
                    }} />
                  <div className="h-card__img-ov" />
                  <div className="h-card__word">{word}</div>
                  <div className="h-card__num">{num}</div>
                </div>
                <div className="h-card__body">
                  <div className="h-card__title">{title}</div>
                  <div className="h-card__desc">{desc}</div>
                  <div className="h-card__cta">Explore <span>→</span></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ── Trust Section ── */
function TrustSection() {
  const [ref, p] = useElP();
  const hdr = prog(p, 0.04, 0.26, 0.50, 0.80);
  const items = [
    { icon:"🔐", title:"Tamper-Proof",  desc:"Once written to the blockchain, no record can be altered. Not by us, not by anyone.", accent:"#b8922a" },
    { icon:"🌐", title:"Public",         desc:"Every record is openly queryable by anyone in the world with the contract address and CID.", accent:"#3d7fff" },
    { icon:"⏱",  title:"Timestamped",   desc:"Block timestamps are set by network consensus — impossible to backdate or manipulate.", accent:"#1a6b5a" },
    { icon:"🔑", title:"Self-Sovereign", desc:"You own your record. No account, no login — just your wallet and the blockchain.", accent:"#8b2020" },
  ];
  return (
    <section className="h-trust" ref={ref}>
      <div className="h-trust__inner">
        <div>
          <div style={{ opacity: hdr, transform: `translateY(${(1-hdr)*180}px)` }}>
            <div className="eyebrow">Why Trust It</div>
          </div>
          <div style={{ opacity: hdr, transform: `translateY(${(1-hdr)*200}px) scale(${0.80+hdr*0.20})` }}>
            <h2 className="h-trust__h2">Built on mathematical certainty.</h2>
          </div>
        </div>
        <div className="h-trust__grid">
          {items.map(({ icon, title, desc, accent }, i) => {
            const ip = prog(p, 0.10+i*0.06, 0.34+i*0.06, 0.54, 0.84);
            const fromLeft = i % 2 === 0;
            return (
              <div className="h-trust-item" key={title} style={{ "--ca": accent,
                opacity: ip,
                transform: `translateX(${(1-ip)*(fromLeft?-160:160)}px) translateY(${(1-ip)*60}px)`,
              }}>
                <span className="h-trust-item__icon">{icon}</span>
                <div className="h-trust-item__title">{title}</div>
                <div className="h-trust-item__desc">{desc}</div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ── CTA Section ── */
function CtaSection({ go }) {
  const [ref, p] = useElP();
  const h2p  = prog(p, 0.06, 0.32, 0.52, 0.82);
  const subp = prog(p, 0.12, 0.38, 0.52, 0.82);
  const btnp = prog(p, 0.18, 0.44, 0.52, 0.82);
  return (
    <section className="h-cta" ref={ref}>
      <div className="h-cta__bleed" style={{ transform:`translate(-50%,-50%) translateY(${(p-0.5)*-70}px)` }}>REGISTER</div>
      <div className="h-cta__inner">
        <div style={{ opacity: h2p, transform: `translateY(${(1-h2p)*200}px) scale(${0.78+h2p*0.22})` }}>
          <h2 className="h-cta__h2">Ready to establish<br /><em className="gold-text">your precedence?</em></h2>
        </div>
        <div style={{ opacity: subp, transform: `translateY(${(1-subp)*160}px)` }}>
          <p className="h-cta__sub">Join the future of academic publishing. Permanent, public, provable.</p>
        </div>
        <div style={{ opacity: btnp, transform: `translateY(${(1-btnp)*120}px)` }} className="h-cta__btns">
          <button className="btn btn-gold" onClick={() => go("app")}><span>Register a Paper Now</span></button>
          <button className="btn btn-ghost" onClick={() => go("how")}>Learn How It Works</button>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════ */
export default function Home({ navigate }) {
  const [rewRef, rewP] = useElP();
  /* Synchronized with Problem/Cards sections: 
     Entrance starts early (0.08) and completes at 0.36. 
     Retrace starts at 0.50 and finishes at 0.80. */
  const rewPr = prog(rewP, 0.08, 0.36, 0.50, 0.80);

  useScrollReveal(0.12);
  const [bgRef, bgOff]     = useParallax(0.28);
  const [bleedRef, blOff]  = useParallax(-0.06);
  const [textRef, txOff]   = useParallax(0.10);
  const [codeRef, codeOff] = useParallax(-0.08);
  const [heroRef, heroP]   = useElementScroll();
  const heroExit      = heroP > 0.72 ? ss(heroP, 0.72, 0.95) : 0;
  const heroEnterBack = heroP < 0.32 ? 1 - ss(heroP, 0.08, 0.32) : 0;
  const hf = Math.max(heroExit, heroEnterBack);   // heroFade
  const hr = 1 - hf;                              // heroRetrace
  const up = heroExit > heroEnterBack;            // direction up?
  const go = (pg) => { navigate(pg); window.scrollTo({ top: 0 }); };

  return (
    <div className="home">
      <section className="h-hero" ref={heroRef}>
        <div ref={bgRef} className="h-hero__bg" style={{ transform:`translateY(${bgOff}px) scale(1.2)` }} />
        <div className="h-hero__ov" /><div className="h-hero__grid" />
        <div ref={bleedRef} className="h-hero__bleed" style={{ transform:`translateX(-50%) translateY(${blOff}px)` }}>IMMUTABLE</div>
        <div ref={codeRef} className="h-hero__code" style={{ transform:`translateY(calc(-50% + ${codeOff}px))` }}>
          <div className="h-hero__code-bar">
            <span style={{background:"#e05252"}} /><span style={{background:"#f0a500"}} /><span style={{background:"#4ecba0"}} />
            <span className="h-hero__code-file">PaperRegistry.sol</span>
          </div>
          <pre className="h-hero__code-pre">{`contract PaperRegistry {
  struct Paper {
    string  ipfsCID;
    address author;
    uint256 timestamp;
    bool    exists;
  }
  mapping(string=>Paper) papers;

  function submitPaper(string CID) {
    require(!papers[CID].exists);
    papers[CID] = Paper({
      author:    msg.sender,
      timestamp: block.timestamp
    });
    emit PaperSubmitted(CID);
  }
}`}</pre>
        </div>
        <div ref={textRef} className="h-hero__content" style={{ transform:`translateY(${txOff}px)` }}>
          <div className="h-hero__eyebrow" style={hf>0.01?{opacity:hr, transform:`translateY(${(up?-1:1)*hf*100}px)`}:undefined}>
            <span className="h-hero__dot" />Blockchain · IPFS · Solidity · Academic Priority
          </div>
          <h1 className="h-hero__h1" style={hf>0.01?{opacity:hr, transform:`translateY(${(up?-1:1)*hf*80}px)`}:undefined}>
            <span className="h-hero__h1a">Establish</span>
            <span className="h-hero__h1b">Your <em>Research</em></span>
            <span className="h-hero__h1c">Priority.</span>
          </h1>
          <p className="h-hero__sub" style={hf>0.01?{opacity:hr, transform:`translateY(${(up?-1:1)*hf*70}px)`}:undefined}>
            The world's first decentralised academic authorship system. Your paper, timestamped forever — no institution, no intermediary.
          </p>
          <div className="h-hero__btns" style={hf>0.01?{opacity:hr, transform:`translateY(${(up?-1:1)*hf*60}px)`}:undefined}>
            <button className="btn btn-gold" onClick={()=>go("app")}><span>Register a Paper</span><span className="h-hero__arr">→</span></button>
            <button className="btn btn-ghost" onClick={()=>go("how")}>How It Works</button>
          </div>
        </div>
        <div className="h-hero__stats">
          {[{v:"SHA-256",l:"Content Hashing"},{v:"EVM",l:"Smart Contract"},{v:"IPFS",l:"Storage"},{v:"Solidity",l:"Language"}].map(({v,l})=>(
            <div className="h-hero__stat" key={l}><div className="h-hero__stat-v">{v}</div><div className="h-hero__stat-l">{l}</div></div>
          ))}
        </div>
        <div className="h-hero__scroll"><div className="h-hero__scroll-track"><div className="h-hero__scroll-thumb" /></div><span>Scroll</span></div>
      </section>
      <ProblemSection />
      <CardsSection go={go} />
      <TrustSection />
      {/* ── New Reward Spotlight Section ── */}
    <section className="h-reward-spot" ref={rewRef}>
      <div className="h-reward-spot__bg" style={{ transform: `translateX(${(rewP-0.5)*-50}px)` }} />
      <div className="h-reward-spot__ov" />
      <div className="h-reward-spot__inner">
        <div className="h-reward-spot__content" 
             style={{ opacity: rewPr, transform: `translateX(${(1-rewPr)*-240}px) translateY(${(rewP-0.5)*-50}px)` }}>
          <div className="eyebrow">The Gold Standard</div>
          <h2 className="h-reward-spot__h2">Reward <em className="gold-text">Excellence.</em></h2>
          <p className="h-reward-spot__para">Our peer-review economy incentivizes high-quality research. Editors can now issue on-chain rewards and cryptographic certificates of merit directly to reviewers.</p>
          <div className="h-reward-spot__stats">
            <div className="h-reward-spot__stat">
              <span className="h-reward-spot__stat-v">ETH</span>
              <span className="h-reward-spot__stat-l">Direct Rewards</span>
            </div>
            <div className="h-reward-spot__stat">
              <span className="h-reward-spot__stat-v">NFT</span>
              <span className="h-reward-spot__stat-l">Verifiable Badges</span>
            </div>
          </div>
          <div className="h-reward-spot__btns">
            <button className="btn btn-gold" onClick={() => navigate("app", "reward")}><span>Explore Rewards</span></button>
          </div>
        </div>
        <div className="h-reward-spot__img-wrap" 
             style={{ opacity: rewPr, transform: `translateX(${(1-rewPr)*240}px)` }}>
          <img src="/assets/award.png" alt="Excellence Award" className="h-reward-spot__img" 
               style={{ transform: `scale(${1.1 - (rewP*0.1)})` }} />
          <div className="h-reward-spot__img-shine" />
        </div>
      </div>
    </section>
      <CtaSection go={go} />
    </div>
  );
}