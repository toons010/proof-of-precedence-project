import React, { useEffect, useRef } from "react";
import "./TechSection.css";

const techCards = [
    {
        icon: "⬡",
        title: "Solidity Smart Contract",
        sub: "PaperRegistry.sol",
        desc: "A Solidity 0.8.19 contract deployed on Polygon. Stores a mapping of CID strings to Paper structs containing the author address, block timestamp, and existence flag. Duplicate submissions are rejected at the EVM level — no paper can claim precedence twice.",
        tags: ["Solidity 0.8.19", "Polygon", "EVM", "Mappings"],
        accent: "#b8922a",
    },
    {
        icon: "🌐",
        title: "IPFS Content Addressing",
        sub: "InterPlanetary File System",
        desc: "IPFS identifies files by what they contain, not where they are stored. The SHA-256 hash of your file's bytes becomes its permanent address — the CID. Any modification, however small, produces a completely different CID, making tampering instantly detectable.",
        tags: ["SHA-256", "CID v1", "Pinata", "Content Addressing"],
        accent: "#3d7fff",
    },
    {
        icon: "⚡",
        title: "Hardhat Development",
        sub: "Local Blockchain Framework",
        desc: "Hardhat provides a local Ethereum-compatible node for development and testing. It compiles Solidity to EVM bytecode, runs a simulated blockchain at localhost:8545, and executes the full Chai/Mocha test suite — all without spending real gas.",
        tags: ["Hardhat 2.19", "Chai", "Mocha", "ethers.js v6"],
        accent: "#1a6b5a",
    },
    {
        icon: "🔑",
        title: "Cryptographic Identity",
        sub: "Wallet-Based Authorship",
        desc: "Every transaction is signed with an Ethereum private key. The EVM automatically sets msg.sender to the verified signer address — this cannot be spoofed without access to the private key. Your authorship is backed by elliptic curve cryptography.",
        tags: ["ECDSA", "secp256k1", "msg.sender", "ethers.Wallet"],
        accent: "#8b1a1a",
    },
];

function TechCard({ card, index }) {
    const ref = useRef(null);
    useEffect(() => {
        const io = new IntersectionObserver(
            ([e]) => { if (e.isIntersecting) { setTimeout(() => ref.current?.classList.add("tc--visible"), index * 100); io.unobserve(ref.current); } },
            { threshold: 0.1 }
        );
        if (ref.current) io.observe(ref.current);
        return () => io.disconnect();
    }, [index]);

    return (
        <div className="tc" ref={ref} style={{ "--accent": card.accent }}>
            <div className="tc__top">
                <div className="tc__icon">{card.icon}</div>
                <div className="tc__title">{card.title}</div>
                <div className="tc__sub">{card.sub}</div>
            </div>
            <p className="tc__desc">{card.desc}</p>
            <div className="tc__tags">
                {card.tags.map(t => <span className="tc__tag" key={t}>{t}</span>)}
            </div>
        </div>
    );
}

export function TechSection() {
    return (
        <section className="tech-section">
            <div className="tech-section__inner">
                <div className="tech-section__header">
                    <div className="tech-section__label">Under the Hood</div>
                    <h2 className="tech-section__title">Built on proven cryptography.</h2>
                    <p className="tech-section__sub">Every component of Proof of Precedence relies on well-established cryptographic primitives — nothing proprietary, nothing trusted.</p>
                </div>
                <div className="tech-section__grid">
                    {techCards.map((c, i) => <TechCard card={c} index={i} key={c.title} />)}
                </div>
            </div>
        </section>
    );
}

export function Footer({ onLaunchApp }) {
    return (
        <footer className="footer">
            <div className="footer__inner">
                <div className="footer__brand">
                    <div className="footer__brand-logo">⛓</div>
                    <div>
                        <div className="footer__brand-name">Proof of Precedence</div>
                        <div className="footer__brand-desc">
                            Decentralised academic authorship verification.
                            Immutable. Public. Trustless.
                        </div>
                    </div>
                </div>

                <div className="footer__cols">
                    <div className="footer__col">
                        <div className="footer__col-title">Technology</div>
                        {["Solidity 0.8", "Hardhat", "Ethers.js v6", "React 18", "IPFS", "Pinata", "Polygon"].map(t => (
                            <span className="footer__link" key={t}>{t}</span>
                        ))}
                    </div>
                    <div className="footer__col">
                        <div className="footer__col-title">Concepts</div>
                        {["Smart Contracts", "Content Addressing", "Cryptographic Hashing", "Proof of Stake", "Decentralisation", "Trustless Systems"].map(t => (
                            <span className="footer__link" key={t}>{t}</span>
                        ))}
                    </div>
                    <div className="footer__col">
                        <div className="footer__col-title">Navigate</div>
                        <button className="footer__link footer__link--btn" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>Home</button>
                        <button className="footer__link footer__link--btn" onClick={() => document.querySelector(".how-section")?.scrollIntoView({ behavior: "smooth" })}>How It Works</button>
                        <button className="footer__link footer__link--btn" onClick={() => document.querySelector(".tech-section")?.scrollIntoView({ behavior: "smooth" })}>Technology</button>
                        <button className="footer__link footer__link--btn" onClick={onLaunchApp}>Launch App</button>
                    </div>
                </div>
            </div>

            <div className="footer__bottom">
                <div className="footer__copy">© 2025 Proof of Precedence · All records immutable on-chain</div>
                <div className="footer__pills">
                    {["EVM", "SHA-256", "IPFS", "Solidity", "Polygon"].map(t => (
                        <span className="footer__pill" key={t}>{t}</span>
                    ))}
                </div>
            </div>
        </footer>
    );
}