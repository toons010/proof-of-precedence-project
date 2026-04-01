import React from "react";
import "./Footer.css";

export default function Footer({ navigate }) {
  const go = (page) => { navigate(page); window.scrollTo(0,0); };
  return (
    <footer className="footer">
      <div className="footer__inner">
        <div className="footer__brand">
          <div className="footer__brand-logo">⛓</div>
          <div>
            <div className="footer__brand-name">Proof of Precedence</div>
            <div className="footer__brand-desc">Decentralised academic authorship verification. Immutable. Public. Trustless.</div>
          </div>
        </div>
        <div className="footer__cols">
          <div className="footer__col">
            <div className="footer__col-title">Pages</div>
            {[["home","Home"],["how","How It Works"],["tech","Technology"],["app","Launch App"]].map(([p,l])=>(
              <button className="footer__link" key={p} onClick={()=>go(p)}>{l}</button>
            ))}
          </div>
          <div className="footer__col">
            <div className="footer__col-title">Stack</div>
            {["Solidity 0.8","Hardhat","Ethers.js v6","React 18","IPFS","Pinata","Polygon"].map(t=>(
              <span className="footer__link footer__link--text" key={t}>{t}</span>
            ))}
          </div>
          <div className="footer__col">
            <div className="footer__col-title">Concepts</div>
            {["Smart Contracts","Content Addressing","Cryptographic Hashing","Proof of Stake","Decentralisation"].map(t=>(
              <span className="footer__link footer__link--text" key={t}>{t}</span>
            ))}
          </div>
        </div>
      </div>
      <div className="footer__bottom">
        <span className="footer__copy">© 2025 Proof of Precedence · All records immutable on-chain</span>
        <div className="footer__pills">
          {["EVM","SHA-256","IPFS","Solidity","Polygon"].map(t=>(
            <span className="footer__pill" key={t}>{t}</span>
          ))}
        </div>
      </div>
    </footer>
  );
}