import React from "react";
import "./SideNav.css";

const sections = [
    { id: "hero",     label: "Home" },
    { id: "manifesto",label: "Vision" },
    { id: "how",      label: "How It Works" },
    { id: "tech",     label: "Technology" },
    { id: "app",      label: "Launch App" },
];

export default function SideNav({ active }) {
    const scrollTo = (id) => {
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    };

    return (
        <div className="sidenav">
            <div className="sidenav__line" />
            {sections.map((s, i) => (
                <button
                    key={s.id}
                    className={`sidenav__dot ${active === s.id ? "sidenav__dot--active" : ""}`}
                    onClick={() => scrollTo(s.id)}
                    title={s.label}
                >
                    <span className="sidenav__dot-ring" />
                    <span className="sidenav__dot-fill" />
                    <span className="sidenav__dot-label">{s.label}</span>
                </button>
            ))}
        </div>
    );
}