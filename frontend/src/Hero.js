import React, { useEffect, useRef, useState } from "react";
import "./Hero.css";

export default function Hero({ onLaunchApp, onHowItWorks }) {
    const [scrollY, setScrollY] = useState(0);
    const [tick, setTick]       = useState(0);

    useEffect(() => {
        const fn = () => setScrollY(window.scrollY);
        window.addEventListener("scroll", fn, { passive: true });
        return () => window.removeEventListener("scroll", fn);
    }, []);

    // Typing counter
    useEffect(() => {
        const t = setInterval(() => setTick(p => p + 1), 80);
        return () => clearInterval(t);
    }, []);

    const codeLines = [
        "contract PaperRegistry {",
        "  mapping(string => Paper) papers;",
        "  function submitPaper(string CID)",
        "    require(!papers[CID].exists);",
        "    papers[CID] = Paper({",
        "      author: msg.sender,",
        "      timestamp: block.timestamp",
        "    });",
        "  }",
        "}",
    ];

    const bgY   = scrollY * 0.35;
    const textY = scrollY * 0.12;
    const wordY = scrollY * -0.06;

    return (
        <section className="hero" id="hero">

            {/* Video background */}
            <div className="hero__video-wrap" style={{ transform: `translateY(${bgY}px)` }}>
                <img
                    className="hero__bg-img"
                    src="https://images.unsplash.com/photo-1639762681057-408e52192e55?w=2400&q=80"
                    alt=""
                />
            </div>

            {/* Grid overlay */}
            <div className="hero__grid" />
            <div className="hero__overlay" />

            {/* Massive bleeding word */}
            <div className="hero__bleed" style={{ transform: `translateY(${wordY}px)` }}>
                IMMUTABLE
            </div>

            {/* Floating code panel */}
            <div className="hero__code-panel">
                <div className="hero__code-bar">
                    <span className="hero__code-dot" style={{ background: "#e05252" }} />
                    <span className="hero__code-dot" style={{ background: "#f0a500" }} />
                    <span className="hero__code-dot" style={{ background: "#4ecba0" }} />
                    <span className="hero__code-title">PaperRegistry.sol</span>
                </div>
                <div className="hero__code-body">
                    {codeLines.map((line, i) => (
                        <div className="hero__code-line" key={i} style={{ animationDelay: `${i * 0.12}s` }}>
                            <span className="hero__code-num">{i + 1}</span>
                            <span className="hero__code-text">{line}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Main content */}
            <div className="hero__content" style={{ transform: `translateY(${textY}px)` }}>
                <div className="hero__eyebrow">
                    <span className="hero__eyebrow-dot" />
                    Blockchain · IPFS · Solidity · Academic Priority
                </div>

                <h1 className="hero__h1">
                    <span className="hero__h1-line hero__h1-line--1">Establish</span>
                    <span className="hero__h1-line hero__h1-line--2">Your <em>Research</em></span>
                    <span className="hero__h1-line hero__h1-line--3">Priority.</span>
                </h1>

                <p className="hero__desc">
                    The world's first decentralised academic authorship system.
                    Your paper, timestamped forever on the blockchain — no institution, no intermediary.
                </p>

                <div className="hero__actions">
                    <button className="hero__btn-main" onClick={onLaunchApp}>
                        <span>Register a Paper</span>
                        <span className="hero__btn-arrow">→</span>
                    </button>
                    <button className="hero__btn-ghost" onClick={onHowItWorks}>
                        How It Works
                    </button>
                </div>
            </div>

            {/* Stats bar */}
            <div className="hero__stats">
                {[
                    { val: "SHA-256",  label: "Content Hashing" },
                    { val: "EVM",      label: "Smart Contract" },
                    { val: "IPFS",     label: "Decentralised Storage" },
                    { val: "Solidity", label: "Contract Language" },
                ].map(({ val, label }) => (
                    <div className="hero__stat" key={label}>
                        <div className="hero__stat-val">{val}</div>
                        <div className="hero__stat-label">{label}</div>
                    </div>
                ))}
            </div>

            {/* Right scroll indicator */}
            <div className="hero__scroll">
                <div className="hero__scroll-track">
                    <div className="hero__scroll-thumb" />
                </div>
                <span className="hero__scroll-text">Scroll</span>
            </div>
        </section>
    );
}