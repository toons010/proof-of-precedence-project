import React, { useEffect, useRef, useState } from "react";
import { useScrollReveal, useParallax, useElementScroll } from "./useScrollAnimation";
import "./Home.css";

const ss = (v, a, b) => Math.max(0, Math.min(1, (v - a) / (b - a)));

/* ── bidirectional element scroll progress 0→1 ── */
function useElP() {
  const ref = useRef(null);
  const [p, setP] = useState(0);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const fn = () => {
      const { top, height } = el.getBoundingClientRect();
      setP(Math.max(0, Math.min(1, (window.innerHeight - top) / (window.innerHeight + height))));
    };
    fn();
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);
  return [ref, p];
}

/* ═══════════════════════════════════════════════════════════════
   PROBLEM SECTION — left/right slide + full reversal
═══════════════════════════════════════════════════════════════ */
function ProblemSection() {
  const [secRef, p] = useElP();
  const entered  = ss(p, 0.15, 0.45);
  const exiting  = ss(p, 0.60, 0.88);
  const progress = entered - exiting;        // peaks at 1, returns to 0
  const op    = 0.08 + progress * 0.92;
  const leftX = (1 - progress) * -120;
  const rightX= (1 - progress) *  120;
  const headY = (p - 0.5) * -40;            // independent vertical parallax

  return (
    <section className="h-prob" ref={secRef}>
      <div className="h-prob__bg" />
      <div className="h-prob__ov" />
      <div className="h-prob__bleed-l">TRUST</div>
      <div className="h-prob__bleed-r">LESS</div>
      <div className="h-prob__inner">
        <div className="h-prob__left" style={{ transform: `translateX(${leftX}px) translateY(${headY}px)`, opacity: op }}>
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
        <div className="h-prob__right" style={{ transform: `translateX(${rightX}px)`, opacity: op }}>
          <p className="h-prob__para">
            Academic priority disputes are as old as science. When two researchers independently
            discover the same thing, the community needs an <strong>objective, tamper-proof record</strong> of who arrived first.
          </p>
          <p className="h-prob__para">
            Today's systems depend on <strong>centralised servers</strong> whose records can be altered,
            delayed, or destroyed. Proof of Precedence changes this by combining{" "}
            <strong>IPFS content addressing</strong> with an <strong>Ethereum smart contract</strong>.
          </p>
          <blockquote className="h-prob__quote">
            <span>"</span>The blockchain is immutable. The timestamp is real.
            The authorship is cryptographic. This is certainty.
          </blockquote>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════
   CARDS SECTION — staggered cards + fully reversing header
═══════════════════════════════════════════════════════════════ */
function CardsSection({ go }) {
  const [secRef, p] = useElP();
  // Header: entered-exiting pattern so it reverses too
  const hdrEntered = ss(p, 0.04, 0.30);
  const hdrExiting = ss(p, 0.72, 0.94);
  const hdrProg    = hdrEntered - hdrExiting;
  const eyeP = ss(hdrProg, 0.00, 0.40);
  const h2P  = ss(hdrProg, 0.15, 0.55);

  const cards = [
    { page:"how",  num:"01", title:"How It Works", desc:"The three-step flow from PDF upload to permanent blockchain record.", img:"https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&q=80", word:"FLOW",  accent:"#b8922a" },
    { page:"tech", num:"02", title:"Technology",   desc:"Deep dive into Solidity, IPFS, Hardhat, and every component.", img:"https://images.unsplash.com/photo-1639322537228-f710d846310a?w=800&q=80", word:"CODE",  accent:"#3d7fff" },
    { page:"app",  num:"03", title:"Launch App",   desc:"Register your paper right now and receive cryptographic proof.", img:"https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&q=80", word:"BUILD", accent:"#1a6b5a" },
  ];

  return (
    <section className="h-cards" ref={secRef}>
      <div className="h-cards__bleed">EXPLORE</div>
      <div className="h-cards__inner">
        <div className="h-cards__hdr">
          {/* Eyebrow and h2 each stagger in and retrace out */}
          <div style={{ opacity: eyeP, transform: `translateY(${(1-eyeP)*100}px)` }}>
            <div className="eyebrow">Discover More</div>
          </div>
          <div style={{ opacity: h2P, transform: `translateY(${(1-h2P)*120}px) scale(${0.9+h2P*0.1})` }}>
            <h2 className="h-cards__h2">Everything you need to know.</h2>
          </div>
        </div>
        <div className="h-cards__grid">
          {cards.map(({ page, num, title, desc, img, word, accent }, i) => {
            const delay   = i * 0.06;
            const entered = ss(p, 0.12 + delay, 0.38 + delay);
            const exiting = ss(p, 0.68, 0.90);
            const prog    = entered - exiting;
            return (
              <div className="h-card" key={page} style={{ "--ca": accent,
                opacity: 0.05 + prog * 0.95,
                transform: `translateY(${(1 - prog) * 60}px)`,
              }} onClick={() => go(page)}>
                <div className="h-card__img-wrap">
                  <img src={img} alt={title} className="h-card__img" loading="lazy"
                    style={{
                      transform: `translateY(${(p - 0.5) * -24}px) scale(${1.06 + (1 - prog) * 0.22})`,
                      filter: `brightness(${0.45 + prog * 0.25}) saturate(${0.6 + prog * 0.35})`,
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

/* ═══════════════════════════════════════════════════════════════
   TRUST SECTION — alternating slide + fully reversing header
═══════════════════════════════════════════════════════════════ */
function TrustSection() {
  const [secRef, p] = useElP();
  // Header: entered-exiting so it reverses
  const hdrEntered = ss(p, 0.04, 0.28);
  const hdrExiting = ss(p, 0.72, 0.94);
  const hdrProg    = hdrEntered - hdrExiting;
  const eyeP = ss(hdrProg, 0.00, 0.40);
  const h2P  = ss(hdrProg, 0.15, 0.55);

  const items = [
    { icon:"🔐", title:"Tamper-Proof",   desc:"Once written to the blockchain, no record can be altered. Not by us, not by anyone.", accent:"#b8922a" },
    { icon:"🌐", title:"Public",          desc:"Every record is openly queryable by anyone in the world with the contract address and CID.", accent:"#3d7fff" },
    { icon:"⏱",  title:"Timestamped",    desc:"Block timestamps are set by network consensus — impossible to backdate or manipulate.", accent:"#1a6b5a" },
    { icon:"🔑", title:"Self-Sovereign",  desc:"You own your record. No account, no login — just your wallet and the blockchain.", accent:"#8b2020" },
  ];

  return (
    <section className="h-trust" ref={secRef}>
      <div className="h-trust__inner">
        <div>
          <div style={{ opacity: eyeP, transform: `translateY(${(1-eyeP)*100}px)` }}>
            <div className="eyebrow">Why Trust It</div>
          </div>
          <div style={{ opacity: h2P, transform: `translateY(${(1-h2P)*120}px) scale(${0.9+h2P*0.1})` }}>
            <h2 className="h-trust__h2">Built on mathematical certainty.</h2>
          </div>
        </div>
        <div className="h-trust__grid">
          {items.map(({ icon, title, desc, accent }, i) => {
            const delay   = i * 0.07;
            const entered = ss(p, 0.12 + delay, 0.36 + delay);
            const exiting = ss(p, 0.70, 0.90);
            const prog    = entered - exiting;
            const fromLeft = i % 2 === 0;
            return (
              <div className="h-trust-item" key={title} style={{ "--ca": accent,
                opacity: 0.05 + prog * 0.95,
                transform: `translateX(${(1 - prog) * (fromLeft ? -50 : 50)}px) translateY(${(1 - prog) * 20}px)`,
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

/* ═══════════════════════════════════════════════════════════════
   CTA BAND — per-element stagger + full reversal
═══════════════════════════════════════════════════════════════ */
function CtaSection({ go }) {
  const [ref, p] = useElP();
  const entered = ss(p, 0.06, 0.42);
  const exiting = ss(p, 0.68, 0.94);
  const prog    = entered - exiting;
  const h2P  = ss(prog, 0.00, 0.38);
  const subP = ss(prog, 0.12, 0.50);
  const btnP = ss(prog, 0.24, 0.62);
  return (
    <section className="h-cta" ref={ref}>
      <div className="h-cta__bleed"
        style={{ transform: `translate(-50%,-50%) translateY(${(p-0.5)*-50}px)` }}>
        REGISTER
      </div>
      <div className="h-cta__inner">
        <div style={{ opacity: h2P, transform: `translateY(${(1-h2P)*110}px) scale(${0.9+h2P*0.1})` }}>
          <h2 className="h-cta__h2">Ready to establish<br /><em className="gold-text">your precedence?</em></h2>
        </div>
        <div style={{ opacity: subP, transform: `translateY(${(1-subP)*80}px)` }}>
          <p className="h-cta__sub">Join the future of academic publishing. Permanent, public, provable.</p>
        </div>
        <div style={{ opacity: btnP, transform: `translateY(${(1-btnP)*60}px)` }} className="h-cta__btns">
          <button className="btn btn-gold" onClick={() => go("app")}><span>Register a Paper Now</span></button>
          <button className="btn btn-ghost" onClick={() => go("how")}>Learn How It Works</button>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════
   HOME — main component
═══════════════════════════════════════════════════════════════ */
export default function Home({ navigate }) {
  useScrollReveal(0.12);

  const [bgRef,    bgOff]   = useParallax(0.28);
  const [bleedRef, blOff]   = useParallax(-0.06);
  const [textRef,  txOff]   = useParallax(0.10);
  const [codeRef,  codeOff] = useParallax(-0.08);
  const [heroRef,  heroP]   = useElementScroll();

  // Hero: CSS keyframes handle entrance on load.
  // heroFade kicks in only when hero is out of center viewport — reverses text on scroll away/back.
  const heroExit      = heroP > 0.72 ? ss(heroP, 0.72, 0.95) : 0;
  const heroEnterBack = heroP < 0.32 ? 1 - ss(heroP, 0.08, 0.32) : 0;
  const heroFade      = Math.max(heroExit, heroEnterBack);
  const heroRetrace   = 1 - heroFade;

  const go = (p) => { navigate(p); window.scrollTo({ top: 0 }); };

  return (
    <div className="home">

      {/* ══ HERO ══ */}
      <section className="h-hero" ref={heroRef}>
        {/* Background: slow parallax */}
        <div ref={bgRef} className="h-hero__bg"
          style={{ transform: `translateY(${bgOff}px) scale(1.2)` }} />
        <div className="h-hero__ov" />
        <div className="h-hero__grid" />

        {/* Bleeding word: counter-parallax (rises as you scroll down) */}
        <div ref={bleedRef} className="h-hero__bleed"
          style={{ transform: `translateX(-50%) translateY(${blOff}px)` }}>
          IMMUTABLE
        </div>

        {/* Floating code panel: counter-scrolls slightly */}
        <div ref={codeRef} className="h-hero__code"
          style={{ transform: `translateY(calc(-50% + ${codeOff}px))` }}>
          <div className="h-hero__code-bar">
            <span style={{ background: "#e05252" }} />
            <span style={{ background: "#f0a500" }} />
            <span style={{ background: "#4ecba0" }} />
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

        {/* Main content: CSS keyframes for entrance, JS heroFade for retrace */}
        <div ref={textRef} className="h-hero__content"
          style={{ transform: `translateY(${txOff}px)` }}>
          <div className="h-hero__eyebrow"
            style={ heroFade > 0.01 ? { opacity: heroRetrace, transform: `translateY(${heroExit > heroEnterBack ? heroFade*-60 : heroFade*60}px)` } : undefined }>
            <span className="h-hero__dot" />
            Blockchain · IPFS · Solidity · Academic Priority
          </div>
          <h1 className="h-hero__h1"
            style={ heroFade > 0.01 ? { opacity: heroRetrace, transform: `translateY(${heroExit > heroEnterBack ? heroFade*-40 : heroFade*40}px)` } : undefined }>
            <span className="h-hero__h1a">Establish</span>
            <span className="h-hero__h1b">Your <em>Research</em></span>
            <span className="h-hero__h1c">Priority.</span>
          </h1>
          <p className="h-hero__sub"
            style={ heroFade > 0.01 ? { opacity: heroRetrace, transform: `translateY(${heroExit > heroEnterBack ? heroFade*-30 : heroFade*50}px)` } : undefined }>
            The world's first decentralised academic authorship system.
            Your paper, timestamped forever — no institution, no intermediary.
          </p>
          <div className="h-hero__btns"
            style={ heroFade > 0.01 ? { opacity: heroRetrace, transform: `translateY(${heroExit > heroEnterBack ? heroFade*-20 : heroFade*40}px)` } : undefined }>
            <button className="btn btn-gold" onClick={() => go("app")}>
              <span>Register a Paper</span>
              <span className="h-hero__arr">→</span>
            </button>
            <button className="btn btn-ghost" onClick={() => go("how")}>How It Works</button>
          </div>
        </div>

        <div className="h-hero__stats">
          {[{v:"SHA-256",l:"Content Hashing"},{v:"EVM",l:"Smart Contract"},{v:"IPFS",l:"Storage"},{v:"Solidity",l:"Language"}].map(({v,l})=>(
            <div className="h-hero__stat" key={l}>
              <div className="h-hero__stat-v">{v}</div>
              <div className="h-hero__stat-l">{l}</div>
            </div>
          ))}
        </div>

        <div className="h-hero__scroll">
          <div className="h-hero__scroll-track"><div className="h-hero__scroll-thumb" /></div>
          <span>Scroll</span>
        </div>
      </section>

      <ProblemSection />
      <CardsSection go={go} />
      <TrustSection />
      <CtaSection go={go} />
    </div>
  );
}