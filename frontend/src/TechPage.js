import React, { useEffect, useRef, useState } from "react";
import { useScrollReveal, useParallax } from "./useScrollAnimation";
import "./TechPage.css";

const ss = (v, a, b) => Math.max(0, Math.min(1, (v - a) / (b - a)));

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

const CONTRACT_CODE = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract PaperRegistry {

    struct Paper {
        string  ipfsCID;
        address author;
        uint256 timestamp;
        bool    exists;
    }

    mapping(string => Paper) private papers;
    string[] public allCIDs;

    event PaperSubmitted(
        string  indexed ipfsCID,
        address indexed author,
        uint256         timestamp
    );

    function submitPaper(string calldata _ipfsCID) external {
        require(bytes(_ipfsCID).length > 0, "CID cannot be empty");
        require(!papers[_ipfsCID].exists,   "Paper already registered");

        papers[_ipfsCID] = Paper({
            ipfsCID:   _ipfsCID,
            author:    msg.sender,
            timestamp: block.timestamp,
            exists:    true
        });

        allCIDs.push(_ipfsCID);
        emit PaperSubmitted(_ipfsCID, msg.sender, block.timestamp);
    }

    function getPaper(string calldata _ipfsCID)
        external view
        returns (string memory, address, uint256, bool)
    {
        Paper storage p = papers[_ipfsCID];
        return (p.ipfsCID, p.author, p.timestamp, p.exists);
    }

    function paperExists(string calldata _ipfsCID)
        external view returns (bool)
    {
        return papers[_ipfsCID].exists;
    }

    function totalPapers() external view returns (uint256) {
        return allCIDs.length;
    }
}`;

const techCards = [
  {
    icon: "⬡", accent: "#b8922a",
    title: "Solidity Smart Contract", sub: "PaperRegistry.sol",
    img: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=600&q=80",
    desc: "A Solidity 0.8.19 contract deployed on Polygon. Stores a mapping of CID strings to Paper structs. Duplicate submissions are rejected at the EVM level — no paper can claim precedence twice.",
    tags: ["Solidity 0.8.19", "Polygon", "EVM", "Mappings", "Events"],
    details: ["struct Paper stores CID, author, timestamp, exists", "mapping(string => Paper) is the core registry", "submitPaper() enforces no-duplicate rule", "PaperSubmitted event permanently logged"],
  },
  {
    icon: "🌐", accent: "#3d7fff",
    title: "IPFS Content Addressing", sub: "InterPlanetary File System",
    img: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&q=80",
    desc: "IPFS identifies files by what they contain. The SHA-256 hash of your file's bytes becomes its permanent address — the CID. Any modification produces a completely different CID.",
    tags: ["SHA-256", "CID v1", "Pinata", "Content Addressing", "P2P"],
    details: ["CID = cryptographic hash of exact file bytes", "cidVersion: 1 produces base32 CIDv1", "Pinata pinning prevents garbage collection", "File available globally via any IPFS gateway"],
  },
  {
    icon: "⚡", accent: "#1a6b5a",
    title: "Hardhat Framework", sub: "Local Blockchain Dev",
    img: "https://images.unsplash.com/photo-1639762681057-408e52192e55?w=600&q=80",
    desc: "Hardhat provides a local Ethereum-compatible node. It compiles Solidity to EVM bytecode, runs a simulated blockchain at localhost:8545, and executes the full Chai/Mocha test suite.",
    tags: ["Hardhat 2.19", "Chai", "Mocha", "ethers.js v6", "localhost:8545"],
    details: ["npx hardhat node starts local chain on 8545", "npx hardhat compile → ABI + bytecode", "deploy.js deploys and prints contract address", "16 tests cover all functions and edge cases"],
  },
  {
    icon: "🔑", accent: "#8b2020",
    title: "Cryptographic Identity", sub: "Wallet-Based Authorship",
    img: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&q=80",
    desc: "Every transaction is signed with an Ethereum private key using ECDSA on secp256k1. The EVM sets msg.sender to the verified signer — this cannot be spoofed without the private key.",
    tags: ["ECDSA", "secp256k1", "msg.sender", "ethers.Wallet", "JSON-RPC"],
    details: ["Private key → public key → Ethereum address", "ethers.Wallet signs transactions locally", "JsonRpcProvider connects to Hardhat or Polygon", "block.timestamp verified by network consensus"],
  },
];

/* ── Contract section ── */
function ContractSection() {
  const [ref, p] = useElP();
  const entered = ss(p, 0.1, 0.4);
  const exiting = ss(p, 0.65, 0.9);
  const prog    = entered - exiting;
  const leftX   = (1 - prog) * -80;
  const rightX  = (1 - prog) * 80;

  return (
    <section className="tech-contract" ref={ref}>
      <div className="tech-contract__bleed"
        style={{ transform: `translateY(${(p - 0.5) * -40}px)` }}>
        CODE
      </div>
      <div className="tech-contract__inner">

        {/* Left — text slides from left, each line staggers in */}
        <div className="tech-contract__left"
          style={{ transform: `translateX(${leftX}px)` }}>
          <div style={{ opacity: ss(prog, 0.0, 0.3), transform: `translateY(${(1 - ss(prog, 0.0, 0.3)) * 90}px)` }}>
            <div className="eyebrow">The Smart Contract</div>
          </div>
          <div style={{ opacity: ss(prog, 0.1, 0.45), transform: `translateY(${(1 - ss(prog, 0.1, 0.45)) * 110}px) scale(${0.88 + ss(prog, 0.1, 0.45) * 0.12})` }}>
            <h2 className="tech-contract__h2">
              PaperRegistry.sol —<br />the entire system<br />
              <em className="gold-text">in 50 lines.</em>
            </h2>
          </div>
          <div style={{ opacity: ss(prog, 0.2, 0.5), transform: `translateY(${(1 - ss(prog, 0.2, 0.5)) * 80}px)` }}>
            <p className="tech-contract__desc">
              No owner. No admin. No backdoor. Once deployed, this contract
              runs exactly as written, forever. The code is the only authority.
            </p>
          </div>
          <div style={{ opacity: ss(prog, 0.3, 0.6), transform: `translateY(${(1 - ss(prog, 0.3, 0.6)) * 60}px)` }}>
            <div className="tech-contract__stats">
              {[
                { v: "50", l: "Lines of Solidity" },
                { v: "16", l: "Tests passing" },
                { v: "0",  l: "Admin privileges" },
                { v: "∞",  l: "Permanence" },
              ].map(({ v, l }) => (
                <div className="tech-contract__stat" key={l}>
                  <div className="tech-contract__stat-v">{v}</div>
                  <div className="tech-contract__stat-l">{l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right — code panel slides from right */}
        <div className="tech-contract__right"
          style={{ transform: `translateX(${rightX}px)`, opacity: ss(prog, 0.1, 0.45) }}>
          <div className="tech-contract__code-wrap">
            <div className="tech-contract__code-bar">
              <span style={{ background: "#e05252" }} />
              <span style={{ background: "#f0a500" }} />
              <span style={{ background: "#4ecba0" }} />
              <span className="tech-contract__code-name">PaperRegistry.sol</span>
            </div>
            <pre className="tech-contract__code">{CONTRACT_CODE}</pre>
          </div>
        </div>

      </div>
    </section>
  );
}

/* ── Cards section ── */
function CardsSection() {
  const [ref, p] = useElP();
  const eyebrowP = ss(p, 0.04, 0.28);
  const h2P      = ss(p, 0.13, 0.40);

  return (
    <section className="tech-cards" ref={ref}>
      <div className="tech-cards__inner">
        <div>
          <div style={{ opacity: eyebrowP, transform: `translateY(${(1 - eyebrowP) * 100}px)` }}>
            <div className="eyebrow">The Stack</div>
          </div>
          <div style={{ opacity: h2P, transform: `translateY(${(1 - h2P) * 120}px) scale(${0.9 + h2P * 0.1})` }}>
            <h2 className="tech-cards__h2">Every component explained.</h2>
          </div>
        </div>
        <div className="tech-cards__grid">
          {techCards.map((card, i) => {
            const delay   = i * 0.06;
            const entered = ss(p, 0.12 + delay, 0.38 + delay);
            const exiting = ss(p, 0.70, 0.92);
            const prog    = entered - exiting;
            const fromLeft = i % 2 === 0;
            return (
              <div
                className="tech-card"
                key={card.title}
                style={{
                  "--a": card.accent,
                  opacity: 0.04 + prog * 0.96,
                  transform: `translateX(${(1 - prog) * (fromLeft ? -40 : 40)}px) translateY(${(1 - prog) * 20}px)`,
                }}
              >
                <div className="tech-card__img-wrap">
                  <img
                    src={card.img} alt={card.title}
                    className="tech-card__img" loading="lazy"
                    style={{
                      transform: `translateY(${(p - 0.5) * -20}px) scale(${1.06 + (1 - prog) * 0.22})`,
                      filter: `brightness(${0.4 + prog * 0.25}) saturate(${0.55 + prog * 0.35})`,
                    }}
                  />
                  <div className="tech-card__img-ov" />
                  <div className="tech-card__icon">{card.icon}</div>
                </div>
                <div className="tech-card__body">
                  <div className="tech-card__sub">{card.sub}</div>
                  <h3 className="tech-card__title">{card.title}</h3>
                  <p className="tech-card__desc">{card.desc}</p>
                  <ul className="tech-card__details">
                    {card.details.map(d => (
                      <li key={d} className="tech-card__detail">
                        <span className="tech-card__bullet" />{d}
                      </li>
                    ))}
                  </ul>
                  <div className="tech-card__tags">
                    {card.tags.map(t => (
                      <span className="tech-card__tag" key={t}>{t}</span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ── Architecture section ── */
function ArchSection() {
  const [ref, p] = useElP();
  const eyebrowP = ss(p, 0.05, 0.28);
  const h2P      = ss(p, 0.14, 0.40);
  const layers = [
    { layer: "Frontend",   items: ["React App", "ethers.js v6", "Pinata SDK"],                color: "#b8922a" },
    { layer: "Blockchain", items: ["Hardhat Node / Polygon", "PaperRegistry.sol", "EVM"],     color: "#3d7fff" },
    { layer: "Storage",    items: ["IPFS Protocol", "Pinata Pinning", "CID v1 SHA-256"],       color: "#1a6b5a" },
  ];

  return (
    <section className="tech-arch" ref={ref}>
      <div className="tech-arch__bleed"
        style={{ transform: `translateY(${(p - 0.5) * -45}px)` }}>
        ARCH
      </div>
      <div className="tech-arch__inner">
        <div>
          <div style={{ opacity: eyebrowP, transform: `translateY(${(1 - eyebrowP) * 100}px)` }}>
            <div className="eyebrow">Architecture</div>
          </div>
          <div style={{ opacity: h2P, transform: `translateY(${(1 - h2P) * 120}px) scale(${0.9 + h2P * 0.1})` }}>
            <h2 className="tech-arch__h2">How all the parts connect.</h2>
          </div>
        </div>
        <div className="tech-arch__diagram">
          {layers.map(({ layer, items, color }, i) => {
            const lp = ss(p, 0.15 + i * 0.07, 0.4 + i * 0.07);
            return (
              <div
                className="tech-arch__layer"
                key={layer}
                style={{ "--c": color, opacity: lp, transform: `translateY(${(1 - lp) * 40}px)` }}
              >
                <div className="tech-arch__layer-label">{layer}</div>
                <div className="tech-arch__layer-items">
                  {items.map((item, j) => (
                    <div
                      className="tech-arch__item"
                      key={item}
                      style={{
                        opacity: ss(lp, j * 0.2, j * 0.2 + 0.5),
                        transform: `translateX(${(1 - ss(lp, j * 0.2, j * 0.2 + 0.5)) * 20}px)`,
                      }}
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}


/* ── CTA section with inline scroll ── */
function TechCtaSection({ go }) {
  const [ref, p] = useElP();
  const h2P  = ss(p, 0.06, 0.36);
  const btnP = ss(p, 0.18, 0.48);
  return (
    <section className="tech-cta" ref={ref}>
      <div className="tech-cta__inner">
        <div style={{ opacity: h2P, transform: `translateY(${(1-h2P)*100}px) scale(${0.9+h2P*0.1})` }}>
          <h2 className="tech-cta__h2">Now that you know how it's built —</h2>
        </div>
        <div style={{ opacity: btnP, transform: `translateY(${(1-btnP)*60}px)` }}
          className="tech-cta__btns">
          <button className="btn btn-gold" onClick={() => go("app")}><span>Launch the App →</span></button>
          <button className="btn btn-ghost" onClick={() => go("how")}>Review How It Works</button>
        </div>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════ */
export function TechPage({ navigate }) {
  useScrollReveal(0.12);
  const [bgRef,    bgOff]   = useParallax(0.3);
  const [bleedRef, blOff]   = useParallax(-0.08);
  const [textRef,  textOff] = useParallax(0.12);
  const [heroRef,  heroP]   = useElP();
  const heroEyeP = ss(heroP, 0.02, 0.18);
  const heroH1P  = ss(heroP, 0.06, 0.24);
  const heroSubP = ss(heroP, 0.12, 0.30);
  const go = (pg) => { navigate(pg); window.scrollTo({ top: 0 }); };

  return (
    <div className="tech page-enter">

      {/* ── Hero ── */}
      <section className="tech-hero" ref={heroRef}>
        <div ref={bgRef} className="tech-hero__bg"
          style={{ transform: `translateY(${bgOff}px) scale(1.15)` }} />
        <div className="tech-hero__ov" />
        <div className="tech-hero__grid" />
        <div ref={bleedRef} className="tech-hero__bleed"
          style={{ transform: `translate(-50%,-50%) translateY(${blOff}px)` }}>
          TECH
        </div>
        <div ref={textRef} className="tech-hero__content"
          style={{ transform: `translateY(${textOff}px)` }}>
          <div style={{ opacity: heroEyeP, transform: `translateY(${(1-heroEyeP)*60}px)` }}>
            <div className="eyebrow">Under the Hood</div>
          </div>
          <div style={{ opacity: heroH1P, transform: `translateY(${(1-heroH1P)*90}px) scale(${0.92+heroH1P*0.08})` }}>
            <h1 className="tech-hero__h1">
              Built on proven<br /><em className="gold-text">cryptography.</em>
            </h1>
          </div>
          <div style={{ opacity: heroSubP, transform: `translateY(${(1-heroSubP)*70}px)` }}>
            <p className="tech-hero__sub">
              Every component relies on well-established cryptographic primitives —
              nothing proprietary, nothing trusted, nothing that can be taken away.
            </p>
          </div>
        </div>
      </section>

      <ContractSection />
      <CardsSection />
      <ArchSection />

      {/* ── CTA ── */}
      <TechCtaSection go={go} />

    </div>
  );
}