import React, { useState, useEffect } from "react";
import "./Navbar.css";

export default function Navbar({ currentPage, navigate, wallet }) {
  const [scrolled, setScrolled] = useState(false);
  const [mega, setMega]         = useState(null);
  const [drawer, setDrawer]     = useState(false);
  const closeTimer = React.useRef(null);

  const openMega  = (key) => { clearTimeout(closeTimer.current); setMega(key); };
  const closeMega = ()    => { closeTimer.current = setTimeout(() => setMega(null), 250); };

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  // Close mega on page change
  useEffect(() => { setMega(null); setDrawer(false); }, [currentPage]);

  const go = (page) => { navigate(page); setMega(null); setDrawer(false); window.scrollTo(0,0); };

  const menus = {
    how: {
      title: "How It Works",
      cols: [
        { heading: "The Flow", items: [
          { label: "Upload to IPFS",      sub: "SHA-256 content fingerprinting",  page: "how" },
          { label: "Submit to Blockchain", sub: "Sign with your Ethereum wallet", page: "how" },
          { label: "Verify Precedence",    sub: "Trustless public verification",  page: "how" },
        ]},
        { heading: "Key Concepts", items: [
          { label: "Content Addressing",   sub: "IPFS CID explained",        page: "how" },
          { label: "Smart Contracts",      sub: "How Solidity enforces rules", page: "tech" },
          { label: "Cryptographic Proof",  sub: "msg.sender and timestamps",  page: "tech" },
        ]},
      ],
      img: "https://images.unsplash.com/photo-1639762681057-408e52192e55?w=500&q=80",
      caption: "Three steps. Permanent proof.",
    },
    tech: {
      title: "Technology",
      cols: [
        { heading: "Blockchain", items: [
          { label: "Solidity 0.8",    sub: "Smart contract language",        page: "tech" },
          { label: "Polygon Network", sub: "Low-cost EVM-compatible chain",   page: "tech" },
          { label: "Hardhat",         sub: "Local dev & testing framework",   page: "tech" },
        ]},
        { heading: "Storage & Identity", items: [
          { label: "IPFS Protocol",   sub: "Decentralised file storage",  page: "tech" },
          { label: "Pinata",          sub: "IPFS pinning service",        page: "tech" },
          { label: "Ethers.js v6",    sub: "Blockchain interaction layer", page: "tech" },
        ]},
      ],
      img: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=500&q=80",
      caption: "Built on proven cryptography.",
    },
  };

  return (
    <>
      <nav className={`nav ${scrolled ? "nav--scrolled" : ""} ${currentPage !== "home" ? "nav--solid" : ""}`}>
        {/* Brand */}
        <button className="nav__brand" onClick={() => go("home")}>
          <div className="nav__brand-mark">⛓</div>
          <span className="nav__brand-name">Proof of Precedence</span>
        </button>

        {/* Center links */}
        <div className="nav__links">
          {Object.entries(menus).map(([key, menu]) => (
            <div key={key} className="nav__item"
              onMouseEnter={() => openMega(key)}
              onMouseLeave={closeMega}
            >
              <button
                className={`nav__link ${mega === key ? "nav__link--on" : ""} ${currentPage === key ? "nav__link--active" : ""}`}
                onClick={() => go(key)}
              >
                {menu.title}
                <span className={`nav__chevron ${mega === key ? "nav__chevron--open" : ""}`}>›</span>
              </button>

              {mega === key && (
                <div className="mega" onMouseEnter={() => openMega(key)} onMouseLeave={closeMega}>
                  <div className="mega__inner">
                    {menu.cols.map(col => (
                      <div className="mega__col" key={col.heading}>
                        <div className="mega__heading">{col.heading}</div>
                        {col.items.map(item => (
                          <button className="mega__item" key={item.label} onMouseDown={() => {
                            if (item.tab) {
                              navigate(item.page, item.tab);
                              setMega(null);
                              setDrawer(false);
                            } else {
                              go(item.page);
                            }
                          }} onClick={() => {}}>
                            <span className="mega__item-label">{item.label}</span>
                            <span className="mega__item-sub">{item.sub}</span>
                          </button>
                        ))}
                      </div>
                    ))}
                    <div className="mega__img-col">
                      <img src={menu.img} alt="" className="mega__img" />
                      <span className="mega__img-cap">{menu.caption}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}

          <button
            className={`nav__link nav__link--cta ${currentPage === "app" ? "nav__link--active" : ""}`}
            onClick={() => go("app")}
          >
            Launch Dashboard
          </button>
        </div>

        {/* Right */}
        <div className="nav__right">
          {wallet && (
            <div className="nav__wallet">
              <span className="nav__wallet-dot" />
              {wallet.slice(0,6)}…{wallet.slice(-4)}
            </div>
          )}
          <button className="nav__burger" onClick={() => setDrawer(true)}>
            <span /><span /><span />
          </button>
        </div>
      </nav>

      {/* ── SIDE DRAWER ── */}
      <div className={`drawer ${drawer ? "drawer--open" : ""}`}>
        <div className="drawer__backdrop" onClick={() => setDrawer(false)} />
        <div className="drawer__panel">
          <button className="drawer__close" onClick={() => setDrawer(false)}>✕</button>

          <div className="drawer__brand">
            <div className="drawer__brand-mark">⛓</div>
            <span>Proof of Precedence</span>
          </div>

          <div className="drawer__rule" />

          <div className="drawer__section-title">Pages</div>
          <nav className="drawer__nav">
            {[
              { page: "home", icon: "⌂", label: "Home",         sub: "Start here" },
              { page: "how",  icon: "↗", label: "How It Works", sub: "The 3-step flow" },
              { page: "tech", icon: "⬡", label: "Technology",   sub: "Under the hood" },
              { page: "app",  icon: "⚡", label: "Launch App",   sub: "Register a paper" },
            ].map(({ page, icon, label, sub }) => (
              <button
                key={page}
                className={`drawer__nav-item ${currentPage === page ? "drawer__nav-item--active" : ""}`}
                onClick={() => go(page)}
              >
                <span className="drawer__nav-icon">{icon}</span>
                <span className="drawer__nav-text">
                  <span className="drawer__nav-label">{label}</span>
                  <span className="drawer__nav-sub">{sub}</span>
                </span>
                <span className="drawer__nav-arr">›</span>
              </button>
            ))}
          </nav>

          <div className="drawer__rule" />
          <div className="drawer__section-title">Stack</div>
          <div className="drawer__tags">
            {["Solidity 0.8","Hardhat","Ethers.js","React","IPFS","Pinata","Polygon","EVM","SHA-256"].map(t => (
              <span className="drawer__tag" key={t}>{t}</span>
            ))}
          </div>

          <div className="drawer__footer">© 2025 · All records immutable</div>
        </div>
      </div>
    </>
  );
}