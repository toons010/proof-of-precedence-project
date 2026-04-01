import React, { useEffect, useRef } from "react";
import "./Manifesto.css";

export default function Manifesto() {
    const ref = useRef(null);

    useEffect(() => {
        const io = new IntersectionObserver(
            (entries) => entries.forEach(e => {
                e.target.querySelectorAll(".reveal").forEach((el, i) => {
                    if (e.isIntersecting) {
                        setTimeout(() => el.classList.add("visible"), i * 120);
                    }
                });
            }),
            { threshold: 0.1 }
        );
        if (ref.current) io.observe(ref.current);
        return () => io.disconnect();
    }, []);

    return (
        <section className="manifesto" id="manifesto" ref={ref}>

            {/* Background image */}
            <div className="manifesto__bg" />
            <div className="manifesto__overlay" />

            {/* Grid */}
            <div className="manifesto__grid" />

            {/* Giant bleeding word */}
            <div className="manifesto__bleed-left">TRUST</div>
            <div className="manifesto__bleed-right">LESS</div>

            <div className="manifesto__inner">

                <div className="manifesto__left reveal">
                    <div className="manifesto__label">Our Vision</div>
                    <h2 className="manifesto__title">
                        Science<br />deserves<br /><em>certainty.</em>
                    </h2>
                    <div className="manifesto__stat-row">
                        {[
                            { val: "100%", label: "Tamper-proof" },
                            { val: "∞",    label: "Permanent" },
                            { val: "0",    label: "Trusted parties" },
                        ].map(({ val, label }) => (
                            <div className="manifesto__stat" key={label}>
                                <div className="manifesto__stat-val">{val}</div>
                                <div className="manifesto__stat-label">{label}</div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="manifesto__right">
                    <p className="manifesto__para reveal">
                        Academic priority disputes are as old as science itself. When two researchers
                        independently discover the same thing, the community needs an{" "}
                        <strong>objective, tamper-proof record</strong> of who arrived first.
                    </p>
                    <p className="manifesto__para reveal">
                        Today's systems depend on <strong>centralised servers</strong> whose records
                        can be altered, delayed, or destroyed. Journal submission timestamps can be
                        manipulated. Institutional repositories are only as trustworthy as their operators.
                    </p>
                    <p className="manifesto__para reveal">
                        Proof of Precedence changes this entirely. By combining{" "}
                        <strong>IPFS content addressing</strong> with an{" "}
                        <strong>Ethereum smart contract</strong>, we create a permanent, public,
                        and mathematically verifiable record that requires{" "}
                        <strong>no trust in any single institution</strong>.
                    </p>
                    <div className="manifesto__quote reveal">
                        <span className="manifesto__quote-mark">"</span>
                        The blockchain is immutable. The timestamp is real.
                        The authorship is cryptographic. This is certainty.
                    </div>
                </div>

            </div>
        </section>
    );
}