import React, { useEffect, useRef, useState } from "react";
import { useScrollReveal, useParallax } from "./useScrollAnimation";
import "./HowItWorks.css";

/* smooth-step 0→1 within [a,b] */
const ss = (v, a, b) => Math.max(0, Math.min(1, (v - a) / (b - a)));

/* bidirectional element progress 0→1 */
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

const STEPS = [
  {
    num: "01", tag: "Step One", title: "Upload to IPFS", headline: "CONTENT-ADDRESSED",
    desc: "Your PDF is uploaded to IPFS via Pinata. IPFS runs your file through SHA-256 and returns a Content Identifier — a cryptographic fingerprint of every byte. Any modification produces a completely different CID.",
    details: ["SHA-256 hashing of every file byte", "Pinata pinning ensures global availability", "Even 1 byte change = completely different CID", "CID is mathematically unforgeable"],
    code: "const cid = await uploadToPinata(file);\n// → bafybeigdyrzt5sfp7...",
    img: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1400&q=80",
    accent: "#b8922a",
  },
  {
    num: "02", tag: "Step Two", title: "Register On-Chain", headline: "IMMUTABLE",
    desc: "Your CID, wallet address, and a network-consensus timestamp are written into the PaperRegistry contract on Polygon. The contract permanently rejects any future attempt to register the same CID.",
    details: ["msg.sender cryptographically verifies identity", "block.timestamp set by Polygon consensus", "Duplicate CIDs rejected at EVM level", "No admin, no backdoor — code is the only law"],
    code: "await registry.submitPaper(cid);\n// Confirmed · Block #1,284,920",
    img: "https://images.unsplash.com/photo-1639322537228-f710d846310a?w=1400&q=80",
    accent: "#3d7fff",
  },
  {
    num: "03", tag: "Step Three", title: "Verify Anywhere", headline: "TRUSTLESS",
    desc: "Anyone can call getPaper() with a CID. The blockchain returns the author address, timestamp, and precedence status — instantly, permissionlessly, without any trusted third party.",
    details: ["Read-only view function — zero gas cost", "No wallet or account required to verify", "Returns author, timestamp, existence status", "Valid as long as Polygon blockchain exists"],
    code: "const [cid, author, ts, exists]\n  = await registry.getPaper(cid);",
    img: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1400&q=80",
    accent: "#1a6b5a",
  },
];

/* ═══════════════════════════════════════════════════════════════
   ONE STEP — Ferrari zoom-from-afar + dramatic line-by-line stagger
═══════════════════════════════════════════════════════════════ */
function Step({ step, i }) {
  const [secRef, p] = useElP();
  const even = i % 2 === 1;

  /* Entry/exit: wide windows so animation is long and visible */
  const entered  = ss(p, 0.10, 0.45);
  const exiting  = ss(p, 0.58, 0.90);
  const progress = entered - exiting;  /* peaks at 1, returns to 0 */

  /* Image: zoom from far (scale 1.4→1.06) + slow parallax */
  const imgScale = 1.06 + (1 - progress) * 0.34;
  const imgY     = (p - 0.5) * -90;
  const imgBrightness = 0.38 + progress * 0.32;

  /* Bleeding word: counter-parallax */
  const bleedY = (p - 0.5) * 60;

  /* Text column: BIG slide from outside — 140px */
  const textX  = (1 - progress) * (even ? 140 : -140);
  const textOp = Math.max(0, Math.min(1, progress * 1.4));

  /* Per-line stagger — DRAMATIC: 80px drops, wide opacity windows */
  const tagP   = ss(progress, 0.00, 0.30);
  const titleP = ss(progress, 0.10, 0.42);
  const descP  = ss(progress, 0.22, 0.55);
  const listP  = ss(progress, 0.34, 0.68);

  return (
    <div className={`hiw-step ${even ? "hiw-step--flip" : ""}`} ref={secRef}>

      {/* IMAGE SIDE */}
      <div className="hiw-step__img-col">
        <img
          src={step.img} alt={step.title}
          className="hiw-step__img" loading="lazy"
          style={{
            transform: `translateY(${imgY}px) scale(${imgScale})`,
            filter: `brightness(${imgBrightness}) saturate(${0.55 + progress * 0.40})`,
          }}
        />
        <div className="hiw-step__img-ov" />
        <div className="hiw-step__img-num"
          style={{ opacity: progress * 1.5, transform: `translateY(${(1 - progress) * -20}px)` }}>
          {step.num}
        </div>
        <div className="hiw-step__img-bleed"
          style={{ color: `${step.accent}1c`, transform: `translateY(${bleedY}px)` }}>
          {step.headline}
        </div>
        <div className="hiw-step__code-ov">
          <pre className="hiw-step__code" style={{ borderColor: `${step.accent}35` }}>
            {step.code}
          </pre>
        </div>
      </div>

      {/* TEXT SIDE — whole column slides, each line staggers inside */}
      <div
        className="hiw-step__text-col"
        style={{ transform: `translateX(${textX}px)`, opacity: textOp, "--a": step.accent }}
      >
        {/* Ghost headline — counter-parallax inside text column */}
        <div className="hiw-step__ghost"
          style={{ transform: `translateX(${(p - 0.5) * (even ? 35 : -35)}px)` }}>
          {step.headline}
        </div>

        {/* TAG — first to appear, drops 80px */}
        <div style={{ opacity: tagP, transform: `translateY(${(1 - tagP) * 80}px)` }}>
          <div className="hiw-step__tag">{step.tag} · {step.num}</div>
        </div>

        {/* TITLE — drops 90px with slight delay */}
        <div style={{ opacity: titleP, transform: `translateY(${(1 - titleP) * 90}px)` }}>
          <h3 className="hiw-step__title">{step.title}</h3>
        </div>

        {/* DESC — drops 70px */}
        <div style={{ opacity: descP, transform: `translateY(${(1 - descP) * 70}px)` }}>
          <p className="hiw-step__desc">{step.desc}</p>
        </div>

        {/* LIST — drops 60px, each item also staggers */}
        <ul className="hiw-step__list"
          style={{ opacity: listP, transform: `translateY(${(1 - listP) * 60}px)` }}>
          {step.details.map((d, di) => (
            <li key={d} className="hiw-step__item"
              style={{ opacity: ss(listP, di * 0.18, di * 0.18 + 0.55) }}>
              <span className="hiw-step__bullet" />
              {d}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ── Flow section — DRAMATIC subheading animation ── */
function FlowSection({ go }) {
  const [ref, p] = useElP();

  /* DRAMATIC — eyebrow slides 100px, h2 slides 120px, wide windows */
  const eyebrowP = ss(p, 0.04, 0.28);
  const h2P      = ss(p, 0.12, 0.38);
  const bleedP   = (p - 0.5) * -70;

  const nodes = [
    { icon: "📄", label: "Your PDF",   sub: "Any research paper" },
    { arrow: true },
    { icon: "🌐", label: "IPFS",       sub: "SHA-256 → CID" },
    { arrow: true },
    { icon: "⛓",  label: "Blockchain", sub: "CID + Wallet + Timestamp" },
    { arrow: true },
    { icon: "✅", label: "Proof",      sub: "Public · Permanent · Verified" },
  ];

  return (
    <section className="hiw-flow" ref={ref}>
      <div className="hiw-flow__bleed"
        style={{ transform: `translate(-50%,-50%) translateY(${bleedP}px)` }}>
        FLOW
      </div>
      <div className="hiw-flow__inner">

        {/* Eyebrow: slides up 100px + fade */}
        <div style={{
          opacity: eyebrowP,
          transform: `translateY(${(1 - eyebrowP) * 100}px)`,
        }}>
          <div className="eyebrow">The Complete Flow</div>
        </div>

        {/* H2: slides up 120px with bigger delay */}
        <div style={{
          opacity: h2P,
          transform: `translateY(${(1 - h2P) * 120}px)`,
        }}>
          <h2 className="hiw-flow__h2">End-to-end in one view.</h2>
        </div>

        <div className="hiw-flow__row">
          {nodes.map((item, i) => {
            const np = ss(p, 0.20 + i * 0.05, 0.50 + i * 0.05);
            return item.arrow ? (
              <div className="hiw-flow__arr" key={i}
                style={{ opacity: np, transform: `translateX(${(1 - np) * -20}px)` }}>→</div>
            ) : (
              <div className="hiw-flow__node" key={i}
                style={{
                  opacity: np,
                  transform: `translateY(${(1 - np) * 50}px) scale(${0.85 + np * 0.15})`,
                }}>
                <div className="hiw-flow__node-icon">{item.icon}</div>
                <div className="hiw-flow__node-label">{item.label}</div>
                <div className="hiw-flow__node-sub">{item.sub}</div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ── CTA section — dramatic h2 + sub + buttons ── */
function CtaSection({ go }) {
  const [ref, p] = useElP();
  const h2P  = ss(p, 0.08, 0.38);
  const subP = ss(p, 0.20, 0.50);
  const btnP = ss(p, 0.32, 0.60);

  return (
    <section className="hiw-cta" ref={ref}>
      <div className="hiw-cta__inner">
        <div style={{ opacity: h2P, transform: `translateY(${(1 - h2P) * 100}px)` }}>
          <h2 className="hiw-cta__h2">Ready to register your paper?</h2>
        </div>
        <div style={{ opacity: subP, transform: `translateY(${(1 - subP) * 70}px)` }}>
          <p className="hiw-cta__sub">
            Upload to IPFS. Submit to blockchain. Establish your precedence — permanently.
          </p>
        </div>
        <div style={{ opacity: btnP, transform: `translateY(${(1 - btnP) * 50}px)` }}
          className="hiw-cta__btns">
          <button className="btn btn-gold" onClick={() => go("app")}>
            <span>Launch the App →</span>
          </button>
          <button className="btn btn-ghost" onClick={() => go("tech")}>
            Explore the Technology
          </button>
        </div>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════ */
export default function HowItWorks({ navigate }) {
  useScrollReveal(0.12);
  const [bgRef,    bgOff]   = useParallax(0.32);
  const [bleedRef, blOff]   = useParallax(-0.10);
  const [textRef,  textOff] = useParallax(0.13);
  // Hero section scroll progress for inline bidirectional text animation
  const [heroRef, heroP] = useElP();
  const heroEyeP  = ss(heroP, 0.02, 0.18);
  const heroH1P   = ss(heroP, 0.06, 0.24);
  const heroSubP  = ss(heroP, 0.12, 0.30);
  const go = (pg) => { navigate(pg); window.scrollTo({ top: 0 }); };

  return (
    <div className="hiw">

      {/* ── Hero ── */}
      <section className="hiw-hero" ref={heroRef}>
        <div ref={bgRef} className="hiw-hero__bg"
          style={{ transform: `translateY(${bgOff}px) scale(1.18)` }} />
        <div className="hiw-hero__ov" />
        <div className="hiw-hero__grid" />
        <div ref={bleedRef} className="hiw-hero__bleed"
          style={{ transform: `translate(-50%,-50%) translateY(${blOff}px)` }}>
          HOW
        </div>
        <div ref={textRef} className="hiw-hero__content"
          style={{ transform: `translateY(${textOff}px)` }}>
          <div style={{ opacity: heroEyeP, transform: `translateY(${(1-heroEyeP)*60}px)` }}>
            <div className="eyebrow">The Process</div>
          </div>
          <div style={{ opacity: heroH1P, transform: `translateY(${(1-heroH1P)*90}px) scale(${0.92+heroH1P*0.08})` }}>
            <h1 className="hiw-hero__h1">
              Three steps.<br /><em className="gold-text">Permanent proof.</em>
            </h1>
          </div>
          <div style={{ opacity: heroSubP, transform: `translateY(${(1-heroSubP)*70}px)` }}>
            <p className="hiw-hero__sub">
              From raw PDF to immutable blockchain record — here's exactly what happens at every stage.
            </p>
          </div>
        </div>
        <div className="hiw-hero__stats">
          {[{ v: "3", l: "Steps" }, { v: "SHA-256", l: "Hashing" }, { v: "EVM", l: "Execution" }, { v: "0 Gas", l: "To Verify" }].map(({ v, l }) => (
            <div className="hiw-hero__stat" key={l}>
              <div className="hiw-hero__stat-v">{v}</div>
              <div className="hiw-hero__stat-l">{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Steps ── */}
      <div className="hiw-steps">
        {STEPS.map((s, i) => <Step key={s.num} step={s} i={i} />)}
      </div>

      <FlowSection go={go} />
      <CtaSection go={go} />

    </div>
  );
}